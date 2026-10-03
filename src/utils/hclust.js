// Hierarchical agglomerative clustering (tanpa dependensi tambahan).
// Data distandardisasi (z-score) dulu, sama seperti PCA (scale: true).

function standardize(rows, features) {
  const n = rows.length;
  const stats = features.map((f) => {
    const vals = rows.map((r) => +r[f]);
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1)) || 1;
    return { mean, sd };
  });
  return rows.map((r) => features.map((f, j) => (+r[f] - stats[j].mean) / stats[j].sd));
}

// method: "ward" | "complete" | "average" | "single"
// Mengembalikan root tree: { id, children?, height, size, row? , name? }
export function hclust(rows, features, { method = "ward", labelKey = "Provinsi" } = {}) {
  const Z = standardize(rows, features);
  const n = Z.length;
  const ward = method === "ward";

  const N = 2 * n - 1;
  const d = Array.from({ length: N }, () => new Float64Array(N));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let s = 0;
      for (let k = 0; k < features.length; k++) s += (Z[i][k] - Z[j][k]) ** 2;
      const v = ward ? s : Math.sqrt(s); // ward bekerja di jarak kuadrat
      d[i][j] = d[j][i] = v;
    }
  }

  const nodes = rows.map((r, i) => ({ id: i, name: r[labelKey], row: r, size: 1, height: 0 }));
  let active = Array.from({ length: n }, (_, i) => i);

  while (active.length > 1) {
    let best = Infinity, bi = -1, bj = -1;
    for (let a = 0; a < active.length; a++) {
      for (let b = a + 1; b < active.length; b++) {
        const v = d[active[a]][active[b]];
        if (v < best) { best = v; bi = a; bj = b; }
      }
    }
    const i = active[bi], j = active[bj];
    const id = nodes.length;
    const ni = nodes[i].size, nj = nodes[j].size;

    for (const k of active) {
      if (k === i || k === j) continue;
      const nk = nodes[k].size;
      let v;
      if (method === "ward") {
        v = ((ni + nk) * d[k][i] + (nj + nk) * d[k][j] - nk * d[i][j]) / (ni + nj + nk);
      } else if (method === "single") v = Math.min(d[k][i], d[k][j]);
      else if (method === "complete") v = Math.max(d[k][i], d[k][j]);
      else v = (ni * d[k][i] + nj * d[k][j]) / (ni + nj); // average
      d[id][k] = d[k][id] = v;
    }

    nodes.push({
      id,
      children: [nodes[i], nodes[j]],
      size: ni + nj,
      height: ward ? Math.sqrt(best) : best,
    });
    active = active.filter((x) => x !== i && x !== j);
    active.push(id);
  }
  return nodes[nodes.length - 1];
}

// Daftar daun sesuai urutan tampil (DFS)
export function getLeaves(node) {
  if (!node.children) return [node];
  return node.children.flatMap(getLeaves);
}

// Potong dendrogram menjadi k klaster.
// Return: { assign: Map(leafId -> clusterIdx), cutHeight, clusters: [{ idx, leaves }] }
export function cutTree(root, k) {
  let groups = [root];
  let lastSplit = root.height;
  while (groups.length < k) {
    groups.sort((a, b) => b.height - a.height);
    const top = groups.shift();
    if (!top.children) { groups.push(top); break; }
    lastSplit = top.height;
    groups.push(...top.children);
  }
  groups.sort((a, b) => b.height - a.height);
  const nextHeight = groups[0].height;
  const cutHeight = (lastSplit + nextHeight) / 2;

  // urutkan klaster berdasar posisi tampil di dendrogram agar label stabil
  const order = new Map(getLeaves(root).map((l, i) => [l.id, i]));
  const withLeaves = groups.map((g) => ({ leaves: getLeaves(g) }));
  withLeaves.sort((a, b) => order.get(a.leaves[0].id) - order.get(b.leaves[0].id));

  const assign = new Map();
  const clusters = withLeaves.map((g, idx) => {
    g.leaves.forEach((l) => assign.set(l.id, idx));
    return { idx, leaves: g.leaves };
  });
  return { assign, cutHeight, clusters };
}
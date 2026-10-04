import { useEffect, useMemo, useState } from "react";
import { hclust, cutTree } from "../utils/hclust";
import { getIsland } from "../utils/regions";

export const FEATURES = [
  "IPM",
  "PDRB",
  "Kemiskinan",
  "TPT",
  "TPAK",
  "Kepadatan Penduduk",
  "Laju Pertumbuhan Penduduk",
  "Pengeluaran per Kapita",
];
export const N_CLUSTERS = 3;
export const METHOD = "ward"; // ganti bila hasil analisismu memakai linkage lain

// dimuat sekali saja, dipakai bersama oleh semua section
let rowsPromise;
const loadRows = () =>
  (rowsPromise ??= fetch("/data/pca_complete.json").then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }));

const leafName = (l) => l.name ?? l.row?.Provinsi;

export function useClusterResult() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let off = false;
    loadRows()
      .then((d) => {
        if (!off) setRows(d.map((r) => ({ ...r, group: getIsland(r.Provinsi) })));
      })
      .catch((e) => {
        console.error("Gagal membaca data clustering:", e);
        if (!off) setError(true);
      });
    return () => {
      off = true;
    };
  }, []);

  const tree = useMemo(
    () => (rows.length ? hclust(rows, FEATURES, { method: METHOD }) : null),
    [rows]
  );

  // Klaster diurutkan dari yang terkecil: Klaster 1 -> 2 -> 3
  const cut = useMemo(() => {
    if (!tree) return null;
    const raw = cutTree(tree, N_CLUSTERS);
    const sorted = [...raw.clusters].sort((a, b) => a.leaves.length - b.leaves.length);

    const assign = new Map();
    const clusterOfName = new Map();
    sorted.forEach((c, i) =>
      c.leaves.forEach((l) => {
        assign.set(l.id, i);
        clusterOfName.set(leafName(l), i);
      })
    );

    // statistik seluruh provinsi untuk membandingkan tiap klaster
    const stat = {};
    FEATURES.forEach((f) => {
      const v = rows.map((r) => Number(r[f])).filter(Number.isFinite);
      const mean = v.reduce((s, x) => s + x, 0) / (v.length || 1);
      const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (v.length || 1)) || 1;
      stat[f] = { mean, sd };
    });

    const clusters = sorted.map((c) => {
      const memberRows = c.leaves.map((l) => l.row).filter(Boolean);
      const traits = FEATURES.map((f) => {
        const v = memberRows.map((r) => Number(r[f])).filter(Number.isFinite);
        if (!v.length) return null;
        const mean = v.reduce((s, x) => s + x, 0) / v.length;
        return { f, z: (mean - stat[f].mean) / stat[f].sd };
      })
        .filter(Boolean)
        .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
        .slice(0, 3);
      return {
        size: c.leaves.length,
        names: c.leaves.map(leafName),
        members: c.leaves.map((l) => ({ name: leafName(l), ipm: Number(l.row.IPM) })),
        traits,
      };
    });
    return { assign, clusters, clusterOfName };
  }, [tree, rows]);

  return { rows, tree, cut, error };
}
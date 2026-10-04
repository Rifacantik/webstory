import { useMemo, useState } from "react";
import StorySection from "../layout/StorySection";
import Dendrogram, { CLUSTER_COLORS } from "../charts/Dendrogram";
import { getLeaves } from "../../utils/hclust";
import { useSelection } from "../../context/SelectionContext";
import { useClusterResult, N_CLUSTERS, METHOD } from "../../hooks/useClusterResult";

const METHOD_LABEL = { ward: "Ward", complete: "Complete", average: "Average", single: "Single" }[METHOD];

const FLOW = ["Dendrogram", "Garis potong", `${N_CLUSTERS} klaster`, "Insight"];
const CAPTIONS = {
  1: "Provinsi yang paling mirip bergabung lebih dulu (di kanan); semakin ke kiri, kelompok yang digabung semakin berbeda.",
  2: `Dendrogram dipotong pada jarak tertentu sehingga tersisa ${N_CLUSTERS} cabang.`,
  3: "Setiap cabang di bawah garis potong menjadi satu klaster.",
};

const fmt = (v) => v.toFixed(1).replace(".", ",");
const leafName = (l) => (l && typeof l === "object" ? l.name ?? l.row?.Provinsi : l);

// Penggabungan pertama sebuah provinsi: tinggi (jarak) dan pasangannya
function mergeInfo(root, name) {
  let found = null;
  (function walk(n) {
    if (found || !n.children) return;
    const [a, b] = n.children;
    const aLeaf = !a.children && leafName(a) === name;
    const bLeaf = !b.children && leafName(b) === name;
    if (aLeaf || bLeaf) {
      found = { height: n.height, sibling: aLeaf ? b : a };
      return;
    }
    walk(a);
    walk(b);
  })(root);
  return found;
}

function describeSibling(sib) {
  if (!sib.children) return leafName(sib);
  const names = getLeaves(sib).map(leafName);
  const shown = names.slice(0, 3).join(", ");
  return `kelompok ${sib.size} provinsi (${shown}${names.length > 3 ? ", …" : ""})`;
}

export default function DendrogramSection() {
  const { tree, cut } = useClusterResult();
  const [stage, setStage] = useState(1); // 1 -> 2 -> 3, berjalan otomatis
  const [hovered, setHovered] = useState(null);
  const [replayKey, setReplayKey] = useState(0);
  const { selected } = useSelection();

  // Jarak penggabungan pertama semua provinsi: dipakai untuk menilai "khas" atau "umum"
  const mergeStats = useMemo(() => {
    if (!tree) return null;
    const heights = getLeaves(tree)
      .map((l) => mergeInfo(tree, leafName(l))?.height)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    if (!heights.length) return null;
    const q = (p) => heights[Math.floor(p * (heights.length - 1))];
    return { q25: q(0.25), q75: q(0.75) };
  }, [tree]);

  const total = cut ? cut.clusters.reduce((s, c) => s + c.size, 0) : 0;
  const active = hovered != null && cut ? cut.clusters[hovered] : null;

  // Insight untuk provinsi yang dipilih lewat kotak "Cari provinsi"
  const prov = useMemo(() => {
    if (!selected || !tree || !cut) return null;
    const mi = mergeInfo(tree, selected);
    if (!mi) return null;
    const ci = cut.clusterOfName.get(selected);
    let standing = "";
    if (mergeStats) {
      if (mi.height >= mergeStats.q75) {
        standing = "Profilnya relatif khas: baru bergabung dengan provinsi lain pada jarak yang tinggi.";
      } else if (mi.height <= mergeStats.q25) {
        standing = "Profilnya sangat dekat dengan pasangannya: bergabung pada jarak yang rendah.";
      }
    }
    return {
      name: selected,
      height: mi.height,
      sibling: describeSibling(mi.sibling),
      standing,
      ci,
      cluster: ci != null ? cut.clusters[ci] : null,
    };
  }, [selected, tree, cut, mergeStats]);

  const replay = () => {
    setHovered(null);
    setStage(1);
    setReplayKey((k) => k + 1);
  };

  // indikator alur: Dendrogram -> Garis potong -> 3 klaster -> Insight (otomatis, tidak bisa diklik)
  const reached = (i) => (i < 3 ? stage >= i + 1 : active != null || prov != null);

  const accent = active
    ? CLUSTER_COLORS[hovered]
    : prov && stage >= 3 && prov.ci != null
    ? CLUSTER_COLORS[prov.ci]
    : "#d7dce8";

  const traitList = (traits) =>
    traits.length > 0 && (
      <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "0.88rem", color: "#2b3350" }}>
        {traits.map((t) => (
          <li key={t.f} style={{ marginBottom: 2 }}>
            <strong style={{ color: t.z > 0 ? "#2ca58d" : "#c0392b" }}>{t.z > 0 ? "↑" : "↓"}</strong>{" "}
            {t.f}{" "}
            <span style={{ color: "#7d879c" }}>
              ({t.z > 0 ? "+" : "−"}{fmt(Math.abs(t.z))} SD)
            </span>
          </li>
        ))}
      </ul>
    );

  const sdNote = (
    <p style={{ margin: "0.6rem 0 0", fontSize: "0.75rem", color: "#7d879c" }}>
      SD = selisih rata-rata klaster terhadap rata-rata {total} provinsi, dalam satuan simpangan baku.
    </p>
  );

  return (
    <StorySection
      id="dendrogram"
      fill={false}
      title="Provinsi Mana Saja yang Membentuk Kelompok Serupa?"
      text={
        <p>
          Hierarchical clustering menggabungkan provinsi secara bertahap
          berdasarkan kemiripan seluruh indikator (setelah distandardisasi).
          Provinsi yang bergabung pada jarak rendah memiliki karakteristik yang
          sangat mirip, sedangkan cabang yang baru bertemu di jarak tinggi
          menunjukkan perbedaan yang besar.
        </p>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.4rem 0.5rem",
          marginBottom: "0.5rem",
          fontSize: "0.9rem",
        }}
      >
        {FLOW.map((label, i) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                padding: "0.2rem 0.75rem",
                borderRadius: 999,
                border: `1px solid ${reached(i) ? "#2a6fdb" : "#d7dce8"}`,
                background: reached(i) ? "#2a6fdb" : "#fff",
                color: reached(i) ? "#fff" : "#a3abbd",
                transition: "all 0.4s",
              }}
            >
              {label}
            </span>
            {i < FLOW.length - 1 && <span style={{ color: "#a3abbd" }}>→</span>}
          </span>
        ))}
        <button
          onClick={replay}
          style={{
            marginLeft: "auto",
            padding: "0.25rem 0.8rem",
            borderRadius: 8,
            border: "1px solid #c9d0e0",
            background: "#fff",
            color: "#2b3350",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          ↻ Putar ulang
        </button>
      </div>

      <p style={{ margin: "0 0 1rem", color: "#5d6781", minHeight: "1.5em" }}>
        {stage < 3 ? CAPTIONS[stage] : CAPTIONS[3]}
      </p>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 520px", minWidth: 0 }}>
          {tree && cut && (
            <Dendrogram
              root={tree}
              assign={cut.assign}
              k={N_CLUSTERS}
              stage={stage}
              onStageChange={setStage}
              activeCluster={stage >= 3 ? hovered : null}
              onHoverCluster={setHovered}
              methodLabel={METHOD_LABEL}
              replayKey={replayKey}
            />
          )}
        </div>

        {/* Insight: klaster yang di-hover didahulukan; kalau tidak ada, provinsi terpilih */}
        <aside
          className="dg-aside"
          style={{
            flex: "0 0 280px",
            maxWidth: "100%",
            position: "sticky",
            top: "1rem",
            padding: "1rem 1.1rem",
            borderRadius: 10,
            background: "#f4f7fd",
            borderLeft: `4px solid ${accent}`,
            transition: "border-color 0.2s",
            minHeight: 140,
          }}
        >
          {active ? (
            <div>
              <p style={{ margin: "0 0 0.75rem", fontWeight: 600, color: "#2b3350", lineHeight: 1.45 }}>
                Pada tingkat pemotongan ini, {total} provinsi terbagi menjadi {N_CLUSTERS} kelompok
                berdasarkan kemiripan karakteristik sosial-ekonomi.
              </p>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  color: CLUSTER_COLORS[hovered], fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: CLUSTER_COLORS[hovered], display: "inline-block",
                  }}
                />
                Klaster {hovered + 1} · {active.size} provinsi
              </div>
              <p style={{ margin: "0.4rem 0 0.6rem", fontSize: "0.9rem", color: "#2b3350" }}>
                {active.size <= 6 ? active.names.join(", ") : "Kelompok terbesar dengan karakteristik paling umum."}
              </p>
              {traitList(active.traits)}
              {sdNote}
            </div>
          ) : prov ? (
            <div>
              <div style={{ fontWeight: 700, color: "#16213a", fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                {prov.name}
              </div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.92rem", color: "#2b3350", lineHeight: 1.5 }}>
                Bergabung pertama dengan <strong>{prov.sibling}</strong> pada jarak{" "}
                <strong>{fmt(prov.height)}</strong>.
              </p>
              {prov.standing && (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.92rem", color: "#2b3350", lineHeight: 1.5 }}>
                  {prov.standing}
                </p>
              )}
              {stage >= 3 && prov.cluster ? (
                <>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      color: CLUSTER_COLORS[prov.ci], fontWeight: 700, margin: "0.6rem 0 0.4rem",
                    }}
                  >
                    <span
                      style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: CLUSTER_COLORS[prov.ci], display: "inline-block",
                      }}
                    />
                    Klaster {prov.ci + 1} · {prov.cluster.size} provinsi
                  </div>
                  {prov.cluster.size === 1 && (
                    <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: "#2b3350" }}>
                      Berdiri sendiri sebagai satu klaster.
                    </p>
                  )}
                  {traitList(prov.cluster.traits)}
                  {sdNote}
                </>
              ) : (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#7d879c" }}>
                  Klaster provinsi ini akan terlihat setelah dendrogram dipotong.
                </p>
              )}
              <p style={{ margin: "0.7rem 0 0", fontSize: "0.78rem", color: "#7d879c" }}>
                Garis tebal pada dendrogram menunjukkan jalur penggabungannya sampai ke akar.
              </p>
            </div>
          ) : (
            <p style={{ margin: 0, color: "#7d879c", fontSize: "0.95rem" }}>
              {stage >= 3
                ? "Arahkan kursor ke salah satu klaster (warna), atau pilih provinsi di kotak “Cari provinsi”, untuk melihat insight."
                : "Insight akan muncul setelah klaster terbentuk. Anda juga bisa memilih provinsi lebih dulu di kotak “Cari provinsi”."}
            </p>
          )}
        </aside>
      </div>
    </StorySection>
  );
}
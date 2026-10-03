import { useEffect, useMemo, useState } from "react";
import StorySection from "../layout/StorySection";
import Dendrogram, { CLUSTER_COLORS } from "../charts/Dendrogram";
import { hclust, cutTree } from "../../utils/hclust";
import { getIsland } from "../../utils/regions";

const FEATURES = [
  "IPM",
  "PDRB",
  "Kemiskinan",
  "TPT",
  "TPAK",
  "Kepadatan Penduduk",
  "Laju Pertumbuhan Penduduk",
  "Pengeluaran per Kapita",
];

const N_CLUSTERS = 3;
const METHOD = "ward"; // ganti bila hasil analisismu memakai linkage lain
const METHOD_LABEL = { ward: "Ward", complete: "Complete", average: "Average", single: "Single" }[METHOD];

const FLOW = ["Dendrogram", "Garis potong", `${N_CLUSTERS} klaster`, "Insight"];
const CAPTIONS = {
  1: "Provinsi yang paling mirip bergabung lebih dulu (di kanan); semakin ke kiri, kelompok yang digabung semakin berbeda.",
  2: `Dendrogram dipotong pada jarak tertentu sehingga tersisa ${N_CLUSTERS} cabang.`,
  3: "Setiap cabang di bawah garis potong menjadi satu klaster.",
};

const fmt = (v) => v.toFixed(1).replace(".", ",");

export default function DendrogramSection() {
  const [rows, setRows] = useState([]);
  const [stage, setStage] = useState(1); // 1 -> 2 -> 3, berjalan otomatis
  const [hovered, setHovered] = useState(null);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    fetch("/data/pca_complete.json")
      .then((res) => res.json())
      .then((data) =>
        setRows(data.map((r) => ({ ...r, group: getIsland(r.Provinsi) })))
      )
      .catch((err) => console.error("Gagal membaca data clustering:", err));
  }, []);

  const tree = useMemo(
    () => (rows.length ? hclust(rows, FEATURES, { method: METHOD }) : null),
    [rows]
  );

  // Urutkan klaster dari yang terkecil: Klaster 1 (biru) -> 2 (oranye) -> 3 (hijau)
  const cut = useMemo(() => {
    if (!tree) return null;
    const raw = cutTree(tree, N_CLUSTERS);
    const idOf = (l) => (l && typeof l === "object" ? l.id : l);
    const nameOf = (l) => (l && typeof l === "object" ? l.name ?? l.row?.Provinsi : l);
    const rowOf = (l) => (l && typeof l === "object" ? l.row : null);
    const sorted = [...raw.clusters].sort((a, b) => a.leaves.length - b.leaves.length);
    const assign = new Map();
    sorted.forEach((c, i) => c.leaves.forEach((l) => assign.set(idOf(l), i)));

    // statistik seluruh provinsi untuk membandingkan tiap klaster
    const stat = {};
    FEATURES.forEach((f) => {
      const v = rows.map((r) => Number(r[f])).filter(Number.isFinite);
      const mean = v.reduce((s, x) => s + x, 0) / (v.length || 1);
      const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (v.length || 1)) || 1;
      stat[f] = { mean, sd };
    });

    const clusters = sorted.map((c) => {
      const members = c.leaves.map(rowOf).filter(Boolean);
      const traits = FEATURES.map((f) => {
        const v = members.map((r) => Number(r[f])).filter(Number.isFinite);
        if (!v.length) return null;
        const mean = v.reduce((s, x) => s + x, 0) / v.length;
        return { f, z: (mean - stat[f].mean) / stat[f].sd };
      })
        .filter(Boolean)
        .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
        .slice(0, 3);
      return { size: c.leaves.length, names: c.leaves.map(nameOf), traits };
    });
    return { assign, clusters };
  }, [tree, rows]);

  const total = cut ? cut.clusters.reduce((s, c) => s + c.size, 0) : 0;
  const active = hovered != null && cut ? cut.clusters[hovered] : null;

  const replay = () => {
    setHovered(null);
    setStage(1);
    setReplayKey((k) => k + 1);
  };

  // indikator alur: Dendrogram -> Garis potong -> 3 klaster -> Insight (otomatis, tidak bisa diklik)
  const reached = (i) => (i < 3 ? stage >= i + 1 : active != null);

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

        {/* Insight: muncul otomatis saat kursor berada di klaster mana pun */}
        <aside
          style={{
            flex: "0 0 280px",
            maxWidth: "100%",
            position: "sticky",
            top: "1rem",
            padding: "1rem 1.1rem",
            borderRadius: 10,
            background: "#f4f7fd",
            borderLeft: `4px solid ${active ? CLUSTER_COLORS[hovered] : "#d7dce8"}`,
            transition: "border-color 0.2s",
            minHeight: 140,
          }}
        >
          {!active ? (
            <p style={{ margin: 0, color: "#7d879c", fontSize: "0.95rem" }}>
              {stage >= 3
                ? "Arahkan kursor ke salah satu klaster (warna) untuk melihat insight."
                : "Insight akan muncul setelah klaster terbentuk."}
            </p>
          ) : (
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
              {active.traits.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "0.88rem", color: "#2b3350" }}>
                  {active.traits.map((t) => (
                    <li key={t.f} style={{ marginBottom: 2 }}>
                      <strong style={{ color: t.z > 0 ? "#2ca58d" : "#c0392b" }}>{t.z > 0 ? "↑" : "↓"}</strong>{" "}
                      {t.f}{" "}
                      <span style={{ color: "#7d879c" }}>
                        ({t.z > 0 ? "+" : "−"}{fmt(Math.abs(t.z))} SD)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ margin: "0.6rem 0 0", fontSize: "0.75rem", color: "#7d879c" }}>
                SD = selisih rata-rata klaster terhadap rata-rata {total} provinsi, dalam satuan simpangan baku.
              </p>
            </div>
          )}
        </aside>
      </div>
    </StorySection>
  );
}
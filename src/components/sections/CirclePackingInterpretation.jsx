import { motion } from "framer-motion";

const f = (v) =>
  v.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const TITLES = {
  1: "Klaster 1 — IPM Tertinggi",
  2: "Klaster 2 — IPM Relatif Rendah",
  3: "Klaster 3 — Kelompok Terbesar",
};

function clusterDescription(s) {
  if (s.n === 1) {
    return `Klaster ${s.id} hanya beranggotakan ${s.min.name} dengan IPM ${f(
      s.min.ipm
    )}.`;
  }
  return `Klaster ${s.id} mencakup ${s.n} provinsi dengan rata-rata IPM ${f(
    s.mean
  )}. Nilainya berkisar dari ${s.min.name} (${f(s.min.ipm)}) hingga ${
    s.max.name
  } (${f(s.max.ipm)}).`;
}

function overviewDescription(stats) {
  const total = stats.reduce((a, s) => a + s.n, 0);
  const top = stats.reduce((a, s) => (s.mean > a.mean ? s : a));
  const low = stats.reduce((a, s) => (s.mean < a.mean ? s : a));
  const largest = stats.reduce((a, s) => (s.n > a.n ? s : a));
  const allMin = stats.reduce((a, s) => (s.min.ipm < a.ipm ? s.min : a), stats[0].min);
  const allMax = stats.reduce((a, s) => (s.max.ipm > a.ipm ? s.max : a), stats[0].max);

  const parts = [
    `${total} provinsi terbagi menjadi ${stats.length} klaster.`,
    top.n === 1
      ? `Klaster ${top.id} memiliki IPM tertinggi (${f(top.mean)}) dan hanya beranggotakan ${top.min.name}.`
      : `Klaster ${top.id} memiliki rata-rata IPM tertinggi (${f(top.mean)}) dengan ${top.n} provinsi.`,
    low.id !== top.id
      ? `Klaster ${low.id} memiliki rata-rata IPM terendah (${f(low.mean)}) dengan ${low.n} provinsi.`
      : null,
    largest.id !== top.id && largest.id !== low.id
      ? `Klaster ${largest.id} adalah kelompok terbesar dengan ${largest.n} provinsi (rata-rata IPM ${f(largest.mean)}).`
      : null,
    `Secara keseluruhan, IPM berkisar dari ${allMin.name} (${f(allMin.ipm)}) hingga ${allMax.name} (${f(allMax.ipm)}).`,
  ];

  return parts.filter(Boolean).join(" ");
}

const box = {
  flex: 1,
  minWidth: 0,
  padding: "0.55rem 0.7rem",
  background: "#fff",
  border: "1px solid #dce3ef",
  borderRadius: 8,
};

function StatBox({ label, value }) {
  return (
    <div style={box}>
      <div style={{ fontSize: "0.72rem", color: "#5d6781" }}>{label}</div>
      <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#10213a" }}>
        {value}
      </div>
    </div>
  );
}

// Bagian tambahan (hanya desktop): ringkasan angka + konteks + daftar anggota
function Detail({ stats, selected }) {
  const total = stats.reduce((a, s) => a + s.n, 0);
  const overall = stats.reduce((a, s) => a + s.mean * s.n, 0) / total;

  if (selected) {
    const diff = selected.mean - overall;
    const members = [...(selected.members ?? [])].sort((a, b) => b.ipm - a.ipm);

    return (
      <>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
          <StatBox label="Jumlah provinsi" value={selected.n} />
          <StatBox label="Rata-rata IPM" value={f(selected.mean)} />
          <StatBox label="Rentang IPM" value={`${f(selected.min.ipm)} – ${f(selected.max.ipm)}`} />
        </div>

        <p style={{ margin: "0.8rem 0 0", fontSize: "0.9rem", color: "#3f4b65", lineHeight: 1.6 }}>
          Rata-rata IPM klaster ini {Math.abs(diff) < 0.005 ? "setara dengan" : `${f(Math.abs(diff))} poin ${diff > 0 ? "di atas" : "di bawah"}`} rata-rata
          seluruh provinsi ({f(overall)}).
          {selected.n > 1 &&
            ` Selisih antara anggota tertinggi dan terendah adalah ${f(selected.max.ipm - selected.min.ipm)} poin, sehingga anggotanya ${
              selected.max.ipm - selected.min.ipm < 5 ? "relatif homogen" : "cukup beragam"
            } dari sisi IPM.`}
        </p>

        <div style={{ marginTop: "0.8rem", fontSize: "0.78rem", fontWeight: 700, color: "#10213a" }}>
          Anggota klaster (urut IPM tertinggi)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.35rem" }}>
          {members.map((m) => (
            <span
              key={m.name}
              style={{
                fontSize: "0.74rem",
                padding: "0.15rem 0.5rem",
                background: "#fff",
                border: "1px solid #dce3ef",
                borderRadius: 999,
                color: "#3f4b65",
              }}
            >
              {m.name} · {f(m.ipm)}
            </span>
          ))}
        </div>
      </>
    );
  }

  const rows = [...stats].sort((a, b) => b.mean - a.mean);

  return (
    <div style={{ marginTop: "0.8rem" }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#10213a", marginBottom: "0.35rem" }}>
        Perbandingan klaster (urut rata-rata IPM)
      </div>
      {rows.map((s) => (
        <div
          key={s.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "0.75rem",
            padding: "0.4rem 0",
            borderTop: "1px solid #dce3ef",
            fontSize: "0.86rem",
            color: "#3f4b65",
          }}
        >
          <span><strong style={{ color: "#10213a" }}>Klaster {s.id}</strong> · {s.n} provinsi</span>
          <span>{f(s.mean)}</span>
        </div>
      ))}
      <p style={{ margin: "0.6rem 0 0", fontSize: "0.86rem", color: "#3f4b65", lineHeight: 1.6 }}>
        Rata-rata IPM seluruh provinsi adalah {f(overall)}. Kesenjangan antara klaster
        tertinggi dan terendah mencapai {f(rows[0].mean - rows[rows.length - 1].mean)} poin.
      </p>
    </div>
  );
}

export default function CirclePackingInterpretation({
  stats = [],
  selectedCluster = null,
  detailed = false,
}) {
  if (!stats.length) return null;

  const selected = stats.find((s) => s.id === selectedCluster) ?? null;

  const title = selected
    ? TITLES[selected.id] ?? `Klaster ${selected.id}`
    : "Gambaran Umum";

  const description = selected
    ? clusterDescription(selected)
    : overviewDescription(stats);

  const hint = selected
    ? "Klik klaster yang sama sekali lagi untuk kembali ke gambaran umum."
    : "Klik salah satu klaster untuk melihat interpretasinya.";

  return (
    <motion.div
      key={selected ? selected.id : "overview"}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        marginTop: "1.25rem",
        padding: "1rem 1.15rem",
        borderLeft: `4px solid ${selected ? "#2a6fdb" : "#9aa7bd"}`,
        background: "#f4f7fd",
        borderRadius: 10,
      }}
    >
      <h3
        style={{
          margin: "0 0 0.45rem",
          fontSize: "1rem",
          fontWeight: 700,
          color: "#10213a",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: "0.92rem",
          color: "#3f4b65",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>

      {detailed && <Detail stats={stats} selected={selected} />}

      <div
        style={{
          marginTop: "0.7rem",
          paddingTop: "0.65rem",
          borderTop: "1px solid #dce3ef",
          fontSize: "0.84rem",
          color: "#5d6781",
          lineHeight: 1.5,
        }}
      >
        <strong>Catatan:</strong> Klaster dibentuk berdasarkan seluruh
        indikator sosial-ekonomi, bukan berdasarkan IPM saja.
        <div style={{ marginTop: "0.35rem", fontStyle: "italic" }}>{hint}</div>
      </div>
    </motion.div>
  );
}
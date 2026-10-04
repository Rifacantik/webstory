import { motion } from "framer-motion";

const f = (v) =>
  v.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CirclePackingInterpretation({
  stats = [],
  selectedCluster = null,
}) {
  if (!stats.length) return null;

  const selected = stats.find((s) => s.id === selectedCluster);

  if (!selected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          marginTop: "1.25rem",
          padding: "1rem 1.15rem",
          borderLeft: "4px solid #9aa7bd",
          background: "#f4f7fd",
          borderRadius: 10,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.98rem",
            fontWeight: 600,
            color: "#5d6781",
            lineHeight: 1.5,
          }}
        >
          Klik salah satu klaster untuk melihat interpretasi.
        </p>
      </motion.div>
    );
  }

  const isSingle = selected.n === 1;

  let title = "";
  let description = "";

  if (selected.id === 1) {
    title = "Klaster 1 — IPM Tertinggi";
    description = isSingle
      ? `Klaster 1 hanya beranggotakan ${selected.min.name} dengan IPM ${f(
          selected.min.ipm
        )}. Nilai tersebut merupakan capaian IPM tertinggi dibandingkan provinsi lainnya.`
      : `Klaster 1 terdiri dari ${selected.n} provinsi dengan rata-rata IPM ${f(
          selected.mean
        )}. Rentang IPM berada pada ${f(selected.min.ipm)} hingga ${f(
          selected.max.ipm
        )}.`;
  } else if (selected.id === 2) {
    title = "Klaster 2 — IPM Relatif Rendah";
    description = `Klaster 2 terdiri dari ${selected.n} provinsi dengan rata-rata IPM ${f(
      selected.mean
    )}. Nilainya berkisar dari ${selected.min.name} (${f(
      selected.min.ipm
    )}) hingga ${selected.max.name} (${f(selected.max.ipm)}).`;
  } else if (selected.id === 3) {
    title = "Klaster 3 — Kelompok Terbesar";
    description = `Klaster 3 mencakup ${selected.n} provinsi dengan rata-rata IPM ${f(
      selected.mean
    )}. Nilainya berkisar dari ${selected.min.name} (${f(
      selected.min.ipm
    )}) hingga ${selected.max.name} (${f(selected.max.ipm)}).`;
  } else {
    title = `Klaster ${selected.id}`;
    description = `Klaster ${selected.id} terdiri dari ${
      selected.n
    } provinsi dengan rata-rata IPM ${f(selected.mean)}, dengan rentang ${
      selected.min.name
    } (${f(selected.min.ipm)}) hingga ${selected.max.name} (${f(
      selected.max.ipm
    )}).`;
  }

  return (
    <motion.div
      key={selected.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        marginTop: "1.25rem",
        padding: "1rem 1.15rem",
        borderLeft: "4px solid #2a6fdb",
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
      </div>
    </motion.div>
  );
}
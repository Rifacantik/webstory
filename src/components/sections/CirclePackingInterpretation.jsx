import { motion } from "framer-motion";

const f = (v) =>
  v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// stats: [{ id, n, mean, min: {name, ipm}, max: {name, ipm}, names: [] }]
export default function CirclePackingInterpretation({ stats = [] }) {
  if (!stats.length) return null;

  // contoh tumpang tindih: IPM tertinggi klaster "bawah" > IPM terendah klaster "atas"
  const asc = [...stats].sort((a, b) => a.mean - b.mean);
  let overlap = null;
  for (let i = 0; i < asc.length - 1 && !overlap; i++) {
    for (let j = i + 1; j < asc.length; j++) {
      if (asc[i].max.ipm > asc[j].min.ipm) {
        overlap = { low: asc[i], high: asc[j] };
        break;
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.6 }}
      style={{
        marginTop: "1.5rem",
        padding: "1rem 1.25rem",
        borderLeft: "4px solid #2a6fdb",
        background: "#f4f7fd",
        borderRadius: 10,
      }}
    >
      <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#2b3350", lineHeight: 1.5 }}>
        Klaster tidak dibentuk berdasarkan IPM saja, tetapi berdasarkan seluruh
        indikator sosial-ekonomi. Karena itu, nilai IPM antarklaster masih
        dapat saling tumpang tindih.
      </p>
      {overlap && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#5d6781" }}>
          Contoh: {overlap.low.max.name} (Klaster {overlap.low.id}, IPM{" "}
          {f(overlap.low.max.ipm)}) lebih tinggi daripada {overlap.high.min.name}{" "}
          (Klaster {overlap.high.id}, IPM {f(overlap.high.min.ipm)}).
        </p>
      )}
    </motion.div>
  );
}
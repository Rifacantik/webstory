import { motion } from "framer-motion";
import SourceNote from "./SourceNote";

// fill=true  : chart sederhana diregangkan memenuhi kolom kanan, tinggi 100vh
// fill=false : mode bebas untuk komponen dengan layout sendiri (mis. Dendrogram),
//              tinggi mengikuti isi dan kolom teks menempel (sticky) saat di-scroll
// top=true   : kolom teks rata atas (sejajar dengan bagian atas chart),
//              bukan di tengah secara vertikal
// source     : teks sumber data di bawah grafik; false = tidak ditampilkan
export default function StorySection({
  id,
  title,
  text,
  children,
  fill = true,
  top = false,
  source = "Badan Pusat Statistik",
}) {
  const classes = [
    "story-section",
    !children && "story-center",
    children && !fill && "story-section--free",
    top && "story-section--top",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.section
      id={id}
      className={classes}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6 }}
    >
      <div className="story-text">
        <h2>{title}</h2>
        {text}
      </div>
      {children && (
        <div className={`chart-wrap${fill ? " chart-wrap--fill" : ""}`}>
          {children}
          {source && <SourceNote>{source}</SourceNote>}
        </div>
      )}
    </motion.section>
  );
}
import { motion } from "framer-motion";

// fill=true  : chart sederhana diregangkan memenuhi kolom kanan, tinggi 100vh
// fill=false : mode bebas untuk komponen dengan layout sendiri (mis. Dendrogram),
//              tinggi mengikuti isi dan kolom teks menempel (sticky) saat di-scroll
export default function StorySection({ id, title, text, children, fill = true }) {
  const classes = [
    "story-section",
    !children && "story-center",
    children && !fill && "story-section--free",
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
        </div>
      )}
    </motion.section>
  );
}
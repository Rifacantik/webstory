import { motion } from "framer-motion";
import SourceNote from "./SourceNote";

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
import { motion } from "framer-motion";

// Pembungkus tiap section: judul + narasi + chart (children)
export default function StorySection({ id, title, children, text }) {
  return (
    <motion.section
      id={id}
      className="story-section"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6 }}
    >
      <div className="story-text">
        <h2>{title}</h2>
        {text}
      </div>
      {children && <div className="chart-wrap">{children}</div>}
    </motion.section>
  );
}

import { motion } from "framer-motion";
import "../../styles/bridge.css";

// Satu kalimat penghubung antar-section.
// Memakai <div>, bukan <section>, supaya tidak mengganggu pewarnaan selang-seling section.
export default function Bridge({ children }) {
  return (
    <div className="bridge">
      <motion.p
        className="bridge__text"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.7 }}
      >
        {children}
      </motion.p>
    </div>
  );
}
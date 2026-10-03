import { useEffect, useRef, useState } from "react";
import Globe from "../Globe";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const card = (visible, from) => ({
  position: "absolute",
  bottom: "8%",
  maxWidth: 420,
  padding: "1.1rem 1.4rem",
  borderRadius: 14,
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(6px)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  opacity: visible ? 1 : 0,
  transform: visible ? "translateY(0)" : `translateY(${from}px)`,
  transition: "opacity 0.5s, transform 0.5s",
  pointerEvents: "none",
});

export default function GlobeSection() {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      setProgress(clamp(-rect.top / total, 0, 1));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} style={{ height: "300vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <Globe progress={progress} />

        <div style={{ ...card(progress < 0.15, 20), left: "5%" }}>
          <h2 style={{ margin: "0 0 0.4rem" }}>Dunia</h2>
          <p style={{ margin: 0 }}>Scroll untuk menuju Indonesia.</p>
        </div>

        <div style={{ ...card(progress > 0.85, 20), right: "5%" }}>
          <h2 style={{ margin: "0 0 0.4rem" }}>Indonesia</h2>
          <p style={{ margin: 0 }}>Mari lihat lebih dekat kondisi tiap kabupaten/kota.</p>
        </div>

        {/* petunjuk scroll */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "2.5%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.85)",
            fontSize: "0.85rem",
            letterSpacing: "0.08em",
            opacity: progress < 0.05 ? 1 : 0,
            transition: "opacity 0.4s",
            pointerEvents: "none",
          }}
        >
          SCROLL ↓
        </div>
      </div>
    </section>
  );
}
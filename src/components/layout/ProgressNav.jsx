import { useEffect, useRef, useState } from "react";
import "../../styles/progress-nav.css";

// Daftar bab, urut dari atas ke bawah. id harus sama dengan id section di halaman.
// Bab yang id-nya tidak ditemukan otomatis dilewati.
const CHAPTERS = [
  { id: "choropleth", label: "Peta IPM" },
  { id: "proportional-symbol", label: "PDRB per kapita" },
  { id: "pca", label: "Pola antarprovinsi" },
  { id: "parallel-coordinates", label: "Profil provinsi" },
  { id: "dendrogram", label: "Pembentukan klaster" },
  { id: "circle-packing", label: "IPM tiap klaster" },
  { id: "kesimpulan", label: "Kesimpulan" },
];

export default function ProgressNav() {
  const barRef = useRef(null);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);

  // Cari section yang benar-benar ada di halaman
  useEffect(() => {
    const scan = () => {
      const found = CHAPTERS.filter((c) => document.getElementById(c.id));
      setItems((prev) =>
        prev.length === found.length && prev.every((p, i) => p.id === found[i].id)
          ? prev
          : found
      );
      if (import.meta.env.DEV) {
        const missing = CHAPTERS.filter((c) => !document.getElementById(c.id)).map((c) => c.id);
        if (missing.length) console.info("[ProgressNav] id tidak ditemukan:", missing);
      }
    };
    scan();
    const t = setTimeout(scan, 800); // jaga-jaga bila ada section yang dimuat belakangan
    window.addEventListener("load", scan);
    return () => {
      clearTimeout(t);
      window.removeEventListener("load", scan);
    };
  }, []);

  // Garis progres + bab yang sedang dibaca
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

      // bab aktif = section yang melewati garis tengah layar
      const mid = window.innerHeight / 2;
      let current = null;
      for (const c of items) {
        const el = document.getElementById(c.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          current = c.id;
          break;
        }
      }
      setActive((prev) => (prev === current ? prev : current));
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
  }, [items]);

  const go = (id) => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <div className="read-progress" aria-hidden="true">
        <div ref={barRef} className="read-progress__bar" />
      </div>

      {items.length > 0 && (
        <nav
          className={`chapter-nav${active ? " is-visible" : ""}`}
          aria-label="Navigasi bab"
        >
          <ol>
            {items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`chapter-nav__btn${active === c.id ? " is-active" : ""}`}
                  aria-current={active === c.id ? "true" : undefined}
                  aria-label={c.label}
                  onClick={() => go(c.id)}
                >
                  <span className="chapter-nav__label">{c.label}</span>
                  <span className="chapter-nav__dot" />
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </>
  );
}
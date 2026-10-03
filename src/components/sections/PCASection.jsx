import { useEffect, useRef, useState } from "react";
import StorySection from "../layout/StorySection";
import PCAPlot from "../charts/PCAPlot";
import PCAInterpretation from "./PCAInterpretation";
import { runPCA } from "../../utils/pca";
import { getIsland } from "../../utils/regions";
import "../../styles/pca-scrolly.css";

const FEATURES = [
  "IPM",
  "PDRB",
  "Kemiskinan",
  "TPT",
  "TPAK",
  "Kepadatan Penduduk",
  "Laju Pertumbuhan Penduduk",
  "Pengeluaran per Kapita",
];

// Jarak grafik dari tepi atas layar saat tertahan (px). Naikkan bila ada header tetap.
const PIN_TOP = 72;
// Layar selebar ini ke atas memakai dua kolom dengan grafik tertahan
const WIDE_QUERY = "(min-width: 900px)";

function useMediaQuery(query) {
  const [match, setMatch] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return match;
}

/**
 * Menahan grafik dengan JavaScript (bukan CSS sticky), supaya tidak terpengaruh
 * overflow/CSS pada elemen induk.
 *  - "before": section belum mencapai atas layar -> grafik di posisi normal
 *  - "fixed" : grafik ditempel di layar selama interpretasi bergulir (naik maupun turun)
 *  - "after" : interpretasi habis -> grafik berhenti di dasar section
 */
function usePinnedChart(scrollyRef, colRef, innerRef, enabled) {
  const [pin, setPin] = useState({ mode: "before", left: 0, width: 0 });

  useEffect(() => {
    if (!enabled) {
      setPin({ mode: "before", left: 0, width: 0 });
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const sc = scrollyRef.current;
      const col = colRef.current;
      const inner = innerRef.current;
      if (!sc || !col || !inner) return;
      const scR = sc.getBoundingClientRect();
      const colR = col.getBoundingClientRect();
      const h = inner.offsetHeight;

      let next;
      if (scR.top >= PIN_TOP) next = { mode: "before", left: 0, width: 0 };
      else if (scR.bottom - h <= PIN_TOP) next = { mode: "after", left: 0, width: 0 };
      else next = { mode: "fixed", left: Math.round(colR.left), width: Math.round(colR.width) };

      setPin((p) =>
        p.mode === next.mode && p.left === next.left && p.width === next.width ? p : next
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    // capture: true agar scroll di elemen mana pun (bukan hanya window) ikut terpantau
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    [scrollyRef.current, colRef.current, innerRef.current].forEach((el) => el && ro.observe(el));

    return () => {
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, scrollyRef, colRef, innerRef]);

  return pin;
}

export default function PCASection() {
  const [pcaResult, setPcaResult] = useState({
    points: [],
    variance: [],
  });
  // wilayah yang disorot di grafik, mengikuti kotak interpretasi yang sedang aktif
  const [focus, setFocus] = useState(null);

  const wide = useMediaQuery(WIDE_QUERY);
  const scrollyRef = useRef(null);
  const colRef = useRef(null);
  const innerRef = useRef(null);
  const pin = usePinnedChart(scrollyRef, colRef, innerRef, wide);

  useEffect(() => {
    fetch("/data/pca_complete.json")
      .then((res) => res.json())
      .then((rows) => {
        const result = runPCA(rows, FEATURES);
        setPcaResult({
          ...result,
          points: result.points.map((p) => ({
            ...p,
            name: p.Provinsi,
            group: getIsland(p.Provinsi),
          })),
        });
      })
      .catch((err) => {
        console.error("Gagal membaca data PCA:", err);
      });
  }, []);

  // Kolom grafik dibuat setinggi seluruh baris (stretch) sebagai jalur "rel";
  // isinya (inner) yang diposisikan sesuai mode.
  const colStyle = wide
    ? { position: "relative", alignSelf: "stretch", height: "auto" }
    : undefined;

  let innerStyle;
  if (wide && pin.mode === "fixed") {
    innerStyle = { position: "fixed", top: PIN_TOP, left: pin.left, width: pin.width, zIndex: 2 };
  } else if (wide && pin.mode === "after") {
    innerStyle = { position: "absolute", bottom: 0, left: 0, width: "100%" };
  } else {
    innerStyle = { position: "relative" };
  }

  return (
    <>
      {/* Judul + pengantar tetap memakai StorySection agar gayanya sama */}
      <StorySection
        id="pca"
        title="Bagaimana Karakteristik Provinsi Indonesia Jika Dilihat dari Berbagai Indikator?"
        text={
          <p>
            PCA digunakan untuk melihat kemiripan dan perbedaan karakteristik
            provinsi berdasarkan berbagai indikator sosial-ekonomi secara
            simultan. Provinsi yang posisinya berdekatan pada grafik memiliki
            karakteristik yang relatif mirip berdasarkan indikator yang
            digunakan.
          </p>
        }
      />

      {/* Grafik kiri (tertahan), interpretasi kanan (bergulir) */}
      <div
        className="pca-scrolly"
        ref={scrollyRef}
        style={wide ? { alignItems: "stretch" } : undefined}
      >
        <div
          className="pca-scrolly__chart"
          ref={colRef}
          style={{ ...colStyle, position: wide ? "relative" : undefined }}
        >
          <div ref={innerRef} style={innerStyle}>
            <div className="pca-card pca-chart-card">
              {pcaResult.points.length > 0 ? (
                <PCAPlot
                  points={pcaResult.points}
                  variance={pcaResult.variance}
                  focus={focus}
                />
              ) : (
                <div className="pca-chart-placeholder">Memuat grafik...</div>
              )}
            </div>
          </div>
        </div>

        <div className="pca-scrolly__steps">
          <PCAInterpretation
            variance={pcaResult.variance}
            onFocusChange={setFocus}
          />
        </div>
      </div>
    </>
  );
}
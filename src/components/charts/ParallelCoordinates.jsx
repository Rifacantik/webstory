import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { groupColor, GROUP_COLORS } from "../../utils/colors";

// Sumbu dengan sebaran sangat timpang (satu provinsi jauh di atas yang lain)
// memakai skala akar kuadrat supaya garis lain tidak menumpuk di bawah.
const SQRT_AXES = ["PDRB", "Kepadatan Penduduk"];

// Label pendek supaya muat di atas sumbu
const SHORT_LABELS = {
  "Kepadatan Penduduk": "Kepadatan",
  "Laju Pertumbuhan Penduduk": "Laju Pertumbuhan",
  "Pengeluaran per Kapita": "Pengeluaran",
};

// --- Pengaturan animasi buka/tutup ---
const ENTER_ZONE = 0.55; // garis terbuka penuh saat bagian atas grafik sudah naik ±55% tinggi layar
const EXIT_ZONE = 0.55;  // garis menutup penuh saat bagian bawah grafik tinggal ±55% tinggi layar
const SMOOTH = 0.12;     // 0-1, makin kecil makin "lembut" mengikuti scroll

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Terapkan progres (0 = tertutup, 1 = terbuka penuh) ke grafik:
// tirai (clip) menyapu garis dari kiri ke kanan, sumbu muncul saat tirai melewatinya.
function applyReveal(anim) {
  const r = anim.reveal;
  if (!r) return;
  const xf = r.x0 + (r.x1 - r.x0) * anim.p; // posisi tepi tirai
  r.clipRect.attr("width", Math.max(0, xf));
  r.axes.attr("opacity", (k) => clamp((xf - r.x(k) + 12) / 24));
}

// data: [{ name, group, ...nilai tiap dimensi }]
// getNote(d) -> string HTML interpretasi (opsional), ditampilkan di tooltip saat hover
export default function ParallelCoordinates({ data, dimensions, getNote }) {
  const [wrapRef, width] = useSize();
  const svgRef = useRef(null);
  const clipId = useRef("pc-clip-" + Math.random().toString(36).slice(2, 8));
  // p = progres saat ini, target = progres yang dituju (dari posisi scroll)
  const anim = useRef({ p: 0, target: 0, reveal: null, recompute: null });

  // 1) gambar grafik
  useEffect(() => {
    if (!data?.length || !width) return;

    const height = Math.min(560, Math.max(380, width * 0.55));
    const m = { top: 60, right: 40, bottom: 24, left: 50 };
    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    const x = d3
      .scalePoint()
      .domain(dimensions)
      .range([m.left, width - m.right]);

    const y = Object.fromEntries(
      dimensions.map((k) => {
        const [min, max] = d3.extent(data, (d) => d[k]);
        const scale = SQRT_AXES.includes(k)
          ? d3.scaleSqrt().domain([0, max]).nice()
          : d3.scaleLinear().domain([min, max]).nice();
        return [k, scale.range([height - m.bottom, m.top])];
      })
    );

    const line = d3.line();
    const pathOf = (d) => line(dimensions.map((k) => [x(k), y[k](d[k])]));
    const tip = getTooltip();

    // tirai: hanya bagian garis di sebelah kiri tepi tirai yang terlihat
    const clipRect = svg
      .append("defs")
      .append("clipPath")
      .attr("id", clipId.current)
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", height)
      .attr("width", 0);

    // sumbu digambar dulu supaya garis berada di atasnya
    const axes = svg
      .append("g")
      .selectAll("g")
      .data(dimensions)
      .join("g")
      .attr("transform", (k) => `translate(${x(k)},0)`);

    axes.each(function (k) {
      d3.select(this).call(d3.axisLeft(y[k]).ticks(5, "~s"));
    });

    axes
      .append("text")
      .attr("y", m.top - 22)
      .attr("text-anchor", "middle")
      .attr("fill", "#16213a")
      .attr("font-weight", 600)
      .attr("font-size", width < 640 ? 10 : 13)
      .text((k) => SHORT_LABELS[k] ?? k);

    // garis tiap provinsi (dipotong oleh tirai)
    const lines = svg
      .append("g")
      .attr("fill", "none")
      .attr("clip-path", `url(#${clipId.current})`)
      .selectAll("path")
      .data(data)
      .join("path")
      .attr("d", pathOf)
      .attr("stroke", (d) => groupColor(d.group))
      .attr("stroke-width", 1.6)
      .attr("stroke-opacity", 0.55)
      .style("cursor", "pointer")
      .on("mouseenter", function () {
        lines.attr("stroke-opacity", 0.08);
        d3.select(this)
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 3.5)
          .raise();
      })
      .on("mousemove", (e, d) => {
        const note = getNote ? getNote(d) : "";
        tip.show(
          e,
          `<strong>${d.name}</strong><br/>${d.group}` +
            (note
              ? `<div style="margin-top:6px;max-width:280px;white-space:normal;line-height:1.35;font-size:12px">${note}</div>`
              : "")
        );
      })
      .on("mouseleave", () => {
        lines.attr("stroke-opacity", 0.55).attr("stroke-width", 1.6);
        tip.hide();
      });

    // tepi tirai bergerak dari sebelum sumbu pertama sampai setelah sumbu terakhir
    anim.current.reveal = {
      clipRect,
      axes,
      x,
      x0: m.left - 14,
      x1: width - m.right + 20,
    };
    applyReveal(anim.current);
    anim.current.recompute?.(); // hitung ulang target dari posisi scroll saat ini
  }, [data, dimensions, width, getNote]);

  // 2) progres buka/tutup mengikuti posisi scroll
  useEffect(() => {
    const a = anim.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = null;

    const tick = () => {
      raf = null;
      const d = a.target - a.p;
      if (reduce || Math.abs(d) < 0.001) {
        a.p = a.target;
        applyReveal(a);
        return;
      }
      a.p += d * SMOOTH;
      applyReveal(a);
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (raf == null) raf = requestAnimationFrame(tick);
    };

    const recompute = () => {
      const el = svgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // masuk dari bawah layar: terbuka kiri -> kanan
      const pIn = clamp((vh - r.top) / (vh * ENTER_ZONE));
      // keluar lewat atas layar: menutup kanan -> kiri
      const pOut = clamp(r.bottom / (vh * EXIT_ZONE));
      a.target = Math.min(pIn, pOut);
      kick();
    };
    a.recompute = recompute;

    recompute();
    window.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
      if (raf != null) cancelAnimationFrame(raf);
      a.recompute = null;
    };
  }, []);

  return (
    <div ref={wrapRef}>
      <svg ref={svgRef} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem 1.25rem",
          marginTop: "1rem",
          fontSize: "0.95rem",
        }}
      >
        {Object.entries(GROUP_COLORS).map(([name, color]) => (
          <span
            key={name}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: color,
                display: "inline-block",
              }}
            />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
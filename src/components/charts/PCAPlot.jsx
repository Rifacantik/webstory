import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { groupColor, GROUP_COLORS } from "../../utils/colors";
import { clusterColor } from "../../utils/clusters";
import { useSelection } from "../../context/SelectionContext";

const SWEEP = 2200; // lama sapuan kiri ke kanan (ms)
const POP = 500; // lama satu titik muncul (ms)
const INK = "#16213a";
const ACCENT = "#c0392b";

// Anotasi: dx > 0 teks di kanan titik, dx < 0 teks di kiri titik.
// Kalau teks akan keluar dari chart, arahnya dibalik otomatis.
const ANNOTATIONS = [
  {
    name: "DKI Jakarta",
    lines: ["DKI Jakarta", "IPM, PDRB, dan pengeluaran", "per kapita tertinggi"],
    dx: -36,
    dy: 40,
  },
  {
    name: "Papua Pegunungan",
    lines: ["Papua Pegunungan", "IPM terendah,", "kemiskinan tertinggi"],
    dx: 36,
    dy: 40,
  },
  {
    name: "Kalimantan Timur",
    lines: ["Kalimantan Timur", "Pertumbuhan penduduk", "tertinggi (2,67%)"],
    dx: 36,
    dy: -6,
  },
];

const btn = {
  padding: "0.25rem 0.8rem",
  borderRadius: 8,
  border: "1px solid #c9d0e0",
  background: "#fff",
  color: "#2b3350",
  cursor: "pointer",
  fontSize: "0.85rem",
};

// points: [{ name, group, cluster, pc1, pc2 }], variance: [pc1, pc2, ...]
// focus: { names?: string[], groups?: string[] } | null  (sorotan dari kartu interpretasi)
export default function PCAPlot({ points, variance = [], focus = null }) {
  // wrapRef hanya membungkus area gambar, tanpa toolbar dan legenda
  const [wrapRef, width, boxH] = useSize();
  const svgRef = useRef(null);
  const scaleRef = useRef(null);
  const playedRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [colorBy, setColorBy] = useState("pulau"); // "pulau" | "klaster"
  const [showNotes, setShowNotes] = useState(true);
  const { selected, setSelected } = useSelection();

  const hasCluster = useMemo(
    () => points?.some((p) => p.cluster != null),
    [points]
  );

  const clusterCounts = useMemo(() => {
    const m = new Map();
    points?.forEach((p) => {
      if (p.cluster != null) m.set(p.cluster, (m.get(p.cluster) ?? 0) + 1);
    });
    return [...m.entries()].sort(([a], [b]) => a - b);
  }, [points]);

  // Mulai animasi saat chart terlihat di layar
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wrapRef]);

  // ---- gambar chart ----
  useEffect(() => {
    if (!points?.length) return;

    const height = Math.max(280, boxH);
    const m = { top: 20, right: 24, bottom: 50, left: 55 };
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();
    scaleRef.current = null;

    if (!inView) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // animasi hanya sekali per putaran; resize, ganti warna, atau anotasi tidak mengulangnya
    const animate = !reduced && playedRef.current !== replayKey;
    if (animate) playedRef.current = replayKey;

    const pad = (ext) => {
      const p = (ext[1] - ext[0]) * 0.05;
      return [ext[0] - p, ext[1] + p];
    };

    const x = d3.scaleLinear()
      .domain(pad(d3.extent(points, (d) => d.pc1))).nice()
      .range([m.left, width - m.right]);
    const y = d3.scaleLinear()
      .domain(pad(d3.extent(points, (d) => d.pc2))).nice()
      .range([height - m.bottom, m.top]);
    scaleRef.current = { x, y, m, width, height };

    const tip = getTooltip();
    const pct = (i) =>
      variance[i] != null ? ` (${(variance[i] * 100).toFixed(1)}%)` : "";
    const colorOf = (d) =>
      colorBy === "klaster" ? clusterColor(d.cluster) : groupColor(d.group);

    const axisX = svg.append("g")
      .attr("transform", `translate(0,${height - m.bottom})`)
      .call(d3.axisBottom(x));
    const axisY = svg.append("g")
      .attr("transform", `translate(${m.left},0)`)
      .call(d3.axisLeft(y));

    const labelX = svg.append("text")
      .attr("x", width / 2).attr("y", height - 10)
      .attr("text-anchor", "middle").attr("fill", "#5d6781")
      .text(`PC1${pct(0)}`);
    const labelY = svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", 16)
      .attr("text-anchor", "middle").attr("fill", "#5d6781")
      .text(`PC2${pct(1)}`);

    if (animate) {
      [axisX, axisY, labelX, labelY].forEach((s) =>
        s.attr("opacity", 0).transition().duration(600).attr("opacity", 1)
      );
    }

    const span = width - m.right - m.left;
    // saat titik mulai muncul (ms), mengikuti sapuan kiri ke kanan
    const appearAt = (d) => 300 + ((x(d.pc1) - m.left) / span) * SWEEP;

    const dots = svg.append("g").selectAll("circle").data(points).join("circle")
      .attr("class", "pca-dot")
      .attr("cx", (d) => x(d.pc1))
      .attr("cy", (d) => y(d.pc2))
      .attr("r", animate ? 0 : 8)
      .attr("fill", colorOf)
      .attr("fill-opacity", animate ? 0 : 0.85)
      .attr("stroke", "#fff")
      .style("cursor", "pointer")
      .on("mousemove", (e, d) =>
        tip.show(
          e,
          `<strong>${d.name}</strong><br/>${d.group}` +
            (d.cluster != null ? `<br/>Klaster ${d.cluster}` : "")
        )
      )
      .on("mouseleave", tip.hide)
      .on("click", (e, d) => setSelected(d.name === selected ? null : d.name));

    if (animate) {
      dots.transition()
        .delay(appearAt)
        .duration(POP)
        .ease(d3.easeBackOut.overshoot(2))
        .attr("r", 8)
        .attr("fill-opacity", 0.85);

      const sweep = svg.append("line")
        .attr("x1", m.left).attr("x2", m.left)
        .attr("y1", m.top).attr("y2", height - m.bottom)
        .attr("stroke", "#2a6fdb")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0.7);
      sweep.transition()
        .delay(300)
        .duration(SWEEP)
        .ease(d3.easeLinear)
        .attr("x1", width - m.right)
        .attr("x2", width - m.right)
        .transition()
        .duration(400)
        .attr("opacity", 0)
        .remove();
    }

    // ---- anotasi: cincin + garis penunjuk + teks ----
    // disembunyikan di layar sempit supaya tidak menutupi titik lain
    if (showNotes && width >= 560) {
      const byName = new Map(points.map((p) => [p.name, p]));
      const notes = ANNOTATIONS
        .map((a) => ({ ...a, p: byName.get(a.name) }))
        .filter((a) => a.p);

      const g = svg.append("g").style("pointer-events", "none");

      notes.forEach((a) => {
        const px = x(a.p.pc1);
        const py = y(a.p.pc2);

        // perkiraan lebar teks; balik arah bila akan keluar dari chart
        const tw = Math.max(...a.lines.map((l) => l.length)) * 6.6;
        let dx = a.dx;
        if (dx > 0 && px + dx + tw > width - 8) dx = -Math.abs(dx);
        if (dx < 0 && px + dx - tw < m.left + 4) dx = Math.abs(dx);

        // jaga teks tetap di atas sumbu x
        const blockH = (a.lines.length - 1) * 16;
        let dy = a.dy;
        const maxY = height - m.bottom - 8;
        if (py + dy + blockH > maxY) dy = maxY - blockH - py;

        const lx = px + dx;
        const ly = py + dy;
        const anchor = dx < 0 ? "end" : "start";
        const endX = lx + (dx < 0 ? 6 : -6);

        const group = g.append("g");

        group.append("circle")
          .attr("cx", px).attr("cy", py).attr("r", 13)
          .attr("fill", "none")
          .attr("stroke", ACCENT)
          .attr("stroke-width", 2);

        const ang = Math.atan2(ly - 5 - py, endX - px);
        group.append("line")
          .attr("x1", px + Math.cos(ang) * 13)
          .attr("y1", py + Math.sin(ang) * 13)
          .attr("x2", endX)
          .attr("y2", ly - 5)
          .attr("stroke", ACCENT)
          .attr("stroke-width", 1.5);

        const text = group.append("text")
          .attr("text-anchor", anchor)
          .attr("font-size", 12.5)
          .attr("fill", INK)
          .attr("stroke", "#fff")
          .attr("stroke-width", 4)
          .attr("paint-order", "stroke")
          .attr("stroke-linejoin", "round");

        a.lines.forEach((line, i) => {
          text.append("tspan")
            .attr("x", lx)
            .attr("y", ly + i * 16)
            .attr("font-weight", i === 0 ? 700 : 400)
            .text(line);
        });

        if (animate) {
          group.attr("opacity", 0)
            .transition()
            .delay(appearAt(a.p) + POP)
            .duration(500)
            .attr("opacity", 1);
        }
      });
    }
  }, [points, variance, width, boxH, inView, replayKey, colorBy, showNotes, selected, setSelected]);

  // ---- sorot provinsi terpilih / wilayah dari kartu (tanpa menggambar ulang chart) ----
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll(".pca-sel, .pca-focus").remove();
    const all = svg.selectAll("circle.pca-dot");
    const sc = scaleRef.current;
    if (!sc) {
      all.attr("opacity", 1);
      return;
    }

    const p = selected && points ? points.find((d) => d.name === selected) : null;

    // 1) Tidak ada pilihan manual: pakai sorotan dari kartu interpretasi
    if (!p) {
      if (!focus) {
        all.attr("opacity", 1);
        return;
      }
      const hit = (d) =>
        focus.names?.includes(d.name) || focus.groups?.includes(d.group);
      all.attr("opacity", (d) => (hit(d) ? 1 : 0.2));
      all.filter(hit).raise();

      const g = svg.append("g").attr("class", "pca-focus").style("pointer-events", "none");
      const annotated = new Set(ANNOTATIONS.map((a) => a.name));
      all.filter(hit).each(function (d) {
        const px = sc.x(d.pc1);
        const py = sc.y(d.pc2);
        g.append("circle")
          .attr("cx", px).attr("cy", py).attr("r", 13)
          .attr("fill", "none")
          .attr("stroke", ACCENT)
          .attr("stroke-width", 2);
        // label hanya untuk provinsi tunggal yang belum punya anotasi
        if (focus.names?.includes(d.name) && !annotated.has(d.name)) {
          g.append("text")
            .attr("x", px).attr("y", py - 20)
            .attr("text-anchor", "middle")
            .attr("font-size", 13)
            .attr("font-weight", 700)
            .attr("fill", INK)
            .attr("stroke", "#fff")
            .attr("stroke-width", 4)
            .attr("paint-order", "stroke")
            .attr("stroke-linejoin", "round")
            .text(d.name);
        }
      });
      return;
    }

    // 2) Ada pilihan manual: perilaku lama
    all.attr("opacity", (d) => (d.name === selected ? 1 : 0.3));
    all.filter((d) => d.name === selected).raise();

    const px = sc.x(p.pc1);
    const py = sc.y(p.pc2);
    const g = svg.append("g").attr("class", "pca-sel").style("pointer-events", "none");

    g.append("circle")
      .attr("cx", px).attr("cy", py).attr("r", 15)
      .attr("fill", "none")
      .attr("stroke", INK)
      .attr("stroke-width", 2.5);

    const nearTop = py < sc.m.top + 34;
    const anchor = px > sc.width - 100 ? "end" : px < sc.m.left + 90 ? "start" : "middle";
    const tx = anchor === "end" ? px + 12 : anchor === "start" ? px - 12 : px;
    g.append("text")
      .attr("x", tx)
      .attr("y", nearTop ? py + 34 : py - 22)
      .attr("text-anchor", anchor)
      .attr("font-size", 13)
      .attr("font-weight", 700)
      .attr("fill", INK)
      .attr("stroke", "#fff")
      .attr("stroke-width", 4)
      .attr("paint-order", "stroke")
      .attr("stroke-linejoin", "round")
      .text(p.name);
  }, [selected, focus, points, width, boxH, inView, replayKey, colorBy, showNotes]);

  const dot = (color) => (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        flex: "none",
      }}
    />
  );

  const pill = (active) => ({
    padding: "0.25rem 0.8rem",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    background: active ? INK : "#fff",
    color: active ? "#fff" : "#2b3350",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 440,
        gap: "0.6rem",
      }}
    >
      {/* Baris 1: kontrol */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem 1rem",
          flex: "none",
        }}
      >
        {hasCluster ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#5d6781", fontSize: "0.85rem" }}>Warnai menurut</span>
            <span
              role="group"
              aria-label="Warnai titik menurut"
              style={{
                display: "inline-flex",
                border: "1px solid #c9d0e0",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {[
                ["pulau", "Pulau"],
                ["klaster", "Klaster"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setColorBy(key)}
                  aria-pressed={colorBy === key}
                  style={pill(colorBy === key)}
                >
                  {label}
                </button>
              ))}
            </span>
          </span>
        ) : (
          <span />
        )}

        <span style={{ display: "inline-flex", gap: 8 }}>
          <button
            onClick={() => setShowNotes((v) => !v)}
            aria-pressed={showNotes}
            style={btn}
          >
            {showNotes ? "Sembunyikan anotasi" : "Tampilkan anotasi"}
          </button>
          <button onClick={() => setReplayKey((k) => k + 1)} style={btn}>
            ↻ Putar ulang
          </button>
        </span>
      </div>

      {/* Baris 2: area gambar. Ukurannya diukur di sini saja. */}
      <div
        ref={wrapRef}
        style={{ position: "relative", flex: "1 1 auto", minHeight: 300 }}
      >
        <svg
          ref={svgRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      </div>

      {/* Baris 3: legenda */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem 1.25rem",
          fontSize: "0.95rem",
          flex: "none",
        }}
      >
        {colorBy === "klaster" && hasCluster
          ? clusterCounts.map(([id, n]) => (
              <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {dot(clusterColor(id))}
                Klaster {id} ({n} provinsi)
              </span>
            ))
          : Object.entries(GROUP_COLORS).map(([name, color]) => (
              <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {dot(color)}
                {name}
              </span>
            ))}
      </div>
    </div>
  );
}
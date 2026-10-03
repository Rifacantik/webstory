import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { GROUP_COLORS } from "../../utils/colors";

// Palet Okabe-Ito (aman untuk buta warna) + bentuk penanda berbeda per kelompok,
// jadi kelompok tetap bisa dibedakan walaupun warnanya terlihat mirip.
const OKABE = ["#E69F00", "#0072B2", "#009E73", "#CC79A7", "#56B4E9", "#222222", "#D55E00"];
const SHAPES = [
  d3.symbolCircle,
  d3.symbolSquare,
  d3.symbolTriangle,
  d3.symbolDiamond,
  d3.symbolStar,
  d3.symbolWye,
  d3.symbolCross,
];
// Urutan kelompok mengikuti legenda yang sudah ada (keys GROUP_COLORS)
const GROUPS = Object.keys(GROUP_COLORS);

const styleFor = (group) => {
  const i = GROUPS.indexOf(group);
  return i < 0
    ? { color: "#888", shape: d3.symbolCircle }
    : { color: OKABE[i % OKABE.length], shape: SHAPES[i % SHAPES.length] };
};
const symbolPath = (shape, size) => d3.symbol().type(shape).size(size)();

const POINT_SIZE = 170;

// points: [{ name, group, pc1, pc2 }], variance: [pc1, pc2, ...]
// focus: null | { names?: string[], groups?: string[] } -> titik lain diredupkan
export default function PCAPlot({ points, variance = [], focus = null }) {
  const [wrapRef, width] = useSize();
  const svgRef = useRef(null);
  const scalesRef = useRef({});

  // 1) gambar grafik
  useEffect(() => {
    if (!points?.length || !width) return;
    const height = Math.min(560, width * 0.7);
    const m = { top: 20, right: 20, bottom: 50, left: 55 };
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    // beri sedikit ruang supaya titik tidak menempel di sumbu
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
    scalesRef.current = { x, y };

    const tip = getTooltip();
    const pct = (i) =>
      variance[i] != null ? ` (${(variance[i] * 100).toFixed(1)}%)` : "";

    svg.append("g")
      .attr("transform", `translate(0,${height - m.bottom})`)
      .call(d3.axisBottom(x));
    svg.append("g")
      .attr("transform", `translate(${m.left},0)`)
      .call(d3.axisLeft(y));

    svg.append("text")
      .attr("x", width / 2).attr("y", height - 10)
      .attr("text-anchor", "middle").attr("fill", "#5d6781")
      .text(`PC1${pct(0)}`);
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", 16)
      .attr("text-anchor", "middle").attr("fill", "#5d6781")
      .text(`PC2${pct(1)}`);

    svg.append("g").selectAll("path").data(points).join("path")
      .attr("class", "pca-point")
      .attr("d", (d) => symbolPath(styleFor(d.group).shape, POINT_SIZE))
      .attr("transform", (d) => `translate(${x(d.pc1)},${y(d.pc2)})`)
      .attr("fill", (d) => styleFor(d.group).color)
      .attr("fill-opacity", 0.9)
      .attr("stroke", "#222")
      .attr("stroke-width", 0.8)
      .on("mousemove", (e, d) => tip.show(e, `${d.name}<br/>${d.group}`))
      .on("mouseleave", tip.hide);

    // label nama provinsi untuk titik yang disorot (diisi di efek berikutnya)
    svg.append("g").attr("class", "pca-labels").style("pointer-events", "none");
  }, [points, variance, width]);

  // 2) sorot titik sesuai kotak interpretasi yang aktif
  useEffect(() => {
    const { x, y } = scalesRef.current;
    if (!x || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const match = (d) =>
      !focus || focus.names?.includes(d.name) || focus.groups?.includes(d.group);

    svg.selectAll(".pca-point")
      .transition().duration(300)
      .attr("opacity", (d) => (match(d) ? 1 : 0.15))
      .attr("transform", (d) =>
        `translate(${x(d.pc1)},${y(d.pc2)}) scale(${focus && match(d) ? 1.35 : 1})`);
    svg.selectAll(".pca-point").filter(match).raise();

    // beri label bila yang disorot tidak terlalu banyak
    const matched = focus ? points.filter(match) : [];
    const labelled = matched.length <= 8 ? matched : [];
    const flip = (d) => x(d.pc1) > width * 0.7;

    svg.select(".pca-labels").selectAll("text")
      .data(labelled, (d) => d.name)
      .join("text")
      .attr("x", (d) => x(d.pc1) + (flip(d) ? -13 : 13))
      .attr("y", (d) => y(d.pc2) + 4)
      .attr("text-anchor", (d) => (flip(d) ? "end" : "start"))
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("fill", "#1a2238")
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke")
      .text((d) => d.name);
  }, [focus, points, variance, width]);

  return (
    <div ref={wrapRef}>
      <svg ref={svgRef} role="img" aria-label="Grafik PCA provinsi Indonesia" />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem 1.25rem",
          marginTop: "1rem",
          fontSize: "0.95rem",
        }}
      >
        {GROUPS.map((name) => {
          const { color, shape } = styleFor(name);
          return (
            <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
                <path d={symbolPath(shape, 90)} fill={color} stroke="#222" strokeWidth="0.8" />
              </svg>
              {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
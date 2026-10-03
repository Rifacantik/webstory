import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { sequential } from "../../utils/colors";

const DWELL_MS = 300;   // kursor harus diam sebentar di wilayah sebelum zoom (mencegah zoom tak sengaja)
const RESET_MS = 250;   // jeda sebelum zoom kembali saat kursor keluar dari peta
const MAX_ZOOM = 14;    // batas pembesaran maksimum
const FIT = 0.7;        // wilayah memenuhi ±70% layar saat di-zoom

// geo: GeoJSON FeatureCollection
// getValue(feature, index) -> angka | getName(feature) -> string
// Hover (diam 0,3 detik) atau klik pada wilayah -> zoom ke wilayah itu.
// Kursor keluar dari peta -> zoom kembali ke seluruh Indonesia.
// getNote(feature) -> string HTML interpretasi (opsional), ditampilkan di tooltip saat hover
export default function Choropleth({ geo, getValue, getName, getNote, label = "Nilai" }) {
  const [wrapRef, width] = useSize();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!geo || !width) return;
    const height = width * 0.45;
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.interrupt();
    svg.selectAll("*").remove();

    const projection = d3.geoMercator().fitSize([width, height], geo);
    const path = d3.geoPath(projection);
    const values = geo.features.map(getValue);
    const color = sequential(d3.extent(values));
    const tip = getTooltip();

    const g = svg.append("g");
    const polys = g.selectAll("path")
      .data(geo.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d, i) => color(values[i]))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .attr("vector-effect", "non-scaling-stroke") // garis tetap tipis saat zoom
      .style("cursor", "zoom-in");

    // ---- legenda (koordinat layar, tidak ikut zoom) ----
    const drawLegend = () => {
      const ext = d3.extent(values);
      if (ext[0] == null || ext[0] === ext[1]) return;
      const lw = Math.max(120, Math.min(220, width * 0.22));
      const lh = 10;
      const x = 16;
      const y = height - 40;
      const gid = "legend-grad-" + Math.random().toString(36).slice(2, 8);

      const leg = svg.append("g").style("pointer-events", "none");
      const defs = leg.append("defs");
      const grad = defs.append("linearGradient").attr("id", gid);
      d3.range(0, 1.0001, 0.1).forEach((t) =>
        grad.append("stop")
          .attr("offset", `${t * 100}%`)
          .attr("stop-color", color(ext[0] + (ext[1] - ext[0]) * t))
      );

      const title = leg.append("text")
        .attr("x", x).attr("y", y - 8)
        .attr("font-size", 11).attr("font-weight", 600).attr("fill", "#333")
        .text(label);
      const panelW = Math.max(lw, title.node().getBBox().width) + 16;

      leg.insert("rect", "text")
        .attr("x", x - 8).attr("y", y - 24)
        .attr("width", panelW).attr("height", 62)
        .attr("rx", 6).attr("fill", "rgba(255,255,255,0.88)");

      leg.append("rect")
        .attr("x", x).attr("y", y)
        .attr("width", lw).attr("height", lh)
        .attr("fill", `url(#${gid})`)
        .attr("stroke", "#999").attr("stroke-width", 0.5);

      const axis = d3.axisBottom(d3.scaleLinear().domain(ext).range([0, lw]))
        .ticks(4).tickSize(4);
      leg.append("g")
        .attr("transform", `translate(${x},${y + lh})`)
        .call(axis)
        .call((a) => a.select(".domain").remove())
        .call((a) => a.selectAll("text").attr("font-size", 10).attr("fill", "#333"))
        .call((a) => a.selectAll("line").attr("stroke", "#666"));
    };
    drawLegend();

    // ---- zoom ----
    let view = { k: 1, tx: 0, ty: 0 };
    let active = null;
    let animating = false;
    let lockUntil = 0;
    let dwellTimer = null;
    let resetTimer = null;

    const apply = (v) => {
      view = v;
      g.attr("transform", `translate(${v.tx},${v.ty}) scale(${v.k})`);
    };

    const highlight = () => {
      polys
        .attr("stroke", (d) => (d === active ? "#222" : "#fff"))
        .attr("stroke-width", (d) => (d === active ? 2 : 0.5));
      if (active) polys.filter((d) => d === active).raise();
    };

    const animateTo = (to) => {
      const toCenter = (v) => [(width / 2 - v.tx) / v.k, (height / 2 - v.ty) / v.k, width / v.k];
      const i = d3.interpolateZoom(toCenter(view), toCenter(to));
      animating = true;
      tip.hide();
      svg.interrupt()
        .transition()
        .duration(Math.min(1400, Math.max(600, i.duration * 0.6)))
        .ease(d3.easeCubicInOut)
        .tween("zoom", () => (t) => {
          const [x, y, w] = i(t);
          const k = width / w;
          apply({ k, tx: width / 2 - k * x, ty: height / 2 - k * y });
        })
        .on("end", () => {
          apply(to);
          animating = false;
          lockUntil = performance.now() + 400;
        });
    };

    const zoomToFeature = (d) => {
      if (animating || (active === d && view.k > 1)) return;
      const [[x0, y0], [x1, y1]] = path.bounds(d);
      const bw = Math.max(x1 - x0, 1e-6);
      const bh = Math.max(y1 - y0, 1e-6);
      const k = Math.max(1, Math.min(MAX_ZOOM, FIT / Math.max(bw / width, bh / height)));
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      active = d;
      highlight();
      animateTo({ k, tx: width / 2 - k * cx, ty: height / 2 - k * cy });
    };

    const resetZoom = () => {
      active = null;
      highlight();
      if (view.k > 1.001 || animating) animateTo({ k: 1, tx: 0, ty: 0 });
    };

    const html = (d) => {
      const note = getNote ? getNote(d) : "";
      return (
        `<strong>${getName(d)}</strong><br/>${label}: ${getValue(d, geo.features.indexOf(d))}` +
        (note
          ? `<div style="margin-top:6px;max-width:260px;white-space:normal;line-height:1.35;font-size:12px">${note}</div>`
          : "")
      );
    };

    polys
      .on("mouseenter", (e, d) => {
        clearTimeout(resetTimer);
        if (animating || performance.now() < lockUntil) return;
        clearTimeout(dwellTimer);
        dwellTimer = setTimeout(() => zoomToFeature(d), DWELL_MS);
      })
      .on("mousemove", (e, d) => {
        if (!animating) tip.show(e, html(d));
      })
      .on("mouseleave", () => {
        clearTimeout(dwellTimer);
        tip.hide();
      })
      .on("click", (e, d) => {
        clearTimeout(dwellTimer);
        zoomToFeature(d); // untuk layar sentuh
      });

    svg
      .on("mouseenter", () => clearTimeout(resetTimer))
      .on("mouseleave", () => {
        clearTimeout(dwellTimer);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(resetZoom, RESET_MS);
      });

    return () => {
      clearTimeout(dwellTimer);
      clearTimeout(resetTimer);
      svg.interrupt();
      svg.on("mouseenter", null).on("mouseleave", null);
    };
  }, [geo, width, getValue, getName, getNote, label]);

  return (
    <div ref={wrapRef}>
      <svg ref={svgRef} style={{ display: "block", overflow: "hidden" }} />
    </div>
  );
}
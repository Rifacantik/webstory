import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { groupColor, GROUP_COLORS } from "../../utils/colors";
import { useSelection } from "../../context/SelectionContext";
import { DIRECTION } from "../../utils/profileInsight";

const SQRT_AXES = ["PDRB", "Kepadatan Penduduk"];
const INK = "#16213a";
const NARROW = 640; // di bawah lebar ini, label sumbu dibuat vertikal

const SHORT_LABELS = {
  "Kepadatan Penduduk": "Kepadatan",
  "Laju Pertumbuhan Penduduk": "Laju Pertumbuhan",
  "Pengeluaran per Kapita": "Pengeluaran",
};

// label ringkas untuk layar sempit
const MOBILE_LABELS = {
  "Kepadatan Penduduk": "Kepadatan",
  "Laju Pertumbuhan Penduduk": "Pertumbuhan",
  "Pengeluaran per Kapita": "Pengeluaran",
};

const arrowOf = (k) => (DIRECTION[k] === "up" ? " ↑" : DIRECTION[k] === "down" ? " ↓" : "");

// data: [{ name, group, ...nilai tiap dimensi }]
export default function ParallelCoordinates({ data, dimensions }) {
  const [wrapRef, width, boxH] = useSize();
  const svgRef = useRef(null);
  const { selected, setSelected } = useSelection();

  useEffect(() => {
    if (!data?.length) return;

    const narrow = width < NARROW;
    const height = Math.max(340, boxH);
    // layar sempit: ruang atas lebih besar untuk label vertikal
    const m = narrow
      ? { top: 118, right: 22, bottom: 24, left: 40 }
      : { top: 84, right: 40, bottom: 24, left: 50 };
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    const x = d3.scalePoint().domain(dimensions).range([m.left, width - m.right]);

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

    const axes = svg.append("g").selectAll("g").data(dimensions).join("g")
      .attr("transform", (k) => `translate(${x(k)},0)`);

    axes.each(function (k) {
      const ax = d3.axisLeft(y[k]).ticks(narrow ? 4 : 5, "~s");
      d3.select(this).call(ax);
    });
    if (narrow) axes.selectAll(".tick text").attr("font-size", 9);

    if (narrow) {
      // label vertikal (dibaca dari bawah ke atas), tepat di atas sumbu
      axes.append("text")
        .attr("transform", `translate(4,${m.top - 10}) rotate(-90)`)
        .attr("text-anchor", "start")
        .attr("fill", INK)
        .attr("font-weight", 600)
        .attr("font-size", 11)
        .text((k) => `${MOBILE_LABELS[k] ?? SHORT_LABELS[k] ?? k}${arrowOf(k)}`);
    } else {
      axes.append("text")
        .attr("y", m.top - 28)
        .attr("text-anchor", "middle")
        .attr("fill", INK)
        .attr("font-weight", 600)
        .attr("font-size", 13)
        .text((k) => SHORT_LABELS[k] ?? k);

      // petunjuk arah yang lebih baik, tepat di bawah judul sumbu
      axes.append("text")
        .attr("y", m.top - 12)
        .attr("text-anchor", "middle")
        .attr("fill", "#5d6781")
        .attr("font-size", 10.5)
        .text((k) =>
          DIRECTION[k] === "up" ? "↑ lebih baik" : DIRECTION[k] === "down" ? "↓ lebih baik" : ""
        );
    }

    const lines = svg.append("g").attr("fill", "none").selectAll("path").data(data).join("path")
      .attr("d", pathOf)
      .attr("stroke", (d) => groupColor(d.group))
      .style("cursor", "pointer");

    // keadaan diam: kalau ada provinsi terpilih, sorot itu dan redupkan yang lain
    const applyIdle = () => {
      lines
        .attr("stroke-width", (d) => (d.name === selected ? 4 : narrow ? 1.4 : 1.8))
        .attr("stroke-opacity", (d) => (selected ? (d.name === selected ? 1 : 0.1) : 0.55));
      if (selected) lines.filter((d) => d.name === selected).raise();
    };
    applyIdle();

    lines
      .on("mouseenter", function () {
        lines.attr("stroke-opacity", 0.08);
        d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", 3.5).raise();
      })
      .on("mousemove", (e, d) => tip.show(e, `${d.name}<br/>${d.group}`))
      .on("mouseleave", () => {
        applyIdle();
        tip.hide();
      })
      .on("click", (e, d) => setSelected(d.name === selected ? null : d.name));

    // provinsi terpilih: titik di tiap sumbu + nama di pojok kiri atas
    // (tidak di ujung garis, supaya tidak menimpa angka sumbu)
    const sel = selected ? data.find((d) => d.name === selected) : null;
    if (sel) {
      const g = svg.append("g").style("pointer-events", "none");

      dimensions.forEach((k) => {
        g.append("circle")
          .attr("cx", x(k))
          .attr("cy", y[k](sel[k]))
          .attr("r", 4.5)
          .attr("fill", groupColor(sel.group))
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      });

      g.append("circle")
        .attr("cx", m.left + 5)
        .attr("cy", 14)
        .attr("r", 5)
        .attr("fill", groupColor(sel.group));
      g.append("text")
        .attr("x", m.left + 16)
        .attr("y", 19)
        .attr("font-size", 14)
        .attr("font-weight", 700)
        .attr("fill", INK)
        .attr("stroke", "#fff")
        .attr("stroke-width", 4)
        .attr("paint-order", "stroke")
        .attr("stroke-linejoin", "round")
        .text(sel.name);
    }
  }, [data, dimensions, width, boxH, selected, setSelected]);

  return (
    <div ref={wrapRef}>
      <svg ref={svgRef} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem 1.25rem",
          paddingTop: "0.75rem",
          fontSize: "0.95rem",
        }}
      >
        {Object.entries(GROUP_COLORS).map(([name, color]) => (
          <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
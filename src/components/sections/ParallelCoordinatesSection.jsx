import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { groupColor, GROUP_COLORS } from "../../utils/colors";

const SQRT_AXES = ["PDRB", "Kepadatan Penduduk"];

const SHORT_LABELS = {
  "Kepadatan Penduduk": "Kepadatan",
  "Laju Pertumbuhan Penduduk": "Laju Pertumbuhan",
  "Pengeluaran per Kapita": "Pengeluaran",
};

// data: [{ name, group, ...nilai tiap dimensi }]
export default function ParallelCoordinates({ data, dimensions }) {
  const [wrapRef, width, boxH] = useSize();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data?.length) return;

    const height = Math.max(340, boxH);
    const m = { top: 60, right: 40, bottom: 24, left: 50 };
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
      d3.select(this).call(d3.axisLeft(y[k]).ticks(5, "~s"));
    });

    axes.append("text")
      .attr("y", m.top - 22)
      .attr("text-anchor", "middle")
      .attr("fill", "#16213a")
      .attr("font-weight", 600)
      .attr("font-size", width < 640 ? 10 : 13)
      .text((k) => SHORT_LABELS[k] ?? k);

    const lines = svg.append("g").attr("fill", "none").selectAll("path").data(data).join("path")
      .attr("d", pathOf)
      .attr("stroke", (d) => groupColor(d.group))
      .attr("stroke-width", 1.8)
      .attr("stroke-opacity", 0.55)
      .style("cursor", "pointer")
      .on("mouseenter", function () {
        lines.attr("stroke-opacity", 0.08);
        d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", 3.5).raise();
      })
      .on("mousemove", (e, d) => tip.show(e, `${d.name}<br/>${d.group}`))
      .on("mouseleave", () => {
        lines.attr("stroke-opacity", 0.55).attr("stroke-width", 1.8);
        tip.hide();
      });
  }, [data, dimensions, width, boxH]);

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
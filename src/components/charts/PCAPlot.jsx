import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { groupColor, GROUP_COLORS } from "../../utils/colors";

// points: [{ name, group, pc1, pc2 }], variance: [pc1, pc2, ...]
export default function PCAPlot({ points, variance = [] }) {
  const [wrapRef, width, boxH] = useSize();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!points?.length) return;
    const height = Math.max(320, boxH);
    const m = { top: 20, right: 24, bottom: 50, left: 55 };
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

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

    svg.append("g").selectAll("circle").data(points).join("circle")
      .attr("cx", (d) => x(d.pc1))
      .attr("cy", (d) => y(d.pc2))
      .attr("r", 8)
      .attr("fill", (d) => groupColor(d.group))
      .attr("fill-opacity", 0.8)
      .attr("stroke", "#fff")
      .on("mousemove", (e, d) => tip.show(e, `${d.name}<br/>${d.group}`))
      .on("mouseleave", tip.hide);
  }, [points, variance, width, boxH]);

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
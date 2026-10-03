import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { groupColor } from "../../utils/colors";

export default function Sunburst({ data }) {
  cconst [wrapRef, width, boxH] = useSize();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    const size = Math.min(width, Math.max(320, boxH));
    const radius = size / 2;
    const svg = d3.select(svgRef.current).attr("viewBox", [-size / 2, -size / 2, size, size]);
    svg.selectAll("*").remove();

    const root = d3.hierarchy(data).sum((d) => d.value || 0);
    d3.partition().size([2 * Math.PI, radius])(root);

    const arc = d3.arc()
      .startAngle((d) => d.x0).endAngle((d) => d.x1)
      .padAngle(0.005).innerRadius((d) => d.y0).outerRadius((d) => d.y1 - 1);
    const tip = getTooltip();
    const topGroup = (d) => d.ancestors().find((a) => a.depth === 1)?.data.name;

    svg.append("g").selectAll("path")
      .data(root.descendants().filter((d) => d.depth > 0))
      .join("path")
      .attr("d", arc)
      .attr("fill", (d) => groupColor(topGroup(d)))
      .attr("fill-opacity", (d) => (d.depth === 1 ? 0.95 : 0.65))
      .on("mousemove", (e, d) =>
        tip.show(e, `${d.ancestors().reverse().slice(1).map((a) => a.data.name).join(" / ")}<br/>${d.value}`))
      .on("mouseleave", tip.hide);
  }, [data, width]);

  return <div ref={wrapRef}><svg ref={svgRef} style={{ maxWidth: 640, margin: "0 auto" }} /></div>;
}

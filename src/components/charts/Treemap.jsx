import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { groupColor } from "../../utils/colors";

// data: { name, children: [{ name, children|value }] }
export default function Treemap({ data }) {
  const [wrapRef, width, boxH] = useSize(); 
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    const height = Math.max(320, boxH);
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    const root = d3.hierarchy(data).sum((d) => d.value || 0).sort((a, b) => b.value - a.value);
    d3.treemap().size([width, height]).paddingInner(2).paddingOuter(3).round(true)(root);
    const tip = getTooltip();

    const leaf = svg.selectAll("g").data(root.leaves()).join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    leaf.append("rect")
      .attr("width", (d) => d.x1 - d.x0).attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) => groupColor(d.parent.data.name))
      .attr("fill-opacity", 0.85)
      .on("mousemove", (e, d) =>
        tip.show(e, `${d.parent.data.name} / ${d.data.name}<br/>${d.value}`))
      .on("mouseleave", tip.hide);

    leaf.append("text").attr("x", 6).attr("y", 18).attr("fill", "#fff")
      .attr("font-size", 12).attr("font-weight", 600)
      .text((d) => ((d.x1 - d.x0) > 50 ? d.data.name : ""));
  }, [data, width]);

  return <div ref={wrapRef}><svg ref={svgRef} /></div>;
}

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { tile as d3Tile } from "d3-tile";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";
import { sequential } from "../../utils/colors";

const DWELL_MS = 300;   
const RESET_MS = 250;   
const MAX_ZOOM = 14;    
const FIT = 0.7;        
const EDGE = 24;        
const FILL = 0.78;         
const DIM = 0.1;           
const DIM_SIBLING = 0.35;  
const ACCENT = "#f97316";  
const STROKE = "rgba(255,255,255,0.55)"; 

const TILE_SIZE = 256;
const SEA = "#16384a"; 

const tileUrl = ([x, y, z]) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

const ATTRIBUTION = "Tiles © Esri — Maxar, Earthstar Geographics, dan kontributor GIS";

export default function Choropleth({
  geo,
  getValue,
  getName,
  getNote,
  onFocusChange,
  target = null,
  onPick,
  label = "Nilai",
}) {
  const [wrapRef, width, boxH] = useSize();
  const svgRef = useRef(null);
  const focusCb = useRef(onFocusChange);
  focusCb.current = onFocusChange;
  const targetRef = useRef(target);
  targetRef.current = target;
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const apiRef = useRef(null);

  useEffect(() => {
    if (!geo || !width) return;
    const height = Math.max(320, boxH);
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.interrupt();
    svg.selectAll("*").remove();

    const projection = d3.geoMercator().fitExtent(
      [[EDGE, EDGE], [width - EDGE, height - EDGE]],
      geo
    );
    const path = d3.geoPath(projection);
    const values = geo.features.map(getValue);
    const color = sequential(d3.extent(values));
    const tip = getTooltip();


    const [px, py] = projection.translate();
    const s0 = projection.scale();
    const tiler = d3Tile().tileSize(TILE_SIZE).size([width, height]);

    const gBase = svg.append("g").style("pointer-events", "none");
    const gDetail = svg.append("g").style("pointer-events", "none");

    const keyOf = (t) => `${t[2]}/${t[0]}/${t[1]}`;

    const baseTiles = tiler.scale(s0 * 2 * Math.PI).translate([px, py])();
    gBase
      .selectAll("image")
      .data(baseTiles, keyOf)
      .join("image")
      .attr("href", tileUrl)
      .attr("preserveAspectRatio", "none")
      .attr("x", (t) => (t[0] + baseTiles.translate[0]) * baseTiles.scale)
      .attr("y", (t) => (t[1] + baseTiles.translate[1]) * baseTiles.scale)
      .attr("width", baseTiles.scale + 0.5)
      .attr("height", baseTiles.scale + 0.5);

    const drawDetail = (v) => {
      const ts = tiler
        .scale(s0 * v.k * 2 * Math.PI)
        .translate([v.tx + v.k * px, v.ty + v.k * py])();
      gDetail
        .selectAll("image")
        .data(ts, keyOf)
        .join((enter) =>
          enter
            .append("image")
            .attr("href", tileUrl)
            .attr("preserveAspectRatio", "none")
        )
        .attr("x", (t) => (t[0] + ts.translate[0]) * ts.scale)
        .attr("y", (t) => (t[1] + ts.translate[1]) * ts.scale)
        .attr("width", ts.scale + 0.5)
        .attr("height", ts.scale + 0.5);
    };

    const g = svg.append("g");
    const polys = g.selectAll("path")
      .data(geo.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d, i) => color(values[i]))
      .attr("fill-opacity", FILL)
      .attr("stroke", STROKE)
      .attr("stroke-width", 0.5)
      .attr("vector-effect", "non-scaling-stroke") // garis tetap tipis saat zoom
      .style("cursor", "zoom-in");

    const drawLegend = () => {
      const ext = d3.extent(values);
      if (ext[0] == null || ext[0] === ext[1]) return;
      const lw = Math.max(120, Math.min(220, width * 0.2));
      const lh = 10;
      const x = width - lw - EDGE - 12;
      const y = height - 56;
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
        .attr("rx", 6).attr("fill", "rgba(255,255,255,0.9)");

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

    svg.append("text")
      .attr("x", width - 8)
      .attr("y", height - 8)
      .attr("text-anchor", "end")
      .attr("font-size", 10)
      .attr("fill", "#fff")
      .attr("stroke", "rgba(0,0,0,0.6)")
      .attr("stroke-width", 2.5)
      .attr("paint-order", "stroke")
      .style("pointer-events", "none")
      .text(ATTRIBUTION);

    let view = { k: 1, tx: 0, ty: 0 };
    let marked = new Set();   
    let dim = null;           
    let focusId = null;       
    let external = false;    
    let syncedTarget = null;
    let animating = false;
    let lockUntil = 0;
    let dwellTimer = null;
    let resetTimer = null;

    const apply = (v) => {
      view = v;
      const tf = `translate(${v.tx},${v.ty}) scale(${v.k})`;
      g.attr("transform", tf);
      gBase.attr("transform", tf);
      drawDetail(v);
    };

    const opacityOf = (d) => {
      if (!dim) return FILL;
      const id = d.properties.mhid;
      if (!dim.has(id)) return DIM;
      return focusId && id !== focusId ? DIM_SIBLING : FILL;
    };

    const highlight = () => {
      polys
        .attr("stroke", (d) => (marked.has(d) ? ACCENT : STROKE))
        .attr("stroke-width", (d) => (marked.has(d) ? 3 : 0.5))
        .attr("fill-opacity", opacityOf)
        .style("filter", (d) =>
          marked.has(d) ? "drop-shadow(0 0 8px rgba(249,115,22,0.9))" : null
        );
      if (marked.size) polys.filter((d) => marked.has(d)).raise();
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

    const goTo = (to, instant) => {
      if (!instant) return animateTo(to);
      svg.interrupt();
      apply(to);
      animating = false;
    };

    const viewFor = (fs) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const f of fs) {
        const [[a, b], [c, e]] = path.bounds(f);
        if (a < x0) x0 = a;
        if (b < y0) y0 = b;
        if (c > x1) x1 = c;
        if (e > y1) y1 = e;
      }
      const bw = Math.max(x1 - x0, 1e-6);
      const bh = Math.max(y1 - y0, 1e-6);
      const k = Math.max(1, Math.min(MAX_ZOOM, FIT / Math.max(bw / width, bh / height)));
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      return { k, tx: width / 2 - k * cx, ty: height / 2 - k * cy };
    };

    const zoomToFeature = (d) => {
      if (animating || (marked.has(d) && marked.size === 1 && view.k > 1)) return;
      marked = new Set([d]);
      highlight();
      focusCb.current?.(true);
      animateTo(viewFor([d]));
    };

    const resetZoom = () => {
      if (external) return; 
      marked = new Set();
      highlight();
      focusCb.current?.(false);
      if (view.k > 1.001 || animating) animateTo({ k: 1, tx: 0, ty: 0 });
    };

    const sync = (instant) => {
      const t = targetRef.current ?? null;
      if (t === syncedTarget) return;
      syncedTarget = t;
      clearTimeout(dwellTimer);
      clearTimeout(resetTimer);

      if (!t || !t.ids?.length) {
        if (!external) return;
        external = false;
        marked = new Set();
        dim = null;
        focusId = null;
        highlight();
        focusCb.current?.(false);
        if (view.k > 1.001 || animating) goTo({ k: 1, tx: 0, ty: 0 }, instant);
        return;
      }

      const ids = new Set(t.ids);
      const inProv = geo.features.filter((f) => ids.has(f.properties.mhid));
      if (!inProv.length) return;
      const kabF = t.kab ? inProv.find((f) => f.properties.mhid === t.kab) : null;

      external = true;
      dim = ids;
      focusId = kabF ? kabF.properties.mhid : null;
      marked = new Set(kabF ? [kabF] : []);
      highlight();
      focusCb.current?.(true);
      goTo(viewFor(kabF ? [kabF] : inProv), instant);
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
        if (external || animating || performance.now() < lockUntil) return;
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
        if (pickRef.current) pickRef.current(d); 
        else zoomToFeature(d);                 
      });

    svg
      .on("mouseenter", () => clearTimeout(resetTimer))
      .on("mouseleave", () => {
        clearTimeout(dwellTimer);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(resetZoom, RESET_MS);
      });

    apply(view); 
    apiRef.current = { sync: () => sync(false) };
    sync(true); 

    return () => {
      apiRef.current = null;
      clearTimeout(dwellTimer);
      clearTimeout(resetTimer);
      svg.interrupt();
      svg.on("mouseenter", null).on("mouseleave", null);
      focusCb.current?.(false);
    };
  }, [geo, width, boxH, getValue, getName, getNote, label]);

  useEffect(() => {
    apiRef.current?.sync();
  }, [target]);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <svg
        ref={svgRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: SEA,
        }}
      />
    </div>
  );
}
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { tile as d3Tile } from "d3-tile";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";

// Citra satelit Esri World Imagery (tanpa API key)
const SATELLITE_URL = (x, y, z) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const ATTRIBUTION = "Tiles © Esri — Maxar, Earthstar Geographics, dan kontributor GIS";

const DWELL_MS = 300;   // kursor harus diam sebentar di wilayah sebelum zoom (mencegah zoom tak sengaja)
const RESET_MS = 250;   // jeda sebelum zoom kembali saat kursor keluar dari peta
const MAX_ZOOM = 14;    // batas pembesaran maksimum
const FIT = 0.7;        // wilayah memenuhi ±70% layar saat di-zoom
const EDGE = 24;        // jarak peta dari tepi area (mode fill)

export default function ProportionalSymbol({
  geo,
  getValue,
  getName,
  getNote, // (feature) -> string HTML interpretasi (opsional), ditampilkan di tooltip
  target = null,
  onPick,
  onFocusChange,
  label = "Nilai",
  satellite = true,
  fill = false,
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
  const heightKey = fill ? boxH : 0; // tinggi induk hanya relevan di mode fill

  useEffect(() => {
    if (!geo || !width) return;
    const height = fill ? Math.max(320, boxH) : width * 0.45;
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.interrupt();
    svg.selectAll("*").remove();

    const projection = fill
      ? d3.geoMercator().fitExtent([[EDGE, EDGE], [width - EDGE, height - EDGE]], geo)
      : d3.geoMercator().fitSize([width, height], geo);
    const path = d3.geoPath(projection);
    const values = geo.features.map(getValue);
    const r = d3.scaleSqrt().domain([0, d3.max(values)]).range([0, Math.min(24, width / 40)]);
    const radii = values.map(r);
    const tip = getTooltip();
    const origin = projection([0, 0]);
    const worldScale = projection.scale() * 2 * Math.PI;

    // gaya dasar dan gaya "diredupkan" (di luar provinsi terpilih)
    const baseFill = satellite ? "rgba(0,0,0,0)" : "#e6e9f0";
    const dimFill = satellite ? "rgba(0,0,0,0.5)" : "#f6f7fa";
    const baseStroke = satellite ? "rgba(255,255,255,0.35)" : "#fff";
    const baseOpacity = satellite ? 0.75 : 0.6;
    const dimOpacity = 0.15;

    // Lapisan: tile dasar (ikut zoom) -> tile detail (koordinat layar) -> overlay (ikut zoom)
    const gBase = svg.append("g");
    const gDetail = svg.append("g").style("pointer-events", "none");
    const gOverlay = svg.append("g");

    const drawTiles = (g, k, tx, ty) => {
      const tiles = d3Tile()
        .size([width, height])
        .scale(worldScale * k)
        .translate([origin[0] * k + tx, origin[1] * k + ty])
        .zoomDelta(1)();
      g.selectAll("image")
        .data(tiles, (d) => d.join("/"))
        .join("image")
        .attr("href", ([x, y, z]) => SATELLITE_URL(x, y, z))
        .attr("x", ([x]) => (x + tiles.translate[0]) * tiles.scale)
        .attr("y", ([, y]) => (y + tiles.translate[1]) * tiles.scale)
        .attr("width", tiles.scale + 0.5) // +0.5 menutup celah antar-tile
        .attr("height", tiles.scale + 0.5);
    };

    if (satellite) drawTiles(gBase, 1, 0, 0);

    // batas wilayah (juga target hover/klik)
    const polys = gOverlay.append("g")
      .selectAll("path")
      .data(geo.features)
      .join("path")
      .attr("d", path)
      .attr("fill", baseFill)
      .attr("stroke", baseStroke)
      .attr("stroke-width", 0.4)
      .attr("vector-effect", "non-scaling-stroke")
      .style("pointer-events", "all")
      .style("cursor", "zoom-in");

    // lingkaran proporsional di centroid tiap wilayah
    const circles = gOverlay.append("g")
      .selectAll("circle")
      .data(geo.features)
      .join("circle")
      .attr("cx", (d) => path.centroid(d)[0])
      .attr("cy", (d) => path.centroid(d)[1])
      .attr("r", (d, i) => radii[i])
      .attr("fill", "#e0533a")
      .attr("fill-opacity", baseOpacity)
      .attr("stroke", satellite ? "#fff" : "#e0533a")
      .attr("stroke-width", satellite ? 0.6 : 1)
      .attr("vector-effect", "non-scaling-stroke")
      .style("pointer-events", "none");

    // atribusi (wajib dari penyedia citra), di koordinat layar
    if (satellite) {
      svg.append("text")
        .attr("x", width - (fill ? EDGE : 6))
        .attr("y", height - (fill ? 14 : 6))
        .attr("text-anchor", "end")
        .attr("font-size", 10)
        .attr("fill", "#fff")
        .attr("stroke", "rgba(0,0,0,0.6)")
        .attr("stroke-width", 2.5)
        .attr("paint-order", "stroke")
        .style("pointer-events", "none")
        .text(ATTRIBUTION);
    }

    // ---- legenda (koordinat layar, tidak ikut zoom) ----
    const drawLegend = () => {
      const maxV = d3.max(values);
      if (!maxV) return;
      // nilai contoh dibulatkan ke 1 angka penting: ±maks, ¼ maks, 1/16 maks
      const samples = [...new Set([1, 0.25, 0.0625]
        .map((f) => Number((maxV * f).toPrecision(1)))
        .filter((v) => v > 0))].sort((a, b) => b - a);
      const R = r(samples[0]);
      const fmt = d3.format(",.0f");
      const m = fill ? EDGE : 8; // jarak legenda dari tepi

      const leg = svg.append("g").style("pointer-events", "none");
      const title = leg.append("text")
        .attr("font-size", 11).attr("font-weight", 600).attr("fill", "#333")
        .text(label);
      const titleW = title.node().getBBox().width;

      const panelW = Math.max(titleW, 2 * R + 60) + 16;
      const panelH = 2 * R + 40;
      const px = m;
      const py = height - m - panelH;
      const baseY = py + panelH - 8;       // dasar lingkaran (rata bawah)
      const cx = px + 8 + R;

      leg.insert("rect", "text")
        .attr("x", px).attr("y", py)
        .attr("width", panelW).attr("height", panelH)
        .attr("rx", 6).attr("fill", "rgba(255,255,255,0.88)");
      title.attr("x", px + 8).attr("y", py + 16);

      samples.forEach((v) => {
        const rv = r(v);
        leg.append("circle")
          .attr("cx", cx).attr("cy", baseY - rv).attr("r", rv)
          .attr("fill", "none").attr("stroke", "#e0533a").attr("stroke-width", 1.2);
        leg.append("line")
          .attr("x1", cx).attr("x2", cx + R + 8)
          .attr("y1", baseY - 2 * rv).attr("y2", baseY - 2 * rv)
          .attr("stroke", "#999").attr("stroke-width", 0.6);
        leg.append("text")
          .attr("x", cx + R + 11).attr("y", baseY - 2 * rv + 3)
          .attr("font-size", 10).attr("fill", "#333")
          .text(fmt(v));
      });
    };
    drawLegend();

    // ---- zoom ----
    let view = { k: 1, tx: 0, ty: 0 };
    let marked = new Set();   // wilayah yang diberi garis kuning
    let dim = null;           // Set mhid provinsi terpilih; wilayah lain diredupkan
    let focusId = null;       // mhid kab/kota terpilih (tetangganya ikut diredupkan)
    let external = false;     // true saat zoom berasal dari pilihan (pencarian/klik), bukan hover
    let syncedTarget = null;
    let animating = false;
    let lockUntil = 0;
    let dwellTimer = null;
    let resetTimer = null;

    const apply = (v) => {
      view = v;
      const tr = `translate(${v.tx},${v.ty}) scale(${v.k})`;
      gBase.attr("transform", tr);
      gOverlay.attr("transform", tr);
      // ukuran lingkaran di layar dijaga tetap, jadi radius dibagi k
      circles.attr("r", (d, i) => radii[i] / v.k);
    };

    const outside = (d) => dim && !dim.has(d.properties.mhid);

    // kab/kota lain di provinsi yang sama, saat satu kab/kota dipilih
    const sibling = (d) =>
      focusId && dim && dim.has(d.properties.mhid) && d.properties.mhid !== focusId;
    const sibFill = satellite ? "rgba(0,0,0,0.3)" : "#eef0f5";
    const sibOpacity = 0.35;

    const highlight = () => {
      polys
        .attr("fill", (d) => (outside(d) ? dimFill : sibling(d) ? sibFill : baseFill))
        .attr("stroke", (d) => (marked.has(d) ? "#ffd60a" : baseStroke))
        .attr("stroke-width", (d) => (marked.has(d) ? 3 : 0.4))
        .style("filter", (d) =>
          marked.has(d) ? "drop-shadow(0 0 8px rgba(255,214,10,0.95))" : null
        );
      circles
        .attr("fill-opacity", (d) =>
          outside(d) ? dimOpacity : sibling(d) ? sibOpacity : baseOpacity
        )
        .attr("stroke-opacity", (d) =>
          outside(d) ? dimOpacity : sibling(d) ? sibOpacity : 1
        );
      if (marked.size) polys.filter((d) => marked.has(d)).raise();
    };

    const animateTo = (to) => {
      const toCenter = (v) => [(width / 2 - v.tx) / v.k, (height / 2 - v.ty) / v.k, width / v.k];
      const i = d3.interpolateZoom(toCenter(view), toCenter(to));
      animating = true;
      tip.hide();
      gDetail.selectAll("*").remove();
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
          // setelah zoom selesai, muat tile tajam sesuai tingkat zoom
          if (satellite && to.k > 1.001) drawTiles(gDetail, to.k, to.tx, to.ty);
        });
    };

    const goTo = (to, instant) => {
      if (!instant) return animateTo(to);
      svg.interrupt();
      gDetail.selectAll("*").remove();
      apply(to);
      animating = false;
      lockUntil = performance.now() + 400;
      if (satellite && to.k > 1.001) drawTiles(gDetail, to.k, to.tx, to.ty);
    };

    // view yang memuat semua wilayah di `fs`
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
      if (external) return; // pilihan dari pencarian/klik dipertahankan sampai di-Reset
      marked = new Set();
      highlight();
      focusCb.current?.(false);
      if (view.k > 1.001 || animating) animateTo({ k: 1, tx: 0, ty: 0 });
    };

    // Menyamakan peta dengan `target` dari luar (pencarian, klik, atau chart lain)
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
        if (pickRef.current) pickRef.current(d); // pilih/kunci wilayah -> target berubah -> sync()
        else zoomToFeature(d);                   // layar sentuh tanpa pilihan
      });

    svg
      .on("mouseenter", () => clearTimeout(resetTimer))
      .on("mouseleave", () => {
        clearTimeout(dwellTimer);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(resetZoom, RESET_MS);
      });

    apiRef.current = { sync: () => sync(false) };
    sync(true); // peta dibangun ulang (mis. resize): langsung ke pilihan terakhir tanpa animasi

    return () => {
      apiRef.current = null;
      clearTimeout(dwellTimer);
      clearTimeout(resetTimer);
      svg.interrupt();
      svg.on("mouseenter", null).on("mouseleave", null);
      focusCb.current?.(false);
    };
  }, [geo, width, heightKey, fill, getValue, getName, getNote, label, satellite]);

  // Pilihan berubah (tanpa membangun ulang peta)
  useEffect(() => {
    apiRef.current?.sync();
  }, [target]);

  return (
    <div ref={wrapRef} style={fill ? { position: "absolute", inset: 0 } : undefined}>
      <svg
        ref={svgRef}
        style={{
          display: "block",
          overflow: "hidden",
          ...(fill ? { width: "100%", height: "100%" } : null),
        }}
      />
    </div>
  );
}
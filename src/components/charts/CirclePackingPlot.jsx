import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getTooltip } from "../../hooks/useTooltip";

// Palet ramah buta warna (basis Okabe-Ito): ungu-kemerahan, oranye, biru.
// Tiap klaster punya warna gelap (lingkaran luar) dan terang (lingkaran dalam).
export const CLUSTER_PALETTE = {
  1: { outer: "#A23E7B", inner: "#F6D3E8" }, // 🩷 ungu-kemerahan
  2: { outer: "#B35400", inner: "#FAD08A" }, // 🟠 oranye
  3: { outer: "#0A2F55", inner: "#7DBBE8" }, // 🔵 biru
};
const FALLBACK = { outer: "#444444", inner: "#dddddd" };
export const getPalette = (id) => CLUSTER_PALETTE[id] ?? FALLBACK;

const TEXT = "#10213a";
const ZOOM = 1.2; // pembesaran saat hover provinsi
const fmt = (v) =>
  v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// semua cara membagi kata menjadi k baris (urutan kata tetap)
function partitions(words, k) {
  if (k === 1) return [[words.join(" ")]];
  const out = [];
  for (let i = 1; i <= words.length - (k - 1); i++) {
    const head = words.slice(0, i).join(" ");
    partitions(words.slice(i), k - 1).forEach((rest) => out.push([head, ...rest]));
  }
  return out;
}

// pilih pembagian 1-3 baris yang menghasilkan huruf terbesar di dalam lingkaran
function bestLayout(name, r) {
  const words = name.split(" ");
  let best = { fs: 0, lines: [name] };
  for (let k = 1; k <= Math.min(3, words.length); k++) {
    partitions(words, k).forEach((lines) => {
      const maxLen = Math.max(...lines.map((l) => l.length));
      // kotak teks (lebar ~0,6em per huruf, tinggi ~1,15em per baris) harus muat di dalam lingkaran
      const fs = (0.9 * r) / Math.hypot((maxLen * 0.6) / 2, (lines.length * 1.15) / 2);
      if (fs > best.fs) best = { fs, lines };
    });
  }
  return { lines: best.lines, fs: Math.max(5.5, Math.min(13, best.fs)) };
}

// angka yang naik dari 0 ke nilai akhir
function CountUp({ value, run, duration = 1400 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!run || reduced) {
      setV(run ? value : 0);
      return;
    }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setV(value * d3.easeCubicOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, run, duration]);
  return <>{fmt(v)}</>;
}

// clusters: [{ id, members: [{ name, ipm }] }]
export default function CirclePackingPlot({ clusters }) {
  const [wrapRef, width] = useSize();
  const outerRef = useRef(null);
  const svgRef = useRef(null);
  const playedRef = useRef(false);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState(null); // klaster yang disorot (kartu / lingkaran luar)

  // mulai animasi saat masuk layar
  useEffect(() => {
    const el = outerRef.current;
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
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stats = useMemo(
    () =>
      (clusters ?? []).map((c) => ({
        id: c.id,
        n: c.members.length,
        mean: d3.mean(c.members, (m) => m.ipm),
      })),
    [clusters]
  );

  // ---- gambar grafik ----
  useEffect(() => {
    if (!clusters?.length || !width) return;

    const size = Math.min(width, 720);
    const padX = 24, padT = 46, padB = 24;
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${size}`);
    svg.selectAll("*").remove();
    if (!inView) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const animate = !reduced && !playedRef.current;
    playedRef.current = true;

    // gradien + bayangan untuk lingkaran klaster
    const defs = svg.append("defs");
    clusters.forEach((c) => {
      const p = getPalette(c.id);
      const grad = defs.append("radialGradient")
        .attr("id", `cp-grad-${c.id}`)
        .attr("cx", "35%").attr("cy", "30%").attr("r", "85%");
      grad.append("stop").attr("offset", "0%")
        .attr("stop-color", d3.color(p.outer).brighter(0.8).formatHex());
      grad.append("stop").attr("offset", "100%").attr("stop-color", p.outer);
    });
    defs.append("filter").attr("id", "cp-shadow")
      .attr("x", "-25%").attr("y", "-25%").attr("width", "150%").attr("height", "150%")
      .append("feDropShadow")
      .attr("dx", 0).attr("dy", 6).attr("stdDeviation", 8)
      .attr("flood-color", "#0a1e3c").attr("flood-opacity", 0.22);

    const data = {
      name: "Indonesia",
      children: clusters.map((c) => ({
        name: `Klaster ${c.id}`,
        id: c.id,
        children: c.members.map((m) => ({
          name: m.name,
          ipm: m.ipm,
          value: m.ipm, // besar lingkaran = IPM
          clusterId: c.id,
        })),
      })),
    };

    const root = d3
      .hierarchy(data)
      .sum((d) => d.value || 0)
      .sort((a, b) => b.value - a.value);

    d3.pack()
      .size([width - 2 * padX, size - padT - padB])
      .padding((d) => (d.depth === 0 ? 14 : 3))(root);

    const g = svg.append("g").attr("transform", `translate(${padX},${padT})`);
    const tip = getTooltip();

    // ---- lingkaran luar: klaster ----
    g.append("g")
      .selectAll("circle")
      .data(root.children)
      .join("circle")
      .attr("class", "cp-cluster")
      .attr("data-c", (d) => d.data.id)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => (animate ? 0 : d.r))
      .attr("fill", (d) => `url(#cp-grad-${d.data.id})`)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", "url(#cp-shadow)")
      .style("cursor", "pointer")
      .on("mouseenter", (_, d) => setActive(d.data.id))
      .on("mousemove", (e, d) => {
        const vals = d.children.map((c) => c.data.ipm);
        tip.show(
          e,
          `<strong>Klaster ${d.data.id}</strong><br/>` +
            `${vals.length} provinsi<br/>` +
            `Rata-rata IPM: ${fmt(d3.mean(vals))}<br/>` +
            `Rentang IPM: ${fmt(d3.min(vals))} – ${fmt(d3.max(vals))}`
        );
      })
      .on("mouseleave", () => {
        setActive(null);
        tip.hide();
      })
      .each(function (d, i) {
        if (!animate) return;
        d3.select(this)
          .transition("e")
          .delay(i * 160)
          .duration(850)
          .ease(d3.easeBackOut)
          .attr("r", d.r);
      });

    // ---- lingkaran dalam: provinsi ----
    const leaf = g
      .append("g")
      .selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("class", "cp-leaf")
      .attr("data-c", (d) => d.data.clusterId)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer");

    // grup "zoom": dipakai untuk animasi masuk dan efek hover
    const zoom = leaf
      .append("g")
      .attr("class", "cp-zoom")
      .attr("transform", animate ? "scale(0)" : "scale(1)");

    zoom
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => getPalette(d.data.clusterId).inner)
      .attr("stroke", (d) => getPalette(d.data.clusterId).outer)
      .attr("stroke-width", 1.5);

    // label nama provinsi: selalu ditampilkan (ukuran huruf menyesuaikan lingkaran)
    zoom.each(function (d) {
      const { lines, fs } = bestLayout(d.data.name, d.r);
      const lh = fs * 1.12;
      const t = d3.select(this).append("g").style("pointer-events", "none");
      lines.forEach((line, i) => {
        t.append("text")
          .attr("y", (i - (lines.length - 1) / 2) * lh)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("font-size", fs)
          .attr("font-weight", 600)
          .attr("fill", TEXT)
          .text(line);
      });
    });

    if (animate) {
      zoom
        .transition("z")
        .delay((_, i) => 550 + i * 18)
        .duration(600)
        .ease(d3.easeBackOut)
        .attr("transform", "scale(1)");
    }

    // ---- hover provinsi: zoom ±1,2×, provinsi lain memudar, tooltip ----
    leaf
      .on("mouseenter", function (e, d) {
        const me = d3.select(this).raise();
        me.select(".cp-zoom")
          .style("filter", "drop-shadow(0 4px 8px rgba(10,30,60,0.35))")
          .transition("z")
          .duration(200)
          .ease(d3.easeCubicOut)
          .attr("transform", `scale(${ZOOM})`);
        me.select("circle").attr("stroke", "#111827").attr("stroke-width", 2.5);
        svg.selectAll(".cp-leaf")
          .transition("h")
          .duration(180)
          .attr("opacity", (o) => (o === d ? 1 : 0.3));
      })
      .on("mousemove", (e, d) =>
        tip.show(
          e,
          `<strong>${d.data.name}</strong><br/>` +
            `IPM: ${fmt(d.data.ipm)}<br/>` +
            `Klaster ${d.data.clusterId}`
        )
      )
      .on("mouseleave", function (e, d) {
        const me = d3.select(this);
        me.select(".cp-zoom")
          .style("filter", null)
          .transition("z")
          .duration(200)
          .ease(d3.easeCubicOut)
          .attr("transform", "scale(1)");
        me.select("circle")
          .attr("stroke", getPalette(d.data.clusterId).outer)
          .attr("stroke-width", 1.5);
        svg.selectAll(".cp-leaf").transition("h").duration(180).attr("opacity", 1);
        tip.hide();
      });

    // ---- label klaster di atas lingkaran luar ----
    const labels = g.append("g")
      .style("pointer-events", "none")
      .selectAll("text")
      .data(root.children)
      .join("text")
      .attr("class", "cp-label")
      .attr("data-c", (d) => d.data.id)
      .attr("x", (d) => d.x)
      .attr("y", (d) => {
        const above = d.y - d.r - 10;
        const clash = root.children.some(
          (o) => o !== d && Math.hypot(d.x - o.x, above - 6 - o.y) < o.r + 40
        );
        return clash ? d.y + d.r + 22 : above;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
      .attr("font-weight", 700)
      .attr("fill", TEXT)
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke")
      .text((d) => `Klaster ${d.data.id}`);
    if (animate) {
      labels.attr("opacity", 0).transition("e").delay(1000).duration(600).attr("opacity", 1);
    }
  }, [clusters, width, inView]);

  // ---- sorot klaster dari kartu / lingkaran luar ----
  useEffect(() => {
    d3.select(svgRef.current)
      .selectAll(".cp-cluster, .cp-leaf, .cp-label")
      .transition("h")
      .duration(180)
      .attr("opacity", function () {
        const c = +this.getAttribute("data-c");
        return active == null || c === active ? 1 : 0.2;
      });
  }, [active, width, inView, clusters]);

  return (
    <div ref={outerRef} style={{ minHeight: 320 }}>
      <div ref={wrapRef}>
        {/* ringkasan 3 klaster */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          {stats.map((s, i) => {
            const p = getPalette(s.id);
            const dim = active != null && active !== s.id;
            return (
              <div
                key={s.id}
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "0.75rem 1rem",
                  borderRadius: 12,
                  background: "#fff",
                  border: "1px solid #e3e7f0",
                  borderLeft: `5px solid ${p.outer}`,
                  boxShadow:
                    active === s.id
                      ? "0 8px 20px rgba(16,33,58,0.16)"
                      : "0 2px 6px rgba(16,33,58,0.06)",
                  transform: active === s.id ? "translateY(-3px)" : "none",
                  opacity: dim ? 0.45 : inView ? 1 : 0,
                  transition: `all 0.25s, opacity 0.6s ${i * 0.12}s`,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    flex: "none",
                    borderRadius: "50%",
                    background: p.outer,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: p.inner,
                      display: "inline-block",
                    }}
                  />
                </span>
                <span style={{ lineHeight: 1.25 }}>
                  <strong style={{ color: TEXT }}>Klaster {s.id}</strong>
                  <span style={{ color: "#5d6781" }}> · {s.n} provinsi</span>
                  <br />
                  <span style={{ fontSize: "0.8rem", color: "#5d6781" }}>
                    {s.n === 1 ? "IPM" : "Rata-rata IPM"}
                  </span>
                  <br />
                  <span style={{ fontSize: "1.35rem", fontWeight: 700, color: p.outer }}>
                    <CountUp value={s.mean} run={inView} />
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <svg ref={svgRef} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
    </div>
  );
}
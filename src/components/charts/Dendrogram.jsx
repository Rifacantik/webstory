import { CLUSTER_COLORS } from "../../utils/clusters";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useSize } from "../../hooks/useSize";
import { getLeaves } from "../../utils/hclust";
import { useSelection } from "../../context/SelectionContext";
import { textWidth } from "../../utils/textFit";

export { CLUSTER_COLORS };

const BASE = "#7d879c"; // cabang sebelum diwarnai
const ABOVE_CUT = "#cfd5e2"; // cabang di atas garis potong
const CUT_COLOR = "#c0392b";
const SPARK = "#2a6fdb";
const INK = "#16213a";
const NARROW = 640; // di bawah lebar ini, teks pendukung diperkecil / dipendekkan
const colorOf = (c) => (c < 0 ? ABOVE_CUT : CLUSTER_COLORS[c % CLUSTER_COLORS.length]);

// Pengaturan animasi (ms)
const T_LEAF = 700; // label & titik provinsi muncul
const T0 = 900; // penggabungan pertama mulai
const SPAN = 2600; // rentang waktu penggabungan
const H_DUR = 180; // tumbuh cabang horizontal
const V_DUR = 140; // tumbuh penghubung vertikal
const MAX_END = 6500; // batas total animasi tahap 1
const CUT_HOLD = 2200; // lama tahap 2 (garis potong) sebelum klaster diwarnai

// daftar node internal dari akar sampai induk langsung daun (urut akar -> induk), atau null
function pathTo(node, id, acc = []) {
  if (!node.children) return node.id === id ? acc : null;
  for (const c of node.children) {
    const r = pathTo(c, id, [...acc, node]);
    if (r) return r;
  }
  return null;
}

const leafName = (l) => l.name ?? l.row?.Provinsi;

/**
 * Alur otomatis: tahap 1 (dendrogram tumbuh) -> 2 (garis potong) -> 3 (klaster berwarna).
 * Komponen ini yang menjalankan timer dan memanggil onStageChange(n).
 *
 * root, assign, k      : seperti sebelumnya
 * stage                : 1 | 2 | 3 (dikendalikan parent)
 * onStageChange(n)     : dipanggil otomatis saat tahap selesai
 * activeCluster        : indeks klaster yang di-hover (atau null)
 * onHoverCluster(i|null): dipanggil saat kursor masuk/keluar klaster
 * replayKey            : ubah nilainya untuk memutar ulang
 *
 * Provinsi terpilih (dari kotak "Cari provinsi") diambil dari SelectionContext:
 * labelnya disorot, jalur penggabungannya ditebalkan, dan halaman digulir
 * ke provinsi itu bila berada di luar layar.
 */
export default function Dendrogram({
  root,
  assign,
  k = 3,
  stage = 1,
  onStageChange,
  activeCluster = null,
  onHoverCluster,
  methodLabel = "",
  replayKey = 0,
}) {
  const [wrapRef, width] = useSize();
  const { selected } = useSelection();
  const outerRef = useRef(null);
  const svgRef = useRef(null);
  const playedRef = useRef(null);
  const prevStageRef = useRef(null);
  const layoutRef = useRef(null);
  const prevSelRef = useRef(null);
  const stageCb = useRef(onStageChange);
  const hoverCb = useRef(onHoverCluster);
  stageCb.current = onStageChange;
  hoverCb.current = onHoverCluster;
  const [inView, setInView] = useState(false);

  // lebar label terpanjang (diukur setelah font siap) -> menentukan margin kanan
  const [labelW, setLabelW] = useState(0);
  useEffect(() => {
    if (!root || !svgRef.current) return;
    let off = false;
    const measure = () => {
      if (off || !svgRef.current) return;
      const fam = getComputedStyle(svgRef.current).fontFamily;
      const w = Math.max(...getLeaves(root).map((l) => textWidth(leafName(l) ?? "", `800 12px ${fam}`)));
      setLabelW(w);
    };
    (document.fonts?.ready ?? Promise.resolve()).then(measure);
    return () => {
      off = true;
    };
  }, [root]);

  // Mulai otomatis saat dendrogram masuk layar
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
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const sizes = useMemo(() => {
    const counts = Array(k).fill(0);
    assign?.forEach((c) => {
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [assign, k]);

  useEffect(() => {
    if (!root || !assign || !width || !labelW) return;

    const narrow = width < NARROW;

    const prevStage = prevStageRef.current;
    prevStageRef.current = stage;
    if (stage !== 1) playedRef.current = null;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const animate = stage === 1 && !reduced && playedRef.current !== replayKey;
    const dropCut = stage === 2 && prevStage === 1; // garis potong "jatuh" dari atas
    const fromCut = stage === 3 && prevStage === 2; // warna klaster muncul bertahap

    const leaves = getLeaves(root);
    const rowH = 20;
    // margin kanan = lebar label terpanjang + offset teks (14) + ruang sorotan kuning
    const m = { top: 38, right: Math.ceil(labelW) + 30, bottom: 50, left: 16 };
    const plotBottom = m.top + leaves.length * rowH;
    const height = plotBottom + m.bottom;
    const showCut = stage >= 2;
    const showColor = stage >= 3;

    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    // belum terlihat di layar: sisakan ruang kosong, mulai nanti
    if (stage === 1 && !inView) return;
    if (animate) playedRef.current = replayKey;

    const x = d3
      .scaleLinear()
      .domain([root.height, 0])
      .range([m.left, width - m.right])
      .nice();

    // node internal, urut dari jarak penggabungan terkecil
    const internals = [];
    (function collect(n) {
      if (!n.children) return;
      internals.push(n);
      n.children.forEach(collect);
    })(root);
    const byHeight = [...internals].sort((a, b) => a.height - b.height);
    const rank = new Map(byHeight.map((n, i) => [n, i]));
    const N = Math.max(1, internals.length - 1);

    // posisi garis potong
    const hs = byHeight.map((n) => n.height).reverse();
    const cutH = k > 1 && hs.length >= k ? (hs[k - 2] + hs[k - 1]) / 2 : 0;
    const xc = x(cutH);

    const yPos = new Map(leaves.map((l, i) => [l.id, m.top + i * rowH + rowH / 2]));
    const nodeY = new Map(); // posisi vertikal tiap node internal (untuk menelusuri jalur)

    // segmen cabang + jadwal animasi
    const segs = [];
    const sparks = [];
    function walk(n) {
      if (!n.children) return { y: yPos.get(n.id), c: assign.get(n.id), fin: T0 };
      const [a, b] = n.children;
      const ra = walk(a), rb = walk(b);
      const xn = x(n.height);
      const c = ra.c === rb.c ? ra.c : -1;
      const rankDelay = T0 + (rank.get(n) / N) * SPAN;
      const start = Math.max(rankDelay, ra.fin, rb.fin);
      const vStart = start + H_DUR;
      const fin = vStart + V_DUR;
      segs.push({ d: `M${x(a.height)},${ra.y}H${xn}`, c: ra.c, delay: start, dur: H_DUR });
      segs.push({ d: `M${x(b.height)},${rb.y}H${xn}`, c: rb.c, delay: start, dur: H_DUR });
      segs.push({ d: `M${xn},${ra.y}V${rb.y}`, c, delay: vStart, dur: V_DUR });
      const y = (ra.y + rb.y) / 2;
      nodeY.set(n.id, y);
      sparks.push({ x: xn, y, t: fin });
      return { y, c, fin };
    }
    const rootRes = walk(root);

    // simpan tata letak untuk sorotan provinsi terpilih (efek terpisah di bawah)
    layoutRef.current = { x, yPos, nodeY, leaves, height, rowH, animate };

    const scale = rootRes.fin > MAX_END ? (MAX_END - T0) / (rootRes.fin - T0) : 1;
    const sc = (t) => T0 + (t - T0) * scale;
    segs.forEach((s) => {
      s.delay = sc(s.delay);
      s.dur *= scale;
    });
    sparks.forEach((s) => (s.t = sc(s.t)));
    const endMs = Math.round(sc(rootRes.fin)) + 600;

    // area yang dipotong (di kiri garis)
    if (showCut) {
      const zone = svg.append("g").attr("opacity", dropCut ? 0 : 1);
      zone
        .append("rect")
        .attr("x", m.left)
        .attr("y", m.top - 6)
        .attr("width", Math.max(0, xc - m.left))
        .attr("height", plotBottom - m.top + 6)
        .attr("fill", "#fdecea");
      zone
        .append("text")
        .attr("x", m.left + 6)
        .attr("y", plotBottom - 8)
        .attr("font-size", 11)
        .attr("fill", CUT_COLOR)
        .text(narrow ? "dipotong" : "bagian yang dipotong");
      if (dropCut) zone.transition().delay(500).duration(700).attr("opacity", 1);
    }

    const axisG = svg.append("g").attr("transform", `translate(0,${plotBottom + 6})`);
    axisG.call(d3.axisBottom(x).ticks(6));

    const axisLabel = svg.append("text")
      .attr("x", narrow ? m.left : (m.left + width - m.right) / 2)
      .attr("y", height - 6)
      .attr("text-anchor", narrow ? "start" : "middle")
      .attr("font-size", 12)
      .attr("fill", "#5d6781")
      .text(`Jarak penggabungan${methodLabel ? ` (${methodLabel})` : ""}`);
    if (animate) {
      axisG.attr("opacity", 0).transition().duration(700).attr("opacity", 1);
      axisLabel.attr("opacity", 0).transition().duration(700).attr("opacity", 1);
    }

    const paths = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-width", 1.8)
      .attr("stroke-linecap", "round")
      .selectAll("path")
      .data(segs)
      .join("path")
      .attr("class", "dg-el")
      .attr("data-c", (s) => s.c)
      .attr("d", (s) => s.d)
      .attr("stroke", (s) => (showColor && !fromCut ? colorOf(s.c) : BASE));

    if (fromCut) {
      paths.transition("c").duration(900).attr("stroke", (s) => colorOf(s.c));
    }

    if (animate) {
      paths.each(function (s) {
        const len = this.getTotalLength();
        const sel = d3.select(this)
          .attr("stroke-opacity", 0)
          .attr("stroke-dasharray", `${len} ${len}`)
          .attr("stroke-dashoffset", len);
        sel.transition("o").delay(s.delay).duration(0).attr("stroke-opacity", 1);
        sel.transition("g")
          .delay(s.delay)
          .duration(s.dur)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0)
          .on("end", function () {
            d3.select(this).attr("stroke-dasharray", null).attr("stroke-dashoffset", null);
          });
      });

      svg.append("g")
        .selectAll("circle")
        .data(sparks)
        .join("circle")
        .attr("cx", (s) => s.x)
        .attr("cy", (s) => s.y)
        .attr("r", 2)
        .attr("fill", "none")
        .attr("stroke", SPARK)
        .attr("stroke-width", 1.5)
        .attr("opacity", 0)
        .each(function (s) {
          d3.select(this)
            .transition("s")
            .delay(s.t)
            .duration(0)
            .attr("opacity", 0.9)
            .transition("s2")
            .duration(550)
            .ease(d3.easeCubicOut)
            .attr("r", 11)
            .attr("opacity", 0)
            .remove();
        });
    }

    if (showCut) {
      const cg = svg.append("g");
      const line = cg.append("line")
        .attr("x1", xc).attr("x2", xc)
        .attr("y1", m.top - 14)
        .attr("y2", dropCut ? m.top - 14 : plotBottom)
        .attr("stroke", CUT_COLOR)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6 4");

      const nearLeft = xc < 140;
      const cutText = narrow
        ? `✂ Garis potong ≈ ${d3.format(".1f")(cutH)}`
        : `✂ Garis potong (jarak ≈ ${d3.format(".1f")(cutH)})`;
      const label = cg.append("text")
        .attr("x", nearLeft ? m.left : xc)
        .attr("y", m.top - 20)
        .attr("text-anchor", nearLeft ? "start" : "middle")
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .attr("fill", CUT_COLOR)
        .text(cutText);
      if (dropCut) {
        label.attr("opacity", 0).transition().duration(400).attr("opacity", 1);
        line.transition().delay(150).duration(800).ease(d3.easeCubicOut).attr("y2", plotBottom);
      }
    }

    const leafG = svg.append("g")
      .selectAll("g")
      .data(leaves)
      .join("g")
      .attr("class", "dg-el")
      .attr("data-name", (l) => leafName(l))
      .attr("data-c", (l) => assign.get(l.id))
      .attr("transform", (l) => `translate(${x(0)},${yPos.get(l.id)})`)
      .style("pointer-events", "none");

    if (showColor) {
      const bars = leafG.append("rect")
        .attr("x", 4).attr("y", -rowH / 2 + 2)
        .attr("width", 4).attr("height", rowH - 4)
        .attr("rx", 2)
        .attr("fill", (l) => colorOf(assign.get(l.id)));
      if (fromCut) bars.attr("opacity", 0).transition().duration(900).attr("opacity", 1);
    } else {
      const dots = leafG.append("circle")
        .attr("r", animate ? 0 : 3)
        .attr("fill", BASE);
      if (animate) {
        dots.transition()
          .delay((_, i) => (i / leaves.length) * T_LEAF)
          .duration(450)
          .ease(d3.easeBackOut)
          .attr("r", 3);
      }
    }
    const labels = leafG.append("text")
      .attr("x", 14)
      .attr("dy", "0.32em")
      .attr("font-size", 12)
      .attr("font-weight", showColor ? 600 : 400)
      .attr("fill", (l) => (showColor && !fromCut ? colorOf(assign.get(l.id)) : "#2b3350"))
      .text((l) => leafName(l));
    if (fromCut) {
      labels.transition().duration(900).attr("fill", (l) => colorOf(assign.get(l.id)));
    }
    if (animate) {
      labels
        .attr("opacity", 0)
        .attr("x", 4)
        .transition()
        .delay((_, i) => (i / leaves.length) * T_LEAF)
        .duration(450)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1)
        .attr("x", 14);
    }

    if (showColor) {
      const ranges = new Map();
      leaves.forEach((l, i) => {
        const c = assign.get(l.id);
        const r = ranges.get(c) || { min: i, max: i };
        r.min = Math.min(r.min, i);
        r.max = Math.max(r.max, i);
        ranges.set(c, r);
      });
      const bandData = [...ranges.entries()].map(([c, r]) => ({ c, ...r }));
      const bands = svg.append("g")
        .selectAll("rect")
        .data(bandData)
        .join("rect")
        .attr("class", "dg-band")
        .attr("data-c", (b) => b.c)
        .attr("x", xc)
        .attr("y", (b) => m.top + b.min * rowH + 1)
        .attr("width", Math.max(0, width - 4 - xc))
        .attr("height", (b) => (b.max - b.min + 1) * rowH - 2)
        .attr("rx", 6)
        .attr("fill", (b) => colorOf(b.c))
        .attr("fill-opacity", 0)
        .style("cursor", "pointer")
        .on("mouseenter", (_, b) => hoverCb.current?.(b.c))
        .on("mouseleave", () => hoverCb.current?.(null))
        .on("click", (_, b) => hoverCb.current?.(b.c)); 
      void bands;
    }

    let timer;
    if (stage === 1) {
      timer = setTimeout(() => stageCb.current?.(2), animate ? endMs : 300);
    } else if (stage === 2) {
      timer = setTimeout(() => stageCb.current?.(3), CUT_HOLD);
    }
    return () => clearTimeout(timer);
  }, [root, assign, k, stage, methodLabel, width, inView, replayKey, labelW]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll(".dg-el")
      .transition("h")
      .duration(160)
      .attr("opacity", function () {
        const c = +this.getAttribute("data-c");
        return activeCluster == null || c === activeCluster || c < 0 ? 1 : 0.15;
      });
    svg.selectAll(".dg-band")
      .transition("h")
      .duration(160)
      .attr("fill-opacity", function () {
        return +this.getAttribute("data-c") === activeCluster ? 0.1 : 0;
      });
  }, [activeCluster, stage, width, inView, root, assign, replayKey, labelW]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll(".dg-sel").remove();
    svg.selectAll("g.dg-el text").attr("font-weight", stage >= 3 ? 600 : 400);

    const L = layoutRef.current;
    if (!selected || !L || !root) {
      prevSelRef.current = selected;
      return;
    }

    if (stage === 1 && L.animate) return;

    const leaf = L.leaves.find((l) => leafName(l) === selected);
    const chain = leaf ? pathTo(root, leaf.id) : null;
    if (!leaf || !chain) {
      prevSelRef.current = selected;
      return;
    }

    const changed = prevSelRef.current !== selected;
    prevSelRef.current = selected;

    const { x, yPos, nodeY, rowH } = L;
    const yLeaf = yPos.get(leaf.id);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const leafGroup = svg.selectAll("g.dg-el").filter(function () {
      return this.getAttribute("data-name") === selected;
    });
    const textNode = leafGroup.select("text");
    textNode.attr("font-weight", 800);
    let tw = 0;
    try {
      tw = textNode.node()?.getComputedTextLength?.() ?? 0;
    } catch {
      tw = 0;
    }
    if (!tw) tw = selected.length * 7.2;
    const below = svg.insert("g", ":first-child").attr("class", "dg-sel").style("pointer-events", "none");
    below.append("rect")
      .attr("x", x(0) + 9)
      .attr("y", yLeaf - rowH / 2 + 1)
      .attr("width", tw + 12)
      .attr("height", rowH - 2)
      .attr("rx", 4)
      .attr("fill", "#ffe066")
      .attr("fill-opacity", 0.75);

    const above = svg.append("g").attr("class", "dg-sel").style("pointer-events", "none");
    const up = [...chain].reverse(); 
    const d =
      `M${x(0)},${yLeaf}` +
      up.map((n) => `H${x(n.height)}V${nodeY.get(n.id)}`).join("");
    const p = above.append("path")
      .attr("d", d)
      .attr("fill", "none")
      .attr("stroke", INK)
      .attr("stroke-width", 3.4)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");
    if (changed && !reduced) {
      const len = p.node().getTotalLength();
      p.attr("stroke-dasharray", `${len} ${len}`)
        .attr("stroke-dashoffset", len)
        .transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0)
        .on("end", () => p.attr("stroke-dasharray", null).attr("stroke-dashoffset", null));
    }

    up.forEach((n) => {
      above.append("circle")
        .attr("cx", x(n.height))
        .attr("cy", nodeY.get(n.id))
        .attr("r", 3.6)
        .attr("fill", "#fff")
        .attr("stroke", INK)
        .attr("stroke-width", 2);
    });

    const first = up[0];
    above.append("text")
      .attr("x", x(first.height) - 7)
      .attr("y", nodeY.get(first.id) - 6)
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("fill", INK)
      .attr("stroke", "#fff")
      .attr("stroke-width", 3.5)
      .attr("paint-order", "stroke")
      .attr("stroke-linejoin", "round")
      .text(`jarak ${d3.format(".1f")(first.height)}`);
  }, [selected, stage, width, inView, root, assign, replayKey, labelW]);

  useEffect(() => {
    const L = layoutRef.current;
    const svgEl = svgRef.current;
    if (!selected || !L || !svgEl || !root) return;
    const leaf = L.leaves.find((l) => leafName(l) === selected);
    if (!leaf) return;
    const r = svgEl.getBoundingClientRect();
    const vh = window.innerHeight;
    if (!(r.top < vh * 0.5 && r.bottom > vh * 0.5)) return;
    const y = r.top + L.yPos.get(leaf.id) * (r.height / L.height);
    if (y < 140 || y > vh - 140) {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollBy({ top: y - vh / 2, behavior: reduced ? "auto" : "smooth" });
    }
  }, [selected, root]);

  return (
    <div ref={outerRef} style={{ minHeight: 320 }}>
      <div ref={wrapRef}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem 1.25rem",
            marginBottom: "0.75rem",
            fontSize: "0.95rem",
            minHeight: "1.6rem",
            opacity: stage >= 3 ? 1 : 0,
            transition: "opacity 0.6s",
          }}
        >
          {stage >= 3 &&
            sizes.map((n, i) => (
              <span
                key={i}
                onMouseEnter={() => hoverCb.current?.(i)}
                onMouseLeave={() => hoverCb.current?.(null)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  opacity: activeCluster == null || activeCluster === i ? 1 : 0.35,
                  transition: "opacity 0.15s",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 4,
                    borderRadius: 2,
                    background: colorOf(i),
                    display: "inline-block",
                  }}
                />
                Klaster {i + 1} ({n} provinsi)
              </span>
            ))}
        </div>
        <svg ref={svgRef} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
    </div>
  );
}
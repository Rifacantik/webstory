import * as d3 from "d3";

// Satu-satunya sumber warna klaster untuk seluruh web story.
// Urutan: Klaster 1, 2, 3, ... (biru, oranye, hijau)
export const CLUSTER_COLORS = [
  "#2a6fdb",
  "#e8743b",
  "#2ca58d",
  "#9b59b6",
  "#d4a017",
  "#c0392b",
];

const NEUTRAL = "#888888";

// id klaster dimulai dari 1
export const clusterColor = (id) =>
  Number.isFinite(id) && id >= 1
    ? CLUSTER_COLORS[(id - 1) % CLUSTER_COLORS.length]
    : NEUTRAL;

// outer = warna pekat, inner = versi terang untuk isi lingkaran
export const clusterPalette = (id) => {
  const outer = clusterColor(id);
  return { outer, inner: d3.interpolateRgb(outer, "#ffffff")(0.72) };
};
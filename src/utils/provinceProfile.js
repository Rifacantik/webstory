// Interpretasi profil provinsi untuk grafik parallel coordinates.
// rows: data provinsi (pca_complete.json), features: daftar nama kolom indikator.

// arah "baik": +1 = makin tinggi makin baik, -1 = makin rendah makin baik, 0 = netral
const DIRECTION = {
  IPM: 1,
  PDRB: 1,
  Kemiskinan: -1,
  TPT: -1,
  TPAK: 1,
  "Pengeluaran per Kapita": 1,
  "Kepadatan Penduduk": 0,
  "Laju Pertumbuhan Penduduk": 0,
};

const LABEL = {
  IPM: "IPM",
  PDRB: "PDRB",
  Kemiskinan: "kemiskinan",
  TPT: "pengangguran (TPT)",
  TPAK: "partisipasi kerja (TPAK)",
  "Pengeluaran per Kapita": "pengeluaran per kapita",
  "Kepadatan Penduduk": "kepadatan penduduk",
  "Laju Pertumbuhan Penduduk": "laju pertumbuhan penduduk",
};

const PERCENT = new Set(["Kemiskinan", "TPT", "TPAK", "Laju Pertumbuhan Penduduk"]);

const fmt = (v, d = 2) =>
  Number(v).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: d });

export function buildProfileStats(rows, features) {
  const n = rows.length;
  // rank[k]: Map nama -> peringkat nilai (1 = nilai tertinggi)
  const rank = {};
  features.forEach((k) => {
    const sorted = [...rows].sort((a, b) => b[k] - a[k]);
    rank[k] = new Map(sorted.map((r, i) => [r.name, i + 1]));
  });
  return { n, rank, features };
}

// "tertinggi", "ke-3 tertinggi", "terendah", "ke-2 terendah", atau "menengah"
function position(r, n) {
  if (r === 1) return "tertinggi";
  if (r === n) return "terendah";
  return r <= n / 2 ? `ke-${r} tertinggi` : `ke-${n + 1 - r} terendah`;
}

export function profileNote(d, s) {
  const { n, rank, features } = s;
  const item = (k) => {
    const r = rank[k].get(d.name);
    const unit = PERCENT.has(k) ? "%" : "";
    return {
      k,
      r,
      goodRank: DIRECTION[k] >= 0 ? r : n + 1 - r, // 1 = paling baik
      text: `${LABEL[k] ?? k} ${fmt(d[k])}${unit} (${position(r, n)})`,
    };
  };

  const directional = features.filter((k) => DIRECTION[k] !== 0 && k in DIRECTION).map(item);
  const neutral = features.filter((k) => DIRECTION[k] === 0).map(item);

  const strengths = directional
    .filter((i) => i.goodRank <= 8)
    .sort((a, b) => a.goodRank - b.goodRank)
    .slice(0, 3);
  const weaknesses = directional
    .filter((i) => i.goodRank >= n - 7)
    .sort((a, b) => b.goodRank - a.goodRank)
    .slice(0, 3);
  const extremes = neutral.filter((i) => i.r <= 5 || i.r >= n - 4);

  const parts = [];
  if (strengths.length)
    parts.push(`<b>Menonjol:</b> ${strengths.map((i) => i.text).join("; ")}.`);
  if (weaknesses.length)
    parts.push(`<b>Perlu perhatian:</b> ${weaknesses.map((i) => i.text).join("; ")}.`);
  if (extremes.length)
    parts.push(`<b>Ciri lain:</b> ${extremes.map((i) => i.text).join("; ")}.`);
  if (!strengths.length && !weaknesses.length)
    parts.push("Pada indikator utama, posisinya berada di kisaran menengah antarprovinsi.");

  return parts.join("<br/>");
}
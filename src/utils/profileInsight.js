// Menghitung interpretasi profil tiap provinsi langsung dari data:
// peringkat per indikator, kelompok tinggi/menengah/rendah, kalimat ringkasan,
// dan provinsi yang paling mirip.

// "up"   = makin tinggi makin baik
// "down" = makin rendah makin baik
// null   = tidak ada arah baik/buruk yang pasti
export const DIRECTION = {
  IPM: "up",
  PDRB: "up",
  Kemiskinan: "down",
  TPT: "down",
  TPAK: "up",
  "Kepadatan Penduduk": null,
  "Laju Pertumbuhan Penduduk": null,
  "Pengeluaran per Kapita": "up",
};

const LABEL = {
  IPM: "IPM",
  PDRB: "PDRB",
  Kemiskinan: "Kemiskinan",
  TPT: "Pengangguran (TPT)",
  TPAK: "Partisipasi kerja (TPAK)",
  "Kepadatan Penduduk": "Kepadatan penduduk",
  "Laju Pertumbuhan Penduduk": "Laju pertumbuhan penduduk",
  "Pengeluaran per Kapita": "Pengeluaran per kapita",
};

const NOUN = {
  IPM: "IPM",
  PDRB: "PDRB",
  Kemiskinan: "tingkat kemiskinan",
  TPT: "tingkat pengangguran",
  TPAK: "partisipasi kerja",
  "Kepadatan Penduduk": "kepadatan penduduk",
  "Laju Pertumbuhan Penduduk": "laju pertumbuhan penduduk",
  "Pengeluaran per Kapita": "pengeluaran per kapita",
};

const PHRASE = {
  IPM: { high: "IPM tinggi", low: "IPM rendah" },
  PDRB: { high: "PDRB besar", low: "PDRB kecil" },
  Kemiskinan: { high: "kemiskinan tinggi", low: "kemiskinan rendah" },
  TPT: { high: "pengangguran tinggi", low: "pengangguran rendah" },
  TPAK: { high: "partisipasi kerja tinggi", low: "partisipasi kerja rendah" },
  "Kepadatan Penduduk": { high: "penduduk padat", low: "penduduk jarang" },
  "Laju Pertumbuhan Penduduk": {
    high: "pertumbuhan penduduk cepat",
    low: "pertumbuhan penduduk lambat",
  },
  "Pengeluaran per Kapita": {
    high: "pengeluaran per kapita tinggi",
    low: "pengeluaran per kapita rendah",
  },
};

const nf = (v, d = 0) =>
  Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

export function formatValue(feature, v) {
  switch (feature) {
    case "IPM":
      return nf(v, 2);
    case "Kepadatan Penduduk":
      return `${nf(v)} /km²`;
    case "PDRB":
    case "Pengeluaran per Kapita":
      return nf(v);
    default:
      return `${nf(v, 2)}%`;
  }
}

const joinList = (a) =>
  a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} dan ${a[a.length - 1]}`;

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// rows: [{ name, group, ...nilai tiap fitur }] -> Map(nama -> profil)
export function buildInsights(rows, features) {
  const n = rows.length;
  const third = Math.round(n / 3);

  // peringkat 1 = nilai tertinggi
  const rankOf = {};
  features.forEach((f) => {
    const m = new Map();
    rows.forEach((r) => {
      m.set(r.name, rows.filter((o) => o[f] > r[f]).length + 1);
    });
    rankOf[f] = m;
  });

  const rankVec = new Map(
    rows.map((r) => [r.name, features.map((f) => rankOf[f].get(r.name))])
  );

  const byExt = (a, b) => a.extremity - b.extremity;
  const phrase = (i) =>
    PHRASE[i.feature]?.[i.level === "tinggi" ? "high" : "low"] ??
    `${i.label} ${i.level}`;

  const result = new Map();

  rows.forEach((r) => {
    const items = features.map((f) => {
      const rank = rankOf[f].get(r.name);
      const level =
        rank <= third ? "tinggi" : rank > n - third ? "rendah" : "menengah";
      const dir = DIRECTION[f] ?? null;
      let tone = "netral";
      if (dir === "up") tone = level === "tinggi" ? "baik" : level === "rendah" ? "lemah" : "netral";
      if (dir === "down") tone = level === "rendah" ? "baik" : level === "tinggi" ? "lemah" : "netral";
      return {
        feature: f,
        label: LABEL[f] ?? f,
        value: r[f],
        rank,
        level,
        tone,
        pos: n > 1 ? (n - rank) / (n - 1) : 0.5, // 0 = terendah, 1 = tertinggi
        extremity: Math.min(rank - 1, n - rank),
      };
    });

    const ipm = items.find((i) => i.feature === "IPM");
    const headline = ipm
      ? `IPM ${formatValue("IPM", ipm.value)} menempatkannya di peringkat ${ipm.rank} dari ${n} provinsi.`
      : "";

    const strengths = items
      .filter((i) => i.tone === "baik")
      .sort(byExt)
      .slice(0, 3)
      .map(phrase);
    const weaknesses = items
      .filter((i) => i.tone === "lemah")
      .sort(byExt)
      .slice(0, 3)
      .map(phrase);

    const highlights = items
      .filter(
        (i) =>
          i.rank === 1 ||
          i.rank === n ||
          (DIRECTION[i.feature] == null && (i.rank <= 5 || i.rank > n - 5))
      )
      .sort(byExt)
      .slice(0, 3)
      .map((i) => {
        const noun = NOUN[i.feature] ?? i.label;
        if (i.rank === 1) return `${noun} tertinggi se-Indonesia`;
        if (i.rank === n) return `${noun} terendah se-Indonesia`;
        return i.rank <= 5 ? `${noun} termasuk lima tertinggi` : `${noun} termasuk lima terendah`;
      });

    // provinsi paling mirip = jarak terdekat pada vektor peringkat
    const mine = rankVec.get(r.name);
    const similar = rows
      .filter((o) => o.name !== r.name)
      .map((o) => {
        const v = rankVec.get(o.name);
        const d = Math.sqrt(v.reduce((s, x, k) => s + (x - mine[k]) ** 2, 0));
        return { name: o.name, d };
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map((x) => x.name);

    result.set(r.name, {
      name: r.name,
      group: r.group,
      n,
      headline,
      strengths: strengths.length ? cap(joinList(strengths)) : "",
      weaknesses: weaknesses.length ? cap(joinList(weaknesses)) : "",
      highlights: highlights.length ? cap(joinList(highlights)) : "",
      items,
      similar,
    });
  });

  return result;
}
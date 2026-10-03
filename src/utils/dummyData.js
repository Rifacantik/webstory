// Data dummy supaya semua chart langsung tampil.
// GANTI dengan data asli (CSV/JSON di public/data) kalau sudah siap.

const rng = (seed) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

const REGIONS = {
  Sumatera: ["Aceh", "Sumut", "Riau", "Lampung"],
  Jawa: ["Jakarta", "Jabar", "Jateng", "Jatim"],
  Kalimantan: ["Kalbar", "Kalteng", "Kalsel", "Kaltim"],
  Sulawesi: ["Sulut", "Sulteng", "Sulsel", "Sultra"],
  Papua: ["Papua", "Papua Barat", "Maluku", "Malut"],
};

export const FEATURES = [
  "Pendapatan",
  "Pendidikan",
  "Kesehatan",
  "Infrastruktur",
  "Digital",
];

const rand = rng(42);
export const dummyRows = Object.entries(REGIONS).flatMap(([group, names]) =>
  names.map((name) => {
    const row = { name, group, population: Math.round(1 + rand() * 40) };
    FEATURES.forEach((f) => (row[f] = Math.round(30 + rand() * 70)));
    return row;
  })
);

// Hirarki untuk treemap dan sunburst: root > group > wilayah
export const dummyHierarchy = {
  name: "Indonesia",
  children: Object.keys(REGIONS).map((group) => ({
    name: group,
    children: dummyRows
      .filter((r) => r.group === group)
      .map((r) => ({ name: r.name, value: r.population })),
  })),
};

// Nilai dummy per fitur peta (berdasarkan urutan fitur di GeoJSON)
export const dummyValueByIndex = (i) => 20 + ((i * 37) % 80);

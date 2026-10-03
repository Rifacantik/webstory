const ISLAND = {
  Sumatera: [
    "Aceh",
    "Sumatera Utara",
    "Sumatera Barat",
    "Riau",
    "Jambi",
    "Sumatera Selatan",
    "Bengkulu",
    "Lampung",
    "Kepulauan Bangka Belitung",
    "Kepulauan Riau",
  ],
  Jawa: [
    "DKI Jakarta",
    "Jawa Barat",
    "Jawa Tengah",
    "DI Yogyakarta",
    "Jawa Timur",
    "Banten",
  ],
  "Bali & Nusa Tenggara": ["Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur"],
  Kalimantan: [
    "Kalimantan Barat",
    "Kalimantan Tengah",
    "Kalimantan Selatan",
    "Kalimantan Timur",
    "Kalimantan Utara",
  ],
  Sulawesi: [
    "Sulawesi Utara",
    "Sulawesi Tengah",
    "Sulawesi Selatan",
    "Sulawesi Tenggara",
    "Gorontalo",
    "Sulawesi Barat",
  ],
  Maluku: ["Maluku", "Maluku Utara"],
  Papua: [
    "Papua Barat",
    "Papua Barat Daya",
    "Papua",
    "Papua Selatan",
    "Papua Tengah",
    "Papua Pegunungan",
  ],
};

export const getIsland = (provinsi) =>
  Object.keys(ISLAND).find((k) => ISLAND[k].includes(provinsi)) ?? "Lainnya";
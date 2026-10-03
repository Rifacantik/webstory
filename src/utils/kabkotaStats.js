import * as d3 from "d3";

// Format angka gaya Indonesia: 1.234,5
export const fmt = (v, d = 1) =>
  Number(v).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

// rows: isi ipm_kabkota.json -> [{ mhid, nama, provinsi, ipm, pdrb }, ...]
export function buildStats(rows) {
  const rankBy = (key) => {
    const sorted = [...rows].sort((a, b) => b[key] - a[key]);
    return new Map(sorted.map((r, i) => [r.mhid, i + 1]));
  };
  return {
    n: rows.length,
    ipmRank: rankBy("ipm"),
    pdrbRank: rankBy("pdrb"),
    ipmMean: d3.mean(rows, (d) => d.ipm),
    pdrbMedian: d3.median(rows, (d) => d.pdrb),
    byProv: d3.rollup(
      rows,
      (v) => ({ ipm: d3.mean(v, (d) => d.ipm), n: v.length }),
      (d) => d.provinsi
    ),
  };
}

// Kategori IPM menurut BPS
export function ipmCategory(v) {
  if (v >= 80) return { label: "sangat tinggi", range: "≥ 80" };
  if (v >= 70) return { label: "tinggi", range: "70–79,99" };
  if (v >= 60) return { label: "sedang", range: "60–69,99" };
  return { label: "rendah", range: "< 60" };
}

const cmp = (diff) => `${fmt(Math.abs(diff))} poin ${diff >= 0 ? "di atas" : "di bawah"}`;

// Interpretasi untuk peta choropleth IPM
export function ipmNote(d, s) {
  const cat = ipmCategory(d.ipm);
  const rank = s.ipmRank.get(d.mhid);
  let pos = "";
  if (rank <= s.n * 0.1) pos = " Termasuk 10% kab/kota dengan IPM tertinggi.";
  else if (rank > s.n * 0.9) pos = " Termasuk 10% kab/kota dengan IPM terendah.";

  const prov = s.byProv.get(d.provinsi);
  const provPart =
    prov && prov.n > 1
      ? ` dan ${cmp(d.ipm - prov.ipm)} rata-rata ${d.provinsi} (${fmt(prov.ipm)})`
      : "";

  return (
    `IPM berkategori <b>${cat.label}</b> (${cat.range}). ` +
    `Peringkat ${rank} dari ${s.n} kab/kota.${pos}<br/>` +
    `${cmp(d.ipm - s.ipmMean)} rata-rata kab/kota (${fmt(s.ipmMean)})${provPart}.`
  );
}

// Interpretasi untuk peta proportional symbol PDRB per kapita
export function pdrbNote(d, s) {
  const rank = s.pdrbRank.get(d.mhid);
  const ipmRank = s.ipmRank.get(d.mhid);
  const ratio = d.pdrb / s.pdrbMedian;
  const vsMedian =
    ratio >= 1
      ? `sekitar ${fmt(ratio)}× median kab/kota`
      : `hanya ${fmt(ratio * 100, 0)}% dari median kab/kota`;

  const pPdrb = rank / s.n; // makin kecil makin tinggi
  const pIpm = ipmRank / s.n;
  let rel = "";
  if (pPdrb <= 0.2 && pIpm <= 0.2) {
    rel = "PDRB per kapita dan IPM sama-sama termasuk 20% tertinggi.";
  } else if (pPdrb <= 0.2 && pIpm >= 0.4) {
    rel =
      `PDRB per kapita tinggi, tetapi IPM hanya berada di peringkat ${ipmRank}. ` +
      "Nilai ekonomi yang besar belum tentu tercermin pada pembangunan manusia penduduk setempat.";
  } else if (pPdrb >= 0.4 && pIpm <= 0.2) {
    rel =
      `IPM tinggi (peringkat ${ipmRank}) meski PDRB per kapita relatif rendah, ` +
      "artinya capaian pembangunan manusia tidak semata ditentukan oleh nilai ekonomi.";
  } else if (pPdrb >= 0.8 && pIpm >= 0.8) {
    rel = "PDRB per kapita dan IPM sama-sama termasuk 20% terendah.";
  }

  return (
    `Peringkat ${rank} dari ${s.n} kab/kota, ${vsMedian} (${fmt(s.pdrbMedian)} juta Rp).` +
    (rel ? `<br/>${rel}` : "")
  );
}

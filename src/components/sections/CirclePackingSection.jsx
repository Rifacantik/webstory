import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import StorySection from "../layout/StorySection";
import CirclePackingPlot from "../charts/CirclePackingPlot";
import CirclePackingInterpretation from "./CirclePackingInterpretation";

// Membaca public/data/data_klaster.xlsx (kolom: Provinsi, IPM, Cluster).
// Baris "Indonesia" (tanpa klaster) diabaikan di sini.
async function loadClusterData() {
  const res = await fetch("/data/data_klaster.xlsx");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const wb = XLSX.read(await res.arrayBuffer(), { type: "array" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

  const byCluster = new Map();
  rows.forEach((r) => {
    const name = String(r.Provinsi ?? "").trim();
    if (!name || name === "Indonesia") return;
    if (r.Cluster == null || r.IPM == null) return;
    const id = Number(r.Cluster);
    const ipm = Number(r.IPM);
    if (!Number.isFinite(id) || !Number.isFinite(ipm)) return;
    if (!byCluster.has(id)) byCluster.set(id, []);
    byCluster.get(id).push({ name, ipm });
  });

  const clusters = [...byCluster.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, members]) => ({ id, members }));

  return { clusters };
}

export default function CirclePackingSection() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadClusterData()
      .then(setData)
      .catch((err) => {
        console.error("Gagal membaca data klaster:", err);
        setError(true);
      });
  }, []);

  const stats = useMemo(() => {
    if (!data) return [];
    return data.clusters.map((c) => {
      const sorted = [...c.members].sort((a, b) => a.ipm - b.ipm);
      return {
        id: c.id,
        n: c.members.length,
        mean: c.members.reduce((s, m) => s + m.ipm, 0) / c.members.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        names: c.members.map((m) => m.name),
      };
    });
  }, [data]);

  return (
    <StorySection
      id="circle-packing"
      title="Bagaimana Karakteristik IPM di Dalam Tiap Klaster?"
      text={
        <p>
          Ukuran lingkaran menunjukkan nilai IPM. Arahkan kursor untuk melihat
          detail.
        </p>
      }
    >
      {error && (
        <p>Data klaster tidak dapat dimuat. Pastikan file berada di public/data/data_klaster.xlsx.</p>
      )}
      {data && <CirclePackingPlot clusters={data.clusters} />}
      {data && <CirclePackingInterpretation stats={stats} />}
    </StorySection>
  );
}
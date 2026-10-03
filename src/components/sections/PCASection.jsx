import { useEffect, useState } from "react";
import StorySection from "../layout/StorySection";
import PCAPlot from "../charts/PCAPlot";
import PCAInterpretation from "./PCAInterpretation";
import { runPCA } from "../../utils/pca";
import { getIsland } from "../../utils/regions";

const FEATURES = [
  "IPM",
  "PDRB",
  "Kemiskinan",
  "TPT",
  "TPAK",
  "Kepadatan Penduduk",
  "Laju Pertumbuhan Penduduk",
  "Pengeluaran per Kapita",
];

export default function PCASection() {
  const [pcaResult, setPcaResult] = useState({ points: [], variance: [] });

  useEffect(() => {
    fetch("/data/pca_complete.json")
      .then((res) => res.json())
      .then((rows) => {
        const result = runPCA(rows, FEATURES);
        setPcaResult({
          ...result,
          points: result.points.map((p) => ({
            ...p,
            name: p.Provinsi,
            group: getIsland(p.Provinsi),
          })),
        });
      })
      .catch((err) => console.error("Gagal membaca data PCA:", err));
  }, []);

  return (
    <StorySection
      id="pca"
      title="Bagaimana Karakteristik Provinsi Indonesia Jika Dilihat dari Berbagai Indikator?"
      text={
        <>
          <p>
            PCA digunakan untuk melihat kemiripan dan perbedaan karakteristik
            provinsi berdasarkan berbagai indikator sosial-ekonomi secara
            simultan. Provinsi yang posisinya berdekatan pada grafik memiliki
            karakteristik yang relatif mirip berdasarkan indikator yang
            digunakan.
          </p>
          <PCAInterpretation variance={pcaResult.variance} />
        </>
      }
    >
      {pcaResult.points.length > 0 && (
        <PCAPlot points={pcaResult.points} variance={pcaResult.variance} />
      )}
    </StorySection>
  );
}
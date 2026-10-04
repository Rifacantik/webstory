import { useMemo, useState } from "react";
import PCAPlot from "../charts/PCAPlot";
import PCAInterpretation from "./PCAInterpretation";
import { runPCA } from "../../utils/pca";
import { getIsland } from "../../utils/regions";
import { useClusterResult, FEATURES } from "../../hooks/useClusterResult";
import "../../styles/pca-scrolly.css";

export default function PCASection() {
  // Data dan klaster berasal dari satu sumber yang sama dengan dendrogram dan circle packing
  const { rows, cut } = useClusterResult();
  // wilayah yang disorot di grafik, ditentukan oleh kartu yang sedang aktif
  const [focus, setFocus] = useState(null);

  const pcaResult = useMemo(() => {
    if (!rows.length) return { points: [], variance: [] };
    const result = runPCA(rows, FEATURES);
    return {
      ...result,
      points: result.points.map((p) => {
        const c = cut?.clusterOfName.get(p.Provinsi);
        return {
          ...p,
          name: p.Provinsi,
          group: getIsland(p.Provinsi),
          // nomor klaster 1..k, urutannya sama dengan dendrogram (1 = terkecil)
          cluster: c != null ? c + 1 : undefined,
        };
      }),
    };
  }, [rows, cut]);

  return (
    <section id="pca" className="pca-section">
      <header className="pca-section__head">
        <h2>
          Bagaimana Karakteristik Provinsi Indonesia Jika Dilihat dari
          Berbagai Indikator?
        </h2>
        <p>
          PCA digunakan untuk melihat kemiripan dan perbedaan karakteristik
          provinsi berdasarkan berbagai indikator sosial-ekonomi secara
          simultan. Provinsi yang posisinya berdekatan pada grafik memiliki
          karakteristik yang relatif mirip berdasarkan indikator yang
          digunakan.
        </p>
      </header>

      <div className="pca-scrolly">
        <div className="pca-scrolly__chart">
          <div className="pca-card pca-chart-card">
            {pcaResult.points.length > 0 ? (
              <PCAPlot
                points={pcaResult.points}
                variance={pcaResult.variance}
                focus={focus}
              />
            ) : (
              <div className="pca-chart-placeholder">Memuat grafik…</div>
            )}
          </div>
        </div>

        <div className="pca-scrolly__steps">
          <PCAInterpretation
            variance={pcaResult.variance}
            onFocusChange={setFocus}
          />
        </div>
      </div>
    </section>
  );
}
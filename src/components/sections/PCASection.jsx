import { useMemo, useState } from "react";
import PCAPlot from "../charts/PCAPlot";
import PCAInterpretation from "./PCAInterpretation";
import SourceNote from "../layout/SourceNote";
import { runPCA } from "../../utils/pca";
import { getIsland } from "../../utils/regions";
import { useClusterResult, FEATURES } from "../../hooks/useClusterResult";
import "../../styles/pca-scrolly.css";

const DESKTOP_CSS = `
@media (min-width: 960px) {
  .pca-section {
    max-width: min(1680px, 96vw) !important;
    margin-left: auto !important;
    margin-right: auto !important;
    padding-left: clamp(1.25rem, 3vw, 3.5rem) !important;
    padding-right: clamp(1.25rem, 3vw, 3.5rem) !important;
    box-sizing: border-box;
  }

  .pca-section .pca-section__head h2 {
    max-width: none !important;
  }
  .pca-section .pca-section__head p {
    max-width: 68rem !important;
  }

  /* Dua kolom: interpretasi (kiri, sempit) | grafik (kanan, lebar) */
  .pca-section .pca-scrolly {
    display: grid !important;
    grid-template-columns: minmax(340px, 5fr) minmax(0, 9fr) !important;
    grid-template-areas: "steps chart" !important;
    column-gap: clamp(1.5rem, 3vw, 3rem) !important;
    align-items: start !important;
    width: 100% !important;
    max-width: none !important;
  }

  .pca-section .pca-scrolly__steps {
    grid-area: steps !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
  }

  .pca-section .pca-scrolly__chart {
    grid-area: chart !important;
    position: sticky !important;
    top: 1.5rem !important;
    align-self: start !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    height: calc(100vh - 3rem) !important;
    min-height: 560px;
  }

  .pca-section .pca-chart-card {
    height: 100% !important;
    width: 100% !important;
    box-sizing: border-box;
    display: flex !important;
    flex-direction: column !important;
  }

  .pca-section .pca-chart-main {
    flex: 1 1 auto !important;
    min-height: 0 !important;
  }
}
`;

export default function PCASection() {
  const { rows, cut } = useClusterResult();

  const [focus, setFocus] = useState(null);

  const pcaResult = useMemo(() => {
    if (!rows.length) {
      return {
        points: [],
        variance: [],
      };
    }

    const result = runPCA(rows, FEATURES);

    return {
      ...result,

      points: result.points.map((p) => {
        const c = cut?.clusterOfName.get(p.Provinsi);

        return {
          ...p,
          name: p.Provinsi,
          group: getIsland(p.Provinsi),
          cluster: c != null ? c + 1 : undefined,
        };
      }),
    };
  }, [rows, cut]);

  const ready = pcaResult.points.length > 0;

  return (
    <section id="pca" className="pca-section">
      <style>{DESKTOP_CSS}</style>

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
        {/* GRAFIK PCA */}
        <div className="pca-scrolly__chart">
          <div className="pca-card pca-chart-card">
            {ready ? (
              <div className="pca-chart-main">
                <PCAPlot
                  points={pcaResult.points}
                  variance={pcaResult.variance}
                  focus={focus}
                />
              </div>
            ) : (
              <div className="pca-chart-placeholder">Memuat grafik…</div>
            )}

            {ready && <SourceNote />}
          </div>
        </div>

        {/* INTERPRETASI */}
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
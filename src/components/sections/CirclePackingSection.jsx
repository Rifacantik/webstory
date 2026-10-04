import { useMemo } from "react";
import StorySection from "../layout/StorySection";
import CirclePackingPlot from "../charts/CirclePackingPlot";
import CirclePackingInterpretation from "./CirclePackingInterpretation";
import { useClusterResult } from "../../hooks/useClusterResult";

export default function CirclePackingSection() {
  const { cut, error } = useClusterResult();

  // id klaster 1..k, urutannya sama persis dengan dendrogram
  const clusters = useMemo(
    () => (cut ? cut.clusters.map((c, i) => ({ id: i + 1, members: c.members })) : null),
    [cut]
  );

  const stats = useMemo(() => {
    if (!clusters) return [];
    return clusters.map((c) => {
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
  }, [clusters]);

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
        <p>Data klaster tidak dapat dimuat. Pastikan file berada di public/data/pca_complete.json.</p>
      )}
      {clusters && <CirclePackingPlot clusters={clusters} />}
      {clusters && <CirclePackingInterpretation stats={stats} />}
    </StorySection>
  );
}
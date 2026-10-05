import { useCallback, useMemo, useState } from "react";
import StorySection from "../layout/StorySection";
import CirclePackingPlot from "../charts/CirclePackingPlot";
import CirclePackingInterpretation from "./CirclePackingInterpretation";
import { useClusterResult } from "../../hooks/useClusterResult";

const STACK_BP = 900;

const CSS = `
.cp-mobile-interp { display: none; }
@media (max-width: ${STACK_BP}px) {
  .cp-desktop-interp { display: none; }
  .cp-mobile-interp { display: block; margin-top: 1rem; }
}
`;

export default function CirclePackingSection() {
  const { cut, error } = useClusterResult();

  const [selectedCluster, setSelectedCluster] = useState(null);

  const handleClusterClick = useCallback(
    (id) => setSelectedCluster((prev) => (prev === id ? null : id)),
    []
  );

  const clusters = useMemo(
    () =>
      cut
        ? cut.clusters.map((c, i) => ({
            id: i + 1,
            members: c.members,
          }))
        : null,
    [cut]
  );

  const stats = useMemo(() => {
    if (!clusters) return [];

    return clusters.map((c) => {
      const sorted = [...c.members].sort((a, b) => a.ipm - b.ipm);

      return {
        id: c.id,
        n: c.members.length,
        mean:
          c.members.reduce((sum, member) => sum + member.ipm, 0) /
          c.members.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        names: c.members.map((m) => m.name),
        members: c.members,
      };
    });
  }, [clusters]);

  const renderInterpretation = (detailed) =>
    clusters ? (
      <CirclePackingInterpretation
        stats={stats}
        selectedCluster={selectedCluster}
        detailed={detailed}
      />
    ) : null;

  return (
    <StorySection
      id="circle-packing"
      top
      title="Bagaimana Karakteristik IPM di Dalam Tiap Klaster?"
      text={
        <>
          <p>
            Ukuran lingkaran menunjukkan nilai IPM. Arahkan kursor untuk melihat
            detail. Klik salah satu klaster untuk melihat interpretasinya.
          </p>

          <style>{CSS}</style>

          {/* Desktop: interpretasi di bawah subjudul */}
          <div className="cp-desktop-interp">{renderInterpretation(true)}</div>
        </>
      }
    >
      {error && (
        <p>
          Data klaster tidak dapat dimuat. Pastikan file berada di
          public/data/pca_complete.json.
        </p>
      )}

      {clusters && (
        <CirclePackingPlot
          clusters={clusters}
          selectedCluster={selectedCluster}
          onClusterClick={handleClusterClick}
        >
          {/* HP: interpretasi di bawah visual */}
          <div className="cp-mobile-interp">{renderInterpretation(false)}</div>
        </CirclePackingPlot>
      )}
    </StorySection>
  );
}
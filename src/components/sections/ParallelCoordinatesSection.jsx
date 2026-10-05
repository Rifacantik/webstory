import { useEffect, useMemo, useState } from "react";
import StorySection from "../layout/StorySection";
import ParallelCoordinates from "../charts/ParallelCoordinates";
import ProvinceProfile from "./ProvinceProfile";
import { getIsland } from "../../utils/regions";
import { buildInsights } from "../../utils/profileInsight";
import { useSelection } from "../../context/SelectionContext";

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

export default function ParallelCoordinatesSection() {
  const [rows, setRows] = useState([]);
  const { selected, setSelected } = useSelection();

  useEffect(() => {
    fetch("/data/pca_complete.json")
      .then((res) => res.json())
      .then((data) =>
        setRows(
          data.map((d) => ({
            ...d,
            name: d.Provinsi,
            group: getIsland(d.Provinsi),
          }))
        )
      )
      .catch((err) => console.error("Gagal membaca data:", err));
  }, []);

  const insights = useMemo(
    () => (rows.length ? buildInsights(rows, FEATURES) : null),
    [rows]
  );
  const profile = selected && insights ? insights.get(selected) ?? null : null;

  return (
    <StorySection
      id="parallel-coordinates"
      title="Bagaimana Profil Lengkap Setiap Provinsi pada Seluruh Indikator?"
      text={
        <>
          <p>
            Setiap garis mewakili satu provinsi dan melintasi delapan indikator
            sekaligus. Klik satu garis atau cari provinsi untuk membaca
            profilnya.
          </p>
          {!profile && (
            <p className="note">
              Sumbu PDRB dan Kepadatan Penduduk memakai skala akar kuadrat agar
              provinsi dengan nilai kecil tetap terbaca di samping DKI Jakarta
              yang nilainya jauh lebih besar.
            </p>
          )}
          <ProvinceProfile
            profile={profile}
            onPick={setSelected}
            onClear={() => setSelected(null)}
          />
        </>
      }
    >
      {rows.length > 0 && (
        <ParallelCoordinates data={rows} dimensions={FEATURES} />
      )}
    </StorySection>
  );
}
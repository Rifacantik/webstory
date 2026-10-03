import { useCallback, useEffect, useMemo, useState } from "react";
import StorySection from "../layout/StorySection";
import ParallelCoordinates from "../charts/ParallelCoordinates";
import { getIsland } from "../../utils/regions";
import { buildProfileStats, profileNote } from "../../utils/provinceProfile";

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

  // Peringkat tiap indikator antarprovinsi (untuk interpretasi)
  const stats = useMemo(
    () => (rows.length ? buildProfileStats(rows, FEATURES) : null),
    [rows]
  );

  const getNote = useCallback(
    (d) => (stats ? profileNote(d, stats) : ""),
    [stats]
  );

  return (
    <StorySection
      id="parallel-coordinates"
      title="Bagaimana Profil Lengkap Setiap Provinsi pada Seluruh Indikator?"
      text={
        <>
          <p>
            Setiap garis mewakili satu provinsi dan melintasi delapan indikator
            sekaligus. Arahkan kursor ke satu garis untuk menyorot provinsi
            tersebut, melihat namanya, dan membaca interpretasi profilnya.
          </p>
          <p className="note">
            Sumbu PDRB dan Kepadatan Penduduk memakai skala akar kuadrat agar
            provinsi dengan nilai kecil tetap terbaca di samping DKI Jakarta
            yang nilainya jauh lebih besar.
          </p>
        </>
      }
    >
      {rows.length > 0 && (
        <ParallelCoordinates
          data={rows}
          dimensions={FEATURES}
          getNote={getNote}
        />
      )}
    </StorySection>
  );
}
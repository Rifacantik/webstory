import { useCallback, useMemo } from "react";
import StorySection from "../layout/StorySection";
import ProportionalSymbol from "../charts/ProportionalSymbol";
import { useData } from "../../hooks/useData";
import { buildStats, pdrbNote } from "../../utils/kabkotaStats";

// File di folder public/data/
const GEO_URL = "/data/all_kabkota_ind.geojson"; // atau all_kabkota_ind.slim.geojson (lebih ringan)
const DATA_URL = "/data/ipm_kabkota.json";

export default function ProportionalSymbolSection() {
  const { data: geo, error: geoError, loading: geoLoading } = useData(GEO_URL, "json");
  const { data: rows, error: dataError, loading: dataLoading } = useData(DATA_URL, "json");

  // Join GeoJSON <-> data lewat 'mhid'
  const byId = useMemo(() => {
    if (!rows) return new Map();
    return new Map(rows.map((d) => [d.mhid, d]));
  }, [rows]);

  // Peringkat & median (untuk interpretasi)
  const stats = useMemo(() => (rows ? buildStats(rows) : null), [rows]);

  // Urutkan PDRB terbesar -> terkecil agar lingkaran kecil tetap terlihat di atas
  const sortedGeo = useMemo(() => {
    if (!geo || byId.size === 0) return null;
    const features = [...geo.features].sort(
      (a, b) =>
        (byId.get(b.properties.mhid)?.pdrb ?? 0) -
        (byId.get(a.properties.mhid)?.pdrb ?? 0)
    );
    return { ...geo, features };
  }, [geo, byId]);

  const getName = useCallback(
    (f) => {
      const d = byId.get(f.properties.mhid);
      return d ? `${d.nama}, ${d.provinsi}` : f.properties.name;
    },
    [byId]
  );

  const getValue = useCallback(
    (f) => byId.get(f.properties.mhid)?.pdrb ?? 0,
    [byId]
  );

  const getNote = useCallback(
    (f) => {
      const d = byId.get(f.properties.mhid);
      return d && stats ? pdrbNote(d, stats) : "";
    },
    [byId, stats]
  );

  const loading = geoLoading || dataLoading;
  const error = geoError || dataError;

  return (
    <StorySection
      id="proportional-symbol"
      title="PDRB per Kapita Kabupaten/Kota"
      text={
        <p>
          Ukuran lingkaran menunjukkan PDRB per kapita (juta rupiah) tiap kabupaten/kota.
          Arahkan kursor ke wilayah dan diamkan sebentar untuk zoom, lengkap dengan
          interpretasi posisinya dibanding wilayah lain dan dibanding capaian IPM-nya.
        </p>
      }
    >
      {loading && <p className="note">Memuat peta...</p>}
      {error && (
        <div className="error-box">
          Data belum bisa dimuat. Pastikan <code>all_kabkota_ind.geojson</code> dan{" "}
          <code>ipm_kabkota.json</code> ada di <code>public/data/</code>.
        </div>
      )}
      {sortedGeo && (
        <ProportionalSymbol
          geo={sortedGeo}
          label="PDRB per kapita (juta Rp)"
          getName={getName}
          getValue={getValue}
          getNote={getNote}
        />
      )}
    </StorySection>
  );
}
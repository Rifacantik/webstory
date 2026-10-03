import { useCallback, useMemo } from "react";
import StorySection from "../layout/StorySection";
import Choropleth from "../charts/Choropleth";
import { useData } from "../../hooks/useData";
import { buildStats, ipmNote } from "../../utils/kabkotaStats";

// File di folder public/data/
const GEO_URL = "/data/all_kabkota_ind.geojson"; // atau all_kabkota_ind.slim.geojson (lebih ringan)
const IPM_URL = "/data/ipm_kabkota.json";

export default function ChoroplethSection() {
  const { data: geo, error: geoError, loading: geoLoading } = useData(GEO_URL, "json");
  const { data: ipm, error: ipmError, loading: ipmLoading } = useData(IPM_URL, "json");

  // Join GeoJSON <-> data IPM lewat 'mhid' (kunci unik tiap kab/kota di GeoJSON)
  const byId = useMemo(() => {
    if (!ipm) return new Map();
    return new Map(ipm.map((d) => [d.mhid, d]));
  }, [ipm]);

  // Peringkat, rata-rata nasional & provinsi (untuk interpretasi)
  const stats = useMemo(() => (ipm ? buildStats(ipm) : null), [ipm]);

  const getName = useCallback(
    (f) => {
      const d = byId.get(f.properties.mhid);
      return d ? `${d.nama}, ${d.provinsi}` : f.properties.name;
    },
    [byId]
  );

  const getValue = useCallback(
    (f) => byId.get(f.properties.mhid)?.ipm ?? null,
    [byId]
  );

  const getNote = useCallback(
    (f) => {
      const d = byId.get(f.properties.mhid);
      return d && stats ? ipmNote(d, stats) : "";
    },
    [byId, stats]
  );

  const loading = geoLoading || ipmLoading;
  const error = geoError || ipmError;
  const ready = geo && ipm && byId.size > 0;

  return (
    <StorySection
      id="choropleth"
      title="Sebaran IPM Kabupaten/Kota di Indonesia"
      text={
        <p>
          Peta ini menunjukkan Indeks Pembangunan Manusia (IPM) di 514 kabupaten/kota.
          Warna yang lebih gelap berarti IPM lebih tinggi. Arahkan kursor ke wilayah
          dan diamkan sebentar untuk zoom, lengkap dengan interpretasi nilainya.
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
      {ready && (
        <Choropleth
          geo={geo}
          label="IPM"
          getName={getName}
          getValue={getValue}
          getNote={getNote}
        />
      )}
    </StorySection>
  );
}
import { useCallback, useMemo, useState } from "react";
import ProportionalSymbol from "../charts/ProportionalSymbol";
import RegionSearch from "../layout/RegionSearch";
import { useData } from "../../hooks/useData";
import { useRegionSelection } from "../../hooks/useRegionSelection";
import { buildStats, pdrbNote } from "../../utils/kabkotaStats";
import "../../styles/map-stage.css";

// File di folder public/data/
const GEO_URL = "/data/all_kabkota_ind.geojson"; // atau all_kabkota_ind.slim.geojson (lebih ringan)
const DATA_URL = "/data/ipm_kabkota.json";

export default function ProportionalSymbolSection() {
  const { data: geo, error: geoError, loading: geoLoading } = useData(GEO_URL, "json");
  const { data: rows, error: dataError, loading: dataLoading } = useData(DATA_URL, "json");
  const [focused, setFocused] = useState(false);

  // Pilihan provinsi/kab-kota bersama (SelectionContext) -> target zoom untuk peta
  const { target, pickKab } = useRegionSelection(rows);
  const handlePick = useCallback((f) => pickKab(f.properties.mhid), [pickKab]);

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
    <section
      id="proportional-symbol"
      className={`map-stage${focused ? " is-focused" : ""}`}
    >
      <div className="map-stage__map">
        {loading && <p className="map-stage__msg note">Memuat peta...</p>}
        {error && (
          <div className="map-stage__msg error-box">
            Data belum bisa dimuat. Pastikan <code>all_kabkota_ind.geojson</code> dan{" "}
            <code>ipm_kabkota.json</code> ada di <code>public/data/</code>.
          </div>
        )}
        {sortedGeo && (
          <ProportionalSymbol
            fill
            geo={sortedGeo}
            label="PDRB per kapita (juta Rp)"
            getName={getName}
            getValue={getValue}
            getNote={getNote}
            onFocusChange={setFocused}
            target={target}
            onPick={handlePick}
          />
        )}
      </div>

      {sortedGeo && <RegionSearch rows={rows} variant="floating" />}

      <div className="map-card map-card--intro">
        <h2>PDRB per Kapita Kabupaten/Kota</h2>
        <p>
          Ukuran lingkaran menunjukkan PDRB per kapita (juta rupiah) tiap
          kabupaten/kota. Cari provinsi lalu kabupaten/kota lewat kotak di kiri
          atas, klik wilayah di peta, atau arahkan kursor dan diamkan sebentar
          untuk zoom, lengkap dengan interpretasi posisinya dibanding wilayah
          lain dan dibanding capaian IPM-nya.
        </p>
      </div>
    </section>
  );
}
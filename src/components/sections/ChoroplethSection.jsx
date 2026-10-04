import { useCallback, useMemo, useState } from "react";
import Choropleth from "../charts/Choropleth";
import RegionSearch from "../layout/RegionSearch";
import { useData } from "../../hooks/useData";
import { useRegionSelection } from "../../hooks/useRegionSelection";
import { buildStats, ipmNote } from "../../utils/kabkotaStats";
import "../../styles/map-stage.css";

// File di folder public/data/
const GEO_URL = "/data/all_kabkota_ind.geojson"; // atau all_kabkota_ind.slim.geojson (lebih ringan)
const IPM_URL = "/data/ipm_kabkota.json";

const fmt = (v) =>
  v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ChoroplethSection() {
  const { data: geo, error: geoError, loading: geoLoading } = useData(GEO_URL, "json");
  const { data: ipm, error: ipmError, loading: ipmLoading } = useData(IPM_URL, "json");
  const [focused, setFocused] = useState(false);

  // Pilihan provinsi/kab-kota bersama (SelectionContext) -> target zoom untuk peta
  const { target, pickKab } = useRegionSelection(ipm);
  const handlePick = useCallback((f) => pickKab(f.properties.mhid), [pickKab]);

  // Join GeoJSON <-> data IPM lewat 'mhid' (kunci unik tiap kab/kota di GeoJSON)
  const byId = useMemo(() => {
    if (!ipm) return new Map();
    return new Map(ipm.map((d) => [d.mhid, d]));
  }, [ipm]);

  // Peringkat, rata-rata nasional & provinsi (untuk interpretasi di tooltip)
  const stats = useMemo(() => (ipm ? buildStats(ipm) : null), [ipm]);

  // Temuan tertulis, dihitung dari data (kategori IPM menurut BPS)
  const finding = useMemo(() => {
    if (!ipm) return null;
    const valid = ipm.filter((d) => Number.isFinite(d.ipm));
    if (!valid.length) return null;
    const top = valid.reduce((a, b) => (b.ipm > a.ipm ? b : a));
    const bottom = valid.reduce((a, b) => (b.ipm < a.ipm ? b : a));
    const high = valid.filter((d) => d.ipm >= 80).length;
    const low = valid.filter((d) => d.ipm < 60);
    const lowPapua = low.filter((d) =>
      String(d.provinsi ?? "").toLowerCase().includes("papua")
    ).length;
    return { n: valid.length, top, bottom, high, low: low.length, lowPapua };
  }, [ipm]);

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
    <section
      id="choropleth"
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
        {ready && (
          <Choropleth
            geo={geo}
            label="IPM"
            getName={getName}
            getValue={getValue}
            getNote={getNote}
            onFocusChange={setFocused}
            target={target}
            onPick={handlePick}
          />
        )}
      </div>

      {ready && <RegionSearch rows={ipm} variant="floating" />}

      <div className="map-card map-card--intro">
        <h2>Sebaran IPM Kabupaten/Kota di Indonesia</h2>
        <p>
          Peta ini menunjukkan Indeks Pembangunan Manusia (IPM) di{" "}
          {finding ? finding.n : 514} kabupaten/kota. Warna yang lebih gelap
          berarti IPM lebih tinggi. Cari provinsi lalu kabupaten/kota lewat
          kotak di kiri atas, klik wilayah di peta, atau arahkan kursor dan
          diamkan sebentar untuk zoom, lengkap dengan interpretasi nilainya.
        </p>
      </div>

      {finding && (
        <div className="map-card map-card--finding">
          <h3>Temuan</h3>
          <p>
            {finding.high} dari {finding.n} kabupaten/kota berada di kategori
            IPM sangat tinggi (80 ke atas), sedangkan {finding.low} masih di
            kategori rendah (di bawah 60)
            {finding.low > 0 && finding.lowPapua > 0
              ? `, ${finding.lowPapua} di antaranya di provinsi-provinsi Papua`
              : ""}
            .
          </p>
          <p className="map-card__range">
            Tertinggi: {finding.top.nama} ({fmt(finding.top.ipm)}).
            <br />
            Terendah: {finding.bottom.nama} ({fmt(finding.bottom.ipm)}).
          </p>
        </div>
      )}
    </section>
  );
}
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Token Mapbox: simpan di file .env (Vite) -> VITE_MAPBOX_TOKEN=pk.xxxxx
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Peta dasar satelit. Alternatif: "mapbox://styles/mapbox/satellite-streets-v12" (satelit + label)
const STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
const START_CENTER = [20, -10]; // [lon, lat] Afrika/Samudra Hindia
const END_CENTER = [118, -2]; // Indonesia
const END_PITCH = 18; // sedikit dimiringkan saat tiba di Indonesia

const COLORS = {
  highlight: "#ffb347", // oranye-kuning agar kontras di atas citra satelit
  space: "#050d1c",
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Zoom awal: seluruh bola muat di layar. Zoom akhir: Indonesia memenuhi ~80% lebar layar.
// (di zoom z, lingkar bumi di khatulistiwa = 512 * 2^z piksel)
function computeZooms(w, h) {
  const z0 = Math.log2((Math.PI * 0.86 * Math.min(w, h)) / 512);
  const zIndo = Math.log2(w * 0.01204); // ~5.200 km lebar Indonesia
  const z1 = clamp(Math.max(zIndo, z0 + 0.8), 2, 5);
  return { z0, z1 };
}

export default function Globe({ progress = 0, height = "100%" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const readyRef = useRef(false);
  const zoomRef = useRef({ z0: 1.5, z1: 4.2 });
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Terapkan posisi kamera sesuai progress scroll
  const apply = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const t = easeInOutCubic(clamp(progressRef.current, 0, 1));
    const { z0, z1 } = zoomRef.current;

    map.jumpTo({
      center: [lerp(START_CENTER[0], END_CENTER[0], t), lerp(START_CENTER[1], END_CENTER[1], t)],
      zoom: lerp(z0, z1, t),
      pitch: lerp(0, END_PITCH, t),
      bearing: 0,
    });

    // sorot Indonesia perlahan muncul di paruh akhir perjalanan
    const k = clamp((t - 0.55) / 0.45, 0, 1);
    if (map.getLayer("indonesia-fill")) {
      map.setPaintProperty("indonesia-fill", "fill-opacity", 0.18 * k);
      map.setPaintProperty("indonesia-line", "line-opacity", 0.9 * k);
    }
  };

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;

    const container = containerRef.current;
    const { width, height: h } = container.getBoundingClientRect();
    zoomRef.current = computeZooms(width, h);

    const map = new mapboxgl.Map({
      container,
      style: STYLE,
      projection: "globe",
      center: START_CENTER,
      zoom: zoomRef.current.z0,
      interactive: false, // kamera dikendalikan scroll, bukan mouse
      fadeDuration: 0,
    });
    mapRef.current = map;

    map.on("style.load", () => {
      // atmosfer + ruang angkasa di sekeliling bola
      map.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.03,
        "space-color": COLORS.space,
        "star-intensity": 0.6,
      });

      // sorotan batas negara Indonesia
      try {
        map.addSource("country-boundaries", {
          type: "vector",
          url: "mapbox://mapbox.country-boundaries-v1",
        });
        const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
        const filter = [
          "all",
          ["==", ["get", "iso_3166_1"], "ID"],
          ["any", ["==", "all", ["get", "worldview"]], ["in", "US", ["get", "worldview"]]],
        ];
        map.addLayer(
          {
            id: "indonesia-fill",
            type: "fill",
            source: "country-boundaries",
            "source-layer": "country_boundaries",
            filter,
            paint: { "fill-color": COLORS.highlight, "fill-opacity": 0 },
          },
          firstSymbol
        );
        map.addLayer(
          {
            id: "indonesia-line",
            type: "line",
            source: "country-boundaries",
            "source-layer": "country_boundaries",
            filter,
            paint: { "line-color": COLORS.highlight, "line-width": 2, "line-opacity": 0 },
          },
          firstSymbol
        );
      } catch (e) {
        console.warn("Gagal menambahkan sorotan Indonesia:", e);
      }

      readyRef.current = true;
      apply();
    });

    map.on("error", (e) => console.error("Mapbox error:", e?.error ?? e));

    // responsif: hitung ulang zoom saat ukuran berubah
    const ro = new ResizeObserver(() => {
      const r = container.getBoundingClientRect();
      if (!r.width || !r.height) return;
      zoomRef.current = computeZooms(r.width, r.height);
      map.resize();
      apply();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // update kamera setiap progress berubah
  useEffect(apply, [progress]);

  if (!TOKEN) {
    return (
      <div
        style={{
          width: "100%",
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.space,
          color: "#fff",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        Token Mapbox belum diatur. Tambahkan <code>VITE_MAPBOX_TOKEN</code> di file
        .env lalu jalankan ulang <code>npm run dev</code>.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height, background: COLORS.space }}
    />
  );
}
# Seberapa Merata Pembangunan Sosial-Ekonomi di Indonesia?

Web story interaktif berbasis data yang menelusuri kesenjangan pembangunan antarwilayah di Indonesia. Pembaca diajak *scroll* dari globe dunia ke peta kabupaten/kota, lalu ke analisis multi-indikator yang mengelompokkan provinsi ke dalam tiga klaster.

**Demo:** https://webstory-vert.vercel.app



| No | Bagian | Visualisasi | Pertanyaan yang dijawab |
|----|--------|-------------|--------------------------|
| 1 | Globe | Globe 3D (Mapbox) yang bergerak dari dunia menuju Indonesia | Di mana posisi Indonesia? |
| 2 | Peta IPM | Choropleth kabupaten/kota | Seberapa timpang kualitas hidup antardaerah? |
| 3 | Peta PDRB | Proportional symbol di atas citra satelit | Seberapa besar ekonomi tiap daerah? |
| 4 | PCA | Scatter plot PCA dengan penjelasan bertahap | Provinsi mana yang mirip jika delapan indikator dilihat bersamaan? |
| 5 | Profil provinsi | Parallel coordinates | Seperti apa profil asli tiap provinsi di balik ringkasan PCA? |
| 6 | Klaster | Dendrogram | Provinsi mana yang berada dalam satu kelompok? |
| 7 | Sebaran IPM | Circle packing | Seberapa jauh IPM di dalam masing-masing klaster? |
| 8 | Kesimpulan | Ringkasan dengan angka animasi | Jadi, seberapa merata pembangunan Indonesia? |

Fitur pendukung: navigasi progres, pemilih provinsi yang tersinkron antarvisualisasi, dan pencarian wilayah.

## Teknologi

- [React 19](https://react.dev) + [Vite](https://vite.dev)
- [D3](https://d3js.org) untuk seluruh grafik, ditambah `d3-tile` untuk tile peta, `topojson-client` / `topojson-server`, dan `world-atlas`
- [Mapbox GL JS](https://www.mapbox.com/mapbox-gl-js) untuk globe
- [ml-pca](https://github.com/mljs/pca) untuk PCA, dengan implementasi hierarchical clustering sendiri (`src/utils/hclust.js`)
- [Framer Motion](https://motion.dev) dan `react-intersection-observer` untuk animasi dan pemicu *scroll*
- [SheetJS (xlsx)](https://sheetjs.com) untuk membaca data Excel
- [Oxlint](https://oxc.rs) untuk linting

## Data dan metode

**Sumber:** Badan Pusat Statistik (BPS), data tahun 2025.

**Delapan indikator tingkat provinsi:**
IPM, PDRB, tingkat kemiskinan, Tingkat Pengangguran Terbuka (TPT), Tingkat Partisipasi Angkatan Kerja (TPAK), kepadatan penduduk, laju pertumbuhan penduduk, dan pengeluaran per kapita.

**Metode analisis:**
1. Kedelapan indikator distandardisasi.
2. Principal Component Analysis (PCA) meringkas indikator menjadi dua sumbu utama untuk visualisasi.
3. Hierarchical clustering dengan linkage Ward membentuk **tiga klaster** provinsi.

**Peta kabupaten/kota** memakai IPM dan PDRB per kapita tingkat kabupaten/kota.

**Berkas data** (di `public/data/`):

| Berkas | Isi |
|--------|-----|
| `pca_complete.json` | Delapan indikator per provinsi beserta skor komponen PC1–PC8 |
| `ipm_kabkota.json` | IPM dan PDRB per kabupaten/kota |
| `all_kabkota_ind.geojson` | Batas wilayah kabupaten/kota |
| `*.xlsx` | Data mentah dan hasil olahan (IPM, PDRB, PCA, klaster) |

## Menjalankan secara lokal


- Node.js (disarankan versi LTS terbaru) dan npm
- Token publik Mapbox, yang bisa dibuat gratis di [account.mapbox.com](https://account.mapbox.com)

### Langkah

```bash
# 1. Clone repositori
git clone https://github.com/Rifacantik/webstory.git
cd webstory

# 2. Pasang dependensi
npm install

# 3. Buat file .env di root proyek
echo "VITE_MAPBOX_TOKEN=pk.isi_token_mapbox_kamu" > .env

# 4. Jalankan server pengembangan
npm run dev
```

Buka alamat yang tampil di terminal (biasanya `http://localhost:5173`).



## Struktur proyek

```
webstory/
├── public/
│   ├── data/               # Data JSON, GeoJSON, dan Excel
│   ├── favicon.svg
│   └── og-image.png        # Gambar pratinjau saat tautan dibagikan
├── src/
│   ├── components/
│   │   ├── charts/         # Komponen grafik D3 (Choropleth, PCAPlot, Dendrogram, dll.)
│   │   ├── sections/       # Satu komponen per bagian cerita
│   │   ├── layout/         # Header, Footer, ProgressNav, ProvinceSelect, RegionSearch, dll.
│   │   └── Globe.jsx       # Globe Mapbox
│   ├── context/            # SelectionContext (pilihan provinsi bersama)
│   ├── hooks/              # useData, useClusterResult, useRegionSelection, dll.
│   ├── styles/             # CSS per bagian
│   ├── utils/              # PCA, hclust, warna klaster, statistik kab/kota, dll.
│   ├── App.jsx
│   └── main.jsx
├── index.html              # Metadata SEO dan Open Graph
├── vite.config.js
└── package.json
```

## Deploy

Proyek ini dipublikasikan di [Vercel](https://vercel.com). Saat deploy, tambahkan environment variable `VITE_MAPBOX_TOKEN` di pengaturan proyek Vercel, karena file `.env` tidak ikut ter-commit.

## Keamanan token

File `.env` sudah masuk `.gitignore`. Token Mapbox pada aplikasi web selalu terlihat di sisi klien, jadi gunakan **token publik** (`pk.`) dan batasi domain yang diizinkan lewat pengaturan token di dashboard Mapbox.


## Penyusun

Rifa Fairuz, 2026

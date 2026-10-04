import "../../styles/footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <h3>Sumber data</h3>
          <p>
            Badan Pusat Statistik (BPS), data tahun 2025, untuk seluruh
            indikator: IPM, PDRB, tingkat kemiskinan, TPT, TPAK, kepadatan
            penduduk, laju pertumbuhan penduduk, dan pengeluaran per kapita.
          </p>
          <p>
            <a href="https://www.bps.go.id" target="_blank" rel="noreferrer">
              bps.go.id
            </a>
          </p>
        </div>

        <div>
          <h3>Metode</h3>
          <p>
            Delapan indikator distandardisasi, lalu dianalisis dengan PCA dan
            hierarchical clustering (Ward) hingga terbentuk tiga klaster
            provinsi. Peta kabupaten/kota memakai IPM dan PDRB per kapita
            tingkat kabupaten/kota.
          </p>
        </div>

        <div>
          <h3>Penyusun</h3>
          <p>Rifa Fairuz, 2026</p>
          <p className="site-footer__tech">
            Dibuat dengan React, D3, Mapbox (globe), dan Esri (peta data).
          </p>
          <p className="site-footer__tech">
            Globe: © Mapbox © OpenStreetMap © Maxar. Citra satelit peta data:
            Esri, Maxar, Earthstar Geographics, dan kontributor GIS.
          </p>
        </div>
      </div>
    </footer>
  );
}
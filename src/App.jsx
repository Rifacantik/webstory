import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ProgressNav from "./components/layout/ProgressNav";
import ProvinceSelect from "./components/layout/ProvinceSelect";
import Bridge from "./components/layout/Bridge";
import { SelectionProvider } from "./context/SelectionContext";
import GlobeSection from "./components/sections/GlobeSection";
import ChoroplethSection from "./components/sections/ChoroplethSection";
import ProportionalSymbolSection from "./components/sections/ProportionalSymbolSection";
import PCASection from "./components/sections/PCASection";
import ParallelCoordinatesSection from "./components/sections/ParallelCoordinatesSection";
import DendrogramSection from "./components/sections/DendrogramSection";
import CirclePackingSection from "./components/sections/CirclePackingSection";
import ConclusionSection from "./components/sections/ConclusionSection";
import "./styles/global.css";

export default function App() {
  return (
    <SelectionProvider>
      <ProgressNav />
      <ProvinceSelect />
      <Header />
      <main>
        <GlobeSection />
        <ChoroplethSection />

        <Bridge>
          IPM menunjukkan kualitas hidup. Bagaimana dengan besarnya ekonomi
          tiap daerah?
        </Bridge>

        <ProportionalSymbolSection />

        <Bridge>
          Peta hanya memperlihatkan satu indikator sekaligus. Jika delapan
          indikator dilihat bersamaan, provinsi mana yang ternyata mirip?
        </Bridge>

        <PCASection />

        <Bridge>
          PCA meringkas delapan indikator menjadi dua sumbu. Seperti apa
          profil asli tiap provinsi di balik ringkasan itu?
        </Bridge>

        <ParallelCoordinatesSection />

        <Bridge>
          Garis-garis itu tampak mengelompok. Provinsi mana yang sebenarnya
          berada dalam satu kelompok?
        </Bridge>

        <DendrogramSection />

        <Bridge>
          Setelah terbentuk tiga klaster, seberapa jauh IPM di dalam
          masing-masing klaster?
        </Bridge>

        <CirclePackingSection />
        <ConclusionSection />
      </main>
      <Footer />
    </SelectionProvider>
  );
}
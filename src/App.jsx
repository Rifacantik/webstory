import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
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
    <>
      <Header />
      <main>
        <GlobeSection />
        <ChoroplethSection />
        <ProportionalSymbolSection />
        <PCASection />
        <ParallelCoordinatesSection />
        <DendrogramSection />
        <CirclePackingSection />
        <ConclusionSection />
      </main>
      <Footer />
    </>
  );
}

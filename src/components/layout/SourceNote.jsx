// Keterangan sumber data di bawah grafik. Dipakai StorySection dan PCASection.
export default function SourceNote({ children = "Badan Pusat Statistik" }) {
  return <p className="source-note">Sumber data: {children}</p>;
}
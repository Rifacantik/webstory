import StorySection from "../layout/StorySection";

export default function ConclusionSection() {
  return (
    <StorySection
      id="kesimpulan"
      title="Kesimpulan"
      text={
        <>
          <p>Temuan utama pertama dari cerita data ini.</p>
          <p>Temuan utama kedua, hubungkan dengan visualisasi sebelumnya.</p>
          <p>Implikasi atau rekomendasi yang bisa diambil pembaca.</p>
        </>
      }
    />
  );
}

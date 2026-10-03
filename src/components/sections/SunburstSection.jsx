import StorySection from "../layout/StorySection";
import Sunburst from "../charts/Sunburst";
import { dummyHierarchy } from "../../utils/dummyData";

export default function SunburstSection() {
  return (
    <StorySection
      id="sunburst"
      title="Judul Section Sunburst"
      text={<p>Cincin dalam adalah kelompok besar, cincin luar adalah rinciannya.</p>}
    >
      <Sunburst data={dummyHierarchy} />
    </StorySection>
  );
}

import globeImage from "../../assets/hero-globe.png";
import "../../styles/header.css";

export default function Header() {
  const scrollToStory = (e) => {
    e.preventDefault();
    const target = document.querySelector("main");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="hero">
      <div className="hero__globe" aria-hidden="true">
        <img src={globeImage} alt="" />
      </div>

      <div className="hero__content">
        <h1 className="hero__title">
          Seberapa merata pembangunan sosial-ekonomi di Indonesia?
        </h1>

        <p className="hero__lead">
          Apakah setiap wilayah memiliki kondisi yang sama, atau terdapat
          kesenjangan yang tersembunyi di balik angka-angka?
        </p>

        <a className="hero__cue" href="#story" onClick={scrollToStory}>
          <svg
            className="hero__cue-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4v16" />
            <path d="M6 14l6 6 6-6" />
          </svg>
          <span>Scroll untuk menemukan jawabannya</span>
        </a>
      </div>
    </header>
  );
}
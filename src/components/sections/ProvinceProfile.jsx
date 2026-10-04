import { groupColor } from "../../utils/colors";
import { formatValue } from "../../utils/profileInsight";
import "../../styles/province-profile.css";

const LEVEL_WORD = { tinggi: "tinggi", menengah: "menengah", rendah: "rendah" };

// profile: hasil buildInsights untuk provinsi terpilih, atau null
export default function ProvinceProfile({ profile, onPick, onClear }) {
  if (!profile) {
    return (
      <aside className="pv-card" aria-live="polite">
        <h3 className="pv-title">Cara membaca grafik</h3>
        <ul className="pv-guide">
          <li>Satu garis mewakili satu provinsi.</li>
          <li>Makin tinggi garis pada sebuah sumbu, makin besar nilainya.</li>
          <li>
            Pada kemiskinan dan pengangguran (TPT), nilai tinggi justru kurang
            baik. Tanda panah di atas sumbu menunjukkan arah yang lebih baik.
          </li>
          <li>
            Klik satu garis, atau ketik di kotak "Cari provinsi", untuk membaca
            profilnya.
          </li>
        </ul>
      </aside>
    );
  }

  const { name, group, n, headline, strengths, weaknesses, highlights, items, similar } = profile;

  return (
    <aside className="pv-card" aria-live="polite">
      <div className="pv-head">
        <span className="pv-swatch" style={{ background: groupColor(group) }} />
        <div className="pv-head__text">
          <h3 className="pv-name">{name}</h3>
          <span className="pv-sub">{group}</span>
        </div>
        <button type="button" className="pv-clear" onClick={onClear}>
          Hapus pilihan
        </button>
      </div>

      <p className="pv-headline">{headline}</p>
      {strengths && (
        <p className="pv-line">
          <strong className="pv-tag pv-tag--baik">Sisi baik:</strong> {strengths}.
        </p>
      )}
      {weaknesses && (
        <p className="pv-line">
          <strong className="pv-tag pv-tag--lemah">Sisi lemah:</strong> {weaknesses}.
        </p>
      )}
      {!strengths && !weaknesses && (
        <p className="pv-line">
          Hampir semua indikatornya berada di kisaran menengah nasional.
        </p>
      )}
      {highlights && (
        <p className="pv-line">
          <strong className="pv-tag">Menonjol:</strong> {highlights}.
        </p>
      )}

      <ul className="pv-rows">
        {items.map((i) => (
          <li
            key={i.feature}
            className="pv-row"
            aria-label={`${i.label}: ${formatValue(i.feature, i.value)}, peringkat ${i.rank} dari ${n}, tergolong ${LEVEL_WORD[i.level]}`}
          >
            <span className="pv-row__name">{i.label}</span>
            <span className="pv-row__val">{formatValue(i.feature, i.value)}</span>
            <span className="pv-track" aria-hidden="true">
              <i
                className={`pv-dot pv-dot--${i.tone}`}
                style={{ left: `${i.pos * 100}%` }}
              />
            </span>
            <span className="pv-row__rank">#{i.rank}</span>
          </li>
        ))}
      </ul>

      <p className="pv-legend">
        Titik di kanan berarti nilai tinggi, di kiri berarti rendah. Peringkat #1
        adalah nilai tertinggi dari {n} provinsi. Biru: sisi baik. Oranye: sisi
        lemah. Abu-abu: menengah atau tanpa arah baik/buruk. PDRB dan kepadatan
        memakai skala akar kuadrat pada grafik.
      </p>

      {similar.length > 0 && (
        <div className="pv-similar">
          <span>Profil paling mirip:</span>
          {similar.map((s) => (
            <button key={s} type="button" onClick={() => onPick(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
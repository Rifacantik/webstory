import { useEffect, useMemo, useRef, useState } from "react";
import { useClusterResult } from "../../hooks/useClusterResult";
import "../../styles/conclusion.css";

const maxBy = (rows, k) => rows.reduce((a, b) => (b[k] > a[k] ? b : a));
const minBy = (rows, k) => rows.reduce((a, b) => (b[k] < a[k] ? b : a));

const id1 = (v) => v.toLocaleString("id-ID");
const id2 = (v) =>
  v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const NUM = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ABBR = { "Nusa Tenggara Timur": "NTT", "Nusa Tenggara Barat": "NTB" };

function CountUp({ to, decimals = 0, suffix = "", duration = 1600 }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setValue(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / duration);
          setValue(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString("id-ID", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

function describeCluster(c, isLowest, isLargest) {
  if (c.size === 1) return `${c.names[0]} berdiri sendiri`;
  if (isLowest && c.size <= 6) {
    const papua = c.names.filter((n) => /papua/i.test(n)).length;
    const others = c.names.filter((n) => !/papua/i.test(n)).map((n) => ABBR[n] ?? n);
    const parts = [];
    if (papua) parts.push(`${NUM[papua] ?? papua} di Papua`);
    if (others.length) parts.push(others.join(" dan "));
    return `${cap(NUM[c.size] ?? String(c.size))} provinsi tertinggal: ${parts.join(" dan ")}`;
  }
  return isLargest ? "Kelompok terbesar di tengah" : `${c.size} provinsi dengan karakter serupa`;
}

export default function ConclusionSection() {
  const { rows, cut } = useClusterResult();

  const stats = useMemo(() => {
    if (!rows.length) return [];
    const data = rows.map((r) => ({
      Provinsi: r.Provinsi,
      IPM: Number(r.IPM),
      Kemiskinan: Number(r.Kemiskinan),
      Pengeluaran: Number(r["Pengeluaran per Kapita"]),
    }));
    const ipmHi = maxBy(data, "IPM");
    const ipmLo = minBy(data, "IPM");
    const povHi = maxBy(data, "Kemiskinan");
    const povLo = minBy(data, "Kemiskinan");
    const spHi = maxBy(data, "Pengeluaran");
    const spLo = minBy(data, "Pengeluaran");

    return [
      {
        to: ipmHi.IPM - ipmLo.IPM,
        decimals: 1,
        suffix: " poin",
        title: "Selisih IPM tertinggi dan terendah",
        note: `${ipmHi.Provinsi} (${id2(ipmHi.IPM)}) dibanding ${ipmLo.Provinsi} (${id2(ipmLo.IPM)})`,
      },
      {
        to: povHi.Kemiskinan / povLo.Kemiskinan,
        decimals: 1,
        suffix: "×",
        title: "Tingkat kemiskinan tertinggi dibanding terendah",
        note: `${povHi.Provinsi} (${id2(povHi.Kemiskinan)}%) dibanding ${povLo.Provinsi} (${id2(povLo.Kemiskinan)}%)`,
      },
      {
        to: spHi.Pengeluaran / spLo.Pengeluaran,
        decimals: 1,
        suffix: "×",
        title: "Pengeluaran per kapita tertinggi dibanding terendah",
        note: `${spHi.Provinsi} dibanding ${spLo.Provinsi}`,
      },
    ];
  }, [rows]);

  const clusters = useMemo(() => {
    if (!cut) return [];
    const withMean = cut.clusters.map((c, i) => ({
      n: i + 1,
      size: c.size,
      names: c.names,
      mean: c.members.reduce((s, m) => s + m.ipm, 0) / c.members.length,
    }));
    const lowest = Math.min(...withMean.map((c) => c.mean));
    const largest = Math.max(...withMean.map((c) => c.size));
    return withMean.map((c) => ({
      ...c,
      label: describeCluster(c, c.mean === lowest, c.size === largest),
      ipm: id2(c.mean),
    }));
  }, [cut]);

  const total = clusters.reduce((s, c) => s + c.size, 0);

  return (
    <section id="kesimpulan" className="conclusion">
      <div className="conclusion__inner">
        <p className="conclusion__question">
          Seberapa merata pembangunan sosial-ekonomi di Indonesia?
        </p>
        <h2 className="conclusion__answer">
          Belum merata. Jarak antarprovinsi lebar, dengan Papua di ujung
          bawahnya.
        </h2>

        <div className="conclusion__stats">
          {stats.map((s) => (
            <div className="stat" key={s.title}>
              <div className="stat__value">
                <CountUp to={s.to} decimals={s.decimals} suffix={s.suffix} />
              </div>
              <div className="stat__title">{s.title}</div>
              <div className="stat__note">{s.note}</div>
            </div>
          ))}
        </div>

        {clusters.length > 0 && (
          <div className="conclusion__clusters">
            <p>
              Analisis klaster memperkuat gambaran ini. Dari {total} provinsi,
              terbentuk tiga kelompok dengan karakter yang sangat berbeda.
            </p>

            <div className="cbar" role="img" aria-label="Proporsi provinsi pada tiga klaster">
              {clusters.map((c) => (
                <div
                  key={c.n}
                  className={`cbar__seg cbar__seg--${c.n}`}
                  style={{ flexGrow: c.size }}
                />
              ))}
            </div>

            <ul className="clegend">
              {clusters.map((c) => (
                <li key={c.n}>
                  <span className={`clegend__dot cbar__seg--${c.n}`} />
                  <span>
                    <strong>
                      Klaster {c.n} · {c.size} provinsi
                    </strong>
                    <br />
                    {c.label}, rata-rata IPM {c.ipm}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="conclusion__close">
          Angka rata-rata nasional menyembunyikan jarak ini. Melihat provinsi
          berdasarkan kelompoknya memberi gambaran yang lebih jujur daripada
          satu angka tunggal.
        </p>
      </div>
    </section>
  );
}
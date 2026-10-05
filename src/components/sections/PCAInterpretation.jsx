import { useEffect, useRef, useState } from "react";

export default function PCAInterpretation({
  variance = [],
  onFocusChange,
}) {
  const v1 =
    variance[0] != null
      ? (variance[0] * 100).toFixed(1)
      : "49,5";

  const v2 =
    variance[1] != null
      ? (variance[1] * 100).toFixed(1)
      : "20,6";

  const total =
    variance[0] != null && variance[1] != null
      ? ((variance[0] + variance[1]) * 100).toFixed(1)
      : "70,1";

  const CARDS = [
    {
      id: "cara-membaca",
      focus: null,

      body: (
        <p>
          Dua komponen utama pada grafik menjelaskan sekitar{" "}
          <strong>{total}%</strong> variasi data dari delapan indikator.
          PC1 (sumbu horizontal) menangkap {v1}% variasi dan PC2
          (sumbu vertikal) menangkap {v2}%. Sisa variasinya tersebar
          di komponen lain yang tidak ditampilkan.
        </p>
      ),
    },

    {
      id: "sumbu",
      focus: null,

      title: "Apa yang dibedakan oleh tiap sumbu?",

      body: (
        <ul>
          <li>
            <strong>
              PC1 mencerminkan tingkat pembangunan dan kesejahteraan.
            </strong>{" "}
            Provinsi di sisi kanan cenderung punya IPM, PDRB, dan
            pengeluaran per kapita yang tinggi dengan kemiskinan yang
            rendah. Provinsi di sisi kiri menunjukkan kebalikannya.
          </li>

          <li>
            <strong>
              PC2 lebih banyak berkaitan dengan ketenagakerjaan dan
              pertumbuhan penduduk.
            </strong>{" "}
            Provinsi di bagian atas cenderung punya pengangguran rendah
            dan partisipasi kerja tinggi, sedangkan provinsi di bagian
            bawah cenderung punya pengangguran lebih tinggi atau laju
            pertumbuhan penduduk yang besar.
          </li>
        </ul>
      ),
    },

    {
      id: "jakarta",

      eyebrow: "Pola yang terlihat",

      focus: {
        names: ["DKI Jakarta"],
      },

      title: "DKI Jakarta berdiri sendiri di sisi kanan",

      body: (
        <p>
          Kombinasi IPM, PDRB, pengeluaran per kapita, dan kepadatan
          penduduk yang sangat tinggi membuatnya berbeda jauh dari
          provinsi lain.
        </p>
      ),
    },

    {
      id: "papua",

      eyebrow: "Pola yang terlihat",

      focus: {
        groups: ["Papua"],
      },

      title: "Provinsi di Papua tersebar di sisi kiri",

      body: (
        <p>
          Papua Pegunungan dan Papua Tengah berada paling jauh di kiri
          karena IPM rendah, kemiskinan tinggi, dan pengeluaran per
          kapita rendah. Papua Pegunungan juga berada tinggi di sumbu
          vertikal karena partisipasi kerjanya sangat tinggi dan
          penganggurannya sangat rendah.
        </p>
      ),
    },

    {
      id: "tengah",

      eyebrow: "Pola yang terlihat",

      focus: {
        groups: [
          "Sumatera",
          "Kalimantan",
          "Sulawesi",
        ],
      },

      title:
        "Sebagian besar provinsi Sumatera, Kalimantan, dan Sulawesi mengumpul di tengah",

      body: (
        <p>
          Artinya karakteristiknya relatif mirip dan berada di kisaran
          menengah nasional.
        </p>
      ),
    },

    {
      id: "jawa",

      eyebrow: "Pola yang terlihat",

      focus: {
        groups: ["Jawa"],
      },

      title: "Pulau Jawa menyebar luas",

      body: (
        <p>
          DI Yogyakarta, Jawa Tengah, dan Jawa Timur berada di kanan
          atas, sementara Jawa Barat dan Banten bergeser ke bawah
          karena pengangguran yang lebih tinggi.
        </p>
      ),
    },

    {
      id: "kaltim",

      eyebrow: "Pola yang terlihat",

      focus: {
        names: ["Kalimantan Timur"],
      },

      title: "Kalimantan Timur menjadi titik paling bawah",

      body: (
        <p>
          Laju pertumbuhan penduduknya yang tertinggi di antara semua
          provinsi menjadi pembeda utamanya.
        </p>
      ),
    },

    {
      id: "bali",

      eyebrow: "Pola yang terlihat",

      focus: {
        names: ["Bali"],
      },

      title: "Bali berada di kanan atas, terpisah dari kelompok lain",

      body: (
        <p>
          Pengangguran yang sangat rendah, partisipasi kerja yang tinggi,
          dan pengeluaran per kapita yang tinggi mendorong posisinya.
        </p>
      ),
    },

    {
      id: "catatan",

      focus: null,

      title: "Catatan",

      body: (
        <p className="note">
          PCA hanya meringkas pola dari delapan indikator yang dipakai.
          Posisi yang berdekatan berarti profilnya mirip pada indikator
          tersebut, bukan berarti kondisi dua provinsi itu sama di semua
          aspek. Arah sumbu (positif atau negatif) bersifat relatif,
          yang dibandingkan adalah jarak antartitik.
        </p>
      ),
    },
  ];

  const [activeId, setActiveId] = useState(CARDS[0].id);

  const refs = useRef({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.dataset.id);
          }
        });
      },
      {
        rootMargin: "-45% 0px -45% 0px",
        threshold: 0,
      }
    );

    Object.values(refs.current).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const card = CARDS.find(
      (card) => card.id === activeId
    );

    onFocusChange?.(
      card ? card.focus : null
    );
  }, [activeId]);

  return (
    <div className="pca-interpretation">

      {CARDS.map((card) => (
        <article
          key={card.id}
          data-id={card.id}
          ref={(element) => {
            refs.current[card.id] = element;
          }}
          className={`pca-card pca-step ${
            activeId === card.id
              ? "is-active"
              : ""
          }`}
        >

          {card.eyebrow && (
            <p className="pca-step__eyebrow">
              {card.eyebrow}
            </p>
          )}

          <h3>{card.title}</h3>

          {card.body}

        </article>
      ))}

    </div>
  );
}
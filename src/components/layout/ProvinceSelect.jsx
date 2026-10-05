import { useEffect, useState } from "react";
import { useSelection } from "../../context/SelectionContext";
import "../../styles/province-select.css";

// Kotak pilih provinsi muncul di antara section PCA dan Dendrogram
const FIRST = "pca";
const LAST = "dendrogram";

export default function ProvinceSelect() {
  const { selected, setSelected } = useSelection();
  const [names, setNames] = useState([]);
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    fetch("/data/pca_complete.json")
      .then((res) => res.json())
      .then((rows) =>
        setNames(
          rows
            .map((r) => r.Provinsi)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "id"))
        )
      )
      .catch((err) => console.error("Gagal memuat daftar provinsi:", err));
  }, []);

  // Tampil hanya saat pembaca berada di antara section PCA dan Dendrogram
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const a = document.getElementById(FIRST);
      const b = document.getElementById(LAST);
      if (!a || !b) return setVisible(false);
      const mid = window.innerHeight * 0.5;
      setVisible(a.getBoundingClientRect().top < mid && b.getBoundingClientRect().bottom > mid);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    setText(selected ?? "");
  }, [selected]);

  const commit = (value) => {
    const match = names.find((n) => n.toLowerCase() === value.trim().toLowerCase());
    if (match) setSelected(match);
  };

  return (
    <div className={`province-select${visible ? " is-visible" : ""}`} role="search">
      <label htmlFor="province-input">Cari provinsi</label>
      <div className="province-select__row">
        <input
          id="province-input"
          list="province-list"
          value={text}
          placeholder="Ketik atau pilih…"
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setText(selected ?? "")}
        />
        {selected && (
          <button
            type="button"
            aria-label="Hapus pilihan provinsi"
            onClick={() => {
              setSelected(null);
              setText("");
            }}
          >
            ×
          </button>
        )}
      </div>
      <datalist id="province-list">
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  );
}
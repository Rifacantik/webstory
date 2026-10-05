import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRegionSelection } from "../../hooks/useRegionSelection";
import "../../styles/region-search.css";

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const bare = (s) => norm(s).replace(/^(kab\.|kota)\s*/, "");

function Combobox({ label, placeholder, options, value, onPick, disabled, inputRef }) {
  const uid = useId();
  const listRef = useRef(null);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const shown = useMemo(() => {
    const q = norm(query.trim());
    if (!typing || !q) return options;
    return options
      .filter((o) => norm(o.label).includes(q))
      .sort((a, b) => (bare(a.label).startsWith(q) ? 0 : 1) - (bare(b.label).startsWith(q) ? 0 : 1));
  }, [options, query, typing]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const close = () => {
    setOpen(false);
    setTyping(false);
    setQuery("");
  };

  const choose = (o) => {
    onPick(o.value);
    close();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      if (open && shown[cursor]) {
        e.preventDefault();
        choose(shown[cursor]);
      }
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <div className="rs-field">
      <label htmlFor={`${uid}-input`}>{label}</label>
      <div className="rs-combo">
        <input
          id={`${uid}-input`}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open && !disabled}
          aria-controls={`${uid}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && shown.length ? `${uid}-opt-${cursor}` : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={typing ? query : selectedLabel}
          onFocus={(e) => {
            setOpen(true);
            setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
            e.target.select();
          }}
          onBlur={close}
          onChange={(e) => {
            setQuery(e.target.value);
            setTyping(true);
            setOpen(true);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
        />
        {open && !disabled && (
          <ul className="rs-list" id={`${uid}-list`} role="listbox" ref={listRef}>
            {shown.length === 0 && <li className="rs-empty">Tidak ditemukan</li>}
            {shown.map((o, i) => (
              <li
                key={o.value}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                className={`${i === cursor ? "is-active" : ""}${o.value === value ? " is-selected" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault(); 
                  choose(o);
                }}
                onMouseEnter={() => setCursor(i)}
              >
                {o.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function RegionSearch({ rows, variant = "inline" }) {
  const {
    provinces,
    byProv,
    selectedProv,
    selectedKab,
    pickProvince,
    pickKab,
    clearKab,
    clearAll,
  } = useRegionSelection(rows);
  const kabRef = useRef(null);

  const provOptions = useMemo(() => provinces.map((p) => ({ value: p, label: p })), [provinces]);
  const kabOptions = useMemo(
    () => (selectedProv ? byProv.get(selectedProv) ?? [] : []).map((d) => ({ value: d.mhid, label: d.nama })),
    [selectedProv, byProv]
  );

  if (!rows) return null;

  return (
    <div className={`region-search region-search--${variant}`} role="search">
      <Combobox
        label="Provinsi"
        placeholder="Cari atau pilih provinsi"
        options={provOptions}
        value={selectedProv}
        onPick={(p) => {
          pickProvince(p);
          setTimeout(() => kabRef.current?.focus(), 0); 
        }}
      />
      <Combobox
        label="Kabupaten/Kota"
        placeholder={selectedProv ? "Cari atau pilih kab/kota" : "Pilih provinsi dulu"}
        options={kabOptions}
        value={selectedKab}
        disabled={!selectedProv}
        inputRef={kabRef}
        onPick={pickKab}
      />
      {selectedProv && (
        <div className="rs-actions">
          {selectedKab && (
            <button type="button" className="rs-btn rs-btn--quiet" onClick={clearKab}>
              Lihat seluruh provinsi
            </button>
          )}
          <button type="button" className="rs-btn" onClick={clearAll}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
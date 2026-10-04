import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// Satu provinsi (dan, bila ada, satu kabupaten/kota di dalamnya) terpilih
// yang dibagikan ke semua chart.
//   selected          : nama provinsi (penulisan sama dengan pca_complete.json) atau null
//   setSelected(nama) : pilih provinsi; pilihan kab/kota otomatis dikosongkan bila provinsinya berganti
//   kab               : mhid kabupaten/kota terpilih atau null
//   setKab(mhid, prov): pilih kab/kota (prov opsional; bila diberikan, provinsi ikut dipilih),
//                       setKab(null) menghapus pilihan kab/kota saja
const Ctx = createContext({
  selected: null,
  setSelected: () => {},
  kab: null,
  setKab: () => {},
});

export function SelectionProvider({ children }) {
  const [selected, setSelectedState] = useState(null);
  const [kab, setKabState] = useState(null);
  const selRef = useRef(null);

  const setSelected = useCallback((v) => {
    if (selRef.current !== v) setKabState(null);
    selRef.current = v;
    setSelectedState(v);
  }, []);

  const setKab = useCallback((mhid, prov) => {
    if (mhid == null) {
      setKabState(null);
      return;
    }
    const p = prov ?? selRef.current;
    if (!p) return;
    selRef.current = p;
    setSelectedState(p);
    setKabState(mhid);
  }, []);

  const value = useMemo(
    () => ({ selected, setSelected, kab, setKab }),
    [selected, kab, setSelected, setKab]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSelection = () => useContext(Ctx);
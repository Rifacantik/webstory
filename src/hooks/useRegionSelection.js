import { useCallback, useMemo } from "react";
import { useSelection } from "../context/SelectionContext";
import { useData } from "./useData";

const PCA_URL = "/data/pca_complete.json";

// Kunci pencocokan nama provinsi: abaikan huruf besar/kecil, spasi, dan tanda baca.
// "DI Yogyakarta" = "D.I. Yogyakarta"; "Kep. Riau" = "Kepulauan Riau".
export const provKey = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace("kepulauan", "kep")
    .replace("daerahistimewa", "di");

// rows: isi ipm_kabkota.json ([{ mhid, nama, provinsi, ipm, pdrb }, ...]) atau null saat belum dimuat.
// Mengembalikan daftar untuk kotak pencarian, serta `target` untuk peta:
//   target = null | { ids: [mhid semua kab/kota di provinsi terpilih], kab: mhid | null }
export function useRegionSelection(rows) {
  const { selected, setSelected, kab, setKab } = useSelection();
  const { data: pca } = useData(PCA_URL, "json");

  // Nama provinsi yang disimpan ke context disamakan dengan penulisan di pca_complete.json,
  // supaya chart PCA/Dendrogram ikut menyorot provinsi yang sama.
  const canon = useMemo(() => {
    const m = new Map();
    (pca ?? []).forEach((r) => r.Provinsi && m.set(provKey(r.Provinsi), r.Provinsi));
    return (name) => m.get(provKey(name)) ?? name;
  }, [pca]);

  const { byId, byProv, provinces } = useMemo(() => {
    const byId = new Map();
    const byProv = new Map();
    (rows ?? []).forEach((d) => {
      byId.set(d.mhid, d);
      if (!byProv.has(d.provinsi)) byProv.set(d.provinsi, []);
      byProv.get(d.provinsi).push(d);
    });
    byProv.forEach((list) => list.sort((a, b) => a.nama.localeCompare(b.nama, "id")));
    const provinces = [...byProv.keys()].sort((a, b) => a.localeCompare(b, "id"));
    return { byId, byProv, provinces };
  }, [rows]);

  // Provinsi terpilih dalam penulisan data IPM (null bila tidak ada di data ini)
  const selectedProv = useMemo(() => {
    if (!selected) return null;
    const k = provKey(selected);
    return provinces.find((p) => provKey(p) === k) ?? null;
  }, [selected, provinces]);

  // Kab/kota terpilih, hanya bila memang berada di provinsi terpilih
  const selectedKab = useMemo(() => {
    if (!kab || !selectedProv) return null;
    const d = byId.get(kab);
    return d && provKey(d.provinsi) === provKey(selectedProv) ? kab : null;
  }, [kab, selectedProv, byId]);

  const target = useMemo(() => {
    if (!selectedProv) return null;
    return {
      ids: (byProv.get(selectedProv) ?? []).map((d) => d.mhid),
      kab: selectedKab,
    };
  }, [selectedProv, selectedKab, byProv]);

  const pickProvince = useCallback((prov) => setSelected(canon(prov)), [setSelected, canon]);

  const pickKab = useCallback(
    (mhid) => {
      const d = byId.get(mhid);
      if (d) setKab(mhid, canon(d.provinsi));
    },
    [byId, setKab, canon]
  );

  const clearKab = useCallback(() => setKab(null), [setKab]);
  const clearAll = useCallback(() => setSelected(null), [setSelected]);

  return {
    provinces,
    byProv,
    selectedProv,
    selectedKab,
    target,
    pickProvince,
    pickKab,
    clearKab,
    clearAll,
  };
}
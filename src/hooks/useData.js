import { useEffect, useState } from "react";
import * as d3 from "d3";

// Memuat file dari /public/data. type: "json" | "csv"
export function useData(url, type = "json") {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    const loader = type === "csv" ? d3.csv(url, d3.autoType) : d3.json(url);
    loader
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));
    return () => { cancelled = true; };
  }, [url, type]);

  return state;
}

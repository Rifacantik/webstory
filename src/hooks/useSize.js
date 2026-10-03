import { useEffect, useRef, useState } from "react";

// Mengembalikan [ref, width] supaya chart responsif
export function useSize(initial = 800) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

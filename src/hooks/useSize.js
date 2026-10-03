import { useEffect, useRef, useState } from "react";

// Mengembalikan [ref, width, height] dari elemen yang diamati
export function useSize(initial = 800) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: initial, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize({
        width: Math.max(280, Math.round(width)),
        height: Math.round(height),
      });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size.width, size.height];
}
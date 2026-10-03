import * as d3 from "d3";

export const GROUP_COLORS = {
  Sumatera: "#e0533a",
  Jawa: "#1f6f8b",
  "Bali & Nusa Tenggara": "#2a9d8f",
  Kalimantan: "#6a994e",
  Sulawesi: "#e9a23b",
  Maluku: "#c1557f",
  Papua: "#7b4b94",
};

export const groupColor = (g) => GROUP_COLORS[g] ?? "#888";

export const sequential = (domain) =>
  d3.scaleSequential(d3.interpolateYlGnBu).domain(domain);
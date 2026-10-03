import { PCA } from "ml-pca";

// rows: array of objects, features: array of key numerik
export function runPCA(rows, features) {
  const matrix = rows.map((r) => features.map((f) => +r[f]));
  const pca = new PCA(matrix, { center: true, scale: true });
  const scores = pca.predict(matrix, { nComponents: 2 }).to2DArray();
  const variance = pca.getExplainedVariance(); // proporsi tiap PC
  return {
    points: rows.map((r, i) => ({ ...r, pc1: scores[i][0], pc2: scores[i][1] })),
    variance,
  };
}

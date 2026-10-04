// Mengukur lebar teks dengan canvas, memakai font yang sebenarnya.
let ctx;

export function textWidth(text, font) {
  ctx ??= document.createElement("canvas").getContext("2d");
  ctx.font = font;
  return ctx.measureText(text).width;
}

export const bodyFamily = () => getComputedStyle(document.body).fontFamily;
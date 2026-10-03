// Tooltip sederhana berbasis satu elemen div global
export function getTooltip() {
  let el = document.querySelector(".tooltip");
  if (!el) {
    el = document.createElement("div");
    el.className = "tooltip";
    document.body.appendChild(el);
  }
  return {
    show: (event, html) => {
      el.innerHTML = html;
      el.style.opacity = 1;
      el.style.left = event.clientX + 12 + "px";
      el.style.top = event.clientY + 12 + "px";
    },
    hide: () => (el.style.opacity = 0),
  };
}

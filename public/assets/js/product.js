// Product page: image gallery thumbnails.
const gallery = document.querySelector("[data-gallery]");
if (gallery) {
  const main = gallery.querySelector(".pp-img");
  gallery.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-thumb]");
    if (!btn || !main) return;
    const src = btn.dataset.thumb;
    main.src = src;
    main.srcset = "";
    gallery.querySelectorAll("[data-thumb]").forEach((b) => b.classList.toggle("is-on", b === btn));
  });
}

// Motion & delight: scroll reveals with stagger, count-up numbers, scroll
// progress, card tilt, hero parallax, fly-to-cart, and the intro cookie.
// Everything is skipped for visitors who prefer reduced motion.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---- intro: remember it was shown so it only plays on the first visit
if (document.querySelector("[data-intro]")) {
  document.cookie = "ovr_intro=1; Path=/; Max-Age=" + 60 * 60 * 24 * 30 + "; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  setTimeout(() => document.querySelector("[data-intro]")?.remove(), 1600);
}

// ---- staggered reveal-on-scroll
document.querySelectorAll("[data-stagger]").forEach((group) => {
  [...group.children].forEach((el, i) => {
    el.classList.add("reveal");
    el.style.setProperty("--i", String(i % 8));
  });
});
if ("IntersectionObserver" in window && !reduce) {
  document.documentElement.classList.add("js-reveal");
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add("is-in");
      io.unobserve(en.target);
      en.target.querySelectorAll("[data-count]").forEach(countUp);
    }
  }, { rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  // Elements already on screen at load reveal immediately.
  requestAnimationFrame(() => document.querySelectorAll(".reveal").forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) { el.classList.add("is-in"); el.querySelectorAll("[data-count]").forEach(countUp); }
  }));
}

function countUp(el) {
  if (el.dataset.counted) return;
  el.dataset.counted = "1";
  const target = Number(el.dataset.count) || 0;
  const start = performance.now();
  const dur = 1400;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(tick);
  };
  el.textContent = "0";
  requestAnimationFrame(tick);
}

if (!reduce) {
  // ---- scroll progress bar
  const bar = document.querySelector("[data-scroll-progress]");
  if (bar) {
    let queued = false;
    const update = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--p", max > 0 ? String(Math.min(1, scrollY / max)) : "0");
    };
    addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // ---- 3D tilt with glare on cards (mouse only)
  if (finePointer) {
    document.addEventListener("pointermove", (e) => {
      const card = e.target.closest && e.target.closest(".tilt");
      if (!card) return;
      if (!card.querySelector(".tilt-glare")) card.insertAdjacentHTML("beforeend", '<span class="tilt-glare" aria-hidden="true"></span>');
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", ((x - 0.5) * 10).toFixed(2) + "deg");
      card.style.setProperty("--rx", ((0.5 - y) * 8).toFixed(2) + "deg");
      card.style.setProperty("--gx", (x * 100).toFixed(0) + "%");
      card.style.setProperty("--gy", (y * 100).toFixed(0) + "%");
    }, { passive: true });
    document.addEventListener("pointerout", (e) => {
      const card = e.target.closest && e.target.closest(".tilt");
      if (card && !card.contains(e.relatedTarget)) { card.style.removeProperty("--rx"); card.style.removeProperty("--ry"); }
    });

    // ---- hero parallax (follows the mouse)
    const art = document.querySelector("[data-parallax]");
    if (art) {
      const hero = art.closest(".hero") || art;
      hero.addEventListener("pointermove", (e) => {
        const x = e.clientX / innerWidth - 0.5;
        const y = e.clientY / innerHeight - 0.5;
        art.querySelectorAll("[data-depth]").forEach((el) => {
          const d = Number(el.dataset.depth);
          el.style.setProperty("--px", (x * d * 18).toFixed(1) + "px");
          el.style.setProperty("--py", (y * d * 14).toFixed(1) + "px");
        });
      }, { passive: true });
    }
  }

  // ---- fly the product photo into the cart icon
  document.addEventListener("cart:added", (e) => {
    const src = e.detail && e.detail.source;
    const img = (src && (src.closest(".product-card, .hamper-card")?.querySelector("img"))) || document.querySelector(".pp-img");
    const target = document.querySelector(".cart-btn");
    if (!img || !target) return;
    const a = img.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    if (!a.width || a.bottom < 0 || a.top > innerHeight) { hit(target); return; }
    const fly = img.cloneNode();
    fly.removeAttribute("srcset");
    fly.removeAttribute("loading");
    fly.className = "fly-img";
    fly.alt = "";
    Object.assign(fly.style, { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px" });
    document.body.append(fly);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = fly.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(.55) rotate(-8deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(-20deg)`, opacity: 0.3 },
    ], { duration: 800, easing: "cubic-bezier(.5,0,.3,1)" });
    anim.onfinish = () => { fly.remove(); hit(target); };
  });
}

function hit(el) {
  el.classList.remove("is-hit");
  void el.offsetWidth;
  el.classList.add("is-hit");
}

// Shop & category pages: client-side filter, search and sort over the
// server-rendered product cards (works without JS: all products are listed).
const bar = document.querySelector("[data-filters]");
const grid = document.querySelector("[data-grid]");
if (bar && grid) {
  const cards = [...grid.querySelectorAll("[data-product]")];
  const state = { cat: "", q: "", gf: false, instock: false, priced: false, sort: "featured" };
  const params = new URLSearchParams(location.search);
  state.cat = params.get("category") || "";
  state.q = params.get("q") || "";
  const search = bar.querySelector("[data-search]");
  if (search) search.value = state.q;

  function apply() {
    const q = state.q.toLowerCase();
    let shown = 0;
    const visible = [];
    for (const c of cards) {
      const ok =
        (!state.cat || c.dataset.category === state.cat) &&
        (!q || c.dataset.name.includes(q) || c.textContent.toLowerCase().includes(q)) &&
        (!state.gf || c.dataset.tags.split(" ").includes("gluten-free")) &&
        (!state.instock || c.dataset.instock === "1") &&
        (!state.priced || c.querySelector("[data-add-to-cart]"));
      c.hidden = !ok;
      if (ok) { shown++; visible.push(c); }
    }
    const price = (c) => (c.dataset.price === "" ? Infinity : Number(c.dataset.price));
    const sorters = {
      featured: (a, b) => cards.indexOf(a) - cards.indexOf(b),
      "price-asc": (a, b) => price(a) - price(b),
      "price-desc": (a, b) => (price(b) === Infinity ? -1 : price(a) === Infinity ? 1 : price(b) - price(a)),
      name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
    };
    [...cards].sort(sorters[state.sort]).forEach((c) => grid.append(c));
    bar.querySelector("[data-count]").textContent = shown + " product" + (shown === 1 ? "" : "s");
    document.querySelector("[data-empty]").hidden = shown > 0;
    bar.querySelectorAll("[data-cat]").forEach((b) => {
      const on = b.dataset.cat === state.cat;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    const url = new URL(location.href);
    state.cat ? url.searchParams.set("category", state.cat) : url.searchParams.delete("category");
    state.q ? url.searchParams.set("q", state.q) : url.searchParams.delete("q");
    history.replaceState(null, "", url);
  }

  bar.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-cat]");
    if (chip) { state.cat = chip.dataset.cat; apply(); }
  });
  search && search.addEventListener("input", () => { state.q = search.value.trim(); apply(); });
  for (const k of ["gf", "instock", "priced"]) {
    const el = bar.querySelector(`[data-${k}]`);
    el && el.addEventListener("change", () => { state[k] = el.checked; apply(); });
  }
  bar.querySelector("[data-sort]").addEventListener("change", (e) => { state.sort = e.target.value; apply(); });
  document.querySelector("[data-clear]")?.addEventListener("click", () => {
    Object.assign(state, { cat: "", q: "", gf: false, instock: false, priced: false });
    if (search) search.value = "";
    bar.querySelectorAll("input[type=checkbox]").forEach((c) => (c.checked = false));
    apply();
  });
  apply();
}

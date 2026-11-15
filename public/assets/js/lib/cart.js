// Cart store (localStorage). Holds ids, quantities and a display snapshot;
// prices are always re-calculated by the server (/api/cart/quote).
const KEY = "ovr_cart_v1";
const MAX_QTY = 100;

function safeRead() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((i) => i && typeof i.slug === "string" && Number.isInteger(i.qty)) : [];
  } catch {
    return [];
  }
}
let memory = null; // fallback when storage is unavailable
export function getCart() {
  return memory || safeRead();
}
function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    memory = null;
  } catch {
    memory = items;
  }
  document.dispatchEvent(new CustomEvent("cart:change", { detail: { items } }));
}

export const lineKey = (slug, variant = "", options = {}) => [slug, variant || "", options.packaging || "", options.message || ""].join("|");

export function addItem(data, { variant = "", qty = 1, options = {} } = {}) {
  const items = getCart();
  const key = lineKey(data.slug, variant, options);
  const v = (data.variants || []).find((x) => x.id === variant);
  const existing = items.find((i) => i.key === key);
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
  else items.push({
    key, slug: data.slug, variant: variant || "", qty: Math.min(MAX_QTY, qty),
    options: { packaging: options.packaging || "", message: options.message || "" },
    name: data.name, image: data.image, pack: data.pack || "",
    variantLabel: v ? v.label : "", price: v ? v.price : data.price,
  });
  save(items);
  return items;
}

export function setQty(key, qty) {
  const items = getCart();
  const it = items.find((i) => i.key === key);
  if (!it) return items;
  it.qty = Math.max(1, Math.min(MAX_QTY, Math.round(qty) || 1));
  save(items);
  return items;
}

export function removeItem(key) {
  save(getCart().filter((i) => i.key !== key));
}

export function clearCart() {
  save([]);
}

export const count = (items = getCart()) => items.reduce((s, i) => s + i.qty, 0);
export const snapshotSubtotal = (items = getCart()) => items.reduce((s, i) => s + (Number.isInteger(i.price) ? i.price * i.qty : 0), 0);

export function payload(items = getCart()) {
  return items.map((i) => {
    const o = { slug: i.slug, qty: i.qty };
    if (i.variant) o.variant = i.variant;
    if (i.options && (i.options.packaging || i.options.message)) o.options = { packaging: i.options.packaging, message: i.options.message };
    return o;
  });
}

// Merge server info (name/image/price) back into the snapshot.
export function refreshSnapshot(products) {
  const items = getCart();
  let changed = false;
  for (const i of items) {
    const p = products[i.slug];
    if (!p) continue;
    const v = (p.variants || []).find((x) => x.id === i.variant);
    const price = v ? v.price : p.price;
    if (i.price !== price || i.name !== p.name || i.image !== p.image) {
      Object.assign(i, { price, name: p.name, image: p.image, pack: p.pack });
      changed = true;
    }
  }
  if (changed) save(items);
}

window.addEventListener("storage", (e) => {
  if (e.key === KEY) document.dispatchEvent(new CustomEvent("cart:change", { detail: { items: getCart() } }));
});

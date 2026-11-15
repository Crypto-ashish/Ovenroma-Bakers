// Reusable UI pieces: icons, product cards, badges, breadcrumbs, WhatsApp links.
import { html, raw, dataJson } from "./html.js";
import { rupees, thumbOf } from "../lib/util.js";

export const ICONS = {
  cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.6L5 3H2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="20" r="1.4" fill="currentColor"/><circle cx="17.5" cy="20" r="1.4" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.43 1.33-1.97 1.38-.5.05-.98.24-3.3-.69-2.8-1.1-4.56-3.95-4.7-4.13-.13-.18-1.12-1.49-1.12-2.84 0-1.35.71-2.02.96-2.29.25-.27.55-.34.73-.34h.52c.17 0 .4-.06.62.47.24.56.79 1.92.86 2.06.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.8.86-1.07.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.33Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19l7-7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  wheat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22V9M12 9c-2-1-3-3-3-5 2 0 3 1.5 3 3.5M12 9c2-1 3-3 3-5-2 0-3 1.5-3 3.5M12 14c-2-1-3.5-2.5-3.5-4.5 2 0 3.5 1.5 3.5 3.5M12 14c2-1 3.5-2.5 3.5-4.5-2 0-3.5 1.5-3.5 3.5M12 19c-2-1-3.5-2.5-3.5-4.5 2 0 3.5 1.5 3.5 3.5M12 19c2-1 3.5-2.5 3.5-4.5-2 0-3.5 1.5-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  oven: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="6" y="9" width="12" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 6.5h1M10 6.5h1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 6h11v10H2zM13 9h4.5L21 12.5V16h-8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="6" cy="17.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="17.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-4-5-1.5S10 8 12 8Zm0 0c1.5-3 5-4 5-1.5S14 8 12 8Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 5a3 3 0 0 1 0 6M18 14c2 .7 3.5 2.8 3.5 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
};
export const icon = (name, cls = "icon") => raw(`<span class="${cls}">${ICONS[name] || ""}</span>`);

export function waLink(number, text) {
  const digits = String(number || "").replace(/\D/g, "");
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
}

const TAG_LABELS = { "gluten-free": "Gluten-Free", eggless: "Eggless", gift: "Gift", bulk: "Bulk orders" };

export function vegMark() {
  return html`<span class="veg-mark" title="100% Vegetarian" aria-label="100% Vegetarian"><span></span></span>`;
}

export function badges(p, { max = 2 } = {}) {
  const out = [];
  if (!p.in_stock) out.push(html`<span class="badge badge-muted">Out of stock</span>`);
  if (p.featured) out.push(html`<span class="badge badge-gold">Best Seller</span>`);
  for (const t of p.tags || []) if (TAG_LABELS[t] && t !== "bulk" && t !== "gift") out.push(html`<span class="badge">${TAG_LABELS[t]}</span>`);
  return out.slice(0, max + (p.in_stock ? 0 : 1));
}

export function productImg(p, { sizes = "(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 280px", eager = false, cls = "" } = {}) {
  const src = p.image || "/assets/images/site/placeholder.webp";
  const thumb = thumbOf(src);
  const alt = `${p.name}${p.packaging ? " — " + p.packaging : ""}${p.weight ? " " + p.weight : ""} by Ovenroma Bakers`;
  return html`<img class="${cls}" src="${thumb}" srcset="${thumb} 400w, ${src} 800w" sizes="${sizes}" width="800" height="800" alt="${alt}" ${raw(eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"')}>`;
}

export function priceLabel(p) {
  const prices = p.variants && p.variants.length ? p.variants.map((v) => (v.price_paise ?? p.price_paise)).filter((x) => x !== null && x !== undefined) : p.price_paise !== null && p.price_paise !== undefined ? [p.price_paise] : [];
  if (!prices.length) return html`<span class="price price-request">Price on request</span>`;
  const min = Math.min(...prices);
  const from = p.variants && p.variants.length > 1 && prices.length > 1 && Math.max(...prices) !== min;
  return html`<span class="price">${from ? "From " : ""}${rupees(min)}${p.mrp_paise && p.mrp_paise > min ? html` <s class="mrp">${rupees(p.mrp_paise)}</s>` : ""}</span>`;
}

export const isBuyable = (p) =>
  p.in_stock &&
  (p.variants && p.variants.length
    ? p.variants.some((v) => (v.price_paise ?? p.price_paise) !== null && (v.price_paise ?? p.price_paise) !== undefined)
    : p.price_paise !== null && p.price_paise !== undefined);

// Client-side cart payload for a product (display snapshot only; the server
// re-prices everything at checkout).
export function cartData(p) {
  return {
    slug: p.slug,
    name: p.name,
    image: thumbOf(p.image),
    price: p.price_paise,
    pack: [p.packaging, p.weight].filter(Boolean).join(" • "),
    variants: (p.variants || []).map((v) => ({ id: v.id, label: v.label, price: v.price_paise ?? p.price_paise })),
    customisable: p.customisable,
  };
}

export function productCard(p, ctx, { headingLevel = 3 } = {}) {
  const url = "/product/" + p.slug;
  const buyable = isBuyable(p);
  const H = raw("h" + headingLevel);
  const enquiry = `Hello Ovenroma Bakers! I'd like to enquire about ${p.name}${p.weight ? " (" + p.weight + ")" : ""}. ${ctx.origin}${url}`;
  return html`<article class="product-card${p.in_stock ? "" : " is-oos"}" data-product="${p.slug}" data-category="${p.category}" data-tags="${(p.tags || []).join(" ")}" data-price="${p.price_paise ?? ""}" data-name="${p.name.toLowerCase()}" data-instock="${p.in_stock ? 1 : 0}" data-sort="${p.sort}">
    <a class="pc-media" href="${url}" tabindex="-1" aria-hidden="true">
      ${productImg(p)}
      <span class="pc-badges">${badges(p)}</span>
    </a>
    <div class="pc-body">
      <p class="pc-cat">${vegMark()} ${p.category_name || ""}</p>
      <${H} class="pc-title"><a href="${url}">${p.name}</a></${H}>
      <p class="pc-desc">${p.short}</p>
      ${p.packaging || p.weight ? html`<p class="pc-pack">${[p.packaging, p.weight].filter(Boolean).join(" • ")}</p>` : ""}
      <div class="pc-foot">
        ${priceLabel(p)}
        ${buyable
          ? html`<div class="pc-actions" data-cart-item="${raw(dataJson(cartData(p)))}">
              ${p.variants && p.variants.length
                ? html`<label class="sr-only" for="v-${p.slug}">Choose option for ${p.name}</label><select id="v-${p.slug}" class="pc-variant" data-variant>${p.variants.map((v) => html`<option value="${v.id}" ${(v.price_paise ?? p.price_paise) === null ? raw("disabled") : ""}>${v.label}${(v.price_paise ?? p.price_paise) !== null ? " — " + rupees(v.price_paise ?? p.price_paise) : " (on request)"}</option>`)}</select>`
                : ""}
              <div class="qty" data-qty><button type="button" class="qty-btn" data-dec aria-label="Decrease quantity">−</button><input type="number" inputmode="numeric" min="1" max="100" value="1" aria-label="Quantity of ${p.name}"><button type="button" class="qty-btn" data-inc aria-label="Increase quantity">+</button></div>
              <button type="button" class="btn btn-primary btn-sm" data-add-to-cart>${icon("cart")}<span>Add to Cart</span></button>
            </div>`
          : html`<div class="pc-actions">
              ${p.in_stock ? "" : html`<span class="oos-note">Currently unavailable</span>`}
              <a class="btn btn-wa btn-sm" href="${waLink(ctx.settings.store.whatsapp, enquiry)}" target="_blank" rel="noopener" data-wa-enquiry>${icon("whatsapp")}<span>Enquire on WhatsApp</span></a>
            </div>`}
      </div>
    </div>
  </article>`;
}

export function breadcrumbs(items) {
  return html`<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items.map((it, i) =>
    i === items.length - 1 ? html`<li aria-current="page">${it.name}</li>` : html`<li><a href="${it.url}">${it.name}</a></li>`
  )}</ol></nav>`;
}

export function breadcrumbLd(items, origin) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: origin + it.url })),
  };
}

export function sectionHead({ kicker, title, sub, id, center = true, level = 2 }) {
  const H = raw("h" + level);
  return html`<header class="section-head${center ? " center" : ""}">
    ${kicker ? html`<p class="kicker">${kicker}</p>` : ""}
    <${H} class="section-title"${id ? raw(` id="${id}"`) : ""}>${title}</${H}>
    ${sub ? html`<p class="section-sub">${sub}</p>` : ""}
  </header>`;
}

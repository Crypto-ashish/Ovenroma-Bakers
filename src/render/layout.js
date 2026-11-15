// Page shell: <head> SEO tags, header/navigation, cart drawer, footer.
import { html, raw, jsonLd } from "./html.js";
import { icon, waLink } from "./components.js";
import { jpgOf } from "../lib/util.js";

const NAV = [
  { name: "Shop", url: "/shop", children: true },
  { name: "Gluten-Free", url: "/gluten-free" },
  { name: "Langar & Bhandara", url: "/langar-bhandara-bulk-orders" },
  { name: "Festival Hampers", url: "/festival-hampers" },
  { name: "About", url: "/about" },
  { name: "Contact", url: "/contact" },
];

function logo() {
  return html`<a class="logo" href="/" aria-label="Ovenroma Bakers — home">
    <span class="logo-mark" aria-hidden="true">${raw('<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#3B2416"/><path d="M11 23c0-5 4-9 9-9s9 4 9 9" fill="none" stroke="#E8C98A" stroke-width="2.2" stroke-linecap="round"/><path d="M9 23h22" stroke="#E8C98A" stroke-width="2.2" stroke-linecap="round"/><path d="M15 12.5c0-2 1.5-2 1.5-4M20 11.5c0-2 1.5-2 1.5-4M25 12.5c0-2 1.5-2 1.5-4" fill="none" stroke="#C9A45C" stroke-width="1.6" stroke-linecap="round"/><text x="20" y="31.5" text-anchor="middle" font-family="Georgia,serif" font-size="7" fill="#E8C98A" letter-spacing="1">OB</text></svg>')}</span>
    <span class="logo-text"><span class="logo-name">Ovenroma</span><span class="logo-sub">Bakers</span></span>
  </a>`;
}

function header(ctx) {
  const path = ctx.url.pathname;
  const active = (url) => (url === "/" ? path === "/" : path === url || path.startsWith(url + "/") || (url === "/shop" && path.startsWith("/product/")));
  const cats = ctx.categories.filter((c) => c.slug !== "festival-hampers");
  return html`
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="announce" role="note"><div class="container announce-inner">
    <span>${icon("leaf")} 100% Vegetarian</span><span class="dot">•</span><span>Freshly Baked Every Day</span><span class="dot hide-sm">•</span><span class="hide-sm">Gluten-Free Range</span><span class="dot hide-sm">•</span><a class="hide-sm" href="/langar-bhandara-bulk-orders">Bulk orders for Langar &amp; Bhandara →</a>
  </div></div>
  <header class="site-header" data-header>
    <div class="container header-inner">
      <button class="icon-btn nav-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>${icon("menu")}</button>
      ${logo()}
      <nav class="site-nav" id="site-nav" aria-label="Main" data-nav>
        <div class="nav-panel-head">${logo()}<button class="icon-btn" type="button" aria-label="Close menu" data-nav-close>${icon("close")}</button></div>
        <ul class="nav-list">
          ${NAV.map((n) => html`<li class="${n.children ? "has-menu" : ""}">
            <a href="${n.url}" class="${active(n.url) ? "is-active" : ""}" ${active(n.url) ? raw('aria-current="page"') : ""}>${n.name}</a>
            ${n.children ? html`<ul class="submenu">
              <li><a href="/shop">All Products</a></li>
              ${cats.map((c) => html`<li><a href="/shop/${c.slug}">${c.name}</a></li>`)}
            </ul>` : ""}
          </li>`)}
        </ul>
        <a class="btn btn-wa nav-wa" href="${waLink(ctx.settings.store.whatsapp, "Hello Ovenroma Bakers! I'd like to place an order.")}" target="_blank" rel="noopener">${icon("whatsapp")}<span>Order on WhatsApp</span></a>
      </nav>
      <div class="header-actions">
        <a class="icon-btn cart-btn" href="/cart" aria-label="Cart" data-cart-open>${icon("cart")}<span class="cart-count" data-cart-count hidden>0</span></a>
      </div>
    </div>
  </header>
  <div class="nav-backdrop" data-nav-backdrop hidden></div>`;
}

function cartDrawer() {
  return html`<div class="drawer-backdrop" data-drawer-backdrop hidden></div>
  <aside class="cart-drawer" aria-label="Shopping cart" aria-hidden="true" data-drawer tabindex="-1">
    <div class="drawer-head"><h2>Your Cart</h2><button class="icon-btn" type="button" aria-label="Close cart" data-drawer-close>${icon("close")}</button></div>
    <div class="drawer-body" data-drawer-items></div>
    <div class="drawer-foot">
      <div class="drawer-total"><span>Subtotal</span><strong data-drawer-subtotal>₹0</strong></div>
      <p class="fine">Delivery charges (if any) are calculated at checkout.</p>
      <div class="drawer-ctas"><a class="btn btn-ghost" href="/cart">View Cart</a><a class="btn btn-primary" href="/checkout">Checkout</a></div>
    </div>
  </aside>`;
}

function footer(ctx) {
  const s = ctx.settings.store;
  const cats = ctx.categories;
  const year = new Date().getUTCFullYear();
  return html`<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        ${logo()}
        <p class="footer-tag">${s.tagline}</p>
        <p class="footer-copy">100% vegetarian biscuits, muffins, kulchas and savouries — with a dedicated gluten-free range and affordable bulk orders for every celebration.</p>
        <a class="btn btn-wa btn-sm" href="${waLink(s.whatsapp, "Hello Ovenroma Bakers!")}" target="_blank" rel="noopener">${icon("whatsapp")}<span>Chat on WhatsApp</span></a>
      </div>
      <div><h2 class="footer-h">Shop</h2><ul class="footer-links">
        <li><a href="/shop">All Products</a></li>
        ${cats.map((c) => html`<li><a href="${c.slug === "festival-hampers" ? "/festival-hampers" : "/shop/" + c.slug}">${c.name}</a></li>`)}
        <li><a href="/gluten-free">Gluten-Free Range</a></li>
      </ul></div>
      <div><h2 class="footer-h">Ovenroma</h2><ul class="footer-links">
        <li><a href="/langar-bhandara-bulk-orders">Langar &amp; Bhandara Orders</a></li>
        <li><a href="/festival-hampers#corporate-gifting">Corporate Gifting</a></li>
        <li><a href="/about">About Us</a></li>
        <li><a href="/contact">Contact Us</a></li>
        <li><a href="/cart">Cart</a></li>
      </ul></div>
      <div><h2 class="footer-h">Policies</h2><ul class="footer-links">
        <li><a href="/shipping-policy">Shipping Policy</a></li>
        <li><a href="/refund-policy">Refund Policy</a></li>
        <li><a href="/privacy-policy">Privacy Policy</a></li>
        <li><a href="/terms">Terms &amp; Conditions</a></li>
      </ul>
      ${s.phone || s.email || s.address ? html`<h2 class="footer-h mt">Reach us</h2><ul class="footer-links">
        ${s.phone ? html`<li><a href="tel:${s.phone.replace(/[^\d+]/g, "")}">${s.phone}</a></li>` : ""}
        ${s.email ? html`<li><a href="mailto:${s.email}">${s.email}</a></li>` : ""}
        ${s.address ? html`<li>${s.address}${s.city ? ", " + s.city : ""}</li>` : ""}
      </ul>` : ""}
      </div>
    </div>
    <div class="container footer-bottom"><p>© ${year} Ovenroma Bakers. All rights reserved.</p><p>Secure payments by Razorpay • 100% Vegetarian</p></div>
  </footer>
  <a class="wa-float" href="${waLink(s.whatsapp, "Hello Ovenroma Bakers! I'd like to place an order.")}" target="_blank" rel="noopener" aria-label="Order on WhatsApp">${icon("whatsapp")}</a>
  <div class="toast-wrap" aria-live="polite" data-toasts></div>`;
}

/**
 * @param ctx   request context { url, origin, settings, categories, assetV }
 * @param page  { title, description, path, image, body, jsonLd[], scripts[], noindex, bodyClass, status }
 */
export function layout(ctx, page) {
  const canonical = ctx.origin + (page.path ?? ctx.url.pathname);
  const image = page.image ? (page.image.startsWith("http") ? page.image : ctx.origin + jpgOf(page.image)) : ctx.origin + "/assets/images/site/og-default.jpg";
  const v = ctx.assetV;
  const store = ctx.settings.store;
  const ld = [...(page.jsonLd || [])];
  return "<!doctype html>" + html`<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
${page.noindex ? raw('<meta name="robots" content="noindex, nofollow">') : html`<link rel="canonical" href="${canonical}">`}
<meta name="theme-color" content="#3B2416">
<meta property="og:type" content="${page.ogType || "website"}">
<meta property="og:site_name" content="Ovenroma Bakers">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${page.title}">
<meta name="twitter:description" content="${page.description}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/dm-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
${page.preload ? html`<link rel="preload" as="image" href="${page.preload}" fetchpriority="high">` : ""}
<link rel="stylesheet" href="/assets/css/style.css?v=${v}">
${ld.map((o) => jsonLd(o))}
</head>
<body class="${page.bodyClass || ""}" data-wa="${(store.whatsapp || "").replace(/\D/g, "")}">
${header(ctx)}
<main id="main" tabindex="-1">${page.body}</main>
${footer(ctx)}
${cartDrawer()}
<script type="module" src="/assets/js/main.js?v=${v}"></script>
${(page.scripts || []).map((s) => html`<script type="module" src="${s}?v=${v}"></script>`)}
</body>
</html>`;
}

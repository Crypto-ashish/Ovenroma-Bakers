// Cloudflare Worker entry: security headers, routing, server-rendered pages,
// JSON APIs, sitemap/robots. Static files come from ./public (ASSETS).
import { json, HttpError, UserError, esc } from "./lib/util.js";
import { getSettings, listCategories, listProducts, getCategory, getProduct, listTestimonials, listBanners } from "./lib/db.js";
import { requireAdmin } from "./lib/auth.js";
import { layout } from "./render/layout.js";
import * as pages from "./render/pages.js";
import { bulkPage, hampersPage } from "./render/special.js";
import * as pub from "./api/public.js";
import * as admin from "./api/admin.js";

// ---------------------------------------------------------------- security headers
// No inline scripts or event handlers anywhere, so script-src stays strict.
// Inline style attributes are used, hence 'unsafe-inline' for styles only.
// Razorpay Checkout needs its script, frames and API.
function cspFor(env) {
  return [
    "default-src 'self'",
    "script-src 'self' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' https://*.razorpay.com",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const BASE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), usb=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

function secure(res, url, env, { html = false, cache = null, noindex = false } = {}) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(BASE_HEADERS)) out.headers.set(k, v);
  if (url.protocol === "https:") out.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (html) out.headers.set("Content-Security-Policy", cspFor(env));
  if (cache) out.headers.set("Cache-Control", cache);
  if (noindex) out.headers.set("X-Robots-Tag", "noindex");
  return out;
}

function assetCache(path, search) {
  if (path.startsWith("/assets/fonts/")) return "public, max-age=31536000, immutable";
  if (/^\/assets\/(css|js)\//.test(path) && /[?&]v=\w+/.test(search)) return "public, max-age=31536000, immutable";
  if (path.startsWith("/assets/images/")) return "public, max-age=2592000, stale-while-revalidate=86400";
  if (path.startsWith("/assets/")) return "public, max-age=300, stale-while-revalidate=86400";
  return "public, max-age=86400";
}

// ---------------------------------------------------------------- page context
async function makeCtx(env, url, request) {
  const [settings, categories] = await Promise.all([getSettings(env), listCategories(env)]);
  const origin = (env.SITE_URL || "").replace(/\/+$/, "") || url.origin;
  const assetV = (env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id ? env.CF_VERSION_METADATA.id : env.ASSET_VERSION || "dev").slice(0, 12);
  const introSeen = /(?:^|;\s*)ovr_intro=1(?:;|$)/.test((request && request.headers.get("Cookie")) || "");
  return { env, url, settings, categories, origin, assetV, introSeen };
}

function htmlResponse(ctx, page, status = 200) {
  return new Response(layout(ctx, page), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": page.noindex ? "no-store" : "public, max-age=0, must-revalidate" },
  });
}

async function notFound(ctx) {
  return htmlResponse(ctx, pages.notFoundPage(), 404);
}

// ---------------------------------------------------------------- SSR routes
async function renderPage(env, url, request) {
  const ctx = await makeCtx(env, url, request);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/") {
    const [all, hampers, testimonials, heroes, promos] = await Promise.all([
      listProducts(env, { excludeHampers: true }),
      listProducts(env, { category: "festival-hampers" }),
      listTestimonials(env),
      listBanners(env, "hero"),
      listBanners(env, "promo"),
    ]);
    const featured = all.filter((p) => p.featured).slice(0, 8);
    const count = (cat) => all.filter((p) => p.category === cat).length;
    const stats = { products: all.length + hampers.length, cookies: count("biscuits-cookies"), flours: count("gluten-free-flours"), hampers: hampers.length };
    return htmlResponse(ctx, pages.homePage(ctx, { featured, hampers, testimonials, heroBanner: heroes[0], promo: promos[0], stats }));
  }
  if (path === "/shop") {
    const products = await listProducts(env, { excludeHampers: true });
    return htmlResponse(ctx, pages.shopPage(ctx, { products, categories: ctx.categories }));
  }
  let m = path.match(/^\/shop\/([a-z0-9-]{1,80})$/);
  if (m) {
    if (m[1] === "festival-hampers") return Response.redirect(ctx.origin + "/festival-hampers", 301);
    const category = await getCategory(env, m[1]);
    if (!category) return notFound(ctx);
    const products = await listProducts(env, { category: category.slug });
    return htmlResponse(ctx, pages.categoryPage(ctx, { category, products, categories: ctx.categories }));
  }
  m = path.match(/^\/product\/([a-z0-9-]{1,80})$/);
  if (m) {
    const product = await getProduct(env, m[1]);
    if (!product) return notFound(ctx);
    const siblings = await listProducts(env, { category: product.category });
    const related = siblings.filter((p) => p.slug !== product.slug).slice(0, 4);
    return htmlResponse(ctx, pages.productPage(ctx, { product, related }));
  }
  if (path === "/gluten-free") {
    const products = await listProducts(env, { tag: "gluten-free", excludeHampers: true });
    return htmlResponse(ctx, pages.glutenFreePage(ctx, { products, categories: ctx.categories }));
  }
  if (path === "/langar-bhandara-bulk-orders") return htmlResponse(ctx, bulkPage(ctx));
  if (path === "/festival-hampers") {
    const [hampers, products] = await Promise.all([listProducts(env, { category: "festival-hampers" }), listProducts(env, { excludeHampers: true })]);
    return htmlResponse(ctx, hampersPage(ctx, { hampers, products }));
  }
  if (path === "/about") return htmlResponse(ctx, pages.aboutPage(ctx));
  if (path === "/contact") return htmlResponse(ctx, pages.contactPage(ctx));
  if (path === "/cart") return htmlResponse(ctx, pages.cartPage(ctx));
  if (path === "/checkout") return htmlResponse(ctx, pages.checkoutPage(ctx, { paymentsReady: pub.paymentsConfigured(env) }));
  m = path.match(/^\/order\/(OVR-[A-Z0-9]{4,12}-[A-Z0-9]{12})$/);
  if (m) {
    const order = await env.DB.prepare("SELECT * FROM orders WHERE ref = ?1").bind(m[1]).first();
    if (!order) return notFound(ctx);
    return htmlResponse(ctx, pages.orderPage(ctx, { order }));
  }
  const policyKey = path.slice(1);
  if (pages.POLICY_KEYS.includes(policyKey)) return htmlResponse(ctx, pages.policyPage(ctx, policyKey));
  if (path === "/admin") return adminShell(ctx);
  return notFound(ctx);
}

function adminShell(ctx) {
  const v = esc(ctx.assetV);
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin — Ovenroma Bakers</title><meta name="robots" content="noindex, nofollow"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/admin.css?v=${v}"></head>
<body><div id="admin" class="admin-root"><p class="admin-loading">Loading admin…</p></div>
<script type="module" src="/assets/js/admin.js?v=${v}"></script></body></html>`;
  return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// ---------------------------------------------------------------- sitemap & robots
async function sitemap(env, url) {
  const origin = (env.SITE_URL || "").replace(/\/+$/, "") || url.origin;
  const [categories, products] = await Promise.all([listCategories(env), listProducts(env)]);
  const entries = [
    ["/", "1.0", "daily"], ["/shop", "0.9", "daily"], ["/gluten-free", "0.8", "weekly"],
    ["/langar-bhandara-bulk-orders", "0.9", "weekly"], ["/festival-hampers", "0.9", "weekly"],
    ["/about", "0.5", "monthly"], ["/contact", "0.5", "monthly"],
    ...pages.POLICY_KEYS.map((k) => ["/" + k, "0.2", "yearly"]),
    ...categories.filter((c) => c.slug !== "festival-hampers").map((c) => ["/shop/" + c.slug, "0.8", "weekly"]),
  ].map(([loc, priority, freq]) => `<url><loc>${esc(origin + loc)}</loc><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`);
  for (const p of products) {
    const img = p.image ? `<image:image><image:loc>${esc(origin + p.image)}</image:loc><image:title>${esc(p.name)}</image:title></image:image>` : "";
    const lastmod = /^\d{4}-\d{2}-\d{2}/.test(p.updated_at || "") ? `<lastmod>${p.updated_at.slice(0, 10)}</lastmod>` : "";
    entries.push(`<url><loc>${esc(origin + "/product/" + p.slug)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.7</priority>${img}</url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

function robots(env, url) {
  const origin = (env.SITE_URL || "").replace(/\/+$/, "") || url.origin;
  const txt = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /cart\nDisallow: /checkout\nDisallow: /order/\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}

// ---------------------------------------------------------------- API routing
function sameOrigin(request, url) {
  const origin = request.headers.get("Origin");
  if (!origin) return request.headers.get("Sec-Fetch-Site") !== "cross-site";
  try {
    return new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

async function rateLimited(env, request, bucket) {
  const limiter = env.API_LIMITER;
  if (!limiter || typeof limiter.limit !== "function") return false;
  try {
    const { success } = await limiter.limit({ key: bucket + ":" + (request.headers.get("CF-Connecting-IP") || "local") });
    return !success;
  } catch {
    return false;
  }
}

const PUBLIC_POST = {
  "/api/cart/quote": { fn: pub.cartQuote, limit: false },
  "/api/checkout/create-order": { fn: pub.createOrder, limit: true },
  "/api/checkout/verify": { fn: pub.verifyPayment, limit: true },
  "/api/checkout/failed": { fn: pub.paymentFailed, limit: true },
  "/api/checkout/whatsapp": { fn: pub.whatsappOrder, limit: true },
  "/api/enquiries": { fn: pub.createEnquiry, limit: true },
};

async function adminRoute(request, env, url) {
  const p = url.pathname.slice("/api/admin".length);
  const method = request.method;
  if (p === "/login" && method === "POST") {
    if (await rateLimited(env, request, "login")) return json(429, { error: "Too many requests. Please wait a minute." }, { "Retry-After": "60" });
    return admin.login(request, env);
  }
  if (p === "/session" && method === "GET") return admin.session(request, env);

  // Authentication + CSRF middleware: runs before every other admin handler.
  await requireAdmin(env, request);

  if (p === "/logout" && method === "POST") return admin.logout(request, env);
  if (p === "/dashboard" && method === "GET") return admin.dashboard(request, env);
  if (p === "/products") {
    if (method === "GET") return admin.listProductsAdmin(request, env);
    if (method === "POST") return admin.createProduct(request, env);
  }
  let m = p.match(/^\/products\/(\d{1,9})$/);
  if (m) {
    const id = Number(m[1]);
    if (method === "PUT") return admin.updateProduct(request, env, id);
    if (method === "PATCH") return admin.patchProduct(request, env, id);
    if (method === "DELETE") return admin.deleteProduct(request, env, id);
  }
  if (p === "/categories" && method === "POST") return admin.createCategory(request, env);
  m = p.match(/^\/categories\/([a-z0-9-]{1,80})$/);
  if (m) {
    if (method === "PUT") return admin.updateCategory(request, env, m[1]);
    if (method === "DELETE") return admin.deleteCategory(request, env, m[1]);
  }
  if (p === "/orders" && method === "GET") return admin.listOrders(request, env, url);
  m = p.match(/^\/orders\/(\d{1,9})$/);
  if (m && method === "PATCH") return admin.updateOrder(request, env, Number(m[1]));
  if (p === "/enquiries" && method === "GET") return admin.listEnquiries(request, env, url);
  m = p.match(/^\/enquiries\/(\d{1,9})$/);
  if (m) {
    if (method === "PATCH") return admin.updateEnquiry(request, env, Number(m[1]));
    if (method === "DELETE") return admin.deleteEnquiry(request, env, Number(m[1]));
  }
  m = p.match(/^\/(testimonials|banners)(?:\/(\d{1,9}))?$/);
  if (m) {
    const [, table, id] = m;
    if (!id && method === "GET") return admin.listRows(request, env, table);
    if (!id && method === "POST") return admin.createRow(request, env, table);
    if (id && method === "PUT") return admin.updateRow(request, env, table, Number(id));
    if (id && method === "DELETE") return admin.deleteRow(request, env, table, Number(id));
  }
  if (p === "/settings" && method === "GET") return admin.getAllSettings(request, env);
  m = p.match(/^\/settings\/([a-z]{2,20})$/);
  if (m && method === "PUT") return admin.putSettings(request, env, m[1]);
  throw new HttpError(404, "Not found");
}

async function handleApi(request, env, url) {
  try {
    if (url.pathname === "/api/health") {
      return json(200, { ok: true, payments_configured: pub.paymentsConfigured(env) });
    }
    if (url.pathname === "/api/razorpay-webhook") {
      if (request.method !== "POST") return json(405, { error: "Method not allowed" }, { Allow: "POST" });
      return await pub.razorpayWebhook(request, env);
    }
    if (request.method !== "GET" && !sameOrigin(request, url)) return json(403, { error: "Forbidden" });
    if (url.pathname.startsWith("/api/admin/")) return await adminRoute(request, env, url);
    const route = PUBLIC_POST[url.pathname];
    if (!route) return json(404, { error: "Not found" });
    if (request.method !== "POST") return json(405, { error: "Method not allowed" }, { Allow: "POST" });
    if (route.limit && (await rateLimited(env, request, url.pathname))) {
      return json(429, { error: "Too many requests. Please wait a minute and try again." }, { "Retry-After": "60" });
    }
    return await route.fn(request, env);
  } catch (e) {
    if (e instanceof UserError) return json(400, { error: e.message });
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    console.error("api error", url.pathname, e && e.stack);
    return json(500, { error: "Something went wrong. Please try again." });
  }
}

// ---------------------------------------------------------------- entry
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return secure(await handleApi(request, env, url), url, env, { noindex: true });
      if (url.pathname === "/sitemap.xml") return secure(await sitemap(env, url), url, env);
      if (url.pathname === "/robots.txt") return secure(robots(env, url), url, env);

      // Static files (anything with an extension) come from ./public.
      if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) {
        const res = await env.ASSETS.fetch(request);
        return secure(res, url, env, { cache: res.status === 200 ? assetCache(url.pathname, url.search) : null });
      }
      if (request.method !== "GET" && request.method !== "HEAD") return secure(new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } }), url, env);
      // Canonical URLs have no trailing slash.
      if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
        return Response.redirect(url.origin + url.pathname.replace(/\/+$/, "") + url.search, 301);
      }
      const res = await renderPage(env, url, request);
      const noindex = url.pathname === "/admin" || res.status === 404;
      return secure(res, url, env, { html: true, noindex });
    } catch (e) {
      console.error("page error", url.pathname, e && e.stack);
      return secure(new Response("<!doctype html><title>Something went wrong</title><p style=\"font-family:sans-serif;padding:2rem\">Something went wrong. Please refresh the page.</p>", { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }), url, env, { html: true });
    }
  },
};

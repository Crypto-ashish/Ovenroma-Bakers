// Admin API. Every route here runs AFTER requireAdmin() (see index.js):
// unauthenticated → 401, missing/invalid CSRF token on writes → 403.
import { json, readJson, cleanText, cleanEmail, UserError, HttpError, slugify, parseJson } from "../lib/util.js";
import { getSettings, putSetting, listCategories, listProducts, normaliseProduct } from "../lib/db.js";
import {
  verifyPassword, createSession, destroySession, getSession, loginThrottled, recordFailedLogin, clearFailedLogins, sessionCookie,
} from "../lib/auth.js";
import { DEFAULT_SEO } from "../lib/seo-defaults.js";
import { rzpKeyId, rzpSecret, rzpAuthHeader, razorpayBase } from "./public.js";

const ORDER_STATUSES = ["created", "paid", "failed", "whatsapp", "cancelled", "fulfilled"];
const ENQUIRY_STATUSES = ["new", "contacted", "confirmed", "closed"];
const TAGS = ["veg", "eggless", "gluten-free", "gift", "bulk"];
const OCCASION_IDS = ["", "diwali", "christmas", "new-year", "rakhi", "wedding", "corporate", "birthday", "custom"];

// ------------------------------------------------------------------ auth
export async function login(request, env) {
  if (!env.ADMIN_PASSWORD_HASH) return json(503, { error: "Admin login is not configured. Set the ADMIN_PASSWORD_HASH secret." });
  if (await loginThrottled(env, request)) {
    return json(429, { error: "Too many failed attempts. Please wait 15 minutes and try again." }, { "Retry-After": "900" });
  }
  const body = await readJson(request, 2048);
  const username = typeof body.username === "string" ? body.username.slice(0, 80) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  const expectedUser = env.ADMIN_USERNAME || "admin";
  // Always run the hash so timing doesn't reveal whether the username matched.
  const okPass = verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!okPass || username !== expectedUser) {
    await recordFailedLogin(env, request);
    return json(401, { error: "Incorrect username or password" });
  }
  await clearFailedLogins(env, request);
  const s = await createSession(env);
  return json(200, { ok: true, csrf: s.csrf }, { "Set-Cookie": s.cookie });
}

export async function logout(request, env) {
  await destroySession(env, request);
  return json(200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
}

export async function session(request, env) {
  const s = await getSession(env, request);
  if (!s) return json(401, { error: "Please sign in" });
  return json(200, { ok: true, csrf: s.csrf });
}

// ------------------------------------------------------------------ helpers
const rupeesToPaise = (v, label, { required = false, allowZero = false } = {}) => {
  if (v === "" || v === null || v === undefined) {
    if (required) throw new UserError("Please enter " + label);
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 10000000) throw new UserError("Please enter a valid amount for " + label);
  return Math.round(n * 100);
};

// Photos live in the GitHub repo under public/assets/images/ (no uploads).
function cleanImageUrl(v, env, label = "image") {
  const t = cleanText(v, { max: 300, label });
  if (!t) return "";
  if (/^\/assets\/images\/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$/i.test(t) && !t.includes("..")) return t;
  throw new UserError("The " + label + " must be a photo from the library (a /assets/images/… path)");
}

const bool = (v) => (v === true || v === 1 || v === "1" || v === "on" ? 1 : 0);
const int = (v, d = 0) => (Number.isInteger(Number(v)) ? Number(v) : d);
const strList = (v, { max = 20, len = 120, label }) =>
  (Array.isArray(v) ? v : []).slice(0, max).map((x) => cleanText(x, { max: len, label })).filter(Boolean);

// ------------------------------------------------------------------ dashboard
export async function dashboard(request, env) {
  const [orders, enquiries, products, recentOrders, recentEnquiries] = await env.DB.batch([
    env.DB.prepare("SELECT status, COUNT(*) AS n, COALESCE(SUM(total_paise),0) AS total FROM orders GROUP BY status"),
    env.DB.prepare("SELECT status, COUNT(*) AS n FROM enquiries GROUP BY status"),
    env.DB.prepare("SELECT COUNT(*) AS n, SUM(CASE WHEN price_paise IS NULL AND variants = '[]' THEN 1 ELSE 0 END) AS unpriced, SUM(CASE WHEN in_stock = 0 THEN 1 ELSE 0 END) AS oos FROM products WHERE active = 1"),
    env.DB.prepare("SELECT id, ref, status, customer_name, total_paise, created_at FROM orders ORDER BY id DESC LIMIT 6"),
    env.DB.prepare("SELECT id, type, name, status, total_paise, created_at FROM enquiries ORDER BY id DESC LIMIT 6"),
  ]);
  const settings = await getSettings(env);
  return json(200, {
    orders: orders.results,
    enquiries: enquiries.results,
    products: products.results[0],
    recentOrders: recentOrders.results,
    recentEnquiries: recentEnquiries.results,
    warnings: [
      !settings.store.whatsapp && "WhatsApp number is not set — WhatsApp buttons open WhatsApp without a recipient. Set it in Settings.",
      !(rzpKeyId(env) && rzpSecret(env)) && "Razorpay keys are not configured — online payment is disabled (WhatsApp ordering still works).",
      rzpKeyId(env).startsWith("rzp_test_") && "Razorpay is in TEST mode — no real money is collected.",
    ].filter(Boolean),
  });
}

// ------------------------------------------------------------------ products
function productInput(b, env) {
  const name = cleanText(b.name, { min: 2, max: 120, required: true, label: "the product name" });
  const slug = slugify(b.slug || name);
  if (!slug) throw new UserError("Please enter a valid URL slug");
  const variants = (Array.isArray(b.variants) ? b.variants : []).slice(0, 20).map((v, i) => {
    const label = cleanText(v && v.label, { min: 1, max: 60, required: true, label: "the option name" });
    return { id: slugify((v && v.id) || label) || "opt-" + (i + 1), label, price_paise: rupeesToPaise(v && v.price, "option " + label) };
  });
  if (new Set(variants.map((v) => v.id)).size !== variants.length) throw new UserError("Each option needs a different name");
  const occasion = typeof b.occasion === "string" ? b.occasion : "";
  if (!OCCASION_IDS.includes(occasion)) throw new UserError("Unknown hamper occasion");
  const price = rupeesToPaise(b.price, "the price");
  const mrp = rupeesToPaise(b.mrp, "the MRP");
  return {
    slug, name,
    category: cleanText(b.category, { required: true, max: 80, label: "a category" }),
    short: cleanText(b.short, { max: 300, label: "the short description" }),
    description: cleanText(b.description, { max: 3000, label: "the description", multiline: true }),
    packaging: cleanText(b.packaging, { max: 80, label: "packaging" }),
    weight: cleanText(b.weight, { max: 60, label: "weight / pack size" }),
    price_paise: price,
    mrp_paise: mrp && price && mrp > price ? mrp : null,
    image: cleanImageUrl(b.image, env),
    gallery: JSON.stringify((Array.isArray(b.gallery) ? b.gallery : []).slice(0, 8).map((g) => cleanImageUrl(g, env, "gallery image")).filter(Boolean)),
    tags: JSON.stringify((Array.isArray(b.tags) ? b.tags : []).filter((t) => TAGS.includes(t))),
    variants: JSON.stringify(variants),
    includes: JSON.stringify(strList(b.includes, { max: 20, len: 120, label: "an included item" })),
    occasion,
    customisable: bool(b.customisable),
    bulk_note: cleanText(b.bulk_note, { max: 160, label: "the bulk note" }),
    in_stock: bool(b.in_stock),
    featured: bool(b.featured),
    active: bool(b.active),
    sort: int(b.sort),
    seo_title: cleanText(b.seo_title, { max: 120, label: "the SEO title" }),
    seo_description: cleanText(b.seo_description, { max: 320, label: "the SEO description" }),
  };
}

export async function listProductsAdmin(request, env) {
  return json(200, { products: await listProducts(env, { includeInactive: true }), categories: await listCategories(env, { includeInactive: true }) });
}

async function assertCategory(env, slug) {
  const c = await env.DB.prepare("SELECT slug FROM categories WHERE slug = ?1").bind(slug).first();
  if (!c) throw new UserError("Please choose a valid category");
}

export async function createProduct(request, env) {
  const p = productInput(await readJson(request, 32 * 1024), env);
  await assertCategory(env, p.category);
  const exists = await env.DB.prepare("SELECT id FROM products WHERE slug = ?1").bind(p.slug).first();
  if (exists) throw new UserError("Another product already uses the URL /product/" + p.slug);
  const cols = Object.keys(p);
  const res = await env.DB.prepare(`INSERT INTO products (${cols.join(", ")}) VALUES (${cols.map((_, i) => "?" + (i + 1)).join(", ")})`)
    .bind(...Object.values(p)).run();
  return json(201, { ok: true, id: res.meta.last_row_id });
}

export async function updateProduct(request, env, id) {
  const p = productInput(await readJson(request, 32 * 1024), env);
  await assertCategory(env, p.category);
  const clash = await env.DB.prepare("SELECT id FROM products WHERE slug = ?1 AND id <> ?2").bind(p.slug, id).first();
  if (clash) throw new UserError("Another product already uses the URL /product/" + p.slug);
  const cols = Object.keys(p);
  const res = await env.DB.prepare(`UPDATE products SET ${cols.map((c, i) => c + " = ?" + (i + 1)).join(", ")}, updated_at = datetime('now') WHERE id = ?${cols.length + 1}`)
    .bind(...Object.values(p), id).run();
  if (!res.meta.changes) throw new HttpError(404, "Product not found");
  return json(200, { ok: true });
}

// Quick inline edits from the product table: price / stock / featured / active.
export async function patchProduct(request, env, id) {
  const b = await readJson(request);
  const sets = [];
  const args = [];
  if ("price" in b) { args.push(rupeesToPaise(b.price, "the price")); sets.push("price_paise = ?" + args.length); }
  for (const k of ["in_stock", "featured", "active"]) if (k in b) { args.push(bool(b[k])); sets.push(k + " = ?" + args.length); }
  if (!sets.length) throw new UserError("Nothing to update");
  args.push(id);
  const res = await env.DB.prepare(`UPDATE products SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?${args.length}`).bind(...args).run();
  if (!res.meta.changes) throw new HttpError(404, "Product not found");
  const row = await env.DB.prepare("SELECT * FROM products WHERE id = ?1").bind(id).first();
  return json(200, { ok: true, product: normaliseProduct(row) });
}

export async function deleteProduct(request, env, id) {
  const res = await env.DB.prepare("DELETE FROM products WHERE id = ?1").bind(id).run();
  if (!res.meta.changes) throw new HttpError(404, "Product not found");
  return json(200, { ok: true });
}

// ------------------------------------------------------------------ categories
function categoryInput(b, env) {
  const name = cleanText(b.name, { min: 2, max: 80, required: true, label: "the category name" });
  return {
    slug: slugify(b.slug || name),
    name,
    blurb: cleanText(b.blurb, { max: 160, label: "the short blurb" }),
    description: cleanText(b.description, { max: 1000, label: "the description", multiline: true }),
    image: cleanImageUrl(b.image, env),
    seo_title: cleanText(b.seo_title, { max: 120, label: "the SEO title" }),
    seo_description: cleanText(b.seo_description, { max: 320, label: "the SEO description" }),
    sort: int(b.sort),
    active: bool(b.active),
  };
}

export async function createCategory(request, env) {
  const c = categoryInput(await readJson(request), env);
  if (!c.slug) throw new UserError("Please enter a valid URL slug");
  const exists = await env.DB.prepare("SELECT slug FROM categories WHERE slug = ?1").bind(c.slug).first();
  if (exists) throw new UserError("A category with this URL already exists");
  const cols = Object.keys(c);
  await env.DB.prepare(`INSERT INTO categories (${cols.join(", ")}) VALUES (${cols.map((_, i) => "?" + (i + 1)).join(", ")})`).bind(...Object.values(c)).run();
  return json(201, { ok: true, slug: c.slug });
}

export async function updateCategory(request, env, slug) {
  const c = categoryInput(await readJson(request), env);
  delete c.slug; // slugs are stable: they are public URLs
  const cols = Object.keys(c);
  const res = await env.DB.prepare(`UPDATE categories SET ${cols.map((k, i) => k + " = ?" + (i + 1)).join(", ")} WHERE slug = ?${cols.length + 1}`)
    .bind(...Object.values(c), slug).run();
  if (!res.meta.changes) throw new HttpError(404, "Category not found");
  return json(200, { ok: true });
}

export async function deleteCategory(request, env, slug) {
  const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM products WHERE category = ?1").bind(slug).first();
  if (used && used.n > 0) throw new UserError("Move or delete the " + used.n + " product(s) in this category first");
  if (slug === "festival-hampers") throw new UserError("The Festival Hampers category is required by the hampers page");
  const res = await env.DB.prepare("DELETE FROM categories WHERE slug = ?1").bind(slug).run();
  if (!res.meta.changes) throw new HttpError(404, "Category not found");
  return json(200, { ok: true });
}

// ------------------------------------------------------------------ orders & enquiries
function paging(url) {
  const limit = Math.min(100, Math.max(1, int(url.searchParams.get("limit"), 50)));
  const offset = Math.max(0, int(url.searchParams.get("offset"), 0));
  return { limit, offset };
}

export async function listOrders(request, env, url) {
  const { limit, offset } = paging(url);
  const status = url.searchParams.get("status") || "";
  const q = (url.searchParams.get("q") || "").slice(0, 60);
  const where = [];
  const args = [];
  if (ORDER_STATUSES.includes(status)) { args.push(status); where.push("status = ?" + args.length); }
  if (q) { args.push("%" + q + "%"); where.push(`(ref LIKE ?${args.length} OR customer_name LIKE ?${args.length} OR phone LIKE ?${args.length})`); }
  args.push(limit, offset);
  const { results } = await env.DB.prepare(
    `SELECT * FROM orders ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT ?${args.length - 1} OFFSET ?${args.length}`
  ).bind(...args).all();
  return json(200, { orders: results.map((o) => ({ ...o, items: parseJson(o.items, []) })) });
}

export async function updateOrder(request, env, id) {
  const b = await readJson(request);
  if (!ORDER_STATUSES.includes(b.status)) throw new UserError("Unknown status");
  const res = await env.DB.prepare("UPDATE orders SET status = ?1 WHERE id = ?2").bind(b.status, id).run();
  if (!res.meta.changes) throw new HttpError(404, "Order not found");
  return json(200, { ok: true });
}

export async function listEnquiries(request, env, url) {
  const { limit, offset } = paging(url);
  const type = url.searchParams.get("type") || "";
  const args = [];
  let where = "";
  if (/^[a-z-]{2,20}$/.test(type)) { args.push(type); where = "WHERE type = ?1"; }
  args.push(limit, offset);
  const { results } = await env.DB.prepare(`SELECT * FROM enquiries ${where} ORDER BY id DESC LIMIT ?${args.length - 1} OFFSET ?${args.length}`).bind(...args).all();
  return json(200, { enquiries: results.map((e) => ({ ...e, payload: parseJson(e.payload, {}) })) });
}

export async function updateEnquiry(request, env, id) {
  const b = await readJson(request);
  if (!ENQUIRY_STATUSES.includes(b.status)) throw new UserError("Unknown status");
  const res = await env.DB.prepare("UPDATE enquiries SET status = ?1 WHERE id = ?2").bind(b.status, id).run();
  if (!res.meta.changes) throw new HttpError(404, "Enquiry not found");
  return json(200, { ok: true });
}

export async function deleteEnquiry(request, env, id) {
  const res = await env.DB.prepare("DELETE FROM enquiries WHERE id = ?1").bind(id).run();
  if (!res.meta.changes) throw new HttpError(404, "Enquiry not found");
  return json(200, { ok: true });
}

// ------------------------------------------------------------------ testimonials & banners
const TABLES = {
  testimonials: (b) => ({
    name: cleanText(b.name, { min: 2, max: 80, required: true, label: "the customer name" }),
    location: cleanText(b.location, { max: 80, label: "location" }),
    text: cleanText(b.text, { min: 5, max: 600, required: true, label: "the testimonial", multiline: true }),
    rating: Math.max(1, Math.min(5, int(b.rating, 5))),
    active: bool(b.active),
    sort: int(b.sort),
  }),
  banners: (b, env) => {
    const placement = b.placement === "hero" ? "hero" : "promo";
    const cta = cleanText(b.cta_url, { max: 200, label: "the button link" });
    if (cta && !/^\/[A-Za-z0-9/_#?=&.-]*$/.test(cta)) throw new UserError("Button links must be site paths starting with /");
    return {
      placement,
      title: cleanText(b.title, { min: 2, max: 120, required: true, label: "the banner title" }),
      subtitle: cleanText(b.subtitle, { max: 300, label: "the subtitle" }),
      image: cleanImageUrl(b.image, env),
      cta_label: cleanText(b.cta_label, { max: 40, label: "the button label" }),
      cta_url: cta,
      active: bool(b.active),
      sort: int(b.sort),
    };
  },
};

export async function listRows(request, env, table) {
  const { results } = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY sort, id`).all();
  return json(200, { rows: results });
}

export async function createRow(request, env, table) {
  const row = TABLES[table](await readJson(request), env);
  const cols = Object.keys(row);
  const res = await env.DB.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((_, i) => "?" + (i + 1)).join(", ")})`).bind(...Object.values(row)).run();
  return json(201, { ok: true, id: res.meta.last_row_id });
}

export async function updateRow(request, env, table, id) {
  const row = TABLES[table](await readJson(request), env);
  const cols = Object.keys(row);
  const res = await env.DB.prepare(`UPDATE ${table} SET ${cols.map((c, i) => c + " = ?" + (i + 1)).join(", ")} WHERE id = ?${cols.length + 1}`).bind(...Object.values(row), id).run();
  if (!res.meta.changes) throw new HttpError(404, "Not found");
  return json(200, { ok: true });
}

export async function deleteRow(request, env, table, id) {
  const res = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(id).run();
  if (!res.meta.changes) throw new HttpError(404, "Not found");
  return json(200, { ok: true });
}

// ------------------------------------------------------------------ settings
const SETTING_VALIDATORS = {
  store: (b) => {
    const whatsapp = String(b.whatsapp || "").replace(/\D/g, "");
    if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) throw new UserError("WhatsApp number must be 10–15 digits including the country code (e.g. 919876543210)");
    return {
      name: "Ovenroma Bakers",
      tagline: cleanText(b.tagline, { max: 120, label: "the tagline" }) || "Freshly Baked Happiness, Made for Every Occasion.",
      whatsapp,
      phone: cleanText(b.phone, { max: 20, label: "the phone number" }),
      email: cleanEmail(b.email),
      address: cleanText(b.address, { max: 200, label: "the address" }),
      city: cleanText(b.city, { max: 60, label: "the city" }),
      region: cleanText(b.region, { max: 60, label: "the state" }),
      postcode: cleanText(b.postcode, { max: 10, label: "the pincode" }),
      hours: cleanText(b.hours, { max: 120, label: "opening hours" }),
    };
  },
  shipping: (b) => ({
    flat_paise: rupeesToPaise(b.flat, "the delivery charge", { allowZero: true }) ?? 0,
    free_above_paise: rupeesToPaise(b.free_above, "the free-delivery threshold"),
    note: cleanText(b.note, { max: 200, label: "the delivery note" }),
  }),
  bulk: (b, current) => {
    const byId = new Map((Array.isArray(b.products) ? b.products : []).map((p) => [p && p.id, p]));
    const products = current.products.map((p) => {
      const upd = byId.get(p.id) || {};
      return {
        ...p,
        name: cleanText(upd.name, { max: 60, label: "the product name" }) || p.name,
        price_paise: rupeesToPaise(upd.price, p.name + " price", { required: true }),
      };
    });
    const varieties = strList(b.varieties, { max: 40, len: 60, label: "a biscuit variety" });
    if (!varieties.length) throw new UserError("Add at least one biscuit variety");
    return { products, varieties, note: cleanText(b.note, { max: 300, label: "the note" }) || current.note };
  },
  hampers: (b) => {
    const packaging = strList(b.packaging, { max: 12, len: 80, label: "a packaging option" });
    if (!packaging.length) throw new UserError("Add at least one packaging option");
    return { packaging };
  },
  home: (b) => ({
    hero_title: cleanText(b.hero_title, { min: 5, max: 120, required: true, label: "the hero heading" }),
    hero_subtitle: cleanText(b.hero_subtitle, { max: 300, label: "the hero subtitle" }),
  }),
  seo: (b) => {
    const out = {};
    for (const key of Object.keys(DEFAULT_SEO)) {
      const v = (b && b[key]) || {};
      out[key] = {
        title: cleanText(v.title, { max: 120, label: "the " + key + " title" }) || DEFAULT_SEO[key].title,
        description: cleanText(v.description, { max: 320, label: "the " + key + " description" }) || DEFAULT_SEO[key].description,
      };
    }
    return out;
  },
};

export async function getAllSettings(request, env) {
  return json(200, { settings: await getSettings(env) });
}

export async function putSettings(request, env, key) {
  const validate = SETTING_VALIDATORS[key];
  if (!validate) throw new HttpError(404, "Unknown setting");
  const current = await getSettings(env);
  const value = validate(await readJson(request, 32 * 1024), current[key]);
  await putSetting(env, key, value);
  return json(200, { ok: true, value });
}

// GET /api/admin/payment-check — asks Razorpay whether the configured key id
// + secret are accepted, and explains the result in plain words. Never
// returns key material.
export async function paymentCheck(request, env) {
  const keyId = rzpKeyId(env);
  const secret = rzpSecret(env);
  const mode = keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : "unknown";
  const base = { key_id: keyId, mode, secret_set: Boolean(secret) };
  if (!keyId) return json(200, { ...base, ok: false, message: "RAZORPAY_KEY_ID is not set." });
  if (!/^rzp_(live|test)_[A-Za-z0-9]{8,}$/.test(keyId)) return json(200, { ...base, ok: false, message: "RAZORPAY_KEY_ID doesn't look like a Razorpay key id (rzp_live_… or rzp_test_…)." });
  if (!secret) return json(200, { ...base, ok: false, message: "RAZORPAY_KEY_SECRET is not set. Add it in Cloudflare → Worker → Settings → Variables and Secrets (type: Secret)." });
  let res;
  try {
    res = await fetch(razorpayBase(env) + "/v1/orders?count=1", { headers: { Authorization: rzpAuthHeader(env) } });
  } catch {
    return json(200, { ...base, ok: false, message: "Couldn't reach Razorpay from the server. Try again in a minute." });
  }
  if (res.ok) return json(200, { ...base, ok: true, message: "Razorpay accepted the key id and secret (" + mode + " mode). Online payments should work." });
  let detail = "";
  try { detail = ((await res.json()).error || {}).description || ""; } catch { /* not JSON */ }
  detail = String(detail).replace(/[<>]/g, "").slice(0, 200);
  const message = res.status === 401
    ? "Razorpay rejected the key: RAZORPAY_KEY_SECRET doesn't match RAZORPAY_KEY_ID " + keyId + " (wrong or old secret, a test secret with a live key, or the key was regenerated). Paste the correct secret for this key id."
    : "Razorpay returned an error (HTTP " + res.status + ")" + (detail ? ": " + detail : "") + ".";
  return json(200, { ...base, ok: false, status: res.status, message });
}

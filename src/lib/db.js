// D1 data access. All queries are parameterised; JSON columns are parsed here.
import { parseJson } from "./util.js";
import { DEFAULT_SEO } from "./seo-defaults.js";

const SETTINGS_DEFAULTS = {
  store: { name: "Ovenroma Bakers", tagline: "Freshly Baked Happiness, Made for Every Occasion.", whatsapp: "", phone: "", email: "", address: "", city: "", region: "", postcode: "", hours: "" },
  shipping: { flat_paise: 0, free_above_paise: null, note: "" },
  bulk: { products: [], varieties: [], note: "" },
  hampers: { packaging: [] },
  home: { hero_title: "", hero_subtitle: "" },
  seo: DEFAULT_SEO,
};

export async function getSettings(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  const out = structuredClone(SETTINGS_DEFAULTS);
  for (const r of results) {
    const v = parseJson(r.value, null);
    if (v && typeof v === "object" && !Array.isArray(v) && out[r.key]) out[r.key] = { ...out[r.key], ...v };
    else if (v !== null) out[r.key] = v;
  }
  out.seo = { ...DEFAULT_SEO, ...(out.seo || {}) };
  return out;
}

export async function putSetting(env, key, value) {
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key, JSON.stringify(value)).run();
}

export function normaliseProduct(r) {
  if (!r) return null;
  return {
    ...r,
    gallery: parseJson(r.gallery, []),
    tags: parseJson(r.tags, []),
    variants: parseJson(r.variants, []),
    includes: parseJson(r.includes, []),
    in_stock: !!r.in_stock,
    featured: !!r.featured,
    active: !!r.active,
    customisable: !!r.customisable,
  };
}

export async function listCategories(env, { includeInactive = false } = {}) {
  const sql = "SELECT * FROM categories" + (includeInactive ? "" : " WHERE active = 1") + " ORDER BY sort, name";
  return (await env.DB.prepare(sql).all()).results;
}

export async function getCategory(env, slug) {
  return env.DB.prepare("SELECT * FROM categories WHERE slug = ?1 AND active = 1").bind(slug).first();
}

export async function listProducts(env, { category, featured, tag, includeInactive = false, excludeHampers = false } = {}) {
  const where = [];
  const args = [];
  if (!includeInactive) where.push("p.active = 1 AND c.active = 1");
  if (category) {
    args.push(category);
    where.push("p.category = ?" + args.length);
  }
  if (excludeHampers) where.push("p.category <> 'festival-hampers'");
  if (featured) where.push("p.featured = 1");
  if (tag) {
    args.push('%"' + tag + '"%');
    where.push("p.tags LIKE ?" + args.length);
  }
  const sql =
    "SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.slug = p.category" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY c.sort, p.sort, p.name";
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return results.map(normaliseProduct);
}

export async function getProduct(env, slug, { includeInactive = false } = {}) {
  const row = await env.DB.prepare(
    "SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.slug = p.category WHERE p.slug = ?1" +
      (includeInactive ? "" : " AND p.active = 1 AND c.active = 1")
  ).bind(slug).first();
  return normaliseProduct(row);
}

export async function productMap(env, slugs) {
  const unique = [...new Set(slugs.filter((s) => typeof s === "string" && /^[a-z0-9-]{1,80}$/.test(s)))].slice(0, 50);
  const map = new Map();
  if (!unique.length) return map;
  const placeholders = unique.map((_, i) => "?" + (i + 1)).join(",");
  const { results } = await env.DB.prepare(
    `SELECT p.* FROM products p JOIN categories c ON c.slug = p.category WHERE c.active = 1 AND p.slug IN (${placeholders})`
  ).bind(...unique).all();
  for (const r of results) map.set(r.slug, normaliseProduct(r));
  return map;
}

export async function listTestimonials(env) {
  return (await env.DB.prepare("SELECT * FROM testimonials WHERE active = 1 ORDER BY sort, id").all()).results;
}

export async function listBanners(env, placement) {
  return (await env.DB.prepare("SELECT * FROM banners WHERE active = 1 AND placement = ?1 ORDER BY sort, id").bind(placement).all()).results;
}

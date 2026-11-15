// Authoritative pricing. The browser only sends ids + quantities (+ hamper
// options); every amount is computed here from database values so totals
// can't be tampered with client-side. Pure functions — unit tested.
import { UserError, cleanText, parseJson } from "./util.js";

export const MAX_LINES = 30;
export const MAX_QTY = 100;
export const MAX_MESSAGE = 200;

/**
 * @param items     [{ slug, variant?, qty, options?: { packaging?, message? } }]
 * @param products  Map slug -> product row (price_paise, variants JSON, in_stock, active, customisable, name)
 * @param settings  { shipping: { flat_paise, free_above_paise }, hampers: { packaging: [] } }
 * @returns { lines, subtotal_paise, shipping_paise, total_paise }
 */
export function priceCart(items, products, settings) {
  if (!Array.isArray(items) || items.length === 0) throw new UserError("Your cart is empty");
  if (items.length > MAX_LINES) throw new UserError("Too many different items in one order (max " + MAX_LINES + ")");
  const packagingAllowed = (settings.hampers && settings.hampers.packaging) || [];
  const seen = new Set();
  const lines = [];
  let subtotal = 0;
  for (const raw of items) {
    if (!raw || typeof raw !== "object") throw new UserError("Invalid cart item");
    const slug = typeof raw.slug === "string" ? raw.slug : "";
    const p = products.get(slug);
    if (!p || !p.active) throw new UserError("An item in your cart is no longer available. Please remove it and try again.");
    if (!p.in_stock) throw new UserError(p.name + " is currently out of stock. Please remove it to continue.");
    const qty = raw.qty;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new UserError("Quantity for " + p.name + " must be between 1 and " + MAX_QTY);
    }
    const variants = Array.isArray(p.variants) ? p.variants : parseJson(p.variants || "[]", []);
    let unit = p.price_paise;
    let variantLabel = "";
    let variantId = "";
    if (variants.length) {
      const v = variants.find((x) => x.id === raw.variant);
      if (!v) throw new UserError("Please choose an option for " + p.name);
      variantId = v.id;
      variantLabel = v.label;
      unit = v.price_paise === null || v.price_paise === undefined ? p.price_paise : v.price_paise;
    }
    if (unit === null || unit === undefined) {
      throw new UserError(p.name + (variantLabel ? " (" + variantLabel + ")" : "") + " is available on request — please enquire on WhatsApp.");
    }
    let packaging = "";
    let message = "";
    const opts = raw.options && typeof raw.options === "object" ? raw.options : {};
    if (p.customisable) {
      packaging = cleanText(opts.packaging, { max: 80, label: "gift packaging" });
      if (packaging && !packagingAllowed.includes(packaging)) throw new UserError("Please choose a gift packaging option from the list");
      message = cleanText(opts.message, { max: MAX_MESSAGE, label: "the gift message", multiline: true });
    }
    const key = [slug, variantId, packaging, message].join("|");
    if (seen.has(key)) throw new UserError("Duplicate item in cart. Please refresh the page and try again.");
    seen.add(key);
    const line_total = unit * qty;
    subtotal += line_total;
    lines.push({ slug, name: p.name, variant: variantId, variant_label: variantLabel, qty, unit_paise: unit, line_paise: line_total, packaging, message });
  }
  const ship = settings.shipping || {};
  const flat = Number.isInteger(ship.flat_paise) && ship.flat_paise > 0 ? ship.flat_paise : 0;
  const freeAbove = Number.isInteger(ship.free_above_paise) && ship.free_above_paise > 0 ? ship.free_above_paise : null;
  const shipping = freeAbove !== null && subtotal >= freeAbove ? 0 : flat;
  return { lines, subtotal_paise: subtotal, shipping_paise: shipping, total_paise: subtotal + shipping };
}

/**
 * Langar & Bhandara bulk order pricing.
 * @param items  [{ id, qty, variety? }]  — biscuits lines carry a variety
 * @param bulk   settings.bulk { products: [{id,name,price_paise,unit,step,max,varieties}], varieties: [] }
 */
export function priceBulk(items, bulk) {
  if (!Array.isArray(items) || items.length === 0) throw new UserError("Please add at least one product to your order");
  if (items.length > 40) throw new UserError("Too many lines in one order");
  const specs = new Map((bulk.products || []).map((p) => [p.id, p]));
  const varieties = bulk.varieties || [];
  const seen = new Set();
  const lines = [];
  let total = 0;
  for (const raw of items) {
    const spec = raw && specs.get(raw.id);
    if (!spec) throw new UserError("Unknown product in bulk order");
    let variety = "";
    if (spec.varieties) {
      variety = typeof raw.variety === "string" ? raw.variety : "";
      if (!varieties.includes(variety)) throw new UserError("Please choose a biscuit variety for every biscuits line");
    }
    const key = spec.id + "|" + variety;
    if (seen.has(key)) throw new UserError("The same product appears twice — please combine the quantities");
    seen.add(key);
    const qty = raw.qty;
    const step = spec.step || 1;
    const steps = qty / step;
    if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0 || qty > (spec.max || 100000) ||
        Math.abs(steps - Math.round(steps)) > 1e-9) {
      throw new UserError("Quantity for " + spec.name + " must be a multiple of " + step + " (up to " + (spec.max || 100000) + ")");
    }
    const line = Math.round(spec.price_paise * qty);
    total += line;
    lines.push({ id: spec.id, name: spec.name, variety, unit: spec.unit, qty, unit_paise: spec.price_paise, line_paise: line });
  }
  return { lines, total_paise: total };
}

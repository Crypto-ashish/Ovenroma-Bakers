// Public API: cart quotes, checkout (Razorpay), WhatsApp orders, enquiries, webhook.
import {
  json, readJson, cleanText, cleanPhone, cleanEmail, cleanDate, makeRef, UserError, HttpError,
  hmacSha256Hex, timingSafeEqual, PINCODE_RE, thumbOf,
} from "../lib/util.js";
import { priceCart, priceBulk } from "../lib/pricing.js";
import { getSettings, productMap } from "../lib/db.js";

function razorpayBase(env) {
  // Override only for local end-to-end tests (mock Razorpay on localhost).
  const b = env.RAZORPAY_API_BASE || "";
  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(b) ? b : "https://api.razorpay.com";
}
// Keys are trimmed: a secret pasted with a trailing space or newline in the
// dashboard would otherwise fail Razorpay authentication.
export const rzpKeyId = (env) => String(env.RAZORPAY_KEY_ID || "").trim();
export const rzpSecret = (env) => String(env.RAZORPAY_KEY_SECRET || "").trim();
export const rzpAuthHeader = (env) => "Basic " + btoa(rzpKeyId(env) + ":" + rzpSecret(env));
export { razorpayBase };
export const paymentsConfigured = (env) => Boolean(rzpKeyId(env) && rzpSecret(env));

async function quoteFor(env, items) {
  if (!Array.isArray(items)) throw new UserError("Your cart is empty");
  const settings = await getSettings(env);
  const products = await productMap(env, items.map((i) => i && i.slug));
  return { settings, quote: priceCart(items, products, settings), products };
}

// POST /api/cart/quote — per-item status (for display) + authoritative totals.
export async function cartQuote(request, env) {
  const body = await readJson(request);
  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  const settings = await getSettings(env);
  const products = await productMap(env, items.map((i) => i && i.slug));
  const info = {};
  for (const [slug, p] of products) {
    info[slug] = {
      name: p.name, image: thumbOf(p.image), in_stock: p.in_stock && p.active, price: p.price_paise,
      pack: [p.packaging, p.weight].filter(Boolean).join(" • "),
      variants: p.variants.map((v) => ({ id: v.id, label: v.label, price: v.price_paise ?? p.price_paise })),
    };
  }
  try {
    const quote = priceCart(items, products, settings);
    return json(200, { ok: true, quote, products: info });
  } catch (e) {
    if (e instanceof UserError) return json(200, { ok: false, error: e.message, products: info });
    throw e;
  }
}

function validateCustomer(c) {
  if (!c || typeof c !== "object" || Array.isArray(c)) throw new UserError("Please fill in your delivery details");
  const pincode = cleanText(c.pincode, { max: 6, required: true, label: "your pincode" });
  if (!PINCODE_RE.test(pincode)) throw new UserError("Please enter a valid 6-digit pincode");
  return {
    name: cleanText(c.name, { min: 2, max: 80, required: true, label: "your name" }),
    phone: cleanPhone(c.phone),
    email: cleanEmail(c.email),
    address: cleanText(c.address, { min: 10, max: 240, required: true, label: "your delivery address", multiline: true }),
    city: cleanText(c.city, { min: 2, max: 60, required: true, label: "your city" }),
    pincode,
    notes: cleanText(c.notes, { max: 300, label: "order notes", multiline: true }),
  };
}

async function insertOrder(env, { ref, status, method, customer, quote }) {
  await env.DB.prepare(
    `INSERT INTO orders (ref, status, payment_method, customer_name, phone, email, address, city, pincode, notes, items, subtotal_paise, shipping_paise, total_paise)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
  ).bind(ref, status, method, customer.name, customer.phone, customer.email, customer.address, customer.city, customer.pincode,
    customer.notes, JSON.stringify(quote.lines), quote.subtotal_paise, quote.shipping_paise, quote.total_paise).run();
}

// POST /api/checkout/create-order — prices server-side, saves the order, then
// creates the Razorpay order. The secret never leaves the Worker.
export async function createOrder(request, env) {
  if (!paymentsConfigured(env)) {
    return json(503, { error: "Online payment is temporarily unavailable. Please place your order on WhatsApp." });
  }
  const body = await readJson(request);
  const customer = validateCustomer(body.customer);
  const { quote } = await quoteFor(env, body.items);
  if (quote.total_paise < 100) throw new UserError("Order total must be at least ₹1");
  const ref = makeRef("OVR");
  await insertOrder(env, { ref, status: "created", method: "razorpay", customer, quote });

  const res = await fetch(razorpayBase(env) + "/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: rzpAuthHeader(env) },
    body: JSON.stringify({
      amount: quote.total_paise,
      currency: "INR",
      receipt: ref,
      notes: {
        // The Razorpay account is shared with Gluten Free Delhi: label the shop.
        store: "Ovenroma Bakers",
        channel: "ovenroma-shop",
        order_ref: ref,
        customer_name: customer.name,
        phone: customer.phone,
        items: quote.lines.map((l) => l.name + (l.variant_label ? " (" + l.variant_label + ")" : "") + " x" + l.qty).join(" | ").slice(0, 250),
      },
    }),
  });
  if (!res.ok) {
    console.error("create-order: razorpay error", res.status, (await res.text()).slice(0, 500));
    await env.DB.prepare("UPDATE orders SET status = 'failed', failure_reason = 'gateway_error' WHERE ref = ?1").bind(ref).run();
    return json(502, { error: "We couldn't start the payment. Please try again, or order on WhatsApp." });
  }
  const order = await res.json();
  if (!order || typeof order.id !== "string" || order.amount !== quote.total_paise) {
    console.error("create-order: unexpected razorpay response");
    return json(502, { error: "We couldn't start the payment. Please try again." });
  }
  await env.DB.prepare("UPDATE orders SET razorpay_order_id = ?1 WHERE ref = ?2").bind(order.id, ref).run();
  return json(200, {
    ref,
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: rzpKeyId(env),
    prefill: { name: customer.name, contact: customer.phone, email: customer.email },
  });
}

const ID_RE = /^[A-Za-z0-9_]{1,64}$/;
const REF_RE = /^OVR-[A-Z0-9]{4,12}-[A-Z0-9]{12}$/;

// POST /api/checkout/verify — HMAC-SHA256(order_id|payment_id) with the key
// secret, compared in constant time, and the order id must match our record.
export async function verifyPayment(request, env) {
  if (!rzpSecret(env)) return json(503, { error: "Payment gateway is not configured" });
  const body = await readJson(request);
  const { ref, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (typeof ref !== "string" || !REF_RE.test(ref) || !ID_RE.test(razorpay_order_id || "") || !ID_RE.test(razorpay_payment_id || "") ||
      typeof razorpay_signature !== "string" || !/^[0-9a-f]{64}$/i.test(razorpay_signature)) {
    return json(400, { verified: false, error: "Payment could not be verified" });
  }
  const order = await env.DB.prepare("SELECT ref, status, razorpay_order_id FROM orders WHERE ref = ?1").bind(ref).first();
  if (!order || order.razorpay_order_id !== razorpay_order_id) {
    return json(400, { verified: false, error: "Payment could not be verified" });
  }
  const expected = await hmacSha256Hex(rzpSecret(env), razorpay_order_id + "|" + razorpay_payment_id);
  if (!timingSafeEqual(expected, razorpay_signature.toLowerCase())) {
    return json(400, { verified: false, error: "Payment could not be verified" });
  }
  await env.DB.prepare(
    "UPDATE orders SET status = 'paid', razorpay_payment_id = ?1, paid_at = datetime('now'), failure_reason = '' WHERE ref = ?2 AND status IN ('created', 'failed')"
  ).bind(razorpay_payment_id, ref).run();
  return json(200, { verified: true, ref });
}

// POST /api/checkout/failed — record a failed/cancelled attempt (never overrides paid).
export async function paymentFailed(request, env) {
  const body = await readJson(request);
  if (typeof body.ref !== "string" || !REF_RE.test(body.ref)) return json(400, { error: "Invalid order" });
  const reason = cleanText(body.reason, { max: 160, label: "reason" }) || "cancelled";
  await env.DB.prepare("UPDATE orders SET status = 'failed', failure_reason = ?1 WHERE ref = ?2 AND status = 'created'").bind(reason, body.ref).run();
  return json(200, { ok: true });
}

// POST /api/checkout/whatsapp — save the order (status "whatsapp") and return
// the priced lines so the browser can compose the WhatsApp message.
export async function whatsappOrder(request, env) {
  const body = await readJson(request);
  const customer = validateCustomer(body.customer);
  const { quote } = await quoteFor(env, body.items);
  const ref = makeRef("OVR");
  await insertOrder(env, { ref, status: "whatsapp", method: "whatsapp", customer, quote });
  return json(200, { ref, quote });
}

// ---------------------------------------------------------------------------
// Enquiries: bulk, custom-hamper, hamper, corporate, contact
// ---------------------------------------------------------------------------
async function insertEnquiry(env, type, { name, phone, email }, payload, total = null) {
  const res = await env.DB.prepare(
    "INSERT INTO enquiries (type, name, phone, email, payload, total_paise) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  ).bind(type, name, phone || "", email || "", JSON.stringify(payload), total).run();
  return res.meta && res.meta.last_row_id;
}

function intInRange(v, { min = 0, max = 1e9, label, required = false }) {
  if (v === "" || v === null || v === undefined) {
    if (required) throw new UserError("Please fill in " + label);
    return null;
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new UserError("Please enter a valid number for " + label);
  return n;
}

export async function createEnquiry(request, env) {
  const body = await readJson(request, 24 * 1024);
  const type = body.type;
  const c = body.customer || {};
  const settings = await getSettings(env);
  let contact, payload, total = null;

  if (type === "bulk") {
    const priced = priceBulk(body.items, settings.bulk);
    contact = { name: cleanText(c.name, { min: 2, max: 80, required: true, label: "your name" }), phone: cleanPhone(c.phone) };
    payload = {
      event_name: cleanText(c.event_name, { min: 2, max: 120, required: true, label: "the event name" }),
      event_date: cleanDate(c.event_date, { required: true, label: "the event date" }),
      location: cleanText(c.location, { min: 2, max: 120, required: true, label: "the delivery location" }),
      address: cleanText(c.address, { min: 5, max: 240, required: true, label: "the delivery address", multiline: true }),
      people: intInRange(c.people, { min: 1, max: 1000000, label: "number of people" }),
      notes: cleanText(c.notes, { max: 400, label: "special instructions", multiline: true }),
      lines: priced.lines,
    };
    total = priced.total_paise;
    const id = await insertEnquiry(env, type, contact, payload, total);
    return json(200, { ok: true, id, total_paise: total, lines: priced.lines });
  }

  if (type === "custom-hamper" || type === "hamper") {
    contact = { name: cleanText(c.name, { min: 2, max: 80, required: true, label: "your name" }), phone: cleanPhone(c.phone), email: cleanEmail(c.email) };
    const packaging = cleanText(body.packaging, { max: 80, label: "packaging", required: type === "custom-hamper" });
    if (packaging && !(settings.hampers.packaging || []).includes(packaging)) throw new UserError("Please choose a packaging option from the list");
    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
    const products = await productMap(env, rawItems.map((i) => i && i.slug));
    const items = [];
    for (const i of rawItems) {
      const p = products.get(i && i.slug);
      const qty = intInRange(i && i.qty, { min: 1, max: 100, label: "product quantity", required: true });
      if (!p || !p.active) throw new UserError("A selected product is no longer available");
      items.push({ slug: p.slug, name: p.name, qty, unit_paise: p.variants.length ? null : p.price_paise });
    }
    if (type === "custom-hamper" && !items.length) throw new UserError("Please choose at least one product for your hamper");
    payload = {
      items,
      packaging,
      message: cleanText(body.message, { max: 200, label: "the gift message", multiline: true }),
      hampers: intInRange(body.hampers, { min: 1, max: 10000, label: "number of hampers", required: true }),
      bulk: !!body.bulk,
      date: cleanDate(body.date, { label: "the delivery date" }),
      city: cleanText(body.city, { max: 80, label: "city" }),
      hamper: cleanText(body.hamper, { max: 120, label: "hamper" }),
    };
    const perHamper = items.every((i) => Number.isInteger(i.unit_paise)) ? items.reduce((s, i) => s + i.unit_paise * i.qty, 0) : null;
    total = perHamper !== null && items.length ? perHamper * payload.hampers : null;
    const id = await insertEnquiry(env, type, contact, payload, total);
    return json(200, { ok: true, id, estimate_paise: total });
  }

  if (type === "corporate") {
    contact = { name: cleanText(c.name, { min: 2, max: 80, required: true, label: "the contact person" }), phone: cleanPhone(c.phone), email: cleanEmail(c.email, true) };
    payload = {
      company: cleanText(c.company, { min: 2, max: 120, required: true, label: "the company name" }),
      quantity: intInRange(c.quantity, { min: 1, max: 100000, label: "number of hampers", required: true }),
      budget: intInRange(c.budget, { min: 0, max: 1000000, label: "budget per hamper" }),
      date: cleanDate(c.date, { label: "the delivery date" }),
      city: cleanText(c.city, { max: 80, label: "city" }),
      occasion: cleanText(c.occasion, { max: 60, label: "occasion" }),
      message: cleanText(c.message, { max: 1000, label: "requirements", multiline: true }),
    };
    const id = await insertEnquiry(env, type, contact, payload);
    return json(200, { ok: true, id });
  }

  if (type === "contact") {
    contact = { name: cleanText(c.name, { min: 2, max: 80, required: true, label: "your name" }), phone: cleanPhone(c.phone), email: cleanEmail(c.email) };
    payload = {
      subject: cleanText(c.subject, { max: 60, label: "topic" }),
      message: cleanText(c.message, { min: 5, max: 1000, required: true, label: "your message", multiline: true }),
    };
    const id = await insertEnquiry(env, type, contact, payload);
    return json(200, { ok: true, id });
  }

  throw new HttpError(400, "Unknown enquiry type");
}

// ---------------------------------------------------------------------------
// POST /api/razorpay-webhook — raw-body HMAC with RAZORPAY_WEBHOOK_SECRET,
// idempotent by X-Razorpay-Event-Id. Marks orders paid/failed by order id.
// ---------------------------------------------------------------------------
export async function razorpayWebhook(request, env) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return json(503, { error: "Webhook not configured" });
  const signature = request.headers.get("X-Razorpay-Signature") || "";
  if (!/^[0-9a-f]{64}$/i.test(signature)) return json(400, { error: "Invalid signature" });
  const raw = await request.text();
  if (raw.length > 64 * 1024) return json(413, { error: "Request too large" });
  const expected = await hmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, raw);
  if (!timingSafeEqual(expected, signature.toLowerCase())) return json(400, { error: "Invalid signature" });

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid body" });
  }
  const eventId = request.headers.get("X-Razorpay-Event-Id") || "";
  if (eventId) {
    const ins = await env.DB.prepare("INSERT OR IGNORE INTO webhook_events (event_id) VALUES (?1)").bind(eventId.slice(0, 100)).run();
    if (!ins.meta || ins.meta.changes === 0) return json(200, { received: true, duplicate: true });
  }
  const payment = event && event.payload && event.payload.payment && event.payload.payment.entity;
  const orderId = (payment && payment.order_id) || (event.payload && event.payload.order && event.payload.order.entity && event.payload.order.entity.id);
  if (orderId && ID_RE.test(orderId)) {
    if (event.event === "payment.captured" || event.event === "order.paid") {
      await env.DB.prepare(
        "UPDATE orders SET status = 'paid', razorpay_payment_id = COALESCE(?1, razorpay_payment_id), paid_at = COALESCE(paid_at, datetime('now')) WHERE razorpay_order_id = ?2 AND status IN ('created', 'failed')"
      ).bind(payment && ID_RE.test(payment.id || "") ? payment.id : null, orderId).run();
    } else if (event.event === "payment.failed") {
      await env.DB.prepare("UPDATE orders SET status = 'failed', failure_reason = 'payment_failed' WHERE razorpay_order_id = ?1 AND status = 'created'").bind(orderId).run();
    }
  }
  return json(200, { received: true });
}

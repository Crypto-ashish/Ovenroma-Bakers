import { test } from "node:test";
import assert from "node:assert/strict";
import { priceCart, priceBulk } from "../../src/lib/pricing.js";
import { BULK_PRODUCTS, BISCUIT_VARIETIES } from "../../src/data/catalog.js";

const prod = (o) => ({ active: true, in_stock: true, variants: [], customisable: false, ...o });
const products = new Map([
  ["vanilla-muffins", prod({ slug: "vanilla-muffins", name: "Vanilla Muffins", price_paise: 500 })],
  ["golgappa", prod({ slug: "golgappa", name: "Golgappa", price_paise: 28000 })],
  ["papri", prod({ slug: "papri", name: "Papri", price_paise: null })],
  ["oos", prod({ slug: "oos", name: "Oos", price_paise: 100, in_stock: false })],
  ["flour", prod({ slug: "flour", name: "Flour", price_paise: null, variants: [{ id: "white", label: "White", price_paise: 9900 }, { id: "lite", label: "Lite", price_paise: null }] })],
  ["hamper", prod({ slug: "hamper", name: "Hamper", price_paise: 100000, customisable: true })],
]);
const settings = { shipping: { flat_paise: 5000, free_above_paise: 100000 }, hampers: { packaging: ["Premium rigid gift box"] } };

test("prices cart server-side and adds shipping below the free threshold", () => {
  const q = priceCart([{ slug: "vanilla-muffins", qty: 4 }, { slug: "golgappa", qty: 1 }], products, settings);
  assert.equal(q.subtotal_paise, 30000);
  assert.equal(q.shipping_paise, 5000);
  assert.equal(q.total_paise, 35000);
});

test("free shipping at/above threshold", () => {
  const q = priceCart([{ slug: "golgappa", qty: 4 }], products, settings);
  assert.equal(q.shipping_paise, 0);
  assert.equal(q.total_paise, 112000);
});

test("rejects unpriced, out-of-stock, unknown and bad quantities", () => {
  assert.throws(() => priceCart([{ slug: "papri", qty: 1 }], products, settings), /on request/);
  assert.throws(() => priceCart([{ slug: "oos", qty: 1 }], products, settings), /out of stock/);
  assert.throws(() => priceCart([{ slug: "nope", qty: 1 }], products, settings), /no longer available/);
  assert.throws(() => priceCart([{ slug: "golgappa", qty: 0 }], products, settings), /between 1 and/);
  assert.throws(() => priceCart([{ slug: "golgappa", qty: "2" }], products, settings), /between 1 and/);
  assert.throws(() => priceCart([{ slug: "golgappa", qty: 1.5 }], products, settings), /between 1 and/);
  assert.throws(() => priceCart([], products, settings), /empty/);
});

test("variants use their own price and must be chosen", () => {
  const q = priceCart([{ slug: "flour", variant: "white", qty: 2 }], products, settings);
  assert.equal(q.subtotal_paise, 19800);
  assert.equal(q.lines[0].variant_label, "White");
  assert.throws(() => priceCart([{ slug: "flour", qty: 1 }], products, settings), /choose an option/);
  assert.throws(() => priceCart([{ slug: "flour", variant: "lite", qty: 1 }], products, settings), /on request/);
});

test("hamper options are validated and kept on the line", () => {
  const q = priceCart([{ slug: "hamper", qty: 2, options: { packaging: "Premium rigid gift box", message: "Happy <b>Diwali</b>!" } }], products, settings);
  assert.equal(q.lines[0].packaging, "Premium rigid gift box");
  assert.equal(q.lines[0].message, "Happy Diwali!");
  assert.throws(() => priceCart([{ slug: "hamper", qty: 1, options: { packaging: "Gold bars" } }], products, settings), /packaging/);
});

test("duplicate lines are rejected", () => {
  assert.throws(() => priceCart([{ slug: "golgappa", qty: 1 }, { slug: "golgappa", qty: 1 }], products, settings), /Duplicate/);
});

const bulk = { products: BULK_PRODUCTS.map((b) => ({ ...b, price_paise: b.price * 100 })), varieties: BISCUIT_VARIETIES };

test("bulk order: the brief's example totals ₹2,200", () => {
  const r = priceBulk([
    { id: "kulcha", qty: 10 },
    { id: "veg-patties", qty: 100 },
    { id: "biscuits", qty: 5, variety: "Jam Biscuits" },
    { id: "cupcakes", qty: 100 },
  ], bulk);
  assert.deepEqual(r.lines.map((l) => l.line_paise), [20000, 80000, 90000, 30000]);
  assert.equal(r.total_paise, 220000);
});

test("bulk order: multiple biscuit varieties, half-kg steps, validation", () => {
  const r = priceBulk([{ id: "biscuits", qty: 2.5, variety: "Jam Biscuits" }, { id: "biscuits", qty: 1, variety: "Jeera Cookies" }], bulk);
  assert.equal(r.total_paise, 45000 + 18000);
  assert.throws(() => priceBulk([{ id: "biscuits", qty: 1 }], bulk), /variety/);
  assert.throws(() => priceBulk([{ id: "biscuits", qty: 1, variety: "Jam Biscuits" }, { id: "biscuits", qty: 2, variety: "Jam Biscuits" }], bulk), /twice/);
  assert.throws(() => priceBulk([{ id: "kulcha", qty: 1.5 }], bulk), /multiple of 1/);
  assert.throws(() => priceBulk([{ id: "biscuits", qty: 0.3, variety: "Jam Biscuits" }], bulk), /multiple of 0.5/);
  assert.throws(() => priceBulk([{ id: "caviar", qty: 1 }], bulk), /Unknown/);
});

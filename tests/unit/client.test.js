import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBulk } from "../../public/assets/js/lib/bulk-calc.js";
import { bulkMessage, cartMessage, waUrl } from "../../public/assets/js/lib/wa.js";
import { rupees } from "../../public/assets/js/lib/format.js";
import { BULK_PRODUCTS, BISCUIT_VARIETIES } from "../../src/data/catalog.js";

const config = { products: BULK_PRODUCTS.map((b) => ({ ...b, price_paise: b.price * 100 })), varieties: BISCUIT_VARIETIES };

test("calculator matches the brief's worked example", () => {
  const r = computeBulk(config, { qty: { kulcha: "10", "veg-patties": "100", cupcakes: "100" }, biscuits: [{ variety: "Almond Cookies", kg: "5" }] });
  assert.equal(r.errors.length, 0);
  assert.equal(r.total_paise, 220000);
  assert.equal(rupees(r.total_paise), "₹2,200");
  assert.deepEqual(r.items, [{ id: "kulcha", qty: 10 }, { id: "veg-patties", qty: 100 }, { id: "cupcakes", qty: 100 }, { id: "biscuits", qty: 5, variety: "Almond Cookies" }]);
});

test("calculator flags missing variety, duplicates and bad steps; ignores empty rows", () => {
  const r = computeBulk(config, { qty: { kulcha: "2.5", cupcakes: "" }, biscuits: [{ variety: "", kg: "1" }, { variety: "Jam Biscuits", kg: "1" }, { variety: "Jam Biscuits", kg: "2" }, { variety: "Jeera Cookies", kg: "" }] });
  assert.equal(r.errors.length, 3);
  assert.equal(r.total_paise, 18000);
});

test("WhatsApp bulk message lists customer, lines and grand total", () => {
  const calc = computeBulk(config, { qty: { kulcha: 10 }, biscuits: [{ variety: "Jam Biscuits", kg: 2 }, { variety: "Elaichi Cookies", kg: 1.5 }] });
  const msg = bulkMessage({ name: "Seva Committee", phone: "9876543210", event_name: "Gurpurab Langar", event_date: "2027-01-05", location: "Model Town", address: "Gurudwara Sahib, Block A", people: "500", notes: "Deliver by 9am" }, calc);
  for (const s of ["Seva Committee", "9876543210", "Gurpurab Langar", "5 Jan 2027", "Model Town", "Gurudwara Sahib, Block A", "Number of people: 500",
    "Kulcha: 10 dozen × ₹20/dozen = ₹200", "Biscuits – Jam Biscuits: 2 kg × ₹180/kg = ₹360", "Biscuits – Elaichi Cookies: 1.5 kg × ₹180/kg = ₹270", "Grand total: ₹830", "Deliver by 9am"]) {
    assert.ok(msg.includes(s), "missing: " + s);
  }
});

test("waUrl uses only digits and encodes text", () => {
  assert.equal(waUrl("+91 98765-43210", "a&b"), "https://wa.me/919876543210?text=a%26b");
  assert.equal(waUrl("", "hi"), "https://wa.me/?text=hi");
});

test("cart message includes ref, lines and total", () => {
  const msg = cartMessage({ lines: [{ name: "Golgappa", qty: 2, line_paise: 56000 }], subtotal_paise: 56000, shipping_paise: 0, total_paise: 56000 }, { name: "A", phone: "9876543210", address: "X", city: "Delhi", pincode: "110001" }, "OVR-1");
  assert.match(msg, /OVR-1/);
  assert.match(msg, /Golgappa × 2 = ₹560/);
  assert.match(msg, /Total: ₹560/);
});

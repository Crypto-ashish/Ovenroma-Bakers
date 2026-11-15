// /cart — lines from local storage, totals from the server quote.
import { getCart, setQty, removeItem, payload, refreshSnapshot } from "./lib/cart.js";
import { rupees } from "./lib/format.js";
import { api, esc, openWhatsApp } from "./lib/ui.js";
import { waUrl, cartMessage } from "./lib/wa.js";

const linesBox = document.querySelector("[data-cart-lines]");
const summary = document.querySelector("[data-cart-summary]");
const errBox = document.querySelector("[data-cart-error]");
const toCheckout = document.querySelector("[data-to-checkout]");
let lastQuote = null;
let seq = 0;

function render(items, quote, products = {}, error = "") {
  if (!items.length) {
    linesBox.innerHTML = `<div class="empty-cart"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.6L5 3H2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><h2 class="h3">Your cart is empty</h2><p>Browse our freshly baked biscuits, muffins, kulchas and more.</p><a class="btn btn-primary" href="/shop">Shop now</a></div>`;
    summary.hidden = true;
    return;
  }
  const priced = new Map((quote ? quote.lines : []).map((l) => [[l.slug, l.variant, l.packaging, l.message].join("|"), l]));
  linesBox.innerHTML = items.map((i) => {
    const p = products[i.slug];
    const line = priced.get(i.key);
    let warn = "";
    if (!p) warn = "This item is no longer available — please remove it.";
    else if (!p.in_stock) warn = "Out of stock — please remove it.";
    else if (!line && error) {
      const v = (p.variants || []).find((x) => x.id === i.variant);
      if ((v ? v.price : p.price) === null) warn = "Price on request — remove it and enquire on WhatsApp.";
    }
    const meta = [i.variantLabel, i.pack, i.options && i.options.packaging && "Packaging: " + i.options.packaging, i.options && i.options.message && "Message: “" + i.options.message + "”"].filter(Boolean).join(" • ");
    return `<div class="cart-line" data-key="${esc(i.key)}">
      <img src="${esc(i.image)}" width="76" height="76" alt="" loading="lazy">
      <div><a class="cl-name" href="/product/${esc(i.slug)}">${esc(i.name)}</a><span class="cl-meta">${esc(meta)}</span>${line ? `<span class="cl-meta">${rupees(line.unit_paise)} each</span>` : ""}</div>
      <div class="cl-controls">
        <div class="qty" data-qty><button type="button" class="qty-btn" data-dec aria-label="Decrease quantity">−</button><input type="number" min="1" max="100" value="${i.qty}" aria-label="Quantity of ${esc(i.name)}" data-line-qty><button type="button" class="qty-btn" data-inc aria-label="Increase quantity">+</button></div>
        <span class="cl-price">${line ? rupees(line.line_paise) : ""}</span>
        <button type="button" class="cl-remove" data-line-remove>Remove</button>
      </div>
      ${warn ? `<p class="cl-warn">${esc(warn)}</p>` : ""}
    </div>`;
  }).join("");
  summary.hidden = false;
  document.querySelector("[data-sum-subtotal]").textContent = quote ? rupees(quote.subtotal_paise) : "—";
  document.querySelector("[data-sum-shipping]").textContent = quote ? (quote.shipping_paise ? rupees(quote.shipping_paise) : "Free") : "—";
  document.querySelector("[data-sum-total]").textContent = quote ? rupees(quote.total_paise) : "—";
  errBox.hidden = !error;
  errBox.textContent = error;
  toCheckout.classList.toggle("is-loading", !quote);
  toCheckout.setAttribute("aria-disabled", String(!quote));
}

async function refresh() {
  const items = getCart();
  const mine = ++seq;
  if (!items.length) { render(items, null); return; }
  try {
    const res = await api("/api/cart/quote", { items: payload(items) });
    if (mine !== seq) return;
    refreshSnapshot(res.products || {});
    lastQuote = res.ok ? res.quote : null;
    render(getCart(), lastQuote, res.products || {}, res.ok ? "" : res.error);
  } catch (e) {
    if (mine === seq) render(items, null, {}, e.message);
  }
}

linesBox.addEventListener("change", (e) => {
  const input = e.target.closest("[data-line-qty]");
  if (input) setQty(input.closest("[data-key]").dataset.key, Number(input.value));
});
linesBox.addEventListener("click", (e) => {
  const rm = e.target.closest("[data-line-remove]");
  if (rm) removeItem(rm.closest("[data-key]").dataset.key);
});
toCheckout.addEventListener("click", (e) => { if (!lastQuote) e.preventDefault(); });
document.querySelector("[data-cart-wa]").addEventListener("click", () => {
  const items = getCart();
  const lines = lastQuote ? lastQuote : {
    lines: items.map((i) => ({ name: i.name, variant_label: i.variantLabel, qty: i.qty, line_paise: Number.isInteger(i.price) ? i.price * i.qty : null, packaging: i.options?.packaging, message: i.options?.message })),
    subtotal_paise: null, shipping_paise: 0, total_paise: null,
  };
  openWhatsApp(waUrl(document.body.dataset.wa, cartMessage(lines, null, "")));
});

let t = null;
document.addEventListener("cart:change", () => { clearTimeout(t); t = setTimeout(refresh, 150); });
refresh();

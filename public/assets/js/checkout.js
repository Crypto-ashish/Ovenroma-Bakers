// /checkout — server quote, delivery form, Razorpay (test/live) or WhatsApp.
import { getCart, payload, clearCart, refreshSnapshot } from "./lib/cart.js";
import { rupees } from "./lib/format.js";
import { api, esc, validateForm, formValues, phoneRule, pincodeRule, emailRule, openWhatsApp, toast } from "./lib/ui.js";
import { waUrl, cartMessage } from "./lib/wa.js";

const root = document.querySelector("[data-checkout]");
const form = document.querySelector("[data-checkout-form]");
const errBox = document.querySelector("[data-checkout-error]");
const payBtn = form.querySelector("[data-pay]");
const waBtn = form.querySelector("[data-checkout-wa]");
const paymentsReady = root.dataset.payments === "1";
let quote = null;
const SAVE_KEY = "ovr_checkout_details";

function showError(msg) {
  errBox.textContent = msg;
  errBox.hidden = !msg;
  if (msg) errBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function loadQuote() {
  const items = getCart();
  const list = document.querySelector("[data-mini-lines]");
  if (!items.length) {
    list.innerHTML = `<li>Your cart is empty. <a href="/shop">Shop now</a></li>`;
    payBtn.disabled = true;
    waBtn.disabled = true;
    return;
  }
  try {
    const res = await api("/api/cart/quote", { items: payload(items) });
    refreshSnapshot(res.products || {});
    if (!res.ok) {
      showError(res.error + " (update your cart to continue)");
      list.innerHTML = `<li><a href="/cart">Review your cart</a></li>`;
      payBtn.disabled = true;
      waBtn.disabled = true;
      return;
    }
    quote = res.quote;
    const imgs = Object.fromEntries(getCart().map((i) => [i.key, i.image]));
    list.innerHTML = quote.lines.map((l) => {
      const key = [l.slug, l.variant, l.packaging, l.message].join("|");
      return `<li><img src="${esc(imgs[key] || "")}" width="46" height="46" alt=""><span class="ml-name">${esc(l.name)}${l.variant_label ? " — " + esc(l.variant_label) : ""}<small>Qty ${l.qty}${l.packaging ? " • " + esc(l.packaging) : ""}</small></span><strong>${rupees(l.line_paise)}</strong></li>`;
    }).join("");
    document.querySelector("[data-sum-subtotal]").textContent = rupees(quote.subtotal_paise);
    document.querySelector("[data-sum-shipping]").textContent = quote.shipping_paise ? rupees(quote.shipping_paise) : "Free";
    document.querySelector("[data-sum-total]").textContent = rupees(quote.total_paise);
    payBtn.disabled = !paymentsReady;
    if (paymentsReady) payBtn.textContent = "Pay " + rupees(quote.total_paise) + " Securely";
  } catch (e) {
    showError(e.message);
  }
}

// Remember delivery details on this device for convenience.
try {
  const saved = JSON.parse(sessionStorage.getItem(SAVE_KEY) || "{}");
  for (const [k, v] of Object.entries(saved)) if (form.elements[k] && !form.elements[k].value) form.elements[k].value = v;
} catch { /* storage unavailable */ }

function customer() {
  const v = formValues(form);
  try { sessionStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch { /* ignore */ }
  return v;
}
const rules = { phone: phoneRule, pincode: pincodeRule, email: emailRule };

let rzpLoader = null;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  rzpLoader = rzpLoader || new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => { rzpLoader = null; reject(new Error("Couldn't load the payment window. Check your connection and try again.")); };
    document.head.append(s);
  });
  return rzpLoader;
}

function busy(on) {
  payBtn.classList.toggle("is-loading", on);
  payBtn.disabled = on || !paymentsReady || !quote;
  waBtn.disabled = on;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");
  if (!quote || !paymentsReady) return;
  if (!validateForm(form, rules)) return;
  busy(true);
  let order;
  try {
    [order] = await Promise.all([api("/api/checkout/create-order", { items: payload(), customer: customer() }), loadRazorpay()]);
  } catch (err) {
    busy(false);
    showError(err.message);
    return;
  }
  sessionStorage.setItem("ovr_last_ref", order.ref);
  const rzp = new window.Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name: "Ovenroma Bakers",
    description: "Order " + order.ref,
    prefill: order.prefill,
    notes: { order_ref: order.ref },
    theme: { color: "#3B2416" },
    handler: async (resp) => {
      try {
        await api("/api/checkout/verify", { ref: order.ref, ...resp });
        clearCart();
        location.href = "/order/" + order.ref;
      } catch (err) {
        busy(false);
        showError("We couldn't confirm your payment automatically. If money was deducted, please don't pay again — message us on WhatsApp with order reference " + order.ref + ".");
      }
    },
    modal: {
      ondismiss: () => {
        busy(false);
        api("/api/checkout/failed", { ref: order.ref, reason: "cancelled" }).catch(() => {});
        toast("Checkout cancelled — your cart is saved.");
      },
    },
  });
  rzp.on("payment.failed", (resp) => {
    const reason = (resp && resp.error && resp.error.description) || "Payment failed";
    busy(false);
    api("/api/checkout/failed", { ref: order.ref, reason }).catch(() => {});
    showError("Payment failed: " + reason + ". Your cart is saved — please try again.");
  });
  rzp.open();
});

waBtn.addEventListener("click", async () => {
  showError("");
  if (!quote) return;
  if (!validateForm(form, rules)) return;
  const c = customer();
  const pre = window.open("", "_blank");
  busy(true);
  try {
    const res = await api("/api/checkout/whatsapp", { items: payload(), customer: c });
    sessionStorage.setItem("ovr_last_ref", res.ref);
    openWhatsApp(waUrl(document.body.dataset.wa, cartMessage(res.quote, c, res.ref)), pre);
    clearCart();
    location.href = "/order/" + res.ref;
  } catch (err) {
    if (pre) pre.close();
    busy(false);
    showError(err.message);
  }
});

loadQuote();

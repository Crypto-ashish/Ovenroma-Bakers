// Order confirmation: clear the cart once the order that came from this
// browser's checkout is confirmed (paid or sent via WhatsApp).
import { clearCart } from "./lib/cart.js";

const card = document.querySelector("[data-order-status]");
const ref = document.querySelector("[data-order-ref]")?.textContent;
try {
  if (card && ["paid", "whatsapp"].includes(card.dataset.orderStatus) && sessionStorage.getItem("ovr_last_ref") === ref) {
    clearCart();
    sessionStorage.removeItem("ovr_last_ref");
  }
} catch { /* storage unavailable */ }

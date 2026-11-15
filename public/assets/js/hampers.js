// Festival hampers: per-hamper WhatsApp enquiry and the build-your-own builder.
import { rupees } from "./lib/format.js";
import { api, validateForm, formValues, phoneRule, emailRule, futureDateRule, openWhatsApp } from "./lib/ui.js";
import { waUrl, hamperMessage, builderMessage } from "./lib/wa.js";

// ---- hamper cards: WhatsApp enquiry with the chosen customisation
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-hamper-wa]");
  if (!btn) return;
  const form = btn.closest("[data-hamper-form]");
  const data = JSON.parse(form.dataset.cartItem);
  const h = {
    name: data.name,
    qty: Number(form.querySelector("[data-qty] input").value) || 1,
    packaging: form.querySelector("[data-packaging]").value,
    message: form.querySelector("[data-message]").value.trim(),
    url: location.origin + "/product/" + data.slug,
  };
  openWhatsApp(waUrl(document.body.dataset.wa, hamperMessage(h)));
});

// ---- builder
const builder = document.querySelector("[data-builder]");
if (builder) {
  const errBox = builder.querySelector("[data-builder-error]");
  const status = builder.querySelector("[data-form-status]");

  function selection() {
    const items = [];
    builder.querySelectorAll("[data-builder-item]").forEach((li) => {
      const qty = Math.max(0, Math.min(50, Math.round(Number(li.querySelector("input").value) || 0)));
      li.classList.toggle("is-picked", qty > 0);
      if (qty > 0) items.push({ slug: li.dataset.builderItem, name: li.dataset.name, qty, price: li.dataset.price === "" ? null : Number(li.dataset.price) });
    });
    const hampers = Math.max(1, Math.round(Number(builder.elements.hampers.value) || 1));
    const allPriced = items.length && items.every((i) => i.price !== null);
    const perHamper = items.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
    return { items, hampers, estimate: allPriced ? perHamper * hampers : null, partial: perHamper * hampers };
  }

  function update() {
    const s = selection();
    builder.querySelector("[data-b-items]").textContent = s.items.reduce((n, i) => n + i.qty, 0);
    builder.querySelector("[data-b-estimate]").textContent = s.estimate !== null && s.items.length
      ? rupees(s.estimate)
      : s.partial ? rupees(s.partial) + " + items on request" : "—";
  }
  builder.addEventListener("input", update);
  builder.addEventListener("change", update);
  update();

  function collect() {
    errBox.hidden = true;
    status.textContent = "";
    const s = selection();
    if (!s.items.length) {
      errBox.textContent = "Please choose at least one product for your hamper.";
      errBox.hidden = false;
      builder.querySelector(".builder-products").scrollIntoView({ behavior: "smooth" });
      return null;
    }
    if (!validateForm(builder, { phone: phoneRule, email: emailRule, date: futureDateRule })) return null;
    const v = formValues(builder);
    return {
      s,
      body: { type: "custom-hamper", items: s.items.map((i) => ({ slug: i.slug, qty: i.qty })), packaging: v.packaging, message: v.message, hampers: s.hampers, bulk: v.bulk, date: v.date, city: v.city, customer: { name: v.name, phone: v.phone, email: v.email } },
      msg: { ...v, items: s.items, hampers: s.hampers, estimate_paise: s.estimate },
    };
  }

  builder.addEventListener("submit", async (e) => {
    e.preventDefault();
    const c = collect();
    if (!c) return;
    const btn = builder.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      await api("/api/enquiries", c.body);
      status.className = "form-status ok";
      status.textContent = "Thank you! Your customised hamper request has been received. We'll send your quotation shortly.";
    } catch (err) {
      status.className = "form-status bad";
      status.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  builder.querySelector("[data-builder-wa]").addEventListener("click", () => {
    const c = collect();
    if (!c) return;
    openWhatsApp(waUrl(document.body.dataset.wa, builderMessage(c.msg)));
    api("/api/enquiries", c.body, { keepalive: true })
      .then(() => { status.className = "form-status ok"; status.textContent = "Request saved — please send the WhatsApp message to get your quotation."; })
      .catch((err) => { status.className = "form-status bad"; status.textContent = err.message; });
  });
}

// Langar & Bhandara bulk order calculator + WhatsApp enquiry.
import { computeBulk } from "./lib/bulk-calc.js";
import { rupees, fmtQty } from "./lib/format.js";
import { api, esc, validateForm, formValues, phoneRule, futureDateRule, openWhatsApp } from "./lib/ui.js";
import { waUrl, bulkMessage } from "./lib/wa.js";

const root = document.querySelector("[data-bulk]");
const config = JSON.parse(root.dataset.bulk);
const linesBox = root.querySelector("[data-biscuit-lines]");
const tpl = root.querySelector("[data-biscuit-tpl]");
const form = document.querySelector("[data-bulk-form]");
const errBox = form.querySelector("[data-bulk-error]");
const status = form.querySelector("[data-form-status]");
const UNIT = { dozen: "dozen", piece: "pcs", kg: "kg" };

function addBiscuitLine(focus = false) {
  const li = tpl.content.firstElementChild.cloneNode(true);
  // Default the new line to the first variety not already chosen.
  const used = new Set([...linesBox.querySelectorAll("[data-variety]")].map((s) => s.value));
  const next = config.varieties.find((v) => !used.has(v));
  if (next && linesBox.children.length) li.querySelector("[data-variety]").value = next;
  linesBox.append(li);
  if (focus) li.querySelector("[data-variety]").focus();
  update();
}

function state() {
  const qty = {};
  root.querySelectorAll("[data-calc-row]").forEach((row) => { qty[row.dataset.calcRow] = row.querySelector("[data-qty-input]").value; });
  const biscuits = [...linesBox.children].map((li) => ({ variety: li.querySelector("[data-variety]").value, kg: li.querySelector("[data-kg]").value }));
  return { qty, biscuits };
}

let current = { lines: [], total_paise: 0, errors: [], items: [] };
function update() {
  const st = state();
  current = computeBulk(config, st);
  // Per-row subtotals
  root.querySelectorAll("[data-calc-row]").forEach((row) => {
    const l = current.lines.find((x) => x.id === row.dataset.calcRow);
    row.querySelector("[data-sub]").textContent = rupees(l ? l.line_paise : 0);
  });
  const biscuit = config.products.find((p) => p.varieties);
  [...linesBox.children].forEach((li, index) => {
    const b = st.biscuits[index];
    const kg = Number(b.kg) || 0;
    const err = current.errors.find((e) => e.index === index);
    li.classList.toggle("has-error", !!err);
    li.querySelector("[data-sub]").textContent = rupees(err || !biscuit ? 0 : Math.round(biscuit.price_paise * kg));
    li.querySelector("[data-remove]").hidden = linesBox.children.length === 1;
  });
  // Summary
  const box = root.querySelector("[data-sum-lines]");
  const errs = current.errors.map((e) => `<li class="cl-warn">${esc(e.message)}</li>`).join("");
  box.innerHTML = current.lines.length || errs
    ? current.lines.map((l) => `<li><span>${esc(l.variety ? l.name + " – " + l.variety : l.name)}<br><small>${fmtQty(l.qty)} ${UNIT[l.unit] || l.unit} × ${rupees(l.unit_paise)}</small></span><strong>${rupees(l.line_paise)}</strong></li>`).join("") + errs
    : `<li class="muted">No products added yet.</li>`;
  root.querySelector("[data-grand]").textContent = rupees(current.total_paise);
}

root.addEventListener("input", update);
root.addEventListener("change", update);
root.querySelector("[data-add-biscuit]").addEventListener("click", () => addBiscuitLine(true));
linesBox.addEventListener("click", (e) => {
  const rm = e.target.closest("[data-remove]");
  if (rm && linesBox.children.length > 1) { rm.closest("li").remove(); update(); }
});
root.querySelector("[data-reset]").addEventListener("click", () => {
  root.querySelectorAll("[data-qty-input]").forEach((i) => (i.value = ""));
  linesBox.innerHTML = "";
  addBiscuitLine();
  errBox.hidden = true;
  status.textContent = "";
});

function showError(msg) {
  errBox.textContent = msg;
  errBox.hidden = !msg;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  showError("");
  status.textContent = "";
  update();
  if (current.errors.length) { showError(current.errors[0].message); root.scrollIntoView({ behavior: "smooth" }); return; }
  if (!current.lines.length) { showError("Please add at least one product to your order using the calculator above."); root.scrollIntoView({ behavior: "smooth" }); return; }
  if (!validateForm(form, { phone: phoneRule, event_date: futureDateRule })) return;
  const c = formValues(form);
  // Open WhatsApp straight away (inside the click) so pop-up blockers allow it,
  // and save the enquiry for the admin panel in parallel.
  openWhatsApp(waUrl(document.body.dataset.wa, bulkMessage(c, current)));
  api("/api/enquiries", { type: "bulk", items: current.items, customer: c }, { keepalive: true })
    .then(() => { status.className = "form-status ok"; status.textContent = "Thank you! Your enquiry has been sent — please send the WhatsApp message so our team can confirm."; })
    .catch((err) => { status.className = "form-status bad"; status.textContent = err.message; });
});

addBiscuitLine();

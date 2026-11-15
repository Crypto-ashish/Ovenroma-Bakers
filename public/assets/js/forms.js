// Generic enquiry forms: contact page and corporate gifting.
import { api, validateForm, formValues, phoneRule, emailRule, futureDateRule } from "./lib/ui.js";

document.querySelectorAll("[data-enquiry-form]").forEach((form) => {
  const type = form.dataset.enquiryForm;
  const status = form.querySelector("[data-form-status]");
  const btn = form.querySelector("[type=submit]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    if (!validateForm(form, { phone: phoneRule, email: emailRule, date: futureDateRule })) return;
    btn.disabled = true;
    try {
      await api("/api/enquiries", { type, customer: formValues(form) });
      form.reset();
      status.className = "form-status ok";
      status.textContent = type === "corporate"
        ? "Thank you! Our gifting team will contact you with a tailored quotation."
        : "Thank you! We've received your message and will get back to you soon.";
    } catch (err) {
      status.className = "form-status bad";
      status.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
});

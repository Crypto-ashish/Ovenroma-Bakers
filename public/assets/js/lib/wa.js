// WhatsApp deep links + message builders (pure; unit tested).
import { rupees, fmtQty, formatDate } from "./format.js";

export function waUrl(number, text) {
  const digits = String(number || "").replace(/\D/g, "");
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
}

const UNIT = { dozen: "dozen", piece: "pcs", kg: "kg" };

export function bulkMessage(c, calc) {
  const out = [
    "*Bulk Order Enquiry — Ovenroma Bakers*",
    "",
    "*Customer details*",
    "Name: " + c.name,
    "Mobile: " + c.phone,
    "Event: " + c.event_name,
    "Event date: " + formatDate(c.event_date),
    "Delivery location: " + c.location,
    "Delivery address: " + c.address,
  ];
  if (c.people) out.push("Number of people: " + c.people);
  out.push("", "*Order*");
  for (const l of calc.lines) {
    const label = l.variety ? l.name + " – " + l.variety : l.name;
    out.push("• " + label + ": " + fmtQty(l.qty) + " " + (UNIT[l.unit] || l.unit) + " × " + rupees(l.unit_paise) + "/" + l.unit + " = " + rupees(l.line_paise));
  }
  out.push("", "*Grand total: " + rupees(calc.total_paise) + "*");
  if (c.notes) out.push("", "Special instructions: " + c.notes);
  out.push("", "Please confirm availability, delivery charges and final arrangements. Thank you!");
  return out.join("\n");
}

export function cartMessage(quote, customer, ref) {
  const out = ["*New Order — Ovenroma Bakers*"];
  if (ref) out.push("Order ref: " + ref);
  out.push("");
  for (const l of quote.lines) {
    let s = "• " + l.name + (l.variant_label ? " (" + l.variant_label + ")" : "") + " × " + l.qty + " = " + rupees(l.line_paise);
    if (l.packaging) s += "\n   Packaging: " + l.packaging;
    if (l.message) s += "\n   Message: \"" + l.message + "\"";
    out.push(s);
  }
  out.push("", "Subtotal: " + rupees(quote.subtotal_paise));
  out.push("Delivery: " + (quote.shipping_paise ? rupees(quote.shipping_paise) : "Free / to be confirmed"));
  out.push("*Total: " + rupees(quote.total_paise) + "*");
  if (customer) {
    out.push("", "*Deliver to*", customer.name + " (" + customer.phone + ")", customer.address + ", " + customer.city + " - " + customer.pincode);
    if (customer.notes) out.push("Notes: " + customer.notes);
  }
  return out.join("\n");
}

export function hamperMessage(h) {
  const out = ["*Hamper Enquiry — Ovenroma Bakers*", "", "Hamper: " + h.name, "Quantity: " + h.qty];
  if (h.packaging) out.push("Packaging: " + h.packaging);
  if (h.message) out.push("Personalised message: \"" + h.message + "\"");
  if (h.url) out.push(h.url);
  out.push("", "Please share the price and availability. Thank you!");
  return out.join("\n");
}

export function builderMessage(b) {
  const out = ["*Customised Hamper Request — Ovenroma Bakers*", "", "*Products per hamper*"];
  for (const i of b.items) out.push("• " + i.name + " × " + i.qty);
  out.push("", "Packaging: " + (b.packaging || "To be suggested"));
  out.push("Number of hampers: " + b.hampers + (b.bulk ? " (bulk / corporate gifting)" : ""));
  if (b.message) out.push("Personalised message: \"" + b.message + "\"");
  if (b.date) out.push("Needed by: " + formatDate(b.date));
  if (b.city) out.push("Delivery: " + b.city);
  if (b.estimate_paise) out.push("Estimated product value: " + rupees(b.estimate_paise) + " (before packaging & delivery)");
  out.push("", "Name: " + b.name, "Mobile: " + b.phone);
  if (b.email) out.push("Email: " + b.email);
  out.push("", "Please send me a customised quotation. Thank you!");
  return out.join("\n");
}

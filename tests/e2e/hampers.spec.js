import { test, expect } from "@playwright/test";
import { captureWindowOpen, openedUrls } from "./helpers.js";

test("hamper card customisation goes into the WhatsApp enquiry", async ({ page }) => {
  await captureWindowOpen(page);
  await page.goto("/festival-hampers");
  for (const id of ["diwali", "christmas", "new-year", "rakhi", "wedding", "corporate", "birthday", "custom"]) await expect(page.locator("#" + id)).toBeAttached();
  const card = page.locator('[data-hamper="diwali-celebration-hamper"]');
  await card.locator("summary").click();
  await card.locator("[data-packaging]").selectOption("Premium rigid gift box");
  await card.locator("[data-message]").fill("Happy Diwali, Sharma family!");
  await card.locator("[data-inc]").click();
  await card.locator("[data-hamper-wa]").click();
  const msg = decodeURIComponent((await openedUrls(page))[0].split("text=")[1]);
  expect(msg).toContain("Diwali Celebration Hamper");
  expect(msg).toContain("Quantity: 2");
  expect(msg).toContain("Premium rigid gift box");
  expect(msg).toContain("Happy Diwali, Sharma family!");
});

test("build-your-own hamper: estimate, validation and quotation request", async ({ page }) => {
  await page.goto("/festival-hampers#build-your-own");
  const b = page.locator("[data-builder]");
  await b.locator('[data-builder-item="vanilla-muffins"] [data-inc]').click();
  await b.locator('[data-builder-item="vanilla-muffins"] [data-inc]').click();
  await b.locator('[data-builder-item="golgappa"] [data-inc]').click();
  await b.locator("#bo-count").fill("3");
  await expect(b.locator("[data-b-items]")).toHaveText("3");
  await expect(b.locator("[data-b-estimate]")).toHaveText("₹870"); // (2×₹5 + ₹280) × 3
  await b.locator("[type=submit]").click();
  await expect(b.locator(".field-msg").first()).toBeVisible();
  await b.locator("#bo-pack").selectOption("Eco kraft gift box");
  await b.locator("#bo-msg").fill("Thank you for being with us!");
  await b.locator("[name=bulk]").check();
  await b.locator("#bo-name").fill("Priya Test");
  await b.locator("#bo-phone").fill("9812345678");
  const resP = page.waitForResponse((r) => r.url().endsWith("/api/enquiries"));
  await b.locator("[type=submit]").click();
  const res = await resP;
  expect(res.status()).toBe(200);
  expect((await res.json()).estimate_paise).toBe(87000);
  await expect(b.locator("[data-form-status]")).toContainText("Thank you");
});

test("corporate gifting enquiry form", async ({ page }) => {
  await page.goto("/festival-hampers#corporate-gifting");
  const f = page.locator('[data-enquiry-form="corporate"]');
  await f.locator("[type=submit]").click();
  await expect(f.locator(".field-msg").first()).toBeVisible();
  await f.locator("#cg-company").fill("Acme Pvt Ltd");
  await f.locator("#cg-name").fill("Rohit Test");
  await f.locator("#cg-phone").fill("9811111111");
  await f.locator("#cg-email").fill("rohit@acme.example");
  await f.locator("#cg-qty").fill("150");
  await f.locator("[type=submit]").click();
  await expect(f.locator("[data-form-status]")).toContainText("tailored quotation");
});

test("contact form", async ({ page }) => {
  await page.goto("/contact");
  await page.fill("#c-name", "Neha Test");
  await page.fill("#c-phone", "9822222222");
  await page.fill("#c-message", "Do you deliver to Noida?");
  await page.click("[data-enquiry-form] [type=submit]");
  await expect(page.locator("[data-form-status]")).toContainText("Thank you");
});

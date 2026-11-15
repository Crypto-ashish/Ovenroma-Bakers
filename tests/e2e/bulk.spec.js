import { test, expect } from "@playwright/test";
import { captureWindowOpen, openedUrls, collectErrors } from "./helpers.js";

test("bulk calculator: worked example, multiple biscuit varieties, reset, WhatsApp enquiry", async ({ page }) => {
  const errors = collectErrors(page);
  await captureWindowOpen(page);
  await page.goto("/langar-bhandara-bulk-orders");
  await expect(page.locator(".price-table")).toContainText("₹20");
  await page.fill('[data-calc-row="kulcha"] input', "10");
  await page.fill('[data-calc-row="veg-patties"] input', "100");
  await page.fill('[data-calc-row="cupcakes"] input', "100");
  const lines = page.locator("[data-biscuit-lines] li");
  await lines.nth(0).locator("[data-variety]").selectOption("Chocochip Cookies");
  await lines.nth(0).locator("[data-kg]").fill("3");
  await page.click("[data-add-biscuit]");
  await lines.nth(1).locator("[data-variety]").selectOption("Butter Masala Biscuits");
  await lines.nth(1).locator("[data-kg]").fill("2");
  await expect(page.locator('[data-calc-row="kulcha"] [data-sub]')).toHaveText("₹200");
  await expect(page.locator('[data-calc-row="veg-patties"] [data-sub]')).toHaveText("₹800");
  await expect(page.locator('[data-calc-row="cupcakes"] [data-sub]')).toHaveText("₹300");
  await expect(lines.nth(0).locator("[data-sub]")).toHaveText("₹540");
  await expect(lines.nth(1).locator("[data-sub]")).toHaveText("₹360");
  await expect(page.locator("[data-grand]")).toHaveText("₹2,200");

  // submit without details → validation
  await page.click("[data-bulk-form] [type=submit]");
  await expect(page.locator("[data-bulk-form] .field-msg").first()).toBeVisible();
  await page.fill("#b-name", "Guru Nanak Seva Society");
  await page.fill("#b-phone", "9876543210");
  await page.fill("#b-event", "Gurpurab Langar");
  const d = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  await page.fill("#b-date", d);
  await page.fill("#b-location", "Model Town, Delhi");
  await page.fill("#b-address", "Gurudwara Sahib, Block B, Model Town");
  await page.fill("#b-people", "800");
  await page.fill("#b-notes", "Deliver by 9 am");
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/enquiries") && r.status() === 200);
  await page.click("[data-bulk-form] [type=submit]");
  const body = await (await saved).json();
  expect(body.total_paise).toBe(220000);
  const [url] = await openedUrls(page);
  expect(url).toMatch(/^https:\/\/wa\.me\/\d*\?text=/);
  const msg = decodeURIComponent(url.split("text=")[1]);
  for (const s of ["Guru Nanak Seva Society", "9876543210", "Gurpurab Langar", "Model Town, Delhi", "Gurudwara Sahib, Block B", "Number of people: 800",
    "Kulcha: 10 dozen × ₹20/dozen = ₹200", "Veg Patties: 100 pcs × ₹8/piece = ₹800", "Cupcakes: 100 pcs × ₹3/piece = ₹300",
    "Biscuits – Chocochip Cookies: 3 kg × ₹180/kg = ₹540", "Biscuits – Butter Masala Biscuits: 2 kg × ₹180/kg = ₹360", "Grand total: ₹2,200", "Deliver by 9 am"]) {
    expect(msg).toContain(s);
  }
  await expect(page.locator("[data-bulk-form] [data-form-status]")).toContainText("Thank you");

  await page.click("[data-reset]");
  await expect(page.locator("[data-grand]")).toHaveText("₹0");
  await expect(lines).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("bulk calculator flags a biscuit quantity without a variety", async ({ page }) => {
  await page.goto("/langar-bhandara-bulk-orders");
  await page.locator("[data-biscuit-lines] li [data-kg]").fill("2");
  await expect(page.locator("[data-sum-lines]")).toContainText("Choose a biscuit variety");
  await expect(page.locator("[data-grand]")).toHaveText("₹0");
});

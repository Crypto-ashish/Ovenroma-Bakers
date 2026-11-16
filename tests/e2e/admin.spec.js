import { test, expect } from "@playwright/test";
import { adminLogin } from "./helpers.js";

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows run once, on desktop");

test("admin API requires auth and CSRF", async ({ request }) => {
  expect((await request.get("/api/admin/products")).status()).toBe(401);
  expect((await request.patch("/api/admin/products/1", { data: { price: 1 } })).status()).toBe(401);
  const bad = await request.post("/api/admin/login", { data: { username: "admin", password: "wrong-password" } });
  expect(bad.status()).toBe(401);
});

test("admin sets a price → product becomes buyable on the site, then reverts", async ({ page, request }) => {
  await adminLogin(page);
  await page.goto("/admin#products");
  const row = page.locator("tr", { hasText: "Chakli" });
  await row.locator("[data-quick=price]").fill("135");
  await row.locator("[data-quick=price]").press("Enter");
  await expect(page.locator(".flash")).toContainText("Saved");
  const shop = await page.context().newPage();
  await shop.goto("/product/chakli");
  await expect(shop.locator(".pp-price .price")).toHaveText("₹135");
  await expect(shop.locator(".pp-info [data-add-to-cart]")).toBeVisible();
  // CSRF: a write with the session cookie but no token is refused
  const forged = await page.request.patch("/api/admin/products/1", { data: { price: 1 }, headers: { Origin: "http://localhost:8787" } });
  expect(forged.status()).toBe(403);
  await row.locator("[data-quick=price]").fill("");
  await row.locator("[data-quick=price]").press("Enter");
  await expect(page.locator(".flash").last()).toContainText("Saved");
  await shop.reload();
  await expect(shop.locator(".pp-price .price-request")).toBeVisible();
});

test("admin edits a product, hamper price and WhatsApp number", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin#hampers");
  await page.locator("tr", { hasText: "Rakhi Sweet Hamper" }).getByText("Edit").click();
  await page.fill("input[name=price]", "899");
  await page.fill("input[name=short]", "A cheerful Rakhi basket of cookies and savouries.");
  await page.click("button[type=submit]");
  await expect(page.locator(".flash")).toContainText("Saved");
  await page.goto("/festival-hampers");
  const card = page.locator('[data-hamper="rakhi-sweet-hamper"]');
  await expect(card.locator(".price")).toHaveText("₹899");
  await expect(card.locator("[data-add-to-cart]")).toBeVisible();

  await page.goto("/admin#settings");
  await page.fill("input[name=whatsapp]", "91 98765 43210");
  await page.locator('[data-setting="store"] button').click();
  await expect(page.locator(".flash")).toContainText("Saved");
  await page.goto("/");
  await expect(page.locator(".wa-float")).toHaveAttribute("href", /^https:\/\/wa\.me\/919876543210\?text=/);

  // revert so other runs start clean
  await page.goto("/admin#settings");
  await page.fill("input[name=whatsapp]", "");
  await page.locator('[data-setting="store"] button').click();
  await expect(page.locator(".flash")).toContainText("Saved");
  await page.goto("/admin#hampers");
  await page.locator("tr", { hasText: "Rakhi Sweet Hamper" }).locator("[data-quick=price]").fill("");
  await page.locator("tr", { hasText: "Rakhi Sweet Hamper" }).locator("[data-quick=price]").press("Enter");
  await expect(page.locator(".flash").last()).toContainText("Saved");
});

test("admin sees orders and bulk enquiries, picks a photo from the library", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin#enquiries");
  await expect(page.locator("details.order").first()).toBeVisible();
  await page.goto("/admin#orders");
  await expect(page.locator("[data-list]")).not.toContainText("Loading");
  // choose a photo from the GitHub photo library in the product editor
  await page.goto("/admin#products");
  await page.locator("tr", { hasText: "Mathi" }).getByText("Edit").click();
  await page.click("[data-img-pick]");
  await page.fill("dialog.picker [data-ps]", "boondi");
  await page.click('dialog.picker [data-pick="/assets/images/products/boondi.webp"]');
  await expect(page.locator("[data-img-url]")).toHaveValue("/assets/images/products/boondi.webp");
  // uploads and arbitrary image URLs are refused server-side
  const csrf = await page.evaluate(async () => (await (await fetch("/api/admin/session")).json()).csrf);
  const bad = await page.request.put("/api/admin/products/1", { headers: { "X-CSRF-Token": csrf, Origin: "http://localhost:8787" }, data: { name: "X Test", category: "biscuits-cookies", image: "https://evil.example/x.webp" } });
  expect(bad.status()).toBe(400);
  expect((await page.request.post("/api/admin/upload", { headers: { "X-CSRF-Token": csrf, Origin: "http://localhost:8787" } })).status()).toBe(404);
  // Razorpay connection check (against the local mock with the test keys)
  await page.goto("/admin#dashboard");
  await page.click("[data-pay-check]");
  await expect(page.locator("[data-pay-result]")).toContainText("Razorpay accepted the key id and secret");
  await page.click("[data-logout]");
  await expect(page.locator("h1")).toHaveText("Sign in");
});

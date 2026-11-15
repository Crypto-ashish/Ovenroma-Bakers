import { test, expect } from "@playwright/test";
import { collectErrors, stubRazorpay, sign, captureWindowOpen, openedUrls, CUSTOMER } from "./helpers.js";

async function fillCheckout(page) {
  for (const [k, v] of Object.entries(CUSTOMER)) await page.fill(`#co-${k}`, v);
}

test("shop filters and search", async ({ page }) => {
  await page.goto("/shop");
  const visible = () => page.locator("[data-grid] [data-product]:visible");
  const all = await visible().count();
  expect(all).toBeGreaterThanOrEqual(30);
  await page.click('[data-cat="namkeen-savouries"]');
  await expect(visible()).toHaveCount(7);
  await page.click('[data-cat=""]');
  await page.fill("[data-search]", "kulcha");
  await expect(visible()).toHaveCount(3); // 2 kulchas + veg patties (Kulcha & Bakery)
  await page.fill("[data-search]", "");
  await page.check("[data-priced]");
  await expect(visible().first()).toBeVisible();
  expect(await visible().count()).toBeLessThan(all);
});

test("cart: add, change quantity, remove; server totals", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/product/golgappa");
  await page.click("[data-inc]");
  await page.click("[data-add-to-cart]");
  await expect(page.locator("[data-cart-count]")).toHaveText("2");
  await page.goto("/shop/muffins-cupcakes");
  const card = page.locator('[data-product="vanilla-muffins"]');
  await card.locator("[data-qty] input").fill("4");
  await card.locator("[data-add-to-cart]").click();
  await expect(page.locator("[data-cart-count]")).toHaveText("6");
  // drawer
  await page.click("[data-cart-open]");
  await expect(page.locator("[data-drawer]")).toHaveClass(/is-open/);
  await expect(page.locator("[data-drawer-subtotal]")).toHaveText("₹580");
  await page.keyboard.press("Escape");
  // cart page uses the server quote
  await page.goto("/cart");
  await expect(page.locator("[data-sum-total]")).toHaveText("₹580");
  const muffinLine = page.locator(".cart-line", { hasText: "Vanilla" });
  await muffinLine.locator("[data-inc]").click();
  await expect(page.locator("[data-sum-total]")).toHaveText("₹585");
  await muffinLine.locator("[data-line-remove]").click();
  await expect(page.locator("[data-sum-total]")).toHaveText("₹560");
  await expect(page.locator(".cart-line")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("unpriced products offer WhatsApp enquiry instead of Add to Cart", async ({ page }) => {
  await page.goto("/product/papri");
  await expect(page.locator(".pp-price .price-request")).toHaveText("Price on request");
  await expect(page.locator(".pp-info [data-add-to-cart]")).toHaveCount(0);
  await expect(page.locator(".pp-info [data-wa-enquiry]")).toHaveAttribute("href", /^https:\/\/wa\.me\/\d*\?text=.*Papri/);
});

test("checkout: Razorpay test payment verified server-side, order saved and shown", async ({ page }) => {
  await stubRazorpay(page);
  await page.goto("/product/golgappa");
  await page.click("[data-buy-now]");
  await page.waitForURL("**/checkout");
  await expect(page.locator("[data-sum-total]")).toHaveText("₹280");
  // validation
  await page.click("[data-pay]");
  await expect(page.locator(".field-msg").first()).toBeVisible();
  await fillCheckout(page);
  await page.click("[data-pay]");
  await page.waitForFunction(() => window.__rzp && window.__rzp.opened);
  const opts = await page.evaluate(() => window.__rzp.opts);
  expect(opts.amount).toBe(28000);
  expect(opts.key).toBe("rzp_test_E2Elocal000");
  expect(opts.order_id).toMatch(/^order_/);
  const pay = "pay_E2E" + Date.now();
  await page.evaluate(({ o, p, s }) => window.__rzp.opts.handler({ razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: s }), { o: opts.order_id, p: pay, s: sign(opts.order_id, pay) });
  await page.waitForURL(/\/order\/OVR-/);
  await expect(page.locator("[data-order-status]")).toHaveAttribute("data-order-status", "paid");
  await expect(page.locator("[data-payment-id]")).toHaveText(pay);
  await expect(page.locator("[data-order-total]")).toHaveText("₹280");
  await expect(page.locator("[data-cart-count]")).toBeHidden();
});

test("checkout: forged signature is rejected and payment failure keeps the cart", async ({ page, request }) => {
  await stubRazorpay(page);
  await page.goto("/product/vanilla-muffins");
  await page.click("[data-add-to-cart]");
  await page.goto("/checkout");
  await fillCheckout(page);
  await page.click("[data-pay]");
  await page.waitForFunction(() => window.__rzp && window.__rzp.opened);
  const opts = await page.evaluate(() => window.__rzp.opts);
  await page.evaluate((o) => window.__rzp.opts.handler({ razorpay_order_id: o, razorpay_payment_id: "pay_FAKE1", razorpay_signature: "0".repeat(64) }), opts.order_id);
  await expect(page.locator("[data-checkout-error]")).toContainText("don't pay again");
  await page.evaluate(() => window.__rzp.handlers["payment.failed"]({ error: { description: "Card declined by bank" } }));
  await expect(page.locator("[data-checkout-error]")).toContainText("Card declined by bank");
  await expect(page.locator("[data-cart-count]")).toHaveText("1");
  // the API refuses tampered amounts: the client cannot set prices
  const r = await request.post("/api/cart/quote", { data: { items: [{ slug: "vanilla-muffins", qty: 2, price: 1 }] } });
  expect((await r.json()).quote.total_paise).toBe(1000);
});

test("checkout via WhatsApp saves the order and opens a prefilled message", async ({ page }) => {
  await captureWindowOpen(page);
  await page.goto("/product/golgappa");
  await page.click("[data-buy-now]");
  await fillCheckout(page);
  await page.click("[data-checkout-wa]");
  await page.waitForURL(/\/order\/OVR-/);
  await expect(page.locator("[data-order-status]")).toHaveAttribute("data-order-status", "whatsapp");
});

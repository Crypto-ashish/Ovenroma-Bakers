import { test, expect } from "@playwright/test";
import { collectErrors } from "./helpers.js";

const PAGES = ["/", "/shop", "/shop/biscuits-cookies", "/shop/muffins-cupcakes", "/shop/kulcha-bakery", "/shop/namkeen-savouries", "/shop/gluten-free-flours",
  "/gluten-free", "/langar-bhandara-bulk-orders", "/festival-hampers", "/about", "/contact", "/cart", "/checkout",
  "/privacy-policy", "/shipping-policy", "/refund-policy", "/terms", "/product/chocolate-muffins", "/product/veg-patties"];

for (const path of PAGES) {
  test(`${path} renders with SEO tags, images and no JS errors`, async ({ page }) => {
    const errors = collectErrors(page);
    const broken = [];
    page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith("http://localhost")) broken.push(r.status() + " " + r.url()); });
    const res = await page.goto(path, { waitUntil: "networkidle" });
    expect(res.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    expect((await page.title()).length).toBeGreaterThan(10);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toMatch(/^http/);
    if (!["/cart", "/checkout"].includes(path)) await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(path === "/" ? "/$" : path + "$"));
    // every <img> has alt text and loaded
    await page.evaluate(async () => { for (const i of document.images) { i.loading = "eager"; } await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))); });
    const bad = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth || i.getAttribute("alt") === null).map((i) => i.src));
    expect(bad).toEqual([]);
    expect(broken).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("internal links all resolve (no broken links)", async ({ page, request }) => {
  const seen = new Set();
  for (const path of ["/", "/shop", "/festival-hampers", "/product/assorted-muffin-gift-box"]) {
    await page.goto(path);
    const hrefs = await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href").split("#")[0]));
    hrefs.forEach((h) => seen.add(h || "/"));
  }
  for (const h of seen) {
    const r = await request.get(h, { maxRedirects: 0 });
    expect(r.status(), h).toBeLessThan(400);
  }
});

test("sitemap, robots, structured data and security headers", async ({ request, page }) => {
  const sm = await (await request.get("/sitemap.xml")).text();
  for (const u of ["/shop", "/langar-bhandara-bulk-orders", "/festival-hampers", "/product/amritsari-kulcha", "/shop/namkeen-savouries"]) expect(sm).toContain(u + "</loc>");
  expect(await (await request.get("/robots.txt")).text()).toMatch(/Sitemap: http.*\/sitemap.xml/);
  const res = await page.goto("/product/golgappa");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  const ld = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)));
  const product = ld.find((x) => x["@type"] === "Product");
  expect(product.offers.price).toBe("280.00");
  expect(ld.some((x) => x["@type"] === "BreadcrumbList")).toBe(true);
  await page.goto("/");
  const home = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)));
  expect(home.some((x) => x["@type"] === "Bakery")).toBe(true);
});

test("404 page for unknown URLs", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("crumbled");
});

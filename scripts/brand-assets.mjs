// Renders brand images with the site's own fonts using the pre-installed
// Chromium: favicon PNGs, logo, the default Open Graph image and the
// "photo coming soon" tile for products without a catalogue photograph.
// Usage: node scripts/brand-assets.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("../public/", import.meta.url);
const font = (f) => "data:font/woff2;base64," + readFileSync(new URL("assets/fonts/" + f, root)).toString("base64");
const img = (f) => "data:image/webp;base64," + readFileSync(new URL("assets/images/" + f, root)).toString("base64");
const favicon = readFileSync(new URL("favicon.svg", root), "utf8");
const css = `@font-face{font-family:F;src:url(${font("fraunces-latin.woff2")})}@font-face{font-family:D;src:url(${font("dm-sans-latin.woff2")})}@font-face{font-family:C;src:url(${font("caveat-latin.woff2")})}
*{margin:0;box-sizing:border-box}body{font-family:D}`;

const pages = {
  "apple-touch-icon.png": [180, 180, `<div style="width:180px;height:180px;background:#3B2416;display:grid;place-items:center">${favicon.replace("<svg", '<svg width="150" height="150"')}</div>`],
  "logo-512.png": [512, 512, `<div style="width:512px;height:512px;background:#FBF5EC;display:grid;place-items:center">${favicon.replace("<svg", '<svg width="440" height="440"')}</div>`],
  "assets/images/site/og-default.png": [1200, 630, `<div style="width:1200px;height:630px;background:radial-gradient(700px 400px at 90% 0%,rgba(201,164,92,.35),transparent),linear-gradient(135deg,#3B2416,#24140a);display:flex;align-items:center;padding:0 70px;gap:50px;color:#fff">
    <div style="flex:1"><div style="font-family:F;font-size:76px;font-weight:700;letter-spacing:2px;line-height:1">OVENROMA</div><div style="font-size:22px;letter-spacing:14px;color:#C9A45C;font-weight:700;margin:10px 0 26px">BAKERS</div>
    <div style="font-family:C;font-size:44px;color:#ECD9B0;line-height:1.1">Freshly Baked Happiness,<br>Made for Every Occasion.</div>
    <div style="margin-top:28px;font-size:21px;color:#e5d3b8">Biscuits • Muffins • Kulcha • Namkeen • Gift Hampers • Bulk Orders</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;width:440px">${["products/assorted-muffin-gift-box-400.webp", "products/amritsari-kulcha-400.webp", "products/chocochip-cookies-400.webp", "products/veg-patties-400.webp"].map((f) => `<img src="${img(f)}" style="width:212px;height:212px;border-radius:22px;object-fit:cover;border:4px solid rgba(255,255,255,.12)">`).join("")}</div></div>`],
  "assets/images/products/golgappa.png": [800, 800, `<div style="width:800px;height:800px;background:radial-gradient(500px 400px at 50% 30%,#fff,#F5EBDC);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#3B2416;border:28px solid #FBF5EC">
    ${favicon.replace("<svg", '<svg width="130" height="130"')}
    <div style="font-family:F;font-size:44px;font-weight:700;letter-spacing:2px;margin-top:26px">OVENROMA</div><div style="font-size:16px;letter-spacing:10px;color:#B8702F;font-weight:700">BAKERS</div>
    <div style="font-family:F;font-size:96px;font-weight:600;margin:40px 0 6px">Golgappa</div>
    <div style="font-size:26px;color:#76604F">Gluten-free pani puri shells • Clear Box • 100g</div>
    <div style="font-family:C;font-size:38px;color:#B8702F;margin-top:34px">Photo coming soon</div></div>`],
};

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [out, [w, h, body]] of Object.entries(pages)) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><style>${css}</style>${body}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL(out, root).pathname, clip: { x: 0, y: 0, width: w, height: h } });
  console.log("wrote", out);
}
await browser.close();

// Convert to the web formats the site uses.
const py = `
from PIL import Image
r = "${new URL(".", root).pathname}"
Image.open(r + "assets/images/site/og-default.png").convert("RGB").save(r + "assets/images/site/og-default.jpg", "JPEG", quality=84, optimize=True, progressive=True)
g = Image.open(r + "assets/images/products/golgappa.png").convert("RGB")
g.save(r + "assets/images/products/golgappa.webp", "WEBP", quality=84)
g.save(r + "assets/images/products/golgappa.jpg", "JPEG", quality=82)
g.resize((400, 400), Image.LANCZOS).save(r + "assets/images/products/golgappa-400.webp", "WEBP", quality=82)
import os
os.remove(r + "assets/images/site/og-default.png"); os.remove(r + "assets/images/products/golgappa.png")
`;
execFileSync("python3", ["-c", py], { stdio: "inherit" });

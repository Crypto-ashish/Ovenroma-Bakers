# Ovenroma Bakers — website, shop & admin

*Freshly Baked Happiness, Made for Every Occasion.*

A complete e-commerce site for Ovenroma Bakers, built on the same stack as the
Gluten Free Delhi site: **Cloudflare Workers** (server-rendered pages + API),
**D1** (SQLite database for products, orders, enquiries and settings) and
**Razorpay** (payments). Product photos are stored in this GitHub repository, like the
Gluten Free Delhi site.

## What's included

| Area | Details |
|---|---|
| Pages | Home, Shop All, 5 category pages, Gluten-Free Range, product pages, Langar & Bhandara bulk orders, Festival Hampers, About, Contact, Cart, Checkout, Order confirmation, Shipping / Refund / Privacy / Terms, 404 |
| Catalogue | 33 products + 8 hampers from the two PDF catalogues, with photos cropped from the PDFs (`public/assets/images/products`) |
| Shop | Filters, search and sort; variants; quantity; Add to Cart; Buy Now; WhatsApp enquiry; cart drawer + cart page; server-side pricing |
| Checkout | Razorpay (order created server-side, signature verified server-side, webhook with idempotency) **or** order on WhatsApp. Orders saved in D1 |
| Bulk orders | Calculator (Kulcha ₹20/dozen, Veg Patties ₹8/piece, Biscuits ₹180/kg with any number of varieties, Cupcakes ₹3/piece), event form, WhatsApp message, enquiry saved for the admin |
| Hampers | 8 occasions, per-hamper customisation (packaging + message + quantity), build-your-own hamper with estimate, corporate gifting form |
| Admin (`/admin`) | Products & hampers (prices, photos, stock, variants, best sellers), categories, orders, enquiries, testimonials, homepage banners, WhatsApp number, delivery charges, bulk prices, packaging options, SEO |
| SEO | Unique titles/descriptions, canonical URLs, Open Graph, dynamic `sitemap.xml` (with images), `robots.txt`, Product / Bakery (LocalBusiness) / Breadcrumb / FAQ / ItemList schema, descriptive ALT text, WebP + lazy loading |
| Security | Strict CSP and security headers, scrypt-hashed admin password, httpOnly/Secure/SameSite=Strict session, CSRF token, login throttling, rate limits, no file uploads (photos come only from the repo), parameterised SQL, escaped HTML |

### Prices — please review
Only prices printed in the catalogues are set: **Vanilla Muffin ₹5** and **Golgappa ₹280**, plus the four
bulk prices. Every other product shows **“Price on request”** (WhatsApp enquiry) until you set a price in
**Admin → Products** (type in the price column and press Enter). Hamper prices are set the same way under
**Admin → Festival Hampers**. Delivery charge defaults to ₹0 — set it in **Admin → Settings**.

### Photos — please review
* Muffins, kulchas, veg patties, and the cookie / namkeen / flour photos come straight from the Ovenroma PDFs.
* 13 products have no photo in the PDFs (double chocochip, kaju butter, coconut, pista coconut, elaichi and
  butter masala cookies, mathi, boondi, healthy / multigrain / jowar / bajra / kuttu atta). They use the
  matching product photos from the Gluten Free Delhi repo, which show *Gluten Free Delhi* labels. Golgappa
  has a branded “photo coming soon” tile. Replace them as described in **Adding or changing photos** below.
* Hamper photos are the basket photos supplied with the brief (they show third-party biscuit brands).
* No testimonials are published: add real customer reviews in **Admin → Testimonials** (the homepage
  section appears automatically once one is active).

## Adding or changing photos

All photos live in `public/assets/images/` in this repository (no cloud storage).
Each photo has three files: `name.webp` (800×800), `name-400.webp` (cards) and `name.jpg` (social previews).

```bash
npm run add-photo -- ~/Downloads/new-rusk.jpg rusk-toast            # → products/rusk-toast.*
npm run add-photo -- ~/Downloads/diwali.jpg diwali-box --folder hampers
git add public/assets/images && git commit -m "Add rusk photo" && git push
```

After the push deploys, open **Admin → Products → Edit → Choose photo**, pick the new photo and Save.
The photo library list (`public/assets/images/manifest.json`) is rebuilt automatically on every build.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars          # then edit
npm run hash-password -- 'choose-a-long-password'   # paste output as ADMIN_PASSWORD_HASH
npm run db:migrate:local
npm run dev                              # http://localhost:8787  (admin: /admin, user "admin")
```

## Tests

```bash
npm run test:unit      # pricing, bulk calculator, WhatsApp messages, password hashing, escaping
npm run test:e2e       # Playwright, desktop + mobile, against wrangler dev
```

The e2e suite runs a local mock of the Razorpay Orders API (`tests/e2e/mock-razorpay.mjs`). Its
`.dev.vars` must contain:

```
ADMIN_PASSWORD_HASH=<hash of test-admin-password-123>
RAZORPAY_KEY_ID=rzp_test_E2Elocal000
RAZORPAY_KEY_SECRET=e2e_local_test_secret
RAZORPAY_WEBHOOK_SECRET=e2e_local_webhook_secret
RAZORPAY_API_BASE=http://127.0.0.1:8799
```

To try real Razorpay **test mode** locally instead, put your `rzp_test_…` key id/secret in `.dev.vars`
and remove `RAZORPAY_API_BASE`.

## Deploying to Cloudflare

Worker name **`ovenroma-bakers`**, D1 database **`ovenromabakers`**. `wrangler.jsonc` deliberately has
no `database_id`: wrangler finds the database by name in whichever account it deploys to, and creates it
on the first deploy. `npm run deploy` builds, deploys, then applies database migrations (tables + catalogue).

**Option A — Cloudflare dashboard (Workers Builds):** Workers & Pages → Create → Import a repository →
`Crypto-ashish/ovenroma-bakers`, branch `claude/dazzling-ritchie-tqpeka`, Worker name `ovenroma-bakers`,
build command `npm ci`, deploy command `npm run deploy`.

**Option B — your computer:** `npx wrangler login`, then `npm run deploy`.

Then (once):
1. Worker → Settings → Variables and Secrets → add **Secret** `ADMIN_PASSWORD_HASH`
   (create with `npm run hash-password -- 'your password'`), and **Secret** `RAZORPAY_KEY_SECRET`.
   Payments use the **same live Razorpay account as Gluten Free Delhi**: `RAZORPAY_KEY_ID` is
   `rzp_live_TyKq7VWeqBgvDY` (set in `wrangler.jsonc`), so `RAZORPAY_KEY_SECRET` must be that key's secret.
   Orders are labelled `store: Ovenroma Bakers` and receipts start with `OVR-` in the Razorpay dashboard.
   Optional: `RAZORPAY_WEBHOOK_SECRET` for a webhook to `/api/razorpay-webhook`.
   Secrets and dashboard variables are kept across deploys (`keep_vars`).
2. In `/admin` → Settings, set the WhatsApp number and prices.
3. Custom domain later: Worker → Settings → Domains & Routes → Add custom domain, then add a variable `SITE_URL` (e.g. `https://www.example.com`).
4. Submit `https://<domain>/sitemap.xml` in Google Search Console.

## Project layout

```
src/index.js            Worker: routing, security headers, sitemap/robots
src/api/public.js       cart quote, checkout, Razorpay verify/webhook, enquiries
src/api/admin.js        admin API (auth, products, orders, settings)
src/lib/                pricing, auth, db access, utilities
src/render/             server-rendered pages (escaped templates)
src/data/catalog.js     initial catalogue → npm run seed:gen → migrations/0002_seed.sql
public/assets/          CSS, browser JS, fonts, images
scripts/build-images.py re-extracts product photos from the PDF catalogues
scripts/brand-assets.mjs favicon, logo, Open Graph image
tests/                  unit + Playwright e2e
```

// Storefront pages. Each returns a page object for layout().
import { html, raw, dataJson } from "./html.js";
import {
  icon, productCard, productImg, priceLabel, badges, breadcrumbs, breadcrumbLd, sectionHead, waLink,
  isBuyable, cartData, vegMark,
} from "./components.js";
import { rupees, thumbOf, jpgOf } from "../lib/util.js";

const seoFor = (ctx, key) => ctx.settings.seo[key] || { title: "Ovenroma Bakers", description: "" };

export function organizationLd(ctx) {
  const s = ctx.settings.store;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "@id": ctx.origin + "/#bakery",
    name: "Ovenroma Bakers",
    slogan: s.tagline,
    url: ctx.origin + "/",
    image: ctx.origin + "/assets/images/site/og-default.jpg",
    logo: ctx.origin + "/logo-512.png",
    servesCuisine: "Indian bakery",
    priceRange: "₹",
  };
  if (s.phone) ld.telephone = s.phone;
  if (s.email) ld.email = s.email;
  if (s.address || s.city) {
    ld.address = { "@type": "PostalAddress", streetAddress: s.address || undefined, addressLocality: s.city || undefined, addressRegion: s.region || undefined, postalCode: s.postcode || undefined, addressCountry: "IN" };
  }
  if (s.hours) ld.openingHours = s.hours;
  return ld;
}

// --------------------------------------------------------------------------- Home
export function homePage(ctx, { featured, hampers, testimonials, heroBanner, promo, stats = {} }) {
  const home = ctx.settings.home;
  const title = (heroBanner && heroBanner.title) || home.hero_title || "Freshly Baked. Beautifully Crafted. Made with Love.";
  const subtitle = (heroBanner && heroBanner.subtitle) || home.hero_subtitle;
  const heroImg = (heroBanner && heroBanner.image) || "/assets/images/products/assorted-muffin-gift-box.webp";
  const bulk = ctx.settings.bulk;
  const tiles = [
    { name: "Biscuits & Cookies", url: "/shop/biscuits-cookies", img: "/assets/images/products/chocochip-cookies.webp", note: "10 varieties" },
    { name: "Muffins", url: "/shop/muffins-cupcakes", img: "/assets/images/products/chocolate-muffins.webp", note: "Trays & gift boxes" },
    { name: "Kulcha & Breads", url: "/shop/kulcha-bakery", img: "/assets/images/products/amritsari-kulcha.webp", note: "Soft & fresh" },
    { name: "Veg Patties", url: "/product/veg-patties", img: "/assets/images/products/veg-patties.webp", note: "Flaky puff pastry" },
    { name: "Namkeen", url: "/shop/namkeen-savouries", img: "/assets/images/products/namkeen-mixture.webp", note: "Tea-time savouries" },
    { name: "Gluten-Free Products", url: "/gluten-free", img: "/assets/images/products/chapati-atta.webp", note: "Biscuits, namkeen & atta" },
    { name: "Festival Hampers", url: "/festival-hampers", img: "/assets/images/hampers/hamper-diwali-basket.webp", note: "Curated gifting" },
  ];
  const specialities = [
    { icon: "leaf", title: "100% Vegetarian", text: "Every product we bake is pure vegetarian — and our biscuits are eggless." },
    { icon: "oven", title: "Freshly Prepared", text: "Baked in small batches and sealed fresh in Ovenroma packaging." },
    { icon: "wheat", title: "Gluten-Free Range", text: "Gluten-free biscuits, namkeen, muffins and stone-milled flours." },
    { icon: "star", title: "Quality Ingredients", text: "Real butter, nuts, cardamom and spices — no shortcuts on taste." },
    { icon: "people", title: "Bulk Orders", text: "Affordable bulk pricing for langar, bhandara, weddings and events." },
  ];
  const wa = ctx.settings.store.whatsapp;
  const body = html`
  <section class="hero">
    <div class="hero-blobs" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="hero-particles" aria-hidden="true">${["wheat", "chip", "sparkle", "chip", "wheat", "sparkle", "chip", "sparkle", "wheat", "chip"].map((k, i) => html`<span class="pt pt-${k}" style="--i:${i}"></span>`)}</div>
    <div class="container hero-grid">
      <div class="hero-copy">
        <p class="script">Freshly baked happiness</p>
        <h1 class="hero-title" aria-label="${title}">${title.split(/\s+/).map((w, i) => html`<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span> `)}</h1>
        <p class="hero-sub">${subtitle}</p>
        <div class="hero-ctas">
          <a class="btn btn-primary btn-lg" href="${(heroBanner && heroBanner.cta_url) || "/shop"}">${(heroBanner && heroBanner.cta_label) || "Shop Now"} ${icon("arrow")}</a>
          <a class="btn btn-outline btn-lg" href="/langar-bhandara-bulk-orders">Explore Bulk Orders</a>
        </div>
        <ul class="hero-trust">
          <li>${icon("leaf")} 100% Vegetarian</li>
          <li>${icon("oven")} Freshly Baked</li>
          <li>${icon("wheat")} Gluten-Free Range</li>
        </ul>
      </div>
      <div class="hero-art" data-parallax>
        <figure class="hero-main" data-depth="0.5"><img src="${heroImg}" width="800" height="800" alt="Ovenroma Bakers assorted muffin gift box with honey almond, tutti frutti and vanilla muffins" fetchpriority="high"></figure>
        <figure class="hero-float hero-float-a" data-depth="1.6"><img src="/assets/images/products/amritsari-kulcha-400.webp" width="400" height="400" alt="Ovenroma Bakers Amritsari Kulcha pack, 4 pieces 320g" loading="lazy"><figcaption>Amritsari Kulcha</figcaption></figure>
        <figure class="hero-float hero-float-b" data-depth="-1.3"><img src="/assets/images/products/chocochip-cookies-400.webp" width="400" height="400" alt="Ovenroma Bakers Chocochip Cookies in a clear box" loading="lazy"><figcaption>Chocochip Cookies</figcaption></figure>
        <span class="hero-stamp" aria-hidden="true"><span>Baked</span><strong>Fresh</strong><span>Daily</span></span>
      </div>
    </div>
  </section>

  <div class="ticker" aria-hidden="true"><div class="ticker-track">${[0, 1].map(() => html`<span>${["100% Vegetarian", "Freshly Baked Every Day", "Gluten-Free Range", "Eggless Cookies", "Amritsari Kulcha", "Langar & Bhandara Bulk Orders", "Festival Gift Hampers", "Order on WhatsApp"].map((t) => html`<em>${t}</em><b>✦</b>`)}</span>`)}</div></div>

  <section class="section">
    <div class="container">
      ${sectionHead({ kicker: "Explore", title: "Shop by Category", sub: "From tea-time cookies to festive hampers — find something for every occasion." })}
      <ul class="cat-tiles" data-stagger>
        ${tiles.map((t) => html`<li class="reveal"><a class="cat-tile tilt" href="${t.url}">
          <span class="cat-img"><img src="${thumbOf(t.img)}" width="400" height="400" alt="${t.name} by Ovenroma Bakers" loading="lazy"></span>
          <span class="cat-name">${t.name}</span><span class="cat-note">${t.note}</span>
        </a></li>`)}
      </ul>
    </div>
  </section>

  <section class="section section-tint">
    <div class="container">
      ${sectionHead({ kicker: "Customer favourites", title: "Best Sellers", sub: "Our most-loved bakes, straight from the Ovenroma ovens." })}
      <div class="product-grid" data-stagger>${featured.map((p) => productCard(p, ctx))}</div>
      <div class="center mt-lg"><a class="btn btn-outline" href="/shop">View all products ${icon("arrow")}</a></div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      ${sectionHead({ kicker: "Why Ovenroma", title: "Our Speciality" })}
      <ul class="speciality" data-stagger>
        ${specialities.map((s) => html`<li class="reveal"><span class="spec-icon">${icon(s.icon)}</span><h3>${s.title}</h3><p>${s.text}</p></li>`)}
      </ul>
    </div>
  </section>

  <section class="stats-band" aria-label="Ovenroma Bakers at a glance">
    <div class="container stats-grid" data-stagger>
      ${[
        [stats.products, "+", "Bakery products & hampers"],
        [stats.cookies, "", "Eggless cookie varieties"],
        [stats.flours, "", "Gluten-free flours & atta"],
        [100, "%", "Vegetarian, always"],
      ].filter(([n]) => n).map(([n, suf, label]) => html`<div class="stat reveal"><strong><span data-count="${n}">${n}</span>${suf}</strong><span>${label}</span></div>`)}
    </div>
  </section>

  <section class="langar-band">
    <div class="container langar-grid">
      <div class="langar-copy reveal">
        <p class="script light">Langar &amp; Bhandara</p>
        <h2>${(promo && promo.title) || "Making Every Celebration More Special."}</h2>
        <p>${(promo && promo.subtitle) || "Freshly prepared bakery products at affordable bulk-order prices."}</p>
        <ul class="price-chips" data-stagger>
          ${(bulk.products || []).map((b) => html`<li class="reveal"><span>${b.name}</span><strong>${rupees(b.price_paise)}<small> / ${b.unit}</small></strong></li>`)}
        </ul>
        <a class="btn btn-gold btn-lg" href="${(promo && promo.cta_url) || "/langar-bhandara-bulk-orders"}">${(promo && promo.cta_label) || "Order for Langar & Bhandara"} ${icon("arrow")}</a>
      </div>
      <div class="langar-art reveal">
        <img src="/assets/images/products/kulcha-bread-400.webp" width="400" height="400" alt="Ovenroma Bakers kulcha bread for langar" loading="lazy">
        <img src="/assets/images/products/veg-patties-400.webp" width="400" height="400" alt="Ovenroma Bakers veg patties for bhandara" loading="lazy">
        <img src="/assets/images/products/jam-biscuits-400.webp" width="400" height="400" alt="Ovenroma Bakers jam biscuits sold by the kg" loading="lazy">
      </div>
    </div>
  </section>

  <section class="section hampers-teaser">
    <div class="container">
      ${sectionHead({ kicker: "Gifting", title: "Festival Hampers", sub: "Premium gift boxes and festive baskets, beautifully packed and fully customisable." })}
      <div class="hamper-strip" data-stagger>
        ${hampers.slice(0, 4).map((h) => html`<a class="hamper-mini reveal" href="/festival-hampers#${h.occasion}">
          <span class="hm-img">${productImg(h, { sizes: "(max-width: 640px) 80vw, 280px" })}</span>
          <span class="hm-body"><span class="hm-name">${h.name}</span><span class="hm-inc">${(h.includes || []).slice(0, 2).join(" • ")}</span>${priceLabel(h)}</span>
        </a>`)}
      </div>
      <div class="center mt-lg"><a class="btn btn-primary" href="/festival-hampers">Explore Gift Hampers ${icon("arrow")}</a></div>
    </div>
  </section>

  ${testimonials.length ? html`<section class="section section-tint">
    <div class="container">
      ${sectionHead({ kicker: "Kind words", title: "What Our Customers Say" })}
      <ul class="testimonials">
        ${testimonials.map((t) => html`<li class="testimonial reveal"><span class="stars" aria-label="${t.rating} out of 5 stars">${Array.from({ length: Math.max(1, Math.min(5, t.rating)) }, () => icon("star"))}</span>
          <blockquote>“${t.text}”</blockquote><p class="t-name">${t.name}${t.location ? html`<span>${t.location}</span>` : ""}</p></li>`)}
      </ul>
    </div>
  </section>` : ""}

  <section class="section">
    <div class="container">
      <div class="wa-cta reveal"><span class="wa-cta-glow" aria-hidden="true"></span>
        <div><p class="script">Quick &amp; easy</p><h2>Order on WhatsApp</h2><p>Tell us what you'd like — single packs, party orders, hampers or bulk seva orders — and our team will confirm availability, delivery and the final amount.</p></div>
        <a class="btn btn-wa btn-lg" href="${waLink(wa, "Hello Ovenroma Bakers! I'd like to place an order.")}" target="_blank" rel="noopener">${icon("whatsapp")}<span>Chat with us on WhatsApp</span></a>
      </div>
    </div>
  </section>`;
  const seo = seoFor(ctx, "home");
  return {
    title: seo.title,
    description: seo.description,
    path: "/",
    preload: heroImg,
    intro: true,
    body,
    jsonLd: [organizationLd(ctx), { "@context": "https://schema.org", "@type": "WebSite", name: "Ovenroma Bakers", url: ctx.origin + "/" }],
  };
}

// --------------------------------------------------------------------------- Shop & categories
function filterBar(categories, { showCategories = true } = {}) {
  return html`<div class="filter-bar" data-filters>
    ${showCategories ? html`<div class="chips" role="group" aria-label="Filter by category">
      <button type="button" class="chip is-on" data-cat="" aria-pressed="true">All</button>
      ${categories.map((c) => html`<button type="button" class="chip" data-cat="${c.slug}" aria-pressed="false">${c.name}</button>`)}
    </div>` : ""}
    <div class="filter-row">
      <label class="search"><span class="sr-only">Search products</span><input type="search" placeholder="Search cookies, atta, kulcha…" data-search></label>
      <label class="check"><input type="checkbox" data-gf> Gluten-free</label>
      <label class="check"><input type="checkbox" data-instock> In stock</label>
      <label class="check"><input type="checkbox" data-priced> Buy online</label>
      <label class="sort"><span class="sr-only">Sort products</span><select data-sort>
        <option value="featured">Sort: Featured</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="name">Name: A–Z</option>
      </select></label>
    </div>
    <p class="result-count" aria-live="polite" data-count></p>
  </div>`;
}

function itemListLd(ctx, products) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: ctx.origin + "/product/" + p.slug, name: p.name })),
  };
}

export function shopPage(ctx, { products, categories }) {
  const seo = seoFor(ctx, "shop");
  const crumbs = [{ name: "Home", url: "/" }, { name: "Shop All Products", url: "/shop" }];
  const cats = categories.filter((c) => c.slug !== "festival-hampers");
  const body = html`
  <section class="page-hero"><div class="container">
    ${breadcrumbs(crumbs)}
    <h1>Shop All Products</h1>
    <p>Freshly baked biscuits, muffins, kulchas, veg patties, namkeen and gluten-free flours — all 100% vegetarian.</p>
  </div></section>
  <section class="section-sm"><div class="container">
    ${filterBar(cats)}
    <div class="product-grid" data-grid>${products.map((p) => productCard(p, ctx))}</div>
    <p class="empty-state" data-empty hidden>No products match your filters. <button type="button" class="link-btn" data-clear>Clear filters</button></p>
  </div></section>`;
  return { title: seo.title, description: seo.description, path: "/shop", body, scripts: ["/assets/js/shop.js"], jsonLd: [breadcrumbLd(crumbs, ctx.origin), itemListLd(ctx, products)] };
}

export function categoryPage(ctx, { category, products, categories }) {
  const crumbs = [{ name: "Home", url: "/" }, { name: "Shop", url: "/shop" }, { name: category.name, url: "/shop/" + category.slug }];
  const others = categories.filter((c) => c.slug !== category.slug && c.slug !== "festival-hampers");
  const body = html`
  <section class="page-hero has-art"><div class="container page-hero-grid">
    <div>${breadcrumbs(crumbs)}<h1>${category.name}</h1><p>${category.description}</p></div>
    ${category.image ? html`<img class="page-hero-img" src="${thumbOf(category.image)}" width="400" height="400" alt="${category.name} — Ovenroma Bakers">` : ""}
  </div></section>
  <section class="section-sm"><div class="container">
    ${filterBar([], { showCategories: false })}
    <div class="product-grid" data-grid>${products.map((p) => productCard(p, ctx, { headingLevel: 2 }))}</div>
    <p class="empty-state" data-empty hidden>No products match your filters. <button type="button" class="link-btn" data-clear>Clear filters</button></p>
  </div></section>
  <section class="section-sm"><div class="container">
    <h2 class="h3">Explore more categories</h2>
    <ul class="pill-links">${others.map((c) => html`<li><a href="/shop/${c.slug}">${c.name}</a></li>`)}<li><a href="/festival-hampers">Festival Hampers</a></li><li><a href="/langar-bhandara-bulk-orders">Bulk Orders</a></li></ul>
  </div></section>`;
  return {
    title: category.seo_title || `${category.name} — Buy Online | Ovenroma Bakers`,
    description: category.seo_description || category.description,
    path: "/shop/" + category.slug,
    image: category.image,
    body,
    scripts: ["/assets/js/shop.js"],
    jsonLd: [breadcrumbLd(crumbs, ctx.origin), { "@context": "https://schema.org", "@type": "CollectionPage", name: category.name, description: category.description, url: ctx.origin + "/shop/" + category.slug }, itemListLd(ctx, products)],
  };
}

export function glutenFreePage(ctx, { products, categories }) {
  const seo = seoFor(ctx, "gluten-free");
  const crumbs = [{ name: "Home", url: "/" }, { name: "Gluten-Free Range", url: "/gluten-free" }];
  const groups = categories.map((c) => ({ c, items: products.filter((p) => p.category === c.slug) })).filter((g) => g.items.length);
  const body = html`
  <section class="page-hero gf-hero"><div class="container page-hero-grid">
    <div>${breadcrumbs(crumbs)}
      <p class="script">Gluten-free, full of flavour</p>
      <h1>Gluten-Free Range</h1>
      <p>Our gluten-free biscuits, namkeen, chocolate muffins and stone-milled flours are made without wheat, so everyone at the table can enjoy them. Every biscuit, snack and flour from our gluten-free catalogue is sealed in clear airtight containers or brown kraft pouches bearing the Ovenroma Bakers label.</p>
      <ul class="gf-points"><li>${icon("check")} Made without wheat or maida</li><li>${icon("check")} Eggless biscuits &amp; cookies</li><li>${icon("check")} Stone-milled millet &amp; grain flours</li></ul>
    </div>
    <img class="page-hero-img" src="/assets/images/products/ragi-flour-400.webp" width="400" height="400" alt="Gluten-free ragi flour in a kraft pouch">
  </div></section>
  <section class="section-sm"><div class="container">
    <nav class="pill-links jump" aria-label="Jump to section"><ul>${groups.map((g) => html`<li><a href="#gf-${g.c.slug}">${g.c.name}</a></li>`)}</ul></nav>
    ${groups.map((g) => html`<section class="gf-group" id="gf-${g.c.slug}" aria-labelledby="gfh-${g.c.slug}">
      <h2 class="h3" id="gfh-${g.c.slug}">${g.c.name}</h2>
      <div class="product-grid">${g.items.map((p) => productCard(p, ctx))}</div>
    </section>`)}
    <p class="fine mt">Please check the label of each pack for allergen information. If you have coeliac disease or a severe allergy, contact us before ordering.</p>
  </div></section>`;
  return { title: seo.title, description: seo.description, path: "/gluten-free", body, jsonLd: [breadcrumbLd(crumbs, ctx.origin), itemListLd(ctx, products)] };
}

// --------------------------------------------------------------------------- Product
export function productPage(ctx, { product: p, related }) {
  const isHamper = p.category === "festival-hampers";
  const crumbs = isHamper
    ? [{ name: "Home", url: "/" }, { name: "Festival Hampers", url: "/festival-hampers" }, { name: p.name, url: "/product/" + p.slug }]
    : [{ name: "Home", url: "/" }, { name: "Shop", url: "/shop" }, { name: p.category_name, url: "/shop/" + p.category }, { name: p.name, url: "/product/" + p.slug }];
  const buyable = isBuyable(p);
  const wa = ctx.settings.store.whatsapp;
  const enquiry = `Hello Ovenroma Bakers! I'd like to enquire about ${p.name}${p.weight ? " (" + p.weight + ")" : ""}. ${ctx.origin}/product/${p.slug}`;
  const images = [p.image, ...(p.gallery || [])].filter(Boolean);
  const packaging = ctx.settings.hampers.packaging || [];
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || p.short,
    image: images.map((i) => ctx.origin + jpgOf(i)),
    sku: p.slug,
    category: p.category_name,
    brand: { "@type": "Brand", name: "Ovenroma Bakers" },
  };
  const offerPrices = (p.variants.length ? p.variants.map((v) => v.price_paise ?? p.price_paise) : [p.price_paise]).filter((x) => x !== null && x !== undefined);
  if (offerPrices.length) {
    productLd.offers = {
      "@type": "Offer",
      url: ctx.origin + "/product/" + p.slug,
      priceCurrency: "INR",
      price: (Math.min(...offerPrices) / 100).toFixed(2),
      availability: p.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Ovenroma Bakers" },
    };
  }
  const body = html`
  <section class="section-sm product-page"><div class="container">
    ${breadcrumbs(crumbs)}
    <div class="pp-grid">
      <div class="pp-gallery" data-gallery>
        <figure class="pp-main">${productImg(p, { sizes: "(max-width: 900px) 100vw, 560px", eager: true, cls: "pp-img" })}<span class="pc-badges">${badges(p, { max: 3 })}</span></figure>
        ${images.length > 1 ? html`<div class="pp-thumbs">${images.map((src, i) => html`<button type="button" class="${i === 0 ? "is-on" : ""}" data-thumb="${src}" aria-label="Show image ${i + 1}"><img src="${thumbOf(src)}" width="400" height="400" alt="" loading="lazy"></button>`)}</div>` : ""}
      </div>
      <div class="pp-info">
        <p class="pc-cat">${vegMark()} ${p.category_name}</p>
        <h1 class="pp-title">${p.name}</h1>
        <p class="pp-short">${p.short}</p>
        <div class="pp-price">${priceLabel(p)}${p.weight || p.packaging ? html`<span class="pp-pack">${[p.packaging, p.weight].filter(Boolean).join(" • ")}</span>` : ""}</div>
        ${p.bulk_note ? html`<p class="bulk-note">${icon("people")} <span>${p.bulk_note} — <a href="/langar-bhandara-bulk-orders">open the bulk order calculator</a></span></p>` : ""}
        ${buyable ? html`<form class="pp-form" data-product-form data-cart-item="${raw(dataJson(cartData(p)))}" novalidate>
          ${p.variants.length ? html`<div class="field"><label for="pp-variant">Choose option</label><select id="pp-variant" data-variant>${p.variants.map((v) => html`<option value="${v.id}" ${(v.price_paise ?? p.price_paise) === null ? raw("disabled") : ""}>${v.label}${(v.price_paise ?? p.price_paise) !== null ? " — " + rupees(v.price_paise ?? p.price_paise) : " (price on request)"}</option>`)}</select></div>` : ""}
          ${p.customisable ? html`<fieldset class="custom-box"><legend>Customise your hamper</legend>
            <div class="field"><label for="pp-packaging">Gift packaging</label><select id="pp-packaging" data-packaging><option value="">Standard packaging</option>${packaging.map((o) => html`<option>${o}</option>`)}</select></div>
            <div class="field"><label for="pp-message">Personalised message <span class="opt">(optional, max 200 characters)</span></label><textarea id="pp-message" maxlength="200" rows="3" placeholder="Wishing you a sweet and joyful Diwali!" data-message></textarea></div>
          </fieldset>` : ""}
          <div class="pp-buy">
            <div class="qty qty-lg" data-qty><button type="button" class="qty-btn" data-dec aria-label="Decrease quantity">−</button><input id="pp-qty" type="number" inputmode="numeric" min="1" max="100" value="1" aria-label="Quantity"><button type="button" class="qty-btn" data-inc aria-label="Increase quantity">+</button></div>
            <button type="button" class="btn btn-primary btn-lg" data-add-to-cart>${icon("cart")}<span>Add to Cart</span></button>
            <button type="button" class="btn btn-gold btn-lg" data-buy-now>Buy Now</button>
          </div>
        </form>` : html`<p class="notice">${p.in_stock ? "This product is available on request. Message us on WhatsApp for the price and availability." : "This product is currently out of stock. Message us to be notified when it's back."}</p>`}
        <a class="btn btn-wa ${buyable ? "btn-block-sm" : "btn-lg"}" href="${waLink(wa, enquiry)}" target="_blank" rel="noopener" data-wa-enquiry>${icon("whatsapp")}<span>Enquire on WhatsApp</span></a>
        <ul class="pp-assure">
          <li>${icon("leaf")} 100% vegetarian</li>
          ${p.tags.includes("gluten-free") ? html`<li>${icon("wheat")} Gluten-free</li>` : ""}
          ${p.tags.includes("eggless") ? html`<li>${icon("check")} Eggless</li>` : ""}
          <li>${icon("truck")} Freshly packed to order</li>
        </ul>
      </div>
    </div>
    <div class="pp-details">
      <section><h2 class="h3">Description</h2><p>${p.description}</p>
        ${p.includes.length ? html`<h3 class="h4">What's included</h3><ul class="ticks">${p.includes.map((i) => html`<li>${icon("check")} ${i}</li>`)}</ul>` : ""}
      </section>
      <section><h2 class="h3">Product details</h2>
        <table class="spec"><tbody>
          <tr><th scope="row">Brand</th><td>Ovenroma Bakers</td></tr>
          <tr><th scope="row">Category</th><td><a href="${isHamper ? "/festival-hampers" : "/shop/" + p.category}">${p.category_name}</a></td></tr>
          ${p.packaging ? html`<tr><th scope="row">Packaging</th><td>${p.packaging}</td></tr>` : ""}
          ${p.weight ? html`<tr><th scope="row">Pack size</th><td>${p.weight}</td></tr>` : ""}
          ${p.variants.length ? html`<tr><th scope="row">Options</th><td>${p.variants.map((v) => v.label).join(", ")}</td></tr>` : ""}
          <tr><th scope="row">Diet</th><td>100% Vegetarian${p.tags.includes("eggless") ? ", Eggless" : ""}${p.tags.includes("gluten-free") ? ", Gluten-Free" : ""}</td></tr>
        </tbody></table>
      </section>
    </div>
  </div></section>
  ${related.length ? html`<section class="section-sm section-tint"><div class="container">
    <h2 class="section-title small">You may also like</h2>
    <div class="product-grid">${related.map((r) => productCard(r, ctx))}</div>
  </div></section>` : ""}`;
  return {
    title: p.seo_title || `${p.name}${p.weight ? " (" + p.weight + ")" : ""} — Buy Online | Ovenroma Bakers`,
    description: p.seo_description || (p.short + " " + [p.packaging, p.weight].filter(Boolean).join(", ") + ". 100% vegetarian, freshly baked by Ovenroma Bakers.").slice(0, 300),
    path: "/product/" + p.slug,
    image: p.image,
    ogType: "product",
    preload: thumbOf(p.image),
    body,
    scripts: ["/assets/js/product.js"],
    jsonLd: [productLd, breadcrumbLd(crumbs, ctx.origin)],
  };
}

// --------------------------------------------------------------------------- About / Contact
export function aboutPage(ctx) {
  const seo = seoFor(ctx, "about");
  const crumbs = [{ name: "Home", url: "/" }, { name: "About Us", url: "/about" }];
  const body = html`
  <section class="page-hero"><div class="container">${breadcrumbs(crumbs)}<p class="script">Our story</p><h1>About Ovenroma Bakers</h1><p>${ctx.settings.store.tagline}</p></div></section>
  <section class="section"><div class="container about-grid">
    <div class="prose">
      <h2>Baked with care, packed with love</h2>
      <p>Ovenroma Bakers brings together the warmth of a traditional Indian bakery and the care of artisanal, small-batch baking. From soft muffins and pillowy Amritsari kulchas to crisp eggless cookies and tea-time namkeen, every product is 100% vegetarian and sealed fresh in Ovenroma Bakers packaging.</p>
      <p>We know that food brings people together — at the family tea table, at festivals and at community seva. That's why, alongside our everyday range, we offer a dedicated gluten-free collection, beautifully curated gift hampers and affordable bulk orders for langar, bhandara, weddings and events.</p>
      <h3>What we stand for</h3>
      <ul class="ticks">
        <li>${icon("check")} <span><strong>Freshness first</strong> — baked in small batches and packed to keep every bite fresh.</span></li>
        <li>${icon("check")} <span><strong>Pure vegetarian</strong> — every product, with eggless biscuits and cookies.</span></li>
        <li>${icon("check")} <span><strong>Something for everyone</strong> — including gluten-free biscuits, namkeen and flours.</span></li>
        <li>${icon("check")} <span><strong>Seva made easy</strong> — fair bulk pricing for community celebrations.</span></li>
      </ul>
      <div class="hero-ctas"><a class="btn btn-primary" href="/shop">Shop our range</a><a class="btn btn-outline" href="/contact">Get in touch</a></div>
    </div>
    <div class="about-art">
      <img src="/assets/images/products/assorted-muffin-gift-box-400.webp" width="400" height="400" alt="Ovenroma Bakers assorted muffin gift box" loading="lazy">
      <img src="/assets/images/products/amritsari-kulcha-400.webp" width="400" height="400" alt="Ovenroma Bakers Amritsari kulcha" loading="lazy">
      <img src="/assets/images/products/kaju-butter-cookies-400.webp" width="400" height="400" alt="Kaju butter cookies" loading="lazy">
      <img src="/assets/images/products/veg-patties-400.webp" width="400" height="400" alt="Ovenroma Bakers veg patties" loading="lazy">
    </div>
  </div></section>`;
  return { title: seo.title, description: seo.description, path: "/about", body, jsonLd: [organizationLd(ctx), breadcrumbLd(crumbs, ctx.origin)] };
}

export function contactPage(ctx) {
  const seo = seoFor(ctx, "contact");
  const s = ctx.settings.store;
  const crumbs = [{ name: "Home", url: "/" }, { name: "Contact Us", url: "/contact" }];
  const body = html`
  <section class="page-hero"><div class="container">${breadcrumbs(crumbs)}<h1>Contact Us</h1><p>Questions about an order, a bulk seva order, hampers or corporate gifting? We'd love to hear from you.</p></div></section>
  <section class="section"><div class="container contact-grid">
    <div class="card contact-card">
      <h2 class="h3">Talk to us</h2>
      <p>The fastest way to reach us is WhatsApp — share what you need and our team will reply with availability and pricing.</p>
      <a class="btn btn-wa btn-lg" href="${waLink(s.whatsapp, "Hello Ovenroma Bakers! I have a question.")}" target="_blank" rel="noopener">${icon("whatsapp")}<span>Message on WhatsApp</span></a>
      <ul class="contact-list">
        ${s.phone ? html`<li><strong>Phone</strong><a href="tel:${s.phone.replace(/[^\d+]/g, "")}">${s.phone}</a></li>` : ""}
        ${s.email ? html`<li><strong>Email</strong><a href="mailto:${s.email}">${s.email}</a></li>` : ""}
        ${s.address ? html`<li><strong>Address</strong><span>${s.address}${s.city ? ", " + s.city : ""}${s.postcode ? " " + s.postcode : ""}</span></li>` : ""}
        ${s.hours ? html`<li><strong>Hours</strong><span>${s.hours}</span></li>` : ""}
      </ul>
      <ul class="pill-links"><li><a href="/langar-bhandara-bulk-orders">Langar &amp; Bhandara orders</a></li><li><a href="/festival-hampers#corporate-gifting">Corporate gifting</a></li></ul>
    </div>
    <form class="card form" data-enquiry-form="contact" novalidate>
      <h2 class="h3">Send us a message</h2>
      <div class="form-grid">
        <div class="field"><label for="c-name">Your name *</label><input id="c-name" name="name" required minlength="2" maxlength="80" autocomplete="name"></div>
        <div class="field"><label for="c-phone">Mobile number *</label><input id="c-phone" name="phone" type="tel" required inputmode="tel" maxlength="16" autocomplete="tel" placeholder="10-digit mobile"></div>
        <div class="field span-2"><label for="c-email">Email <span class="opt">(optional)</span></label><input id="c-email" name="email" type="email" maxlength="120" autocomplete="email"></div>
        <div class="field span-2"><label for="c-subject">Topic</label><select id="c-subject" name="subject"><option>General enquiry</option><option>Order support</option><option>Bulk / Langar order</option><option>Festival hampers</option><option>Corporate gifting</option><option>Feedback</option></select></div>
        <div class="field span-2"><label for="c-message">Message *</label><textarea id="c-message" name="message" rows="5" required minlength="5" maxlength="1000"></textarea></div>
      </div>
      <button class="btn btn-primary" type="submit">Send Message</button>
      <p class="form-status" role="status" data-form-status></p>
    </form>
  </div></section>`;
  return { title: seo.title, description: seo.description, path: "/contact", body, scripts: ["/assets/js/forms.js"], jsonLd: [organizationLd(ctx), breadcrumbLd(crumbs, ctx.origin)] };
}

// --------------------------------------------------------------------------- Cart / Checkout / Order
export function cartPage(ctx) {
  const body = html`
  <section class="page-hero slim"><div class="container"><h1>Your Cart</h1></div></section>
  <section class="section-sm"><div class="container cart-layout" data-cart-page>
    <div class="cart-lines card" data-cart-lines><p class="loading">Loading your cart…</p></div>
    <aside class="card summary" data-cart-summary hidden>
      <h2 class="h3">Order summary</h2>
      <dl class="totals"><div><dt>Subtotal</dt><dd data-sum-subtotal>—</dd></div><div><dt>Shipping</dt><dd data-sum-shipping>—</dd></div><div class="grand"><dt>Total</dt><dd data-sum-total>—</dd></div></dl>
      <p class="form-error" role="alert" data-cart-error hidden></p>
      <a class="btn btn-primary btn-block" href="/checkout" data-to-checkout>Proceed to Checkout</a>
      <button type="button" class="btn btn-wa btn-block" data-cart-wa>${icon("whatsapp")}<span>Order on WhatsApp instead</span></button>
      <a class="link mt" href="/shop">← Continue shopping</a>
    </aside>
  </div></section>`;
  return { title: "Your Cart | Ovenroma Bakers", description: "Review the items in your Ovenroma Bakers cart.", path: "/cart", noindex: true, body, scripts: ["/assets/js/cart-page.js"] };
}

export function checkoutPage(ctx, { paymentsReady }) {
  const ship = ctx.settings.shipping;
  const body = html`
  <section class="page-hero slim"><div class="container"><h1>Checkout</h1><p>Secure checkout — pay online with Razorpay or confirm your order on WhatsApp.</p></div></section>
  <section class="section-sm"><div class="container checkout-layout" data-checkout data-payments="${paymentsReady ? "1" : "0"}">
    <form class="card form" data-checkout-form novalidate>
      <h2 class="h3">Delivery details</h2>
      <div class="form-grid">
        <div class="field"><label for="co-name">Full name *</label><input id="co-name" name="name" required minlength="2" maxlength="80" autocomplete="name"></div>
        <div class="field"><label for="co-phone">Mobile number *</label><input id="co-phone" name="phone" type="tel" required maxlength="16" inputmode="tel" autocomplete="tel" placeholder="10-digit mobile"></div>
        <div class="field span-2"><label for="co-email">Email <span class="opt">(for order confirmation)</span></label><input id="co-email" name="email" type="email" maxlength="120" autocomplete="email"></div>
        <div class="field span-2"><label for="co-address">Delivery address *</label><textarea id="co-address" name="address" rows="3" required minlength="10" maxlength="240" autocomplete="street-address" placeholder="House no., street, area, landmark"></textarea></div>
        <div class="field"><label for="co-city">City *</label><input id="co-city" name="city" required maxlength="60" autocomplete="address-level2"></div>
        <div class="field"><label for="co-pincode">Pincode *</label><input id="co-pincode" name="pincode" required inputmode="numeric" maxlength="6" pattern="[1-9][0-9]{5}" autocomplete="postal-code"></div>
        <div class="field span-2"><label for="co-notes">Order notes <span class="opt">(optional)</span></label><textarea id="co-notes" name="notes" rows="2" maxlength="300" placeholder="Delivery time preference, gift note…"></textarea></div>
      </div>
      <p class="form-error" role="alert" data-checkout-error hidden></p>
      <div class="pay-ctas">
        <button class="btn btn-primary btn-lg" type="submit" data-pay ${paymentsReady ? "" : raw("disabled")}>${paymentsReady ? "Pay Securely with Razorpay" : "Online payment coming soon"}</button>
        <button class="btn btn-wa btn-lg" type="button" data-checkout-wa>${icon("whatsapp")}<span>Place Order on WhatsApp</span></button>
      </div>
      <p class="fine">By placing an order you agree to our <a href="/terms">Terms</a>, <a href="/shipping-policy">Shipping</a> and <a href="/refund-policy">Refund</a> policies. Card, UPI and netbanking payments are processed securely by Razorpay — we never see or store your card details.</p>
    </form>
    <aside class="card summary" data-checkout-summary>
      <h2 class="h3">Your order</h2>
      <ul class="mini-lines" data-mini-lines><li class="loading">Loading…</li></ul>
      <dl class="totals"><div><dt>Subtotal</dt><dd data-sum-subtotal>—</dd></div><div><dt>Shipping</dt><dd data-sum-shipping>—</dd></div><div class="grand"><dt>Total</dt><dd data-sum-total>—</dd></div></dl>
      ${ship.note ? html`<p class="fine">${ship.note}</p>` : ""}
    </aside>
  </div></section>`;
  return { title: "Checkout | Ovenroma Bakers", description: "Secure checkout for your Ovenroma Bakers order.", path: "/checkout", noindex: true, body, scripts: ["/assets/js/checkout.js"] };
}

const STATUS_COPY = {
  paid: { cls: "ok", title: "Payment successful — thank you!", text: "Your order is confirmed. We'll start preparing it fresh and contact you about delivery." },
  created: { cls: "wait", title: "Awaiting payment", text: "We haven't received a confirmed payment for this order yet. If money was deducted, don't pay again — message us with your order reference." },
  failed: { cls: "bad", title: "Payment not completed", text: "The payment for this order failed or was cancelled. Your cart has been kept so you can try again." },
  whatsapp: { cls: "ok", title: "Order received — confirm on WhatsApp", text: "We've noted your order. Please send the WhatsApp message so our team can confirm availability, delivery and payment." },
  fulfilled: { cls: "ok", title: "Order delivered", text: "This order has been fulfilled. We hope you enjoyed it!" },
  cancelled: { cls: "bad", title: "Order cancelled", text: "This order has been cancelled. Contact us if you have any questions." },
};

export function orderPage(ctx, { order }) {
  const items = JSON.parse(order.items || "[]");
  const st = STATUS_COPY[order.status] || STATUS_COPY.created;
  const msg = `Hello Ovenroma Bakers! My order reference is ${order.ref}.`;
  const body = html`
  <section class="section"><div class="container narrow">
    <div class="card order-card status-${st.cls}" data-order-status="${order.status}">
      <span class="status-icon">${icon(st.cls === "bad" ? "close" : "check")}</span>
      <h1 class="h2">${st.title}</h1>
      <p>${st.text}</p>
      <dl class="order-meta">
        <div><dt>Order reference</dt><dd data-order-ref>${order.ref}</dd></div>
        <div><dt>Name</dt><dd>${order.customer_name}</dd></div>
        ${order.razorpay_payment_id ? html`<div><dt>Payment ID</dt><dd data-payment-id>${order.razorpay_payment_id}</dd></div>` : ""}
        <div><dt>Placed on</dt><dd>${order.created_at} UTC</dd></div>
      </dl>
      <table class="order-items"><thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col" class="num">Amount</th></tr></thead><tbody>
        ${items.map((i) => html`<tr><td>${i.name}${i.variant_label ? " — " + i.variant_label : ""}${i.packaging ? html`<br><small>Packaging: ${i.packaging}</small>` : ""}${i.message ? html`<br><small>Message: “${i.message}”</small>` : ""}</td><td>${i.qty}</td><td class="num">${rupees(i.line_paise)}</td></tr>`)}
      </tbody><tfoot>
        <tr><th scope="row" colspan="2">Subtotal</th><td class="num">${rupees(order.subtotal_paise)}</td></tr>
        <tr><th scope="row" colspan="2">Shipping</th><td class="num">${order.shipping_paise ? rupees(order.shipping_paise) : "Free"}</td></tr>
        <tr class="grand"><th scope="row" colspan="2">Total</th><td class="num" data-order-total>${rupees(order.total_paise)}</td></tr>
      </tfoot></table>
      <div class="hero-ctas center">
        <a class="btn btn-wa" href="${waLink(ctx.settings.store.whatsapp, msg)}" target="_blank" rel="noopener">${icon("whatsapp")}<span>Message us about this order</span></a>
        <a class="btn btn-outline" href="/shop">Continue shopping</a>
      </div>
    </div>
  </div></section>`;
  return { title: "Order " + order.ref + " | Ovenroma Bakers", description: "Your Ovenroma Bakers order.", noindex: true, body, scripts: ["/assets/js/order.js"] };
}

// --------------------------------------------------------------------------- Policies / 404
const POLICIES = {
  "shipping-policy": {
    title: "Shipping Policy",
    body: (ctx) => html`
      <p>We bake to order so that your products reach you fresh. This policy explains how deliveries work.</p>
      <h2>Order processing</h2>
      <p>Orders are prepared after payment is confirmed (or, for WhatsApp orders, after our team confirms the order with you). Freshly baked items such as muffins, kulchas and veg patties are prepared close to dispatch. Our team will share the expected delivery date when confirming your order.</p>
      <h2>Delivery charges</h2>
      <p>Any delivery charge is shown at checkout before you pay${ctx.settings.shipping.free_above_paise ? html` — orders of ${rupees(ctx.settings.shipping.free_above_paise)} or more ship free` : ""}. For bulk orders (langar, bhandara, events and corporate gifting), delivery charges and arrangements are confirmed by our team before the order is finalised.</p>
      <h2>Delivery area</h2>
      <p>We currently deliver to the serviceable pincodes confirmed by our team. If we cannot deliver to your address, we will contact you and issue a full refund for a prepaid order.</p>
      <h2>Bulk and event orders</h2>
      <p>Please place bulk orders in advance — ideally several days before your event — so we can bake fresh quantities and plan delivery.</p>
      <h2>Delays</h2>
      <p>Weather, festivals and courier disruptions can occasionally delay deliveries. We'll keep you informed on WhatsApp or phone.</p>`,
  },
  "refund-policy": {
    title: "Refund & Cancellation Policy",
    body: () => html`
      <p>Because our products are perishable food items baked to order, we follow the policy below.</p>
      <h2>Cancellations</h2>
      <p>You can cancel an order free of charge before it has been prepared or dispatched — message us on WhatsApp with your order reference as soon as possible. Bulk and customised hamper orders can be cancelled only before baking or packing has begun.</p>
      <h2>Damaged, incorrect or missing items</h2>
      <p>If your order arrives damaged, incorrect or incomplete, contact us within 24 hours of delivery with your order reference and a photo of the product and packaging. We will offer a replacement or a refund for the affected items.</p>
      <h2>Refunds</h2>
      <p>Approved refunds are made to the original payment method through Razorpay. Banks typically take 5–7 working days to credit the amount after we initiate the refund.</p>
      <h2>Non-returnable items</h2>
      <p>For food-safety reasons, opened or consumed food products cannot be returned unless they were damaged or incorrect on delivery.</p>`,
  },
  "privacy-policy": {
    title: "Privacy Policy",
    body: () => html`
      <p>This policy explains what personal information Ovenroma Bakers collects through this website and how we use it.</p>
      <h2>Information we collect</h2>
      <ul><li>Order and delivery details you enter at checkout: name, mobile number, email (optional), delivery address, city, pincode and order notes.</li>
      <li>Enquiry details you submit for bulk orders, hampers, corporate gifting or contact forms.</li>
      <li>Payment status and payment reference IDs from Razorpay. We never receive or store your card, UPI PIN or banking credentials.</li></ul>
      <h2>How we use it</h2>
      <p>We use your information only to process and deliver your orders, respond to enquiries, provide customer support and meet legal and accounting requirements. We do not sell your personal information.</p>
      <h2>Sharing</h2>
      <p>We share information only with service providers needed to run the store — Razorpay for payments, our hosting provider, and delivery partners for your address — and when required by law.</p>
      <h2>WhatsApp</h2>
      <p>If you choose to order or enquire through WhatsApp, the message is sent from your own WhatsApp account and is subject to WhatsApp's privacy policy.</p>
      <h2>Cookies and storage</h2>
      <p>Your cart is stored in your browser's local storage on your device. We do not use advertising cookies.</p>
      <h2>Your choices</h2>
      <p>You can ask us to access, correct or delete your personal information by contacting us through the <a href="/contact">contact page</a>.</p>`,
  },
  terms: {
    title: "Terms & Conditions",
    body: () => html`
      <p>By using this website and placing an order with Ovenroma Bakers, you agree to these terms.</p>
      <h2>Products</h2>
      <p>All products are 100% vegetarian. Product photographs are representative; packaging and appearance may vary slightly between batches. Please read the label for ingredients and allergen information before consuming, especially if you have food allergies or coeliac disease.</p>
      <h2>Prices and payment</h2>
      <p>Prices are in Indian Rupees (₹) and are confirmed at checkout. Some products are offered "on request" — their price is confirmed by our team before you order. Online payments are processed by Razorpay. An order is confirmed once payment is verified, or once our team confirms a WhatsApp order.</p>
      <h2>Bulk orders and hampers</h2>
      <p>Prices shown in the bulk order calculator are for the products only. Delivery charges, delivery timing and final arrangements for bulk and corporate orders are confirmed by our team. Customised hamper contents depend on availability, and we may suggest suitable substitutes.</p>
      <h2>Liability</h2>
      <p>We take great care in preparing and packing our products. Our liability for any order is limited to the amount paid for that order.</p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time. The version on this page applies to orders placed after it is published.</p>`,
  },
};

export function policyPage(ctx, key) {
  const pol = POLICIES[key];
  if (!pol) return null;
  const crumbs = [{ name: "Home", url: "/" }, { name: pol.title, url: "/" + key }];
  const body = html`<section class="page-hero slim"><div class="container">${breadcrumbs(crumbs)}<h1>${pol.title}</h1></div></section>
  <section class="section-sm"><div class="container narrow prose card">${pol.body(ctx)}<p class="fine">Questions? <a href="/contact">Contact us</a>.</p></div></section>`;
  return { title: pol.title + " | Ovenroma Bakers", description: `Read the Ovenroma Bakers ${pol.title.toLowerCase()} for online orders, bulk orders and gift hampers.`, path: "/" + key, body, jsonLd: [breadcrumbLd(crumbs, ctx.origin)] };
}
export const POLICY_KEYS = Object.keys(POLICIES);

export function notFoundPage() {
  const body = html`<section class="section"><div class="container narrow center">
    <p class="script">Oops!</p><h1>This page has crumbled away</h1>
    <p>We couldn't find the page you were looking for. It may have moved, or the link may be incorrect.</p>
    <div class="hero-ctas center"><a class="btn btn-primary" href="/">Go to Home</a><a class="btn btn-outline" href="/shop">Shop All Products</a></div>
  </div></section>`;
  return { title: "Page not found | Ovenroma Bakers", description: "The page you were looking for could not be found.", noindex: true, body };
}

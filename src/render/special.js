// Langar & Bhandara bulk-order page and Festival Hampers page.
import { html, raw, dataJson } from "./html.js";
import { icon, productImg, priceLabel, isBuyable, cartData, breadcrumbs, breadcrumbLd, sectionHead, waLink } from "./components.js";
import { rupees, thumbOf } from "../lib/util.js";
import { OCCASIONS } from "../data/catalog.js";

const EVENT_TYPES = ["Langar", "Bhandara", "Religious functions", "Gurudwara events", "Temple events", "Community gatherings", "Weddings", "Birthday parties", "Corporate events"];

export function bulkPage(ctx) {
  const bulk = ctx.settings.bulk;
  const seo = ctx.settings.seo.bulk;
  const crumbs = [{ name: "Home", url: "/" }, { name: "Langar & Bhandara Bulk Orders", url: "/langar-bhandara-bulk-orders" }];
  const config = {
    products: bulk.products.map((b) => ({ id: b.id, name: b.name, price_paise: b.price_paise, unit: b.unit, unitLabel: b.unitLabel, step: b.step, max: b.max, varieties: !!b.varieties })),
    varieties: bulk.varieties,
  };
  const simple = bulk.products.filter((b) => !b.varieties);
  const biscuit = bulk.products.find((b) => b.varieties);
  const minDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const faq = [
    { q: "How early should I place a bulk order?", a: "Bulk orders should preferably be placed in advance so that we can bake fresh quantities for your event. Our team will confirm the delivery date and time with you." },
    { q: "Are delivery charges included?", a: "The calculator shows product prices only. Delivery charges and final arrangements are confirmed by our team on WhatsApp." },
    { q: "Can I order more than one biscuit variety?", a: "Yes — add as many biscuit varieties as you like, each with its own quantity in kilograms." },
    { q: "Are the products vegetarian?", a: "Yes. All Ovenroma Bakers products are 100% vegetarian, and our biscuits are eggless." },
  ];
  const body = html`
  <section class="bulk-hero">
    <div class="container bulk-hero-grid">
      <div>
        ${breadcrumbs(crumbs)}
        <p class="script light">Langar &amp; Bhandara</p>
        <h1>Seva Made Sweeter – Fresh Bakery Products for Langar &amp; Bhandara</h1>
        <p class="lead">Freshly prepared bakery products at affordable bulk-order prices. Make your community celebrations easier with Ovenroma Bakers.</p>
        <ul class="event-chips">${EVENT_TYPES.map((e) => html`<li>${e}</li>`)}</ul>
        <a class="btn btn-gold btn-lg" href="#bulk-calculator">Calculate your order ${icon("arrow")}</a>
      </div>
      <div class="bulk-hero-art">
        ${bulk.products.map((b) => html`<figure><img src="${thumbOf(b.image || "")}" width="400" height="400" alt="${b.name} for langar and bhandara" loading="lazy"><figcaption>${b.name}<strong>${rupees(b.price_paise)} / ${b.unit}</strong></figcaption></figure>`)}
      </div>
    </div>
  </section>

  <section class="section-sm">
    <div class="container">
      ${sectionHead({ kicker: "Fixed bulk prices", title: "Bulk Order Price List" })}
      <div class="table-wrap"><table class="price-table">
        <thead><tr><th scope="col">Product</th><th scope="col">Price</th><th scope="col">Order in</th></tr></thead>
        <tbody>${bulk.products.map((b) => html`<tr><th scope="row">${b.name}${b.varieties ? html`<small>${bulk.varieties.length} varieties to choose from</small>` : ""}</th><td><strong>${rupees(b.price_paise)}</strong> / ${b.unit}</td><td>${b.unitLabel}</td></tr>`)}</tbody>
      </table></div>
    </div>
  </section>

  <section class="section-sm section-tint" id="bulk-calculator" aria-labelledby="calc-title">
    <div class="container">
      ${sectionHead({ kicker: "Bulk order calculator", title: "Plan Your Order", id: "calc-title", sub: "Enter quantities and your total updates instantly. Add as many biscuit varieties as you need." })}
      <div class="bulk-layout" data-bulk="${raw(dataJson(config))}">
        <div class="bulk-calc card">
          ${simple.map((b) => html`<div class="calc-row" data-calc-row="${b.id}">
            <img src="${thumbOf(b.image || "")}" width="400" height="400" alt="" loading="lazy">
            <div class="calc-name"><strong>${b.name}</strong><span>${rupees(b.price_paise)} / ${b.unit}</span></div>
            <label class="calc-qty"><span class="sr-only">${b.name} quantity in ${b.unitLabel}</span>
              <input type="number" inputmode="${b.step % 1 ? "decimal" : "numeric"}" min="0" max="${b.max}" step="${b.step}" placeholder="0" data-qty-input>
              <span class="unit">${b.unitLabel}</span></label>
            <output class="calc-sub" data-sub>₹0</output>
          </div>`)}
          ${biscuit ? html`<div class="calc-biscuits" data-biscuits>
            <div class="calc-row head">
              <img src="${thumbOf(biscuit.image || "")}" width="400" height="400" alt="" loading="lazy">
              <div class="calc-name"><strong>${biscuit.name}</strong><span>${rupees(biscuit.price_paise)} / ${biscuit.unit} • choose varieties below</span></div>
            </div>
            <ul class="biscuit-lines" data-biscuit-lines></ul>
            <button type="button" class="btn btn-ghost btn-sm" data-add-biscuit>+ Add biscuit variety</button>
            <template data-biscuit-tpl><li class="biscuit-line">
              <label class="field-inline"><span class="sr-only">Biscuit variety</span><select data-variety><option value="">Choose biscuit variety…</option>${bulk.varieties.map((v) => html`<option>${v}</option>`)}</select></label>
              <label class="calc-qty"><span class="sr-only">Biscuits quantity in kilograms</span><input type="number" inputmode="decimal" min="0" max="${biscuit.max}" step="${biscuit.step}" placeholder="0" data-kg><span class="unit">${biscuit.unitLabel}</span></label>
              <output class="calc-sub" data-sub>₹0</output>
              <button type="button" class="icon-btn remove" aria-label="Remove this biscuit variety" data-remove>${icon("close")}</button>
            </li></template>
          </div>` : ""}
        </div>
        <aside class="bulk-summary card" aria-live="polite">
          <h3>Order summary</h3>
          <ul class="sum-lines" data-sum-lines><li class="muted">No products added yet.</li></ul>
          <div class="grand-total"><span>Total Order Value</span><strong data-grand>₹0</strong></div>
          <p class="fine">${bulk.note}</p>
          <button type="button" class="btn btn-ghost btn-sm" data-reset>Reset calculator</button>
        </aside>
      </div>

      <form class="card form bulk-form" data-bulk-form novalidate>
        <h3 class="h3">Your event details</h3>
        <div class="form-grid">
          <div class="field"><label for="b-name">Customer name *</label><input id="b-name" name="name" required minlength="2" maxlength="80" autocomplete="name"></div>
          <div class="field"><label for="b-phone">Mobile number *</label><input id="b-phone" name="phone" type="tel" required maxlength="16" inputmode="tel" autocomplete="tel" placeholder="10-digit mobile"></div>
          <div class="field"><label for="b-event">Event name *</label><input id="b-event" name="event_name" required maxlength="120" placeholder="e.g. Gurpurab Langar, Mata ki Chowki Bhandara" list="event-types"><datalist id="event-types">${EVENT_TYPES.map((e) => html`<option value="${e}"></option>`)}</datalist></div>
          <div class="field"><label for="b-date">Event date *</label><input id="b-date" name="event_date" type="date" required min="${minDate}"></div>
          <div class="field"><label for="b-location">Delivery location *</label><input id="b-location" name="location" required maxlength="120" placeholder="Area / city, e.g. Gurudwara Sahib, Model Town"></div>
          <div class="field"><label for="b-people">Number of people</label><input id="b-people" name="people" type="number" min="1" max="1000000" inputmode="numeric" placeholder="Approx. guests"></div>
          <div class="field span-2"><label for="b-address">Delivery address *</label><textarea id="b-address" name="address" rows="2" required minlength="5" maxlength="240"></textarea></div>
          <div class="field span-2"><label for="b-notes">Special instructions</label><textarea id="b-notes" name="notes" rows="2" maxlength="400" placeholder="Delivery time, packing preferences, etc."></textarea></div>
        </div>
        <p class="form-error" role="alert" data-bulk-error hidden></p>
        <div class="bulk-submit">
          <button class="btn btn-wa btn-lg" type="submit">${icon("whatsapp")}<span>Send Bulk Order Enquiry</span></button>
          <p class="note">${icon("truck")} <span>${bulk.note}</span></p>
        </div>
        <p class="form-status" role="status" data-form-status></p>
      </form>
    </div>
  </section>

  <section class="section-sm">
    <div class="container narrow">
      ${sectionHead({ kicker: "Good to know", title: "Bulk Order FAQs" })}
      <div class="faq">${faq.map((f) => html`<details><summary>${f.q}</summary><p>${f.a}</p></details>`)}</div>
    </div>
  </section>`;
  return {
    title: seo.title,
    description: seo.description,
    path: "/langar-bhandara-bulk-orders",
    image: "/assets/images/products/kulcha-bread.webp",
    body,
    bodyClass: "page-bulk",
    scripts: ["/assets/js/bulk.js"],
    jsonLd: [
      breadcrumbLd(crumbs, ctx.origin),
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Langar & Bhandara bulk bakery orders",
        provider: { "@type": "Bakery", name: "Ovenroma Bakers", url: ctx.origin + "/" },
        areaServed: "IN",
        offers: bulk.products.map((b) => ({ "@type": "Offer", name: b.name + " (per " + b.unit + ")", price: (b.price_paise / 100).toFixed(2), priceCurrency: "INR" })),
      },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };
}

function hamperCard(h, ctx, packaging) {
  const buyable = isBuyable(h);
  const id = "h-" + h.slug;
  return html`<article class="hamper-card reveal" data-hamper="${h.slug}">
    <a class="hc-media" href="/product/${h.slug}" tabindex="-1" aria-hidden="true">${productImg(h, { sizes: "(max-width: 700px) 100vw, 400px" })}</a>
    <div class="hc-body">
      <h3 class="hc-title"><a href="/product/${h.slug}">${h.name}</a></h3>
      <p class="hc-desc">${h.short}</p>
      ${h.includes.length ? html`<p class="hc-label">What's included</p><ul class="ticks small">${h.includes.map((i) => html`<li>${icon("check")} ${i}</li>`)}</ul>` : ""}
      <div class="hc-price">${priceLabel(h)}</div>
      <form class="hc-form" data-hamper-form data-cart-item="${raw(dataJson(cartData(h)))}" data-buyable="${buyable ? 1 : 0}" novalidate>
        <details class="hc-custom"${h.occasion === "custom" ? raw(" open") : ""}><summary>Customise this hamper</summary>
          <div class="field"><label for="${id}-pack">Gift packaging</label><select id="${id}-pack" data-packaging><option value="">Standard packaging</option>${packaging.map((o) => html`<option>${o}</option>`)}</select></div>
          <div class="field"><label for="${id}-msg">Personalised message <span class="opt">(max 200)</span></label><textarea id="${id}-msg" rows="2" maxlength="200" data-message placeholder="Your greeting for the card"></textarea></div>
        </details>
        <div class="hc-actions">
          <div class="qty" data-qty><button type="button" class="qty-btn" data-dec aria-label="Fewer hampers">−</button><input type="number" inputmode="numeric" min="1" max="100" value="1" aria-label="Number of ${h.name} hampers"><button type="button" class="qty-btn" data-inc aria-label="More hampers">+</button></div>
          ${buyable ? html`<button type="button" class="btn btn-primary btn-sm" data-add-to-cart>${icon("cart")}<span>Add to Cart</span></button>` : ""}
          <button type="button" class="btn btn-wa btn-sm" data-hamper-wa>${icon("whatsapp")}<span>Enquire on WhatsApp</span></button>
        </div>
      </form>
    </div>
  </article>`;
}

export function hampersPage(ctx, { hampers, products }) {
  const seo = ctx.settings.seo.hampers;
  const crumbs = [{ name: "Home", url: "/" }, { name: "Festival Hampers", url: "/festival-hampers" }];
  const packaging = ctx.settings.hampers.packaging || [];
  const groups = OCCASIONS.map((o) => ({ ...o, items: hampers.filter((h) => h.occasion === o.id) }));
  const builderProducts = products.filter((p) => p.category !== "festival-hampers" && p.active && p.in_stock && p.slug !== "cupcakes");
  const byCat = [];
  for (const p of builderProducts) {
    let g = byCat.find((x) => x.name === p.category_name);
    if (!g) byCat.push((g = { name: p.category_name, items: [] }));
    g.items.push(p);
  }
  const minDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const body = html`
  <section class="hampers-hero">
    <picture><source media="(max-width: 700px)" srcset="/assets/images/site/hampers-festive-table-800.webp"><img src="/assets/images/site/hampers-festive-table.webp" width="1600" height="1240" alt="Ovenroma Bakers festive gift hamper on a Diwali table with diyas and marigolds" fetchpriority="high"></picture>
    <div class="container hampers-hero-copy">
      ${breadcrumbs(crumbs)}
      <p class="script light">Festive gifting</p>
      <h1>Celebrate Every Occasion with Ovenroma Gift Hampers</h1>
      <p class="lead">Thoughtfully curated bakery hampers filled with delicious treats and beautifully presented for your loved ones.</p>
      <div class="hero-ctas"><a class="btn btn-gold btn-lg" href="#hamper-collection">Shop Hampers</a><a class="btn btn-outline-light btn-lg" href="#build-your-own">Build Your Own</a></div>
    </div>
  </section>

  <nav class="occasion-nav" aria-label="Hamper occasions"><div class="container"><ul>
    ${groups.map((g) => html`<li><a href="#${g.id}">${g.name}</a></li>`)}
    <li><a href="#corporate-gifting">Corporate Enquiry</a></li>
  </ul></div></nav>

  <section class="section-sm" id="hamper-collection">
    <div class="container">
      ${groups.map((g) => html`<section class="occasion" id="${g.id}" aria-labelledby="occ-${g.id}">
        <header class="occasion-head"><h2 id="occ-${g.id}">${g.name}</h2><p>${g.blurb}</p></header>
        ${g.items.length
          ? html`<div class="hamper-grid">${g.items.map((h) => hamperCard(h, ctx, packaging))}</div>`
          : html`<p class="muted">New ${g.name.toLowerCase()} are coming soon — <a href="#build-your-own">build your own</a> or message us on WhatsApp.</p>`}
      </section>`)}
    </div>
  </section>

  <section class="section-sm section-tint" id="build-your-own" aria-labelledby="byo-title">
    <div class="container">
      ${sectionHead({ kicker: "Customised gift boxes", title: "Build Your Own Hamper", id: "byo-title", sub: "Pick your favourite Ovenroma products, choose the packaging and add a personal message. We'll send you a customised quotation." })}
      <form class="builder" data-builder novalidate>
        <div class="builder-products card">
          <h3 class="h4">1. Choose products <span class="opt">(per hamper)</span></h3>
          ${byCat.map((g) => html`<fieldset class="builder-group"><legend>${g.name}</legend><ul>
            ${g.items.map((p) => html`<li class="builder-item" data-builder-item="${p.slug}" data-name="${p.name}${p.weight ? " (" + p.weight + ")" : ""}" data-price="${p.variants.length ? "" : p.price_paise ?? ""}">
              <img src="${thumbOf(p.image)}" width="400" height="400" alt="" loading="lazy">
              <span class="bi-name">${p.name}<small>${[p.weight, p.price_paise !== null && !p.variants.length ? rupees(p.price_paise) : "price on request"].filter(Boolean).join(" • ")}</small></span>
              <span class="qty qty-sm" data-qty><button type="button" class="qty-btn" data-dec aria-label="Fewer ${p.name}">−</button><input type="number" inputmode="numeric" min="0" max="50" value="0" aria-label="${p.name} per hamper"><button type="button" class="qty-btn" data-inc aria-label="More ${p.name}">+</button></span>
            </li>`)}
          </ul></fieldset>`)}
        </div>
        <div class="builder-side card">
          <h3 class="h4">2. Packaging &amp; message</h3>
          <div class="field"><label for="bo-pack">Gift packaging *</label><select id="bo-pack" name="packaging" required><option value="">Choose packaging…</option>${packaging.map((o) => html`<option>${o}</option>`)}</select></div>
          <div class="field"><label for="bo-msg">Personalised message</label><textarea id="bo-msg" name="message" rows="2" maxlength="200" placeholder="Wishing you joy and sweetness this festive season!"></textarea></div>
          <div class="field"><label for="bo-count">Number of hampers *</label><input id="bo-count" name="hampers" type="number" min="1" max="10000" value="1" required inputmode="numeric"></div>
          <label class="check"><input type="checkbox" name="bulk"> This is a bulk / corporate gifting request</label>
          <h3 class="h4 mt">3. Your details</h3>
          <div class="field"><label for="bo-name">Name *</label><input id="bo-name" name="name" required minlength="2" maxlength="80" autocomplete="name"></div>
          <div class="field"><label for="bo-phone">Mobile number *</label><input id="bo-phone" name="phone" type="tel" required maxlength="16" inputmode="tel" autocomplete="tel"></div>
          <div class="field"><label for="bo-email">Email</label><input id="bo-email" name="email" type="email" maxlength="120" autocomplete="email"></div>
          <div class="field"><label for="bo-date">Needed by</label><input id="bo-date" name="date" type="date" min="${minDate}"></div>
          <div class="field"><label for="bo-city">Delivery city / area</label><input id="bo-city" name="city" maxlength="80"></div>
          <div class="builder-summary" aria-live="polite">
            <p><span>Items per hamper</span><strong data-b-items>0</strong></p>
            <p><span>Estimated product value</span><strong data-b-estimate>—</strong></p>
            <p class="fine">Estimate covers listed product prices only. Packaging, items priced on request and delivery are included in your quotation.</p>
          </div>
          <p class="form-error" role="alert" data-builder-error hidden></p>
          <button type="submit" class="btn btn-primary btn-block">Request Customised Quotation</button>
          <button type="button" class="btn btn-wa btn-block" data-builder-wa>${icon("whatsapp")}<span>Send on WhatsApp</span></button>
          <p class="form-status" role="status" data-form-status></p>
        </div>
      </form>
    </div>
  </section>

  <section class="section-sm" id="corporate-gifting" aria-labelledby="corp-title">
    <div class="container corp-grid">
      <div>
        <p class="kicker">Corporate gifting</p>
        <h2 class="section-title" id="corp-title">Gift hampers for clients &amp; teams</h2>
        <p>From Diwali gifting for your whole team to premium hampers for key clients, we curate, pack and deliver in bulk. Share your requirements and we'll send a tailored proposal and quotation.</p>
        <ul class="ticks">
          <li>${icon("check")} Bulk quantities with consistent, premium packing</li>
          <li>${icon("check")} Personalised greeting cards and company messages</li>
          <li>${icon("check")} Mix of muffins, cookies, namkeen and gluten-free options</li>
          <li>${icon("check")} Customised quotations to fit your budget</li>
        </ul>
        <img class="corp-img" src="/assets/images/hampers/hamper-golden-basket-400.webp" width="400" height="400" alt="Corporate gift hamper basket" loading="lazy">
      </div>
      <form class="card form" data-enquiry-form="corporate" novalidate>
        <h3 class="h3">Corporate gifting enquiry</h3>
        <div class="form-grid">
          <div class="field span-2"><label for="cg-company">Company name *</label><input id="cg-company" name="company" required minlength="2" maxlength="120" autocomplete="organization"></div>
          <div class="field"><label for="cg-name">Contact person *</label><input id="cg-name" name="name" required minlength="2" maxlength="80" autocomplete="name"></div>
          <div class="field"><label for="cg-phone">Mobile number *</label><input id="cg-phone" name="phone" type="tel" required maxlength="16" inputmode="tel" autocomplete="tel"></div>
          <div class="field span-2"><label for="cg-email">Work email *</label><input id="cg-email" name="email" type="email" required maxlength="120" autocomplete="email"></div>
          <div class="field"><label for="cg-qty">Number of hampers *</label><input id="cg-qty" name="quantity" type="number" min="1" max="100000" required inputmode="numeric"></div>
          <div class="field"><label for="cg-budget">Budget per hamper (₹)</label><input id="cg-budget" name="budget" type="number" min="0" max="1000000" inputmode="numeric"></div>
          <div class="field"><label for="cg-date">Delivery date</label><input id="cg-date" name="date" type="date" min="${minDate}"></div>
          <div class="field"><label for="cg-city">Delivery city</label><input id="cg-city" name="city" maxlength="80"></div>
          <div class="field span-2"><label for="cg-occasion">Occasion</label><select id="cg-occasion" name="occasion">${OCCASIONS.map((o) => html`<option>${o.name}</option>`)}</select></div>
          <div class="field span-2"><label for="cg-message">Requirements</label><textarea id="cg-message" name="message" rows="3" maxlength="1000" placeholder="Products you'd like, branding, delivery locations…"></textarea></div>
        </div>
        <button class="btn btn-primary" type="submit">Request Corporate Quotation</button>
        <p class="form-status" role="status" data-form-status></p>
      </form>
    </div>
  </section>`;
  return {
    title: seo.title,
    description: seo.description,
    path: "/festival-hampers",
    image: "/assets/images/site/hampers-festive-table.jpg",
    preload: "/assets/images/site/hampers-festive-table.webp",
    body,
    bodyClass: "page-hampers",
    scripts: ["/assets/js/hampers.js", "/assets/js/forms.js"],
    jsonLd: [
      breadcrumbLd(crumbs, ctx.origin),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Ovenroma Bakers Festival Hampers",
        itemListElement: hampers.map((h, i) => ({ "@type": "ListItem", position: i + 1, url: ctx.origin + "/product/" + h.slug, name: h.name })),
      },
    ],
  };
}

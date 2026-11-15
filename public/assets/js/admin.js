// Ovenroma Bakers admin panel (no framework). Talks to /api/admin/* with the
// session cookie + X-CSRF-Token header. All dynamic text is escaped.
import { rupees } from "./lib/format.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const app = document.getElementById("admin");
let csrf = "";
let cache = { products: null, categories: null, settings: null };

const TAGS = [["veg", "Vegetarian"], ["eggless", "Eggless"], ["gluten-free", "Gluten-free"], ["gift", "Gift"], ["bulk", "Bulk orders"]];
const OCCASIONS = [["", "— Not a hamper —"], ["diwali", "Diwali"], ["christmas", "Christmas"], ["new-year", "New Year"], ["rakhi", "Rakhi"], ["wedding", "Wedding return gifts"], ["corporate", "Corporate"], ["birthday", "Birthday"], ["custom", "Customised"]];
const ORDER_STATUSES = ["created", "paid", "failed", "whatsapp", "cancelled", "fulfilled"];
const ENQ_STATUSES = ["new", "contacted", "confirmed", "closed"];
const toRupees = (p) => (p === null || p === undefined ? "" : String(p / 100));

// ------------------------------------------------------------------ api
async function call(path, { method = "GET", body, form } = {}) {
  const headers = {};
  if (method !== "GET") headers["X-CSRF-Token"] = csrf;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch("/api/admin" + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined), credentials: "same-origin" });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (res.status === 401 && path !== "/login") { renderLogin("Your session has expired. Please sign in again."); throw new Error("Please sign in"); }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function flash(msg, bad = false) {
  const el = document.createElement("div");
  el.className = "flash" + (bad ? " bad" : "");
  el.setAttribute("role", bad ? "alert" : "status");
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), bad ? 6000 : 2600);
}

async function guard(fn) {
  try { return await fn(); } catch (e) { if (e.message !== "Please sign in") flash(e.message, true); return null; }
}

// ------------------------------------------------------------------ login
function renderLogin(message = "") {
  app.innerHTML = `<div class="login-wrap"><form class="login card" data-login>
    <div class="brand"><span class="logo-name">Ovenroma</span><span class="logo-sub">Bakers · Admin</span></div>
    <h1>Sign in</h1>
    ${message ? `<p class="err">${esc(message)}</p>` : ""}
    <label>Username<input name="username" autocomplete="username" required value="admin"></label>
    <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn primary" type="submit">Sign in</button>
    <p class="err" data-err hidden></p>
    <a class="back" href="/">← Back to website</a>
  </form></div>`;
  const form = app.querySelector("[data-login]");
  form.password.focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = form.querySelector("[data-err]");
    err.hidden = true;
    form.querySelector("button").disabled = true;
    try {
      const res = await call("/login", { method: "POST", body: { username: form.username.value, password: form.password.value } });
      csrf = res.csrf;
      shell();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    } finally {
      form.querySelector("button").disabled = false;
    }
  });
}

// ------------------------------------------------------------------ shell
const VIEWS = {
  dashboard: ["Dashboard", viewDashboard],
  products: ["Products", () => viewProducts(false)],
  hampers: ["Festival Hampers", () => viewProducts(true)],
  categories: ["Categories", viewCategories],
  orders: ["Orders", viewOrders],
  enquiries: ["Enquiries", viewEnquiries],
  testimonials: ["Testimonials", () => viewRows("testimonials")],
  banners: ["Homepage Banners", () => viewRows("banners")],
  settings: ["Settings", viewSettings],
  seo: ["SEO", viewSeo],
};

function shell() {
  app.innerHTML = `<div class="layout">
    <aside class="side"><div class="brand"><span class="logo-name">Ovenroma</span><span class="logo-sub">Bakers · Admin</span></div>
      <nav>${Object.entries(VIEWS).map(([k, [label]]) => `<a href="#${k}" data-view="${k}">${label}</a>`).join("")}</nav>
      <div class="side-foot"><a href="/" target="_blank" rel="noopener">View website ↗</a><button class="linkish" data-logout>Sign out</button></div>
    </aside>
    <main class="main" id="view" tabindex="-1"></main>
  </div>`;
  app.querySelector("[data-logout]").addEventListener("click", async () => {
    await guard(() => call("/logout", { method: "POST" }));
    csrf = "";
    renderLogin("You have signed out.");
  });
  window.onhashchange = route;
  route();
}

function route() {
  const key = (location.hash || "#dashboard").slice(1).split("/")[0];
  const view = VIEWS[key] ? key : "dashboard";
  app.querySelectorAll("[data-view]").forEach((a) => a.classList.toggle("on", a.dataset.view === view));
  const main = document.getElementById("view");
  main.innerHTML = `<p class="muted">Loading…</p>`;
  VIEWS[view][1]();
  main.focus({ preventScroll: true });
}

const $view = () => document.getElementById("view");

// ------------------------------------------------------------------ dashboard
async function viewDashboard() {
  const d = await guard(() => call("/dashboard"));
  if (!d) return;
  const by = (arr, k) => Object.fromEntries(arr.map((r) => [r.status, r[k]]));
  const oc = by(d.orders, "n");
  const ot = by(d.orders, "total");
  const ec = by(d.enquiries, "n");
  $view().innerHTML = `<h1>Dashboard</h1>
    ${d.warnings.map((w) => `<p class="warn">${esc(w)}</p>`).join("")}
    <div class="stats">
      <div class="stat"><span>Paid orders</span><strong>${oc.paid || 0}</strong><small>${rupees(ot.paid || 0)}</small></div>
      <div class="stat"><span>WhatsApp orders</span><strong>${oc.whatsapp || 0}</strong><small>${rupees(ot.whatsapp || 0)}</small></div>
      <div class="stat"><span>New enquiries</span><strong>${ec.new || 0}</strong><small>bulk, hampers, contact</small></div>
      <div class="stat"><span>Products</span><strong>${d.products.n || 0}</strong><small>${d.products.unpriced || 0} without price · ${d.products.oos || 0} out of stock</small></div>
    </div>
    <div class="two">
      <section class="card"><h2>Recent orders</h2>${table(["Ref", "Customer", "Total", "Status"], d.recentOrders.map((o) => [esc(o.ref), esc(o.customer_name), rupees(o.total_paise), `<span class="pill s-${esc(o.status)}">${esc(o.status)}</span>`]))}<a href="#orders">All orders →</a></section>
      <section class="card"><h2>Recent enquiries</h2>${table(["Type", "Name", "Value", "Status"], d.recentEnquiries.map((e) => [esc(e.type), esc(e.name), e.total_paise ? rupees(e.total_paise) : "—", `<span class="pill s-${esc(e.status)}">${esc(e.status)}</span>`]))}<a href="#enquiries">All enquiries →</a></section>
    </div>`;
}

function table(head, rows) {
  if (!rows.length) return `<p class="muted">Nothing yet.</p>`;
  return `<div class="tbl"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

// ------------------------------------------------------------------ image upload
async function toBlob(bitmap, size, type) {
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const out = Math.min(size, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
}

async function uploadImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPEG, PNG or WebP image");
  const bitmap = await createImageBitmap(file);
  let main = await toBlob(bitmap, 1000, "image/webp");
  let type = "image/webp";
  if (!main || main.type !== "image/webp") { main = await toBlob(bitmap, 1000, "image/jpeg"); type = "image/jpeg"; }
  const thumb = await toBlob(bitmap, 400, type);
  const fd = new FormData();
  const ext = type === "image/webp" ? "webp" : "jpg";
  fd.append("main", main, "main." + ext);
  fd.append("thumb", thumb, "thumb." + ext);
  const res = await call("/upload", { method: "POST", form: fd });
  return res.url;
}

function imageField(name, value, label = "Image") {
  return `<div class="field img-field" data-img-field>
    <label>${label}</label>
    <div class="img-row"><img src="${esc(value || "")}" alt="" data-preview ${value ? "" : "hidden"}>
      <div class="img-ctrl"><input name="${name}" value="${esc(value || "")}" placeholder="/assets/images/… or upload" data-img-url>
        <label class="btn small">Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" hidden data-img-file></label>
        <small class="muted">Square photos look best. Resized to WebP automatically.</small></div></div>
  </div>`;
}

function bindImageFields(root) {
  root.querySelectorAll("[data-img-field]").forEach((f) => {
    const url = f.querySelector("[data-img-url]");
    const prev = f.querySelector("[data-preview]");
    url.addEventListener("input", () => { prev.src = url.value; prev.hidden = !url.value; });
    f.querySelector("[data-img-file]").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      flash("Uploading…");
      const u = await guard(() => uploadImage(file));
      if (u) { url.value = u; prev.src = u; prev.hidden = false; flash("Image uploaded — remember to save"); }
      e.target.value = "";
    });
  });
}

// ------------------------------------------------------------------ products
async function loadProducts(force = false) {
  if (force || !cache.products) {
    const d = await call("/products");
    cache.products = d.products;
    cache.categories = d.categories;
  }
  return cache;
}

async function viewProducts(hampers) {
  const sub = (location.hash.split("/")[1] || "");
  if (sub) return editProduct(sub === "new" ? null : Number(sub), hampers);
  const d = await guard(() => loadProducts(true));
  if (!d) return;
  const list = d.products.filter((p) => (p.category === "festival-hampers") === hampers);
  const base = hampers ? "hampers" : "products";
  $view().innerHTML = `<div class="head"><h1>${hampers ? "Festival Hampers" : "Products"}</h1><a class="btn primary" href="#${base}/new">+ Add ${hampers ? "hamper" : "product"}</a></div>
    <p class="muted">Edit prices directly in the table (press Enter or leave the field to save). Leave a price empty for “price on request”.</p>
    <div class="filters"><input type="search" placeholder="Search…" data-q>${hampers ? "" : `<select data-cat><option value="">All categories</option>${d.categories.filter((c) => c.slug !== "festival-hampers").map((c) => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join("")}</select>`}</div>
    <div class="tbl"><table class="products"><thead><tr><th></th><th>Name</th><th>${hampers ? "Occasion" : "Category"}</th><th>Price (₹)</th><th>In stock</th><th>Best seller</th><th>Visible</th><th></th></tr></thead>
    <tbody>${list.map((p) => `<tr data-id="${p.id}" data-cat="${esc(p.category)}" data-name="${esc(p.name.toLowerCase())}">
      <td><img class="thumb" src="${esc((p.image || "").replace(/\.(webp|jpg|png)$/, "-400.$1"))}" alt="" loading="lazy"></td>
      <td><strong>${esc(p.name)}</strong><br><small class="muted">/product/${esc(p.slug)}</small></td>
      <td>${esc(hampers ? p.occasion : p.category_name)}</td>
      <td>${p.variants.length ? `<small>${p.variants.map((v) => esc(v.label) + ": " + (v.price_paise === null ? "on request" : rupees(v.price_paise))).join("<br>")}</small>` : `<input class="price-in" type="number" min="0" step="0.5" value="${toRupees(p.price_paise)}" placeholder="on request" data-quick="price" aria-label="Price of ${esc(p.name)}">`}</td>
      <td><input type="checkbox" ${p.in_stock ? "checked" : ""} data-quick="in_stock" aria-label="In stock"></td>
      <td><input type="checkbox" ${p.featured ? "checked" : ""} data-quick="featured" aria-label="Best seller"></td>
      <td><input type="checkbox" ${p.active ? "checked" : ""} data-quick="active" aria-label="Visible on site"></td>
      <td><a class="btn small" href="#${base}/${p.id}">Edit</a></td></tr>`).join("")}</tbody></table></div>`;
  const tbody = $view().querySelector("tbody");
  const filter = () => {
    const q = ($view().querySelector("[data-q]").value || "").toLowerCase();
    const c = $view().querySelector("[data-cat]")?.value || "";
    tbody.querySelectorAll("tr").forEach((tr) => { tr.hidden = (q && !tr.dataset.name.includes(q)) || (c && tr.dataset.cat !== c); });
  };
  $view().querySelector("[data-q]").addEventListener("input", filter);
  $view().querySelector("[data-cat]")?.addEventListener("change", filter);
  tbody.addEventListener("change", async (e) => {
    const el = e.target.closest("[data-quick]");
    if (!el) return;
    const id = el.closest("tr").dataset.id;
    const key = el.dataset.quick;
    const body = { [key]: el.type === "checkbox" ? el.checked : el.value };
    const r = await guard(() => call("/products/" + id, { method: "PATCH", body }));
    if (r) { flash("Saved"); cache.products = null; }
  });
}

async function editProduct(id, hamper) {
  const d = await guard(() => loadProducts());
  if (!d) return;
  const p = id ? d.products.find((x) => x.id === id) : {
    name: "", slug: "", category: hamper ? "festival-hampers" : (d.categories[0] || {}).slug, short: "", description: "", packaging: "", weight: "",
    price_paise: null, mrp_paise: null, image: "", gallery: [], tags: ["veg"], variants: [], includes: [], occasion: hamper ? "custom" : "",
    customisable: hamper, bulk_note: "", in_stock: true, featured: false, active: true, sort: 100, seo_title: "", seo_description: "",
  };
  if (!p) { $view().innerHTML = `<p>Product not found.</p>`; return; }
  const base = hamper ? "hampers" : "products";
  $view().innerHTML = `<div class="head"><h1>${id ? "Edit" : "Add"} ${hamper ? "hamper" : "product"}</h1><a href="#${base}">← Back</a></div>
  <form class="card form" data-product>
    <div class="grid">
      <div class="field"><label>Name *</label><input name="name" required value="${esc(p.name)}"></div>
      <div class="field"><label>URL slug</label><input name="slug" value="${esc(p.slug)}" placeholder="auto from name"><small class="muted">Page address: /product/<em>slug</em></small></div>
      <div class="field"><label>Category *</label><select name="category">${d.categories.map((c) => `<option value="${esc(c.slug)}" ${c.slug === p.category ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Hamper occasion</label><select name="occasion">${OCCASIONS.map(([v, l]) => `<option value="${v}" ${v === p.occasion ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label>Price (₹)</label><input name="price" type="number" min="0" step="0.5" value="${toRupees(p.price_paise)}" placeholder="Empty = price on request"></div>
      <div class="field"><label>MRP (₹, optional strike-through)</label><input name="mrp" type="number" min="0" step="0.5" value="${toRupees(p.mrp_paise)}"></div>
      <div class="field"><label>Packaging</label><input name="packaging" value="${esc(p.packaging)}" placeholder="Clear Box, Kraft Pouch…"></div>
      <div class="field"><label>Weight / pack size</label><input name="weight" value="${esc(p.weight)}" placeholder="200g, 6 pieces…"></div>
      <div class="field wide"><label>Short description (cards)</label><input name="short" maxlength="300" value="${esc(p.short)}"></div>
      <div class="field wide"><label>Full description</label><textarea name="description" rows="5">${esc(p.description)}</textarea></div>
      <div class="wide">${imageField("image", p.image, "Main photo")}</div>
      <div class="field wide"><label>Extra gallery photos (one image path per line)</label><textarea name="gallery" rows="2">${esc(p.gallery.join("\n"))}</textarea>
        <label class="btn small">Upload &amp; add to gallery<input type="file" accept="image/jpeg,image/png,image/webp" hidden data-gallery-file></label></div>
      <div class="field wide"><label>Variants / options <small class="muted">(e.g. White Flour / Lite Flour, 500g / 1kg) — leave price empty for “on request”</small></label>
        <div data-variants>${p.variants.map((v) => variantRow(v)).join("")}</div><button type="button" class="btn small" data-add-variant>+ Add option</button></div>
      <div class="field wide"><label>What's included (hampers — one item per line)</label><textarea name="includes" rows="3">${esc(p.includes.join("\n"))}</textarea></div>
      <div class="field wide"><label>Bulk-order note</label><input name="bulk_note" value="${esc(p.bulk_note)}" placeholder="Bulk orders: ₹8 per piece"></div>
      <fieldset class="field wide"><legend>Labels</legend>${TAGS.map(([v, l]) => `<label class="chk"><input type="checkbox" name="tags" value="${v}" ${p.tags.includes(v) ? "checked" : ""}> ${l}</label>`).join("")}</fieldset>
      <fieldset class="field wide"><legend>Status</legend>
        <label class="chk"><input type="checkbox" name="in_stock" ${p.in_stock ? "checked" : ""}> In stock</label>
        <label class="chk"><input type="checkbox" name="featured" ${p.featured ? "checked" : ""}> Best seller (homepage)</label>
        <label class="chk"><input type="checkbox" name="active" ${p.active ? "checked" : ""}> Visible on website</label>
        <label class="chk"><input type="checkbox" name="customisable" ${p.customisable ? "checked" : ""}> Customisable (gift packaging + message)</label></fieldset>
      <div class="field"><label>Sort order</label><input name="sort" type="number" value="${esc(p.sort)}"></div>
      <div class="field wide"><label>SEO title <small class="muted">(optional, ~60 characters)</small></label><input name="seo_title" maxlength="120" value="${esc(p.seo_title)}"></div>
      <div class="field wide"><label>SEO description <small class="muted">(optional, ~155 characters)</small></label><textarea name="seo_description" rows="2" maxlength="320">${esc(p.seo_description)}</textarea></div>
    </div>
    <div class="actions"><button class="btn primary" type="submit">Save</button>${id ? `<a class="btn" href="/product/${esc(p.slug)}" target="_blank" rel="noopener">View on site ↗</a><button type="button" class="btn danger" data-delete>Delete</button>` : ""}</div>
  </form>`;
  const form = $view().querySelector("[data-product]");
  bindImageFields(form);
  form.querySelector("[data-add-variant]").addEventListener("click", () => form.querySelector("[data-variants]").insertAdjacentHTML("beforeend", variantRow({})));
  form.querySelector("[data-variants]").addEventListener("click", (e) => { if (e.target.closest("[data-rm-variant]")) e.target.closest(".variant").remove(); });
  form.querySelector("[data-gallery-file]").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const u = await guard(() => uploadImage(f));
    if (u) { form.gallery.value = (form.gallery.value.trim() + "\n" + u).trim(); flash("Added to gallery — remember to save"); }
    e.target.value = "";
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = form.elements;
    const body = {
      name: f.name.value, slug: f.slug.value, category: f.category.value, occasion: f.occasion.value,
      price: f.price.value, mrp: f.mrp.value, packaging: f.packaging.value, weight: f.weight.value, short: f.short.value,
      description: f.description.value, image: f.image.value, gallery: f.gallery.value.split("\n").map((s) => s.trim()).filter(Boolean),
      variants: [...form.querySelectorAll(".variant")].map((v) => ({ id: v.dataset.id || "", label: v.querySelector("[data-v-label]").value, price: v.querySelector("[data-v-price]").value })).filter((v) => v.label.trim()),
      includes: f.includes.value.split("\n").map((s) => s.trim()).filter(Boolean), bulk_note: f.bulk_note.value,
      tags: [...form.querySelectorAll("[name=tags]:checked")].map((c) => c.value),
      in_stock: f.in_stock.checked, featured: f.featured.checked, active: f.active.checked, customisable: f.customisable.checked,
      sort: f.sort.value, seo_title: f.seo_title.value, seo_description: f.seo_description.value,
    };
    const r = await guard(() => call(id ? "/products/" + id : "/products", { method: id ? "PUT" : "POST", body }));
    if (r) { flash("Saved"); cache.products = null; location.hash = base; }
  });
  form.querySelector("[data-delete]")?.addEventListener("click", async () => {
    if (!confirm("Delete “" + p.name + "”? This cannot be undone. (Tip: untick “Visible on website” to hide it instead.)")) return;
    const r = await guard(() => call("/products/" + id, { method: "DELETE" }));
    if (r) { flash("Deleted"); cache.products = null; location.hash = base; }
  });
}

function variantRow(v) {
  return `<div class="variant" data-id="${esc(v.id || "")}"><input placeholder="Option name" value="${esc(v.label || "")}" data-v-label aria-label="Option name"><input type="number" min="0" step="0.5" placeholder="Price ₹ (empty = on request)" value="${toRupees(v.price_paise)}" data-v-price aria-label="Option price"><button type="button" class="btn small" data-rm-variant>Remove</button></div>`;
}

// ------------------------------------------------------------------ categories
async function viewCategories() {
  const d = await guard(() => loadProducts(true));
  if (!d) return;
  $view().innerHTML = `<div class="head"><h1>Categories</h1></div>
    <div class="stack">${d.categories.map((c) => categoryForm(c)).join("")}</div>
    <h2>Add a category</h2>${categoryForm({ slug: "", name: "", blurb: "", description: "", image: "", seo_title: "", seo_description: "", sort: 50, active: 1 }, true)}`;
  $view().querySelectorAll("[data-cat-form]").forEach((form) => {
    bindImageFields(form);
    const slug = form.dataset.catForm;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = form.elements;
      const body = { name: f.name.value, slug: f.slug ? f.slug.value : undefined, blurb: f.blurb.value, description: f.description.value, image: f.image.value, seo_title: f.seo_title.value, seo_description: f.seo_description.value, sort: f.sort.value, active: f.active.checked };
      const r = await guard(() => call(slug ? "/categories/" + slug : "/categories", { method: slug ? "PUT" : "POST", body }));
      if (r) { flash("Saved"); cache.products = null; viewCategories(); }
    });
    form.querySelector("[data-delete]")?.addEventListener("click", async () => {
      if (!confirm("Delete this category?")) return;
      const r = await guard(() => call("/categories/" + slug, { method: "DELETE" }));
      if (r) { flash("Deleted"); viewCategories(); }
    });
  });
}

function categoryForm(c, isNew = false) {
  return `<form class="card form" data-cat-form="${esc(c.slug)}"><div class="grid">
    <div class="field"><label>Name *</label><input name="name" required value="${esc(c.name)}"></div>
    ${isNew ? `<div class="field"><label>URL slug</label><input name="slug" placeholder="auto from name"></div>` : `<div class="field"><label>Page</label><a href="/shop/${esc(c.slug)}" target="_blank" rel="noopener">/shop/${esc(c.slug)} ↗</a></div>`}
    <div class="field wide"><label>Short blurb</label><input name="blurb" value="${esc(c.blurb)}"></div>
    <div class="field wide"><label>Description</label><textarea name="description" rows="2">${esc(c.description)}</textarea></div>
    <div class="wide">${imageField("image", c.image, "Category photo")}</div>
    <div class="field"><label>SEO title</label><input name="seo_title" value="${esc(c.seo_title)}"></div>
    <div class="field"><label>SEO description</label><input name="seo_description" value="${esc(c.seo_description)}"></div>
    <div class="field"><label>Sort order</label><input name="sort" type="number" value="${esc(c.sort)}"></div>
    <label class="chk"><input type="checkbox" name="active" ${c.active ? "checked" : ""}> Visible</label>
  </div><div class="actions"><button class="btn primary">${isNew ? "Add category" : "Save"}</button>${isNew ? "" : `<button type="button" class="btn danger" data-delete>Delete</button>`}</div></form>`;
}

// ------------------------------------------------------------------ orders
async function viewOrders() {
  $view().innerHTML = `<div class="head"><h1>Orders</h1></div>
    <div class="filters"><select data-status><option value="">All statuses</option>${ORDER_STATUSES.map((s) => `<option>${s}</option>`).join("")}</select><input type="search" placeholder="Search ref, name, phone" data-q></div>
    <div data-list><p class="muted">Loading…</p></div>`;
  const load = async () => {
    const st = $view().querySelector("[data-status]").value;
    const q = $view().querySelector("[data-q]").value.trim();
    const d = await guard(() => call("/orders?" + new URLSearchParams({ status: st, q })));
    if (!d) return;
    const box = $view().querySelector("[data-list]");
    box.innerHTML = d.orders.length ? d.orders.map((o) => `<details class="card order"><summary>
        <span><strong>${esc(o.ref)}</strong><br><small class="muted">${esc(o.created_at)} UTC · ${esc(o.payment_method)}</small></span>
        <span>${esc(o.customer_name)}<br><small>${esc(o.phone)}</small></span>
        <strong>${rupees(o.total_paise)}</strong>
        <span class="pill s-${esc(o.status)}">${esc(o.status)}</span></summary>
      <div class="order-body">
        <table><tbody>${o.items.map((i) => `<tr><td>${esc(i.name)}${i.variant_label ? " — " + esc(i.variant_label) : ""}${i.packaging ? `<br><small>Packaging: ${esc(i.packaging)}</small>` : ""}${i.message ? `<br><small>Message: “${esc(i.message)}”</small>` : ""}</td><td>× ${i.qty}</td><td>${rupees(i.line_paise)}</td></tr>`).join("")}
        <tr><td colspan="2">Shipping</td><td>${rupees(o.shipping_paise)}</td></tr><tr><th colspan="2">Total</th><th>${rupees(o.total_paise)}</th></tr></tbody></table>
        <p><strong>Deliver to:</strong> ${esc(o.address)}, ${esc(o.city)} – ${esc(o.pincode)}${o.email ? `<br><strong>Email:</strong> ${esc(o.email)}` : ""}${o.notes ? `<br><strong>Notes:</strong> ${esc(o.notes)}` : ""}</p>
        ${o.razorpay_payment_id ? `<p><strong>Razorpay payment:</strong> ${esc(o.razorpay_payment_id)} · order ${esc(o.razorpay_order_id)}</p>` : o.razorpay_order_id ? `<p><strong>Razorpay order:</strong> ${esc(o.razorpay_order_id)}</p>` : ""}
        ${o.failure_reason ? `<p class="muted">Failure: ${esc(o.failure_reason)}</p>` : ""}
        <div class="actions"><label>Status <select data-order-status="${o.id}">${ORDER_STATUSES.map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <a class="btn small" href="https://wa.me/${esc(o.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1"))}?text=${encodeURIComponent("Hello " + o.customer_name + ", this is Ovenroma Bakers about your order " + o.ref + ".")}" target="_blank" rel="noopener">WhatsApp customer</a></div>
      </div></details>`).join("") : `<p class="muted">No orders found.</p>`;
  };
  $view().querySelector("[data-status]").addEventListener("change", load);
  $view().querySelector("[data-q]").addEventListener("input", debounce(load, 300));
  $view().addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-order-status]");
    if (!sel) return;
    const r = await guard(() => call("/orders/" + sel.dataset.orderStatus, { method: "PATCH", body: { status: sel.value } }));
    if (r) { flash("Status updated"); load(); }
  });
  load();
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ------------------------------------------------------------------ enquiries
function payloadHtml(e) {
  const p = e.payload || {};
  const rows = [];
  if (p.lines) rows.push(`<table><tbody>${p.lines.map((l) => `<tr><td>${esc(l.name)}${l.variety ? " – " + esc(l.variety) : ""}</td><td>${esc(l.qty)} ${esc(l.unit)}</td><td>${rupees(l.line_paise)}</td></tr>`).join("")}</tbody></table>`);
  if (p.items && p.items.length) rows.push(`<p><strong>Products per hamper:</strong> ${p.items.map((i) => esc(i.name) + " × " + esc(i.qty)).join(", ")}</p>`);
  const labels = { event_name: "Event", event_date: "Event date", location: "Location", address: "Address", people: "People", notes: "Instructions", packaging: "Packaging", message: "Message", hampers: "Hampers", bulk: "Bulk gifting", date: "Date", city: "City", hamper: "Hamper", company: "Company", quantity: "Quantity", budget: "Budget / hamper (₹)", occasion: "Occasion", subject: "Topic" };
  rows.push(`<dl>${Object.entries(labels).filter(([k]) => p[k] !== undefined && p[k] !== "" && p[k] !== null && p[k] !== false).map(([k, l]) => `<dt>${l}</dt><dd>${esc(p[k] === true ? "Yes" : p[k])}</dd>`).join("")}</dl>`);
  return rows.join("");
}

async function viewEnquiries() {
  $view().innerHTML = `<div class="head"><h1>Enquiries</h1></div>
    <div class="filters"><select data-type><option value="">All types</option><option value="bulk">Langar &amp; Bhandara (bulk)</option><option value="custom-hamper">Custom hampers</option><option value="corporate">Corporate gifting</option><option value="contact">Contact form</option></select></div>
    <div data-list><p class="muted">Loading…</p></div>`;
  const load = async () => {
    const d = await guard(() => call("/enquiries?" + new URLSearchParams({ type: $view().querySelector("[data-type]").value })));
    if (!d) return;
    $view().querySelector("[data-list]").innerHTML = d.enquiries.length ? d.enquiries.map((e) => `<details class="card order"><summary>
      <span><strong>#${e.id} · ${esc(e.type)}</strong><br><small class="muted">${esc(e.created_at)} UTC</small></span>
      <span>${esc(e.name)}<br><small>${esc(e.phone)} ${esc(e.email)}</small></span>
      <strong>${e.total_paise ? rupees(e.total_paise) : "—"}</strong>
      <span class="pill s-${esc(e.status)}">${esc(e.status)}</span></summary>
      <div class="order-body">${payloadHtml(e)}
        <div class="actions"><label>Status <select data-enq-status="${e.id}">${ENQ_STATUSES.map((s) => `<option ${s === e.status ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        ${e.phone ? `<a class="btn small" href="https://wa.me/${esc(e.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1"))}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        <button type="button" class="btn small danger" data-enq-delete="${e.id}">Delete</button></div></div></details>`).join("") : `<p class="muted">No enquiries yet.</p>`;
  };
  $view().querySelector("[data-type]").addEventListener("change", load);
  $view().addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-enq-status]");
    if (!sel) return;
    const r = await guard(() => call("/enquiries/" + sel.dataset.enqStatus, { method: "PATCH", body: { status: sel.value } }));
    if (r) { flash("Status updated"); load(); }
  });
  $view().addEventListener("click", async (e) => {
    const b = e.target.closest("[data-enq-delete]");
    if (!b || !confirm("Delete this enquiry?")) return;
    const r = await guard(() => call("/enquiries/" + b.dataset.enqDelete, { method: "DELETE" }));
    if (r) { flash("Deleted"); load(); }
  });
  load();
}

// ------------------------------------------------------------------ testimonials & banners
const ROW_FIELDS = {
  testimonials: {
    title: "Testimonials",
    help: "Only publish genuine customer reviews (with their permission). Tick Active to show one on the homepage.",
    blank: { name: "", location: "", text: "", rating: 5, active: 1, sort: 0 },
    fields: (r) => `<div class="field"><label>Customer name *</label><input name="name" value="${esc(r.name)}" required></div>
      <div class="field"><label>Location</label><input name="location" value="${esc(r.location)}"></div>
      <div class="field wide"><label>Review *</label><textarea name="text" rows="3" required>${esc(r.text)}</textarea></div>
      <div class="field"><label>Rating</label><select name="rating">${[5, 4, 3, 2, 1].map((n) => `<option ${n === r.rating ? "selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="field"><label>Sort order</label><input name="sort" type="number" value="${esc(r.sort)}"></div>
      <label class="chk"><input type="checkbox" name="active" ${r.active ? "checked" : ""}> Active (shown on homepage)</label>`,
  },
  banners: {
    title: "Homepage Banners",
    help: "A “hero” banner replaces the homepage headline, subtitle, main photo and button. The first “promo” banner fills the Langar & Bhandara band.",
    blank: { placement: "promo", title: "", subtitle: "", image: "", cta_label: "", cta_url: "", active: 1, sort: 0 },
    fields: (r) => `<div class="field"><label>Placement</label><select name="placement"><option value="hero" ${r.placement === "hero" ? "selected" : ""}>Hero (top of homepage)</option><option value="promo" ${r.placement === "promo" ? "selected" : ""}>Promo (Langar band)</option></select></div>
      <div class="field"><label>Sort order</label><input name="sort" type="number" value="${esc(r.sort)}"></div>
      <div class="field wide"><label>Title *</label><input name="title" value="${esc(r.title)}" required></div>
      <div class="field wide"><label>Subtitle</label><textarea name="subtitle" rows="2">${esc(r.subtitle)}</textarea></div>
      <div class="wide">${imageField("image", r.image, "Photo")}</div>
      <div class="field"><label>Button label</label><input name="cta_label" value="${esc(r.cta_label)}"></div>
      <div class="field"><label>Button link (site path)</label><input name="cta_url" value="${esc(r.cta_url)}" placeholder="/shop"></div>
      <label class="chk"><input type="checkbox" name="active" ${r.active ? "checked" : ""}> Active</label>`,
  },
};

async function viewRows(table) {
  const cfg = ROW_FIELDS[table];
  const d = await guard(() => call("/" + table));
  if (!d) return;
  const formHtml = (r, isNew) => `<form class="card form" data-row="${isNew ? "" : r.id}"><div class="grid">${cfg.fields(r)}</div>
    <div class="actions"><button class="btn primary">${isNew ? "Add" : "Save"}</button>${isNew ? "" : `<button type="button" class="btn danger" data-delete>Delete</button>`}</div></form>`;
  $view().innerHTML = `<div class="head"><h1>${cfg.title}</h1></div><p class="muted">${cfg.help}</p>
    <div class="stack">${d.rows.map((r) => formHtml(r, false)).join("")}</div><h2>Add new</h2>${formHtml(cfg.blank, true)}`;
  $view().querySelectorAll("[data-row]").forEach((form) => {
    bindImageFields(form);
    const id = form.dataset.row;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = {};
      for (const el of form.elements) if (el.name) body[el.name] = el.type === "checkbox" ? el.checked : el.value;
      const r = await guard(() => call("/" + table + (id ? "/" + id : ""), { method: id ? "PUT" : "POST", body }));
      if (r) { flash("Saved"); viewRows(table); }
    });
    form.querySelector("[data-delete]")?.addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      const r = await guard(() => call("/" + table + "/" + id, { method: "DELETE" }));
      if (r) { flash("Deleted"); viewRows(table); }
    });
  });
}

// ------------------------------------------------------------------ settings
async function viewSettings() {
  const d = await guard(() => call("/settings"));
  if (!d) return;
  const s = d.settings;
  $view().innerHTML = `<h1>Settings</h1>
  <form class="card form" data-setting="store"><h2>Store &amp; WhatsApp</h2><div class="grid">
    <div class="field wide"><label>WhatsApp business number *</label><input name="whatsapp" value="${esc(s.store.whatsapp)}" placeholder="919876543210" inputmode="numeric"><small class="muted">Digits only, with country code (India: 91 + 10-digit number). Used by every WhatsApp button and order message.</small></div>
    <div class="field"><label>Phone (shown on site)</label><input name="phone" value="${esc(s.store.phone)}"></div>
    <div class="field"><label>Email</label><input name="email" type="email" value="${esc(s.store.email)}"></div>
    <div class="field wide"><label>Address</label><input name="address" value="${esc(s.store.address)}"></div>
    <div class="field"><label>City</label><input name="city" value="${esc(s.store.city)}"></div>
    <div class="field"><label>State</label><input name="region" value="${esc(s.store.region)}"></div>
    <div class="field"><label>Pincode</label><input name="postcode" value="${esc(s.store.postcode)}"></div>
    <div class="field"><label>Opening hours</label><input name="hours" value="${esc(s.store.hours)}" placeholder="Mo-Sa 09:00-20:00"></div>
    <div class="field wide"><label>Tagline</label><input name="tagline" value="${esc(s.store.tagline)}"></div>
  </div><div class="actions"><button class="btn primary">Save store details</button></div></form>

  <form class="card form" data-setting="shipping"><h2>Delivery charges (online orders)</h2><div class="grid">
    <div class="field"><label>Flat delivery charge (₹)</label><input name="flat" type="number" min="0" step="1" value="${toRupees(s.shipping.flat_paise)}"></div>
    <div class="field"><label>Free delivery above (₹)</label><input name="free_above" type="number" min="0" step="1" value="${toRupees(s.shipping.free_above_paise)}" placeholder="Empty = never free"></div>
    <div class="field wide"><label>Note shown at checkout</label><input name="note" value="${esc(s.shipping.note)}"></div>
  </div><div class="actions"><button class="btn primary">Save delivery settings</button></div></form>

  <form class="card form" data-setting="bulk"><h2>Langar &amp; Bhandara bulk prices</h2><div class="grid">
    ${s.bulk.products.map((b) => `<div class="field"><label>${esc(b.name)} — ₹ per ${esc(b.unit)}</label><input type="number" min="0.5" step="0.5" name="price_${esc(b.id)}" value="${toRupees(b.price_paise)}" required></div>`).join("")}
    <div class="field wide"><label>Biscuit varieties (one per line)</label><textarea name="varieties" rows="6">${esc(s.bulk.varieties.join("\n"))}</textarea></div>
    <div class="field wide"><label>Note</label><textarea name="note" rows="2">${esc(s.bulk.note)}</textarea></div>
  </div><div class="actions"><button class="btn primary">Save bulk prices</button></div></form>

  <form class="card form" data-setting="hampers"><h2>Hamper gift packaging options</h2><div class="grid">
    <div class="field wide"><label>Packaging options (one per line)</label><textarea name="packaging" rows="4">${esc(s.hampers.packaging.join("\n"))}</textarea></div>
  </div><div class="actions"><button class="btn primary">Save packaging options</button></div></form>

  <form class="card form" data-setting="home"><h2>Homepage hero text</h2><div class="grid">
    <div class="field wide"><label>Heading</label><input name="hero_title" value="${esc(s.home.hero_title)}"></div>
    <div class="field wide"><label>Subtitle</label><textarea name="hero_subtitle" rows="2">${esc(s.home.hero_subtitle)}</textarea></div>
  </div><p class="muted">To change the hero photo or button, add a “Hero” banner under Homepage Banners.</p><div class="actions"><button class="btn primary">Save homepage text</button></div></form>`;
  const lines = (v) => v.split("\n").map((x) => x.trim()).filter(Boolean);
  $view().querySelectorAll("[data-setting]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const key = form.dataset.setting;
      const f = form.elements;
      let body = {};
      if (key === "bulk") body = { products: s.bulk.products.map((b) => ({ id: b.id, price: f["price_" + b.id].value })), varieties: lines(f.varieties.value), note: f.note.value };
      else if (key === "hampers") body = { packaging: lines(f.packaging.value) };
      else for (const el of f) if (el.name) body[el.name] = el.value;
      const r = await guard(() => call("/settings/" + key, { method: "PUT", body }));
      if (r) flash("Saved");
    });
  });
}

async function viewSeo() {
  const d = await guard(() => call("/settings"));
  if (!d) return;
  const seo = d.settings.seo;
  const names = { home: "Homepage", shop: "Shop All Products", "gluten-free": "Gluten-Free Range", bulk: "Langar & Bhandara", hampers: "Festival Hampers", about: "About Us", contact: "Contact Us" };
  $view().innerHTML = `<h1>SEO titles &amp; descriptions</h1>
    <p class="muted">Product and category pages have their own SEO fields in their editors. Keep titles under ~60 characters and descriptions under ~155.</p>
    <form class="card form" data-seo>${Object.entries(names).map(([k, n]) => `<fieldset class="seo-row"><legend>${n}</legend>
      <div class="field"><label>Title <small class="muted" data-count></small></label><input name="${k}.title" maxlength="120" value="${esc(seo[k]?.title)}"></div>
      <div class="field"><label>Description <small class="muted" data-count></small></label><textarea name="${k}.description" rows="2" maxlength="320">${esc(seo[k]?.description)}</textarea></div></fieldset>`).join("")}
      <div class="actions"><button class="btn primary">Save SEO</button><a class="btn" href="/sitemap.xml" target="_blank" rel="noopener">View sitemap ↗</a></div></form>`;
  const form = $view().querySelector("[data-seo]");
  const counts = () => form.querySelectorAll("input, textarea").forEach((el) => { const c = el.closest(".field").querySelector("[data-count]"); if (c) c.textContent = "(" + el.value.length + ")"; });
  form.addEventListener("input", counts);
  counts();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      const [k, f] = el.name.split(".");
      body[k] = body[k] || {};
      body[k][f] = el.value;
    }
    const r = await guard(() => call("/settings/seo", { method: "PUT", body }));
    if (r) flash("Saved");
  });
}

// ------------------------------------------------------------------ boot
(async () => {
  try {
    const res = await fetch("/api/admin/session", { credentials: "same-origin" });
    if (res.ok) { csrf = (await res.json()).csrf; shell(); } else renderLogin();
  } catch {
    renderLogin("Couldn't reach the server.");
  }
})();

// Initial catalogue, transcribed from the two Ovenroma Bakers PDF catalogues.
// This file only seeds the database (scripts/gen-seed.mjs → migrations/0002_seed.sql).
// After that, the admin panel is the source of truth for every field.
//
// Prices: only prices printed in the catalogues are filled in (Vanilla Muffin ₹5,
// Golgappa ₹280) — every other price is null ("price on request") until the
// administrator sets it. Bulk (Langar & Bhandara) prices live in settings.

const P = "/assets/images/products/";
const H = "/assets/images/hampers/";

export const CATEGORIES = [
  {
    slug: "biscuits-cookies",
    name: "Biscuits & Cookies",
    blurb: "Eggless, small-batch cookies baked to golden perfection.",
    description:
      "Eggless, small-batch biscuits and cookies baked to golden perfection and packed in clear airtight containers. Every variety in our cookie range is 100% gluten-free.",
    image: P + "chocochip-cookies",
    sort: 1,
  },
  {
    slug: "muffins-cupcakes",
    name: "Muffins & Cupcakes",
    blurb: "Soft, moist 100% vegetarian muffins in trays, pouches and gift boxes.",
    description:
      "Soft, moist 100% vegetarian muffins crafted in family trays, single-serve pouches and luxury gift boxes — plus cupcakes for celebrations and bulk orders.",
    image: P + "assorted-muffin-gift-box",
    sort: 2,
  },
  {
    slug: "kulcha-bakery",
    name: "Kulcha & Bakery",
    blurb: "Pillowy kulchas and golden, flaky veg patties.",
    description:
      "Pillowy leavened kulcha flatbreads and golden flaky puff pastries, ready for quick meals and tea-time serving.",
    image: P + "amritsari-kulcha",
    sort: 3,
  },
  {
    slug: "namkeen-savouries",
    name: "Namkeen & Savouries",
    blurb: "Authentic Indian tea-time snacks and chaat essentials.",
    description:
      "Authentic Indian tea-time snacks and chaat essentials prepared without wheat and sealed in brown kraft pouches and clear containers.",
    image: P + "namkeen-mixture",
    sort: 4,
  },
  {
    slug: "gluten-free-flours",
    name: "Gluten-Free Flours & Atta",
    blurb: "Stone-milled single-grain and multigrain gluten-free flours.",
    description:
      "Stone-milled single-grain and multigrain gluten-free flours packed in resealable brown kraft pouches — for soft rotis and everyday home baking.",
    image: P + "chapati-atta",
    sort: 5,
  },
  {
    slug: "festival-hampers",
    name: "Festival Hampers",
    blurb: "Thoughtfully curated bakery hampers for every occasion.",
    description:
      "Thoughtfully curated bakery hampers filled with delicious treats and beautifully presented for your loved ones.",
    image: H + "hamper-diwali-basket",
    sort: 6,
  },
];

const cookie = (slug, name, desc, extra = {}) => ({
  slug,
  name,
  category: "biscuits-cookies",
  short: desc,
  description:
    desc +
    " Eggless, baked in small batches and packed in a clear airtight container to keep every cookie crisp and fresh. Made 100% gluten-free.",
  packaging: "Clear Box",
  weight: "200g",
  image: P + slug,
  tags: ["veg", "eggless", "gluten-free"],
  ...extra,
});

const namkeen = (slug, name, desc, extra = {}) => ({
  slug,
  name,
  category: "namkeen-savouries",
  short: desc,
  description: desc + " Prepared without wheat and sealed fresh in a brown kraft pouch.",
  packaging: "Kraft Pouch",
  weight: "200g",
  image: P + slug,
  tags: ["veg", "gluten-free"],
  ...extra,
});

const flour = (slug, name, desc, extra = {}) => ({
  slug,
  name,
  category: "gluten-free-flours",
  short: desc,
  description:
    desc + " Stone-milled, 100% gluten-free and packed in a resealable brown kraft pouch.",
  packaging: "Kraft Pouch",
  weight: "",
  image: P + slug,
  tags: ["veg", "gluten-free"],
  ...extra,
});

export const PRODUCTS = [
  // --- Biscuits & Cookies (catalogue 3) ------------------------------------
  cookie("chocochip-cookies", "Chocochip Cookies", "Classic golden-baked butter cookies generously studded with rich chocolate chips.", { featured: 1 }),
  cookie("double-chocochip-cookies", "Double Chocochip Cookies", "Decadent dark cocoa cookie base loaded with chocolate chips for intense cocoa flavour."),
  cookie("jam-biscuits", "Jam Biscuits", "Delicate scalloped shortbread biscuits centre-filled with sweet strawberry fruit preserve.", { featured: 1 }),
  cookie("almond-cookies", "Almond Cookies", "Crunchy shortbread biscuits infused with roasted almond flakes and nutty richness."),
  cookie("kaju-butter-cookies", "Kaju Butter Cookies", "Melt-in-the-mouth butter cookies topped and blended with premium cashew nuts.", { featured: 1 }),
  cookie("coconut-cookies", "Coconut Cookies", "Crisp golden biscuits baked with desiccated coconut shreds for a light tropical crunch."),
  cookie("pista-coconut-cookies", "Pista Coconut Cookies", "A gourmet fusion of roasted crushed pistachios and fragrant shredded coconut."),
  cookie("elaichi-cookies", "Elaichi Cookies", "Traditional tea-time biscuits delicately scented with freshly ground green cardamom."),
  cookie("jeera-cookies", "Jeera Cookies", "Savoury-sweet crunchy biscuits flavoured with aromatic roasted cumin seeds."),
  cookie("butter-masala-biscuits", "Butter Masala Biscuits", "Spiced Indian-style savoury biscuits crafted with pure butter and mild herbs."),

  // --- Muffins & Cupcakes (catalogue 1-2) -----------------------------------
  {
    slug: "chocolate-muffins",
    name: "Chocolate Muffins",
    category: "muffins-cupcakes",
    short: "Rich cocoa-flavoured muffins baked in fluted liners — wheat-free and gluten-free.",
    description:
      "Rich cocoa-flavoured muffins baked in fluted liners with a wheat-free and gluten-free formulation. Six soft, moist muffins packed in a clear Ovenroma Bakers family tray — perfect for sharing.",
    packaging: "Clear Tray",
    weight: "6 pieces",
    image: P + "chocolate-muffins",
    tags: ["veg", "gluten-free"],
    featured: 1,
  },
  {
    slug: "assorted-muffin-gift-box",
    name: "Assorted Muffin Gift Box",
    category: "muffins-cupcakes",
    short: "Box of 6 — Honey Almond, Tutti Frutti & Vanilla muffins in a rigid gift box.",
    description:
      "A curated selection of slivered-almond honey muffins, tutti-frutti muffins and classic glazed vanilla muffins, presented in a rigid Ovenroma Bakers gift box. A thoughtful gift for festivals, visits and celebrations.",
    packaging: "Rigid Gift Box",
    weight: "6 pieces",
    image: P + "assorted-muffin-gift-box",
    tags: ["veg", "gift"],
    featured: 1,
  },
  {
    slug: "vanilla-muffins",
    name: "Vanilla Flavour Muffins",
    category: "muffins-cupcakes",
    short: "Soft, golden vanilla sponge muffin in a convenient single-serve pouch.",
    description:
      "A soft, golden vanilla sponge muffin packed in a convenient single-serve retail pouch. 100% vegetarian, a yummy treat with 4g protein per 100g — ideal for lunch boxes and tea time.",
    packaging: "Retail Pouch",
    weight: "Single serve",
    price: 5,
    image: P + "vanilla-muffins",
    tags: ["veg"],
    featured: 1,
  },
  {
    slug: "cupcakes",
    name: "Cupcakes",
    category: "muffins-cupcakes",
    short: "Soft cupcakes for parties, events and community seva — available for bulk orders.",
    description:
      "Soft, freshly baked vegetarian cupcakes, ideal for birthday parties, school events, langar and bhandara. Cupcakes are available as a bulk-order option at ₹3 per piece — use our Langar & Bhandara bulk order calculator or enquire on WhatsApp.",
    packaging: "Bulk order",
    weight: "Per piece",
    image: P + "cupcakes",
    tags: ["veg", "bulk"],
    bulk_note: "Bulk orders: ₹3 per piece",
  },

  // --- Kulcha & Bakery (catalogue 1-2) ---------------------------------------
  {
    slug: "amritsari-kulcha",
    name: "Amritsari Kulcha",
    category: "kulcha-bakery",
    short: "Traditional herb-seasoned Amritsari kulchas — 4 pieces in a resealable ziplock pouch.",
    description:
      "Traditional herb-seasoned Amritsari kulchas sealed in a resealable ziplock pouch. Warm them on a tawa with a little butter and serve with chhole for a classic Punjabi meal.",
    packaging: "Ziplock Resealable Pouch",
    weight: "4 pcs • 320g",
    image: P + "amritsari-kulcha",
    tags: ["veg"],
    featured: 1,
  },
  {
    slug: "kulcha-bread",
    name: "Kulcha Bread",
    category: "kulcha-bakery",
    short: "Soft, pillowy leavened kulcha flatbreads topped with dried fenugreek herbs.",
    description:
      "Soft, pillowy leavened kulcha flatbreads topped with dried fenugreek herbs and packed in a sealed bakery bag. A premium-quality, herb-garnished fresh bakery pack. Kulcha is also available for Langar & Bhandara at ₹20 per dozen.",
    packaging: "Sealed Bakery Bag",
    weight: "",
    image: P + "kulcha-bread",
    tags: ["veg", "bulk"],
    bulk_note: "Bulk orders: ₹20 per dozen",
  },
  {
    slug: "veg-patties",
    name: "Veg Patties",
    category: "kulcha-bakery",
    short: "Crisp, multi-layered golden puff pastries with spiced vegetable stuffing — 2-piece box.",
    description:
      "Crisp, multi-layered golden puff pastries filled with a savoury spiced vegetable stuffing, packed fresh in a window kraft box. Veg patties are also available for Langar & Bhandara at ₹8 per piece.",
    packaging: "Window Kraft Box",
    weight: "2 pieces",
    image: P + "veg-patties",
    tags: ["veg", "bulk"],
    featured: 1,
    bulk_note: "Bulk orders: ₹8 per piece",
  },

  // --- Namkeen & Savouries (catalogue 3) -------------------------------------
  namkeen("papri", "Papri", "Crispy, light and flaky gluten-free papri — ideal for chaat platters or evening tea."),
  namkeen("chakli", "Chakli", "Traditional crunchy spiral snack seasoned with mild spices for wholesome munching."),
  namkeen("namkeen-mixture", "Namkeen Mixture", "A balanced savoury blend of crunchy gluten-free sev, pulses and aromatic spices.", { featured: 1 }),
  namkeen("bikaneri-bhujia", "Bikaneri Bhujia", "Classic crisp and spicy Bikaneri-style bhujia crafted 100% gluten-free."),
  namkeen("mathi", "Mathi", "Flaky, golden traditional savoury crackers made without maida for family tea time."),
  namkeen("boondi", "Boondi", "Light, crisp golden droplets for raita, chaat or straight-from-the-pack snacking."),
  namkeen("golgappa", "Golgappa", "Crunchy, hollow gluten-free pani puri shells packed in a protective clear container.", {
    packaging: "Clear Box",
    weight: "100g",
    price: 280,
    description: "Crunchy, hollow gluten-free pani puri shells packed in a protective clear container. Prepared without wheat — just add your favourite pani and filling.",
  }),

  // --- Gluten-free flours (catalogue 3) ---------------------------------------
  flour("white-lite-flour", "White Flour & Lite Flour", "Fine, versatile gluten-free flour blends ideal for cakes, pastries and light batters.", {
    variants: [
      { id: "white", label: "White Flour", price: null },
      { id: "lite", label: "Lite Flour", price: null },
    ],
  }),
  flour("chapati-atta", "Chapati Atta", "Specially formulated daily flatbread flour that kneads smoothly for soft, pliable rotis.", { featured: 1 }),
  flour("healthy-aata", "Healthy Aata", "A wholesome everyday gluten-free atta that kneads smoothly for soft, pliable rotis."),
  flour("multigrain-aata", "Multigrain Aata", "Wholesome blend of nutrient-dense millets and pulses for high-fibre everyday meals."),
  flour("ragi-flour", "Ragi Flour (Finger Millet)", "Calcium- and iron-rich dark millet flour suitable for rotis, dosas and porridge."),
  flour("jowar-atta", "Jowar Atta (Sorghum Flour)", "Naturally sweet, light-textured sorghum flour for bhakri, rotis and baked goods."),
  flour("bajra-flour", "Bajra Flour (Pearl Millet)", "Hearty, warming pearl millet flour ideal for winter flatbreads and traditional khichdi."),
  flour("rice-flour", "Rice Flour", "Finely milled white rice flour for crisp coatings, idiyappam and gluten-free batters."),
  flour("kuttu-atta", "Kuttu Atta (Buckwheat Flour)", "Pure buckwheat flour suited for fasting (vrat) puris, cheelas and wholesome pancakes."),
];

// Hampers are products in the "festival-hampers" category with an occasion and
// an "includes" list. Prices are null until set by the administrator.
const hamper = (slug, name, occasion, image, short, includes, extra = {}) => ({
  slug,
  name,
  category: "festival-hampers",
  occasion,
  short,
  description:
    short +
    " Every hamper is packed fresh to order, and the contents, packaging and greeting card can be customised.",
  packaging: "Gift hamper",
  weight: "",
  image,
  includes,
  tags: ["veg", "gift"],
  customisable: 1,
  ...extra,
});

export const HAMPERS = [
  hamper("diwali-celebration-hamper", "Diwali Celebration Hamper", "diwali", H + "hamper-diwali-basket",
    "A golden festive basket of cookies and namkeen to light up Diwali celebrations.",
    ["Chocochip Cookies (200g)", "Kaju Butter Cookies (200g)", "Namkeen Mixture (200g)", "Festive net-wrapped gift basket"], { featured: 1 }),
  hamper("christmas-muffin-hamper", "Christmas Muffin Hamper", "christmas", P + "assorted-muffin-gift-box",
    "Honey almond, tutti-frutti and vanilla muffins with cookies — a sweet Christmas gift.",
    ["Assorted Muffin Gift Box (6 pcs)", "Double Chocochip Cookies (200g)", "Coconut Cookies (200g)"]),
  hamper("new-year-gift-box", "New Year Gift Box", "new-year", P + "chocolate-muffins",
    "Start the year sweet with chocolate muffins and our favourite cookies.",
    ["Chocolate Muffins (6 pcs)", "Almond Cookies (200g)", "Elaichi Cookies (200g)"]),
  hamper("rakhi-sweet-hamper", "Rakhi Sweet Hamper", "rakhi", H + "hamper-golden-basket",
    "A cheerful Rakhi basket of cookies and tea-time savouries for your sibling.",
    ["Pista Coconut Cookies (200g)", "Jam Biscuits (200g)", "Bikaneri Bhujia (200g)", "Net-wrapped gift basket"]),
  hamper("wedding-return-gift-box", "Wedding Return Gift Box", "wedding", H + "hamper-festive-basket",
    "Elegant return gifts for wedding guests, packed and labelled in bulk.",
    ["Kaju Butter Cookies (200g)", "Almond Cookies (200g)", "Festive gift packaging"]),
  hamper("corporate-gift-hamper", "Corporate Gift Hamper", "corporate", H + "hamper-golden-basket",
    "Premium bakery hampers for clients and teams — branding and bulk gifting available.",
    ["Chocochip Cookies (200g)", "Butter Masala Biscuits (200g)", "Namkeen Mixture (200g)", "Premium gift basket"]),
  hamper("birthday-treat-box", "Birthday Treat Box", "birthday", P + "assorted-muffin-gift-box",
    "Muffins and cookies to make every birthday sweeter.",
    ["Assorted Muffin Gift Box (6 pcs)", "Chocochip Cookies (200g)"]),
  hamper("build-your-own-hamper", "Build Your Own Hamper", "custom", H + "hamper-basket-side",
    "Choose your favourite Ovenroma products, packaging and message — we'll pack it beautifully.",
    ["Your choice of Ovenroma products", "Your choice of gift packaging", "Personalised message card"]),
];

export const OCCASIONS = [
  { id: "diwali", name: "Diwali Hampers", blurb: "Light up the festival of lights with golden baskets of cookies and namkeen." },
  { id: "christmas", name: "Christmas Hampers", blurb: "Muffins and cookies wrapped up for Christmas cheer." },
  { id: "new-year", name: "New Year Gift Boxes", blurb: "Start the year on a sweet note." },
  { id: "rakhi", name: "Rakhi Hampers", blurb: "A thoughtful treat for your brother or sister." },
  { id: "wedding", name: "Wedding Return Gifts", blurb: "Elegant return gifts for your guests, packed in bulk." },
  { id: "corporate", name: "Corporate Gift Hampers", blurb: "Premium hampers for clients and teams, with bulk pricing on request." },
  { id: "birthday", name: "Birthday Hampers", blurb: "Make every birthday sweeter." },
  { id: "custom", name: "Customised Gift Boxes", blurb: "Pick the products, packaging and message yourself." },
];

// Langar & Bhandara fixed bulk prices (rupees). Editable in the admin panel.
export const BULK_PRODUCTS = [
  { id: "kulcha", name: "Kulcha", price: 20, unit: "dozen", unitLabel: "Dozens", step: 1, max: 5000, image: P + "kulcha-bread" },
  { id: "veg-patties", name: "Veg Patties", price: 8, unit: "piece", unitLabel: "Pieces", step: 1, max: 20000, image: P + "veg-patties" },
  { id: "biscuits", name: "Biscuits", price: 180, unit: "kg", unitLabel: "Kilograms", step: 0.5, max: 1000, image: P + "jam-biscuits", varieties: true },
  { id: "cupcakes", name: "Cupcakes", price: 3, unit: "piece", unitLabel: "Pieces", step: 1, max: 20000, image: P + "cupcakes" },
];

export const BISCUIT_VARIETIES = [
  "Chocochip Cookies",
  "Double Chocochip Cookies",
  "Jam Biscuits",
  "Almond Cookies",
  "Kaju Butter Cookies",
  "Coconut Cookies",
  "Pista Coconut Cookies",
  "Elaichi Cookies",
  "Jeera Cookies",
  "Butter Masala Biscuits",
];

export const PACKAGING_OPTIONS = [
  "Classic net-wrapped basket",
  "Premium rigid gift box",
  "Eco kraft gift box",
  "Wicker basket",
];

// Testimonials are NOT seeded as live content: any shown on the site must be
// real customer words entered by the administrator. These drafts are inactive
// placeholders that show the format in the admin panel.
export const TESTIMONIAL_DRAFTS = [
  { name: "Sample — replace with a real customer", location: "City", text: "Write a genuine customer review here, then tick Active to publish it.", rating: 5 },
];

-- Ovenroma Bakers — D1 schema. Money is stored in paise (INTEGER); a NULL
-- price means "price on request" (cannot be added to the cart).

CREATE TABLE categories (
  slug            TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  blurb           TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  image           TEXT NOT NULL DEFAULT '',
  seo_title       TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  sort            INTEGER NOT NULL DEFAULT 0,
  active          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE,
  short           TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  packaging       TEXT NOT NULL DEFAULT '',
  weight          TEXT NOT NULL DEFAULT '',
  price_paise     INTEGER,               -- NULL = price on request
  mrp_paise       INTEGER,               -- optional strike-through price
  image           TEXT NOT NULL DEFAULT '',
  gallery         TEXT NOT NULL DEFAULT '[]',  -- JSON array of image URLs
  tags            TEXT NOT NULL DEFAULT '[]',  -- JSON array: veg, eggless, gluten-free, gift, bulk
  variants        TEXT NOT NULL DEFAULT '[]',  -- JSON [{id,label,price_paise}]
  includes        TEXT NOT NULL DEFAULT '[]',  -- hampers: JSON array of strings
  occasion        TEXT NOT NULL DEFAULT '',    -- hampers: diwali, christmas, ...
  customisable    INTEGER NOT NULL DEFAULT 0,  -- hampers: packaging + message options
  bulk_note       TEXT NOT NULL DEFAULT '',
  in_stock        INTEGER NOT NULL DEFAULT 1,
  featured        INTEGER NOT NULL DEFAULT 0,  -- shown as Best Seller
  active          INTEGER NOT NULL DEFAULT 1,
  sort            INTEGER NOT NULL DEFAULT 0,
  seo_title       TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_products_category ON products(category, active, sort);

CREATE TABLE orders (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  ref                 TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'created', -- created | paid | failed | whatsapp | cancelled | fulfilled
  payment_method      TEXT NOT NULL DEFAULT 'razorpay', -- razorpay | whatsapp
  customer_name       TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT NOT NULL DEFAULT '',
  address             TEXT NOT NULL,
  city                TEXT NOT NULL DEFAULT '',
  pincode             TEXT NOT NULL,
  notes               TEXT NOT NULL DEFAULT '',
  items               TEXT NOT NULL,          -- JSON priced lines (server-side snapshot)
  subtotal_paise      INTEGER NOT NULL,
  shipping_paise      INTEGER NOT NULL DEFAULT 0,
  total_paise         INTEGER NOT NULL,
  razorpay_order_id   TEXT UNIQUE,
  razorpay_payment_id TEXT,
  failure_reason      TEXT NOT NULL DEFAULT '',
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at             TEXT
);
CREATE INDEX idx_orders_created ON orders(created_at);

CREATE TABLE enquiries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,       -- bulk | hamper | custom-hamper | corporate | contact | product
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  payload     TEXT NOT NULL DEFAULT '{}',  -- JSON, validated per type
  total_paise INTEGER,
  status      TEXT NOT NULL DEFAULT 'new', -- new | contacted | confirmed | closed
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_enquiries_created ON enquiries(created_at);

CREATE TABLE testimonials (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  text     TEXT NOT NULL,
  rating   INTEGER NOT NULL DEFAULT 5,
  active   INTEGER NOT NULL DEFAULT 0,
  sort     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE banners (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  placement TEXT NOT NULL DEFAULT 'promo', -- hero | promo
  title     TEXT NOT NULL,
  subtitle  TEXT NOT NULL DEFAULT '',
  image     TEXT NOT NULL DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT '',
  cta_url   TEXT NOT NULL DEFAULT '',
  active    INTEGER NOT NULL DEFAULT 1,
  sort      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL  -- JSON
);

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,   -- SHA-256 of the random session token
  csrf       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE login_attempts (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX idx_login_attempts ON login_attempts(ip, at);

CREATE TABLE webhook_events (
  event_id    TEXT PRIMARY KEY,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE media (
  id           TEXT PRIMARY KEY,   -- uuid
  key          TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

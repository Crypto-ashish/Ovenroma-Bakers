// Langar & Bhandara calculator logic — pure, shared by bulk.js and unit tests.
// config: { products: [{ id, name, price_paise, unit, unitLabel, step, max, varieties }], varieties: [] }
// state:  { qty: { [productId]: number|string }, biscuits: [{ variety, kg }] }
// Returns { lines, total_paise, errors, items } where `items` is the API payload.

const UNIT_PLURAL = { dozen: "dozen", piece: "pcs", kg: "kg" };

function toNumber(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : NaN;
}

function validQty(n, spec) {
  if (Number.isNaN(n) || n < 0) return "Enter a valid quantity";
  if (n > (spec.max || 100000)) return "Maximum is " + spec.max + " " + (UNIT_PLURAL[spec.unit] || spec.unit);
  const step = spec.step || 1;
  const steps = n / step;
  if (Math.abs(steps - Math.round(steps)) > 1e-9) return step === 1 ? "Use whole numbers" : "Use steps of " + step;
  return "";
}

export function computeBulk(config, state) {
  const lines = [];
  const errors = [];
  const items = [];
  let total = 0;
  for (const spec of config.products) {
    if (spec.varieties) continue;
    const n = toNumber(state.qty && state.qty[spec.id]);
    const err = validQty(n, spec);
    if (err) { errors.push({ id: spec.id, message: spec.name + ": " + err }); continue; }
    if (n > 0) {
      const sub = Math.round(spec.price_paise * n);
      total += sub;
      lines.push({ id: spec.id, name: spec.name, variety: "", qty: n, unit: spec.unit, unit_paise: spec.price_paise, line_paise: sub });
      items.push({ id: spec.id, qty: n });
    }
  }
  const biscuit = config.products.find((p) => p.varieties);
  if (biscuit) {
    const seen = new Set();
    (state.biscuits || []).forEach((b, index) => {
      const n = toNumber(b.kg);
      const err = validQty(n, biscuit);
      if (err) { errors.push({ id: biscuit.id, index, message: "Biscuits: " + err }); return; }
      if (n <= 0) return;
      if (!b.variety || !config.varieties.includes(b.variety)) {
        errors.push({ id: biscuit.id, index, message: "Choose a biscuit variety for " + n + " kg" });
        return;
      }
      if (seen.has(b.variety)) {
        errors.push({ id: biscuit.id, index, message: b.variety + " is listed twice — combine the quantities" });
        return;
      }
      seen.add(b.variety);
      const sub = Math.round(biscuit.price_paise * n);
      total += sub;
      lines.push({ id: biscuit.id, name: biscuit.name, variety: b.variety, qty: n, unit: biscuit.unit, unit_paise: biscuit.price_paise, line_paise: sub });
      items.push({ id: biscuit.id, qty: n, variety: b.variety });
    });
  }
  return { lines, total_paise: total, errors, items };
}

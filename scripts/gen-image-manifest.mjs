// Writes public/assets/images/manifest.json: every main photo in the repo
// (not the -400 thumbnails or .jpg social copies). The admin photo picker
// reads it. Runs as `npm run build` (also in Cloudflare Workers Builds).
import { readdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../public/assets/images/", import.meta.url).pathname;
const out = [];
(function walk(dir) {
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(webp|png|jpe?g)$/i.test(f) && !/-\d+\.\w+$/.test(f) && !(/\.jpe?g$/i.test(f) && readdirSync(dir).includes(f.replace(/\.jpe?g$/i, ".webp")))) {
      out.push("/assets/images/" + relative(root, p).split("\\").join("/"));
    }
  }
})(root);
writeFileSync(join(root, "manifest.json"), JSON.stringify({ images: out }, null, 1) + "\n");
console.log("manifest.json:", out.length, "images");

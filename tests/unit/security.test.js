import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../../src/lib/auth.js";
import { html, raw } from "../../src/render/html.js";
import { cleanText, makeRef } from "../../src/lib/util.js";

test("scrypt password hash verifies only the right password", () => {
  const h = hashPassword("correct horse battery", { N: 1024 });
  assert.match(h, /^scrypt:1024:8:1:/);
  assert.equal(verifyPassword("correct horse battery", h), true);
  assert.equal(verifyPassword("wrong", h), false);
  assert.equal(verifyPassword("x", "garbage"), false);
});

test("html templates escape interpolated values", () => {
  const out = String(html`<p title="${'"><script>'}">${"<img src=x onerror=alert(1)>"}${raw("<b>ok</b>")}</p>`);
  assert.equal(out, '<p title="&quot;&gt;&lt;script&gt;">&lt;img src=x onerror=alert(1)&gt;<b>ok</b></p>');
});

test("cleanText strips markup and enforces limits", () => {
  assert.equal(cleanText(" <b>Hi</b> there "), "Hi there");
  assert.throws(() => cleanText("", { required: true, label: "name" }), /Please fill in name/);
  assert.throws(() => cleanText("abcdef", { max: 3 }), /too long/);
});

test("order references are unguessable and well-formed", () => {
  const a = makeRef("OVR");
  assert.match(a, /^OVR-[A-Z0-9]{4,12}-[A-Z0-9]{12}$/);
  assert.notEqual(a, makeRef("OVR"));
});

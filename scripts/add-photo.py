#!/usr/bin/env python3
"""Add a new product photo to the site (photos live in this GitHub repo).

Crops the photo to a centred square and writes the three files the site uses:
  public/assets/images/<folder>/<name>.webp      800x800
  public/assets/images/<folder>/<name>-400.webp  400x400 (cards)
  public/assets/images/<folder>/<name>.jpg       800x800 (social previews)
then refreshes the photo-library manifest used by the admin panel.

Usage:  python3 scripts/add-photo.py photo.jpg my-product-name [--folder products|hampers|site]
Then commit and push; after the deploy, pick the photo in Admin → product → "Choose photo".
"""
import argparse, os, re, subprocess, sys
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument("photo")
ap.add_argument("name", help="lowercase-with-dashes, e.g. rusk-toast")
ap.add_argument("--folder", default="products", choices=["products", "hampers", "site"])
a = ap.parse_args()
if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", a.name):
    sys.exit("name must be lowercase letters, numbers and dashes, e.g. rusk-toast")
img = ImageOps.exif_transpose(Image.open(a.photo)).convert("RGB")
side = min(img.size)
img = img.crop(((img.width - side) // 2, (img.height - side) // 2, (img.width + side) // 2, (img.height + side) // 2))
out = os.path.join(ROOT, "public", "assets", "images", a.folder)
os.makedirs(out, exist_ok=True)
big = img.resize((800, 800), Image.LANCZOS)
big.save(os.path.join(out, a.name + ".webp"), "WEBP", quality=82, method=6)
big.save(os.path.join(out, a.name + ".jpg"), "JPEG", quality=80, optimize=True, progressive=True)
img.resize((400, 400), Image.LANCZOS).save(os.path.join(out, a.name + "-400.webp"), "WEBP", quality=80, method=6)
subprocess.run(["node", os.path.join(ROOT, "scripts", "gen-image-manifest.mjs")], check=True)
print("Added /assets/images/%s/%s.webp" % (a.folder, a.name))

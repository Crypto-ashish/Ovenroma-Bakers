#!/usr/bin/env python3
"""Extract, crop and optimise product photographs for the website.

Sources (passed as arguments, never committed):
  --catalogue-a  Ovenroma_Bakers_Product_Catalogue_1_2.pdf (muffins, kulcha, patties)
  --catalogue-b  Ovenroma_Bakers_Product_Catalogue_3.pdf   (biscuits, namkeen, flours)
  --hampers      folder holding the hamper photos 1.jpg 2.jpg 3.jpg 4.webp 5.webp
  --sister       optional gluten-free-delhi repo checkout, used ONLY for products
                 that have no photograph in the Ovenroma catalogues

Output: public/assets/images/{products,hampers,site}/
  <slug>.webp      800x800 (main)
  <slug>-400.webp  400x400 (cards, srcset)
  <slug>.jpg       800x800 (Open Graph / social previews)

Usage:
  python3 scripts/build-images.py --catalogue-a A.pdf --catalogue-b B.pdf \
      --hampers ./hamper-photos --sister ../gluten-free-delhi
"""
import argparse
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets", "images")
SIZE = 800


def extract_pdf_images(pdf, workdir, prefix):
    subprocess.run(["pdfimages", "-png", pdf, os.path.join(workdir, prefix)], check=True)
    return sorted(f for f in os.listdir(workdir) if f.startswith(prefix + "-"))


def pad_square(img, flat=False):
    """Pad to a square by replicating each row's edge pixels (keeps gradients
    and table tops), or with the flat border colour for plain backdrops."""
    w, h = img.size
    if w == h:
        return img
    a = np.asarray(img.convert("RGB"))
    if flat:
        border = np.concatenate([a[:3].reshape(-1, 3), a[:, :3].reshape(-1, 3), a[:, -3:].reshape(-1, 3)])
        colour = tuple(int(v) for v in np.median(border, axis=0))
        side = max(w, h)
        canvas = Image.new("RGB", (side, side), colour)
        canvas.paste(img.convert("RGB"), ((side - w) // 2, (side - h) // 2))
        return canvas
    if w < h:
        total = h - w
        left = total // 2
        right = total - left
        a = np.pad(a, ((0, 0), (left, right), (0, 0)), mode="edge")
    else:
        total = w - h
        top = total // 2
        a = np.pad(a, ((top, total - top), (0, 0), (0, 0)), mode="edge")
    return Image.fromarray(a)


def square_around_content(img):
    """For landscape cells: square crop (full height) centred on the content."""
    w, h = img.size
    a = np.asarray(img.convert("L")).astype(int)
    bg = np.median(np.concatenate([a[:, :4].ravel(), a[:, -4:].ravel()]))
    cols = np.where((np.abs(a - bg) > 28).sum(axis=0) > h * 0.08)[0]
    cx = int((cols.min() + cols.max()) / 2) if len(cols) else w // 2
    side = min(w, h)
    x0 = max(0, min(w - side, cx - side // 2))
    return img.crop((x0, 0, x0 + side, side))


def save_set(img, folder, slug):
    os.makedirs(folder, exist_ok=True)
    img = img.convert("RGB")
    big = img.resize((SIZE, SIZE), Image.LANCZOS)
    if img.size[0] < SIZE:  # upscaled source: restore a little crispness
        big = big.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    big.save(os.path.join(folder, slug + ".webp"), "WEBP", quality=82, method=6)
    big.save(os.path.join(folder, slug + ".jpg"), "JPEG", quality=80, optimize=True, progressive=True)
    img.resize((400, 400), Image.LANCZOS).save(os.path.join(folder, slug + "-400.webp"), "WEBP", quality=80, method=6)
    print("  ", slug)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalogue-a", required=True)
    ap.add_argument("--catalogue-b", required=True)
    ap.add_argument("--hampers", required=True)
    ap.add_argument("--sister")
    args = ap.parse_args()

    prod = os.path.join(OUT, "products")
    with tempfile.TemporaryDirectory() as tmp:
        a = extract_pdf_images(args.catalogue_a, tmp, "a")
        b = extract_pdf_images(args.catalogue_b, tmp, "b")
        A = [Image.open(os.path.join(tmp, f)).convert("RGB") for f in a]
        B = Image.open(os.path.join(tmp, b[0])).convert("RGB")

        print("Catalogue 1-2 (muffins, kulcha, patties):")
        # Crops avoid the corner watermark sparkle and keep the pack centred.
        save_set(A[0].crop((0, 80, 896, 976)), prod, "chocolate-muffins")
        save_set(A[1].crop((0, 140, 896, 1036)), prod, "assorted-muffin-gift-box")
        save_set(A[1].crop((300, 520, 830, 1050)), prod, "cupcakes")
        save_set(A[2].crop((0, 50, 382, 432)), prod, "vanilla-muffins")
        save_set(A[3].crop((0, 80, 382, 462)), prod, "veg-patties")
        save_set(A[4].crop((65, 0, 447, 382)), prod, "amritsari-kulcha")
        save_set(A[5].crop((0, 100, 343, 443)), prod, "kulcha-bread")

        print("Catalogue 3 (biscuits, namkeen, flours):")
        narrow = {  # 4-up rows: (x0, x1)
            "top": [(3, 220, "chocochip-cookies"), (228, 444, "jam-biscuits"),
                    (453, 669, "almond-cookies"), (679, 893, "jeera-cookies")],
            "bottom": [(3, 220, "white-lite-flour"), (228, 444, "chapati-atta"),
                       (453, 669, "ragi-flour"), (679, 893, "rice-flour")],
        }
        for x0, x1, slug in narrow["top"]:
            save_set(pad_square(B.crop((x0, 3, x1, 296)), flat=True), prod, slug)
        for x0, x1, slug in narrow["bottom"]:
            save_set(pad_square(B.crop((x0, 904, x1, 1197))), prod, slug)
        wide = [((3, 303, 444, 596), "papri"), ((452, 303, 893, 596), "chakli"),
                ((3, 603, 444, 896), "namkeen-mixture"), ((452, 603, 893, 896), "bikaneri-bhujia")]
        for box, slug in wide:
            save_set(square_around_content(B.crop(box)), prod, slug)
        # Category banner: the whole showcase grid.
        site = os.path.join(OUT, "site")
        os.makedirs(site, exist_ok=True)
        B.save(os.path.join(site, "catalogue-showcase.webp"), "WEBP", quality=80, method=6)

    if args.sister:
        print("Sister-brand photos for products missing from the Ovenroma catalogues:")
        src = os.path.join(args.sister, "assets", "images", "products")
        for slug in ["double-chocochip-cookies", "kaju-butter-cookies", "coconut-cookies",
                     "pista-coconut-cookies", "elaichi-cookies", "butter-masala-biscuits",
                     "mathi", "boondi", "healthy-aata", "multigrain-aata", "jowar-atta",
                     "bajra-flour", "kuttu-atta"]:
            path = os.path.join(src, slug + ".webp")
            if os.path.exists(path):
                img = Image.open(path)
                if slug == "kuttu-atta":  # trim a watermark sparkle beside the pack
                    img = img.crop((150, 0, 606, img.size[1]))
                save_set(pad_square(img, flat=slug.endswith(("cookies", "biscuits"))), prod, slug)
            else:
                print("   missing", slug, file=sys.stderr)

    print("Hampers:")
    hp = os.path.join(OUT, "hampers")
    names = {"1.jpg": "hamper-festive-basket", "2.jpg": "hamper-golden-basket",
             "3.jpg": "hamper-basket-side", "4.webp": "hamper-diwali-basket"}
    for fname, slug in names.items():
        save_set(Image.open(os.path.join(args.hampers, fname)), hp, slug)
    # Lifestyle shot: keep the festive table, drop the overlaid text and watermark.
    life = Image.open(os.path.join(args.hampers, "5.webp")).convert("RGB").crop((0, 620, 1780, 2000))
    life = life.resize((1600, round(1600 * life.size[1] / life.size[0])), Image.LANCZOS)
    life.save(os.path.join(site, "hampers-festive-table.webp"), "WEBP", quality=80, method=6)
    life.resize((800, round(800 * life.size[1] / life.size[0])), Image.LANCZOS).save(
        os.path.join(site, "hampers-festive-table-800.webp"), "WEBP", quality=80, method=6)
    life.save(os.path.join(site, "hampers-festive-table.jpg"), "JPEG", quality=78, optimize=True, progressive=True)
    print("done")


if __name__ == "__main__":
    main()

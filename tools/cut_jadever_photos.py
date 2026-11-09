"""Cut Jadever catalogue photos out of their white backgrounds for the 3D home scene.

The white around the product becomes transparent, and only the largest connected shape is
kept, which drops the marketing badges in the photo's corners. Needs Pillow, numpy and scipy.

Run from the project root: python3 tools/cut_jadever_photos.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

CODES = ['JDFA55350', 'JDRYP1504', 'JDWB1F01', 'JDLYP546', 'JDWH2501', 'JDGA4611', 'JDSS1302', 'JDCV4401']
OUT = Path('public/products/jadever')
# Overlays that touch the product in the photo, as (left, top, right, bottom) shares of the shape
OVERLAYS = {
    'JDCV4401': [(0, .24, .33, 1), (0, .32, .39, 1)],
    'JDLYP546': [(.4, 0, 1, .17)],
    'JDRYP1504': [(.25, .73, 1, 1), (.5, .47, 1, 1)],
    'JDWB1F01': [(.35, .82, 1, 1)],
}


def largest(mask):
    parts, count = ndi.label(mask)
    sizes = ndi.sum(mask, parts, range(1, count + 1))
    return parts == (int(np.argmax(sizes)) + 1)


catalog = {p['code']: p for p in json.load(open('data/catalog-sakr.json'))}
for code in CODES:
    im = Image.open(f'public/products/catalog/{code}.jpg').convert('RGB')
    if max(im.size) > 1000:
        im.thumbnail((1000, 1000), Image.LANCZOS)
    rgb = np.asarray(im).astype(float)
    # White background: connected to the photo's edge and nearly white
    near_white = rgb.min(axis=2) > 236
    labels, _ = ndi.label(near_white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, border[border > 0])
    solid = ndi.binary_closing(~background, iterations=2)
    # Keep the largest shape, which is the product
    product = largest(solid)
    if code in OVERLAYS:
        rows, cols = np.where(product)
        top, left, height, width = rows.min(), cols.min(), np.ptp(rows) + 1, np.ptp(cols) + 1
        for x0, y0, x1, y1 in OVERLAYS[code]:
            product[int(top + y0 * height):int(top + y1 * height), int(left + x0 * width):int(left + x1 * width)] = False
        product = largest(product)
    product = ndi.binary_fill_holes(product) & (product | ~background)
    product = ndi.binary_erosion(product, iterations=1)
    alpha = np.clip(ndi.gaussian_filter(product.astype(float), 0.8) * 255, 0, 255).astype('uint8')
    out = Image.fromarray(np.dstack([rgb.astype('uint8'), alpha]))
    out = out.crop(out.getbbox())
    out.save(OUT / f'{code}.png', optimize=True)
    print(json.dumps([code, catalog[code]['id'], catalog[code]['name'], catalog[code]['cat'], out.width, out.height]))

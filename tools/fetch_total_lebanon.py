"""Third pass for TOTAL photos: models missing from TOTAL's global site are
looked up by model code on totaltoolslebanon.com (Chaaban Hardware, TOTAL's
exclusive dealer in Lebanon) through its public WooCommerce product feed.
Updates data/photos.json.  Run: python tools/fetch_total_lebanon.py
"""
import json, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = {'User-Agent': 'Mozilla/5.0 (compatible; DAR-shop-catalogue)'}
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r:
        return r.read()

catalog = json.loads((ROOT / 'data/catalog-sakr.json').read_text(encoding='utf8'))
photos = json.loads((ROOT / 'data/photos.json').read_text())
for p in catalog:
    code = p['code']
    if p['brand'] != 'total' or not code or photos.get(p['id']):
        continue
    url = 'https://totaltoolslebanon.com/wp-json/wc/store/v1/products?per_page=5&search=' + urllib.parse.quote(code)
    try:
        items = json.loads(get(url))
    except Exception as e:
        print('feed fail', code, e); time.sleep(0.5); continue
    hit = next((i for i in items if code.lower() in (i.get('sku', '') + ' ' + i.get('name', '')).lower() and i.get('images')), None)
    if not hit:
        print('not found', code); time.sleep(0.5); continue
    src = hit['images'][0]['src']
    ext = src.split('?')[0].rsplit('.', 1)[-1].lower()
    ext = ext if ext in ('jpg', 'jpeg', 'png', 'webp') else 'jpg'
    (ROOT / f'public/products/catalog/{code}.{ext}').write_bytes(get(src))
    photos[p['id']] = f'/products/catalog/{code}.{ext}'
    print('ok', code)
    time.sleep(0.5)
(ROOT / 'data/photos.json').write_text(json.dumps(photos, indent=1))
print(sum(1 for v in photos.values() if v), 'of', len(photos), 'products have a photo')

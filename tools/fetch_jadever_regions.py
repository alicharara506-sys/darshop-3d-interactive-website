"""Second pass for Jadever photos: models not listed for Lebanon are often
listed in another country on jadevermall.com. Uses the page's own hreflang
links to find those country pages. Updates data/photos.json.
Run: python tools/fetch_jadever_regions.py
"""
import json, re, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = {'User-Agent': 'Mozilla/5.0 (compatible; DAR-shop-catalogue)'}
IMG = 'https://res-de.togroup.com/stc/home_product/jadever/'
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r:
        return r.read()

catalog = json.loads((ROOT / 'data/catalog-sakr.json').read_text(encoding='utf8'))
photos = json.loads((ROOT / 'data/photos.json').read_text())
for p in catalog:
    code = p['code']
    if p['brand'] != 'jadever' or not code or photos.get(p['id']):
        continue
    html = get(f'https://www.jadevermall.com/lb-en/product/x/{code}').decode('utf8', 'ignore')
    alts = sorted(set(re.findall(r'href="(https://www\.jadevermall\.com/[a-z]{2}-en/product/[^"]+)"', html)))
    found = None
    for url in alts[:12]:
        time.sleep(0.3)
        try:
            h = get(url).decode('utf8', 'ignore').replace('\u002F', '/')
        except Exception:
            continue
        m = re.search(r'userfiles/1/images/photo/[0-9]+/' + re.escape(code) + r'[^"\'\s)]*?\.(?:jpg|jpeg|png|webp)', h, re.I)
        if m:
            found = m.group(0); break
    if not found:
        print('still missing', code, f'({len(alts)} countries tried)'); continue
    ext = found.rsplit('.', 1)[1].lower()
    (ROOT / f'public/products/catalog/{code}.{ext}').write_bytes(get(IMG + found))
    photos[p['id']] = f'/products/catalog/{code}.{ext}'
    print('ok', code)
(ROOT / 'data/photos.json').write_text(json.dumps(photos, indent=1))
print(sum(1 for v in photos.values() if v), 'of', len(photos), 'products have an official photo')

"""Download each catalogue product's photo from the brand's OFFICIAL site.

TOTAL:   https://www.totalbusiness.com/product/x/<CODE>   (any slug works)
Jadever: https://www.jadevermall.com/lb-en/product/x/<CODE>
The product page names the photo file; we save it to public/products/catalog/.
Writes data/photos.json: {product id: "/products/catalog/<file>" or null}.
Run: python tools/fetch_official_photos.py
"""
import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'products' / 'catalog'
OUT.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (compatible; DAR-shop-catalogue)'}
SITES = {
    'total': ('https://www.totalbusiness.com/product/x/{code}', 'https://www.totalbusiness.com/'),
    'jadever': ('https://www.jadevermall.com/lb-en/product/x/{code}', 'https://res-de.togroup.com/stc/home_product/jadever/'),
}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


catalog = json.loads((ROOT / 'data' / 'catalog-sakr.json').read_text(encoding='utf8'))
photos = {}
for p in catalog:
    code = p['code']
    photos[p['id']] = None
    if not code:
        continue
    page_url, img_base = SITES[p['brand']]
    try:
        html = get(page_url.format(code=code)).decode('utf8', 'ignore').replace('\\u002F', '/')
    except Exception as e:  # 404 = model not on the official site
        print('miss', code, getattr(e, 'code', e))
        time.sleep(0.4)
        continue
    m = re.search(r'userfiles/1/images/photo/[0-9]+/' + re.escape(code) + r'[^"\'\s)]*?\.(?:jpg|jpeg|png|webp)', html, re.I)
    if not m:
        print('no photo', code)
        time.sleep(0.4)
        continue
    ext = m.group(0).rsplit('.', 1)[1].lower()
    fname = f'{code}.{ext}'
    try:
        data = get(img_base + m.group(0))
        (OUT / fname).write_bytes(data)
        photos[p['id']] = f'/products/catalog/{fname}'
        print('ok', code, len(data) // 1024, 'KB')
    except Exception as e:
        print('img fail', code, e)
    time.sleep(0.4)

(ROOT / 'data' / 'photos.json').write_text(json.dumps(photos, indent=1), encoding='utf8')
got = sum(1 for v in photos.values() if v)
print(f'{got} of {len(photos)} products have an official photo')

"""Build data/catalog-sakr.json: the starter shop catalogue.

Source: SAKR Building Materials (sakrlb.com), a Lebanese TOTAL and Jadever
partner, read on 2026-11-05 from its public brand pages sorted by popularity
(TOTAL: top 64 of 164; Jadever: all 51). refPrice is SAKR's public USD price,
kept only as a market reference for DAR to set its own prices.
Run: python tools/build_catalog.py
"""
import json
from collections import Counter
from pathlib import Path

# name | code | SAKR category | USD price (or low-high) | SAKR product slug | image path
TOTAL = """Water Repellent||Car Tools & Accessories|4.00|rain-repellent|2024/12/Untitled-1-300x300.jpg
3 Pcs Abrasive Brush Set|TAC38033|Cleaning Tools & Supplies|2.50|3-pcs-abrasive-brush-total-tac38033|2024/03/dcdcdcdcdc-7-300x300.jpg
Safety Boots|TSP201SB|Safety Footwear|27.00|safety-boots-total-tsp201sb|2022/02/safety-shoes-300x300.jpg
2-Way Hose Connector|THHC1202|Water Sprinklers & Irrigation Supplies|3.50|2-way-hose-connector-total-thhc1202|2024/03/dcdcdcdcd-1-300x300.jpg
Fast Intelligent Charger 20V|TFCLI2001|Batteries & Chargers|10.00|fast-intelligent-charger-total-tfcli2001|2021/11/cdddcdcdcdc-300x300.jpg
Pocket Knife|THT51082|Knives & Blades|4.00|pocket-knife-total-tht51082|2023/04/cdcdccdcdc-300x300.jpg
Hose Reel|THHR40122|Water Sprinklers & Irrigation Supplies|17.00|hose-reel-total-thhr40122|2024/03/cdcdcdcddd-300x300.jpg
Steel Ladder|THLAD09021|Ladders|29.00-75.00|steel-ladder-2-steps-total-thlad09021|2023/10/20220215095454_50f187af-300x300.png
5L Pressure Sprayer|THSPP30502|Gardening Tools|11.00|5l-pressure-sprayer-total-thspp30502|2024/03/dcdcdcdc-1-300x300.jpg
5 Pcs Twist Nozzle Set||Water Sprinklers & Irrigation Supplies|4.00|5-pcs-twist-nozzle-set-total|2024/03/cdcdcdcdcdcdcd-1-300x300.jpg
55 Pcs Screwdriver Bit Set|TACSD30556|Screwdriver Bits & Holders|14.00|total-55-pcs-screwdriver-bit-set-tacsd30556|2022/12/55-pc-screw-driver-TOTAL-1-300x300.jpg
Brass Padlock|TLK323022|Door Furniture, Ironmongery & Locks|4.00-9.00|total-brass-padlock|2022/02/TLK323022-300x300.jpg
Mini Grinder|TG513326|Angle Grinders|35.00|mini-grinder-total-tg513326|2026/01/TG513326-1-300x300.jpg
Li-ion Mini Chain Saw|TGSLI2068|Gardening Power Tools|91.00|li-ion-mini-chain-saw-total-tgsli2068|2022/10/88-300x300.jpg
Tool Bag|THT261325|Tool Bags|14.00|total-tools-bag-tht261325|2022/04/TOTAL-THT261325-300x300.jpg
Safety Boots SB|TSP206SB|Safety Footwear|27.00|safety-boots-sb-total-tsp205sb|2025/09/total-shoes-300x300.jpg
Angle Square|TMT61212|Measuring Tools|4.00|angle-square-total-tmt61212|2024/05/dcdcdcdcdcdc-5-300x300.jpg
Metal Cutting Disc Set|TAC22111550|Cutting & Grinding Discs|16.00|metal-cutting-disc-set-total-tac22111550|2024/03/dcdcdcdcdc-9-300x300.jpg
Wet & Dry Vacuum Cleaner|TVC14301|Vacuum Cleaners|100.00|vacuum-cleaner-wet-dry-total-tvc14301|2024/03/dcdcdcdcdcdcd-300x300.jpg
Plastic Trigger Nozzle|THWS010901|Water Sprinklers & Irrigation Supplies|4.00|plastic-trigger-nozzle-total-thws010901|2024/03/dcdcdcdcd-300x300.jpg
High-Pressure Washer|TGT11316|Washer Pressures and Accessories|97.00|high-pressure-washer-total-tgt11316|2024/03/dcdcdcdcdcdcdc-300x300.jpg
Li-ion Work Lamp 20V|TWLI2023|Flashlights & Work Lights|9.00|lithium-ion-work-lamp-total-twli2023|2023/01/FD-300x300.jpg
Magnetic Welding Holder 4 in|TAMWH50042|Welding Accessories & Protection|4.00|magnetic-welding-holder-4-total-tamwh50042|2022/07/TAMWH50042-300x300.jpg
Electric Soldering Iron 60W|TET2606|Soldering Tools|8.00|electric-soldering-iron-60w-total-tet2606|2022/02/TET2606-300x300.jpg
Headlamp|THL013AAA5|Electrical & Lighting|5.00|headlamp-total-thl013aaa5|2024/08/total-1-300x300.jpg
Li-ion Cordless Drill 20V|TDLI200528|Cordless Drills|52.10|li-ion-cordless-drill-total-tdli200528|2024/04/dcdccdcdcdcdc-300x300.jpg
Paint Brush||Brushes & Rollers|1.00-2.00|paint-brush-total|2024/03/dcdcdcdc-2-300x300.jpg
Hose Quick Connector with Water Stop||Water Sprinklers & Irrigation Supplies|1.50|plastic-hose-quick-connector-with-water-stop-total|2024/03/dcdcdcdcdc-3-300x300.jpg
4 Pcs Wood Chisel Set|THT41K0401|Finishing Tools|13.00|4-pcs-wood-chisel-total-tht41k0401|2023/07/dcdcdcdcd-300x300.jpg
Li-ion Cordless Drill 12V|TDLI12208|Cordless Drills|36.00|total-lithium-ion-cordless-drill-total-tdli12208|2023/03/wwssws-300x300.jpg
Plastic Toolbox|TPBX0201|Tool Boxes|10.00-22.50|plastic-tool-box-archives-total-tpbx0201|2022/09/total-300x300.jpg
128 Pcs Tool Set|THKTHP11282|Hand Tool Sets|70.00|128-pcs-tools-set-total-thkthp11282|2022/08/TOTAL-THKTHP11282-300x300.jpg
Magnetic Welding Holder 3 in|TAMWH25032|Welding Accessories & Protection|2.50|magnetic-welding-holder-3-total-tamwh25032|2022/07/TAMWH25032-300x300.jpg
Magnetic Welding Holder|TAMWH50046|Welding Accessories & Protection|4.50|magnetic-welding-holder-total-tamwh50046|2022/07/TAMWH50046-300x300.jpg
Rotary Hammer SDS-Plus 800W|TH308268|Rotary Hammer|45.20|total-rotary-hammer-sds-plus-800w-th308268|2022/04/TOTAL-TH308268-300x300.jpg
Air Spray Gun|TAT10605|Paint Sprayers|70.00|air-spray-gun-total-tat10605|2025/08/TAT10605-1-300x300.jpg
Compact Brushless Cordless Drill|TDLI205581|Cordless Drills|25.00|compact-brushless-cordless-drill-total-tdli205581|2025/05/Total-TDLI205581-300x300.webp
7 Pcs Pliers Set|TOS23055|Pliers & Cutters|30.00|7-pcs-pliers-set-total-tos23055|2025/03/TOS230551-1-300x300.jpg
Li-ion Vacuum Cleaner 20V|TVLI20126|Vacuum Cleaners|55.00|li-ion-vacuum-cleaner-total-tvli20126|2024/05/dcdcdcdcdc-3-300x300.jpg
Electronic Safe||Safe Boxes|57.00-90.00|electronic-safe-total|2024/03/dcdcdcdcdcd-2-300x300.jpg
Hose Quick Connector||Water Sprinklers & Irrigation Supplies|1.50|plastic-hose-quick-connector-total|2024/03/dcdcdcdcdc-2-300x300.jpg
Brush Tray|TCHPTT082551|Brushes & Rollers|3.75|brush-tray-total-tchptt082551|2023/10/Untitled-1-4-300x300.jpg
235mm Hand Planer|THT9391|Finishing Tools|8.00|235mm-planer-total-tht9391|2023/01/to-300x300.jpg
Socket Tester|TESST30002|Electrician Measuring Tools|10.00|socket-tester-total-tesst30002|2023/01/total-300x300.jpg
Li-ion Soldering Iron 20V (bare tool)|TSILI2001|Soldering Tools|13.00|li-ion-soldering-iron-battery-and-charger-not-included-total-tsili2001|2022/09/total-tsili2001-300x300.jpg
Hand Level 10cm|TMT20105M|Measuring Tools|6.00|hand-level-10cm-total-tmt20105m|2021/12/TMT20105M-1-300x300.jpg
Electrical Test Kit 3 Pcs|TOS23068|Measuring Tools|28.00|electrical-test-kit-3-pcs-total-tos23068|2025/09/TOTAL-TOS23068-1-300x300.jpg
Brushless Cordless Impact Drill|TIDLI209681|Cordless Drills|60.00|brushless-cordless-impact-drill-total-tidli209681|2025/08/TIDLI209681-1-300x300.jpg
Cordless Blower 20V|TABLI200181|Blowers|55.00|cordless-blower-total-tabli200181|2025/08/TABLI200181-1-300x300.jpg
18 Gauge Crown Staples|TAC918252|Power Tools|4.00|18-gauge-crown-staple-total-tac918252|2025/07/TAC918252-1-300x300.jpg
2 Pcs Paint Tray Set|TCHPTT435105|Brushes & Rollers|5.00|2-pcs-paint-tray-set-total-tchptt435105|2024/02/dcdcdcdcdcd-9-300x300.jpg
Delta Sanding Sheet|TAC78080202|Sanding Accessories|3.00|delta-sanding-sheet-total-tac78080202|2023/08/cddcdcdcd-300x300.jpg
6 in Mini Hacksaw Frame|THMHF1501|Hand Saws|1.50|6-mini-hacksaw-frame-150mm-total-thmhf1501|2022/12/TOTAL-1-300x300.jpg
Li-ion Mini Chain Saw 20V 2Ah|TGSLI20683|Gardening Power Tools|143.90|lithium-ion-mini-chain-saw-20v-2ah-total-tgsli20683|2022/11/EDEDED-300x300.jpg
Folding Rule 60cm|TMT646003|Hand Tools|9.00|total-measure-metre-60cm-tmt646003|2022/02/TMT646003-300x300.jpg
Stoning Hammer 1.5kg|THTSTH15006|Hammers|12.00|stoning-hammer-1-5kg-total-thtsth15006|2026/04/TOTAL-THTSTH15006-1-300x300.jpg
Cordless Pressure Washer 20V|TPWLI2036|Washer Pressures and Accessories|40.00|cordless-pressure-washer-20v-total-tpwli2036|2026/04/Total-1-300x300.jpg
Air Spray Gun|TAT10402|Paint Sprayers|17.00|air-spray-gun-total-tat10402|2025/08/TAT10402-1-300x300.jpg
High-Pressure Washer|TGT11336|Washer Pressures and Accessories|90.00|high-pressure-washer-total-tgt11336|2025/07/High-pressure-washer-TGT11336-1-300x300.jpg
Li-ion Pole Hedge Trimmer|TPHT201601|Gardening Power Tools|90.00|li-ion-pole-hedge-trimmer-total-tpht201601|2025/07/TPHT201601-1-300x300.jpg
Li-ion 3 Pcs Combo Kit|TOSLI241198|Power Tools Bundles|172.90|li-ion-3-pcs-combo-kit-total-tosli241198|2025/03/TOTAL-241198-1-300x300.jpg
Laser Level and Distance Measuring Kit|TOSLL0401|Measuring Tools|67.90|laser-level-and-distance-measuring-kit-total-tosll0401|2025/03/TOSLL0401-300x300.webp
Floor-Based Spray Gun|TT5006|Paint Sprayers|50.00|floor-based-spray-gun-total-tt5006|2024/04/dcdcdcdcd-3-300x300.jpg
Inverter Flux-Cored Welding Machine|TFC13012|Welding Machines|145.00|inverter-flux-cord-arc-welding-fcaw-machine-total-tfc13012|2024/03/fvcddcdcdcdcdc-300x300.jpg"""

JADEVER = """Temperature and Humidity Meter|JDTM1505|Measuring Tools|8.00|temperature-and-humidity-watch-jadever-jdtm1505|2024/06/Untitled-1-2-300x300.jpg
Hasp and Staple||Door Furniture, Ironmongery & Locks|0.60-2.50|hasp-staple-jadever|2024/03/dcdcdcdcd-4-300x300.jpg
Sponge Sandpaper||Sanding Accessories|1.50|sponge-sandpaper-jadever|2024/07/jadever-3-300x300.jpg
Impact Screwdriver Bits|JDSV3K63|Screwdriver Bits & Holders|1.20|impact-screwdriver-bits-jadever-jdsv3k63|2024/08/jadever-300x300.jpg
Folding Workbench Table|JDWE1525|Tool Storage & Workshop Equipment|28.00|folding-workbench-table-jadever-jdwe1525|2025/08/Jadever-JDWE1525-1-300x300.jpg
Screwdriver Bits|JDSV0K11|Screwdriver Bits & Holders|1.00|screwdriver-bits-jadever-jdsv0k11|2024/08/jadever-4-300x300.jpg
Impact Screwdriver Bits|JDSV3K62|Screwdriver Bits & Holders|1.20|impact-screwdriver-bits-jadever-jdsv3k62|2024/08/jadever-2-300x300.jpg
Impact Screwdriver Bit Set|JDSV6K66|Screwdriver Bits & Holders|5.00|impact-screwdriver-bits-jadever-jdsv6k66|2024/06/dcdcdcdcdc-8-300x300.jpg
Staple Remover|JDQD1665|Hand Tools|3.00|staple-remover-jadever-jdqd1665|2024/03/dcdcdcdcdc-1-300x300.jpg
Drain Auger|JDDD3345|Pipe & Plumbing Tools|12.00|drain-auger-jadever-jddd3345|2024/06/dcdcdcdcdc-3-300x300.jpg
Impact Screwdriver Bits|JDSV2K61|Screwdriver Bits & Holders|1.00|impact-screwdriver-bits-jadever-jdsv2k61|2024/08/jadever-1-300x300.jpg
31-in-1 Precision Screwdriver Set|JDSS1J31|Screwdrivers & Hex Keys|4.00|31-in-1-precision-screwdriver-set-jadever-jdss1j31|2024/07/jadever-1-300x300.jpg
40 Pcs Key Accessory Set|JDKC1B01|Hand Tools|4.00|40pcs-key-accessory-jadever-jdkc1b01|2024/06/cdcdcdc-1-300x300.jpg
Belt Press|JDCP6404|Hand Tools|10.00|belt-press-jadever-jdcp6404|2024/06/dcdcdcdcdc-5-300x300.jpg
Low-Loading Car Lift Platform|JDVE2A25|Automotive Tools|120.00|low-loading-car-lift-platform-jadever-jdve2a25|2024/06/dcdcdcdcdcdc-2-300x300.jpg
Orbital Sander 350W|JDFA55350|Orbital Sanders|145.00|orbital-sander-350w-jadever-jdfa55350|2026/04/JDFA55350-1-300x300.jpg
Miter Box with 12 in Back Saw|JDHW2112|Hand Saws|7.00|miter-box-with-12-back-saw-set-jadever-jdhw2112|2026/04/Jadever-1-300x300.jpg
Wood Saw Table Set of 2|JDDZ1510|Heavy Lifting Equipment|48.00|wood-saw-table-set-of-2-jadever-jddz1510|2024/07/jadever-300x300.jpg
Electric Extension Cord||Electrical & Lighting|5.50-16.00|electric-extension-cord-jadever|2026/07/Jadever-Electric-Extension-Cord-2-300x300.png
12 Pcs Cold Chisel and Punch Set|JDCC8312|Striking Tools|21.39|12-pcs-cold-chisel-and-punch-set-jadever-jdcc8312|2025/01/jdcc8312_copy-300x300.jpg
Mini Grinder|JDRYP1504|Angle Grinders|35.00|mini-grinder-jadever-jdryp1504|2024/03/cdcdcdcdcdcdcd-300x300.jpg
Wheelbarrow|JDWB1F01|Heavy Lifting Equipment|42.00|wheelbarrow-jadever-jdwb1f01|2026/07/JDWB1F01-300x300.png
Cordless Garden Shear 20V|JDJC1520|Gardening Power Tools|40.00|cordless-garden-shear-20v-jadever-jdjc1520|2026/05/JDJC1520-1-300x300.jpg
Non-Contact AC Voltage Detector|JDTP3501|Electrician Measuring Tools|10.00|non-contact-ac-voltage-detector-jadever-jdtp3501|2026/03/Jadever-JDTP3501-300x300.jpg
Heavy-Duty Wheelbarrow|JDWB8F01|Heavy Lifting Equipment|50.00|wheelbarrow-jadever-jdwb8f01|2026/07/JDWB8F01-300x300.png
1/2 in PVC Garden Hose|JDYP1E20|Water Sprinklers & Irrigation Supplies|15.00|1-2-pvc-garden-hose-jadever-jdyp1e20|2026/06/JDYP1E20-300x300.jpg
Heavy-Duty Modular Garage Cabinets|JDCS3A08|Tool Storage & Workshop Equipment|1210.00|heavy-duty-modular-garage-cabinets-jadever-jdcs3a08|2026/06/JDCS3A08-1-300x300.jpg
Aviation Snip 10 in|JDAS2910|Gardening Tools|5.00|aviation-snip-10-jadever-jdas2910|2026/06/JDAS2910-1-300x300.jpg
2-Piece Screwdriver Set|JDSS1302|Screwdrivers & Hex Keys|3.00|2-piece-screwdriver-set-jadever-jdss1302|2026/06/JDSS1302-1-300x300.jpg
Cordless Hedge Trimmer 20V|JDLYP546|Gardening Power Tools|80.00|cordless-hedge-trimmer-20v-jadever-jdlyp546|2026/05/JDLYP546-1-300x300.jpg
Plastic Drum 20L|JDQY2320|Car Tools & Accessories|17.00|plastic-drum-20l-jadever-jdqy2320|2026/03/jadever-1-1-300x300.jpg
4 Pcs Star Box-End Wrench Set|JDFR2404|Wrenches & Spanners|17.00|4-pcs-star-box-end-wrench-set-jadever-jdfr2404|2024/07/jadever-2-300x300.jpg
Magnetic Wristband|JDHV1401|Hand Tools|7.60|magnetic-wristband-jadever-jdhv1401|2024/03/dcdcdcdcdcdc-23-300x300.jpg
Long-Neck Bronze Lock||Door Furniture, Ironmongery & Locks|8.00|long-neck-bronze-lock-jadever|2024/03/dcdcdcdcdcd-300x300.jpg
Plastic Air Blow Gun|JDGA4611|Tool Accessories|3.00|plastic-air-blow-gun-jadever-jdga4611|2024/03/dcdcdcdcdcdc-1-300x300.jpg
Auto-Darkening Welding Helmet|JDWH2501|Welding Accessories & Protection|23.00|auto-darkening-welding-helmet-jadever-jdwh2501|2024/03/ddcdcdcdc-300x300.jpg
Cordless Pressure Washer 12V|JDQX2512|Washer Pressures and Accessories|120.00|cordless-pressure-washer-12v-jadever-jdqx2512|2026/08/JDQX2512-300x300.png
4-Way Extension Socket|JDEJ7304|Electrical & Lighting|7.00|4-way-extension-socket-jadever-jdej7304|2026/07/JDEJ7304-1-300x300.png
Cordless Blower|JDBLP520|Blowers|32.00|cordless-blower-jadever-jdblp520|2026/07/JDBLP520-1-300x300.png
Folding Aluminium Camping Table|JDHWT1101|Outdoor Living|80.00|portable-folding-aluminum-camping-table-jadever-jdhwt1101|2026/06/JDHWT1101-300x300.jpg
Hex Key Set 9 Pcs|JDHK1292|Screwdrivers & Hex Keys|5.10|hex-key-set-9pcs-jadever-jdhk1292|2026/06/JDHK1292-1-300x300.jpg
Cordless Hedge Trimmer 20V|JDLYP5181|Gardening Power Tools|70.00|cordless-hedge-trimmer-20v-jadever-jdlyp5181|2026/05/JDLYP5181-1-300x300.jpg
Petrol Grass Trimmer and Brush Cutter|JDGM2543|Gardening Power Tools|105.00|gasoline-grass-trimmer-and-brush-cutter-jadever-jdgm2543|2026/05/JDGM2543-1-300x300.jpg
Cordless Garden Shear 4V|JDJC1504|Gardening Power Tools|23.00|cordless-garden-shear-4v-jadever-jdjc1504|2026/05/JDJC1504-1-300x300.jpg
Cordless Straight Shear 4V|JDJF1504|Gardening Power Tools|35.00|cordless-straight-shear-4v-jadever-jdjf1504|2026/05/JDJF1504-1-300x300.jpg
Cordless Pressure Washer|JDQX1528|Washer Pressures and Accessories|40.00|cordless-pressure-washer-jadever-jdqx1528|2025/08/Jadever-JDQX1528-1-300x300.jpg
Vacuum Cleaner|JDVR6520|Vacuum Cleaners|75.00|vacuum-cleaner-jadever-jdvr6520|2025/07/JDVR6520-1-300x300.jpg
Pressure Washer and Vacuum Cleaner|JDHP4A16|Vacuum Cleaners|165.00|pressure-washer-and-vacuum-cleaner-jadever-jdhp4a16|2025/07/JDHP4A16-1-300x300.jpg
Plate Carrier|JDTN1001|Hand Tools|9.00|plate-carrier-jadever-jdtn1001|2024/06/dcdcdcdcdc-4-300x300.jpg
Cordless Screwdriver|JDCV4401|Cordless Drills|18.00|cordless-screwdriver-jadever-jdcv4401|2024/03/ccdcdcdcdcdcd-300x300.jpg
Bronze Lock||Door Furniture, Ironmongery & Locks|2.00-4.00|bronze-lock-jadever|2024/03/dcdcdcdcdc-300x300.jpg"""

# DAR shop categories (8) built from SAKR's 40+ categories.
CATEGORIES = {
    'power': ['Cordless Drills', 'Angle Grinders', 'Rotary Hammer', 'Blowers', 'Power Tools', 'Power Tools Bundles',
              'Orbital Sanders', 'Batteries & Chargers', 'Soldering Tools', 'Paint Sprayers'],
    'cleaning': ['Vacuum Cleaners', 'Washer Pressures and Accessories', 'Cleaning Tools & Supplies'],
    'garden': ['Gardening Power Tools', 'Gardening Tools', 'Water Sprinklers & Irrigation Supplies', 'Outdoor Living'],
    'hand': ['Hand Tools', 'Hand Tool Sets', 'Pliers & Cutters', 'Screwdrivers & Hex Keys', 'Screwdriver Bits & Holders',
             'Wrenches & Spanners', 'Hammers', 'Hand Saws', 'Finishing Tools', 'Striking Tools', 'Knives & Blades',
             'Pipe & Plumbing Tools'],
    'measure': ['Measuring Tools', 'Electrician Measuring Tools'],
    'accessories': ['Cutting & Grinding Discs', 'Sanding Accessories', 'Tool Accessories', 'Brushes & Rollers'],
    'welding': ['Welding Machines', 'Welding Accessories & Protection', 'Safety Footwear'],
    'storage': ['Tool Bags', 'Tool Boxes', 'Tool Storage & Workshop Equipment', 'Heavy Lifting Equipment', 'Ladders'],
    'home': ['Electrical & Lighting', 'Flashlights & Work Lights', 'Door Furniture, Ironmongery & Locks', 'Safe Boxes',
             'Car Tools & Accessories', 'Automotive Tools'],
}
TO_SHOP = {src: shop for shop, srcs in CATEGORIES.items() for src in srcs}

out, seen = [], set()
for brand, blob in (('total', TOTAL), ('jadever', JADEVER)):
    for line in blob.strip().splitlines():
        name, code, cat, price, slug, img = line.split('|')
        if (brand, slug) in seen:
            continue
        seen.add((brand, slug))
        lo, _, hi = price.partition('-')
        out.append({
            'id': f'{brand}-{slug}', 'brand': brand, 'name': name, 'code': code,
            'cat': TO_SHOP[cat], 'sourceCat': cat,
            'refPrice': float(lo), 'refPriceMax': float(hi) if hi else None,
            'source': f'https://www.sakrlb.com/product/{slug}/',
            'sourceImg': f'https://www.sakrlb.com/wp-content/uploads/{img}',
        })

root = Path(__file__).resolve().parent.parent
(root / 'data').mkdir(exist_ok=True)
(root / 'data' / 'catalog-sakr.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf8')
print(len(out), dict(Counter(p['brand'] for p in out)))
print(dict(Counter(p['cat'] for p in out)))

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildTools, buildPhotoCards } from './tools.js';
import { STR } from './i18n.js';
import { navHTML, initMenu } from './site-nav.js';
import './style.css';

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const range = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => t * t * (3 - 2 * t);
const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const q = new URLSearchParams(location.search);
const PIN = q.has('p') ? clamp(parseFloat(q.get('p'))) : null; // QA: ?p=0..1 pins the scroll (intro skipped)
let lang = ['en', 'fr', 'ar'].includes(q.get('lang')) ? q.get('lang') : 'en';

// On load the tools fly in and float (INTRO seconds). Scrolling moves them onto
// the shelf, then (on phones) the camera slides right along it:
// TOTAL → Jadever → coming soon → visit.
const INTRO = 2.2;
const ST = [0, 0.14, 0.38, 0.6, 0.82]; // panel stages: hero, TOTAL, Jadever, soon, visit
const SORT_A = 0.03, SORT_B = 0.22; // scroll range of the move to the shelf

// ---------- renderer / scene ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const BG = 0xe6e7e9;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 34, 60);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(4, 10, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 10, bottom: -5, near: 1, far: 30 });
sun.shadow.radius = 6; sun.shadow.bias = -0.0005;
scene.add(sun);

const FLOOR = -1.9;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true;
scene.add(floor);

// ---------- shelf: one group per brand bay ----------
const BAY_W = 2.1, BAY_H = 2.5, BAY_D = 0.9, SHELF_Z = -0.6;
const BOARDS = [0.04, 0.84, 1.64]; // heights above the bay's floor
const shelf = new THREE.Group(); scene.add(shelf);
const white = new THREE.MeshPhysicalMaterial({ color: 0xf7f7f7, roughness: 0.4, clearcoat: 0.6 });
const orange = new THREE.MeshPhysicalMaterial({ color: 0xff5a1f, roughness: 0.35, clearcoat: 1 });
const BAYS = [
  { brand: 'total', tint: 0xd6eef0 },
  { brand: 'jadever', tint: 0xdcecd8 },
  { brand: 'soon', tint: 0xeeeeee },
];
const bayGroups = [], bayLabels = [], shopButtons = [];
// Brands announced on the coming-soon bay, one per shelf (top to bottom).
// logo: file in /public/brands (from Wikimedia Commons); aspect = width / height.
// Parkside shows its name until we get a logo file.
const SOON_BRANDS = [
  { name: 'Schneider Electric', logo: '/brands/schneider.svg', aspect: 956.7 / 436.2 },
  { name: 'ABB', logo: '/brands/abb.svg', aspect: 88.2 / 35 },
  { name: 'Parkside' },
];
function plaqueTexture({ name, logo, aspect }) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 300;
  const g = cv.getContext('2d');
  const frame = () => {
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.roundRect(8, 8, 1008, 284, 40); g.fill();
    g.strokeStyle = '#a9abaf'; g.lineWidth = 5; g.setLineDash([18, 14]); g.stroke(); g.setLineDash([]);
  };
  frame();
  g.fillStyle = '#55585d'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${name.length > 10 ? 104 : 130}px Montserrat, Arial`; g.fillText(name, 512, 154);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (logo) {
    // Draw the logo, fitted inside the frame, once the file has loaded.
    const img = new Image();
    img.onload = () => {
      let w = 820, h = w / aspect; if (h > 210) { h = 210; w = h * aspect; }
      frame(); g.drawImage(img, 512 - w / 2, 150 - h / 2, w, h); t.needsUpdate = true;
    };
    img.src = logo;
  }
  return t;
}
function shopButtonTexture(brand) {
  const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 240;
  const g = cv.getContext('2d');
  g.fillStyle = '#ff5a1f'; g.beginPath(); g.roundRect(4, 4, 992, 232, 116); g.fill();
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.direction = lang === 'ar' ? 'rtl' : 'ltr';
  g.font = `800 96px ${lang === 'ar' ? 'Cairo' : 'Montserrat'}, Arial`;
  g.fillText(STR[lang].shopBtn.replace('{b}', brand === 'total' ? 'TOTAL' : 'Jadever'), 500, 126);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function plusTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.strokeStyle = '#a9abaf'; g.lineWidth = 5; g.setLineDash([16, 12]); g.strokeRect(10, 10, 236, 236);
  g.setLineDash([]); g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(128, 88); g.lineTo(128, 168); g.moveTo(88, 128); g.lineTo(168, 128); g.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
BAYS.forEach((b) => {
  const bg = new THREE.Group();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W - 0.06, BAY_H), new THREE.MeshPhysicalMaterial({ color: b.tint, roughness: 0.7 }));
  back.position.set(0, BAY_H / 2, -BAY_D / 2); back.receiveShadow = true; bg.add(back);
  for (const y of BOARDS) {
    const bd = new THREE.Mesh(new RoundedBoxGeometry(BAY_W - 0.06, 0.06, BAY_D, 2, 0.02), white);
    bd.position.set(0, y, 0); bd.receiveShadow = bd.castShadow = true; bg.add(bd);
  }
  for (const x of [-BAY_W / 2, BAY_W / 2]) {
    const side = new THREE.Mesh(new RoundedBoxGeometry(0.06, BAY_H + 0.1, BAY_D + 0.02, 2, 0.02), white);
    side.position.set(x, (BAY_H + 0.1) / 2, 0); side.castShadow = true; bg.add(side);
  }
  const bar = new THREE.Mesh(new RoundedBoxGeometry(BAY_W + 0.06, 0.06, BAY_D + 0.02, 2, 0.02), orange);
  bar.position.set(0, BAY_H + 0.05, 0); bg.add(bar);
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W - 0.2, 0.42), new THREE.MeshBasicMaterial({ transparent: true }));
  lbl.position.set(0, BAY_H + 0.34, -BAY_D / 2 + 0.02); bg.add(lbl); bayLabels.push(lbl);
  if (b.brand === 'soon') {
    // One brand name per shelf, as plain text (no logos until partnerships are signed).
    SOON_BRANDS.forEach((brand, k) => {
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.5), new THREE.MeshBasicMaterial({ transparent: true, map: plaqueTexture(brand) }));
      plaque.position.set(0, BOARDS[2 - k] + 0.42, -BAY_D / 2 + 0.01); bg.add(plaque);
    });
  } else {
    // E-commerce entry: "Shop TOTAL" / "Shop Jadever" button above the bay.
    const btn = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.36), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false }));
    btn.position.set(0, BAY_H + 0.86, -BAY_D / 2 + 0.03); btn.userData.shopBrand = b.brand;
    bg.add(btn); shopButtons.push(btn);
  }
  shelf.add(bg); bayGroups.push(bg);
});
const bayX = i => (i - (BAYS.length - 1) / 2) * BAY_W;
function layoutShelf() { bayGroups.forEach((g, i) => g.position.set(bayX(i), FLOOR, SHELF_Z)); }
function drawBayLabels() {
  const s = STR[lang];
  BAYS.forEach((b, i) => {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 220;
    const g = cv.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (b.brand === 'total') { g.fillStyle = '#0b7480'; g.font = 'italic 800 130px Montserrat, Arial'; g.fillText('TOTAL', 512, 110); }
    else if (b.brand === 'jadever') { g.fillStyle = '#1f7a37'; g.font = 'italic 800 130px Montserrat, Arial'; g.fillText('Jadever', 512, 110); }
    else {
      g.direction = lang === 'ar' ? 'rtl' : 'ltr';
      const f = lang === 'ar' ? 'Cairo, Arial' : 'Montserrat, Arial';
      g.fillStyle = '#7b7d82'; g.font = `700 96px ${f}`; g.fillText(s.soon, 512, 110);
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    bayLabels[i].material.map?.dispose(); bayLabels[i].material.map = t; bayLabels[i].material.needsUpdate = true;
  });
  for (const btn of shopButtons) { btn.material.map?.dispose(); btn.material.map = shopButtonTexture(btn.userData.shopBrand); btn.material.needsUpdate = true; }
}

// ---------- tools ----------
// TOTAL = real photo cards, Jadever = stand-ins. Mixed so both float together.
const cards = buildPhotoCards(renderer.capabilities.getMaxAnisotropy());
const standIns = buildTools();
const tools = [];
for (let k = 0; k < Math.max(cards.length, standIns.length); k++) { if (cards[k]) tools.push(cards[k]); if (standIns[k]) tools.push(standIns[k]); }
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const slotCount = { total: 0, jadever: 0 };
const TOOL_BAY = 0.6; // tool size on the shelf
tools.forEach((t, i) => {
  scene.add(t);
  const brand = t.userData.brand, n = slotCount[brand]++;
  const col = n % 3, row = Math.floor(n / 3);
  t.userData.p = {
    i, jx: rnd() - 0.5, jy: rnd() - 0.5, jz: rnd() - 0.5,
    // Cards never turn far enough to be seen edge-on.
    inRot: new THREE.Quaternion().setFromEuler(t.userData.card ? new THREE.Euler((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 2, (rnd() - 0.5) * 1.2) : new THREE.Euler(rnd() * 6.3, rnd() * 6.3, rnd() * 6.3)),
    flRot: new THREE.Quaternion().setFromEuler(t.userData.card ? new THREE.Euler(Math.sin(i) * 0.12, Math.cos(i * 1.3) * 0.3, Math.sin(i * 2.1) * 0.1) : new THREE.Euler(Math.sin(i) * 0.5, Math.cos(i * 1.3) * 0.7, Math.sin(i * 2.1) * 0.4)),
    bay: brand === 'total' ? 0 : 1,
    slot: new THREE.Vector3((col - 1) * 0.66, BOARDS[row] + 0.03 + (TOOL_BAY * t.userData.aspectH) / 2 + 0.01, 0.05),
    bayRot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, t.userData.card ? (col - 1) * 0.1 : -0.25 + col * 0.25, 0)),
    delay: (i % 7) * 0.008, spin: 0.25 + rnd() * 0.35, ph: rnd() * 6, lag: (i % 7) * 0.05,
  };
});
// Where each tool floats before it goes to the shelf.
const flTmp = new THREE.Vector3();
const FLOAT_CY = FLOOR + 2.6; // centre of the floating cloud
function floatPos(P, out) {
  const n = tools.length, i = P.i;
  if (tall) {
    // Phones: a tall cloud filling the screen, two tools per row, zig-zag.
    const row = Math.floor(i / 2), rows = Math.ceil(n / 2), side = ((i + row) % 2 ? 1 : -1) * (row % 2 ? 0.8 : 1);
    return out.set(side * 0.78 + P.jx * 0.35, FLOAT_CY + 2.3 - (row / (rows - 1)) * 4.6 + P.jy * 0.2, P.jz * 1.0);
  }
  // Wide: a loose 5 x 3 cloud.
  const cx = i % 5, cy = Math.floor(i / 5);
  return out.set((cx - 2) * 1.2 + P.jx * 0.35 + (cy % 2) * 0.3, FLOAT_CY + 1.25 - cy * 1.25 + P.jy * 0.3, P.jz * 1.4);
}

// ---------- layout & camera ----------
let W = 1, Hgt = 1, tall = false, short = false;
const panel = document.getElementById('panel');
function measurePanel() {
  // Phones: the text area is as tall as the longest stage text, no taller.
  if (!tall) { document.documentElement.style.removeProperty('--ph'); return; }
  const probe = panel.cloneNode(false);
  probe.removeAttribute('id');
  probe.style.cssText = 'visibility:hidden;position:fixed;top:0;bottom:auto;height:auto;';
  document.body.appendChild(probe);
  let max = 0;
  STR[lang].stages.forEach((s, i) => { probe.innerHTML = panelHTML(i); max = Math.max(max, probe.offsetHeight); });
  probe.remove();
  document.documentElement.style.setProperty('--ph', `${Math.ceil(max)}px`);
}
function resize() {
  tall = innerHeight > innerWidth;
  document.body.classList.toggle('portrait', tall);
  short = !tall && innerHeight < 560;
  document.body.classList.toggle('short', short);
  measurePanel();
  const r = stage.getBoundingClientRect();
  W = Math.max(1, r.width); Hgt = Math.max(1, r.height);
  renderer.setSize(W, Hgt, false);
  camera.aspect = W / Hgt;
  // Wide screens: text on the left, so move the picture's centre to the right.
  if (!tall) camera.setViewOffset(W, Hgt, -W * (short ? 0.21 : 0.18), 0, W, Hgt); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  layoutShelf();
}
addEventListener('resize', resize);

function fitDist(halfW, halfH) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const usable = tall ? 1 : short ? 0.55 : 0.62;
  return Math.max(halfH / t, halfW / (t * camera.aspect * usable)) * 1.03;
}
const look = new THREE.Vector3();
// Phones: [scroll, bay x, half width] — the camera slides right along the shelf.
const PHONE_KEYS = [
  [0.14, bayX(0), 0.6], [0.3, bayX(0), 0.6],
  [0.4, bayX(1), 0.6], [0.53, bayX(1), 0.6],
  [0.63, bayX(2), 0.6], [0.75, bayX(2), 0.6],
  [0.86, bayX(0), 0.6], // last scroll (visit the shop): slide back to the TOTAL bay
];
function phoneShelf(p) {
  if (p <= PHONE_KEYS[0][0]) return PHONE_KEYS[0];
  for (let k = 1; k < PHONE_KEYS.length; k++) {
    const [p1, x1, w1] = PHONE_KEYS[k], [p0, x0, w0] = PHONE_KEYS[k - 1];
    if (p <= p1) { const t = easeIO(range(p, p0, p1)); return [p, lerp(x0, x1, t), lerp(w0, w1, t)]; }
  }
  return PHONE_KEYS[PHONE_KEYS.length - 1];
}
function placeCamera(p, time) {
  const toShelf = easeIO(range(p, SORT_A, SORT_B));
  const d1 = tall ? fitDist(1.4, 3.05) : fitDist(3.4, 2.4);
  const shelfH = BAY_H + 1.15, shCy = FLOOR + shelfH / 2; // includes the Shop buttons
  let sx = 0, d2;
  if (tall) { const [, x, w] = phoneShelf(p); sx = x; d2 = fitDist(BAY_W * w, shelfH / 2 + 0.1); }
  else d2 = fitDist(BAY_W * BAYS.length / 2 + 0.15, shelfH / 2 + 0.25);
  const d = lerp(d1, d2, toShelf);
  const orbit = (1 - toShelf) * Math.sin(time * 0.18) * 0.12;
  const ly = lerp(FLOAT_CY, shCy, toShelf);
  look.set(sx * toShelf, ly, lerp(0, SHELF_Z, toShelf));
  camera.position.set(look.x + Math.sin(orbit) * d, ly + lerp(0.6, 0.5, toShelf), Math.cos(orbit) * d + look.z);
  camera.lookAt(look);
}

// ---------- animate ----------
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), spinQ = new THREE.Quaternion(), idQ = new THREE.Quaternion(), eul = new THREE.Euler();
let pSmooth = PIN ?? 0;
function progress() {
  if (PIN !== null) return PIN;
  const max = document.documentElement.scrollHeight - innerHeight;
  return max > 0 ? clamp(scrollY / max) : 0;
}

const target = new THREE.Vector3();
function update(p, time, it) {
  const shelfIn = easeOut(range(p, SORT_A, SORT_B - 0.04));
  shelf.position.z = lerp(-16, 0, shelfIn);
  shelf.visible = shelfIn > 0.001;

  for (const t of tools) {
    const P = t.userData.p;
    // Intro: fly in from deep behind, then float.
    const inn = easeOut(range(it, P.lag, P.lag + 0.62));
    const sort = easeIO(range(p, SORT_A + P.delay, SORT_B - 0.03 + P.delay));
    floatPos(P, flTmp);
    tmpV.set(flTmp.x * 0.3, flTmp.y - 1.2, -18).lerp(flTmp, inn);
    tmpV.y += Math.sin(time * 0.9 + P.ph) * 0.07 * inn * (1 - sort);
    target.copy(P.slot).add(bayGroups[P.bay].position).add(shelf.position);
    tmpV.lerp(target, sort);
    tmpV.y += Math.sin(sort * Math.PI) * 0.7;
    t.position.copy(tmpV);
    tmpQ.slerpQuaternions(P.inRot, P.flRot, inn);
    if (t.userData.card) {
      // Photo cards sway and follow the finger instead of spinning.
      eul.set(tilt.y * 0.25 + Math.sin(time * 0.6 + P.ph) * 0.06, tilt.x * 0.5 + Math.sin(time * 0.45 + P.ph) * 0.32, 0);
    } else eul.set(0, (time * P.spin) % (Math.PI * 2), 0);
    spinQ.setFromEuler(eul);
    tmpQ.multiply(idQ.identity().slerp(spinQ, inn * (1 - sort)));
    tmpQ.slerp(P.bayRot, sort);
    if (t.userData.card && sort > 0) { eul.set(tilt.y * 0.12, tilt.x * 0.25, 0); tmpQ.multiply(spinQ.setFromEuler(eul).slerp(idQ.identity(), 1 - sort)); }
    t.quaternion.copy(tmpQ);
    const k = t.userData.card ? (tall ? 1.0 : 1.15) : 1;
    t.scale.setScalar(lerp(lerp(0.4, tall ? 0.82 : 0.95, inn) * k, TOOL_BAY * (t.userData.card ? 1.08 : 1), sort));
  }
  placeCamera(p, time);
}

// ---------- UI ----------
let shown = -1;
function stageIndex(p) { let i = 0; ST.forEach((s, k) => { if (p >= s - 0.001) i = k; }); return i; }
function panelHTML(i) {
  const s = STR[lang].stages[i];
  return `
    <p class="k">${s.k}</p>
    <h1>${s.t}</h1>
    <p class="b">${s.b}</p>
    ${s.shop ? `<div class="ctas"><a class="btn" href="${shopUrl(s.shop)}">${STR[lang].shopBtn.replace('{b}', s.t)}</a></div>` : ''}
    ${s.cta ? `<div class="ctas"><a class="btn" href="#" onclick="return false">${s.cta}</a><a class="ig" href="#" onclick="return false">${s.ig}</a></div>` : ''}
    ${i === 0 ? `<p class="hint">${STR[lang].scroll} ↓</p>` : ''}`;
}
const shopUrl = brand => `/shop.html?brand=${brand}&lang=${lang}`;
function renderPanel(i) {
  panel.classList.remove('in'); void panel.offsetWidth;
  panel.innerHTML = panelHTML(i);
  panel.classList.add('in');
  shown = i;
}
function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('.langs button').forEach(b => b.classList.toggle('on', b.dataset.l === l));
  document.getElementById('tag').textContent = STR[l].tag;
  document.getElementById('navSlot').innerHTML = navHTML(l, 'home');
  drawBayLabels();
  resize();
  renderPanel(stageIndex(pSmooth));
}
document.querySelectorAll('.langs button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.l)));

// Tap or hover a tool to see its name.
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
const tip = document.getElementById('tip');
let introT = 0;
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(tools, true).find(h => h.object.userData.tool);
  const overBtn = shelf.visible && ray.intersectObjects(shopButtons, false).length > 0;
  if (overBtn) { tip.classList.remove('on'); renderer.domElement.style.cursor = 'pointer'; return; }
  if (hit && introT > 0.6) {
    const t = hit.object.userData.tool;
    tip.innerHTML = `<b>${STR[lang].tools[t.userData.id]}</b><span class="${t.userData.brand}">${t.userData.brand === 'total' ? 'TOTAL' : 'Jadever'}</span>`;
    const x = clamp(e.clientX - r.left, 10, r.width - 200);
    tip.style.left = `${x}px`; tip.style.top = `${e.clientY - r.top - 34}px`;
    tip.classList.add('on');
    renderer.domElement.style.cursor = 'pointer';
  } else { tip.classList.remove('on'); renderer.domElement.style.cursor = ''; }
}
renderer.domElement.addEventListener('pointermove', pick);
renderer.domElement.addEventListener('pointerdown', pick);
// Tapping a Shop button above a bay opens that brand's shop page.
renderer.domElement.addEventListener('click', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(shopButtons, false)[0];
  if (hit && shelf.visible) location.href = shopUrl(hit.object.userData.shopBrand);
});
addEventListener('scroll', () => tip.classList.remove('on'), { passive: true });

// Finger / mouse tilt for the photo cards (-1..1, smoothed).
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => { tilt.tx = (e.clientX / innerWidth) * 2 - 1; tilt.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
addEventListener('touchmove', e => { const p = e.touches[0]; if (p) { tilt.tx = (p.clientX / innerWidth) * 2 - 1; tilt.ty = (p.clientY / innerHeight) * 2 - 1; } }, { passive: true });

// ---------- loop ----------
const clock = new THREE.Clock();
let startT = null;
function frame() {
  const time = clock.getElapsedTime();
  if (startT === null) startT = time;
  introT = PIN !== null && !q.has('t') ? 1 : clamp((time - startT - 0.35) / INTRO);
  if (q.has('t')) introT = clamp(parseFloat(q.get('t')));
  const target = progress();
  pSmooth += (target - pSmooth) * 0.12;
  if (Math.abs(target - pSmooth) < 0.0002) pSmooth = target;
  tilt.x += (tilt.tx - tilt.x) * 0.06; tilt.y += (tilt.ty - tilt.y) * 0.06;
  update(pSmooth, time, introT);
  const i = stageIndex(pSmooth);
  if (i !== shown) renderPanel(i);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

document.fonts.load('800 100px Montserrat').then(() => document.fonts.load('700 50px Cairo')).finally(() => {
  setLang(lang);
  if (PIN !== null) document.body.classList.add('pinned');
  frame();
});
initMenu();

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildPhotoCards, buildJadeverCards } from './tools.js';
import { buildHome, BUILD_STAGES } from './home-model.js';
import { STR } from './i18n.js';
import { SHOP } from './shop-i18n.js';
import { JOBS } from './shelf-jobs.js';
import catalog from '../data/catalog-sakr.json';
import { mountHeader } from './site-nav.js';
import { mountFooter } from './site-footer.js';
import { setHeroState, registerHeroActions } from './home-bridge.js';
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

// On load a home is built, stage by stage, by the tools. Scrolling moves them onto the shelf, then (on phones) the camera slides right along it:
// TOTAL → Jadever → coming soon → visit.
// The page is two screens: the hero, then the shelf. Scrolling between them moves the tools
// from the dock onto the shelf; on the shelf, nothing depends on scrolling.
const ST = [0, 0.5]; // 0: hero, 1: shelf
const SORT_A = 0.04, SORT_B = 0.8; // scroll range of the move to the shelf
const DWELL = 4.2; // seconds the tour rests on each stage once the home is built
const BLUEPRINT = 1.3; // seconds the outline takes to draw itself
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
sun.shadow.radius = 6; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
scene.add(sun);

const FLOOR = -1.9;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true;
scene.add(floor);

// ---------- shelf: one lit display bay per brand ----------
const BAY_W = 2.1, BAY_H = 2.5, BAY_D = 0.9, SHELF_Z = -0.6;
const BOARDS = [0.04, 0.84, 1.64]; // heights above the bay's floor
const shelf = new THREE.Group(); scene.add(shelf);
const white = new THREE.MeshPhysicalMaterial({ color: 0xf7f7f7, roughness: 0.35, clearcoat: 0.8 });
// The shelf in the house's materials: charcoal fluted panels, walnut shelves, bronze lips.
const texOf = (w, h, draw, repeat) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
const rand = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const steel = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.15, map: texOf(256, 64, (g, w, h) => {
  for (let x = 0; x < w; x += 32) {
    const r = g.createLinearGradient(x, 0, x + 32, 0);
    r.addColorStop(0, '#1c1e21'); r.addColorStop(0.18, '#3a3e44'); r.addColorStop(0.5, '#4c5158'); r.addColorStop(0.82, '#33363b'); r.addColorStop(1, '#17191c');
    g.fillStyle = r; g.fillRect(x, 0, 32, h);
  }
}, [1.4, 1]) });
// Smooth satin charcoal for the top rail and the base, where ribs would not belong.
const satin = new THREE.MeshPhysicalMaterial({ color: 0x2a2d32, roughness: 0.32, metalness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25 });
const board = new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.35, map: texOf(512, 128, (g, w, h) => {
  g.fillStyle = '#6b462b'; g.fillRect(0, 0, w, h);
  const rnd = rand(31);
  for (let i = 0; i < 80; i++) {
    const y = rnd() * h;
    g.strokeStyle = `rgba(${rnd() > 0.5 ? '40,24,12' : '160,112,72'},${0.12 + rnd() * 0.25})`; g.lineWidth = 0.6 + rnd() * 2;
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 2.5); g.stroke();
  }
}) });
const brushed = new THREE.MeshPhysicalMaterial({ color: 0xb48a56, roughness: 0.28, metalness: 0.9, clearcoat: 0.4 });
const recess = new THREE.MeshBasicMaterial({ color: 0x4a4e55 });
const BAYS = [
  { brand: 'total', glow: '14,138,151', soft: '#eef8f9' },
  { brand: 'jadever', glow: '45,148,71', soft: '#f0f7ee' },
  { brand: 'soon', glow: '255,90,31', soft: '#f7f4f1' },
];
// Brands announced on the coming-soon bay, one per shelf (top to bottom).
// logo: file in /public/brands (from Wikimedia Commons); aspect = width / height.
const SOON_BRANDS = [
  { name: 'Schneider Electric', logo: '/brands/schneider.svg', aspect: 956.7 / 436.2 },
  { name: 'ABB', logo: '/brands/abb.svg', aspect: 88.2 / 35 },
  { name: 'Parkside' },
];
const canvasTex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
// The back of a bay: warm limestone slabs, with soft veining and fine joints between them.
function backTexture() {
  const W = 512, H = 640, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), rnd = rand(13);
  g.fillStyle = '#e7ddcc'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 18000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,250,240' : '150,128,98'},${rnd() * 0.07})`; g.fillRect(rnd() * W, rnd() * H, 2, 2); }
  // Veins drifting diagonally across the stone.
  for (let v = 0; v < 9; v++) {
    g.strokeStyle = `rgba(160,138,108,${0.12 + rnd() * 0.16})`; g.lineWidth = 0.8 + rnd() * 1.6;
    let x = rnd() * W, y = 0; g.beginPath(); g.moveTo(x, y);
    while (y < H) { x += (rnd() - 0.35) * 26; y += 18 + rnd() * 20; g.lineTo(x, y); }
    g.stroke();
  }
  // Slab joints: one per compartment height, plus a vertical joint in the middle.
  g.strokeStyle = 'rgba(120,100,76,.35)'; g.lineWidth = 2.5;
  for (const y of [H / 3, (2 * H) / 3]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
  // Light falling from each compartment's downlight.
  for (let k = 0; k < 3; k++) {
    const top = k * (H / 3), r = g.createLinearGradient(0, top, 0, top + H / 3);
    r.addColorStop(0, 'rgba(255,246,228,.5)'); r.addColorStop(0.6, 'rgba(255,255,255,0)'); r.addColorStop(1, 'rgba(90,70,50,.12)');
    g.fillStyle = r; g.fillRect(0, top, W, H / 3);
  }
  return canvasTex(cv);
}
// Warm light spilling onto a shelf from the LED strip above it.
const spillTex = (() => {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d'), r = g.createLinearGradient(0, 128, 0, 0);
  r.addColorStop(0, 'rgba(255,214,160,.85)'); r.addColorStop(1, 'rgba(255,214,160,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 128);
  const fade = g.createLinearGradient(0, 0, 256, 0);
  fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.12, 'rgba(0,0,0,0)'); fade.addColorStop(0.88, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(0, 0, 256, 128);
  return canvasTex(cv);
})();
// A coming-soon brand on a clean white display card, in its own colours, with a small badge.
function plaqueTexture({ name, logo, aspect }) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 300;
  const g = cv.getContext('2d');
  const card = () => {
    g.clearRect(0, 0, 1024, 300);
    g.save(); g.shadowColor = 'rgba(20,22,26,.18)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(14, 10, 996, 270, 30); g.fill(); g.restore();
    g.fillStyle = '#fff1ea'; g.beginPath(); g.roundRect(782, 30, 200, 52, 26); g.fill();
    g.fillStyle = '#e2480f'; g.font = '700 30px Montserrat, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SOON', 882, 57);
  };
  card();
  if (!logo) { g.fillStyle = '#2b2e33'; g.font = '800 120px Montserrat, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 470, 160); }
  const t = canvasTex(cv);
  if (logo) {
    const img = new Image();
    img.onload = () => {
      let w = 560, h = w / aspect; if (h > 170) { h = 170; w = h * aspect; }
      card(); g.drawImage(img, 470 - w / 2, 160 - h / 2, w, h); t.needsUpdate = true;
    };
    img.src = logo;
  }
  return t;
}
// The light a small downlight casts onto the back of a compartment: bright under the lamp,
// spreading and fading towards the shelf.
const coneTex = (() => {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const g = cv.getContext('2d');
  g.translate(128, 0); g.scale(1.6, 1);
  const r = g.createRadialGradient(0, 0, 0, 0, 0, 230);
  r.addColorStop(0, 'rgba(255,236,205,.9)'); r.addColorStop(0.3, 'rgba(255,232,200,.35)'); r.addColorStop(1, 'rgba(255,240,220,0)');
  g.fillStyle = r; g.fillRect(-128, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const bayGroups = [], bayFx = [];
BAYS.forEach((b) => {
  const bg = new THREE.Group(), soon = b.brand === 'soon';
  const backMat = new THREE.MeshBasicMaterial({ map: backTexture(), toneMapped: false });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W - 0.06, BAY_H), backMat);
  back.position.set(0, BAY_H / 2, -BAY_D / 2); bg.add(back);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xff5a1f, transparent: true, fog: false });
  const part = (geo, x, y, mat, z = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; bg.add(m);
  };
  for (const y of BOARDS) part(new RoundedBoxGeometry(BAY_W - 0.1, 0.05, BAY_D, 2, 0.015), 0, y, board);
  // A thin aluminium frame: slim uprights, a top rail and a low base.
  for (const x of [-BAY_W / 2, BAY_W / 2]) part(new RoundedBoxGeometry(0.06, BAY_H + 0.1, BAY_D, 2, 0.012), x, (BAY_H + 0.1) / 2 - 0.04, steel);
  part(new RoundedBoxGeometry(BAY_W + 0.06, 0.07, BAY_D + 0.02, 3, 0.02), 0, BAY_H + 0.045, satin);
  part(new RoundedBoxGeometry(BAY_W + 0.06, 0.07, BAY_D + 0.02, 3, 0.02), 0, -0.045, satin);
  // Brushed bronze trim: along the base, and down the front edge of each side panel.
  part(new THREE.BoxGeometry(BAY_W + 0.04, 0.008, 0.004), 0, -0.02, brushed, (BAY_D + 0.02) / 2 + 0.002);
  for (const x of [-BAY_W / 2, BAY_W / 2]) part(new THREE.BoxGeometry(0.012, BAY_H + 0.02, 0.004), x, BAY_H / 2, brushed, BAY_D / 2 + 0.002);
  // A shadowed toe-kick under the base, so the fixture stands rather than floats.
  { const kick = new THREE.Mesh(new THREE.BoxGeometry(BAY_W - 0.04, 0.06, BAY_D - 0.12), recess); kick.position.set(0, -0.095, -0.03); bg.add(kick); }
  // A brushed aluminium lip along the front of each shelf.
  for (const y of BOARDS) part(new RoundedBoxGeometry(BAY_W - 0.08, 0.05, 0.018, 2, 0.006), 0, y, brushed, BAY_D / 2 + 0.004);
  // A small recessed downlight at the top of each compartment, and its cone of light.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6e6, toneMapped: false });
  const coneMat = new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.5 });
  [BOARDS[1], BOARDS[2], BAY_H + 0.015].forEach((ceil, k) => {
    const floorY = BOARDS[k], h = ceil - floorY - 0.04;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 20), lampMat);
    lamp.position.set(0, ceil - 0.025, 0.05); bg.add(lamp);
    const cone = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W - 0.2, h), coneMat);
    cone.position.set(0, floorY + 0.02 + h / 2, -BAY_D / 2 + 0.012); cone.renderOrder = 1; bg.add(cone);
  });
  // The brand's colour as one thin line along the top of the bay.
  { const accent = new THREE.Mesh(new THREE.BoxGeometry(BAY_W - 0.16, 0.016, 0.004), new THREE.MeshBasicMaterial({ color: { total: 0x0b7480, jadever: 0x1f7a37, soon: 0xff5a1f }[b.brand], toneMapped: false })); accent.position.set(0, BAY_H + 0.045, (BAY_D + 0.02) / 2 + 0.003); bg.add(accent); }
  // A warm LED strip under the front of each shelf, with its light spilling onto the shelf below.
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xfff0d8, transparent: true, toneMapped: false });
  const spillMat = new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  if (soon) SOON_BRANDS.forEach((brand, k) => {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.475), new THREE.MeshBasicMaterial({ transparent: true, map: plaqueTexture(brand), toneMapped: false }));
    plaque.position.set(0, BOARDS[2 - k] + 0.37, -BAY_D / 2 + 0.02); bg.add(plaque);
  });
  shelf.add(bg); bayGroups.push(bg);
  bayFx.push({ backMat, ledMat, spillMat, lineMat, lit: 0.5, cones: bg.children.filter(o => o.material?.map === coneTex).map(o => o.material) });
});
const bayX = i => (i - (BAYS.length - 1) / 2) * BAY_W;
function layoutShelf() { bayGroups.forEach((g, i) => g.position.set(bayX(i), FLOOR, SHELF_Z)); }

// The bays' names, as page text above the shelf (sharp in every language), placed each frame.
const BRAND_COUNT = catalog.reduce((n, p) => ({ ...n, [p.brand]: (n[p.brand] || 0) + 1 }), {});
const bayLabelsEl = document.createElement('div');
bayLabelsEl.className = 'bay-labels';
document.body.appendChild(bayLabelsEl);
function drawBayLabels() {
  bayLabelsEl.innerHTML = BAYS.map(b => b.brand === 'soon'
    ? `<div class="bay-label soon"><b>${STR[lang].soon}</b><small dir="ltr">Schneider · ABB · Parkside</small></div>`
    : `<a class="bay-label ${b.brand}" href="${shopUrl(b.brand)}"><b dir="ltr">${b.brand === 'total' ? 'TOTAL' : 'Jadever'}</b><small>${SHOP[lang].count(BRAND_COUNT[b.brand] || 0)}</small></a>`).join('');
}

// ---------- tools ----------
// TOTAL and Jadever, mixed so both share the scene.
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const totals = buildPhotoCards(maxAniso);
const jadevers = buildJadeverCards(maxAniso);
const tools = [];
for (let k = 0; k < Math.max(totals.length, jadevers.length); k++) { if (totals[k]) tools.push(totals[k]); if (jadevers[k]) tools.push(jadevers[k]); }
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const slotCount = { total: 0, jadever: 0 };
const TOOL_BAY = 0.6; // tool size on the shelf
tools.forEach((t, i) => {
  scene.add(t);
  const brand = t.userData.brand, n = slotCount[brand]++;
  const col = n % 3, row = Math.floor(n / 3);
  t.userData.p = {
    i, h: 0, dim: 0,
    inRot: new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 2, (rnd() - 0.5) * 1.2)),
    bay: brand === 'total' ? 0 : 1, row, col,
    slot: new THREE.Vector3((col - 1) * 0.66, BOARDS[row] + 0.03 + (TOOL_BAY * t.userData.aspectH) / 2 + 0.01, 0.05),
    bayRot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (col - 1) * 0.1, 0)),
    delay: (i % 7) * 0.008, ph: rnd() * 6, lag: (i % 7) * 0.05,
  };
});

// ---------- the home and its stages ----------
const home = buildHome();
home.group.rotation.y = -0.5;
scene.add(home.group);
const HOME_CY = FLOOR + 1.35; // where the camera looks while the home is on stage
const stageOf = id => BUILD_STAGES.findIndex(s => s.tools.includes(id));
tools.forEach((t) => { t.userData.p.stage = stageOf(t.userData.id); });

// Desktop: the tools stand in a glass dock in front of the home, in the order of the build,
// with a little space between the stages. They leave the dock to work on the home, and
// leave it in the same order for the shelf.
const DOCK = BUILD_STAGES.flatMap(st => st.tools), DOCK_GAP = 0.29, STAGE_GAP = 0.1;
const dockX = k => (k - (DOCK.length - 1) / 2) * DOCK_GAP + (stageOf(DOCK[k]) - (BUILD_STAGES.length - 1) / 2) * STAGE_GAP;
const DOCK_Y = FLOOR + 0.02, DOCK_Z = 3.25, DOCK_SHIFT = 0.75; // shifted away from the text // DOCK_Z: in front of the site's front edge
// The dock runs parallel to the site's front edge: a point along it, in world space.
function dockPoint(dx, dz, out) {
  const a = home.group.rotation.y, side = document.documentElement.dir === 'rtl' ? -1 : 1, x = dx * side;
  return out.set(homeAt.x + x * Math.cos(a) + dz * Math.sin(a), 0, -x * Math.sin(a) + dz * Math.cos(a));
}
tools.forEach((t) => { t.userData.p.dock = DOCK.indexOf(t.userData.id); t.userData.p.delay = t.userData.p.dock * 0.0045; });
const dockMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, transparent: true, opacity: 0.82, clearcoat: 1, envMapIntensity: 1.2 });
const dockWidth = dockX(DOCK.length - 1) - dockX(0) + 0.62;
const dock = new THREE.Mesh(new RoundedBoxGeometry(dockWidth, 0.06, 0.5, 4, 0.03), dockMat);
dock.receiveShadow = true; scene.add(dock);
// A soft dark edge under the glass, so it reads against the light backdrop.
const dockEdgeMat = new THREE.MeshBasicMaterial({ color: 0x15171a, transparent: true, opacity: 0.1, depthWrite: false });
const dockEdge = new THREE.Mesh(new RoundedBoxGeometry(dockWidth + 0.04, 0.05, 0.54, 4, 0.03), dockEdgeMat);
scene.add(dockEdge);
// A glowing pill under the stage in the spotlight, gliding along the dock.
const pillMat = new THREE.MeshBasicMaterial({ color: 0xff7a3d, transparent: true, opacity: 0.85, fog: false, toneMapped: false });
const pill = new THREE.Mesh(new RoundedBoxGeometry(1, 0.012, 0.06, 2, 0.006), pillMat);
scene.add(pill);
const pillAt = { x: 0, w: 1 };
// The exact spot on the home each tool works on, in the home's own coordinates.
const WORK_SPOT = {
  breaker: [-2.25, 0.08, 1.4], JDWB1F01: [-0.65, 0.08, 1.6],
  hammer: [-2.1, 0.7, 1.25], impactDrill: [-1.1, 1.75, 1],
  grinder: [0.2, 2.23, 1.2], JDWH2501: [2.72, 1.03, 1.3], impactWrench: [2.18, 0.65, 1.38],
  drill: [-0.1, 0.55, 1.26], JDCV4401: [-0.85, 1.75, 1.1], JDSS1302: [0.95, 0.55, 1.26], JDFA55350: [0.85, 1.7, 1.02], JDRYP1504: [1.9, 1.7, 0.3], JDGA4611: [1.3, 0.5, 0.55],
  JDLYP546: [-3.3, 0.24, 0.8], blower: [0.8, 0.02, 1.85],
  battery: [-0.1, 0.22, 1.72], charger: [-0.1, 0.22, 2.1],
};
const parkV = new THREE.Vector3(), homeAt = new THREE.Vector3();
let homeScale = 1;
function layoutHome() {
  homeScale = tall ? 0.54 : 0.9;
  home.group.scale.setScalar(homeScale);
  homeAt.set(tall ? 0 : 0.3, FLOOR + 0.6 + (tall ? 1.55 : 0), 0); // above the floor, so the cut ground below shows
  home.group.position.copy(homeAt);
  home.group.updateMatrixWorld(true);
  for (const t of tools) t.userData.p.spot = home.group.localToWorld(new THREE.Vector3().fromArray(WORK_SPOT[t.userData.id]));
}
function parkPos(t, out) {
  const P = t.userData.p;
  if (!tall) {
    dockPoint(dockX(P.dock) + DOCK_SHIFT, DOCK_Z, out);
    return out.setY(DOCK_Y + 0.05 + 0.2 * t.userData.aspectH);
  }
  // Phones: only the current stage's tools show, in a row above the home.
  const list = BUILD_STAGES[P.stage].tools, n = list.length, k = list.indexOf(t.userData.id);
  const perRow = 3, row = Math.floor(k / perRow), inRow = Math.min(perRow, n - row * perRow);
  return out.set((k % perRow - (inRow - 1) / 2) * 0.86, FLOOR + 4.3 - row * 0.72, 0.2);
}

// The build's clock, and which stage is in the spotlight. While the home goes up the stage
// follows the build; afterwards a tour moves through the stages, unless the visitor is
// looking at something (a tool, a part of the home, or the card).
const stageTimes = []; { let at = BLUEPRINT; for (const s of BUILD_STAGES) { stageTimes.push([at, at + s.seconds]); at += s.seconds; } }
const BUILD_END = stageTimes[stageTimes.length - 1][1];
const done = BUILD_STAGES.map(() => 0);
let buildT = REDUCED || PIN !== null ? BUILD_END : 0, buildStarted = false;
let hoverDock = -1, hoverDockAt = 0, hoverAmt = 0, flyLeft = 0, flyTool = null, hoverTool = null, tourStage = 0, hoverStage = -1, chosen = false, focus = null, paused = false, dwellLeft = DWELL, spotShown = true, published = null;
const building = () => buildT < BUILD_END;
const shownStage = () => (hoverStage >= 0 ? hoverStage : tourStage);
function publishStage() {
  const i = shownStage(), run = building() && hoverStage < 0 && !chosen;
  const key = `${i}:${run}`;
  if (key === published) return;
  published = key;
  setHeroState({ build: {
    stage: i, total: BUILD_STAGES.length, key: BUILD_STAGES[i].key, seconds: run ? BUILD_STAGES[i].seconds : DWELL,
    tools: BUILD_STAGES[i].tools.map((id) => { const { brand, name, shop } = tools.find(t => t.userData.id === id).userData; return { id, brand, name, shop }; }),
  } });
}
function goStage(i) {
  chosen = true; buildT = BUILD_END; // choosing a stage finishes the home straight away
  tourStage = (i + BUILD_STAGES.length) % BUILD_STAGES.length;
  dwellLeft = DWELL; published = null;
  publishStage();
}
registerHeroActions({
  go: goStage,
  step(d) { goStage(shownStage() + d); },
  pause(on) { paused = on; },
  // Hovering a partner's name brings its tools forward and sends the others back.
  focus(brand) { focus = brand; },
  tool(id) { hoverTool = id; hoverDock = id ? tools.find(t => t.userData.id === id).userData.p.dock : -1; },
});

// Studio pieces around the home: a halo behind it, a soft pool of shadow under it, and two rim lights.
function radialTexture(stops) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d'), grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  stops.forEach(([at, color]) => grad.addColorStop(at, color));
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const softMat = map => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, toneMapped: false });
const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softMat(radialTexture([[0, 'rgba(255,255,255,.95)'], [0.34, 'rgba(255,240,228,.62)'], [0.62, 'rgba(255,170,120,.16)'], [1, 'rgba(255,150,90,0)']])));
halo.renderOrder = -2; scene.add(halo);
const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), softMat(radialTexture([[0, 'rgba(20,22,26,.3)'], [0.5, 'rgba(20,22,26,.14)'], [0.78, 'rgba(255,110,50,.05)'], [1, 'rgba(255,110,50,0)']])));
pool.rotation.x = -Math.PI / 2; pool.renderOrder = -1; scene.add(pool);
const rimWarm = new THREE.DirectionalLight(0xffa566, 1.3); rimWarm.position.set(-6, 3, -4); scene.add(rimWarm);
const rimCool = new THREE.DirectionalLight(0xc4ecff, 0.9); rimCool.position.set(6, 2.5, -3); scene.add(rimCool);

// Callouts, like the notes on an architect's drawing: a thin line draws from each tool in the
// spotlight to what it built, with a dot on the spot and a pulse of light travelling along it.
const CALLOUT_POINTS = 18;
const calloutMat = new THREE.LineBasicMaterial({ color: 0xff5a1f, transparent: true, depthTest: false, fog: false, toneMapped: false });
const dotMat = new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, depthTest: false, fog: false, toneMapped: false });
const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffc9a8, transparent: true, depthTest: false, fog: false, toneMapped: false });
const dotGeo = new THREE.SphereGeometry(1, 16, 12);
for (const t of tools) {
  const positions = new Float32Array(CALLOUT_POINTS * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(geo, calloutMat), dot = new THREE.Mesh(dotGeo, dotMat), pulse = new THREE.Mesh(dotGeo, pulseMat);
  line.frustumCulled = false; line.renderOrder = dot.renderOrder = pulse.renderOrder = 6;
  line.visible = dot.visible = pulse.visible = false;
  scene.add(line, dot, pulse);
  t.userData.p.callout = { line, dot, pulse, positions, drawn: 0 };
}
const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()), curveAt = new THREE.Vector3();
function updateCallout(t, show, dt, time, on) {
  const P = t.userData.p, c = P.callout;
  c.drawn += ((show ? 1 : 0) - c.drawn) * (1 - Math.exp(-dt * (show ? 2.6 : 8)));
  const visible = c.drawn > 0.01 && on > 0.3;
  c.line.visible = c.dot.visible = c.pulse.visible = visible;
  if (!visible) return;
  // From just off the tool, in an arc, to the spot on the home.
  curve.v0.copy(t.position).lerp(P.spot, 0.12);
  curve.v2.copy(P.spot);
  curve.v1.copy(curve.v0).lerp(curve.v2, 0.5); curve.v1.y += 0.55;
  for (let i = 0; i < CALLOUT_POINTS; i++) { curve.getPoint(i / (CALLOUT_POINTS - 1), curveAt); c.positions.set([curveAt.x, curveAt.y, curveAt.z], i * 3); }
  c.line.geometry.attributes.position.needsUpdate = true;
  c.line.geometry.setDrawRange(0, Math.max(2, Math.round(CALLOUT_POINTS * c.drawn)));
  const near = c.drawn > 0.9 ? 1 : 0, breathe = 1 + (REDUCED ? 0 : Math.sin(time * 3 + P.ph) * 0.2);
  c.dot.position.copy(curve.v2); c.dot.scale.setScalar(0.042 * homeScale * near * breathe + 0.0001);
  curve.getPoint(REDUCED ? 0.5 : (time * 0.55 + P.ph) % 1, c.pulse.position);
  c.pulse.scale.setScalar(0.024 * c.drawn);
}

// Sparks where the tools are working.
const SPARKS = 56, sparkPos = new Float32Array(SPARKS * 3), sparkVel = new Float32Array(SPARKS * 3), sparkLife = new Float32Array(SPARKS);
const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xff7a33, size: 0.05, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
sparks.frustumCulled = false; sparks.visible = false; scene.add(sparks);
let sparkNext = 0, sparkDebt = 0;
function updateSparks(dt, at) {
  sparkDebt += at ? dt * 46 : 0;
  while (sparkDebt > 1) {
    sparkDebt--;
    const i = sparkNext++ % SPARKS;
    sparkPos.set([at.x, at.y, at.z], i * 3);
    sparkVel.set([(Math.random() - 0.5) * 2.4, 0.5 + Math.random() * 1.7, (Math.random() - 0.5) * 2.4], i * 3);
    sparkLife[i] = 0.35 + Math.random() * 0.4;
  }
  let alive = false;
  for (let i = 0; i < SPARKS; i++) {
    if (sparkLife[i] <= 0) { sparkPos[i * 3 + 1] = -99; continue; }
    alive = true; sparkLife[i] -= dt; sparkVel[i * 3 + 1] -= 4.2 * dt;
    for (let a = 0; a < 3; a++) sparkPos[i * 3 + a] += sparkVel[i * 3 + a] * dt;
  }
  sparks.visible = alive;
  sparkGeo.attributes.position.needsUpdate = true;
}

// ---------- layout & camera ----------
let W = 1, Hgt = 1, tall = false, short = false;
const panel = document.getElementById('panel');
function measurePanel() {
  // Phones: the text area is as tall as the taller of the hero's words and the shelf's controls.
  if (!tall) { document.documentElement.style.removeProperty('--ph'); return; }
  const max = Math.max(document.getElementById('heroCopy')?.offsetHeight || 0, document.getElementById('shelfPanel')?.offsetHeight || 0);
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
  // Wide screens: the picture's centre moves away from the text (to the left in Arabic).
  const side = document.documentElement.dir === 'rtl' ? 1 : -1;
  if (!tall) camera.setViewOffset(W, Hgt, side * W * (short ? 0.21 : 0.18), 0, W, Hgt); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  layoutShelf();
  layoutHome();
  placeSpotAnchor();
}
// Tells the page where the home is on screen, so the card can sit beside it.
const anchor = new THREE.Vector3();
function placeSpotAnchor() {
  placeCamera(0, 0);
  camera.updateMatrixWorld();
  const r = stage.getBoundingClientRect(), root = document.documentElement.style;
  const toX = v => ((v.x + 1) / 2) * r.width + r.left, toY = v => ((1 - v.y) / 2) * r.height + r.top;
  anchor.copy(homeAt).setY(FLOOR + 1.1).project(camera);
  const x = toX(anchor), y = toY(anchor);
  anchor.copy(homeAt).setY(FLOOR + 1.1).setX(homeAt.x + 3 * homeScale).project(camera);
  root.setProperty('--spot-x', `${Math.round(x)}px`);
  root.setProperty('--spot-y', `${Math.round(y)}px`);
  root.setProperty('--spot-r', `${Math.round(Math.abs(toX(anchor) - x))}px`);
}
addEventListener('resize', resize);

function fitDist(halfW, halfH) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const usable = tall ? 1 : short ? 0.55 : 0.62;
  return Math.max(halfH / t, halfW / (t * camera.aspect * usable)) * 1.03;
}
const look = new THREE.Vector3();
let shelfFocusX = 0, shelfZoom = 0;
function placeCamera(p, time) {
  const toShelf = easeIO(range(p, SORT_A, SORT_B));
  const d1 = tall ? fitDist(1.75, 3.2) : fitDist(4.35, 2.95);
  const shelfH = BAY_H + 0.7, shCy = FLOOR + shelfH / 2; // includes the names above the bays
  let sx = 0, d2;
  // Phones: the whole wall, or the chosen bay close up.
  if (tall) { sx = shelfFocusX * shelfZoom; d2 = fitDist(BAY_W * lerp(1.62, 0.62, shelfZoom), shelfH / 2 + 0.1); }
  else {
    // The camera moves a little closer while a bay is in focus, and leans slightly towards it,
    // never so far that a bay leaves the screen.
    d2 = fitDist(BAY_W * BAYS.length / 2 + 0.6, shelfH / 2 + 0.25) * (1 - shelfZoom * 0.05);
    sx = shelfFocusX * shelfZoom * 0.06;
  }
  const d = lerp(d1, d2, toShelf);
  // The scene turns slowly and follows the cursor, which gives the orbit its depth.
  const swing = (1 - toShelf) * ((REDUCED ? 0 : Math.sin(time * 0.18) * 0.05) + tilt.x * 0.11);
  const ly = lerp(tall ? FLOOR + 2.55 : HOME_CY + 0.42, shCy, toShelf); // room above the roof for the card
  // Whatever is pushed back fades into the backdrop.
  scene.fog.near = lerp(d + 5, 34, toShelf);
  scene.fog.far = lerp(d + 16, 60, toShelf);
  look.set(sx * toShelf, ly, lerp(0, SHELF_Z, toShelf));
  camera.position.set(look.x + Math.sin(swing) * d, ly + lerp(tall ? 2.1 : 2.5, 0.5, toShelf) - (1 - toShelf) * tilt.y * 0.35, Math.cos(swing) * d + look.z);
  camera.lookAt(look);
}

// ---------- animate ----------
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), spinQ = new THREE.Quaternion(), eul = new THREE.Euler();
let pSmooth = PIN ?? 0;
function progress() {
  if (PIN !== null) return PIN;
  // Only the scroller drives the scene; the footer below it scrolls normally.
  const max = document.querySelector('.scroller').offsetHeight - innerHeight;
  return max > 0 ? clamp(scrollY / max) : 0;
}

const target = new THREE.Vector3(), flTmp = new THREE.Vector3(), workAt = new THREE.Vector3();
function update(p, time, dt) {
  const shelfIn = easeOut(range(p, SORT_A, SORT_B - 0.04));
  const jobTools = shelfSel.job ? JOBS.find(j => j.key === shelfSel.job).tools : null;
  shelf.position.z = lerp(-16, 0, shelfIn);
  shelf.visible = shelfIn > 0.001;
  // The bay the text is about lights up, the others dim, and the camera leans towards it.
  const focusBay = shelfSel.job ? -1 : shelfSel.bay, bayEase = 1 - Math.exp(-dt * 3);
  bayFx.forEach((fx, i) => {
    fx.lit += ((shelfSel.job ? 0.4 : focusBay < 0 ? 0.62 : focusBay === i ? 1 : 0.22) - fx.lit) * bayEase;
    fx.backMat.color.setScalar(lerp(0.9, 1, fx.lit));
    fx.ledMat.opacity = lerp(0.3, 1, fx.lit);
    fx.spillMat.opacity = lerp(0.08, 0.75, fx.lit);
    fx.lineMat.opacity = lerp(0.35, 1, fx.lit);
    if (fx.cones[0]) fx.cones[0].opacity = lerp(0.1, 0.38, fx.lit);
  });
  if (focusBay >= 0) shelfFocusX += (bayX(focusBay) - shelfFocusX) * bayEase;
  shelfZoom += ((focusBay >= 0 ? 1 : 0) - shelfZoom) * bayEase;
  placeBayLabels(shelfIn, focusBay);
  const glide = 1 - Math.exp(-dt * 3.6);

  // The build: the outline draws itself, then each stage goes up in turn.
  if (buildStarted && building()) buildT = Math.min(BUILD_END, buildT + dt);
  stageTimes.forEach(([a, b], i) => { done[i] = clamp((buildT - a) / (b - a)); });
  if (building()) { const k = stageTimes.findIndex(([, b]) => buildT < b); if (k >= 0 && !chosen) tourStage = k; }
  const working = building() && buildT > BLUEPRINT ? tourStage : -1;
  const spot = shownStage();
  // A stage's tools fly out together, each to its own spot on the home; the sparks move
  // between them.
  const crew = working >= 0 ? BUILD_STAGES[working].tools : [];
  const worker = crew.length ? crew[Math.floor(time * 2.5) % crew.length] : null;
  let sparkAt = null;
  const on = (1 - easeIO(range(p, SORT_A * 0.5, SORT_B * 0.62))) * (buildStarted ? 1 : 0);

  // The dock's magnification glides after the pointer instead of jumping from tool to tool.
  const ease = 1 - Math.exp(-dt * 12);
  hoverAmt += ((hoverDock >= 0 ? 1 : 0) - hoverAmt) * (1 - Math.exp(-dt * 8));
  if (hoverDock >= 0) hoverDockAt += (hoverDock - hoverDockAt) * ease;
  for (const t of tools) {
    const P = t.userData.p, brand = t.userData.brand, inStage = P.stage === spot;
    // A tool arrives when its stage begins, and on phones only the current stage's tools stay.
    const arrived = buildT >= stageTimes[P.stage][0] - 0.25;
    P.inn = (P.inn || 0) + ((arrived && (!tall || inStage) ? 1 : 0) - (P.inn || 0)) * glide;
    P.h += ((focus ? brand === focus : inStage) - P.h) * glide;
    P.dim += ((focus ? brand !== focus : false) - P.dim) * glide;
    const inn = easeOut(clamp(P.inn)), sort = easeIO(range(p, SORT_A + P.delay, SORT_B - 0.03 + P.delay));
    parkPos(t, flTmp);
    // In the dock the tools of the stage in the spotlight stand taller, and the pointer
    // magnifies the tool under it and, a little, its neighbours.
    const front = easeIO(clamp(P.h));
    P.pick = !tall ? hoverAmt * Math.exp(-((P.dock - hoverDockAt) ** 2) / 1.8) : 0;
    if (tall) flTmp.z += front * 0.2;
    else { flTmp.z += front * 0.08; flTmp.y += front * 0.06 + P.pick * 0.22; }
    // Its turn, or a click: it flies to its spot on the home and shakes as it works.
    const busy = crew.includes(t.userData.id) || (flyLeft > 0 && flyTool === t.userData.id);
    P.work = (P.work || 0) + ((busy ? 1 : 0) - (P.work || 0)) * (1 - Math.exp(-dt * 3.2));
    if (worker === t.userData.id || (busy && !crew.length)) sparkAt = P.spot;
    workAt.copy(P.spot); workAt.y += 0.28 * homeScale + 0.1; workAt.z += 0.4;
    flTmp.lerp(workAt, easeIO(clamp(P.work)) * 0.86);
    if (!REDUCED) {
      flTmp.y += Math.sin(time * 0.8 + P.ph) * 0.04 * (1 - P.work);
      flTmp.x += Math.sin(time * 46 + P.ph) * 0.016 * P.work;
      flTmp.y += Math.abs(Math.sin(time * 18 + P.ph)) * 0.035 * P.work;
    }
    flTmp.z -= P.dim * 3.2;
    tmpV.set(flTmp.x * 0.3, flTmp.y + 1.5, -18).lerp(flTmp, inn);
    target.copy(P.slot).add(bayGroups[P.bay].position).add(shelf.position);
    tmpV.lerp(target, sort);
    tmpV.y += Math.sin(sort * Math.PI) * 0.7;
    // On the shelf, the tool under the pointer lifts off towards the viewer.
    P.lift = (P.lift || 0) + ((shelfHover === t ? 1 : 0) - (P.lift || 0)) * (1 - Math.exp(-dt * 9));
    // A job lights its tools and steps them forward; the rest of the shelf goes dark.
    const inKit = jobTools ? jobTools.includes(t.userData.id) : null;
    P.kit = (P.kit || 0) + ((inKit === true ? 1 : 0) - (P.kit || 0)) * (1 - Math.exp(-dt * 5));
    P.shade = (P.shade || 0) + ((inKit === false ? 1 : 0) - (P.shade || 0)) * (1 - Math.exp(-dt * 5));
    shadeTool(t, P.shade * sort);
    tmpV.z += (P.lift * 0.3 + P.kit * 0.3) * sort; tmpV.y += (P.lift * 0.14 + P.kit * 0.04) * sort;
    P.shadow.scale.setScalar(1 + P.lift * 0.35);
    t.position.copy(tmpV);
    const sway = REDUCED ? 0 : Math.sin(time * 0.5 + P.ph) * lerp(0.2, 0.32, front);
    // Every tool turns a little towards the home.
    const lean = tall ? 0 : -flTmp.x * 0.05 * P.work;
    eul.set(-0.12 * (1 - sort) + tilt.y * 0.12, lean + tilt.x * lerp(0.15, 0.3, front) + sway * (tall ? 1 : 0.5), 0);
    spinQ.setFromEuler(eul);
    tmpQ.copy(P.inRot).slerp(spinQ, inn).slerp(P.bayRot, sort);
    t.quaternion.copy(tmpQ);
    // Slim tools are drawn a little larger and bulky ones a little smaller, so they weigh the
    // same by eye. The row in front of the home is nearer the camera, so it is drawn smaller.
    const weight = lerp(1.14, 0.92, t.userData.fill);
    const size = (tall ? lerp(0.74, 0.84, front) : lerp(0.4, 0.5, front) * (1 + P.pick * 0.6) * (1 + P.work * 1.2)) * weight * lerp(1, 0.75, P.dim);
    t.scale.setScalar(lerp(lerp(0.25, size, inn), TOOL_BAY * 1.08, sort) * (1 + (P.lift * 0.22 + P.kit * 0.16) * sort));
    updateCallout(t, inStage && !focus && on > 0.5 && inn > 0.7 && done[P.stage] > 0.25 && (!building() || P.work < 0.4), dt, time, on);
  }
  calloutMat.opacity = 0.75 * on; dotMat.opacity = on; pulseMat.opacity = on;
  if (flyLeft > 0) flyLeft -= dt;
  // The dock: it shrinks and fades as the tools leave it for the shelf.
  dock.visible = pill.visible = !tall && on > 0.01;
  dockPoint(DOCK_SHIFT, DOCK_Z, dock.position).setY(DOCK_Y); dock.rotation.y = home.group.rotation.y; dock.scale.set(lerp(0.6, 1, on), 1, 1);
  dockMat.opacity = 0.55 * on;
  const group = BUILD_STAGES[spot].tools.map(id => dockX(DOCK.indexOf(id)));
  const k = 1 - Math.exp(-dt * 8);
  pillAt.x += ((group[0] + group[group.length - 1]) / 2 - pillAt.x) * k;
  pillAt.w += ((group[group.length - 1] - group[0]) + 0.34 - pillAt.w) * k;
  dockPoint(pillAt.x + DOCK_SHIFT, DOCK_Z + 0.22, pill.position).setY(DOCK_Y + 0.035); pill.rotation.y = home.group.rotation.y;
  dockEdge.visible = dock.visible; dockEdge.position.copy(dock.position).setY(DOCK_Y - 0.02); dockEdge.rotation.y = dock.rotation.y; dockEdge.scale.copy(dock.scale); dockEdgeMat.opacity = 0.1 * on; pill.scale.set(pillAt.w * on, 1, 1);
  pillMat.opacity = 0.85 * on;
  placeCamera(p, time);

  // The home and the studio pieces leave as the tools move to the shelf.
  home.group.visible = on > 0.004;
  home.update(done, buildT / BLUEPRINT, on, dt);
  halo.visible = pool.visible = on > 0.004;
  halo.position.set(homeAt.x, homeAt.y + 1.85, -3.4); halo.scale.setScalar((tall ? 8.5 : 13) * homeScale); halo.material.opacity = on; halo.quaternion.copy(camera.quaternion);
  pool.position.set(homeAt.x, FLOOR + 0.012, tall ? 9 : 0); pool.scale.set(11 * homeScale, 7.5 * homeScale, 1); pool.material.opacity = on;
  rimWarm.intensity = 1.3 * on; rimCool.intensity = 0.9 * on;
  floor.material.opacity = lerp(tall ? 0 : 0.05, 0.025, 1 - on); // on phones the home floats above the floor
  placeShelfCard();
  updateSparks(dt, sparkAt && working < 4 && !REDUCED && on > 0.5 ? sparkAt : null);

  // The card leaves as soon as the tools start for the shelf.
  const spotOn = p < SORT_A;
  if (spotOn !== spotShown) { spotShown = spotOn; setHeroState({ spotOn }); }
  // The tour moves on by itself, unless the visitor is looking at something.
  if (!building() && !REDUCED && !paused && hoverStage < 0 && !focus && !document.hidden && spotOn) {
    dwellLeft -= dt;
    if (dwellLeft <= 0) { tourStage = (tourStage + 1) % BUILD_STAGES.length; dwellLeft = DWELL; }
  }
  publishStage();
}

// ---------- UI ----------
let shown = -1;
function stageIndex(p) { let i = 0; ST.forEach((s, k) => { if (p >= s - 0.001) i = k; }); return i; }
const shopUrl = brand => `/shop?brand=${brand}&lang=${lang}`;
function renderPanel(i) {
  shown = i;
  setHeroState({ stage: i });
}
const labelV = new THREE.Vector3();
function placeBayLabels(shelfIn, focusBay) {
  const show = shelfIn > 0.6 && pSmooth > SORT_B - 0.03;
  bayLabelsEl.classList.toggle('on', show);
  if (!show) return;
  const r = stage.getBoundingClientRect();
  [...bayLabelsEl.children].forEach((el, i) => {
    labelV.set(bayX(i), FLOOR + BAY_H + 0.38, SHELF_Z + shelf.position.z).project(camera);
    el.style.transform = `translate(${((labelV.x + 1) / 2) * r.width + r.left}px, ${((1 - labelV.y) / 2) * r.height + r.top}px) translate(-50%, -100%)`;
    el.classList.toggle('focus', focusBay === i);
    el.classList.toggle('dim', focusBay >= 0 && focusBay !== i);
  });
}

// ---------- shelf selection, set by the shelf's tabs and chips (ShelfPanel.tsx) ----------
const shelfSel = { bay: -1, job: null };
// Darkens a tool that is not part of the chosen job (0 = as it is, 1 = dark).
function shadeTool(t, k) {
  if (Math.abs((t.userData.shaded ?? 0) - k) < 0.004) return;
  t.userData.shaded = k;
  t.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      m.userData.base ??= m.color.clone();
      m.color.copy(m.userData.base).multiplyScalar(1 - k * 0.86);
      if (m.emissiveMap) { m.userData.glow ??= m.emissiveIntensity; m.emissiveIntensity = m.userData.glow * (1 - k); }
    }
  });
}

// ---------- shelf product card: hover a tool on the shelf to see it, add it or open it ----------
const PRODUCTS = Object.fromEntries(catalog.map(p => [p.id, p]));
const BY_CODE = Object.fromEntries(catalog.filter(p => p.code).map(p => [p.code, p]));
const shelfCard = document.createElement('div');
shelfCard.className = 'shelf-card';
document.body.appendChild(shelfCard);
let shelfHover = null, cardTool = null, cardHold = false, cardTimer = 0;
const productOf = t => PRODUCTS[t.userData.shop?.open] || BY_CODE[t.userData.code || t.userData.id] || null;
const money = n => n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const orderCount = () => { try { return Object.values(JSON.parse(localStorage.getItem('dar-order') || '{}')).reduce((a, b) => a + b, 0); } catch { return 0; } };
function toolShopUrl(t, product) {
  if (product) return `/shop?brand=all&lang=${lang}&open=${encodeURIComponent(product.id)}`;
  const { q, cat } = t.userData.shop || {};
  const u = new URLSearchParams({ brand: t.userData.brand, lang }); if (q) u.set('q', q); if (cat) u.set('cat', cat);
  return `/shop?${u}`;
}
function showShelfCard(t) {
  clearTimeout(cardTimer);
  shelfHover = t;
  if (cardTool === t) return;
  cardTool = t;
  const sh = SHOP[lang], product = productOf(t), brand = t.userData.brand;
  const name = STR[lang].tools[t.userData.id] || t.userData.name || product?.name;
  shelfCard.innerHTML = `
    <p class="sc-top"><span class="sc-brand ${brand}" dir="ltr">${brand === 'total' ? 'TOTAL' : 'Jadever'}</span>${product?.code ? `<span class="sc-code" dir="ltr">${product.code}</span>` : ''}</p>
    <p class="sc-name">${name}</p>
    ${product ? `<p class="sc-price" dir="ltr">${product.refPriceMax ? `<small>${sh.from}</small> ` : ''}$${money(Number(product.refPrice))}</p>` : `<p class="sc-cat">${sh.cats[t.userData.cat] || ''}</p>`}
    <div class="sc-acts">
      ${product ? `<button type="button" class="sc-add" data-sc-add="${product.id}">${sh.add}</button>` : ''}
      <a class="sc-view" href="${toolShopUrl(t, product)}">${STR[lang].hero.view} <span aria-hidden="true">→</span></a>
    </div>`;
  shelfCard.classList.remove('in'); void shelfCard.offsetWidth; shelfCard.classList.add('in');
}
function hideShelfCard() {
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => { if (cardHold) return; shelfHover = null; cardTool = null; shelfCard.classList.remove('in'); }, 260);
}
const cardV = new THREE.Vector3();
function placeShelfCard() {
  if (!cardTool) return;
  if (pSmooth < SORT_B - 0.03) { shelfHover = null; cardTool = null; shelfCard.classList.remove('in'); return; }
  const r = stage.getBoundingClientRect();
  cardV.copy(cardTool.position).project(camera);
  const x = ((cardV.x + 1) / 2) * r.width + r.left, y = ((1 - cardV.y) / 2) * r.height + r.top;
  const w = shelfCard.offsetWidth, h = shelfCard.offsetHeight, gap = tall ? 0 : 70;
  const left = x + gap + w < innerWidth - 12 ? x + gap : x - gap - w;
  shelfCard.style.transform = `translate(${Math.round(clamp(left, 12, innerWidth - w - 12))}px, ${Math.round(clamp(y - h / 2, 70, innerHeight - h - 12))}px)`;
}
shelfCard.addEventListener('pointerenter', () => { cardHold = true; clearTimeout(cardTimer); });
shelfCard.addEventListener('pointerleave', () => { cardHold = false; hideShelfCard(); });
shelfCard.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-sc-add]');
  if (!btn) return;
  addToOrder([btn.dataset.scAdd]);
  btn.classList.add('done'); btn.textContent = `✓ ${SHOP[lang].added}`;
});

function addToOrder(ids) {
  let order = {}; try { order = JSON.parse(localStorage.getItem('dar-order') || '{}'); } catch {}
  for (const id of ids) order[id] = (order[id] || 0) + 1;
  localStorage.setItem('dar-order', JSON.stringify(order));
  header.setCart(orderCount());
}
registerHeroActions({
  shelf(sel) { Object.assign(shelfSel, sel); },
  addToOrder,
});
// A soft contact shadow under each tool on its shelf.
const toolShadowMat = new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(20,22,26,.38)'], [0.45, 'rgba(20,22,26,.16)'], [1, 'rgba(20,22,26,0)']]), transparent: true, depthWrite: false });
for (const t of tools) {
  const P = t.userData.p, sh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), toolShadowMat);
  sh.rotation.x = -Math.PI / 2; sh.position.set(P.slot.x, BOARDS[P.row] + 0.022, P.slot.z); sh.renderOrder = 1;
  bayGroups[P.bay].add(sh); P.shadow = sh;
}
// A soft contact shadow under the whole wall.
const wallShadow = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W * BAYS.length + 1.4, BAY_D + 1.4), new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(20,22,26,.32)'], [0.55, 'rgba(20,22,26,.14)'], [1, 'rgba(20,22,26,0)']]), transparent: true, depthWrite: false }));
wallShadow.rotation.x = -Math.PI / 2; wallShadow.position.set(0, FLOOR + 0.004, SHELF_Z + 0.1); wallShadow.scale.set(1, 1, 1);
shelf.add(wallShadow);

// The shelf's tools and their products, for the kit card.
setHeroState({ shelfTools: tools.map((t) => { const pr = productOf(t); return { id: t.userData.id, brand: t.userData.brand, name: t.userData.name, product: pr ? { id: pr.id, name: pr.name, price: Number(pr.refPrice) } : null }; }) });

function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  header.setLang(l);
  mountFooter(document.getElementById('siteFoot'), l);
  cardTool = null; shelfCard.classList.remove('in');
  setHeroState({ lang: l });
  drawBayLabels();
  resize();
  renderPanel(stageIndex(pSmooth));
}
const header = mountHeader(document.getElementById('head'), { lang, current: 'home', onLang: setLang });

// Tap or hover a tool to see its name.
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
const on1 = () => pSmooth < SORT_A && buildStarted;
// Where the pointer is along the dock, as a fractional place in it, or -1 when it is not over it.
const slotV = new THREE.Vector3();
function dockPointer(px, py, r) {
  const slots = [];
  for (let k = 0; k < DOCK.length; k++) {
    dockPoint(dockX(k) + DOCK_SHIFT, DOCK_Z, slotV).setY(DOCK_Y + 0.15).project(camera);
    slots.push({ k, x: ((slotV.x + 1) / 2) * r.width, y: ((1 - slotV.y) / 2) * r.height });
  }
  slots.sort((a, b) => a.x - b.x);
  if (px < slots[0].x - 30 || px > slots[slots.length - 1].x + 30) return -1;
  let i = 0; while (i < slots.length - 2 && px > slots[i + 1].x) i++;
  const a = slots[i], b = slots[i + 1], f = clamp((px - a.x) / (b.x - a.x));
  const y = a.y + (b.y - a.y) * f;
  if (py < y - 75 || py > y + 35) return -1;
  return a.k + (b.k - a.k) * f;
}
const tip = document.getElementById('tip');
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(tools, true).find(h => h.object.userData.tool);
  // On the shelf, a tool shows its product card instead of the name tip.
  if (shelf.visible && pSmooth > SORT_B - 0.03) {
    tip.classList.remove('on');
    if (hit) showShelfCard(hit.object.userData.tool); else if (shelfHover) hideShelfCard();
    renderer.domElement.style.cursor = hit ? 'pointer' : '';
    return;
  }
  // Hovering a tool, or a part of the finished home, lights up that stage.
  // Over the dock, the pointer's place along it (not the tool under it, which changes as
  // the tools grow) decides what is magnified.
  const along = !tall && spotShown && on1() ? dockPointer(e.clientX - r.left, e.clientY - r.top, r) : -1;
  const over = along >= 0 ? tools.find(t => t.userData.p.dock === Math.round(along)) : hit?.object.userData.tool;
  hoverDock = along;
  if (along >= 0 && hoverAmt < 0.05) hoverDockAt = along;
  hoverStage = spotShown && !building() && over ? over.userData.p.stage : -1;
  hoverTool = over && spotShown ? over.userData.id : null;
  if (over && buildStarted) {
    const t = over;
    tip.innerHTML = `<b>${STR[lang].tools[t.userData.id] || t.userData.name}</b><span class="${t.userData.brand}">${t.userData.brand === 'total' ? 'TOTAL' : 'Jadever'}</span>`;
    const x = clamp(e.clientX - r.left, 10, r.width - 200);
    tip.style.left = `${x}px`; tip.style.top = `${e.clientY - r.top - 34}px`;
    tip.classList.add('on');
    renderer.domElement.style.cursor = 'pointer';
  } else { tip.classList.remove('on'); renderer.domElement.style.cursor = ''; }
}
renderer.domElement.addEventListener('pointermove', pick);
renderer.domElement.addEventListener('pointerdown', pick);
renderer.domElement.addEventListener('pointerleave', () => { hoverStage = -1; hoverTool = null; hoverDock = -1; if (shelfHover) hideShelfCard(); });
renderer.domElement.addEventListener('click', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  // On the first stage, clicking a tool brings it into the spotlight.
  if (!spotShown || !buildStarted) return;
  // Over the dock, the tool it is magnifying; elsewhere, the tool under the pointer.
  const t = hoverTool ? tools.find(x => x.userData.id === hoverTool) : ray.intersectObjects(tools, true).find(h => h.object.userData.tool)?.object.userData.tool;
  if (t) {
    goStage(t.userData.p.stage);
    flyTool = t.userData.id; flyLeft = 1.8; // it flies up to what it built, then back to the dock
  }
});
addEventListener('scroll', () => tip.classList.remove('on'), { passive: true });

// Finger / mouse tilt for the photo cards (-1..1, smoothed).
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => { tilt.tx = (e.clientX / innerWidth) * 2 - 1; tilt.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
addEventListener('touchmove', e => { const p = e.touches[0]; if (p) { tilt.tx = (p.clientX / innerWidth) * 2 - 1; tilt.ty = (p.clientY / innerHeight) * 2 - 1; } }, { passive: true });

// ---------- loop ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.elapsedTime;
  const target = progress();
  // Past the scroller, the whole scene scrolls up with the page, so the sections below follow it.
  const out = Math.max(0, scrollY - (document.querySelector('.scroller').offsetHeight - innerHeight));
  document.documentElement.style.setProperty('--out', `${out}px`);
  pSmooth += (target - pSmooth) * 0.12;
  if (Math.abs(target - pSmooth) < 0.0002) pSmooth = target;
  tilt.x += (tilt.tx - tilt.x) * 0.06; tilt.y += (tilt.ty - tilt.y) * 0.06;
  update(pSmooth, time, dt);
  const i = stageIndex(pSmooth);
  if (i !== shown) renderPanel(i);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

document.fonts.load('800 100px Montserrat').then(() => document.fonts.load('700 50px Cairo')).finally(() => {
  setLang(lang);
  publishStage();
  if (PIN !== null) document.body.classList.add('pinned');
  frame();
  startBuild();
});
// The build waits until every tool has its 3D model (none swap shape mid-flight) and the
// whole scene has been prepared on the graphics card once, so nothing stutters as it plays.
async function startBuild() {
  const t0 = performance.now();
  while (!tools.every(t => t.userData.ready) && performance.now() - t0 < 6000) await new Promise(r => setTimeout(r, 60));
  const hidden = [];
  scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  try { await renderer.compileAsync(scene, camera); } catch { renderer.compile(scene, camera); }
  hidden.forEach((o) => { o.visible = false; });
  clock.getDelta(); // the wait does not count as time
  buildStarted = true;
}

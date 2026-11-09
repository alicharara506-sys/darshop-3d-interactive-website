// The home that the tools build on the home page ("dar" means home in Arabic): a small
// architectural model, made of parts that appear stage by stage. Sizes are in scene units,
// with the top of the site plate at y = 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// The six stages, with the tools (by id) that work on each.
export const BUILD_STAGES = [
  { key: 'foundation', seconds: 1.5, tools: ['breaker', 'JDWB1F01'] },
  { key: 'walls', seconds: 1.8, tools: ['hammer', 'impactDrill'] },
  { key: 'steel', seconds: 1.3, tools: ['grinder', 'JDWH2501', 'impactWrench'] },
  { key: 'finishing', seconds: 1.6, tools: ['drill', 'JDCV4401', 'JDSS1302', 'JDFA55350', 'JDRYP1504', 'JDGA4611'] },
  { key: 'garden', seconds: 1.1, tools: ['JDLYP546', 'blower'] },
  { key: 'power', seconds: 0.9, tools: ['battery', 'charger'] },
];

const PAINT = {
  white: { color: 0xf4f2ee, roughness: 0.72 },
  plaster: { color: 0xffffff, roughness: 0.85 },
  slab: { color: 0x3a3d42, roughness: 0.6, metalness: 0.15 },
  sand: { roughness: 0.92 },
  frame: { color: 0x2c3036, roughness: 0.45, metalness: 0.3 },
  rail: { color: 0xbfe3ec, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, emissive: 0x9fd4e2, emissiveIntensity: 0.25 },
  cushion: { color: 0xfaf8f4, roughness: 0.9 },
  canopy: { color: 0xff7a3d, roughness: 0.8 },
  concrete: { color: 0xd9d6d0, roughness: 0.9 },
  stone: { color: 0xe7e1d6, roughness: 0.85 },
  steel: { color: 0xff5a1f, roughness: 0.38, metalness: 0.25 },
  glass: { color: 0xffffff, roughness: 0.08, metalness: 0.25, envMapIntensity: 1.2, emissive: 0xffffff, emissiveIntensity: 0.42 },
  wood: { color: 0xffffff, roughness: 0.55 },
  handle: { color: 0xc9ccd1, roughness: 0.25, metalness: 0.9 },
  leaf: { color: 0x7cb85a, roughness: 0.8, vertexColors: true },
  leaf2: { color: 0x5f9a45, roughness: 0.8, vertexColors: true },
  leaf3: { color: 0x96c766, roughness: 0.8, vertexColors: true },
  deck: { roughness: 0.7 },
  fluted: { roughness: 0.55, metalness: 0.1 },
  led: { color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 1.2 },
  soil: { color: 0x5a4130, roughness: 1 },
  clay: { color: 0x8c6a4b, roughness: 1 },
  rock: { color: 0xa79c8b, roughness: 0.95 },
  cypress: { color: 0x4a8040, roughness: 0.85, vertexColors: true },
  hedge: { color: 0x4a7a3d, roughness: 0.9 },
  lawn: { color: 0x7fa862, roughness: 1 },
  trunk: { color: 0x5e4632, roughness: 0.9 },
  water: { color: 0x2fa9c4, roughness: 0.04, metalness: 0.2, envMapIntensity: 1.3 },
  solar: { color: 0x25364d, roughness: 0.25, metalness: 0.6 },
  lamp: { color: 0xfff1dc, emissive: 0xffb36b, emissiveIntensity: 0 },
};
// Lebanese sandstone: warm blocks in staggered courses, drawn once.
function stoneTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = '#a8916e'; g.fillRect(0, 0, 512, 512);
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0, row = 0; y < 512; y += 46, row++) {
    for (let x = row % 2 ? -50 : 0; x < 512; ) {
      const w = 70 + rnd() * 60, l = 55 + rnd() * 14;
      g.fillStyle = `hsl(${34 + rnd() * 6}, ${30 + rnd() * 10}%, ${l}%)`;
      g.fillRect(x + 3, y + 3, w - 6, 40);
      x += w;
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); t.anisotropy = 8;
  return t;
}
PAINT.stone2 = { roughness: 0.92 };
// Glass: a sky gradient with a diagonal sweep of reflected light, the same on every pane.
function glassTexture() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
  const g = cv.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#9fd2e6'); sky.addColorStop(0.55, '#5c9fbd'); sky.addColorStop(1, '#2f5f78');
  g.fillStyle = sky; g.fillRect(0, 0, 128, 256);
  const sweep = g.createLinearGradient(0, 40, 128, 150);
  sweep.addColorStop(0.3, 'rgba(255,255,255,0)'); sweep.addColorStop(0.45, 'rgba(255,255,255,.55)'); sweep.addColorStop(0.52, 'rgba(255,255,255,.1)'); sweep.addColorStop(0.62, 'rgba(255,255,255,.35)'); sweep.addColorStop(0.72, 'rgba(255,255,255,0)');
  g.fillStyle = sweep; g.fillRect(0, 0, 128, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Large-format render panels in warm cream, with fine joints and a soft grain.
function panelTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = '#ece2d2'; g.fillRect(0, 0, 512, 512);
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '120,95,60'},${rnd() * 0.06})`; g.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
  g.strokeStyle = 'rgba(110,88,60,.28)'; g.lineWidth = 3;
  for (let x = 0; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  for (let y = 0; y <= 512; y += 256) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// A leafy clump: a sphere with an uneven, organic surface.
function clump(r, seed) {
  const geo = mergeVertices(new THREE.IcosahedronGeometry(r, 3).deleteAttribute('normal').deleteAttribute('uv'));
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 23 + seed) * Math.sin(v.y * 19 + seed * 2) * Math.sin(v.z * 21 + seed * 3);
    v.multiplyScalar(1 + n * 0.16 + Math.sin(v.x * 61 + v.z * 57) * 0.035);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  // Sunlit on top, shaded underneath, with a little variation leaf by leaf.
  const nrm = geo.attributes.normal, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const up = nrm.getY(i) * 0.5 + 0.5, jitter = Math.sin(i * 12.9898 + seed) * 0.5 + 0.5;
    const k = 0.42 + up * 0.5 + jitter * 0.1;
    col.set([k * (0.96 + up * 0.06), k, k * (0.9 - up * 0.12)], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
// Teak decking: long boards with dark joints and a soft grain.
function deckTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
  const g = cv.getContext('2d');
  let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < 512; y += 32) {
    g.fillStyle = `hsl(${27 + rnd() * 5}, ${38 + rnd() * 10}%, ${44 + rnd() * 9}%)`; g.fillRect(0, y, 512, 32);
    for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(60,35,18,${0.08 + rnd() * 0.1})`; g.fillRect(0, y + 3 + rnd() * 26, 512, 1 + rnd()); }
    g.fillStyle = 'rgba(35,20,10,.55)'; g.fillRect(0, y, 512, 2);
    const cut = rnd() * 512; g.fillRect(cut, y, 2, 32);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// Charcoal fluted panels: fine vertical ribs that catch the light.
function flutedTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64;
  const g = cv.getContext('2d');
  for (let x = 0; x < 512; x += 16) {
    const grad = g.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, '#2a2d31'); grad.addColorStop(0.35, '#4b4f55'); grad.addColorStop(0.7, '#3a3d42'); grad.addColorStop(1, '#232629');
    g.fillStyle = grad; g.fillRect(x, 0, 16, 64);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// Travertine paving for the site: warm cream slabs with fine joints.
function pavingTexture() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 680;
  const g = cv.getContext('2d');
  let seed = 4; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < 680; y += 68) for (let x = (y / 68) % 2 ? -60 : 0; x < 1024; x += 120) {
    g.fillStyle = `hsl(${36 + rnd() * 6}, ${22 + rnd() * 8}%, ${84 + rnd() * 6}%)`; g.fillRect(x, y, 120, 68);
    g.strokeStyle = 'rgba(120,100,75,.25)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, 118, 66);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Walnut, with a fine grain running along the boards.
function woodTexture() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = '#6e4a2e'; g.fillRect(0, 0, 256, 512);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 256, w = 1 + rnd() * 3;
    g.strokeStyle = `rgba(${rnd() > 0.5 ? '40,24,12' : '150,104,66'},${0.15 + rnd() * 0.25})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y / 60 + i) * 4, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeBack = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const clamp = t => Math.min(1, Math.max(0, t));

export function buildHome() {
  const group = new THREE.Group();
  const parts = [], mats = new Map(), allMats = [];
  let windows = 0;

  // One material per paint and stage, so one stage can glow by itself.
  const stoneMap = stoneTexture(), woodMap = woodTexture(), glassMap = glassTexture(), panelMap = panelTexture();
  panelMap.repeat.set(1.1, 1.1);
  const deckMap = deckTexture(), flutedMap = flutedTexture();
  deckMap.repeat.set(1, 2.4); flutedMap.repeat.set(0.9, 1);
  // The same sandstone, at the scale of the walls (their texture runs in scene units).
  const sandMap = stoneMap.clone(); sandMap.repeat.set(0.85, 1.1); sandMap.needsUpdate = true;
  // own: a material of its own (each window lights up at its own moment), with order 0..1.
  function mat(stage, paint, own = null) {
    const key = own === null ? `${stage}:${paint}` : `${stage}:${paint}:${own}`;
    if (!mats.has(key)) {
      const m = new THREE.MeshStandardMaterial({ envMapIntensity: 0.5, ...PAINT[paint], ...(paint === 'stone2' ? { map: stoneMap } : paint === 'sand' ? { map: sandMap } : paint === 'wood' ? { map: woodMap } : paint === 'glass' ? { map: glassMap, emissiveMap: glassMap } : paint === 'plaster' ? { map: panelMap } : paint === 'deck' ? { map: deckMap } : paint === 'fluted' ? { map: flutedMap } : {}) });
      m.userData = { stage, paint, order: own ?? 0, base: PAINT[paint].opacity ?? 1 };
      mats.set(key, m); allMats.push(m);
    }
    return mats.get(key);
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  // kind: rise (grows up from its base), drop (lowers into place), pop (springs up from nothing).
  function add(stage, geo, paint, x, y, z, { kind = 'rise', ry = 0, at = 0, own = null } = {}) {
    const mesh = new THREE.Mesh(geo, mat(stage, paint, own));
    mesh.position.set(x, y, z); mesh.rotation.y = ry;
    const thin = paint === 'frame' || paint === 'glass' || paint === 'handle' || paint === 'rail';
    mesh.castShadow = !thin && paint !== 'lawn' && paint !== 'water'; mesh.receiveShadow = !thin;
    mesh.userData.stage = stage;
    group.add(mesh);
    parts.push({ mesh, stage, kind, at, y });
    return mesh;
  }
  // A wall with openings. Each opening gets its glass or door at the finishing stage.
  function wall(x, y, z, w, h, ry, holes, at, paint) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(w, 0); shape.lineTo(w, h); shape.lineTo(0, h); shape.closePath();
    for (const o of holes) {
      const p = new THREE.Path();
      p.moveTo(o.x, o.y); p.lineTo(o.x, o.y + o.h); p.lineTo(o.x + o.w, o.y + o.h); p.lineTo(o.x + o.w, o.y); p.closePath();
      shape.holes.push(p);
    }
    const t = 0.09, geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false }).translate(-w / 2, 0, -t / 2);
    add(1, geo, paint, x, y, z, { ry, at });
    const cos = Math.cos(ry), sin = Math.sin(ry);
    holes.forEach((o, i) => {
      const dx = o.x + o.w / 2 - w / 2, px = x + dx * cos, pz = z - dx * sin, a = Math.min(0.75, at + i * 0.08);
      // Inside the opening, inset from its edges so no two surfaces sit in the same place
      // (that makes edges flicker): the frame just inside the opening, the glass inside the frame.
      const f = 0.03, e = 0.006, inner = o.w - 2 * (f + e) - 0.008;
      add(3, box(inner, o.h - (o.door ? f + e : 2 * (f + e)) - 0.008, 0.02), o.door ? 'wood' : 'glass', px, y + o.y + (o.door ? 0.004 : f + e + 0.004), pz, { kind: 'pop', ry, at: a, own: o.door ? null : windows++ });
      if (o.door) {
        const hx = o.w * 0.32;
        add(3, box(0.022, 0.32, 0.07), 'handle', px + hx * cos, y + o.y + 0.28, pz - hx * sin, { kind: 'pop', ry, at: a });
      }
      // A slim graphite frame, with a mullion across wide windows.
      const bars = [[o.w - 2 * e, f, 0, o.h - f - e], [f, o.h - e, -o.w / 2 + e + f / 2, 0], [f, o.h - e, o.w / 2 - e - f / 2, 0]];
      if (!o.door) bars.push([o.w - 2 * e - 2 * f - 0.004, f, 0, e]);
      if (o.w > 1) bars.push([f * 0.8, o.h - 2 * (f + e) - 0.004, 0, f + e + 0.002]);
      for (const [bw, bh, ox, oy] of bars) add(3, box(bw, bh, t + 0.016), 'frame', px + ox * cos, y + o.y + oy, pz - ox * sin, { kind: 'pop', ry, at: a });
    });
  }

  // Site plate: the drawing board the home stands on. Always there.
  const plateTex = (() => {
    return pavingTexture();
  })();
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.85, envMapIntensity: 0.6 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: 0.7 });
  allMats.push(plateMat, edgeMat);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(7.1, 0.08, 4.8, 3, 0.03).translate(0, -0.04, 0), edgeMat);
  plate.receiveShadow = plate.castShadow = true;
  group.add(plate);
  // Cut through the ground below, like an architect's site model: soil, clay, then rock.
  [[0x5a4130, 0.08, 0.08], [0x8c6a4b, 0.16, 0.1], [0xa79c8b, 0.3, 0.12]].reduce((top, [color, h, inset]) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, envMapIntensity: 0.4 });
    allMats.push(m);
    const layer = new THREE.Mesh(new RoundedBoxGeometry(7.1 - inset, h, 4.8 - inset, 2, 0.02).translate(0, top - h / 2, 0), m);
    layer.receiveShadow = true; group.add(layer);
    return top - h;
  }, -0.08);
  const plateTop = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.7), plateMat);
  plateTop.rotation.x = -Math.PI / 2; plateTop.position.y = 0.002; plateTop.receiveShadow = true;
  group.add(plateTop);

  // 0: foundation
  const base = 0.14, cx = -0.45;
  add(0, box(3.7, base, 2.8), 'concrete', cx, 0, 0);
  add(0, box(2, 0.07, 2.8), 'deck', 2.35, 0, 0, { at: 0.4 });
  add(0, box(0.7, 0.07, 0.4), 'stone', cx - 0.2, 0, 1.6, { at: 0.55 });

  // 1: walls, the ground floor, then the floor above
  const h1 = 1, y1 = base + h1 + 0.09, h2 = 0.86;
  wall(cx, base, 1.25, 3.5, h1, 0, [{ x: 0.3, y: 0.22, w: 1.25, h: 0.62 }, { x: 1.85, y: 0, w: 0.48, h: 0.84, door: true }, { x: 2.6, y: 0.22, w: 0.6, h: 0.62 }], 0, 'sand');
  wall(cx, base, -1.25, 3.5, h1, 0, [{ x: 0.5, y: 0.34, w: 0.7, h: 0.42 }, { x: 2.2, y: 0.34, w: 0.7, h: 0.42 }], 0.08, 'sand');
  wall(cx - 1.75, base, 0, 2.5, h1, Math.PI / 2, [{ x: 0.8, y: 0.28, w: 0.9, h: 0.5 }], 0.14, 'sand');
  wall(cx + 1.75, base, 0, 2.5, h1, Math.PI / 2, [{ x: 0.25, y: 0.06, w: 2, h: 0.78 }], 0.2, 'sand');
  add(1, box(4.5, 0.09, 3), 'slab', 0, base + h1, 0, { kind: 'drop', at: 0.42 });
  const ux = 0.2;
  wall(ux, y1, 1, 3.4, h2, 0, [{ x: 0.3, y: 0.16, w: 2.8, h: 0.54 }], 0.56, 'fluted');
  wall(ux, y1, -1.05, 3.4, h2, 0, [{ x: 0.5, y: 0.24, w: 0.8, h: 0.38 }, { x: 2.1, y: 0.24, w: 0.8, h: 0.38 }], 0.6, 'fluted');
  wall(ux - 1.7, y1, -0.03, 2.05, h2, Math.PI / 2, [{ x: 0.55, y: 0.2, w: 0.95, h: 0.46 }], 0.66, 'fluted');
  wall(ux + 1.7, y1, -0.03, 2.05, h2, Math.PI / 2, [{ x: 0.2, y: 0.08, w: 1.65, h: 0.62 }], 0.7, 'fluted');

  // A stone stair tower at the back corner, a little taller than the roof.
  add(1, box(0.6, h1 + h2 + 0.5, 1.1), 'stone2', cx - 2.06, base, -0.35, { at: 0.5 });
  add(1, box(0.68, 0.05, 1.18), 'white', cx - 2.06, base + h1 + h2 + 0.5, -0.35, { kind: 'drop', at: 0.85 });
  add(3, box(0.05, 1.2, 0.36), 'glass', cx - 2.37, base + 0.45, -0.35, { kind: 'pop', at: 0.6, own: 99 });

  // 2: steel: columns under the floor above, a pergola over the terrace, then the roof
  for (const z of [1.38, -1.38]) add(2, box(0.07, h1, 0.07), 'steel', 2.18, base - 0.07, z, { at: 0.04 });
  for (const z of [1.3, -1.3]) add(2, box(0.05, 0.92, 0.05), 'steel', 3.28, 0.07, z, { at: 0.16 });
  add(2, box(1.14, 0.05, 0.05), 'steel', 2.72, 0.99, 1.3, { kind: 'drop', at: 0.26 });
  add(2, box(1.14, 0.05, 0.05), 'steel', 2.72, 0.99, -1.3, { kind: 'drop', at: 0.3 });
  for (let i = 0; i < 7; i++) add(2, box(0.035, 0.035, 2.62), 'steel', 2.3 + i * 0.16, 1.04, 0, { kind: 'drop', at: 0.34 + i * 0.03 });
  add(2, box(3.79, 0.035, 2.49), 'steel', ux, y1 + h2, -0.03, { kind: 'drop', at: 0.62 });
  add(2, box(3.84, 0.09, 2.54), 'slab', ux, y1 + h2 + 0.035, -0.03, { kind: 'drop', at: 0.72 });

  // A warm LED line along the underside of the roof, front and side.
  add(3, box(3.6, 0.014, 0.025), 'led', ux, y1 + h2 - 0.016, 1.14, { kind: 'pop', at: 0.85 });
  add(3, box(0.025, 0.014, 2.3), 'led', ux + 1.84, y1 + h2 - 0.016, -0.03, { kind: 'pop', at: 0.9 });

  // 3: finishing: the glass and doors come from wall() above, plus a timber screen
  for (let i = 0; i < 11; i++) add(3, box(0.05, h2 - 0.06, 0.05), 'wood', ux - 1.5 + i * 0.075, y1 + 0.03, 1.09, { at: 0.3 + i * 0.03 });

  // A glass railing all round the terrace of the floor above. On the left it runs into the
  // stone tower, so nowhere does it stop in mid-air.
  const ry0 = base + h1 + 0.09, rh = 0.27, rx = 2.19, rz = 1.44, towerFront = -0.35 + 0.55, towerBack = -0.35 - 0.55;
  function railing(x0, z0, x1, z1, at) {
    const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    add(3, box(len, rh, 0.02), 'rail', mx, ry0, mz, { ry, at });
    add(3, box(len + 0.045, 0.03, 0.045), 'frame', mx, ry0 + rh, mz, { kind: 'drop', ry, at: at + 0.15 });
    const posts = Math.max(1, Math.round(len / 0.7));
    for (let k = 0; k <= posts; k++) add(3, box(0.032, rh, 0.032), 'frame', x0 + (x1 - x0) * k / posts, ry0, z0 + (z1 - z0) * k / posts, { at: at + 0.05 + k * 0.015 });
  }
  railing(-rx, towerFront, -rx, rz, 0.5);
  railing(-rx, rz, rx, rz, 0.53);
  railing(rx, rz, rx, -rz, 0.56);
  railing(rx, -rz, -rx, -rz, 0.59);
  railing(-rx, -rz, -rx, towerBack, 0.62);

  // 4: garden
  add(4, box(6.7, 0.012, 1.02), 'lawn', 0, 0.002, 1.82);
  add(4, box(1.05, 0.012, 4.3), 'lawn', -3, 0.003, -0.12, { at: 0.08 });
  add(4, box(1.32, 0.025, 0.86), 'water', 2.36, 0.07, 0.66, { at: 0.22 });
  add(4, box(0.2, 0.26, 1.4), 'hedge', -3.32, 0, -1.9, { at: 0.2 });
  add(4, box(4.1, 0.24, 0.18), 'hedge', -1.3, 0, -2.16, { at: 0.26 });
  [[0.6, 1.72], [0.6, 2.05]].forEach(([, z], i) => add(4, box(0.46, 0.015, 0.2), 'stone', cx + 0.3, 0.012, z, { at: 0.32 + i * 0.08 }));
  [[-2.95, 1.8, 0.42], [-2.9, -1.6, 0.52], [3.05, -1.95, 0.46], [1.65, 1.9, 0.3]].forEach(([x, z, r], i) => {
    add(4, new THREE.CylinderGeometry(0.022, 0.045, r * 1.5, 8).translate(0, r * 0.75, 0), 'trunk', x, 0, z, { at: 0.36 + i * 0.09 });
    // Two branches leaning out into the crown.
    for (const s of [-1, 1]) add(4, new THREE.CylinderGeometry(0.01, 0.02, r * 0.8, 6).translate(0, r * 0.4, 0).rotateZ(s * 0.6).translate(0, r * 1.15, 0), 'trunk', x, 0, z, { at: 0.38 + i * 0.09 });
    // A crown of many overlapping clumps: darker and lower inside, lighter on top.
    const paints = ['leaf2', 'leaf', 'leaf3'];
    for (let j = 0; j < 11; j++) {
      const a = j * 2.4 + i, ring = j === 0 ? 0 : 0.42 + (j % 3) * 0.14, lift = j === 0 ? 1.75 : 1.4 + ((j * 37) % 10) / 10 * 0.75;
      const k = j === 0 ? 0.95 : 0.5 + ((j * 53) % 10) / 10 * 0.25;
      add(4, clump(r * 0.62 * k, i * 13 + j).translate(Math.cos(a) * ring * r, lift * r, Math.sin(a) * ring * r), paints[lift > 1.8 ? 2 : lift > 1.55 ? 1 : 0], x, 0, z, { kind: 'pop', at: 0.42 + i * 0.09 + j * 0.012 });
    }
  });
  // Slim cypresses along the side, as in Lebanese gardens.
  [[-3.3, 0.55], [-3.3, -0.25], [-3.3, -1.05]].forEach(([x, z], i) => {
    add(4, new THREE.CylinderGeometry(0.02, 0.03, 0.2, 6).translate(0, 0.1, 0), 'trunk', x, 0, z, { at: 0.3 + i * 0.06 });
    add(4, clump(0.17, 70 + i).scale(1, 3.2, 1).translate(0, 0.66, 0), 'cypress', x, 0, z, { kind: 'pop', at: 0.36 + i * 0.06 });
  });

  // Two loungers and a parasol by the pool, and planters by the door.
  [0.42, 0.9].forEach((z, i) => {
    add(4, box(0.62, 0.05, 0.24), 'wood', 3.2, 0.07, z - 0.3, { at: 0.6 + i * 0.06 });
    add(4, new THREE.BoxGeometry(0.6, 0.05, 0.22).translate(0, 0.025, 0), 'cushion', 3.2, 0.12, z - 0.3, { kind: 'pop', at: 0.66 + i * 0.06 });
  });
  add(4, new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8).translate(0, 0.375, 0), 'frame', 3.25, 0.07, 0.95, { at: 0.72 });
  add(4, new THREE.ConeGeometry(0.42, 0.16, 8, 1, true).translate(0, 0.83, 0), 'canopy', 3.25, 0.07, 0.95, { kind: 'pop', at: 0.8 });
  [-0.1, 0.62].forEach((dx, i) => {
    add(4, box(0.2, 0.16, 0.2), 'stone2', cx + 1.4 + dx, 0.14, 1.48, { at: 0.5 + i * 0.08 });
    add(4, clump(0.13, 40 + i).translate(0, 0.38, 0), 'leaf', cx + 1.4 + dx, 0.14, 1.48, { kind: 'pop', at: 0.58 + i * 0.08 });
  });

  // 5: power: solar panels on the roof and lamps along the path; the windows light up
  const roofY = y1 + h2 + 0.11;
  for (let i = 0; i < 3; i++) add(5, new THREE.BoxGeometry(0.72, 0.025, 0.5).rotateX(0.32).translate(0, 0.14, 0), 'solar', ux - 0.85 + i * 0.85, roofY, -0.4, { kind: 'drop', at: i * 0.12 });
  [[cx + 0.75, 1.72], [cx + 0.75, 2.1]].forEach(([x, z], i) => {
    add(5, box(0.022, 0.2, 0.022), 'trunk', x, 0, z, { at: 0.2 + i * 0.1 });
    add(5, new THREE.SphereGeometry(0.038, 12, 10).translate(0, 0.22, 0), 'lamp', x, 0, z, { kind: 'pop', at: 0.3 + i * 0.1 });
  });

  // The blueprint: the outline of the whole finished home, drawn line by line.
  group.updateMatrixWorld(true);
  const points = [], v = new THREE.Vector3();
  for (const { mesh, stage } of parts) {
    if (stage > 3 || mesh.material.userData.paint === 'wood') continue;
    const edges = new THREE.EdgesGeometry(mesh.geometry, 30).attributes.position;
    for (let i = 0; i < edges.count; i++) { v.fromBufferAttribute(edges, i).applyMatrix4(mesh.matrixWorld); points.push(v.x, v.y, v.z); }
  }
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const wireMat = new THREE.LineBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.9, fog: false });
  const wire = new THREE.LineSegments(wireGeo, wireMat);
  group.add(wire);
  const wireCount = points.length / 3;
  // Warm light inside, on when the power comes on.
  const inside = new THREE.PointLight(0xffa860, 0, 4.5, 1.6);
  inside.position.set(-0.2, base + h1 * 0.6, 0.2); group.add(inside);
  const upstairs = new THREE.PointLight(0xffb070, 0, 4, 1.6);
  upstairs.position.set(ux, y1 + h2 * 0.55, 0); group.add(upstairs);


  // done: how complete each stage is (0..1). blueprint: how much of the outline is drawn.
  // opacity: fades the whole model out on the way to the shelf.
  function update(done, blueprint, opacity, dt) {
    for (const p of parts) {
      const t = clamp((done[p.stage] - p.at) / Math.max(0.12, 1 - p.at));
      const m = p.mesh;
      m.visible = t > 0.001;
      if (!m.visible) continue;
      if (p.kind === 'rise') { m.scale.set(1, Math.max(0.001, easeOut(t)), 1); }
      else if (p.kind === 'drop') { const e = easeOut(t); m.position.y = p.y + (1 - e) * 0.9; m.scale.setScalar(Math.max(0.001, 0.75 + e * 0.25)); }
      else { m.scale.setScalar(Math.max(0.001, easeBack(t))); }
    }
    wire.visible = opacity > 0.01 && blueprint > 0;
    wire.geometry.setDrawRange(0, Math.floor(clamp(blueprint) * wireCount / 2) * 2);
    const built = done[3];
    wireMat.opacity = (blueprint < 1 ? 0.9 : lerpTo(0.9, 0.12, done[1])) * (1 - built) * opacity;

    const lit = done[5];
    inside.intensity = upstairs.intensity = lit * 2.2 * opacity;
    const fade = opacity < 0.995;
    for (const m of allMats) {
      const wantFade = fade || (m.userData.base ?? 1) < 1;
      if (m.transparent !== wantFade) { m.transparent = wantFade; m.needsUpdate = true; }
      const { stage, paint, order, base: alpha } = m.userData;
      m.opacity = opacity * (alpha ?? 1);
      if (paint === 'rail' && !m.transparent) { m.transparent = true; m.needsUpdate = true; }
      // The windows light up one after another, as if someone walks through the house.
      const on = paint === 'glass' ? clamp((lit - Math.min(order, 14) / 14 * 0.65) / 0.35) : lit;
      if (paint === 'lamp') m.emissiveIntensity = on * 2.4;
      else if (paint === 'glass') { m.emissiveIntensity = 0.42 + on * 0.18; m.emissive.setRGB(1, 1 - on * 0.12, 1 - on * 0.3); }
          }
  }
  return { group, update };
}
const lerpTo = (a, b, t) => a + (b - a) * t;

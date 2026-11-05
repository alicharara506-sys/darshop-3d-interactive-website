// Stand-in 3D tools in a glossy studio style.
// PROTOTYPE ONLY: these are simple shapes in the brand colours, not the real
// TOTAL / Jadever products. They will be replaced by models of the real items.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

export const C = {
  teal: 0x12a3b0, tealDark: 0x0b7480, grey: 0xb9bec4, red: 0xd8262c,
  green: 0x1f7a37, yellow: 0xf3c300, black: 0x1a1b1d, steel: 0xd0d4d9, gold: 0xc9a13b,
};

const gloss = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
const M = {
  teal: gloss(C.teal), tealDark: gloss(C.tealDark), grey: gloss(C.grey), red: gloss(C.red),
  green: gloss(C.green), yellow: gloss(C.yellow), black: gloss(C.black, { roughness: 0.6, clearcoat: 0.3 }),
  steel: new THREE.MeshPhysicalMaterial({ color: C.steel, metalness: 1, roughness: 0.22 }),
  gold: new THREE.MeshPhysicalMaterial({ color: C.gold, metalness: 1, roughness: 0.3 }),
};

function box(w, h, d, mat, r = 0.04) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2.1, h / 2.1, d / 2.1)), mat);
}
function cyl(r, h, mat, seg = 32) { return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); }
function at(m, x, y, z, rx = 0, ry = 0, rz = 0) { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; }

// A flat brand label on a tool. Brand names only, as plain text, until the
// official logo files arrive from the partners.
function label(text, bg, fg, w, h) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = Math.round(512 * h / w);
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `italic 800 ${Math.round(cv.height * 0.62)}px Montserrat, Arial, sans-serif`;
  g.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 1 }));
}
const totalLabel = (w, h) => label('TOTAL', '#ffffff', '#0b7480', w, h);
const jadLabel = (w, h) => label('Jadever', '#f3c300', '#1f7a37', w, h);

function both(g, mk, z) { const a = mk(); a.position.z = z; g.add(a); const b = mk(); b.position.z = -z; b.rotation.y = Math.PI; g.add(b); }

function drill(len = 0.9, bodyMat = M.teal) {
  const g = new THREE.Group();
  g.add(at(box(len, 0.32, 0.26, bodyMat, 0.1), 0, 0.36, 0));
  g.add(at(box(0.2, 0.3, 0.27, M.grey, 0.08), -len / 2 - 0.02, 0.36, 0));
  g.add(at(box(0.22, 0.56, 0.21, M.black, 0.08), -0.05, 0.02, 0, 0, 0, 0.14));
  g.add(at(box(0.46, 0.17, 0.3, M.tealDark, 0.05), -0.04, -0.32, 0));
  g.add(at(box(0.07, 0.1, 0.08, M.red, 0.02), 0.08, 0.17, 0));
  g.add(at(cyl(0.09, 0.2, M.black), len / 2 + 0.1, 0.36, 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(0.022, 0.34, M.steel, 12), len / 2 + 0.36, 0.36, 0, 0, 0, Math.PI / 2));
  both(g, () => at(totalLabel(0.36, 0.11), 0.08, 0.37, 0), 0.132);
  return g;
}
function grinder() {
  const g = new THREE.Group();
  g.add(at(cyl(0.15, 0.85, M.teal), 0, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(box(0.3, 0.26, 0.26, M.grey, 0.08), 0.52, 0.02, 0));
  g.add(at(cyl(0.34, 0.02, M.steel, 48), 0.56, -0.2, 0));
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.08, 40, 1, true, 0, Math.PI), M.grey), 0.56, -0.16, 0, 0, Math.PI / 2, 0));
  g.add(at(cyl(0.05, 0.36, M.black), 0.5, 0.25, 0, Math.PI / 2, 0, 0));
  g.add(at(box(0.18, 0.08, 0.12, M.red, 0.03), -0.1, 0.15, 0));
  both(g, () => at(totalLabel(0.34, 0.1), -0.1, 0, 0), 0.152);
  return g;
}
function blade() {
  const g = new THREE.Group();
  const d = at(cyl(0.5, 0.02, M.steel, 64), 0, 0, 0, Math.PI / 2, 0, 0); g.add(d);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 3), M.steel), Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0, 0, 0, a - Math.PI / 2 - 0.4));
  }
  g.add(at(cyl(0.3, 0.025, M.teal, 48), 0, 0, 0, Math.PI / 2, 0, 0));
  g.add(at(cyl(0.06, 0.03, M.grey, 24), 0, 0, 0, Math.PI / 2, 0, 0));
  both(g, () => at(totalLabel(0.3, 0.09), 0, 0.14, 0), 0.014);
  return g;
}
function battery() {
  const g = new THREE.Group();
  g.add(box(0.6, 0.22, 0.4, M.teal, 0.06));
  g.add(at(box(0.62, 0.08, 0.42, M.black, 0.03), 0, -0.13, 0));
  g.add(at(box(0.3, 0.06, 0.2, M.grey, 0.02), 0, 0.13, 0));
  both(g, () => at(totalLabel(0.34, 0.1), 0, 0.01, 0), 0.201);
  return g;
}
function screwdriver(handle = M.green) {
  const g = new THREE.Group();
  g.add(at(cyl(0.075, 0.38, handle, 6), -0.3, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(0.08, 0.06, M.yellow, 6), -0.1, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(0.018, 0.5, M.steel, 12), 0.2, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(box(0.05, 0.035, 0.012, M.steel, 0.004), 0.47, 0, 0));
  return g;
}
function tape() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.5, 0.2, M.yellow, 0.14));
  g.add(at(box(0.36, 0.36, 0.22, M.green, 0.1), 0, 0, 0));
  g.add(at(box(0.08, 0.04, 0.16, M.yellow, 0.01), 0.27, -0.2, 0));
  g.add(at(box(0.04, 0.08, 0.17, M.black, 0.01), 0.31, -0.18, 0));
  both(g, () => at(jadLabel(0.3, 0.09), 0, 0.02, 0), 0.111);
  return g;
}
function pliers() {
  const g = new THREE.Group();
  const h1 = at(new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.6, 6, 12), M.green), -0.09, -0.3, 0, 0, 0, 0.16);
  const h2 = at(new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.6, 6, 12), M.yellow), 0.09, -0.3, 0, 0, 0, -0.16);
  g.add(h1, h2);
  g.add(at(box(0.07, 0.3, 0.05, M.steel, 0.02), -0.03, 0.2, 0.0, 0, 0, -0.08));
  g.add(at(box(0.07, 0.3, 0.05, M.steel, 0.02), 0.03, 0.2, 0.03, 0, 0, 0.08));
  g.add(at(cyl(0.05, 0.12, M.steel, 20), 0, 0.06, 0.02, Math.PI / 2, 0, 0));
  return g;
}
function toolbox() {
  const g = new THREE.Group();
  g.add(box(0.95, 0.55, 0.32, M.green, 0.06));
  g.add(at(box(0.97, 0.03, 0.34, M.black, 0.01), 0, 0.1, 0));
  g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 12, 24, Math.PI), M.yellow), 0, 0.28, 0));
  for (const x of [-0.32, 0.32]) g.add(at(box(0.1, 0.12, 0.05, M.yellow, 0.02), x, 0.1, 0.17));
  g.add(at(jadLabel(0.46, 0.13), 0, -0.1, 0.162));
  return g;
}
function level() {
  const g = new THREE.Group();
  g.add(box(1.2, 0.14, 0.07, M.yellow, 0.02));
  for (const x of [-0.58, 0.58]) g.add(at(box(0.08, 0.16, 0.09, M.green, 0.02), x, 0, 0));
  g.add(at(cyl(0.03, 0.14, new THREE.MeshPhysicalMaterial({ color: 0x7ee08a, transmission: 0.6, roughness: 0.1 }), 16), 0, 0, 0, 0, 0, Math.PI / 2));
  both(g, () => at(jadLabel(0.28, 0.08), -0.3, 0, 0), 0.036);
  return g;
}
function wrench() {
  const g = new THREE.Group();
  g.add(box(0.75, 0.1, 0.05, M.steel, 0.02));
  g.add(at(box(0.36, 0.11, 0.06, M.green, 0.03), -0.22, 0, 0));
  g.add(at(box(0.2, 0.26, 0.06, M.steel, 0.03), 0.42, 0.04, 0));
  g.add(at(box(0.1, 0.08, 0.07, M.steel, 0.01), 0.52, 0.18, 0));
  g.add(at(cyl(0.035, 0.08, M.gold, 16), 0.36, -0.04, 0, Math.PI / 2, 0, 0));
  return g;
}
function bits() {
  const g = new THREE.Group();
  g.add(box(0.7, 0.4, 0.12, M.green, 0.04));
  for (let i = 0; i < 9; i++) g.add(at(cyl(0.018, 0.26 - i * 0.012, i % 2 ? M.gold : M.steel, 10), -0.28 + i * 0.07, 0, 0.08));
  g.add(at(new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.38, 0.04, 3, 0.02), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.05, thickness: 0.05 })), 0, 0, 0.12));
  g.add(at(box(0.7, 0.08, 0.13, M.yellow, 0.02), 0, -0.2, 0));
  return g;
}

// Each tool: id (for the name lookup), brand, builder.
const LIST = [
  ['toolbox', 'jadever', toolbox],
  ['tape', 'jadever', tape],
  ['screwdriver', 'jadever', () => screwdriver(M.green)],
  ['pliers', 'jadever', pliers],
  ['level', 'jadever', level],
  ['wrench', 'jadever', wrench],
  ['bits', 'jadever', bits],
  ['screwdriver', 'jadever', () => screwdriver(M.yellow)],
];

// Builds the stand-in tools (Jadever for now), centred and scaled so the longest side is 1.
export function buildTools() {
  return LIST.map(([id, brand, make]) => {
    const inner = make();
    const bb = new THREE.Box3().setFromObject(inner);
    const size = bb.getSize(new THREE.Vector3());
    const ctr = bb.getCenter(new THREE.Vector3());
    inner.position.sub(ctr);
    const norm = new THREE.Group();
    norm.add(inner);
    norm.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
    const g = new THREE.Group();
    g.add(norm);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.tool = g; } });
    g.userData = { id, brand, aspectH: size.y / Math.max(size.x, size.y, size.z) };
    return g;
  });
}

// Real TOTAL product photos (transparent cut-outs from the TOTAL catalogue),
// shown as flat cards in the 3D scene. Order = shelf slots, bottom row first.
const TOTAL_PHOTOS = [
  ['breaker', 495, 255], ['hammer', 430, 378], ['impactDrill', 448, 616],
  ['drill', 408, 496], ['grinder', 488, 332], ['impactWrench', 318, 498],
  ['battery', 332, 239], ['charger', 343, 271], ['blower', 478, 233],
];
const loader = new THREE.TextureLoader();
const gltf = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/draco/'));
// Real TOTAL artwork stuck over the AI model's garbled text, on both sides.
// y, z, w, h are in the raw model's units (measured in /viewer.html?src=hf).
export const DRILL_PATCHES = [
  { img: '/products/total/decals/drill_logo.png', y: 0.333, z: 0.173, w: 0.23, h: 0.075 },
  { img: '/products/total/decals/drill_label.png', y: -0.39, z: 0.166, w: 0.42, h: 0.17 },
];
export function patchLabels(root, patches) {
  root.updateMatrixWorld(true);
  const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
  const ray = new THREE.Raycaster(), helper = new THREE.Object3D();
  for (const pt of patches) {
    const tex = loader.load(pt.img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    for (const side of [-1, 1]) {
      ray.set(new THREE.Vector3(side * 3, pt.y, pt.z), new THREE.Vector3(-side, 0, 0));
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit) continue;
      helper.position.copy(hit.point);
      helper.lookAt(hit.point.clone().add(new THREE.Vector3(side, 0, 0)));
      const geo = new DecalGeometry(hit.object, hit.point, helper.rotation, new THREE.Vector3(pt.w, pt.h, 0.12));
      const dm = new THREE.Mesh(geo, mat); dm.renderOrder = 3;
      root.add(dm);
    }
  }
}

// Centre a model and scale its longest side to 1 (Higgsfield models come in any size).
function normalise(obj) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = 1 / Math.max(size.x, size.y, size.z);
  obj.scale.setScalar(k); obj.position.copy(c).multiplyScalar(-k);
}
export function buildPhotoCards(maxAniso = 8) {
  return TOTAL_PHOTOS.map(([id, w, h]) => {
    const tex = loader.load(`/products/total/${id}.png`);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    const m = Math.max(w, h);
    const geo = new THREE.PlaneGeometry(w / m, h / m);
    // Unlit, so the photo keeps TOTAL's exact colours.
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.35 });
    const g = new THREE.Group();
    g.add(mesh);
    mesh.userData.tool = g;
    g.userData = { id, brand: 'total', card: true, aspectH: h / m };
    // Swap the flat photo for the Blender model (same photo, with real depth)
    // once it has loaded. Built by tools/blender_photo_to_3d.py.
    // The drill uses the Higgsfield (Tripo) model with the real TOTAL logo patched on.
    // QA: ?drill=blender shows the free Blender version instead.
    const hf = id === 'drill' && new URLSearchParams(location.search).get('drill') !== 'blender';
    gltf.load(hf ? '/products/total/3d-hf/drill.glb' : `/products/total/3d/${id}.glb`, (res) => {
      if (hf) patchLabels(res.scene, DRILL_PATCHES);
      if (hf) { res.scene.rotation.y = Math.PI / 2; const w = new THREE.Group(); w.add(res.scene); normalise(w); res.scene = w; }
      const model = res.scene;
      model.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = false; o.userData.tool = g;
        const mt = o.material;
        if (!hf) { mt.roughness = 0.45; mt.metalness = 0; }
        mt.envMapIntensity = hf ? 0.9 : 0.55;
        // keep TOTAL's colours bright under the scene lights
        if (!hf) { mt.emissive = new THREE.Color(0xffffff); mt.emissiveMap = mt.map; mt.emissiveIntensity = 0.06; }
        if (mt.map) mt.map.anisotropy = maxAniso;
        mt.needsUpdate = true;
      });
      g.remove(mesh); mesh.geometry.dispose();
      g.add(model);
    });
    return g;
  });
}

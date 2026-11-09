// The tools in the 3D home scene, built from real TOTAL and Jadever product photos.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

// Real TOTAL product photos (transparent cut-outs from the TOTAL catalogue),
// shown as flat cards in the 3D scene. Order = shelf slots, bottom row first.
const TOTAL_PHOTOS = [
  ['breaker', 495, 255], ['hammer', 430, 378], ['impactDrill', 448, 616],
  ['drill', 408, 496], ['grinder', 488, 332], ['impactWrench', 318, 498],
  ['battery', 332, 239], ['charger', 343, 271], ['blower', 478, 233],
];
// Where each one leads in the shop: a search when the catalogue has matching products,
// otherwise its category.
const TOTAL_CAT = { breaker: 'power', hammer: 'power', impactDrill: 'power', drill: 'power', grinder: 'power', impactWrench: 'power', battery: 'accessories', charger: 'accessories', blower: 'power' };
const TOTAL_SHOP = {
  drill: { q: 'drill' }, hammer: { q: 'rotary hammer' }, grinder: { q: 'grinder' }, impactDrill: { q: 'impact drill' },
  charger: { q: 'charger' }, blower: { q: 'blower' }, breaker: { cat: 'power' }, impactWrench: { cat: 'power' }, battery: { cat: 'accessories' },
};
// Model codes in the catalogue, for prices on the shelf.
const TOTAL_CODE = { drill: 'TDLI200528', hammer: 'TH308268', grinder: 'TG513326', impactDrill: 'TIDLI209681', charger: 'TFCLI2001', blower: 'TABLI200181' };
const loader = new THREE.TextureLoader();
const gltf = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/draco/'));
// Real TOTAL artwork stuck over the AI model's garbled text, on both sides.
// y, z, w, h are in the raw model's units (measured in /viewer?src=hf).
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
    g.userData = { id, brand: 'total', card: true, aspectH: h / m, fill: Math.min(w, h) / m, cat: TOTAL_CAT[id], shop: TOTAL_SHOP[id], code: TOTAL_CODE[id] };
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
      g.userData.ready = true;
    }, undefined, () => { g.userData.ready = true; });
    return g;
  });
}

// Real Jadever product photos, cut out by tools/cut_jadever_photos.py:
// [code, catalogue id, name, category, width, height]. Order = shelf slots, bottom row first.
const JADEVER_PHOTOS = [
  ['JDFA55350', 'jadever-orbital-sander-350w-jadever-jdfa55350', 'Orbital Sander 350W', 'power', 490, 297],
  ['JDRYP1504', 'jadever-mini-grinder-jadever-jdryp1504', 'Mini Grinder', 'power', 430, 312],
  ['JDWB1F01', 'jadever-wheelbarrow-jadever-jdwb1f01', 'Wheelbarrow', 'construction', 485, 325],
  ['JDLYP546', 'jadever-cordless-hedge-trimmer-20v-jadever-jdlyp546', 'Cordless Hedge Trimmer 20V', 'garden', 494, 254],
  ['JDWH2501', 'jadever-auto-darkening-welding-helmet-jadever-jdwh2501', 'Auto-Darkening Welding Helmet', 'welding', 491, 609],
  ['JDGA4611', 'jadever-plastic-air-blow-gun-jadever-jdga4611', 'Plastic Air Blow Gun', 'air', 170, 361],
  ['JDSS1302', 'jadever-2-piece-screwdriver-set-jadever-jdss1302', '2-Piece Screwdriver Set', 'hand', 322, 308],
  ['JDCV4401', 'jadever-cordless-screwdriver-jadever-jdcv4401', 'Cordless Screwdriver', 'power', 377, 299],
];
// Gives a flat cut-out photo real depth: the surface swells from its outline, thickest in the
// middle and rounded at the edge, like tools/blender_photo_to_3d.py but built in the browser.
function inflate(image, w, h, depth = 0.09) {
  const cols = 90, rows = Math.max(12, Math.round(cols * (h / w)));
  const cv = document.createElement('canvas'); cv.width = cols + 1; cv.height = rows + 1;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0, cols + 1, rows + 1);
  const alpha = g.getImageData(0, 0, cols + 1, rows + 1).data;
  // Distance of every point from the outline (two sweeps across the grid).
  const W = cols + 1, H = rows + 1, far = 1e6, dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = alpha[i * 4 + 3] > 90 ? far : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
    if (y > 0) dist[i] = Math.min(dist[i], dist[i - W] + 1);
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (x < W - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
    if (y < H - 1) dist[i] = Math.min(dist[i], dist[i + W] + 1);
  }
  const geo = new THREE.PlaneGeometry(w, h, cols, rows), pos = geo.attributes.position, reach = Math.max(4, cols * 0.13);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, dist[i] / reach);
    pos.setZ(i, Math.sqrt(1 - (1 - t) * (1 - t)) * depth);
  }
  geo.computeVertexNormals();
  return geo;
}
export function buildJadeverCards(maxAniso = 8) {
  return JADEVER_PHOTOS.map(([code, productId, name, cat, w, h]) => {
    const m = Math.max(w, h), g = new THREE.Group();
    const flat = new THREE.PlaneGeometry(w / m, h / m);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(flat, mat);
    mesh.userData.tool = g;
    g.add(mesh);
    g.userData = { id: code, name, cat, brand: 'jadever', card: true, aspectH: h / m, fill: Math.min(w, h) / m, shop: { open: productId } };
    loader.load(`/products/jadever/${code}.png`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
      const solid = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45, metalness: 0, envMapIntensity: 0.55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.06 });
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
      const geo = inflate(tex.image, w / m, h / m);
      const front = new THREE.Mesh(geo, solid), back = new THREE.Mesh(geo, solid);
      back.scale.z = -1;
      for (const part of [front, back]) { part.castShadow = true; part.customDepthMaterial = depth; part.userData.tool = g; g.add(part); }
      g.remove(mesh); flat.dispose(); mat.dispose();
      g.userData.ready = true;
    }, undefined, () => { g.userData.ready = true; });
    return g;
  });
}

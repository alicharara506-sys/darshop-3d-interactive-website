// Interactive 3D category carousel for the brand shop pages.
// A ring of floating tiles, one per category, each showing a real product photo.
// Drag / swipe turns the ring and it snaps to the nearest tile; tapping a tile
// (or the arrows) brings it to the front. The front tile is the selected category.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const TILE_W = 1.0, TILE_H = 1.18;

function tileTexture(item, accent, rtl) {
  const W = 512, H = 604;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const draw = (img) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(0, 0, W, H, 44); g.fill();
    if (img) {
      const box = 380, k = Math.min(box / img.width, box / img.height);
      const w = img.width * k, h = img.height * k;
      g.drawImage(img, (W - w) / 2, 34 + (box - h) / 2, w, h);
    } else if (item.logo) {
      // "All products" tile: DAR mark
      g.font = '800 120px Montserrat, Arial'; g.textAlign = 'left';
      const tw = g.measureText('DAR').width, x0 = (W - (90 + tw)) / 2; // centre circle + line + word
      g.strokeStyle = '#ff5a1f'; g.lineWidth = 10; g.beginPath(); g.arc(x0 + 26, 140, 24, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#ff5a1f'; g.fillRect(x0 + 62, 100, 16, 230);
      g.fillStyle = '#15171a'; g.fillText('DAR', x0 + 90, 250);
    }
    g.fillStyle = accent; g.fillRect(40, 440, W - 80, 6);
    g.fillStyle = '#15171a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.direction = rtl ? 'rtl' : 'ltr';
    const font = rtl ? 'Cairo' : 'Montserrat';
    let size = 46; g.font = `800 ${size}px ${font}, Arial`;
    while (g.measureText(item.label).width > W - 60 && size > 28) { size -= 2; g.font = `800 ${size}px ${font}, Arial`; }
    g.fillText(item.label, W / 2, 500);
    g.fillStyle = '#8b8e93'; g.font = `600 30px ${font}, Arial`; g.fillText(item.sub, W / 2, 556);
  };
  draw(null);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  if (item.img) {
    const img = new Image();
    img.onload = () => { draw(img); tex.needsUpdate = true; };
    img.src = item.img;
  }
  return tex;
}

export function createCategoryCarousel(host, { onSelect }) {
  const canvas = document.createElement('canvas');
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 4, 6); scene.add(key);
  const ring = new THREE.Group(); scene.add(ring);

  let items = [], tiles = [], step = 1, R = 2.4;
  let rot = 0, target = 0, active = 0, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clear() {
    for (const t of tiles) { t.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.map?.dispose(); o.material.dispose(); } }); ring.remove(t); }
    tiles = [];
  }

  // items: [{ key, label, sub, img, logo }]
  function setItems(list, accent, activeKey, rtl) {
    clear();
    items = list;
    step = (Math.PI * 2) / Math.max(items.length, 1);
    R = Math.max(2.1, (items.length * TILE_W * 1.32) / (Math.PI * 2));
    items.forEach((it, i) => {
      const g = new THREE.Group();
      const slab = new THREE.Mesh(new RoundedBoxGeometry(TILE_W, TILE_H, 0.06, 4, 0.05), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.45 }));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(TILE_W, TILE_H), new THREE.MeshBasicMaterial({ map: tileTexture(it, accent, rtl), transparent: true, toneMapped: false }));
      face.position.z = 0.032;
      g.add(slab, face);
      g.userData.index = i;
      const a = i * step;
      g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      g.rotation.y = a;
      ring.add(g); tiles.push(g);
    });
    active = Math.max(0, items.findIndex(it => it.key === activeKey));
    rot = target = active * step;
    resize();
  }

  function go(i, notify = true) {
    const n = items.length; if (!n) return;
    // shortest way round
    const cur = Math.round(target / step);
    let d = ((i - cur) % n + n) % n; if (d > n / 2) d -= n;
    target = (cur + d) * step;
    active = ((i % n) + n) % n;
    if (notify) onSelect(items[active].key, active);
  }
  const next = (dir) => go(active + dir);

  // ----- drag / swipe / tap -----
  let down = null, moved = 0;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, rot: target }; moved = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - down.x; moved = Math.max(moved, Math.abs(dx));
    target = down.rot - dx * 0.0075 * (document.documentElement.dir === 'rtl' ? -1 : 1);
  });
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    down = null;
    if (moved < 6) {
      const r = canvas.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(tiles, true)[0];
      if (hit) { let o = hit.object; while (o.parent && o.userData.index === undefined) o = o.parent; return go(o.userData.index); }
      return;
    }
    const i = Math.round(target / step);
    target = i * step;
    const n = items.length, idx = ((i % n) + n) % n;
    if (idx !== active) { active = idx; onSelect(items[active].key, active); }
  });
  canvas.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return; // let the page scroll vertically
    e.preventDefault(); next(e.deltaX > 0 ? 1 : -1);
  }, { passive: false });

  function resize() {
    const w = host.clientWidth, h = canvas.clientHeight || 260;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // Frame the front tile and its neighbours; phones see a bit less of the ring.
    const dist = R + (w < 600 ? 3.1 : 2.9);
    camera.position.set(0, 0.32, dist);
    camera.lookAt(0, -0.05, R * 0.55);
  }
  addEventListener('resize', resize);

  const clock = new THREE.Clock();
  (function loop() {
    const t = clock.getElapsedTime();
    rot += (target - rot) * (reduced ? 1 : 0.12);
    ring.rotation.y = -rot;
    tiles.forEach((g, i) => {
      // how close this tile is to the front (1 = front, 0 = far)
      const a = i * step - rot;
      const front = (Math.cos(a) + 1) / 2;
      const k = Math.pow(front, 3);
      g.scale.setScalar(0.78 + k * 0.32);
      g.position.y = reduced ? 0 : Math.sin(t * 1.3 + i) * 0.05 * (1 - k) + k * 0.06;
      g.children[1].material.opacity = 0.35 + front * 0.65;
    });
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();

  return { setItems, next, go: (i) => go(i, false), resize };
}

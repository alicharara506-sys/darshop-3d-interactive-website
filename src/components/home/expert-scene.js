import {
  Box3, DirectionalLight, Group, HemisphereLight, NoToneMapping, OrthographicCamera,
  Scene, Vector2, Vector3, WebGLRenderer, MathUtils,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const MODEL = '/mascot/dar-expert.glb';

function releaseModel(model) {
  const resources = new Set();
  model.traverse(object => {
    if (!object.isMesh) return;
    resources.add(object.geometry);
    for (const material of [object.material].flat()) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  for (const resource of resources) resource.dispose();
}

// The reconstruction is one textured surface. Weight the head turn across the collar.
function addHeadMotion(material, gaze) {
  material.onBeforeCompile = shader => {
    shader.uniforms.expertGaze = gaze;
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nuniform vec2 expertGaze;\n' +
      'vec3 expertRotate(vec3 v, vec2 angle) {\n' +
      '  vec2 s = sin(angle), c = cos(angle);\n' +
      '  v.yz = vec2(v.y*c.y-v.z*s.y, v.y*s.y+v.z*c.y);\n' +
      '  return vec3(v.x*c.x+v.z*s.x, v.y, -v.x*s.x+v.z*c.x);\n' +
      '}\n');
    const rotation = 'vec2 headRotation = expertGaze * smoothstep(0.64, 0.77, position.y);';
    shader.vertexShader = shader.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + rotation +
        '\nobjectNormal = expertRotate(objectNormal, headRotation);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' +
        'vec3 neck = vec3(0., .69, -.025);\n' +
        'transformed = neck + expertRotate(transformed - neck, headRotation);');
  };
}

export async function mountExpert(stage, viewport, signal, onUnavailable) {
  const decoder = new DRACOLoader().setDecoderPath('/draco/').setWorkerLimit(1);
  let renderer, model;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    const response = await fetch(MODEL, { signal });
    if (!response.ok) throw new Error('Unable to load the DAR Expert');
    const data = await response.arrayBuffer();
    if (signal.aborted) throw signal.reason;
    const gltf = await new GLTFLoader().setDRACOLoader(decoder).parseAsync(data, '/mascot/');
    model = gltf.scene;
    if (signal.aborted) throw signal.reason;
  } catch (error) {
    if (model) releaseModel(model);
    renderer?.dispose();
    throw error;
  } finally {
    decoder.dispose();
  }

  const scene = new Scene();
  const pivot = new Group();
  const head = { value: new Vector2() };
  model.rotation.y = -Math.PI / 2;
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  center.y = bounds.min.y;
  const scale = 1 / size.y;

  // Bake the front-facing coordinates into the mesh so the shader can use the collar position.
  model.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.applyMatrix4(object.matrixWorld);
    object.geometry.translate(-center.x, -center.y, -center.z);
    object.geometry.scale(scale, scale, scale);
    for (const material of [object.material].flat()) {
      material.roughness = .92;
      material.metalness = 0;
      material.emissive.setHex(0xffffff);
      material.emissiveMap = material.map;
      material.emissiveIntensity = .67;
      addHeadMotion(material, head);
    }
  });
  // The input is a single mesh. Reset its imported transform after baking it.
  const parts = [];
  model.traverse(object => { if (object.isMesh) parts.push(object); });
  for (const part of parts) {
    pivot.add(part);
    part.position.set(0, 0, 0);
    part.quaternion.identity();
    part.scale.setScalar(1);
  }
  scene.add(pivot);
  scene.add(new HemisphereLight('#fff7ee', '#cdc2b4', .62));
  const light = new DirectionalLight('#fff7ed', .73);
  light.position.set(-2, 4, 4);
  scene.add(light);
  const fill = new DirectionalLight('#edf3ff', .39);
  fill.position.set(3, 1, -1);
  scene.add(fill);

  const camera = new OrthographicCamera(-.62, .62, 1.08, -.06, .1, 20);
  camera.position.set(0, .52, 5);
  camera.lookAt(0, .52, 0);
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = NoToneMapping;
  viewport.append(renderer.domElement);

  const events = new AbortController();
  const options = { signal: events.signal, passive: true };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const gaze = new Vector2();
  let angle = 0;
  let frame = 0;
  let last = 0;
  let pointer = null;
  let timeout = 0;
  let visible = true;

  function queue() {
    if (visible && !frame) frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    const dt = last ? Math.min(48, now - last) : 16;
    last = now;
    const blend = reduced.matches ? 1 : 1 - Math.exp(-dt / 120);
    head.value.lerp(gaze, blend);
    pivot.rotation.y = MathUtils.lerp(pivot.rotation.y, angle, blend);
    renderer.render(scene, camera);
    stage.dataset.headTurn = head.value.x.toFixed(3);
    stage.dataset.modelTurn = pivot.rotation.y.toFixed(3);
    if (head.value.distanceToSquared(gaze) > .000008 || Math.abs(pivot.rotation.y - angle) > .003) queue();
    else last = 0;
  }
  function centerHead() {
    gaze.set(0, 0);
    queue();
  }
  function aim(event) {
    if (reduced.matches || event.target.closest('[data-expert-angle]')) return;
    const box = viewport.getBoundingClientRect();
    gaze.set(
      MathUtils.clamp((event.clientX - box.left - box.width / 2) / (box.width * .43), -1, 1) * .26,
      MathUtils.clamp((event.clientY - box.top - box.height * .19) / (box.height * .55), -1, 1) * .105,
    );
    queue();
  }
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || event.pointerId === pointer) aim(event);
  }, options);
  stage.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') centerHead(); }, options);
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !event.isPrimary || event.target.closest('[data-expert-angle]')) return;
    clearTimeout(timeout);
    pointer = event.pointerId;
    stage.setPointerCapture(pointer);
    aim(event);
  }, options);
  stage.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    timeout = setTimeout(centerHead, 310);
  }, options);
  stage.addEventListener('pointercancel', () => { pointer = null; centerHead(); }, options);
  window.addEventListener('blur', centerHead, options);
  reduced.addEventListener('change', centerHead, { signal: events.signal });
  renderer.domElement.addEventListener('webglcontextlost', () => { visible = false; onUnavailable(); }, options);

  function fit() {
    const { clientWidth: width, clientHeight: height } = viewport;
    if (!width || !height) return;
    const halfHeight = Math.max(.56, .37 * height / width);
    const halfWidth = halfHeight * width / height;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    queue();
  }
  const resize = new ResizeObserver(fit);
  resize.observe(viewport);
  fit();
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) queue();
    else gaze.set(0, 0);
  });
  visibility.observe(stage);

  return {
    turn(side) {
      angle = side ? Math.PI * .46 : 0;
      centerHead();
    },
    dispose() {
      events.abort();
      resize.disconnect();
      visibility.disconnect();
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      releaseModel(pivot);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

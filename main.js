import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { contactShadow, blurShadow } from "./contactShadow.js";
import { initSidebar } from "./sidebar.js";
import { MetricsTracker } from "./metrics.js";

// --- Sidebar ---

const sidebar = initSidebar((categoryId, option) => {
  if (categoryId === "leather") {
    applyLeather(option);
  }
});

// --- Renderer ---

const viewport = document.getElementById("viewport");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
viewport.appendChild(renderer.domElement);

// --- Metrics ---

const metrics = new MetricsTracker(renderer);

// --- Scene ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeff2);

// --- Camera ---

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 2, 5);

// --- Controls ---

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Lighting (hookerfurniture-pwa SSW preset) ---

const spotLight = new THREE.DirectionalLight(0xffffff, 0.6);
spotLight.position.set(0, 22, 14);
scene.add(spotLight);

const shadowLight = new THREE.DirectionalLight(0xffffff, 0.8);
shadowLight.position.set(5, 3, 13);
shadowLight.castShadow = true;
shadowLight.shadow.bias = -0.0001;
shadowLight.shadow.radius = 20;
shadowLight.shadow.mapSize.set(2048, 2048);
scene.add(shadowLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
backLight.position.set(0, 0, -30);
backLight.castShadow = true;
backLight.shadow.bias = -0.0001;
backLight.shadow.radius = 20;
backLight.shadow.mapSize.set(2048, 2048);
scene.add(backLight);

const cameraLight = new THREE.DirectionalLight(0xffffff, 1);
cameraLight.position.set(4, 2, 2);
camera.add(cameraLight);
scene.add(camera);

const ambientLight = new THREE.AmbientLight(0x161616, 0.0035);
scene.add(ambientLight);

// --- HDR environment ---

new RGBELoader().load("/hdr.hdr", (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr;
  scene.environmentIntensity = 0.45;
});

// --- Material name helpers (ported from hookerfurniture-pwa core.js) ---

function materialWithBake(name) {
  const primary = [
    "arm", "back_inside_cushion", "back", "front", "wing", "seat",
    "throw_pillow", "ottoman", "headrest", "console", "main",
    "extra_border", "outwing", "arm_panel"
  ];
  const secondary = ["inside", "outside", "top", "bottom", "footrest", "trim", "cushion"];
  const tertiary = ["band", "face", "panel", "sling", "gimp", "border", "complete"];

  if (tertiary.includes(name)) return false;

  const matchedPrimary = primary.find(p => name === p || name.startsWith(p + "_"));
  if (!matchedPrimary) return false;

  const rest = name.slice(matchedPrimary.length).replace(/^_/, "");
  const parts = rest ? rest.split("_") : [];

  if (parts.length === 0) return true;
  if (parts.length === 1) {
    const [p1] = parts;
    return primary.includes(p1) || secondary.includes(p1) || tertiary.includes(p1);
  }
  if (parts.length === 2) {
    const [p1, p2] = parts;
    return secondary.includes(p1) && tertiary.includes(p2);
  }
  return false;
}

function materialFallbacksOnMain(name) {
  const primary = [
    "back_pillows", "front_pillows", "throw_pillow", "back_inside_cushion",
    "arm", "back", "front", "wing", "seat", "ottoman", "headrest", "console",
    "main", "extra_border", "outwing", "arm_panel", "curtain"
  ];
  const secondary = ["inside", "outside", "top", "bottom", "footrest", "trim", "cushion"];
  const tertiary = [
    "welt", "welt_fixed", "flange", "button", "unfinished",
    "band", "face", "panel", "sling", "gimp", "border", "complete"
  ];

  if (name === "welt" || name === "button" || name.includes("welt")) return true;
  if (tertiary.includes(name)) return false;

  const matchedPrimary = primary.find(p => name === p || name.startsWith(p + "_"));
  if (!matchedPrimary) return false;

  const rest = name.slice(matchedPrimary.length).replace(/^_/, "");
  const parts = rest ? rest.split("_") : [];

  if (parts.length === 0) return true;
  if (parts.length === 1) {
    const [p1] = parts;
    return primary.includes(p1) || secondary.includes(p1) || tertiary.includes(p1);
  }
  if (parts.length === 2) {
    const [p1, p2] = parts;
    return secondary.includes(p1) && tertiary.includes(p2);
  }
  return false;
}

// --- Load baked maps ---

function loadTexture(path) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(path, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.flipY = false;
      tex.colorSpace = THREE.NoColorSpace;
      resolve(tex);
    });
  });
}

const SKU = "641-25";

const leatherBake = {
  normalMap: await loadTexture(`/${SKU}/${SKU}_LEATHER_Normal.jpg`),
  aoMap:     await loadTexture(`/${SKU}/${SKU}_LEATHER_AO.jpg`),
};

// --- Scene state ---

let loadedModel = null;

// --- Contact shadow setup ---

const shadowGroup = new THREE.Group();
shadowGroup.name = "Shadow Group";
scene.add(shadowGroup);

const shadowCamera = new THREE.OrthographicCamera();
const renderTarget = new THREE.WebGLRenderTarget(2048, 2048);
renderTarget.texture.generateMipmaps = false;

function updateContactShadow() {
  const initialBackground = scene.background;
  scene.background = null;
  const initialClearAlpha = renderer.getClearAlpha();
  renderer.setClearAlpha(0);

  if (shadowGroup.children.length > 0) {
    shadowGroup.children[0].visible = false;
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, shadowCamera);
    shadowGroup.children[0].visible = true;
  }

  blurShadow(1.1, renderTarget, shadowCamera, renderer);
  blurShadow(1.1 * 0.4, renderTarget, shadowCamera, renderer);

  renderer.setRenderTarget(null);
  renderer.setClearAlpha(initialClearAlpha);
  scene.background = initialBackground;
}

// --- Leather texture switcher ---

const leatherTexCache = {};

async function loadLeatherTextures(sku) {
  if (leatherTexCache[sku]) return leatherTexCache[sku];
  const base = `/leathers/${sku}/${sku}`;
  const [map, normalMap, roughnessMap] = await Promise.all([
    loadTexture(`${base}.jpg`),
    loadTexture(`${base}_normal.jpg`),
    loadTexture(`${base}_roughness.jpg`),
  ]);
  map.colorSpace = THREE.SRGBColorSpace;
  leatherTexCache[sku] = { map, normalMap, roughnessMap };
  return leatherTexCache[sku];
}

async function applyLeather(sku) {
  if (!loadedModel) return;
  const tex = await loadLeatherTextures(sku);

  loadedModel.traverse((node) => {
    if (!node.isMesh) return;
    const mat = node.material;
    if (!mat) return;
    if (!materialWithBake(mat.name) && !mat.name.includes('welt')) return;

    mat.map          = tex.map;
    mat.normalMap    = tex.normalMap;
    mat.roughnessMap = tex.roughnessMap;

    mat.aoMap = leatherBake.aoMap;

    if (materialFallbacksOnMain(mat.name)) {
      mat.aoMap.channel     = 1;
      mat.normalMap.channel = 0;
    }

    mat.needsUpdate = true;
  });

  updateContactShadow();
}

// --- Load model ---

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

metrics.markLoadStart();

gltfLoader.load(`/${SKU}/${SKU}.gltf`, (gltf) => {
  metrics.markLoadEnd();

  const model = gltf.scene;
  loadedModel = model;

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;

    const mat = node.material;
    if (!mat) return;

    if (materialWithBake(mat.name)) {
      mat.normalMap = leatherBake.normalMap;
      mat.aoMap     = leatherBake.aoMap;
      mat.needsUpdate = true;
    }

    if (materialFallbacksOnMain(mat.name)) {
      if (node.geometry.attributes.uv1) {
        mat.defines = mat.defines || {};
        mat.defines.USE_UV1 = "";
        mat.defines.MAP_UV1 = "uv1";
      }
      if (mat.aoMap)     mat.aoMap.channel     = 1;
      if (mat.normalMap) mat.normalMap.channel = 1;
      mat.needsUpdate = true;
    }
  });

  scene.add(model);

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.set(0, size.y * 0.5, maxDim * 1.8);
  controls.target.set(0, 0, 0);
  controls.update();

  contactShadow(model, scene, null, shadowGroup, renderTarget, shadowCamera);
  updateContactShadow();

  applyLeather("901200-87");

  metrics.markModelLoaded();
});

// --- Resize ---

function onResize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

new ResizeObserver(onResize).observe(viewport);
onResize();

// --- Animate ---

let frame = 0;

function animate() {
  requestAnimationFrame(animate);
  metrics.tick();
  controls.update();
  renderer.render(scene, camera);

  // Update metrics display every 30 frames
  if (++frame % 30 === 0) {
    sidebar.updateMetrics(metrics.snapshot());
  }
}

animate();

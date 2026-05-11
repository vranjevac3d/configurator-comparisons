import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { contactShadow, blurShadow } from "./contactShadow.js";
import { buildNails } from "./nails.js";
import { initSidebar } from "./sidebar.js";
import { MetricsTracker } from "./metrics.js";

// --- Sidebar ---

const loadingEl = document.getElementById("loading");

// --- URL params ---

const _params = new URLSearchParams(location.search);
function getParam(key, fallback) { return _params.get(key) ?? fallback; }
function navigateWithParam(key, value) {
  const p = new URLSearchParams(location.search);
  p.set(key, value);
  location.href = `?${p}`;
}

function setParam(key, value) {
  const p = new URLSearchParams(location.search);
  p.set(key, value);
  history.replaceState(null, '', `?${p}`);
}

const sidebar = initSidebar((categoryId, option) => {
  if (categoryId === "textures") {
    navigateWithParam("texture", { JPG: "jpg", WebP: "webp", KTX2: "ktx2", AVIF: "avif" }[option]);
  } else if (categoryId === "resolution") {
    navigateWithParam("res", { "2K": "2k", "1K": "1k", "512px": "512" }[option]);
  } else if (categoryId === "compression") {
    navigateWithParam("compression", { Draco: "draco", None: "none" }[option]);
  } else if (categoryId === "leather") {
    navigateWithParam("leather", option);
  } else if (categoryId === "wood") {
    navigateWithParam("wood", option);
  } else if (categoryId === "modelShadows") {
    setParam("modelShadow", option);
    setModelShadow(option);
  } else if (categoryId === "floorShadows") {
    setParam("floorShadow", option);
    setFloorShadow(option);
  } else if (categoryId === "fabrics") {
    setParam("fabric", option);
    if (seatCamPos) tweenCamera(seatCamPos, seatCamTarget);
    setFabricMode(option);
  } else if (categoryId === "envLighting") {
    setParam("envLight", option);
    setEnvLighting(option);
  } else if (categoryId === "anisotropy") {
    setParam("anisotropy", option);
    setAnisotropy(option);
  } else if (categoryId === "gtao") {
    setParam("gtao", option);
    setGTAO(option);
  }
}, {
  textures:    { jpg: "JPG", webp: "WebP", ktx2: "KTX2", avif: "AVIF" }[getParam("texture", "jpg")] ?? "JPG",
  resolution:  { "2k": "2K", "1k": "1K", "512": "512px" }[getParam("res", "2k")]                    ?? "2K",
  compression: { draco: "Draco", none: "None" }[getParam("compression", "draco")]                     ?? "Draco",
  leather:      getParam("leather", "906700-81"),
  wood:         getParam("wood", "HF Custom Bramble"),
  fabrics:      getParam("fabric", "Full PBR"),
  modelShadows: getParam("modelShadow", "Real-time"),
  floorShadows: getParam("floorShadow", "Contact"),
  envLighting:  getParam("envLight", "HDR map"),
  anisotropy:   getParam("anisotropy", "4x"),
  gtao:         getParam("gtao", "Off"),
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
scene.background = new THREE.Color(0xf0f0f4);

// --- Camera ---

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 2, 5);

// --- Post-processing ---

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const gtaoPass = new GTAOPass(scene, camera, 1, 1);
gtaoPass.output = GTAOPass.OUTPUT.Default;
gtaoPass.blendIntensity = 1.0;
gtaoPass.radius = 0.3;
gtaoPass.distanceExponent = 2;
gtaoPass.thickness = 1;
gtaoPass.scale = 1;
gtaoPass.samples = 16;
gtaoPass.enabled = getParam("gtao", "Off") === "On";
composer.addPass(gtaoPass);

composer.addPass(new OutputPass());

// --- Controls ---

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Lighting (hookerfurniture-pwa default preset) ---

const spotLight = new THREE.DirectionalLight(0xffffff, 0.6);
spotLight.position.set(0, 22, 14);
scene.add(spotLight);

const shadowLight = new THREE.DirectionalLight(0xffffff, 0.8);
shadowLight.position.set(-5, 3, 13);
shadowLight.castShadow = true;
shadowLight.shadow.bias = -0.0001;
shadowLight.shadow.radius = 20;
shadowLight.shadow.mapSize.set(2048, 2048);
scene.add(shadowLight);

const cameraLight = new THREE.DirectionalLight(0xffffff, 1);
cameraLight.position.set(-2, 2, 2);
camera.add(cameraLight);
scene.add(camera);

const ambientLight = new THREE.AmbientLight(0xffffff, getParam("envLight", "HDR map") === "Flat ambient" ? 1.0 : 0.0035);
scene.add(ambientLight);

// --- HDR environment ---

let hdrTexture = null;

new RGBELoader().load("/hdr.hdr", (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  hdrTexture = hdr;
  if (getParam("envLight", "HDR map") !== "Flat ambient") {
    scene.environment = hdr;
    scene.environmentIntensity = 0.45;
  }
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

let _ktx2Loader = null;
function getKTX2Loader() {
  if (!_ktx2Loader) {
    _ktx2Loader = new KTX2Loader();
    _ktx2Loader.setTranscoderPath('/basis/');
    _ktx2Loader.detectSupport(renderer);
  }
  return _ktx2Loader;
}

function loadTexture(path) {
  return new Promise((resolve, reject) => {
    const isKTX2 = path.endsWith('.ktx2');
    const loader = isKTX2 ? getKTX2Loader() : new THREE.TextureLoader();
    loader.load(path, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.flipY = false;
      if (!isKTX2) tex.colorSpace = THREE.NoColorSpace;
      resolve(tex);
    }, undefined, (err) => reject(new Error(`Failed to load texture: ${path}`)));
  });
}

const SKU = "641-25";

const leatherBake = {
  normalMap: await loadTexture(`/${SKU}/${SKU}_LEATHER_Normal.jpg`),
  aoMap:     await loadTexture(`/${SKU}/Baked_Shadows.png`),
  leatherAO: await loadTexture(`/${SKU}/${SKU}_LEATHER_AO.jpg`),
};

// --- Normal-blend shader (baked large-scale + tiling detail, like pwa) ---

// Neutral 1×1 white texture — used as aoMap2 when baked shadows are not active
const neutralAO = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
neutralAO.needsUpdate = true;

const aoBlendChunk = `
#ifdef USE_AOMAP
	float leatherAo = texture2D( aoMap,  vAoMapUv  ).r;
	float shadowAo  = texture2D( aoMap2, vAoMap2Uv ).r;
	float leatherOcclusion = ( leatherAo - 1.0 ) * aoMapIntensity + 1.0;
	float ambientOcclusion = leatherOcclusion * shadowAo;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT )
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN )
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
#endif
`;

const normalBlendChunk = `
#ifdef USE_NORMALMAP_OBJECTSPACE

	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;

	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif

	normal = normalize( normalMatrix * normal );

#elif defined( USE_NORMALMAP_TANGENTSPACE )

	vec3 bakeN   = texture2D( normalMap,  vNormalMapUv ).xyz * 2.0 - 1.0;
	vec3 detailN = texture2D( normalMap2, vLeatherDetailUv ).xyz * 2.0 - 1.0;
	vec3 mapN = mix( bakeN, detailN, 0.4 );
	mapN.xy *= normalScale;

	normal = normalize( tbn * mapN );

#elif defined( USE_BUMPMAP )

	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );

#endif
`;

function setupNormalBlend(mat, useUV1ForAO2 = false) {
  mat.onBeforeCompile = (shader) => {
    mat.userData.shader = shader;
    shader.uniforms.normalMap2 = { value: mat.userData.detailNormal || leatherBake.normalMap };
    shader.uniforms.aoMap2     = { value: mat.userData.pendingAoMap2 || neutralAO };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_pars_vertex>',
      '#include <uv_pars_vertex>\nvarying vec2 vLeatherDetailUv;\nvarying vec2 vAoMap2Uv;'
    );
    const ao2UvAssign = useUV1ForAO2
      ? '#ifdef USE_UV1\nvAoMap2Uv = uv1;\n#else\nvAoMap2Uv = uv;\n#endif'
      : 'vAoMap2Uv = uv;';
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>\nvLeatherDetailUv = uv * 10.0;\n${ao2UvAssign}`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normalmap_pars_fragment>',
      '#include <normalmap_pars_fragment>\nuniform sampler2D normalMap2;\nvarying vec2 vLeatherDetailUv;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <aomap_pars_fragment>',
      '#include <aomap_pars_fragment>\nuniform sampler2D aoMap2;\nvarying vec2 vAoMap2Uv;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      normalBlendChunk
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <aomap_fragment>',
      aoBlendChunk
    );
  };
}

// --- Fabric mode ---

function setFabricMode(mode) {
  currentFabric = mode;
  if (!loadedModel) return;

  const bakedShadow   = currentModelShadow === 'Baked';
  const showNormal    = mode === 'Full PBR' || mode === 'Normal Map';
  const showRoughness = mode === 'Full PBR';
  const showAO        = mode === 'Full PBR' || mode === 'AO Map';
  const aoIntensity   = mode === 'AO Map' ? 4 : 1;

  loadedModel.traverse((node) => {
    if (!node.isMesh) return;
    const mat = node.material;
    if (!mat) return;

    const isBake = materialWithBake(mat.name);
    const isWelt = !isBake && mat.name.includes('welt');
    const isWood = mat.name.includes('wood');
    if (!isBake && !isWelt && !isWood) return;

    const prevNormal    = mat.normalMap;
    const prevRoughness = mat.roughnessMap;
    const prevAoMap     = mat.aoMap;

    mat.normalMap    = showNormal    ? mat.userData.fullPBR_normalMap    ?? mat.normalMap    : null;
    mat.roughnessMap = showRoughness ? mat.userData.fullPBR_roughnessMap ?? mat.roughnessMap : null;
    if (isBake) {
      mat.aoMap = showAO ? (mat.userData.fullPBR_aoMap ?? mat.aoMap) : null;
      mat.aoMapIntensity = aoIntensity;
      const ao2 = showAO && bakedShadow && mat.userData.bakedShadowsAO
        ? mat.userData.bakedShadowsAO
        : neutralAO;
      mat.userData.pendingAoMap2 = ao2;
      if (mat.userData.shader) mat.userData.shader.uniforms.aoMap2.value = ao2;
    }

    // Only recompile when defines change (texture null↔set transitions)
    if (mat.normalMap !== prevNormal || mat.roughnessMap !== prevRoughness || mat.aoMap !== prevAoMap) {
      mat.needsUpdate = true;
    }
  });
}

// --- Shadow modes ---

function applyAllShadows() {
  const modelRT      = currentModelShadow === 'Real-time';
  const floorContact = currentFloorShadow === 'Contact';
  const floorRT      = currentFloorShadow === 'Real-time';
  const floorBaked   = currentFloorShadow === 'Baked';

  renderer.shadowMap.enabled = modelRT || floorRT;
  shadowLight.castShadow     = modelRT || floorRT;

  if (loadedModel) loadedModel.traverse(n => {
    if (n.isMesh) { n.castShadow = modelRT; n.receiveShadow = modelRT; }
  });

  if (shadowGroup) shadowGroup.visible = floorContact;
  if (floorMesh)   floorMesh.visible   = floorBaked;
  if (rtFloor)     rtFloor.visible     = floorRT;

  setFabricMode(currentFabric);
}

function setModelShadow(mode) {
  currentModelShadow = mode;
  applyAllShadows();
}

function setFloorShadow(mode) {
  currentFloorShadow = mode;
  applyAllShadows();
}

function setGTAO(mode) {
  gtaoPass.enabled = (mode === 'On');
}

// --- Env lighting mode ---

function setEnvLighting(mode) {
  if (mode === 'HDR map') {
    scene.environment = hdrTexture;
    scene.environmentIntensity = 0.45;
    ambientLight.intensity = 0.0035;
  } else if (mode === 'Flat ambient') {
    scene.environment = null;
    ambientLight.intensity = 1.0;
  }
}

// --- Anisotropy ---

function setAnisotropy(option) {
  const max   = renderer.capabilities.getMaxAnisotropy();
  const value = option === 'MAX' ? max : Math.min(parseInt(option), max);

  const seen = new Set();
  function applyTo(tex) {
    if (!tex || seen.has(tex)) return;
    seen.add(tex);
    tex.anisotropy = value;
    tex.needsUpdate = true;
  }

  if (loadedModel) {
    loadedModel.traverse(node => {
      if (!node.isMesh || !node.material) return;
      const mat = node.material;
      ['map', 'normalMap', 'roughnessMap', 'aoMap', 'emissiveMap', 'metalnessMap'].forEach(k => applyTo(mat[k]));
    });
  }

  [leatherBake.normalMap, leatherBake.aoMap, leatherBake.leatherAO].forEach(applyTo);
  if (currentLeatherTex) [currentLeatherTex.map, currentLeatherTex.normalMap, currentLeatherTex.roughnessMap].forEach(applyTo);
  if (currentWoodTex) [currentWoodTex.map, currentWoodTex.normalMap, currentWoodTex.roughnessMap].forEach(applyTo);
}

// --- Scene state ---

const player = { model: null };
window.player = player;

let loadedModel = null;
let floorMesh   = null;
let rtFloor     = null;
let currentLeather = getParam("leather", "906700-81");
let currentWood    = getParam("wood", "HF Custom Bramble");
let currentTexExt  = getParam("texture", "jpg");
let currentRes     = getParam("res", "2k");
let currentFabric      = getParam("fabric", "Full PBR");
let currentModelShadow = getParam("modelShadow", "Real-time");
let currentFloorShadow = getParam("floorShadow", "Contact");

// --- Camera tween ---

let armCamPos    = null;
let armCamTarget = null;
let seatCamPos   = null;
let seatCamTarget = null;

function tweenCamera(toPos, toTarget, duration = 500) {
  const fromPos    = camera.position.clone();
  const fromTarget = controls.target.clone();
  const startTime  = performance.now();
  (function tick(now) {
    const t    = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(fromPos, toPos, ease);
    controls.target.lerpVectors(fromTarget, toTarget, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(tick);
  })(performance.now());
}

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

let currentLeatherTex = null;

async function loadLeatherTextures(sku, ext = "jpg", res = "2k") {
  const base = `/leathers/${sku}/${res}/${sku}`;
  const [map, normalMap, roughnessMap] = await Promise.all([
    loadTexture(`${base}.${ext}`),
    loadTexture(`${base}_normal.${ext}`),
    loadTexture(`${base}_roughness.${ext}`),
  ]);
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(10, 10);
  normalMap.repeat.set(10, 10);
  roughnessMap.repeat.set(10, 10);
  return { map, normalMap, roughnessMap };
}

async function applyLeather(sku) {
  currentLeather = sku;
  if (!loadedModel) return;
  const tex = await loadLeatherTextures(sku, currentTexExt, currentRes);
  if (currentLeatherTex) {
    currentLeatherTex.map.dispose();
    currentLeatherTex.normalMap.dispose();
    currentLeatherTex.roughnessMap.dispose();
  }
  currentLeatherTex = tex;

  loadedModel.traverse((node) => {
    if (!node.isMesh) return;
    const mat = node.material;
    if (!mat) return;

    const isBake = materialWithBake(mat.name);
    const isWelt = !isBake && mat.name.includes('welt');
    if (!isBake && !isWelt) return;

    mat.map          = tex.map;
    mat.roughnessMap = tex.roughnessMap;
    mat.needsUpdate  = true;

    if (isBake) {
      // Keep mat.normalMap = baked normal (set in model load).
      // Deliver the tiling leather detail via normalMap2 uniform.
      mat.userData.detailNormal         = tex.normalMap;
      mat.userData.fullPBR_roughnessMap = tex.roughnessMap;
      if (mat.userData.shader) {
        mat.userData.shader.uniforms.normalMap2.value = tex.normalMap;
      }
    } else {
      // Welt: no bake setup, just assign the tiling normal directly
      mat.normalMap                     = tex.normalMap;
      mat.normalMap.channel             = 0;
      mat.userData.fullPBR_normalMap    = tex.normalMap;
      mat.userData.fullPBR_roughnessMap = tex.roughnessMap;
      mat.needsUpdate                   = true;
    }
  });

  setFabricMode(currentFabric);
}

// --- Wood texture switcher ---

let currentWoodTex = null;

async function loadWoodTextures(name, ext = "jpg", res = "2k") {
  const base = `/wood/${name}/${res}/${name}`;
  const [map, normalMap, roughnessMap] = await Promise.all([
    loadTexture(`${base}.${ext}`),
    loadTexture(`${base}_normal.${ext}`),
    loadTexture(`${base}_roughness.${ext}`),
  ]);
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(10, 10);
  normalMap.repeat.set(10, 10);
  roughnessMap.repeat.set(10, 10);
  return { map, normalMap, roughnessMap };
}

async function applyWood(name) {
  currentWood = name;
  if (!loadedModel) return;
  const tex = await loadWoodTextures(name, currentTexExt, currentRes);
  if (currentWoodTex) {
    currentWoodTex.map.dispose();
    currentWoodTex.normalMap.dispose();
    currentWoodTex.roughnessMap.dispose();
  }
  currentWoodTex = tex;
  loadedModel.traverse((node) => {
    if (!node.isMesh) return;
    const mat = node.material;
    if (!mat || !mat.name.includes("wood")) return;
    mat.map                           = tex.map;
    mat.normalMap                     = tex.normalMap;
    mat.roughnessMap                  = tex.roughnessMap;
    mat.userData.fullPBR_normalMap    = tex.normalMap;
    mat.userData.fullPBR_roughnessMap = tex.roughnessMap;
    mat.needsUpdate                   = true;
  });
  setFabricMode(currentFabric);
}

// --- Load model ---

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const modelCache = {};

function cloneScene(source) {
  const clone = source.clone(true);
  clone.traverse(node => {
    if (!node.isMesh || !node.material) return;
    node.material = Array.isArray(node.material)
      ? node.material.map(m => m.clone())
      : node.material.clone();
  });
  return clone;
}

async function loadAndSetupModel(path) {
  loadingEl.classList.remove('hidden');
  metrics.reset();
  metrics.markLoadStart();

  if (loadedModel) {
    scene.remove(loadedModel);
    loadedModel.traverse(n => { if (n.isMesh) n.geometry.dispose(); });
    loadedModel = null;
    player.model = null;
  }

  if (floorMesh) { scene.remove(floorMesh); floorMesh = null; }
  if (rtFloor)   { scene.remove(rtFloor);   rtFloor   = null; }

  while (shadowGroup.children.length) {
    const c = shadowGroup.children[0];
    c.geometry?.dispose();
    c.material?.dispose();
    shadowGroup.remove(c);
  }

  if (!modelCache[path]) {
    modelCache[path] = await new Promise((resolve, reject) =>
      gltfLoader.load(path, resolve, undefined, reject)
    );
  }

  metrics.markLoadEnd();

  const model = cloneScene(modelCache[path].scene);
  loadedModel  = model;
  player.model = model;

  const box    = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow    = true;
    node.receiveShadow = true;

    const mat = node.material;
    if (!mat) return;

    if (materialWithBake(mat.name)) {
      const isFallback = materialFallbacksOnMain(mat.name);
      const hasUV1     = isFallback && !!node.geometry.attributes.uv1;
      const isArm      = mat.name === 'arm' || mat.name.startsWith('arm_');

      if (hasUV1) {
        const n = leatherBake.normalMap.clone(); n.channel = 1;
        mat.normalMap = n;
        const ao = leatherBake.leatherAO.clone(); ao.channel = 1;
        mat.aoMap = ao;
      } else {
        mat.normalMap = leatherBake.normalMap;
        mat.aoMap     = leatherBake.leatherAO;
      }
      if (!isArm) mat.userData.bakedShadowsAO = leatherBake.aoMap;

      mat.userData.fullPBR_normalMap = mat.normalMap;
      mat.userData.fullPBR_aoMap     = mat.aoMap;
      mat.userData.pendingAoMap2     = neutralAO;
      setupNormalBlend(mat, hasUV1);
      mat.needsUpdate = true;
    }
  });

  buildNails(model);
  scene.add(model);

  const size   = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (!armCamPos) {
    const defaultCamPos    = new THREE.Vector3(0, size.y * 0.5, maxDim * 1.8);
    const defaultCamTarget = new THREE.Vector3(0, 0, 0);
    camera.position.copy(defaultCamPos);
    controls.target.copy(defaultCamTarget);
    controls.update();

    armCamTarget  = new THREE.Vector3(-size.x * 0.38, size.y * 0.15, size.z * 0.1);
    armCamPos     = new THREE.Vector3(-size.x * 0.5,  size.y * 0.3,  size.z * 0.55);
    seatCamTarget = new THREE.Vector3(0, size.y * 0.12, size.z * 0.15);
    seatCamPos    = new THREE.Vector3(0, size.y * 0.65, size.z * 0.7);

    document.getElementById('btn-reset-cam').addEventListener('click', () => {
      tweenCamera(defaultCamPos, defaultCamTarget);
    });
  }

  const floorTex = await loadTexture(`/${SKU}/Floor.png`);
  floorTex.flipY = true;
  floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, blending: THREE.MultiplyBlending, depthWrite: false })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -size.y / 2;
  scene.add(floorMesh);

  rtFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(size.x * 4, size.z * 4),
    new THREE.ShadowMaterial({ opacity: 0.35 })
  );
  rtFloor.rotation.x = -Math.PI / 2;
  rtFloor.position.y = -size.y / 2;
  rtFloor.receiveShadow = true;
  scene.add(rtFloor);

  contactShadow(model, scene, null, shadowGroup, renderTarget, shadowCamera);
  updateContactShadow();

  await applyLeather(currentLeather);
  await applyWood(currentWood);
  applyAllShadows();
  setAnisotropy(getParam("anisotropy", "4x"));

  loadingEl.classList.add('hidden');
  metrics.markModelLoaded();
}

await loadAndSetupModel(
  getParam("compression", "draco") === "none"
    ? `/${SKU}/${SKU}-no-compression.gltf`
    : `/${SKU}/${SKU}.gltf`
);

// --- Resize ---

function onResize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  gtaoPass.setSize(w, h);
}

new ResizeObserver(onResize).observe(viewport);
onResize();

// --- Animate ---

let frame = 0;

function animate() {
  requestAnimationFrame(animate);
  metrics.tick();
  controls.update();
  composer.render();

  // Update metrics display every 30 frames
  if (++frame % 30 === 0) {
    sidebar.updateMetrics(metrics.snapshot());
  }
}

animate();

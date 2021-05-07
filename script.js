import * as THREE from "../build/three.module.js";

import { OrbitControls } from "./jsm/controls/OrbitControls.js";
import { EffectComposer } from "./jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "./jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "./jsm/postprocessing/UnrealBloomPass.js";
import { CSS2DRenderer, CSS2DObject } from "./jsm/renderers/CSS2DRenderer.js";

const bloomLayer = new THREE.Layers();
bloomLayer.set(1);

const params = {
  exposure: 2,
  bloomStrength: 10,
  bloomThreshold: 0,
  bloomRadius: 1,
  scene: "Scene with Glow",
};
const starColors = {
  o: "0x9bb0ff",
  b: "0xaabfff",
  a: "0xcad7ff",
  f: "0xf8f7ff",
  g: "0xfff4ea",
  k: "0xffd2a1",
  m: "0xffcc6f",
  d: "0xffcc6f",
};

const materials = {};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0px";
document.body.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  1,
  200
);
camera.position.set(0, 0, 20);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.maxPolarAngle = Math.PI * 0.5;
controls.minDistance = 1;
controls.maxDistance = 100;
controls.addEventListener("change", render);

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.threshold = params.bloomThreshold;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = params.bloomRadius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const finalPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader: document.getElementById("vertexshader").textContent,
    fragmentShader: document.getElementById("fragmentshader").textContent,
    defines: {},
  }),
  "baseTexture"
);
finalPass.needsSwap = true;

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(finalPass);

const mouse = new THREE.Vector2();
let animating = true;
window.addEventListener("pointerdown", onPointerDown);
render();

const systemsArr = [];
fetch("./nodes/stars.json")
  .then((res) => res.json())
  .then((data) => {
    data.forEach((item) => {
      systemsArr.push(item);
    });
    setupScene();
  });

function onPointerDown(event) {
  animating = false;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

window.onresize = function () {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
  bloomComposer.setSize(width, height);
  finalComposer.setSize(width, height);

  render();
};

function setupScene() {
  scene.traverse(disposeMaterial);
  scene.children.length = 0;

  systemsArr.forEach((item) => {
    const color = new THREE.Color(
      Number(starColors[item["Spectral Class"][0]?.toLowerCase()])
    );
    // const geometry = new THREE.IcosahedronGeometry(item.AbsMag / 500, 15);
    const geometry = new THREE.IcosahedronGeometry(0.05, 15);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.x = item.Xg;
    sphere.position.y = item.Yg;
    sphere.position.z = item.Zg;
    sphere.scale.setScalar(1.5);
    scene.add(sphere);
    const starDiv = document.createElement("div");
    // starDiv.className = 'label';
    // starDiv.textContent = item["Display Name"];
    starDiv.style.color =
      starColors[item["Spectral Class"][0]?.toLowerCase()] || "white";
    const starLabel = new CSS2DObject(starDiv);
    starLabel.position.set(0, -0.1, 0);
    sphere.add(starLabel);
    sphere.layers.enable(1);
  });
  render();
  animate();
}

function disposeMaterial(obj) {
  if (obj.material) {
    obj.material.dispose();
  }
}

function render() {
  bloomComposer.render();
  finalComposer.render();
  labelRenderer.render(scene, camera);
}
function animate() {
  const timer = Date.now() * 0.0001;
  camera.position.x = Math.sin(timer) * 30;
  camera.position.z = Math.cos(timer) * 30;
  camera.lookAt(0, 0, 0);
  render();
  if (animating) {
    requestAnimationFrame(animate);
  }
}

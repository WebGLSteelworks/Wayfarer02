import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/RGBELoader.js/+esm';

import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/EffectComposer.js/+esm';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/RenderPass.js/+esm';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/postprocessing/ShaderPass.js/+esm';

import { MODEL_CONFIG as SHINY_COSMIC_BLUE } from './configs/w_shiny_cosmic_blue.js';
import { MODEL_CONFIG as MATTE_BLACK_CLEAR } from './configs/w_matte_black_clear.js';
import { MODEL_CONFIG as SHINY_BLACK_GREEN } from './configs/w_shiny_black_green.js';
import { MODEL_CONFIG as MATTE_BLACK_GGRAPH } from './configs/w_matte_black_ggraph.js';
import { MODEL_CONFIG as SHINY_BLACK_CGREEN } from './configs/w_shiny_black_cgreen.js';
import { MODEL_CONFIG as MATTE_BLACK_CGREY } from './configs/w_matte_black_cgrey.js';
import { MODEL_CONFIG as CLEAR_SAPPHIRE } from './configs/w_clear_sapphire.js';
import { MODEL_CONFIG as BLUE_JEANS } from './configs/w_jeans_blue.js';

// ─────────────────────────────────────────────
// VAR
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2); 

let logoTexture = null;
const textureLoader = new THREE.TextureLoader();

const gradientTexture = textureLoader.load('./textures/w_lens_gradient.jpg');
gradientTexture.flipY = false;
gradientTexture.colorSpace = THREE.SRGBColorSpace;

const cameras = {};

const clock = new THREE.Clock();

let currentConfig = SHINY_COSMIC_BLUE;
let currentModel = null;
const loader = new GLTFLoader();

let glassAnimationEnabled = true;
let activeCameraName = null;
let glassAnimateCamera = null;
let wasAnimatingGlass = false;

const REFLECTION_TINT = 1.1;    // dark glass
const REFLECTION_CLEAR = 0.18;  // trans glass



// ─────────────────────────────
// UI FOR MODEL SELECTION
// ─────────────────────────────

const modelUI = document.createElement('div');
modelUI.style.position = 'fixed';
modelUI.style.right = '20px';
modelUI.style.top = '50%';
modelUI.style.transform = 'translateY(-50%)';
modelUI.style.display = 'flex';
modelUI.style.flexDirection = 'column';
modelUI.style.gap = '10px';
modelUI.style.zIndex = '20';

document.body.appendChild(modelUI);

function makeModelButton(label, config) {
  const btn = document.createElement('button');
  btn.textContent = label;

  btn.style.padding = '10px 16px';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.style.background = '#222';
  btn.style.color = '#fff';
  btn.style.fontSize = '14px';

  btn.onclick = () => {
    currentConfig = config;
    applyConfig(config);
  };

  modelUI.appendChild(btn);
}

makeModelButton('Shiny Cosmic Blue', SHINY_COSMIC_BLUE);
makeModelButton('Matte Black Clear', MATTE_BLACK_CLEAR);
makeModelButton('Shiny Black Green', SHINY_BLACK_GREEN);
makeModelButton('Matte Black Gradient Graphite', MATTE_BLACK_GGRAPH);
makeModelButton('Shiny Black Clear to Green', SHINY_BLACK_CGREEN);
makeModelButton('Matte Black Clear to Grey', MATTE_BLACK_CGREY);
makeModelButton('Clear Sapphire', CLEAR_SAPPHIRE);
makeModelButton('Blue Jeans', BLUE_JEANS);

// ─────────────────────────────
// POSTPRODUCTION FOR MORE CONTRAST
// ─────────────────────────────

const ContrastShader = {
  uniforms: {
    tDiffuse: { value: null },
    contrast: { value: 1.0 } // 1.0 = neutro
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;
      gl_FragColor = color;
    }
  `
};


// ─────────────────────────────
// LOAD GLB MODEL
// ─────────────────────────────

function loadModel(config) {
	
  glassAnimationEnabled = config.glass.animate === true;
  glassAnimateCamera = config.glass.animateCamera || null;
  logoTexture = textureLoader.load(config.logo.texture);
  logoTexture.flipY = false;
  logoTexture.colorSpace = THREE.SRGBColorSpace;

  // ───── clean last model
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  // state reset
  glassMaterials.length = 0;
  originalGlassColors.length = 0;
  armsTextMeshes.length = 0;
  glassAnim.state = 'waitGreen';
  glassAnim.timer = 0;
  Object.keys(cameraTargets).forEach(k => delete cameraTargets[k]);

  loader.load(config.glb, (gltf) => {

    currentModel = gltf.scene;
    scene.add(currentModel);
	
	// ───── calculate model pivot
	const box = new THREE.Box3().setFromObject(currentModel);
	const modelCenter = new THREE.Vector3();
	box.getCenter(modelCenter);


    // ───── load cameras
    gltf.scene.traverse(obj => {
			
      if (obj.isCamera) {

		  const pos = obj.getWorldPosition(new THREE.Vector3());
		  const quat = obj.getWorldQuaternion(new THREE.Quaternion());

		  const target =
			obj.name === 'Cam_Free'
			  ? modelCenter.clone()
			  : modelCenter.clone();

		  cameraTargets[obj.name] = {
			position: pos,
			quaternion: quat,
			target: modelCenter.clone(),
			fov: obj.getEffectiveFOV()
		  };
		}

	// ───── Apply same material to frame and arms
	if (
	  obj.isMesh &&
	  (
		obj.name.includes('Frame') ||
		(obj.name.includes('Arm') && !obj.name.includes('Text'))
	  )
	) {
	  //obj.material = frameMaterial;
	}
		
      // ───── glass
      if (obj.isMesh && obj.material?.name?.toLowerCase().includes('glass')) {

        const mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(...config.glass.color),
          roughness: config.glass.roughness,
          metalness: config.glass.metalness,
          transparent: true,
          opacity: config.glass.opacity,
          transmission: 0.0,
          ior: 1.45,
          depthWrite: false,
		  envMapIntensity: REFLECTION_TINT
        });
		
		// ───── OPACITY GRADIENT (if exist)
		if (config.glass.opacityMap) {
		  const alphaTex = textureLoader.load(config.glass.opacityMap);
		  alphaTex.flipY = false;
		  mat.alphaMap = alphaTex;
		}
		
		// ───── WHITE LOGO STENCIL
		mat.emissiveMap = logoTexture;
		mat.emissive = new THREE.Color(1, 1, 1);
		mat.emissiveIntensity = config.logo.emissiveIntensity ?? 0.6; 
		
		// ───── COLOR GRADIENT (if enabled)
		if (config.glass.gradient) {
		  mat.alphaMap = gradientTexture;
		}
		
		mat.needsUpdate = true;

        glassMaterials.push(mat);
        originalGlassColors.push(mat.color.clone());
		originalGlassOpacities.push(mat.opacity);
        obj.material = mat;
      }
    });

    // load starting camera
    smoothSwitchCamera(config.startCamera);
	applyConfig(config); 
  });
}


// ─────────────────────────────
// APPLY CONFIG SWAPPING MODELS 
// ─────────────────────────────
function applyConfig(config) {
	
	let frameMaterial;
	let armTextMaterial;

	if (config.frame.trans) {

	  armTextMaterial = new THREE.MeshPhysicalMaterial({
		color: new THREE.Color(...config.frame.baseColor),
		roughness: config.frame.roughness,
		metalness: config.frame.metalness,
		transparent: true,
		opacity: config.frame.opacity ?? 0.6,
		depthWrite: true,
		envMapIntensity: 5.2,
		clearcoat: 5.0,
		clearcoatRoughness: config.frame.roughness
	  });

	} else {

	  armTextMaterial = new THREE.MeshStandardMaterial({
		color: new THREE.Color(...config.frame.baseColor),
		roughness: config.frame.roughness,
		metalness: config.frame.metalness,
		envMapIntensity: 2.2
	  });

	}	
	
	// ───── OVERLAY SHADER FOR ARM_TEXT
	const overlayTexture = textureLoader.load(config.armsText.overlay);
	overlayTexture.flipY = false;
	overlayTexture.colorSpace = THREE.SRGBColorSpace;

	armTextMaterial.onBeforeCompile = (shader) => {

	  shader.uniforms.overlayMap = { value: overlayTexture };
	  shader.uniforms.textColor = {
		value: new THREE.Color(...config.armsText.color)
	  };

	  // ───── VERTEX SHADER ─────
	  shader.vertexShader =
		`
		varying vec2 vCustomUv;
		` + shader.vertexShader;

	  shader.vertexShader = shader.vertexShader.replace(
		'#include <uv_vertex>',
		`
		  #include <uv_vertex>
		  vCustomUv = uv;
		`
	  );

	  // ───── FRAGMENT SHADER ─────
	  shader.fragmentShader =
		`
		uniform sampler2D overlayMap;
		uniform vec3 textColor;
		varying vec2 vCustomUv;
		` + shader.fragmentShader;

	  shader.fragmentShader = shader.fragmentShader.replace(
		'#include <color_fragment>',
		`
		  #include <color_fragment>

		  vec4 overlay = texture2D(overlayMap, vCustomUv);
		  float mask = overlay.a;

		  diffuseColor.rgb = mix(
			diffuseColor.rgb,
			textColor,
			mask
		  );

		  diffuseColor.a = max(diffuseColor.a, mask);
		`
	  );
	};

	armTextMaterial.needsUpdate = true;

	if (config.frame.trans) {

		frameMaterial = new THREE.MeshPhysicalMaterial({
			color: new THREE.Color(...config.frame.baseColor),

			roughness: config.frame.roughness,
			metalness: 0.0,                     // 🔥 fijo a 0

			transparent: true,
			opacity: config.frame.opacity ?? 0.8,
			depthWrite: true,

			envMapIntensity: 3.5,               // 🔥 más reflejo
			clearcoat: 1.0,
			clearcoatRoughness: config.frame.roughness,

			reflectivity: config.frame.reflectivity ?? 1.0
		});

	} else {

	  frameMaterial = new THREE.MeshStandardMaterial({
		color: new THREE.Color(...config.frame.baseColor),
		roughness: config.frame.roughness,
		metalness: config.frame.metalness
	  });

	}	

  glassAnimationEnabled = config.glass.animate === true;
  glassAnimateCamera = config.glass.animateCamera || null;

  // 🔹 LOGO
  logoTexture = textureLoader.load(config.logo.texture);
  logoTexture.flipY = false;
  logoTexture.colorSpace = THREE.SRGBColorSpace;

  // 🔹 FRAME (actualizar materiales existentes)
  currentModel.traverse(obj => {

    if (!obj.isMesh) return;

	if (obj.name.includes('Arm_Text')) {
	  obj.material = armTextMaterial;
	  return;
	}

	if (
	  obj.isMesh &&
	  (
		obj.name.includes('Frame') ||
		(obj.name.includes('Arm') && !obj.name.includes('Text'))
	  )
	) {
	  obj.material = frameMaterial;
	}



  });


	// 🔹 FAKE INTERNAL MATERIAL
	if (config.fake?.texture) {

	  const fakeTexture = textureLoader.load(config.fake.texture);
	  fakeTexture.flipY = false;
	  fakeTexture.colorSpace = THREE.SRGBColorSpace;

	  currentModel.traverse(obj => {

		if (obj.isMesh && obj.material?.name?.toLowerCase() === 'fake') {

		  const fakeMaterial = new THREE.MeshStandardMaterial({
			map: fakeTexture,
			metalness: 0.0,
			roughness: 1.0
		  });

		  fakeMaterial.name = 'fake' ;

		  obj.material = fakeMaterial;

		}

	  });
	}




	// 🔹 ARM_TEXT (actualizar propiedades dinámicas)
	armsTextMeshes.forEach(mesh => {

	  // actualizar color base del material
	  mesh.material.color.set(...config.frame.baseColor);

	  // actualizar propiedades físicas
	  mesh.material.roughness = config.frame.roughness;
	  mesh.material.metalness = config.frame.metalness;
	  
	  mesh.material.envMapIntensity = 2.2;
	  
	  if (config.frame.trans) {

		  mesh.material.transparent = true;
		  mesh.material.opacity = config.frame.opacity ?? 0.6;
		  mesh.material.depthWrite = false;

		} else {

		  mesh.material.transparent = false;
		  mesh.material.opacity = 1.0;
		  mesh.material.depthWrite = true;

		}

	  // actualizar color del texto (uniform del shader)
	  if (mesh.material.userData.textColorUniform) {
		mesh.material.userData.textColorUniform.value.set(...config.armsText.color);
	  }

	});


  
  	// 🔹 GLASS
	glassMaterials.forEach(mat => {

	  mat.color.set(...config.glass.color);
	  mat.opacity = config.glass.opacity;

	  mat.emissiveMap = logoTexture;
	  mat.emissiveIntensity = config.logo.emissiveIntensity ?? 0.6;

	  mat.alphaMap = config.glass.gradient ? gradientTexture : null;

	  mat.needsUpdate = true;
	});

}



// ─────────────────────────────
// GLASS ANIMATION
// ─────────────────────────────
const glassAnim = {
  state: 'waitGreen',
  timer: 0,

  duration: 1.5,
  waitGreen: 1.0,
  waitClear: 1.0
};


// ─────────────────────────────
// GLASS MAT (GLOBAL)
// ─────────────────────────────
const glassMaterials = [];
let armsTextMeshes = [];
const originalGlassColors = [];
const originalGlassOpacities = [];



// ─────────────────────────────────────────────
// CAMERAS
// ─────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  80,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);

const cameraTargets = {};
let pendingFreeCamera = false;



// ─────────────────────────────────────────────
// ACTIVE CAMERA + TRANSITION STATE
// ─────────────────────────────────────────────

let transition = {
  active: false,
  startTime: 0,
  duration: 0.8,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromQuat: new THREE.Quaternion(),
  toQuat: new THREE.Quaternion()
};



// ─────────────────────────────────────────────
// RENDERER
// ─────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// ─────────────────────────────
// COMPOSER ANTIALIASING
// ─────────────────────────────

const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    samples: 4 
  }
);

const composer = new EffectComposer(renderer, renderTarget);

composer.addPass(new RenderPass(scene, camera));

const contrastPass = new ShaderPass(ContrastShader);
contrastPass.uniforms.contrast.value = 1.0;
composer.addPass(contrastPass);

// ─────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false; 

controls.enableDamping = true;
controls.dampingFactor = 0.08;

controls.enableRotate = true;
controls.enableZoom = true;
controls.enablePan = false;

controls.minDistance = 0.5;
controls.maxDistance = 1.2;


// ─────────────────────────────────────────────
// LIGHTING
// ─────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 5.0));
const dirLight01 = new THREE.DirectionalLight(0xffffff, 15.0);
const dirLight02 = new THREE.DirectionalLight(0xffffff, 15.0);
dirLight01.position.set(5, 10, 7);
dirLight02.position.set(-10, 10, 7);
scene.add(dirLight01);
scene.add(dirLight02);

// ─────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────
const pmrem = new THREE.PMREMGenerator(renderer);

new RGBELoader().load('./studio.hdr', (hdr) => {

  // 🔹 Creamos una escena temporal para procesar el HDR
  const tempScene = new THREE.Scene();

  const saturation = 0.0; // 0 = gris total | 1 = original

  const material = new THREE.ShaderMaterial({
    uniforms: {
      tMap: { value: hdr },
      saturation: { value: saturation }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tMap;
      uniform float saturation;
      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(tMap, vUv);

        float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 grey = vec3(luminance);

        color.rgb = mix(grey, color.rgb, saturation);

        gl_FragColor = color;
      }
    `,
    side: THREE.DoubleSide
  });

  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    material
  );

  tempScene.add(quad);

  const renderTarget = new THREE.WebGLRenderTarget(
    hdr.image.width,
    hdr.image.height
  );

  renderer.setRenderTarget(renderTarget);
  renderer.render(tempScene, new THREE.Camera());
  renderer.setRenderTarget(null);

  const processedEnvMap = pmrem.fromEquirectangular(renderTarget.texture).texture;

  scene.environment = processedEnvMap;
  scene.environmentRotation = new THREE.Euler(0, Math.PI * 1.25, 0);
  scene.environmentIntensity = 3.0;

  hdr.dispose();
  renderTarget.dispose();
});

function smoothSwitchCamera(name) {
  activeCameraName = name;

  const camData = cameraTargets[name];
  if (!camData) return;

  // ───── CAM_FREE (NO TRANSITION)
  if (name === 'Cam_Free') {

    transition.active = false;

    camera.position.copy(camData.position);
    controls.target.copy(camData.target);

    camera.lookAt(controls.target);
    camera.updateMatrixWorld();

    controls.update();
    controls.enabled = true;

    return;
  }

  // ───── CAMERA TRANSITION
  controls.enabled = false; 
  
  if (camData.fov !== undefined) {
    camera.fov = camData.fov;
    camera.updateProjectionMatrix();
  }

  transition.fromPos.copy(camera.position);
  transition.fromQuat.copy(camera.quaternion);

  transition.toPos.copy(camData.position);
  transition.toQuat.copy(camData.quaternion);

  transition.startTime = performance.now();
  transition.active = true;
}


// ─────────────────────────────────────────────
// RESIZE
// ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─────────────────────────────────────────────
// LOOP ANIMATE
// ─────────────────────────────────────────────
function animate(time) {
  requestAnimationFrame(animate);

  // ─────────────────────────────────────────
  // CAMERA TRANSITIONS (Still Cameras)
  // ─────────────────────────────────────────
  if (transition.active) {

    const elapsed = (time - transition.startTime) / 1000;
    const t = Math.min(elapsed / transition.duration, 1);
    const ease = t * t * (3 - 2 * t);

    camera.position.lerpVectors(
      transition.fromPos,
      transition.toPos,
      ease
    );

    if (activeCameraName !== 'Cam_Free') {
      camera.quaternion
        .copy(transition.fromQuat)
        .slerp(transition.toQuat, ease);
    }

    if (t >= 1) {
      transition.active = false;
    }
  }

  // ─────────────────────────────────────────
  // ORBIT CONTROLS (only Cam_Free)
  // ─────────────────────────────────────────
  if (controls.enabled) {
    controls.update();
  }

  // ─────────────────────────────────────────
  // GLASS ANIMATION (controlled by config)
  // ─────────────────────────────────────────
  
  const shouldAnimateGlass =
    glassAnimationEnabled &&
    glassMaterials.length > 0 &&
    activeCameraName === glassAnimateCamera;

  if (shouldAnimateGlass) {

    wasAnimatingGlass = true;

    const delta = clock.getDelta();
    glassAnim.timer += delta;

    glassMaterials.forEach((mat, i) => {

      const originalColor = originalGlassColors[i];

      switch (glassAnim.state) {

        case 'waitGreen':
          if (glassAnim.timer > glassAnim.waitGreen) {
            glassAnim.timer = 0;
            glassAnim.state = 'toClear';
          }
          break;

        case 'toClear': {
          const t = Math.min(glassAnim.timer / glassAnim.duration, 1);
          const ease = t * t * (3 - 2 * t);

          mat.color.lerpColors(
            originalColor,
            new THREE.Color(1, 1, 1),
            ease
          );

		  mat.opacity = THREE.MathUtils.lerp(
			originalGlassOpacities[i],
			0.0,
			ease
		  );

          if (t >= 1) {
            glassAnim.timer = 0;
            glassAnim.state = 'waitClear';
          }
          break;
        }

        case 'waitClear':
          if (glassAnim.timer > glassAnim.waitClear) {
            glassAnim.timer = 0;
            glassAnim.state = 'toGreen';
          }
          break;

        case 'toGreen': {
          const t = Math.min(glassAnim.timer / glassAnim.duration, 1);
          const ease = t * t * (3 - 2 * t);

          mat.color.lerpColors(
            new THREE.Color(1, 1, 1),
            originalColor,
            ease
          );

		  mat.opacity = THREE.MathUtils.lerp(
			0.0,
			originalGlassOpacities[i],
			ease
		  );


          if (t >= 1) {
            glassAnim.timer = 0;
            glassAnim.state = 'waitGreen';
          }
          break;
        }
      }
    });

  } else {

    // Reset ONLY when leave animate
    if (wasAnimatingGlass) {
      glassMaterials.forEach((mat, i) => {
        mat.color.copy(originalGlassColors[i]);
		mat.opacity = originalGlassOpacities[i];
      });

      glassAnim.state = 'waitGreen';
      glassAnim.timer = 0;
      wasAnimatingGlass = false;
    }
  }

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  composer.render();
}


// ─────────────────────────────────────────────
// CAMERA BUTTONS UI
// ─────────────────────────────────────────────
const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.bottom = '20px';
ui.style.left = '50%';
ui.style.transform = 'translateX(-50%)';
ui.style.display = 'flex';
ui.style.gap = '10px';
ui.style.zIndex = '10';

document.body.appendChild(ui);

const cameraButtons = [
  { label: 'Front', name: 'Cam_Front' },
  { label: 'Side', name: 'Cam_Side' },
  { label: 'Camera', name: 'Cam_Camera' },
  { label: 'Capture', name: 'Cam_Capture' },
  { label: 'Power', name: 'Cam_Power' },
  { label: 'Lenses', name: 'Cam_Lenses' },
  { label: 'Free', name: 'Cam_Free' }
];

cameraButtons.forEach(({ label, name }) => {
  const btn = document.createElement('button');
  btn.textContent = label;

  btn.style.padding = '8px 14px';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.style.background = '#111';
  btn.style.color = '#fff';
  btn.style.fontSize = '13px';

  btn.addEventListener('click', () => smoothSwitchCamera(name));
  ui.appendChild(btn);
});


loadModel(currentConfig);
animate();





















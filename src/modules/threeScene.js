import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { M, FLOOR_MATERIALS, WALL_MATERIALS, LIGHTING_PRESETS } from '../core/constants.js';
import { getProceduralPBR } from './textureGen.js';

export class ThreeStudio {
  constructor(canvasElement) {
    this.canvas = canvasElement;

    // WebGL Renderer with High-Precision Color & Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f4f0e8');

    // Camera
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
    this.camera.position.set(13, 15, 17);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03; // prevent camera clipping below floor
    this.controls.minDistance = 1;
    this.controls.maxDistance = 120;

    // Realistic Lighting Rig
    this.hemiLight = new THREE.HemisphereLight('#ffffff', '#baa78e', 1.05);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff8ed', 2.1);
    this.sunLight.position.set(14, 18, 12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 85;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.radius = 2.2; // soft shadow penumbra
    Object.assign(this.sunLight.shadow.camera, {
      left: -22, right: 22, top: 22, bottom: -22
    });
    this.sunLight.shadow.camera.updateProjectionMatrix();
    this.scene.add(this.sunLight);

    // Dynamic interior ceiling lights group
    this.interiorLightsGroup = new THREE.Group();
    this.scene.add(this.interiorLightsGroup);

    // Ground plane with subtle shadow reception
    const groundGeo = new THREE.PlaneGeometry(180, 180);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#e7e1d4',
      roughness: 0.96,
      metalness: 0.01
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.01;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Soft building contact shadow plinth
    this.contactShadowPlinth = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: '#2b261e', transparent: true, opacity: 0.12 })
    );
    this.contactShadowPlinth.rotation.x = -Math.PI / 2;
    this.contactShadowPlinth.position.y = -0.005;
    this.scene.add(this.contactShadowPlinth);

    // Architectural Layer Groups
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.floorsGroup = new THREE.Group();
    this.wallsGroup = new THREE.Group();
    this.furnGroup = new THREE.Group();
    this.ceilingsGroup = new THREE.Group();

    this.rootGroup.add(this.floorsGroup);
    this.rootGroup.add(this.wallsGroup);
    this.rootGroup.add(this.furnGroup);
    this.rootGroup.add(this.ceilingsGroup);

    // Exploded View offset state
    this.explosionProgress = 0;

    // Render Loop
    this.active = true;
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _animate() {
    requestAnimationFrame(this._animate);
    if (!this.active) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  applyLighting(lightingConfig) {
    if (!lightingConfig) return;
    const preset = LIGHTING_PRESETS[lightingConfig.preset] || LIGHTING_PRESETS.afternoon;

    const sunIntensity = (lightingConfig.sunIntensity ?? preset.sunIntensity);
    const ambientIntensity = (lightingConfig.ambientIntensity ?? preset.ambientIntensity);

    this.sunLight.intensity = sunIntensity;
    this.sunLight.color.set(preset.sunColor);
    this.sunLight.position.set(preset.sunPos[0], preset.sunPos[1], preset.sunPos[2]);
    this.sunLight.castShadow = lightingConfig.shadows !== false;

    this.hemiLight.color.set(preset.skyColor);
    this.hemiLight.groundColor.set(preset.groundColor);
    this.hemiLight.intensity = ambientIntensity;

    this.scene.background = new THREE.Color(
      lightingConfig.preset === 'night' ? '#0a0d14' :
      lightingConfig.preset === 'sunset' ? '#281a26' : '#f4f0e8'
    );
  }

  disposeGroup(group) {
    group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    group.clear();
  }

  setExplosionProgress(progress) {
    this.explosionProgress = Math.max(0, Math.min(1, progress));
    this.ceilingsGroup.position.y = this.explosionProgress * 4.4;
    this.wallsGroup.position.y = this.explosionProgress * 1.9;
    this.furnGroup.position.y = this.explosionProgress * 0.95;
    this.floorsGroup.position.y = 0;
  }

  rebuild(home, options = {}) {
    this.disposeGroup(this.floorsGroup);
    this.disposeGroup(this.wallsGroup);
    this.disposeGroup(this.furnGroup);
    this.disposeGroup(this.ceilingsGroup);
    this.disposeGroup(this.interiorLightsGroup);

    if (!home.rooms.length) return;

    const xMin = Math.min(...home.rooms.map(r => r.x));
    const xMax = Math.max(...home.rooms.map(r => r.x + r.w));
    const yMin = Math.min(...home.rooms.map(r => r.y));
    const yMax = Math.max(...home.rooms.map(r => r.y + r.h));
    const ox = (xMin + xMax) / 2;
    const oz = (yMin + yMax) / 2;

    const spanX = (xMax - xMin) * M;
    const spanZ = (yMax - yMin) * M;

    // Update soft contact plinth under house
    this.contactShadowPlinth.scale.set(spanX + 3, spanZ + 3, 1);
    this.contactShadowPlinth.position.set(0, -0.005, 0);

    const visibleFloorId = options.isolateFloorId || null;
    const wallThickness = 0.14; // metres

    this.applyLighting(home.lighting);

    // Floor elevation map
    const floorElevMap = new Map();
    let currentElev = 0;
    (home.floors || []).forEach(fl => {
      floorElevMap.set(fl.id, currentElev);
      currentElev += (fl.height || 280) * M;
    });

    const baseboardMat = new THREE.MeshStandardMaterial({
      color: '#fcfbf8',
      roughness: 0.65,
      metalness: 0.05
    });

    // 1. Build Rooms
    for (const r of home.rooms) {
      if (visibleFloorId && r.floorId !== visibleFloorId) continue;

      const floorElev = floorElevMap.get(r.floorId) || 0;
      const cx = (r.x + r.w / 2 - ox) * M;
      const cz = (r.y + r.h / 2 - oz) * M;
      const rw = r.w * M;
      const rd = r.h * M;
      const rWallH = (r.wallH || 280) * M;

      // Enhanced Floor Material with Procedural Bump Map
      const fMatDef = FLOOR_MATERIALS[r.floorMaterial] || FLOOR_MATERIALS.oakWood;
      const pbrFloor = getProceduralPBR(fMatDef.texture, r.floor || fMatDef.color);

      const floorMat = new THREE.MeshStandardMaterial({
        color: r.floor || fMatDef.color,
        map: pbrFloor?.map || null,
        bumpMap: pbrFloor?.bumpMap || null,
        bumpScale: 0.02,
        roughness: fMatDef.roughness,
        metalness: fMatDef.metalness
      });

      // Floor Slab
      const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.05, rd), floorMat);
      floorMesh.position.set(cx, floorElev + 0.025, cz);
      floorMesh.receiveShadow = true;
      this.floorsGroup.add(floorMesh);

      // Enhanced Wall Material with Bump
      const wMatDef = WALL_MATERIALS[r.wallMaterial] || WALL_MATERIALS.whitePaint;
      const pbrWall = getProceduralPBR(wMatDef.texture, r.wall || wMatDef.color);

      const wallMat = new THREE.MeshStandardMaterial({
        color: r.wall || wMatDef.color,
        map: pbrWall?.map || null,
        bumpMap: pbrWall?.bumpMap || null,
        bumpScale: 0.015,
        roughness: wMatDef.roughness,
        metalness: wMatDef.metalness
      });

      // Ceiling Slab
      const ceilingMat = new THREE.MeshStandardMaterial({
        color: '#f9f7f2',
        roughness: 0.92,
        metalness: 0.0
      });
      const ceilingMesh = new THREE.Mesh(new THREE.BoxGeometry(rw + wallThickness * 2, 0.06, rd + wallThickness * 2), ceilingMat);
      ceilingMesh.position.set(cx, floorElev + rWallH + 0.03, cz);
      ceilingMesh.castShadow = true;
      this.ceilingsGroup.add(ceilingMesh);

      // 4 Wall Slabs
      const addWall = (w, h, d, px, py, pz) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        mesh.position.set(px, py, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.wallsGroup.add(mesh);
      };

      const halfH = floorElev + rWallH / 2;
      addWall(rw + wallThickness, rWallH, wallThickness, cx, halfH, cz - rd / 2); // North
      addWall(rw + wallThickness, rWallH, wallThickness, cx, halfH, cz + rd / 2); // South
      addWall(wallThickness, rWallH, rd, cx - rw / 2, halfH, cz);                 // West
      addWall(wallThickness, rWallH, rd, cx + rw / 2, halfH, cz);                 // East

      // Architectural Baseboards (Skirting Boards: 10cm high)
      const baseH = 0.1;
      const baseT = 0.02;
      const basePy = floorElev + baseH / 2;
      const addBaseboard = (bw, bd, bpx, bpz) => {
        const bm = new THREE.Mesh(new THREE.BoxGeometry(bw, baseH, bd), baseboardMat);
        bm.position.set(bpx, basePy, bpz);
        this.wallsGroup.add(bm);
      };
      addBaseboard(rw - 0.04, baseT, cx, cz - rd / 2 + baseT / 2);
      addBaseboard(rw - 0.04, baseT, cx, cz + rd / 2 - baseT / 2);
      addBaseboard(baseT, rd - 0.04, cx - rw / 2 + baseT / 2, cz);
      addBaseboard(baseT, rd - 0.04, cx + rw / 2 - baseT / 2, cz);

      // Warm Interior Ceiling Downlights
      if (home.lighting?.artificialEnabled !== false) {
        const pLight = new THREE.PointLight('#fff2dc', (home.lighting?.artificialIntensity || 1.0) * 1.3, 11, 2.0);
        pLight.position.set(cx, floorElev + rWallH - 0.35, cz);
        this.interiorLightsGroup.add(pLight);

        // Ceiling Downlight Mesh Fixture
        const fixture = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16),
          new THREE.MeshStandardMaterial({ color: '#fcfcfc', emissive: '#fffaec', emissiveIntensity: 0.9 })
        );
        fixture.position.set(cx, floorElev + rWallH - 0.015, cz);
        this.ceilingsGroup.add(fixture);
      }
    }

    // 2. Build Furniture
    for (const f of home.furn) {
      if (visibleFloorId && f.floorId !== visibleFloorId) continue;

      const floorElev = floorElevMap.get(f.floorId) || 0;
      const fx = (f.x - ox) * M;
      const fz = (f.y - oz) * M;
      const fRot = -(f.rot || 0) * Math.PI / 180;

      const furnMesh = this.buildFurnitureMesh(f, floorElev);
      furnMesh.position.set(fx, floorElev, fz);
      furnMesh.rotation.y = fRot;
      this.furnGroup.add(furnMesh);
    }

    this.setExplosionProgress(this.explosionProgress);
  }

  buildFurnitureMesh(f, floorElev) {
    const group = new THREE.Group();
    const w = f.w * M;
    const d = f.d * M;
    const h = f.h * M;
    const color = f.color || '#9c8a78';

    const baseMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.06
    });

    const woodAccentMat = new THREE.MeshStandardMaterial({
      color: '#4e3722',
      roughness: 0.42,
      metalness: 0.06
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: '#1f2022',
      roughness: 0.28,
      metalness: 0.85
    });

    const fabricMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      metalness: 0.02
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#cde4ed',
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      transparent: true,
      opacity: 0.7
    });

    const helperBox = (gw, gh, gd, mat, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), mat);
      m.position.set(px, py, pz);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
      return m;
    };

    switch (f.type) {
      case 'sofa': {
        helperBox(w, h * 0.46, d * 0.9, fabricMat, 0, h * 0.23, 0);
        helperBox(w, h * 0.6, d * 0.22, fabricMat, 0, h * 0.55, -d * 0.35);
        helperBox(w * 0.14, h * 0.55, d * 0.9, fabricMat, -w * 0.43, h * 0.275, 0);
        helperBox(w * 0.14, h * 0.55, d * 0.9, fabricMat, w * 0.43, h * 0.275, 0);
        // Feet
        const legR = 0.02, legH = 0.06;
        for (const dx of [-w * 0.42, w * 0.42]) {
          for (const dz of [-d * 0.38, d * 0.38]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR * 0.7, legH, 8), woodAccentMat);
            leg.position.set(dx, legH / 2, dz);
            group.add(leg);
          }
        }
        break;
      }

      case 'armchair': {
        helperBox(w * 0.8, h * 0.45, d * 0.8, fabricMat, 0, h * 0.225, 0);
        helperBox(w * 0.8, h * 0.65, d * 0.2, fabricMat, 0, h * 0.55, -d * 0.3);
        helperBox(w * 0.16, h * 0.5, d * 0.8, fabricMat, -w * 0.38, h * 0.3, 0);
        helperBox(w * 0.16, h * 0.5, d * 0.8, fabricMat, w * 0.38, h * 0.3, 0);
        break;
      }

      case 'bed': {
        helperBox(w, 0.18, d, woodAccentMat, 0, 0.09, 0);
        helperBox(w * 0.94, 0.26, d * 0.94, new THREE.MeshStandardMaterial({ color: '#f3efe7', roughness: 0.9 }), 0, 0.31, 0);
        helperBox(w, h, 0.12, fabricMat, 0, h / 2, -d / 2 + 0.06);
        const pillowMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
        helperBox(w * 0.38, 0.1, d * 0.2, pillowMat, -w * 0.24, 0.48, -d * 0.28);
        helperBox(w * 0.38, 0.1, d * 0.2, pillowMat, w * 0.24, 0.48, -d * 0.28);
        break;
      }

      case 'table': {
        helperBox(w, 0.05, d, baseMat, 0, h - 0.025, 0);
        const legR = 0.03;
        for (const dx of [-w / 2 + 0.08, w / 2 - 0.08]) {
          for (const dz of [-d / 2 + 0.08, d / 2 - 0.08]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR * 0.7, h - 0.05, 12), woodAccentMat);
            leg.position.set(dx, (h - 0.05) / 2, dz);
            leg.castShadow = true;
            group.add(leg);
          }
        }
        break;
      }

      case 'coffeeTable': {
        helperBox(w, 0.04, d, baseMat, 0, h - 0.02, 0);
        for (const dx of [-w / 2 + 0.05, w / 2 - 0.05]) {
          for (const dz of [-d / 2 + 0.05, d / 2 - 0.05]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, h - 0.04, 8), darkMetalMat);
            leg.position.set(dx, (h - 0.04) / 2, dz);
            group.add(leg);
          }
        }
        break;
      }

      case 'chair': {
        helperBox(w, 0.04, d * 0.85, fabricMat, 0, h * 0.48, 0);
        helperBox(w, h * 0.5, 0.04, baseMat, 0, h * 0.74, -d * 0.38);
        for (const dx of [-w / 2 + 0.04, w / 2 - 0.04]) {
          for (const dz of [-d * 0.38 + 0.04, d * 0.38 - 0.04]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, h * 0.46, 8), darkMetalMat);
            leg.position.set(dx, h * 0.23, dz);
            group.add(leg);
          }
        }
        break;
      }

      case 'tvUnit': {
        helperBox(w, h * 0.38, d, woodAccentMat, 0, h * 0.19, 0);
        const tvW = w * 0.85;
        const tvH = h * 0.58;
        helperBox(tvW, tvH, 0.03, darkMetalMat, 0, h * 0.38 + tvH / 2 + 0.05, 0);
        helperBox(0.08, 0.08, 0.06, darkMetalMat, 0, h * 0.38 + 0.04, 0);
        break;
      }

      case 'wardrobe': {
        helperBox(w, h, d, baseMat, 0, h / 2, 0);
        helperBox(0.01, h * 0.9, 0.01, darkMetalMat, 0, h / 2, d / 2 + 0.005);
        helperBox(0.02, 0.16, 0.02, darkMetalMat, -0.06, h * 0.5, d / 2 + 0.015);
        helperBox(0.02, 0.16, 0.02, darkMetalMat, 0.06, h * 0.5, d / 2 + 0.015);
        break;
      }

      case 'desk': {
        helperBox(w, 0.05, d, baseMat, 0, h - 0.025, 0);
        helperBox(w * 0.3, h - 0.05, d * 0.9, woodAccentMat, -w * 0.32, (h - 0.05) / 2, 0);
        helperBox(0.04, h - 0.05, d * 0.8, darkMetalMat, w * 0.44, (h - 0.05) / 2, 0);
        helperBox(w * 0.55, 0.35, 0.02, darkMetalMat, 0.05, h - 0.25, -d * 0.35);
        break;
      }

      case 'bookshelf': {
        helperBox(w, h, d, baseMat, 0, h / 2, 0);
        const shelves = 4;
        for (let i = 1; i <= shelves; i++) {
          helperBox(w * 0.92, 0.03, d * 0.95, woodAccentMat, 0, (h / (shelves + 1)) * i, 0);
        }
        break;
      }

      case 'kitchenCounter': {
        helperBox(w, h * 0.92, d, darkMetalMat, 0, (h * 0.92) / 2, 0);
        helperBox(w + 0.04, 0.05, d + 0.04, new THREE.MeshStandardMaterial({ color: '#f0ece5', roughness: 0.25 }), 0, h - 0.025, 0);
        helperBox(w * 0.3, 0.02, d * 0.5, new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.8 }), -w * 0.25, h + 0.005, 0);
        break;
      }

      case 'bathtub': {
        const tubGeo = new THREE.CylinderGeometry(w * 0.45, w * 0.35, h, 24);
        tubGeo.scale(1, 1, d / w);
        const tubMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15, metalness: 0.05 });
        const tubMesh = new THREE.Mesh(tubGeo, tubMat);
        tubMesh.position.set(0, h / 2, 0);
        tubMesh.castShadow = true;
        group.add(tubMesh);
        break;
      }

      case 'plant': {
        const potGeo = new THREE.CylinderGeometry(w * 0.45, w * 0.32, h * 0.35, 16);
        const potMat = new THREE.MeshStandardMaterial({ color: '#a8654b', roughness: 0.8 });
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.set(0, h * 0.175, 0);
        pot.castShadow = true;
        group.add(pot);

        const leafMat = new THREE.MeshStandardMaterial({ color: '#385e32', roughness: 0.65 });
        for (let i = 0; i < 5; i++) {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(w * 0.35, 8, 8), leafMat);
          sphere.position.set((Math.random() - 0.5) * w * 0.4, h * 0.55 + Math.random() * h * 0.35, (Math.random() - 0.5) * d * 0.4);
          sphere.castShadow = true;
          group.add(sphere);
        }
        break;
      }

      case 'stairs': {
        const numSteps = 14;
        const stepH = h / numSteps;
        const stepD = d / numSteps;
        for (let s = 0; s < numSteps; s++) {
          const sy = (s + 0.5) * stepH;
          const sz = -d / 2 + (s + 0.5) * stepD;
          helperBox(w, stepH, stepD, woodAccentMat, 0, sy, sz);
        }
        helperBox(0.04, 0.9, d, darkMetalMat, w / 2 - 0.02, h / 2 + 0.45, 0);
        break;
      }

      case 'door': {
        helperBox(w, h, 0.08, woodAccentMat, 0, h / 2, 0);
        const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.94, 0.04), baseMat);
        doorSlab.position.set(-w * 0.45 + (w * 0.45) * Math.cos(Math.PI / 4), h / 2, (w * 0.45) * Math.sin(Math.PI / 4));
        doorSlab.rotation.y = Math.PI / 4;
        group.add(doorSlab);
        break;
      }

      case 'window': {
        helperBox(w, h, 0.08, woodAccentMat, 0, h / 2, 0);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.9), glassMat);
        glass.position.set(0, h / 2, 0);
        group.add(glass);
        break;
      }

      default:
        helperBox(w, h, d, baseMat, 0, h / 2, 0);
        break;
    }

    return group;
  }

  frameScene(home) {
    if (!home.rooms.length) return;
    const xMin = Math.min(...home.rooms.map(r => r.x));
    const xMax = Math.max(...home.rooms.map(r => r.x + r.w));
    const yMin = Math.min(...home.rooms.map(r => r.y));
    const yMax = Math.max(...home.rooms.map(r => r.y + r.h));

    const span = Math.max(xMax - xMin, yMax - yMin) * M;
    this.controls.target.set(0, 1.2, 0);
    this.camera.position.set(span * 0.85, span * 1.15, span * 1.05);
    this.controls.update();
  }
}

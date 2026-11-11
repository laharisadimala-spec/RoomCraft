import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { M, FLOOR_MATERIALS, WALL_MATERIALS, LIGHTING_PRESETS } from '../core/constants.js';
import { getProceduralTexture } from './textureGen.js';

export class ThreeStudio {
  constructor(canvasElement) {
    this.canvas = canvasElement;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f4f0e8');

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.camera.position.set(12, 14, 16);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent camera going below ground
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;

    // Lighting rig
    this.hemiLight = new THREE.HemisphereLight('#ffffff', '#b5a489', 1.0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff6e5', 2.0);
    this.sunLight.position.set(12, 18, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 80;
    this.sunLight.shadow.bias = -0.0004;
    Object.assign(this.sunLight.shadow.camera, {
      left: -20, right: 20, top: 20, bottom: -20
    });
    this.sunLight.shadow.camera.updateProjectionMatrix();
    this.scene.add(this.sunLight);

    // Dynamic interior ceiling lights group
    this.interiorLightsGroup = new THREE.Group();
    this.scene.add(this.interiorLightsGroup);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#e8e2d5',
      roughness: 0.95,
      metalness: 0.02
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.01;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Architectural layer groups
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

    // Loop
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
      lightingConfig.preset === 'night' ? '#0b0e14' :
      lightingConfig.preset === 'sunset' ? '#2e1c2b' : '#f4f0e8'
    );
  }

  // Clear geometries and materials to avoid memory leaks
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

  // Set exploded building separation (0.0 = compact, 1.0 = fully exploded)
  setExplosionProgress(progress) {
    this.explosionProgress = Math.max(0, Math.min(1, progress));
    // Ceilings lift high
    this.ceilingsGroup.position.y = this.explosionProgress * 4.2;
    // Walls lift moderately
    this.wallsGroup.position.y = this.explosionProgress * 1.8;
    // Furniture lifts slightly
    this.furnGroup.position.y = this.explosionProgress * 0.9;
    // Floors remain rooted
    this.floorsGroup.position.y = 0;
  }

  // Rebuild complete 3D scene from home state
  rebuild(home, options = {}) {
    this.disposeGroup(this.floorsGroup);
    this.disposeGroup(this.wallsGroup);
    this.disposeGroup(this.furnGroup);
    this.disposeGroup(this.ceilingsGroup);
    this.disposeGroup(this.interiorLightsGroup);

    if (!home.rooms.length) return;

    // Center of scene
    const xMin = Math.min(...home.rooms.map(r => r.x));
    const xMax = Math.max(...home.rooms.map(r => r.x + r.w));
    const yMin = Math.min(...home.rooms.map(r => r.y));
    const yMax = Math.max(...home.rooms.map(r => r.y + r.h));
    const ox = (xMin + xMax) / 2;
    const oz = (yMin + yMax) / 2;

    const visibleFloorId = options.isolateFloorId || null; // null means all floors visible
    const wallThickness = 0.14; // metres

    // Apply lighting setup
    this.applyLighting(home.lighting);

    // Floor elevation map
    const floorElevMap = new Map();
    let currentElev = 0;
    (home.floors || []).forEach(fl => {
      floorElevMap.set(fl.id, currentElev);
      currentElev += (fl.height || 280) * M;
    });

    // 1. Build Rooms (Floors, Walls, Ceilings)
    for (const r of home.rooms) {
      if (visibleFloorId && r.floorId !== visibleFloorId) continue;

      const floorElev = floorElevMap.get(r.floorId) || 0;
      const cx = (r.x + r.w / 2 - ox) * M;
      const cz = (r.y + r.h / 2 - oz) * M;
      const rw = r.w * M;
      const rd = r.h * M;
      const rWallH = (r.wallH || 280) * M;

      // Floor slab Material
      const fMatDef = FLOOR_MATERIALS[r.floorMaterial] || FLOOR_MATERIALS.oakWood;
      const floorTex = getProceduralTexture(fMatDef.texture, r.floor || fMatDef.color);
      const floorMat = new THREE.MeshStandardMaterial({
        color: r.floor || fMatDef.color,
        map: floorTex,
        roughness: fMatDef.roughness,
        metalness: fMatDef.metalness
      });

      // Floor Mesh
      const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.05, rd), floorMat);
      floorMesh.position.set(cx, floorElev + 0.025, cz);
      floorMesh.receiveShadow = true;
      this.floorsGroup.add(floorMesh);

      // Wall Material
      const wMatDef = WALL_MATERIALS[r.wallMaterial] || WALL_MATERIALS.whitePaint;
      const wallTex = getProceduralTexture(wMatDef.texture, r.wall || wMatDef.color);
      const wallMat = new THREE.MeshStandardMaterial({
        color: r.wall || wMatDef.color,
        map: wallTex,
        roughness: wMatDef.roughness,
        metalness: wMatDef.metalness
      });

      // Ceiling Slab Mesh (for exploded view and realistic tops)
      const ceilingMat = new THREE.MeshStandardMaterial({
        color: '#f8f6f0',
        roughness: 0.9,
        metalness: 0.0
      });
      const ceilingMesh = new THREE.Mesh(new THREE.BoxGeometry(rw + wallThickness * 2, 0.06, rd + wallThickness * 2), ceilingMat);
      ceilingMesh.position.set(cx, floorElev + rWallH + 0.03, cz);
      ceilingMesh.castShadow = true;
      this.ceilingsGroup.add(ceilingMesh);

      // Walls: 4 sides
      const addWall = (w, h, d, px, py, pz) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        mesh.position.set(px, py, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.wallsGroup.add(mesh);
      };

      const halfH = floorElev + rWallH / 2;
      // North Wall
      addWall(rw + wallThickness, rWallH, wallThickness, cx, halfH, cz - rd / 2);
      // South Wall
      addWall(rw + wallThickness, rWallH, wallThickness, cx, halfH, cz + rd / 2);
      // West Wall
      addWall(wallThickness, rWallH, rd, cx - rw / 2, halfH, cz);
      // East Wall
      addWall(wallThickness, rWallH, rd, cx + rw / 2, halfH, cz);

      // Interior Light fixture in room center
      if (home.lighting?.artificialEnabled !== false) {
        const pointLight = new THREE.PointLight('#fff3db', (home.lighting?.artificialIntensity || 1.0) * 1.2, 10, 1.8);
        pointLight.position.set(cx, floorElev + rWallH - 0.35, cz);
        pointLight.castShadow = false; // lightweight soft illumination
        this.interiorLightsGroup.add(pointLight);

        // Ceiling downlight fixture mesh
        const downlight = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16),
          new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffaed', emissiveIntensity: 0.8 })
        );
        downlight.position.set(cx, floorElev + rWallH - 0.015, cz);
        this.ceilingsGroup.add(downlight);
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

    // Update explosion transform
    this.setExplosionProgress(this.explosionProgress);
  }

  // Create detailed architectural 3D meshes for each furniture category
  buildFurnitureMesh(f, floorElev) {
    const group = new THREE.Group();
    const w = f.w * M;
    const d = f.d * M;
    const h = f.h * M;
    const color = f.color || '#9c8a78';

    const baseMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.65,
      metalness: 0.08
    });

    const woodAccentMat = new THREE.MeshStandardMaterial({
      color: '#523a24',
      roughness: 0.45,
      metalness: 0.05
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: '#222326',
      roughness: 0.3,
      metalness: 0.8
    });

    const fabricMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.02
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#d4ebf2',
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      transparent: true,
      opacity: 0.75
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
        // Seat base
        helperBox(w, h * 0.45, d * 0.9, fabricMat, 0, h * 0.225, 0);
        // Backrest
        helperBox(w, h * 0.6, d * 0.22, fabricMat, 0, h * 0.55, -d * 0.35);
        // Left armrest
        helperBox(w * 0.14, h * 0.55, d * 0.9, fabricMat, -w * 0.43, h * 0.275, 0);
        // Right armrest
        helperBox(w * 0.14, h * 0.55, d * 0.9, fabricMat, w * 0.43, h * 0.275, 0);
        // 4 Sleek wooden feet
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
        // Wooden plinth frame
        helperBox(w, 0.18, d, woodAccentMat, 0, 0.09, 0);
        // Mattress
        helperBox(w * 0.94, 0.26, d * 0.94, new THREE.MeshStandardMaterial({ color: '#f3efe7', roughness: 0.9 }), 0, 0.31, 0);
        // Headboard
        helperBox(w, h, 0.12, fabricMat, 0, h / 2, -d / 2 + 0.06);
        // Pillows
        const pillowMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
        helperBox(w * 0.38, 0.1, d * 0.2, pillowMat, -w * 0.24, 0.48, -d * 0.28);
        helperBox(w * 0.38, 0.1, d * 0.2, pillowMat, w * 0.24, 0.48, -d * 0.28);
        break;
      }

      case 'table': {
        // Table top
        helperBox(w, 0.05, d, baseMat, 0, h - 0.025, 0);
        // 4 Legs
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
        // Metal frame legs
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
        // Seat
        helperBox(w, 0.04, d * 0.85, fabricMat, 0, h * 0.48, 0);
        // Backrest
        helperBox(w, h * 0.5, 0.04, baseMat, 0, h * 0.74, -d * 0.38);
        // 4 Legs
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
        // Cabinet
        helperBox(w, h * 0.38, d, woodAccentMat, 0, h * 0.19, 0);
        // Flat screen TV
        const tvW = w * 0.85;
        const tvH = h * 0.58;
        helperBox(tvW, tvH, 0.03, darkMetalMat, 0, h * 0.38 + tvH / 2 + 0.05, 0);
        // TV stand pole
        helperBox(0.08, 0.08, 0.06, darkMetalMat, 0, h * 0.38 + 0.04, 0);
        break;
      }

      case 'wardrobe': {
        helperBox(w, h, d, baseMat, 0, h / 2, 0);
        // Vertical door divider line
        helperBox(0.01, h * 0.9, 0.01, darkMetalMat, 0, h / 2, d / 2 + 0.005);
        // Door handles
        helperBox(0.02, 0.16, 0.02, darkMetalMat, -0.06, h * 0.5, d / 2 + 0.015);
        helperBox(0.02, 0.16, 0.02, darkMetalMat, 0.06, h * 0.5, d / 2 + 0.015);
        break;
      }

      case 'desk': {
        // Desktop
        helperBox(w, 0.05, d, baseMat, 0, h - 0.025, 0);
        // Drawer unit on left
        helperBox(w * 0.3, h - 0.05, d * 0.9, woodAccentMat, -w * 0.32, (h - 0.05) / 2, 0);
        // Right metal leg frame
        helperBox(0.04, h - 0.05, d * 0.8, darkMetalMat, w * 0.44, (h - 0.05) / 2, 0);
        // Modesty panel
        helperBox(w * 0.55, 0.35, 0.02, darkMetalMat, 0.05, h - 0.25, -d * 0.35);
        break;
      }

      case 'bookshelf': {
        // Outer frame
        helperBox(w, h, d, baseMat, 0, h / 2, 0);
        // Cutout shelves
        const shelves = 4;
        for (let i = 1; i <= shelves; i++) {
          helperBox(w * 0.92, 0.03, d * 0.95, woodAccentMat, 0, (h / (shelves + 1)) * i, 0);
        }
        break;
      }

      case 'kitchenCounter': {
        // Cabinet base
        helperBox(w, h * 0.92, d, darkMetalMat, 0, (h * 0.92) / 2, 0);
        // Countertop (marble/quartz)
        helperBox(w + 0.04, 0.05, d + 0.04, new THREE.MeshStandardMaterial({ color: '#f0ece5', roughness: 0.25 }), 0, h - 0.025, 0);
        // Stainless steel sink
        helperBox(w * 0.3, 0.02, d * 0.5, new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.8 }), -w * 0.25, h + 0.005, 0);
        break;
      }

      case 'bathtub': {
        // Bathtub body
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
        // Terracotta pot
        const potGeo = new THREE.CylinderGeometry(w * 0.45, w * 0.32, h * 0.35, 16);
        const potMat = new THREE.MeshStandardMaterial({ color: '#a8654b', roughness: 0.8 });
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.set(0, h * 0.175, 0);
        pot.castShadow = true;
        group.add(pot);

        // Foliage
        const leafMat = new THREE.MeshStandardMaterial({ color: '#3d6135', roughness: 0.7 });
        for (let i = 0; i < 5; i++) {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(w * 0.35, 8, 8), leafMat);
          sphere.position.set((Math.random() - 0.5) * w * 0.4, h * 0.55 + Math.random() * h * 0.35, (Math.random() - 0.5) * d * 0.4);
          sphere.castShadow = true;
          group.add(sphere);
        }
        break;
      }

      case 'stairs': {
        // Tiered steps
        const numSteps = 14;
        const stepH = h / numSteps;
        const stepD = d / numSteps;
        for (let s = 0; s < numSteps; s++) {
          const sy = (s + 0.5) * stepH;
          const sz = -d / 2 + (s + 0.5) * stepD;
          helperBox(w, stepH, stepD, woodAccentMat, 0, sy, sz);
        }
        // Handrail
        helperBox(0.04, 0.9, d, darkMetalMat, w / 2 - 0.02, h / 2 + 0.45, 0);
        break;
      }

      case 'door': {
        // Door frame
        helperBox(w, h, 0.08, woodAccentMat, 0, h / 2, 0);
        // Open door slab at 45 degree angle
        const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.94, 0.04), baseMat);
        doorSlab.position.set(-w * 0.45 + (w * 0.45) * Math.cos(Math.PI / 4), h / 2, (w * 0.45) * Math.sin(Math.PI / 4));
        doorSlab.rotation.y = Math.PI / 4;
        group.add(doorSlab);
        break;
      }

      case 'window': {
        // Outer frame
        helperBox(w, h, 0.08, woodAccentMat, 0, h / 2, 0);
        // Translucent glass pane
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

  // Frame complete scene in orbit camera
  frameScene(home) {
    if (!home.rooms.length) return;
    const xMin = Math.min(...home.rooms.map(r => r.x));
    const xMax = Math.max(...home.rooms.map(r => r.x + r.w));
    const yMin = Math.min(...home.rooms.map(r => r.y));
    const yMax = Math.max(...home.rooms.map(r => r.y + r.h));

    const span = Math.max(xMax - xMin, yMax - yMin) * M;
    this.controls.target.set(0, 1.2, 0);
    this.camera.position.set(span * 0.85, span * 1.2, span * 1.1);
    this.controls.update();
  }
}

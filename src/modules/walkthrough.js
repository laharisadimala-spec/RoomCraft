import * as THREE from 'three';
import { M } from '../core/constants.js';
import { inRect, getFurnAABB } from '../core/geometry.js';

export class WalkthroughController {
  constructor(threeStudio) {
    this.three = threeStudio;
    this.isActive = false;

    // Camera rig
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);
    this.playerHeight = 1.6; // 1.6m eye level
    this.playerRadius = 0.35; // 35cm collision radius

    this.position = new THREE.Vector3(0, this.playerHeight, 0);
    this.velocity = new THREE.Vector3();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

    // Movement state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false
    };

    this.moveSpeed = 3.2; // m/s
    this.sprintMultiplier = 1.7;

    // Tour state
    this.isTouring = false;
    this.tourWaypoints = [];
    this.currentWaypointIndex = 0;
    this.tourProgress = 0;

    // Cached collision obstacles
    this.walls = [];
    this.furnitureBoxes = [];
    this.roomWaypoints = [];

    // Minimap canvas
    this.minimapCanvas = null;

    // Event listeners bound
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
  }

  start(home, onExitCallback) {
    this.home = home;
    this.onExit = onExitCallback;
    this.isActive = true;
    this.isTouring = false;

    // Switch three.js camera
    this.three.controls.enabled = false;
    this.three.active = false; // we drive the render loop in walkthrough

    this.computeObstacles();
    this.initSpawnPosition();

    // Attach listeners
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('mousemove', this._onMouseMove);

    // Request pointer lock on canvas click
    this.three.canvas.addEventListener('click', this._requestLock);

    this.lastTime = performance.now();
    this._loop = this._loop.bind(this);
    this.animId = requestAnimationFrame(this._loop);
  }

  _requestLock = () => {
    if (this.isActive && document.pointerLockElement !== this.three.canvas) {
      this.three.canvas.requestPointerLock?.();
    }
  };

  stop() {
    this.isActive = false;
    this.isTouring = false;
    if (this.animId) cancelAnimationFrame(this.animId);

    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('mousemove', this._onMouseMove);
    this.three.canvas.removeEventListener('click', this._requestLock);

    if (document.pointerLockElement === this.three.canvas) {
      document.exitPointerLock?.();
    }

    this.three.controls.enabled = true;
    this.three.active = true;
  }

  computeObstacles() {
    this.walls = [];
    this.furnitureBoxes = [];
    this.roomWaypoints = [];

    if (!this.home.rooms.length) return;

    const xMin = Math.min(...this.home.rooms.map(r => r.x));
    const xMax = Math.max(...this.home.rooms.map(r => r.x + r.w));
    const yMin = Math.min(...this.home.rooms.map(r => r.y));
    const yMax = Math.max(...this.home.rooms.map(r => r.y + r.h));
    const ox = (xMin + xMax) / 2;
    const oz = (yMin + yMax) / 2;

    const currentFloor = this.home.floors.find(f => f.id === this.home.currentFloorId) || this.home.floors[0];
    const floorElev = (currentFloor?.elevation || 0) * M;

    // Room waypoints & boundary walls
    const activeRooms = this.home.rooms.filter(r => r.floorId === this.home.currentFloorId);

    activeRooms.forEach(r => {
      const cx = (r.x + r.w / 2 - ox) * M;
      const cz = (r.y + r.h / 2 - oz) * M;
      this.roomWaypoints.push({
        id: r.id,
        name: r.name,
        pos: new THREE.Vector3(cx, floorElev + this.playerHeight, cz)
      });

      // 4 Wall line segments for collision: [x0, z0, x1, z1]
      const minX = (r.x - ox) * M;
      const maxX = (r.x + r.w - ox) * M;
      const minZ = (r.y - oz) * M;
      const maxZ = (r.y + r.h - oz) * M;

      // Check doors on these walls to skip doorway segments
      this.walls.push({ x0: minX, z0: minZ, x1: maxX, z1: minZ, name: 'North' });
      this.walls.push({ x0: minX, z0: maxZ, x1: maxX, z1: maxZ, name: 'South' });
      this.walls.push({ x0: minX, z0: minZ, x1: minX, z1: maxZ, name: 'West' });
      this.walls.push({ x0: maxX, z0: minZ, x1: maxX, z1: maxZ, name: 'East' });
    });

    // Furniture collision boxes (AABBs in 3D world space)
    const activeFurn = this.home.furn.filter(f => f.floorId === this.home.currentFloorId && f.type !== 'door' && f.type !== 'window');
    activeFurn.forEach(f => {
      const b = getFurnAABB(f);
      const minX = (b.x0 - ox) * M;
      const maxX = (b.x1 - ox) * M;
      const minZ = (b.y0 - oz) * M;
      const maxZ = (b.y1 - oz) * M;
      this.furnitureBoxes.push({
        minX, maxX, minZ, maxZ,
        label: f.label || f.type
      });
    });
  }

  initSpawnPosition() {
    if (this.roomWaypoints.length > 0) {
      const first = this.roomWaypoints[0].pos;
      this.position.copy(first);
    } else {
      this.position.set(0, this.playerHeight, 0);
    }
    this.velocity.set(0, 0, 0);
    this.euler.set(0, 0, 0);
    this.camera.position.copy(this.position);
  }

  _onKeyDown(e) {
    if (!this.isActive) return;
    const k = e.key.toLowerCase();
    if (k === 'w' || e.code === 'ArrowUp') this.keys.forward = true;
    if (k === 's' || e.code === 'ArrowDown') this.keys.backward = true;
    if (k === 'a' || e.code === 'ArrowLeft') this.keys.left = true;
    if (k === 'd' || e.code === 'ArrowRight') this.keys.right = true;
    if (e.shiftKey) this.keys.sprint = true;
    if (e.key === 'Escape') {
      if (this.onExit) this.onExit();
    }
  }

  _onKeyUp(e) {
    if (!this.isActive) return;
    const k = e.key.toLowerCase();
    if (k === 'w' || e.code === 'ArrowUp') this.keys.forward = false;
    if (k === 's' || e.code === 'ArrowDown') this.keys.backward = false;
    if (k === 'a' || e.code === 'ArrowLeft') this.keys.left = false;
    if (k === 'd' || e.code === 'ArrowRight') this.keys.right = false;
    if (!e.shiftKey) this.keys.sprint = false;
  }

  _onMouseMove(e) {
    if (!this.isActive || this.isTouring) return;
    if (document.pointerLockElement === this.three.canvas) {
      const sensitivity = 0.0022;
      this.euler.y -= e.movementX * sensitivity;
      this.euler.x -= e.movementY * sensitivity;
      // Clamp pitch between -85 and +85 degrees
      this.euler.x = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.euler.x));
    }
  }

  _onPointerLockChange() {
    // If user presses escape and unlocks pointer, we keep walkthrough active with on-screen hint
  }

  // Real collision resolution with walls and furniture
  resolveCollisions(newPos) {
    const r = this.playerRadius;

    // 1. Resolve against furniture boxes
    for (const box of this.furnitureBoxes) {
      // Find closest point on AABB to cylinder center
      const closestX = Math.max(box.minX, Math.min(newPos.x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(newPos.z, box.maxZ));

      const dx = newPos.x - closestX;
      const dz = newPos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < r * r && distSq > 0.00001) {
        const dist = Math.sqrt(distSq);
        const push = (r - dist);
        newPos.x += (dx / dist) * push;
        newPos.z += (dz / dist) * push;
      }
    }

    // 2. Resolve against room boundary walls (slide along wall)
    for (const wall of this.walls) {
      // Distance from point to line segment
      const vx = wall.x1 - wall.x0;
      const vz = wall.z1 - wall.z0;
      const lenSq = vx * vx + vz * vz;
      if (lenSq < 0.001) continue;

      let t = ((newPos.x - wall.x0) * vx + (newPos.z - wall.z0) * vz) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const projX = wall.x0 + t * vx;
      const projZ = wall.z0 + t * vz;

      const dx = newPos.x - projX;
      const dz = newPos.z - projZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < r) {
        // If dist is small, push along normal away from wall
        const nx = dz / Math.sqrt(lenSq);
        const nz = -dx / Math.sqrt(lenSq);
        const push = (r - dist);
        newPos.x += (dx / (dist || 1)) * push;
        newPos.z += (dz / (dist || 1)) * push;
      }
    }

    return newPos;
  }

  // Start guided camera tour through all rooms
  startTour() {
    if (this.roomWaypoints.length < 2) return;
    this.isTouring = true;
    this.currentWaypointIndex = 0;
    this.tourProgress = 0;
  }

  pauseTour() {
    this.isTouring = false;
  }

  nextRoom() {
    if (this.roomWaypoints.length === 0) return;
    this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.roomWaypoints.length;
    this.position.copy(this.roomWaypoints[this.currentWaypointIndex].pos);
  }

  prevRoom() {
    if (this.roomWaypoints.length === 0) return;
    this.currentWaypointIndex = (this.currentWaypointIndex - 1 + this.roomWaypoints.length) % this.roomWaypoints.length;
    this.position.copy(this.roomWaypoints[this.currentWaypointIndex].pos);
  }

  resetPosition() {
    this.initSpawnPosition();
  }

  getCurrentRoomName() {
    if (!this.home || !this.home.rooms.length) return 'Open Space';
    const xMin = Math.min(...this.home.rooms.map(r => r.x));
    const xMax = Math.max(...this.home.rooms.map(r => r.x + r.w));
    const yMin = Math.min(...this.home.rooms.map(r => r.y));
    const yMax = Math.max(...this.home.rooms.map(r => r.y + r.h));
    const ox = (xMin + xMax) / 2;
    const oz = (yMin + yMax) / 2;

    const px = this.position.x / M + ox;
    const py = this.position.z / M + oz;

    const r = this.home.rooms.find(room => inRect(room, { x: px, y: py }));
    return r ? r.name : 'Hallway / Corridor';
  }

  _loop(time) {
    if (!this.isActive) return;
    const delta = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;

    if (this.isTouring && this.roomWaypoints.length > 1) {
      // Smooth cinematic tour animation
      const wp1 = this.roomWaypoints[this.currentWaypointIndex].pos;
      const wp2 = this.roomWaypoints[(this.currentWaypointIndex + 1) % this.roomWaypoints.length].pos;

      this.tourProgress += delta * 0.25; // 4 seconds per room transition
      if (this.tourProgress >= 1) {
        this.tourProgress = 0;
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.roomWaypoints.length;
      }

      // Smooth cosine easing
      const t = 0.5 - 0.5 * Math.cos(this.tourProgress * Math.PI);
      this.position.lerpVectors(wp1, wp2, t);

      // Look slightly ahead towards next target
      const lookDir = new THREE.Vector3().subVectors(wp2, wp1).normalize();
      if (lookDir.lengthSq() > 0.01) {
        this.euler.y = Math.atan2(-lookDir.x, -lookDir.z);
        this.euler.x = -0.05; // slight downward gaze
      }
    } else {
      // WASD physics movement
      const speed = (this.keys.sprint ? this.moveSpeed * this.sprintMultiplier : this.moveSpeed);
      const moveVec = new THREE.Vector3();

      if (this.keys.forward) moveVec.z -= 1;
      if (this.keys.backward) moveVec.z += 1;
      if (this.keys.left) moveVec.x -= 1;
      if (this.keys.right) moveVec.x += 1;

      if (moveVec.lengthSq() > 0.001) {
        moveVec.normalize();
        moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);

        const proposedPos = this.position.clone().addScaledVector(moveVec, speed * delta);
        this.position.copy(this.resolveCollisions(proposedPos));
      }
    }

    // Apply orientation and position to camera
    this.camera.quaternion.setFromEuler(this.euler);
    this.camera.position.copy(this.position);

    // Update Three renderer aspect ratio
    const w = this.three.canvas.parentElement.clientWidth;
    const h = this.three.canvas.parentElement.clientHeight;
    if (this.camera.aspect !== w / h) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    // Render scene with first-person camera
    this.three.renderer.render(this.three.scene, this.camera);

    // Update minimap
    this.renderMinimap();

    this.animId = requestAnimationFrame(this._loop);
  }

  // Draw interactive 2D minimap on HUD canvas
  renderMinimap() {
    if (!this.minimapCanvas) return;
    const cv = this.minimapCanvas;
    const ctx = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillRect(0, 0, W, H);

    if (!this.home.rooms.length) return;

    const xMin = Math.min(...this.home.rooms.map(r => r.x));
    const xMax = Math.max(...this.home.rooms.map(r => r.x + r.w));
    const yMin = Math.min(...this.home.rooms.map(r => r.y));
    const yMax = Math.max(...this.home.rooms.map(r => r.y + r.h));
    const ox = (xMin + xMax) / 2;
    const oz = (yMin + yMax) / 2;

    const bw = Math.max(100, xMax - xMin);
    const bh = Math.max(100, yMax - yMin);
    const scale = Math.min((W - 20) / bw, (H - 20) / bh);

    ctx.save();
    ctx.translate(W / 2, H / 2);

    // Draw active floor rooms
    for (const r of this.home.rooms) {
      if (r.floorId !== this.home.currentFloorId) continue;
      const rx = (r.x + r.w / 2 - ox) * scale;
      const ry = (r.y + r.h / 2 - oz) * scale;
      const rw = r.w * scale;
      const rh = r.h * scale;

      ctx.fillStyle = '#eadecc';
      ctx.fillRect(rx - rw / 2, ry - rh / 2, rw, rh);
      ctx.strokeStyle = '#8a6d4b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx - rw / 2, ry - rh / 2, rw, rh);
    }

    // Draw player position and vision cone
    const px = (this.position.x / M) * scale;
    const py = (this.position.z / M) * scale;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-this.euler.y + Math.PI);

    // Vision cone
    ctx.fillStyle = 'rgba(197, 160, 89, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 32, -Math.PI / 4, Math.PI / 4);
    ctx.closePath();
    ctx.fill();

    // Player dot
    ctx.fillStyle = '#b23b2a';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}

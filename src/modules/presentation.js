import * as THREE from 'three';
import { M } from '../core/constants.js';

export class PresentationController {
  constructor(threeStudio) {
    this.three = threeStudio;
    this.isActive = false;
    this.isAutoPlaying = true;
    this.currentRoomIndex = 0;
    this.roomTargets = [];
    this.tourProgress = 0;
    this.animId = null;
    this.onRoomChange = null;
  }

  start(home, onRoomChangeCallback) {
    this.home = home;
    this.onRoomChange = onRoomChangeCallback;
    this.isActive = true;
    this.isAutoPlaying = true;
    this.currentRoomIndex = 0;
    this.tourProgress = 0;

    this.computeRoomTargets();
    if (this.roomTargets.length > 0) {
      this.teleportToRoom(0);
    }

    this.lastTime = performance.now();
    this._loop = this._loop.bind(this);
    this.animId = requestAnimationFrame(this._loop);
  }

  stop() {
    this.isActive = false;
    this.isAutoPlaying = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  computeRoomTargets() {
    this.roomTargets = [];
    if (!this.home.rooms.length) return;

    const xMin = Math.min(...this.home.rooms.map(r => r.x));
    const xMax = Math.max(...this.home.rooms.map(r => r.x + r.w));
    const yMin = Math.min(...this.home.rooms.map(r => r.y));
    const yMax = Math.max(...this.home.rooms.map(r => r.y + r.h));
    const ox = (xMin + xMax) / 2;
    const oz = (yMin + yMax) / 2;

    const floorElevMap = new Map();
    let elev = 0;
    (this.home.floors || []).forEach(f => {
      floorElevMap.set(f.id, elev);
      elev += (f.height || 280) * M;
    });

    this.home.rooms.forEach((r, idx) => {
      const floorElev = floorElevMap.get(r.floorId) || 0;
      const cx = (r.x + r.w / 2 - ox) * M;
      const cz = (r.y + r.h / 2 - oz) * M;
      const rw = r.w * M;
      const rd = r.h * M;
      const areaM2 = ((r.w * r.h) / 10000).toFixed(1);

      // Camera positioned at 45 degree angle looking down into the room
      const camPos = new THREE.Vector3(cx + rw * 0.45, floorElev + 3.2, cz + rd * 0.65);
      const targetPos = new THREE.Vector3(cx, floorElev + 0.9, cz);

      this.roomTargets.push({
        index: idx,
        name: r.name,
        areaM2,
        dimensions: `${(r.w / 100).toFixed(2)}m × ${(r.h / 100).toFixed(2)}m`,
        camPos,
        targetPos
      });
    });
  }

  teleportToRoom(idx) {
    if (idx < 0 || idx >= this.roomTargets.length) return;
    this.currentRoomIndex = idx;
    const target = this.roomTargets[idx];
    this.three.camera.position.copy(target.camPos);
    this.three.controls.target.copy(target.targetPos);
    this.three.controls.update();

    if (this.onRoomChange) {
      this.onRoomChange(target);
    }
  }

  nextRoom() {
    if (this.roomTargets.length === 0) return;
    this.currentRoomIndex = (this.currentRoomIndex + 1) % this.roomTargets.length;
    this.tourProgress = 0;
    this.teleportToRoom(this.currentRoomIndex);
  }

  prevRoom() {
    if (this.roomTargets.length === 0) return;
    this.currentRoomIndex = (this.currentRoomIndex - 1 + this.roomTargets.length) % this.roomTargets.length;
    this.tourProgress = 0;
    this.teleportToRoom(this.currentRoomIndex);
  }

  toggleAutoPlay() {
    this.isAutoPlaying = !this.isAutoPlaying;
    return this.isAutoPlaying;
  }

  _loop(time) {
    if (!this.isActive) return;
    const delta = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;

    if (this.isAutoPlaying && this.roomTargets.length > 1) {
      this.tourProgress += delta * 0.16; // ~6 seconds per room dwell

      const current = this.roomTargets[this.currentRoomIndex];
      const next = this.roomTargets[(this.currentRoomIndex + 1) % this.roomTargets.length];

      // Subtle slow pan while dwelling
      this.three.camera.position.x += Math.sin(time * 0.0008) * 0.003;
      this.three.controls.update();

      if (this.tourProgress >= 1) {
        this.tourProgress = 0;
        this.nextRoom();
      }
    }

    this.animId = requestAnimationFrame(this._loop);
  }
}

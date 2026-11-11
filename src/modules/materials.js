import { FLOOR_MATERIALS, WALL_MATERIALS } from '../core/constants.js';

const MATERIAL_COMBOS_KEY = 'roomcraft-saved-material-combos-v2';

export class MaterialStudio {
  constructor(onApplyCallback) {
    this.onApply = onApplyCallback;
    this.savedCombos = this.loadSavedCombos();
  }

  getFloorMaterials() {
    return Object.values(FLOOR_MATERIALS);
  }

  getWallMaterials() {
    return Object.values(WALL_MATERIALS);
  }

  loadSavedCombos() {
    try {
      const data = localStorage.getItem(MATERIAL_COMBOS_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return [
      {
        id: 'scandi_oak',
        name: 'Nordic Oak & Linen',
        floor: 'oakWood',
        floorColor: '#cbab81',
        wall: 'whitePaint',
        wallColor: '#fbfaf7'
      },
      {
        id: 'italian_marble',
        name: 'Carrara Marble & Champagne',
        floor: 'marble',
        floorColor: '#f0ece5',
        wall: 'creamPaint',
        wallColor: '#f5eee3'
      },
      {
        id: 'industrial_loft',
        name: 'Industrial Concrete & Terracotta',
        floor: 'concrete',
        floorColor: '#b5b2ac',
        wall: 'brick',
        wallColor: '#a3573c'
      },
      {
        id: 'acoustic_walnut',
        name: 'Dark Walnut & Acoustic Slats',
        floor: 'walnutWood',
        floorColor: '#5b402e',
        wall: 'woodSlat',
        wallColor: '#99764d'
      }
    ];
  }

  saveCustomCombo(name, floorMatId, floorColor, wallMatId, wallColor) {
    const combo = {
      id: Math.random().toString(36).slice(2, 9),
      name,
      floor: floorMatId,
      floorColor,
      wall: wallMatId,
      wallColor,
      createdAt: new Date().toISOString()
    };
    this.savedCombos.push(combo);
    try {
      localStorage.setItem(MATERIAL_COMBOS_KEY, JSON.stringify(this.savedCombos));
    } catch {}
    return combo;
  }

  applyToRoom(room, { floorMatId, floorColor, wallMatId, wallColor }) {
    if (!room) return;
    if (floorMatId) room.floorMaterial = floorMatId;
    if (floorColor) room.floor = floorColor;
    if (wallMatId) room.wallMaterial = wallMatId;
    if (wallColor) room.wall = wallColor;

    if (this.onApply) this.onApply();
  }

  applyGlobally(home, combo) {
    if (!home || !home.rooms) return;
    home.rooms.forEach(r => {
      if (combo.floor) r.floorMaterial = combo.floor;
      if (combo.floorColor) r.floor = combo.floorColor;
      if (combo.wall) r.wallMaterial = combo.wall;
      if (combo.wallColor) r.wall = combo.wallColor;
    });

    if (this.onApply) this.onApply();
  }
}

import { makeFloor, makeFurn } from '../core/state.js';
import { snap } from '../core/geometry.js';

export class FloorManager {
  constructor(onUpdateCallback) {
    this.onUpdate = onUpdateCallback;
    this.isolatedFloorId = null; // null = show all floors in 3D
  }

  getFloors(home) {
    return home.floors || [];
  }

  getActiveFloor(home) {
    return home.floors.find(f => f.id === home.currentFloorId) || home.floors[0];
  }

  setActiveFloor(home, floorId) {
    if (home.floors.some(f => f.id === floorId)) {
      home.currentFloorId = floorId;
      if (this.onUpdate) this.onUpdate();
    }
  }

  addFloor(home, customName) {
    const floors = home.floors || [];
    const count = floors.length;
    const name = customName || (count === 1 ? 'First Floor (Level 1)' : count === 2 ? 'Second Floor (Level 2)' : `Level ${count}`);

    // Compute cumulative elevation
    let elevation = 0;
    floors.forEach(f => {
      elevation += (f.height || 280);
    });

    const newFloor = makeFloor(name, elevation, 280);
    home.floors.push(newFloor);
    home.currentFloorId = newFloor.id;

    if (this.onUpdate) this.onUpdate();
    return newFloor;
  }

  removeFloor(home, floorId) {
    if (home.floors.length <= 1) {
      alert('A project must have at least one floor.');
      return false;
    }

    // Remove rooms and furniture on this floor
    home.rooms = home.rooms.filter(r => r.floorId !== floorId);
    home.furn = home.furn.filter(f => f.floorId !== floorId);
    home.floors = home.floors.filter(f => f.id !== floorId);

    // Recompute elevations
    let elev = 0;
    home.floors.forEach(f => {
      f.elevation = elev;
      elev += (f.height || 280);
    });

    home.currentFloorId = home.floors[0].id;
    if (this.isolatedFloorId === floorId) this.isolatedFloorId = null;

    if (this.onUpdate) this.onUpdate();
    return true;
  }

  renameFloor(home, floorId, newName) {
    const fl = home.floors.find(f => f.id === floorId);
    if (fl && newName.trim()) {
      fl.name = newName.trim();
      if (this.onUpdate) this.onUpdate();
    }
  }

  // Insert an architectural staircase connecting to next floor
  addStaircase(home, x, y) {
    const activeFloor = this.getActiveFloor(home);
    const stairs = makeFurn('stairs', snap(x || 200), snap(y || 200), 0, activeFloor.id);
    home.furn.push(stairs);
    if (this.onUpdate) this.onUpdate();
    return stairs;
  }

  // Toggle single-floor 3D isolation vs all-floors view
  setIsolatedFloor(floorId) {
    this.isolatedFloorId = floorId;
    if (this.onUpdate) this.onUpdate();
  }

  getFloorStats(home, floorId) {
    const rooms = home.rooms.filter(r => r.floorId === floorId);
    const furn = home.furn.filter(f => f.floorId === floorId);
    const totalAreaM2 = rooms.reduce((sum, r) => sum + (r.w * r.h) / 10000, 0);

    return {
      roomCount: rooms.length,
      furnCount: furn.length,
      areaM2: totalAreaM2
    };
  }
}

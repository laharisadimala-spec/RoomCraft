import { MAKEOVER_STYLES, FLOOR_MATERIALS, WALL_MATERIALS } from '../core/constants.js';
import { snap, inRect } from '../core/geometry.js';

export class MakeoverEngine {
  constructor(homeManager) {
    this.hm = homeManager;
    this.lastBeforeSnapshot = null;
    this.currentMakeoverPreview = null;
  }

  getStyles() {
    return Object.values(MAKEOVER_STYLES);
  }

  // Generate a transformed preview of a room under a style
  generateMakeover(room, styleId, home) {
    const style = MAKEOVER_STYLES[styleId];
    if (!style || !room) return null;

    // Snapshot current state for comparison/undo
    const originalRoom = JSON.parse(JSON.stringify(room));
    const originalFurn = JSON.parse(JSON.stringify(
      home.furn.filter(f => inRect(room, { x: f.x, y: f.y }))
    ));
    const originalLighting = JSON.parse(JSON.stringify(home.lighting || {}));

    // New room properties
    const updatedRoom = {
      ...room,
      wall: style.wallColor,
      wallMaterial: style.wallMaterial,
      floor: style.floorColor,
      floorMaterial: style.floorMaterial
    };

    // Re-color and reorganize furniture
    const updatedFurn = originalFurn.map((f, idx) => {
      const themedColor = style.furnColorMap[f.type] || f.color;
      return {
        ...f,
        color: themedColor
      };
    });

    // Smart repositioning based on room purpose & style aesthetic:
    // If living room: center seating cluster facing north or south wall
    const isLiving = /living|lounge|salon|hall/i.test(room.name);
    const isBed = /bed/i.test(room.name);
    const isDining = /dining|kitchen/i.test(room.name);

    if (isLiving) {
      const sofa = updatedFurn.find(f => f.type === 'sofa');
      const table = updatedFurn.find(f => f.type === 'coffeeTable' || f.type === 'table');
      const tv = updatedFurn.find(f => f.type === 'tvUnit');
      const chair = updatedFurn.find(f => f.type === 'armchair' || f.type === 'chair');
      const plant = updatedFurn.find(f => f.type === 'plant');

      if (sofa) {
        sofa.x = snap(room.x + room.w / 2);
        sofa.y = snap(room.y + room.h * 0.65);
        sofa.rot = 0;
      }
      if (table) {
        table.x = snap(room.x + room.w / 2);
        table.y = snap(room.y + room.h * 0.45);
        table.rot = 0;
      }
      if (tv) {
        tv.x = snap(room.x + room.w / 2);
        tv.y = snap(room.y + 40);
        tv.rot = 0;
      }
      if (chair) {
        chair.x = snap(room.x + room.w * 0.22);
        chair.y = snap(room.y + room.h * 0.5);
        chair.rot = 90;
      }
      if (plant) {
        plant.x = snap(room.x + room.w - 45);
        plant.y = snap(room.y + 45);
      }
    } else if (isBed) {
      const bed = updatedFurn.find(f => f.type === 'bed');
      const ns1 = updatedFurn.filter(f => f.type === 'nightstand')[0];
      const ns2 = updatedFurn.filter(f => f.type === 'nightstand')[1];
      const wardrobe = updatedFurn.find(f => f.type === 'wardrobe');
      const desk = updatedFurn.find(f => f.type === 'desk');

      if (bed) {
        bed.x = snap(room.x + room.w / 2);
        bed.y = snap(room.y + room.h * 0.6);
        bed.rot = 0;

        if (ns1) {
          ns1.x = snap(bed.x - bed.w / 2 - ns1.w / 2 - 10);
          ns1.y = snap(bed.y);
        }
        if (ns2) {
          ns2.x = snap(bed.x + bed.w / 2 + ns2.w / 2 + 10);
          ns2.y = snap(bed.y);
        }
      }
      if (wardrobe) {
        wardrobe.x = snap(room.x + room.w - wardrobe.w / 2 - 20);
        wardrobe.y = snap(room.y + wardrobe.d / 2 + 30);
        wardrobe.rot = 0;
      }
      if (desk) {
        desk.x = snap(room.x + desk.w / 2 + 20);
        desk.y = snap(room.y + desk.d / 2 + 30);
        desk.rot = 0;
      }
    } else if (isDining) {
      const table = updatedFurn.find(f => f.type === 'table');
      const chairs = updatedFurn.filter(f => f.type === 'chair');
      if (table) {
        table.x = snap(room.x + room.w / 2);
        table.y = snap(room.y + room.h / 2);
        chairs.forEach((ch, i) => {
          if (i % 2 === 0) {
            ch.x = snap(table.x + (i === 0 ? -40 : 40));
            ch.y = snap(table.y - table.d / 2 - 35);
            ch.rot = 0;
          } else {
            ch.x = snap(table.x + (i === 1 ? -40 : 40));
            ch.y = snap(table.y + table.d / 2 + 35);
            ch.rot = 180;
          }
        });
      }
    }

    return {
      style,
      before: {
        room: originalRoom,
        furn: originalFurn,
        lighting: originalLighting
      },
      after: {
        room: updatedRoom,
        furn: updatedFurn,
        lighting: {
          ...home.lighting,
          preset: style.lightingPreset,
          colorTemp: style.colorTemp
        }
      }
    };
  }

  // Apply makeover to the real home model
  applyMakeover(makeoverResult, home) {
    if (!makeoverResult || !makeoverResult.after) return;
    this.lastBeforeSnapshot = JSON.parse(JSON.stringify(home));

    // Update room
    const targetRoom = home.rooms.find(r => r.id === makeoverResult.after.room.id);
    if (targetRoom) {
      Object.assign(targetRoom, makeoverResult.after.room);
    }

    // Update furniture
    const afterFurnMap = new Map(makeoverResult.after.furn.map(f => [f.id, f]));
    home.furn.forEach(f => {
      if (afterFurnMap.has(f.id)) {
        Object.assign(f, afterFurnMap.get(f.id));
      }
    });

    // Update lighting
    if (makeoverResult.after.lighting) {
      home.lighting = { ...home.lighting, ...makeoverResult.after.lighting };
    }
  }

  // Undo the last applied makeover
  undoMakeover(home) {
    if (!this.lastBeforeSnapshot) return false;
    Object.assign(home, JSON.parse(JSON.stringify(this.lastBeforeSnapshot)));
    this.lastBeforeSnapshot = null;
    return true;
  }

  // Save makeover as a new design variation
  saveAsVariation(makeoverResult, home, variationName) {
    if (!home.variations) home.variations = [];
    const name = variationName || `${makeoverResult.style.name} Makeover`;
    const variation = {
      id: Math.random().toString(36).slice(2, 9),
      name,
      createdAt: new Date().toISOString(),
      styleId: makeoverResult.style.id,
      styleName: makeoverResult.style.name,
      snapshot: JSON.parse(JSON.stringify(home))
    };
    home.variations.push(variation);
    return variation;
  }
}

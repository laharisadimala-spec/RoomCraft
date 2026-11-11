import { FURN, FLOOR_MATERIALS, WALL_MATERIALS, LIGHTING_PRESETS, DEFAULT_BUDGET_RATES, STORAGE_KEY } from './constants.js';
import { uid, snap } from './geometry.js';

export function makeFloor(name = 'Ground Floor', elevation = 0, height = 280) {
  return {
    id: uid(),
    name,
    elevation, // cm
    height     // cm
  };
}

export function makeRoom(name, x, y, w, h, floorId, extra = {}) {
  return {
    id: uid(),
    floorId: floorId || 'floor-0',
    name,
    x, y, w, h,
    wallH: 280,
    wall: '#f5f1ea',
    floor: '#d9c3a5',
    floorMaterial: 'oakWood',
    wallMaterial: 'creamPaint',
    ...extra
  };
}

export function makeFurn(type, x, y, rot = 0, floorId = 'floor-0', extra = {}) {
  const f = FURN[type] || { w: 100, d: 100, h: 80, color: '#9c8a78', label: type, price: 15000 };
  return {
    id: uid(),
    floorId: floorId || 'floor-0',
    type,
    label: f.label,
    x, y,
    w: f.w,
    d: f.d,
    h: f.h,
    rot,
    color: f.color,
    material: null,
    price: f.price,
    ...extra
  };
}

export function makeDoor(x, y, w = 90, d = 15, rot = 0, floorId = 'floor-0', extra = {}) {
  return {
    id: uid(),
    floorId: floorId || 'floor-0',
    type: 'door',
    label: 'Interior Door',
    x, y, w, d, h: 210,
    rot,
    color: '#8b6b47',
    openAngle: 90,
    price: 14000,
    ...extra
  };
}

export function makeWindow(x, y, w = 140, d = 15, rot = 0, floorId = 'floor-0', extra = {}) {
  return {
    id: uid(),
    floorId: floorId || 'floor-0',
    type: 'window',
    label: 'Window Aperture',
    x, y, w, d, h: 130,
    elevation: 85, // elevation above floor in cm
    rot,
    color: '#bde0fe',
    price: 18000,
    ...extra
  };
}

export function normalizeHome(raw) {
  if (!raw || typeof raw !== 'object') return template2bhk();

  const home = { ...raw };
  home.name = home.name || 'My home';

  // Ensure floors array exists
  if (!Array.isArray(home.floors) || home.floors.length === 0) {
    home.floors = [
      { id: 'floor-0', name: 'Ground Floor', elevation: 0, height: 280 }
    ];
  }
  const defaultFloorId = home.floors[0].id;
  home.currentFloorId = home.currentFloorId || defaultFloorId;

  // Ensure rooms array
  if (!Array.isArray(home.rooms)) home.rooms = [];
  home.rooms.forEach(r => {
    r.id = r.id || uid();
    r.floorId = r.floorId || defaultFloorId;
    r.wallH = r.wallH || 280;
    r.wall = r.wall || '#f5f1ea';
    r.floor = r.floor || '#d9c3a5';
    r.floorMaterial = r.floorMaterial || 'oakWood';
    r.wallMaterial = r.wallMaterial || 'creamPaint';
  });

  // Ensure furn array
  if (!Array.isArray(home.furn)) home.furn = [];
  home.furn.forEach(f => {
    f.id = f.id || uid();
    f.floorId = f.floorId || defaultFloorId;
    const cat = FURN[f.type];
    if (cat) {
      f.label = f.label || cat.label;
      f.price = f.price || cat.price;
    }
    f.rot = f.rot || 0;
  });

  // Ensure lighting configuration
  home.lighting = home.lighting || {
    preset: 'afternoon',
    sunIntensity: 1.8,
    ambientIntensity: 0.9,
    artificialIntensity: 1.0,
    colorTemp: 'warm',
    shadows: true,
    artificialEnabled: true
  };

  // Ensure budget rates
  home.budgetRates = home.budgetRates || { ...DEFAULT_BUDGET_RATES };

  // Ensure variations
  if (!Array.isArray(home.variations)) home.variations = [];

  return home;
}

export function blankHome() {
  const gFloor = { id: 'floor-0', name: 'Ground Floor', elevation: 0, height: 280 };
  return {
    name: 'My Custom Home',
    floors: [gFloor],
    currentFloorId: gFloor.id,
    rooms: [],
    furn: [],
    lighting: {
      preset: 'afternoon',
      sunIntensity: 1.8,
      ambientIntensity: 0.9,
      artificialIntensity: 1.0,
      colorTemp: 'warm',
      shadows: true,
      artificialEnabled: true
    },
    budgetRates: { ...DEFAULT_BUDGET_RATES },
    variations: []
  };
}

export function template2bhk() {
  const gFloor = { id: 'floor-0', name: 'Ground Floor', elevation: 0, height: 280 };
  const fid = gFloor.id;

  const L = makeRoom('Living & Lounge', 0, 0, 440, 380, fid, {
    floorMaterial: 'oakWood',
    floor: '#cbab81',
    wallMaterial: 'creamPaint',
    wall: '#f7f2ea'
  });
  const K = makeRoom('Kitchen & Dining', 440, 0, 320, 260, fid, {
    floorMaterial: 'ceramic',
    floor: '#ded8ce',
    wallMaterial: 'texturedPaint',
    wall: '#f2eee9'
  });
  const B1 = makeRoom('Master Bedroom', 0, 380, 360, 340, fid, {
    floorMaterial: 'walnutWood',
    floor: '#5b402e',
    wallMaterial: 'creamPaint',
    wall: '#f5eee3'
  });
  const B2 = makeRoom('Guest Bedroom', 360, 380, 280, 340, fid, {
    floorMaterial: 'oakWood',
    floor: '#d6b88d',
    wallMaterial: 'whitePaint',
    wall: '#fcfaf7'
  });
  const BA = makeRoom('Master Bath', 440, 260, 200, 120, fid, {
    floorMaterial: 'marble',
    floor: '#f0ece5',
    wallMaterial: 'texturedPaint',
    wall: '#ded8ce'
  });

  return {
    name: 'Contemporary 2BHK Apartment',
    floors: [gFloor],
    currentFloorId: fid,
    rooms: [L, K, B1, B2, BA],
    furn: [
      // Living
      makeFurn('sofa', 160, 280, 0, fid, { color: '#4a443e' }),
      makeFurn('coffeeTable', 160, 200, 0, fid, { color: '#99764d' }),
      makeFurn('tvUnit', 160, 40, 0, fid, { color: '#2b2a28' }),
      makeFurn('armchair', 320, 240, 270, fid, { color: '#a38f78' }),
      makeFurn('plant', 390, 50, 0, fid, { color: '#4a6e45' }),

      // Dining & Kitchen
      makeFurn('table', 580, 130, 0, fid, { color: '#8a6b47' }),
      makeFurn('chair', 580, 70, 0, fid, { color: '#a88963' }),
      makeFurn('chair', 580, 190, 180, fid, { color: '#a88963' }),
      makeFurn('kitchenCounter', 640, 225, 0, fid, { color: '#32363b' }),

      // Master Bedroom
      makeFurn('bed', 180, 560, 0, fid, { color: '#d6cbbe' }),
      makeFurn('nightstand', 65, 560, 0, fid, { color: '#6e5a44' }),
      makeFurn('nightstand', 295, 560, 0, fid, { color: '#6e5a44' }),
      makeFurn('wardrobe', 315, 430, 90, fid, { color: '#544738' }),

      // Guest Bedroom
      makeFurn('bed', 490, 560, 0, fid, { color: '#eae5dc' }),
      makeFurn('desk', 600, 420, 90, fid, { color: '#826d57' }),
      makeFurn('chair', 550, 420, 270, fid, { color: '#a38f78' }),

      // Bath
      makeFurn('bathtub', 540, 320, 0, fid, { color: '#ffffff' }),

      // Architectural Openings
      makeDoor(220, 0, 90, 15, 0, fid),
      makeDoor(180, 380, 90, 15, 0, fid),
      makeDoor(440, 320, 15, 90, 90, fid),
      makeWindow(40, 180, 15, 140, 90, fid),
      makeWindow(20, 550, 15, 140, 90, fid)
    ],
    lighting: {
      preset: 'afternoon',
      sunIntensity: 1.8,
      ambientIntensity: 0.9,
      artificialIntensity: 1.0,
      colorTemp: 'warm',
      shadows: true,
      artificialEnabled: true
    },
    budgetRates: { ...DEFAULT_BUDGET_RATES },
    variations: []
  };
}

export function templateExhibitionShowcase() {
  const gFloor = { id: 'floor-0', name: 'Level 0 — Grand Living & Dining', elevation: 0, height: 280 };
  const f1Floor = { id: 'floor-1', name: 'Level 1 — Master Penthouse & Terrace', elevation: 280, height: 280 };

  const f0 = gFloor.id;
  const f1 = f1Floor.id;

  // Level 0 Rooms
  const grandSalon = makeRoom('Grand Salon & Foyer', 0, 0, 520, 440, f0, {
    floorMaterial: 'marble',
    floor: '#f4f0ea',
    wallMaterial: 'creamPaint',
    wall: '#26282b'
  });
  const gourmetKitchen = makeRoom('Gourmet Kitchen & Dining', 520, 0, 380, 300, f0, {
    floorMaterial: 'ceramic',
    floor: '#ded8ce',
    wallMaterial: 'woodSlat',
    wall: '#99764d'
  });
  const guestSuite = makeRoom('Executive Guest Suite', 520, 300, 380, 320, f0, {
    floorMaterial: 'oakWood',
    floor: '#cbab81',
    wallMaterial: 'texturedPaint',
    wall: '#ece4d5'
  });
  const powderRoom = makeRoom('Powder Room', 0, 440, 220, 180, f0, {
    floorMaterial: 'marble',
    floor: '#f0ece5',
    wallMaterial: 'whitePaint',
    wall: '#ffffff'
  });

  // Level 1 Rooms
  const masterPenthouse = makeRoom('Master Penthouse Suite', 0, 0, 520, 420, f1, {
    floorMaterial: 'walnutWood',
    floor: '#5b402e',
    wallMaterial: 'texturedPaint',
    wall: '#f5eee3'
  });
  const luxuryBath = makeRoom('Spa Ensuite Bathroom', 520, 0, 380, 240, f1, {
    floorMaterial: 'marble',
    floor: '#f0ece5',
    wallMaterial: 'texturedPaint',
    wall: '#ded8ce'
  });
  const skyTerrace = makeRoom('Sky Garden & Terrace', 0, 420, 520, 200, f1, {
    floorMaterial: 'stone',
    floor: '#636569',
    wallMaterial: 'concrete',
    wall: '#9e9c97'
  });
  const walkInCloset = makeRoom('Walk-In Dressing Suite', 520, 240, 380, 260, f1, {
    floorMaterial: 'carpet',
    floor: '#cfc6b8',
    wallMaterial: 'woodSlat',
    wall: '#99764d'
  });

  return {
    name: 'Skyline Grand Villa — Exhibition Edition',
    floors: [gFloor, f1Floor],
    currentFloorId: f0,
    rooms: [grandSalon, gourmetKitchen, guestSuite, powderRoom, masterPenthouse, luxuryBath, skyTerrace, walkInCloset],
    furn: [
      // Level 0: Grand Salon
      makeFurn('sofa', 220, 300, 0, f0, { color: '#1f2124' }),
      makeFurn('coffeeTable', 220, 210, 0, f0, { color: '#c5a059' }),
      makeFurn('tvUnit', 220, 40, 0, f0, { color: '#2b2a28' }),
      makeFurn('armchair', 100, 220, 90, f0, { color: '#c5a059' }),
      makeFurn('armchair', 340, 220, 270, f0, { color: '#c5a059' }),
      makeFurn('plant', 460, 60, 0, f0, { color: '#3e6337' }),
      makeFurn('stairs', 450, 360, 0, f0, { color: '#8a6b47' }), // Architectural Staircase!

      // Level 0: Gourmet Kitchen & Dining
      makeFurn('kitchenCounter', 720, 70, 0, f0, { color: '#1a1918' }),
      makeFurn('table', 700, 210, 0, f0, { color: '#332a24' }),
      makeFurn('chair', 640, 210, 90, f0, { color: '#c5a059' }),
      makeFurn('chair', 760, 210, 270, f0, { color: '#c5a059' }),
      makeFurn('plant', 860, 60, 0, f0, { color: '#4a6e45' }),

      // Level 0: Guest Suite
      makeFurn('bed', 710, 480, 0, f0, { color: '#dcd4c7' }),
      makeFurn('nightstand', 590, 480, 0, f0, { color: '#7a6855' }),
      makeFurn('nightstand', 830, 480, 0, f0, { color: '#7a6855' }),
      makeFurn('wardrobe', 850, 360, 90, f0, { color: '#544738' }),

      // Level 0: Powder Room
      makeFurn('bathtub', 110, 530, 0, f0, { color: '#ffffff' }),

      // Level 1: Master Penthouse Suite
      makeFurn('bed', 260, 180, 0, f1, { color: '#2b2c30' }),
      makeFurn('nightstand', 140, 180, 0, f1, { color: '#c5a059' }),
      makeFurn('nightstand', 380, 180, 0, f1, { color: '#c5a059' }),
      makeFurn('sofa', 260, 340, 180, f1, { color: '#423d38' }),
      makeFurn('tvUnit', 260, 400, 0, f1, { color: '#1a1918' }),
      makeFurn('desk', 80, 320, 90, f1, { color: '#5b402e' }),
      makeFurn('chair', 140, 320, 270, f1, { color: '#c5a059' }),
      makeFurn('plant', 460, 360, 0, f1, { color: '#3e6337' }),

      // Level 1: Spa Bathroom
      makeFurn('bathtub', 710, 120, 0, f1, { color: '#ffffff' }),

      // Level 1: Walk-In Closet
      makeFurn('wardrobe', 710, 370, 0, f1, { color: '#4a3b2c' }),
      makeFurn('wardrobe', 850, 370, 90, f1, { color: '#4a3b2c' }),

      // Level 1: Sky Terrace
      makeFurn('plant', 60, 520, 0, f1, { color: '#2d5a3f' }),
      makeFurn('plant', 460, 520, 0, f1, { color: '#2d5a3f' }),
      makeFurn('armchair', 200, 520, 0, f1, { color: '#7a8274' }),
      makeFurn('armchair', 320, 520, 0, f1, { color: '#7a8274' }),
      makeFurn('coffeeTable', 260, 520, 0, f1, { color: '#3e3a36' })
    ],
    lighting: {
      preset: 'sunset',
      sunIntensity: 2.2,
      ambientIntensity: 0.85,
      artificialIntensity: 1.2,
      colorTemp: 'warm',
      shadows: true,
      artificialEnabled: true
    },
    budgetRates: { ...DEFAULT_BUDGET_RATES },
    variations: []
  };
}

export function loadHomeFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return template2bhk();
    return normalizeHome(JSON.parse(raw));
  } catch (err) {
    console.warn('Error reading stored project:', err);
    return template2bhk();
  }
}

export function saveHomeToStorage(home) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(home));
    return true;
  } catch (err) {
    console.error('Failed to save project:', err);
    return false;
  }
}

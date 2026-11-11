export const GRID = 10;   // snap step in cm
export const M = 0.01;    // cm -> metres in 3D
export const STORAGE_KEY = 'roomcraft-project-v2';
export const PROJECTS_LIST_KEY = 'roomcraft-projects-index-v2';

export const FURN_CATEGORIES = [
  { id: 'living', label: 'Living Room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'dining', label: 'Dining & Kitchen' },
  { id: 'work', label: 'Office & Study' },
  { id: 'bath', label: 'Bathroom' },
  { id: 'arch', label: 'Doors & Stairs' }
];

export const FURN = {
  // Living
  sofa: {
    category: 'living',
    label: 'Sofa',
    w: 200, d: 90, h: 80,
    color: '#8c7a6b',
    price: 36000,
    clearance: { front: 60, sides: 20, back: 0 }
  },
  armchair: {
    category: 'living',
    label: 'Accent Armchair',
    w: 85, d: 85, h: 85,
    color: '#a38f78',
    price: 18000,
    clearance: { front: 50, sides: 20, back: 0 }
  },
  coffeeTable: {
    category: 'living',
    label: 'Coffee Table',
    w: 110, d: 60, h: 45,
    color: '#c2a688',
    price: 12000,
    clearance: { front: 45, sides: 45, back: 45 }
  },
  tvUnit: {
    category: 'living',
    label: 'Media Console & TV',
    w: 180, d: 45, h: 120,
    color: '#4a443c',
    price: 24000,
    clearance: { front: 120, sides: 10, back: 0 }
  },
  plant: {
    category: 'living',
    label: 'Indoor Fiddle Plant',
    w: 45, d: 45, h: 130,
    color: '#5b7553',
    price: 4500,
    clearance: { front: 10, sides: 10, back: 10 }
  },

  // Bedroom
  bed: {
    category: 'bedroom',
    label: 'Double Bed',
    w: 170, d: 210, h: 90,
    color: '#d6cbbe',
    price: 48000,
    clearance: { front: 70, sides: 60, back: 0 }
  },
  nightstand: {
    category: 'bedroom',
    label: 'Nightstand',
    w: 50, d: 45, h: 55,
    color: '#8b7355',
    price: 7500,
    clearance: { front: 40, sides: 10, back: 0 }
  },
  wardrobe: {
    category: 'bedroom',
    label: 'Wardrobe Closet',
    w: 160, d: 65, h: 220,
    color: '#6e5a44',
    price: 52000,
    clearance: { front: 90, sides: 10, back: 0 }
  },

  // Dining & Kitchen
  table: {
    category: 'dining',
    label: 'Dining Table',
    w: 160, d: 90, h: 76,
    color: '#9c7a52',
    price: 28000,
    clearance: { front: 80, sides: 80, back: 80 }
  },
  chair: {
    category: 'dining',
    label: 'Dining Chair',
    w: 48, d: 52, h: 92,
    color: '#b09371',
    price: 6000,
    clearance: { front: 40, sides: 15, back: 30 }
  },
  kitchenCounter: {
    category: 'dining',
    label: 'Kitchen Island / Counter',
    w: 220, d: 65, h: 88,
    color: '#3d3832',
    price: 65000,
    clearance: { front: 90, sides: 20, back: 0 }
  },

  // Work & Study
  desk: {
    category: 'work',
    label: 'Executive Desk',
    w: 130, d: 65, h: 76,
    color: '#826d57',
    price: 22000,
    clearance: { front: 80, sides: 20, back: 10 }
  },
  bookshelf: {
    category: 'work',
    label: 'Bookshelf Unit',
    w: 110, d: 38, h: 200,
    color: '#5c4d3c',
    price: 19500,
    clearance: { front: 60, sides: 10, back: 0 }
  },

  // Bath
  bathtub: {
    category: 'bath',
    label: 'Soaking Bathtub',
    w: 165, d: 75, h: 60,
    color: '#ffffff',
    price: 42000,
    clearance: { front: 70, sides: 20, back: 0 }
  },

  // Architecture
  stairs: {
    category: 'arch',
    label: 'Staircase Flight',
    w: 100, d: 240, h: 280,
    color: '#9e8060',
    price: 85000,
    clearance: { front: 100, sides: 10, back: 100 }
  },
  door: {
    category: 'arch',
    label: 'Door Opening',
    w: 90, d: 15, h: 210,
    color: '#8b6b47',
    price: 14000,
    clearance: { front: 90, sides: 10, back: 90 }
  },
  window: {
    category: 'arch',
    label: 'Glass Window',
    w: 140, d: 15, h: 130,
    color: '#c9e2f5',
    price: 18000,
    clearance: { front: 30, sides: 10, back: 30 }
  }
};

export const FLOOR_MATERIALS = {
  oakWood: {
    id: 'oakWood',
    label: 'Oak Wood Parquet',
    color: '#cbab81',
    roughness: 0.45,
    metalness: 0.05,
    texture: 'wood_plank',
    rateINR: 2600, // per m²
    desc: 'Warm Scandinavian natural oak hardwood with subtle grain planks.'
  },
  walnutWood: {
    id: 'walnutWood',
    label: 'American Walnut',
    color: '#5b402e',
    roughness: 0.38,
    metalness: 0.08,
    texture: 'wood_walnut',
    rateINR: 3400,
    desc: 'Deep luxurious dark walnut with rich flowing chocolate striations.'
  },
  marble: {
    id: 'marble',
    label: 'Carrara Italian Marble',
    color: '#f0ece5',
    roughness: 0.18,
    metalness: 0.15,
    texture: 'marble',
    rateINR: 4200,
    desc: 'Polished white Italian Carrara marble with delicate smoky grey veins.'
  },
  ceramic: {
    id: 'ceramic',
    label: 'Large Format Ceramic Tile',
    color: '#ded8ce',
    roughness: 0.28,
    metalness: 0.1,
    texture: 'tile_grid',
    rateINR: 1450,
    desc: 'Contemporary 80x80cm rectified porcelain tiles with tight grout lines.'
  },
  concrete: {
    id: 'concrete',
    label: 'Polished Micro-Cement',
    color: '#b5b2ac',
    roughness: 0.55,
    metalness: 0.02,
    texture: 'concrete',
    rateINR: 1800,
    desc: 'Seamless architectural micro-cement with industrial urban sheen.'
  },
  stone: {
    id: 'stone',
    label: 'Natural Slate Stone',
    color: '#636569',
    roughness: 0.65,
    metalness: 0.05,
    texture: 'stone',
    rateINR: 2200,
    desc: 'Matte honed natural slate stone slabs with subtle cleft variation.'
  },
  carpet: {
    id: 'carpet',
    label: 'Plush Woven Carpet',
    color: '#cfc6b8',
    roughness: 0.95,
    metalness: 0.0,
    texture: 'carpet_weave',
    rateINR: 1950,
    desc: 'Dense, acoustically absorbent luxury woven wool blend carpet.'
  }
};

export const WALL_MATERIALS = {
  whitePaint: {
    id: 'whitePaint',
    label: 'Crisp Architectural White',
    color: '#fbfaf7',
    roughness: 0.88,
    metalness: 0.0,
    texture: 'paint_matte',
    rateINR: 320, // per m² surface
    desc: 'Ultra-matte breathable interior emulsion with soft light diffusion.'
  },
  creamPaint: {
    id: 'creamPaint',
    label: 'Warm Champagne Eggshell',
    color: '#f5eee3',
    roughness: 0.75,
    metalness: 0.0,
    texture: 'paint_eggshell',
    rateINR: 360,
    desc: 'Warm comforting eggshell finish that elevates ambient reflections.'
  },
  texturedPaint: {
    id: 'texturedPaint',
    label: 'Hand-Troweled Stucco Plaster',
    color: '#ece4d5',
    roughness: 0.92,
    metalness: 0.0,
    texture: 'stucco',
    rateINR: 650,
    desc: 'Artisanal lime-wash Venetian texture with natural organic depth.'
  },
  brick: {
    id: 'brick',
    label: 'Exposed Terracotta Brick',
    color: '#a3573c',
    roughness: 0.82,
    metalness: 0.05,
    texture: 'brick',
    rateINR: 1250,
    desc: 'Industrial distressed clay brickwork with authentic mortar recessed joints.'
  },
  concrete: {
    id: 'concrete',
    label: 'Board-Formed Architectural Concrete',
    color: '#9e9c97',
    roughness: 0.6,
    metalness: 0.04,
    texture: 'concrete',
    rateINR: 980,
    desc: 'Raw brutalist board-formed concrete surface with subtle timber grain imprint.'
  },
  woodSlat: {
    id: 'woodSlat',
    label: 'Acoustic Timber Slat Paneling',
    color: '#99764d',
    roughness: 0.5,
    metalness: 0.06,
    texture: 'wood_slat',
    rateINR: 2400,
    desc: 'Vertical architectural wood fluting offering acoustic warmth and luxury rhythm.'
  }
};

export const MAKEOVER_STYLES = {
  modernLuxury: {
    id: 'modernLuxury',
    name: 'Modern Luxury',
    badge: 'Luxury Signature',
    tagline: 'High-contrast sophistication with marble, rich brass accents, and moody tones.',
    wallMaterial: 'creamPaint',
    wallColor: '#2b2927',
    accentWallColor: '#1a1918',
    floorMaterial: 'marble',
    floorColor: '#f2eee9',
    lightingPreset: 'sunset',
    colorTemp: 'warm',
    furnColorMap: {
      sofa: '#26282b',
      armchair: '#c5a059',
      coffeeTable: '#1b1b1c',
      tvUnit: '#222326',
      plant: '#4a6b47',
      bed: '#2b2c30',
      nightstand: '#c5a059',
      wardrobe: '#222326',
      table: '#1e1e21',
      chair: '#c5a059',
      desk: '#222326',
      bookshelf: '#1e1e21',
      kitchenCounter: '#18191c',
      bathtub: '#ffffff'
    },
    palette: ['#1a1918', '#c5a059', '#f2eee9', '#3b3d42', '#8c764e']
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    badge: 'Clean Zen',
    tagline: 'Essential forms, decluttered planes, monochromatic purity, and calm order.',
    wallMaterial: 'whitePaint',
    wallColor: '#fdfdfb',
    accentWallColor: '#ece9e2',
    floorMaterial: 'concrete',
    floorColor: '#cecbc5',
    lightingPreset: 'afternoon',
    colorTemp: 'neutral',
    furnColorMap: {
      sofa: '#e3dfd7',
      armchair: '#bcb6ac',
      coffeeTable: '#303030',
      tvUnit: '#dfdad1',
      plant: '#596954',
      bed: '#f0ece5',
      nightstand: '#e2ddd5',
      wardrobe: '#e6e2da',
      table: '#dcd6cc',
      chair: '#2c2b29',
      desk: '#dfd9cf',
      bookshelf: '#e0dbd1',
      kitchenCounter: '#ffffff',
      bathtub: '#ffffff'
    },
    palette: ['#ffffff', '#ded9cf', '#a8a299', '#333333', '#7a7670']
  },
  scandinavian: {
    id: 'scandinavian',
    name: 'Scandinavian',
    badge: 'Nordic Hygge',
    tagline: 'Natural blonde wood, soft sage textiles, abundant sunlight, and coziness.',
    wallMaterial: 'whitePaint',
    wallColor: '#f9f8f4',
    accentWallColor: '#8a9b88',
    floorMaterial: 'oakWood',
    floorColor: '#d6b88d',
    lightingPreset: 'morning',
    colorTemp: 'warm',
    furnColorMap: {
      sofa: '#a1aba0',
      armchair: '#dfd2c0',
      coffeeTable: '#c8a87b',
      tvUnit: '#baa284',
      plant: '#4a6e45',
      bed: '#e9e2d5',
      nightstand: '#c9af8e',
      wardrobe: '#d5c2a8',
      table: '#caa87e',
      chair: '#8b9b87',
      desk: '#c7a982',
      bookshelf: '#d3c1a6',
      kitchenCounter: '#ebe5dc',
      bathtub: '#ffffff'
    },
    palette: ['#f9f8f4', '#d6b88d', '#8a9b88', '#dfd2c0', '#4a443e']
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial Loft',
    badge: 'Urban Loft',
    tagline: 'Raw brickwork, blackened steel, cognac leather, and exposed microcement.',
    wallMaterial: 'brick',
    wallColor: '#964831',
    accentWallColor: '#2b2d30',
    floorMaterial: 'concrete',
    floorColor: '#99948c',
    lightingPreset: 'sunset',
    colorTemp: 'warm',
    furnColorMap: {
      sofa: '#96522c',
      armchair: '#262729',
      coffeeTable: '#222324',
      tvUnit: '#202124',
      plant: '#40523d',
      bed: '#4d463d',
      nightstand: '#2b2a28',
      wardrobe: '#2b2b2b',
      table: '#734b2f',
      chair: '#222324',
      desk: '#6b4528',
      bookshelf: '#292a2b',
      kitchenCounter: '#242526',
      bathtub: '#dedede'
    },
    palette: ['#964831', '#2b2d30', '#96522c', '#99948c', '#e0d8cb']
  },
  contemporary: {
    id: 'contemporary',
    name: 'Contemporary',
    badge: 'Design Forward',
    tagline: 'Curved lines, tailored upholstery, deep cobalt blue contrasts, and satin brass.',
    wallMaterial: 'texturedPaint',
    wallColor: '#ebe6de',
    accentWallColor: '#1f344d',
    floorMaterial: 'ceramic',
    floorColor: '#e0dad0',
    lightingPreset: 'afternoon',
    colorTemp: 'neutral',
    furnColorMap: {
      sofa: '#20374e',
      armchair: '#c7b49d',
      coffeeTable: '#4a443c',
      tvUnit: '#32363b',
      plant: '#496147',
      bed: '#cfc9be',
      nightstand: '#44484d',
      wardrobe: '#32363b',
      table: '#ded9cf',
      chair: '#1f344d',
      desk: '#3d4045',
      bookshelf: '#2e3338',
      kitchenCounter: '#28323d',
      bathtub: '#ffffff'
    },
    palette: ['#1f344d', '#ebe6de', '#c7b49d', '#28323d', '#d9a86c']
  },
  bohemian: {
    id: 'bohemian',
    name: 'Bohemian Chic',
    badge: 'Artisanal Eclectic',
    tagline: 'Terracotta plasters, woven rattan, mustard textures, and lush flora.',
    wallMaterial: 'texturedPaint',
    wallColor: '#d68565',
    accentWallColor: '#e0a35c',
    floorMaterial: 'stone',
    floorColor: '#bfae9b',
    lightingPreset: 'sunset',
    colorTemp: 'warm',
    furnColorMap: {
      sofa: '#d99043',
      armchair: '#617355',
      coffeeTable: '#ba8c59',
      tvUnit: '#7d5d3b',
      plant: '#3e6337',
      bed: '#cc9168',
      nightstand: '#ba8c59',
      wardrobe: '#8c6b49',
      table: '#b37f4d',
      chair: '#cc7452',
      desk: '#a67746',
      bookshelf: '#85613d',
      kitchenCounter: '#85563a',
      bathtub: '#ffffff'
    },
    palette: ['#d68565', '#e0a35c', '#617355', '#ba8c59', '#3e6337']
  },
  traditionalIndian: {
    id: 'traditionalIndian',
    name: 'Traditional Indian',
    badge: 'Heritage Crafted',
    tagline: 'Rich Sheesham hardwood, royal marigold accents, marble floors, and brass trims.',
    wallMaterial: 'creamPaint',
    wallColor: '#f9f2e3',
    accentWallColor: '#9c2424',
    floorMaterial: 'marble',
    floorColor: '#ede8dd',
    lightingPreset: 'night',
    colorTemp: 'warm',
    furnColorMap: {
      sofa: '#a62424',
      armchair: '#d48817',
      coffeeTable: '#542914',
      tvUnit: '#4d2612',
      plant: '#3b5c32',
      bed: '#4d2612',
      nightstand: '#542914',
      wardrobe: '#4a230e',
      table: '#522813',
      chair: '#a62424',
      desk: '#542914',
      bookshelf: '#4a230e',
      kitchenCounter: '#401e0c',
      bathtub: '#ffffff'
    },
    palette: ['#9c2424', '#d48817', '#542914', '#f9f2e3', '#d4af37']
  },
  japandi: {
    id: 'japandi',
    name: 'Japandi Harmony',
    badge: 'Wabi-Sabi Flow',
    tagline: 'Japanese minimalism meets Scandinavian functional warmth with muted earth tones.',
    wallMaterial: 'texturedPaint',
    wallColor: '#ebe5db',
    accentWallColor: '#4f544b',
    floorMaterial: 'oakWood',
    floorColor: '#c7b395',
    lightingPreset: 'morning',
    colorTemp: 'warm',
    furnColorMap: {
      sofa: '#8c8e84',
      armchair: '#ded6c8',
      coffeeTable: '#423d38',
      tvUnit: '#423d38',
      plant: '#4c5e48',
      bed: '#dcd4c7',
      nightstand: '#69635b',
      wardrobe: '#544f47',
      table: '#423d38',
      chair: '#7a7a72',
      desk: '#4a443e',
      bookshelf: '#3d3832',
      kitchenCounter: '#363430',
      bathtub: '#ffffff'
    },
    palette: ['#ebe5db', '#c7b395', '#4f544b', '#423d38', '#8c8e84']
  }
};

export const LIGHTING_PRESETS = {
  morning: {
    id: 'morning',
    label: 'Morning Sun (8:30 AM)',
    sunPos: [14, 10, -12],
    sunColor: '#fff1d6',
    sunIntensity: 1.8,
    skyColor: '#bde0fe',
    groundColor: '#cfbca2',
    ambientIntensity: 0.9,
    shadowColor: '#2b3040',
    colorTemp: 4200,
    desc: 'Crisp angled morning sunlight streaming through east-facing openings.'
  },
  afternoon: {
    id: 'afternoon',
    label: 'Afternoon Daylight (1:30 PM)',
    sunPos: [6, 22, 6],
    sunColor: '#fffaee',
    sunIntensity: 2.1,
    skyColor: '#ffffff',
    groundColor: '#d6c8b2',
    ambientIntensity: 1.1,
    shadowColor: '#303036',
    colorTemp: 5400,
    desc: 'Direct, clear overhead architectural sunlight with clean shadow definition.'
  },
  sunset: {
    id: 'sunset',
    label: 'Golden Hour Sunset (6:15 PM)',
    sunPos: [-18, 5, 14],
    sunColor: '#ff7722',
    sunIntensity: 2.4,
    skyColor: '#6d4c82',
    groundColor: '#7a5438',
    ambientIntensity: 0.75,
    shadowColor: '#201626',
    colorTemp: 2800,
    desc: 'Warm dramatic amber rays casting long cinematic evening shadows.'
  },
  night: {
    id: 'night',
    label: 'Cozy Night Ambiance (9:45 PM)',
    sunPos: [0, -10, 0],
    sunColor: '#1d2740',
    sunIntensity: 0.15,
    skyColor: '#0a0d17',
    groundColor: '#15161c',
    ambientIntensity: 0.35,
    shadowColor: '#050608',
    colorTemp: 2500,
    desc: 'Night sky with warm 2700K recessed spotlights and soft interior accent glow.'
  }
};

export const DEFAULT_BUDGET_RATES = {
  labourPct: 15,          // 15% of material & furniture total
  contingencyPct: 8,      // 8% unforeseen contingency
  lightingPointCost: 2200,// per light fixture installed
  paintLabourPerM2: 80,   // painting labour per m²
  flooringLabourPerM2: 250// tile/wood laying labour per m²
};

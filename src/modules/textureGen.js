import * as THREE from 'three';

const textureCache = new Map();

function createOffscreenCanvas(width = 1024, height = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

// Generate Oak Wood Plank diffuse & bump map
function generateWoodPlank(baseColor = '#cbab81') {
  const { canvas, ctx } = createOffscreenCanvas(1024, 1024);
  const bump = createOffscreenCanvas(1024, 1024);

  // Diffuse
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 1024);

  // Bump base
  bump.ctx.fillStyle = '#808080';
  bump.ctx.fillRect(0, 0, 1024, 1024);

  const plankH = 128;
  for (let y = 0; y < 1024; y += plankH) {
    // Subtle per-plank tone variation
    ctx.fillStyle = `rgba(0, 0, 0, ${0.03 + Math.random() * 0.05})`;
    ctx.fillRect(0, y, 1024, plankH);

    // Fine wood grain lines
    ctx.strokeStyle = 'rgba(70, 45, 18, 0.14)';
    bump.ctx.strokeStyle = 'rgba(40, 40, 40, 0.18)';
    ctx.lineWidth = 1.2;
    bump.ctx.lineWidth = 1.2;

    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      bump.ctx.beginPath();
      const gy = y + Math.random() * plankH;
      ctx.moveTo(0, gy);
      bump.ctx.moveTo(0, gy);
      const cp1y = gy + (Math.random() - 0.5) * 12;
      const cp2y = gy + (Math.random() - 0.5) * 12;
      ctx.bezierCurveTo(300, cp1y, 700, cp2y, 1024, gy);
      bump.ctx.bezierCurveTo(300, cp1y, 700, cp2y, 1024, gy);
      ctx.stroke();
      bump.ctx.stroke();
    }

    // Horizontal plank groove seam
    ctx.strokeStyle = 'rgba(25, 15, 8, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();

    bump.ctx.strokeStyle = '#222222'; // deep recess
    bump.ctx.lineWidth = 3;
    bump.ctx.beginPath();
    bump.ctx.moveTo(0, y);
    bump.ctx.lineTo(1024, y);
    bump.ctx.stroke();

    // Staggered butt joints
    const staggeredOffset = (y / plankH) % 2 === 0 ? 512 : 256;
    ctx.beginPath();
    bump.ctx.beginPath();
    ctx.moveTo(staggeredOffset, y);
    ctx.lineTo(staggeredOffset, y + plankH);
    bump.ctx.moveTo(staggeredOffset, y);
    bump.ctx.lineTo(staggeredOffset, y + plankH);
    if (staggeredOffset + 512 < 1024) {
      ctx.moveTo(staggeredOffset + 512, y);
      ctx.lineTo(staggeredOffset + 512, y + plankH);
      bump.ctx.moveTo(staggeredOffset + 512, y);
      bump.ctx.lineTo(staggeredOffset + 512, y + plankH);
    }
    ctx.stroke();
    bump.ctx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);

  return { map, bumpMap };
}

// Generate Walnut Wood diffuse & bump
function generateWalnut(baseColor = '#5b402e') {
  const { canvas, ctx } = createOffscreenCanvas(1024, 1024);
  const bump = createOffscreenCanvas(1024, 1024);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 1024);

  bump.ctx.fillStyle = '#808080';
  bump.ctx.fillRect(0, 0, 1024, 1024);

  const plankH = 140;
  for (let y = 0; y < 1024; y += plankH) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + Math.random() * 0.05})`;
    ctx.fillRect(0, y, 1024, plankH);

    ctx.strokeStyle = 'rgba(25, 12, 5, 0.25)';
    bump.ctx.strokeStyle = 'rgba(30, 30, 30, 0.2)';
    ctx.lineWidth = 1.8;
    bump.ctx.lineWidth = 1.8;

    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      bump.ctx.beginPath();
      const gy = y + Math.random() * plankH;
      ctx.moveTo(0, gy);
      bump.ctx.moveTo(0, gy);
      ctx.bezierCurveTo(350, gy + (Math.random() - 0.5) * 16, 700, gy + (Math.random() - 0.5) * 16, 1024, gy);
      bump.ctx.bezierCurveTo(350, gy + (Math.random() - 0.5) * 16, 700, gy + (Math.random() - 0.5) * 16, 1024, gy);
      ctx.stroke();
      bump.ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(15, 8, 4, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();

    bump.ctx.strokeStyle = '#222222';
    bump.ctx.lineWidth = 3;
    bump.ctx.beginPath();
    bump.ctx.moveTo(0, y);
    bump.ctx.lineTo(1024, y);
    bump.ctx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);

  return { map, bumpMap };
}

// Generate Carrara Italian Marble
function generateMarble(baseColor = '#f0ece5') {
  const { canvas, ctx } = createOffscreenCanvas(1024, 1024);
  const bump = createOffscreenCanvas(1024, 1024);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 1024);

  bump.ctx.fillStyle = '#a0a0a0';
  bump.ctx.fillRect(0, 0, 1024, 1024);

  // Soft flowing cloud gradients
  for (let i = 0; i < 12; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    const grad = ctx.createRadialGradient(rx, ry, 30, rx, ry, 260);
    grad.addColorStop(0, 'rgba(175, 170, 165, 0.28)');
    grad.addColorStop(1, 'rgba(240, 236, 229, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);
  }

  // Marble veins
  ctx.strokeStyle = 'rgba(95, 90, 85, 0.28)';
  for (let v = 0; v < 9; v++) {
    ctx.lineWidth = 1 + Math.random() * 3.5;
    ctx.beginPath();
    let sx = Math.random() * 1024;
    let sy = 0;
    ctx.moveTo(sx, sy);
    for (let step = 0; step < 6; step++) {
      sx += (Math.random() - 0.3) * 220;
      sy += 180;
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // Subtle tile joints for large format slabs (512x512)
  ctx.strokeStyle = 'rgba(150, 140, 130, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.strokeRect(512, 0, 512, 512);
  ctx.strokeRect(0, 512, 512, 512);
  ctx.strokeRect(512, 512, 512, 512);

  bump.ctx.strokeStyle = '#666666';
  bump.ctx.lineWidth = 2;
  bump.ctx.strokeRect(0, 0, 512, 512);
  bump.ctx.strokeRect(512, 0, 512, 512);
  bump.ctx.strokeRect(0, 512, 512, 512);
  bump.ctx.strokeRect(512, 512, 512, 512);

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);

  return { map, bumpMap };
}

// Generate Large Format Ceramic Tile
function generateTileGrid(baseColor = '#ded8ce') {
  const { canvas, ctx } = createOffscreenCanvas(1024, 1024);
  const bump = createOffscreenCanvas(1024, 1024);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 1024);

  bump.ctx.fillStyle = '#a0a0a0';
  bump.ctx.fillRect(0, 0, 1024, 1024);

  // Rectified grout lines (4 large 512x512 tiles with beveled grout)
  ctx.strokeStyle = 'rgba(85, 80, 72, 0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 504);
  ctx.strokeRect(516, 4, 504, 504);
  ctx.strokeRect(4, 516, 504, 504);
  ctx.strokeRect(516, 516, 504, 504);

  bump.ctx.strokeStyle = '#333333';
  bump.ctx.lineWidth = 4;
  bump.ctx.strokeRect(4, 4, 504, 504);
  bump.ctx.strokeRect(516, 4, 504, 504);
  bump.ctx.strokeRect(4, 516, 504, 504);
  bump.ctx.strokeRect(516, 516, 504, 504);

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);

  return { map, bumpMap };
}

// Generate Polished Micro-Cement
function generateConcrete(baseColor = '#b5b2ac') {
  const { canvas, ctx } = createOffscreenCanvas(1024, 1024);
  const bump = createOffscreenCanvas(1024, 1024);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 1024);

  bump.ctx.fillStyle = '#808080';
  bump.ctx.fillRect(0, 0, 1024, 1024);

  // Micro-aggregate speckles
  for (let i = 0; i < 1500; i++) {
    const isDark = Math.random() > 0.5;
    ctx.fillStyle = isDark ? 'rgba(40, 40, 40, 0.08)' : 'rgba(255, 255, 255, 0.1)';
    bump.ctx.fillStyle = isDark ? '#606060' : '#a0a0a0';
    const sz = 2 + Math.random() * 4;
    const px = Math.random() * 1024, py = Math.random() * 1024;
    ctx.fillRect(px, py, sz, sz);
    bump.ctx.fillRect(px, py, sz, sz);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);

  return { map, bumpMap };
}

// Generate Natural Stone Slate
function generateStone(baseColor = '#636569') {
  const { canvas, ctx } = createOffscreenCanvas(1024, 1024);
  const bump = createOffscreenCanvas(1024, 1024);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 1024);

  bump.ctx.fillStyle = '#808080';
  bump.ctx.fillRect(0, 0, 1024, 1024);

  ctx.strokeStyle = 'rgba(20, 20, 24, 0.6)';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, 640, 512);
  ctx.strokeRect(640, 0, 384, 512);
  ctx.strokeRect(0, 512, 400, 512);
  ctx.strokeRect(400, 512, 624, 512);

  bump.ctx.strokeStyle = '#222222';
  bump.ctx.lineWidth = 5;
  bump.ctx.strokeRect(0, 0, 640, 512);
  bump.ctx.strokeRect(640, 0, 384, 512);
  bump.ctx.strokeRect(0, 512, 400, 512);
  bump.ctx.strokeRect(400, 512, 624, 512);

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);

  return { map, bumpMap };
}

// Generate Carpet Weave
function generateCarpet(baseColor = '#cfc6b8') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  const bump = createOffscreenCanvas(512, 512);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  bump.ctx.fillStyle = '#808080';
  bump.ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  bump.ctx.fillStyle = '#606060';
  for (let x = 0; x < 512; x += 6) {
    for (let y = 0; y < 512; y += 6) {
      if ((x + y) % 12 === 0) {
        ctx.fillRect(x, y, 3, 3);
        bump.ctx.fillRect(x, y, 3, 3);
      }
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(5, 5);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(5, 5);

  return { map, bumpMap };
}

// Generate Brick Wall
function generateBrick(baseColor = '#a3573c') {
  const { canvas, ctx } = createOffscreenCanvas(1024, 1024);
  const bump = createOffscreenCanvas(1024, 1024);

  ctx.fillStyle = '#c7bca9';
  ctx.fillRect(0, 0, 1024, 1024);

  bump.ctx.fillStyle = '#444444'; // recessed mortar
  bump.ctx.fillRect(0, 0, 1024, 1024);

  const brickH = 76;
  const brickW = 190;
  const mortar = 8;

  for (let row = 0; row < 14; row++) {
    const y = row * (brickH + mortar);
    const xOffset = (row % 2 === 0) ? 0 : -(brickW / 2);
    for (let col = -1; col < 8; col++) {
      const x = col * (brickW + mortar) + xOffset;
      ctx.fillStyle = baseColor;
      ctx.fillRect(x, y, brickW, brickH);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + Math.random() * 0.08})`;
      ctx.fillRect(x, y, brickW, brickH);

      bump.ctx.fillStyle = '#b0b0b0'; // raised brick surface
      bump.ctx.fillRect(x, y, brickW, brickH);
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);

  return { map, bumpMap };
}

// Generate Acoustic Wood Slat Paneling
function generateWoodSlat(baseColor = '#99764d') {
  const { canvas, ctx } = createOffscreenCanvas(1024, 1024);
  const bump = createOffscreenCanvas(1024, 1024);

  ctx.fillStyle = '#1e1c18';
  ctx.fillRect(0, 0, 1024, 1024);

  bump.ctx.fillStyle = '#333333';
  bump.ctx.fillRect(0, 0, 1024, 1024);

  const slatW = 36;
  const gap = 18;
  const pitch = slatW + gap;

  for (let x = 0; x < 1024; x += pitch) {
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, 0, slatW, 1024);

    bump.ctx.fillStyle = '#c0c0c0';
    bump.ctx.fillRect(x, 0, slatW, 1024);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);

  return { map, bumpMap };
}

// Generate Stucco / Venetian Plaster
function generateStucco(baseColor = '#ece4d5') {
  const { canvas, ctx } = createOffscreenCanvas(1024, 1024);
  const bump = createOffscreenCanvas(1024, 1024);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 1024);

  bump.ctx.fillStyle = '#808080';
  bump.ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 400; i++) {
    const isLight = Math.random() > 0.5;
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    bump.ctx.fillStyle = isLight ? '#989898' : '#686868';
    ctx.beginPath();
    bump.ctx.beginPath();
    const ex = Math.random() * 1024, ey = Math.random() * 1024;
    ctx.ellipse(ex, ey, 35, 18, Math.random() * Math.PI, 0, Math.PI * 2);
    bump.ctx.ellipse(ex, ey, 35, 18, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    bump.ctx.fill();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);

  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);

  return { map, bumpMap };
}

export function getProceduralPBR(type, color) {
  const key = `${type}_${color || 'default'}`;
  if (textureCache.has(key)) return textureCache.get(key);

  let result = null;
  switch (type) {
    case 'wood_plank':
      result = generateWoodPlank(color);
      break;
    case 'wood_walnut':
      result = generateWalnut(color);
      break;
    case 'marble':
      result = generateMarble(color);
      break;
    case 'tile_grid':
      result = generateTileGrid(color);
      break;
    case 'concrete':
      result = generateConcrete(color);
      break;
    case 'stone':
      result = generateStone(color);
      break;
    case 'carpet_weave':
      result = generateCarpet(color);
      break;
    case 'brick':
      result = generateBrick(color);
      break;
    case 'wood_slat':
      result = generateWoodSlat(color);
      break;
    case 'stucco':
      result = generateStucco(color);
      break;
    default:
      return null;
  }

  textureCache.set(key, result);
  return result;
}

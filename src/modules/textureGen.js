import * as THREE from 'three';

const textureCache = new Map();

function createOffscreenCanvas(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

// Generate Oak Wood Plank texture
function generateWoodPlank(baseColor = '#cbab81') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Planks
  const plankH = 64;
  for (let y = 0; y < 512; y += plankH) {
    // Slight tone variation per plank
    const tint = (Math.random() - 0.5) * 15;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.03 + Math.random() * 0.05})`;
    ctx.fillRect(0, y, 512, plankH);

    // Fine wood grain lines
    ctx.strokeStyle = `rgba(80, 50, 20, 0.12)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      const gy = y + Math.random() * plankH;
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(150, gy + (Math.random() - 0.5) * 8, 350, gy + (Math.random() - 0.5) * 8, 512, gy);
      ctx.stroke();
    }

    // Plank seam
    ctx.strokeStyle = 'rgba(40, 25, 10, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    // Vertical butt joints
    const staggeredOffset = (y / plankH) % 2 === 0 ? 256 : 128;
    ctx.beginPath();
    ctx.moveTo(staggeredOffset, y);
    ctx.lineTo(staggeredOffset, y + plankH);
    if (staggeredOffset + 256 < 512) {
      ctx.moveTo(staggeredOffset + 256, y);
      ctx.lineTo(staggeredOffset + 256, y + plankH);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

// Generate Walnut Wood texture
function generateWalnut(baseColor = '#5b402e') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 80;
  for (let y = 0; y < 512; y += plankH) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.04 + Math.random() * 0.06})`;
    ctx.fillRect(0, y, 512, plankH);

    ctx.strokeStyle = `rgba(30, 15, 8, 0.22)`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      const gy = y + Math.random() * plankH;
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(180, gy + (Math.random() - 0.5) * 12, 360, gy + (Math.random() - 0.5) * 12, 512, gy);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(20, 10, 5, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Generate Carrara Italian Marble
function generateMarble(baseColor = '#f0ece5') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Soft flowing cloud gradients
  for (let i = 0; i < 8; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const grad = ctx.createRadialGradient(rx, ry, 20, rx, ry, 180);
    grad.addColorStop(0, 'rgba(180, 175, 170, 0.25)');
    grad.addColorStop(1, 'rgba(240, 236, 229, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }

  // Marble veins
  ctx.strokeStyle = 'rgba(110, 105, 100, 0.22)';
  for (let v = 0; v < 7; v++) {
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    let sx = Math.random() * 512;
    let sy = 0;
    ctx.moveTo(sx, sy);
    for (let step = 0; step < 5; step++) {
      sx += (Math.random() - 0.3) * 140;
      sy += 110;
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // Tile joints for marble slabs (256x256 slabs)
  ctx.strokeStyle = 'rgba(160, 150, 140, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(256, 0, 256, 256);
  ctx.strokeRect(0, 256, 256, 256);
  ctx.strokeRect(256, 256, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Generate Large Format Ceramic Tile
function generateTileGrid(baseColor = '#ded8ce') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle tile mottled noise
  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
  }

  // Rectified grout lines (4 tiles)
  ctx.strokeStyle = 'rgba(100, 95, 88, 0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 252, 252);
  ctx.strokeRect(258, 2, 252, 252);
  ctx.strokeRect(2, 258, 252, 252);
  ctx.strokeRect(258, 258, 252, 252);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Generate Polished Concrete / Microcement
function generateConcrete(baseColor = '#b5b2ac') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Micro-aggregate speckles
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(50, 50, 50, 0.06)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }

  // Trowel swirl markings
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
  ctx.lineWidth = 14;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 100 + Math.random() * 100, 0, Math.PI * 0.7);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

// Generate Natural Stone Slate
function generateStone(baseColor = '#636569') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Random stone slabs
  ctx.strokeStyle = 'rgba(25, 25, 28, 0.5)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 320, 256);
  ctx.strokeRect(320, 0, 192, 256);
  ctx.strokeRect(0, 256, 200, 256);
  ctx.strokeRect(200, 256, 312, 256);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(0, 0, 320, 256);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(320, 0, 192, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Generate Carpet Weave
function generateCarpet(baseColor = '#cfc6b8') {
  const { canvas, ctx } = createOffscreenCanvas(256, 256);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Cross-hatch micro weave
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let x = 0; x < 256; x += 4) {
    for (let y = 0; y < 256; y += 4) {
      if ((x + y) % 8 === 0) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

// Generate Brick Wall texture
function generateBrick(baseColor = '#a3573c') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = '#c7bca9'; // mortar
  ctx.fillRect(0, 0, 512, 512);

  const brickH = 48;
  const brickW = 120;
  const mortar = 6;

  for (let row = 0; row < 12; row++) {
    const y = row * (brickH + mortar);
    const xOffset = (row % 2 === 0) ? 0 : -(brickW / 2);
    for (let col = -1; col < 6; col++) {
      const x = col * (brickW + mortar) + xOffset;
      // Brick color variation
      const rVar = (Math.random() - 0.5) * 20;
      ctx.fillStyle = baseColor;
      ctx.fillRect(x, y, brickW, brickH);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + Math.random() * 0.08})`;
      ctx.fillRect(x, y, brickW, brickH);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Generate Acoustic Wood Slat Paneling
function generateWoodSlat(baseColor = '#99764d') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = '#1e1c18'; // dark acoustic backing felt
  ctx.fillRect(0, 0, 512, 512);

  const slatW = 24;
  const gap = 12;
  const pitch = slatW + gap;

  for (let x = 0; x < 512; x += pitch) {
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, 0, slatW, 512);

    // Subtle edge bevel shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(x + slatW - 3, 0, 3, 512);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, 0, 2, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Generate Stucco / Venetian Plaster
function generateStucco(baseColor = '#ece4d5') {
  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Soft trowel impressions
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
    ctx.beginPath();
    ctx.ellipse(Math.random() * 512, Math.random() * 512, 25, 12, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

export function getProceduralTexture(type, color) {
  const key = `${type}_${color || 'default'}`;
  if (textureCache.has(key)) return textureCache.get(key);

  let tex = null;
  switch (type) {
    case 'wood_plank':
      tex = generateWoodPlank(color);
      break;
    case 'wood_walnut':
      tex = generateWalnut(color);
      break;
    case 'marble':
      tex = generateMarble(color);
      break;
    case 'tile_grid':
      tex = generateTileGrid(color);
      break;
    case 'concrete':
      tex = generateConcrete(color);
      break;
    case 'stone':
      tex = generateStone(color);
      break;
    case 'carpet_weave':
      tex = generateCarpet(color);
      break;
    case 'brick':
      tex = generateBrick(color);
      break;
    case 'wood_slat':
      tex = generateWoodSlat(color);
      break;
    case 'stucco':
      tex = generateStucco(color);
      break;
    default:
      return null;
  }

  textureCache.set(key, tex);
  return tex;
}

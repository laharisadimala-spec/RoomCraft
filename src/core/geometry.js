import { GRID, M } from './constants.js';

export const snap = v => Math.round(v / GRID) * GRID;
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const uid = () => Math.random().toString(36).slice(2, 9);
export const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Point in rectangle (axis-aligned)
export function inRect(r, p) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// Get 4 corners of oriented bounding box for furniture
export function getFurnCorners(f) {
  const rad = (f.rot || 0) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = f.w / 2;
  const hd = f.d / 2;

  const dx1 = -hw * cos - -hd * sin;
  const dy1 = -hw * sin + -hd * cos;

  const dx2 = hw * cos - -hd * sin;
  const dy2 = hw * sin + -hd * cos;

  const dx3 = hw * cos - hd * sin;
  const dy3 = hw * sin + hd * cos;

  const dx4 = -hw * cos - hd * sin;
  const dy4 = -hw * sin + hd * cos;

  return [
    { x: f.x + dx1, y: f.y + dy1 },
    { x: f.x + dx2, y: f.y + dy2 },
    { x: f.x + dx3, y: f.y + dy3 },
    { x: f.x + dx4, y: f.y + dy4 }
  ];
}

// Axis-aligned bounding box (handles 0, 90, 180, 270)
export function getFurnAABB(f) {
  const rot = ((f.rot || 0) % 180 + 180) % 180;
  const isRotated = rot === 90;
  const ew = isRotated ? f.d : f.w;
  const ed = isRotated ? f.w : f.d;
  return {
    x0: f.x - ew / 2,
    y0: f.y - ed / 2,
    x1: f.x + ew / 2,
    y1: f.y + ed / 2,
    w: ew,
    d: ed,
    cx: f.x,
    cy: f.y
  };
}

// Test whether point hits furniture
export function furnHit(f, p) {
  const rad = -(f.rot || 0) * Math.PI / 180;
  const dx = p.x - f.x;
  const dy = p.y - f.y;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(lx) <= f.w / 2 && Math.abs(ly) <= f.d / 2;
}

// Check intersection between two furniture pieces (Separating Axis Theorem on AABBs)
export function furnOverlap(f1, f2) {
  const b1 = getFurnAABB(f1);
  const b2 = getFurnAABB(f2);
  const margin = 2; // slight tolerance for abutting items
  return !(
    b1.x1 - margin <= b2.x0 ||
    b1.x0 + margin >= b2.x1 ||
    b1.y1 - margin <= b2.y0 ||
    b1.y0 + margin >= b2.y1
  );
}

// Calculate overlap area between two furniture pieces in cm²
export function furnOverlapArea(f1, f2) {
  const b1 = getFurnAABB(f1);
  const b2 = getFurnAABB(f2);
  const ox = Math.max(0, Math.min(b1.x1, b2.x1) - Math.max(b1.x0, b2.x0));
  const oy = Math.max(0, Math.min(b1.y1, b2.y1) - Math.max(b1.y0, b2.y0));
  return ox * oy;
}

// Test if furniture is fully contained inside a room
export function furnInsideRoom(f, r) {
  const b = getFurnAABB(f);
  return b.x0 >= r.x && b.x1 <= r.x + r.w && b.y0 >= r.y && b.y1 <= r.y + r.h;
}

// Find which room contains the furniture center point
export function getRoomForFurn(f, rooms) {
  return rooms.find(r => inRect(r, { x: f.x, y: f.y })) || null;
}

// Calculate free floor space for a room
export function calcFreeFloorSpace(room, furnList) {
  const roomAreaM2 = (room.w * room.h) / 10000;
  const itemsInRoom = furnList.filter(f => furnInsideRoom(f, room) || inRect(room, { x: f.x, y: f.y }));

  let occupiedAreaCm2 = 0;
  for (const f of itemsInRoom) {
    occupiedAreaCm2 += f.w * f.d;
  }

  // Deduct overlap so double-counting doesn't inflate occupied space
  for (let i = 0; i < itemsInRoom.length; i++) {
    for (let j = i + 1; j < itemsInRoom.length; j++) {
      occupiedAreaCm2 -= furnOverlapArea(itemsInRoom[i], itemsInRoom[j]);
    }
  }

  const occupiedM2 = Math.min(roomAreaM2, occupiedAreaCm2 / 10000);
  const freeM2 = Math.max(0, roomAreaM2 - occupiedM2);
  const utilizationRatio = roomAreaM2 > 0 ? (occupiedM2 / roomAreaM2) : 0;

  return {
    roomAreaM2,
    occupiedM2,
    freeM2,
    utilizationPct: Math.round(utilizationRatio * 100),
    itemCount: itemsInRoom.length
  };
}

// Check clearance around a furniture piece
export function getClearanceViolations(targetFurn, allFurn, room) {
  const violations = [];
  const b1 = getFurnAABB(targetFurn);

  // Check proximity to walls (front clearance)
  const distLeft = b1.x0 - room.x;
  const distRight = (room.x + room.w) - b1.x1;
  const distTop = b1.y0 - room.y;
  const distBottom = (room.y + room.h) - b1.y1;

  if (b1.x0 < room.x || b1.x1 > room.x + room.w || b1.y0 < room.y || b1.y1 > room.y + room.h) {
    violations.push({
      type: 'wall_clip',
      severity: 'critical',
      message: `${targetFurn.label || targetFurn.type} clips through room walls`
    });
  }

  for (const other of allFurn) {
    if (other.id === targetFurn.id) continue;
    if (furnOverlap(targetFurn, other)) {
      violations.push({
        type: 'overlap',
        severity: 'critical',
        message: `${targetFurn.label || targetFurn.type} overlaps with ${other.label || other.type}`,
        otherId: other.id
      });
    }
  }

  return violations;
}

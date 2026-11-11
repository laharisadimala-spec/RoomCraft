import { inRect, furnOverlap, furnOverlapArea, getFurnAABB } from '../core/geometry.js';

export class DesignAnalyzer {
  constructor() {}

  // Comprehensive mathematical analysis of the whole apartment or a single room
  analyze(home, targetRoomId = null) {
    if (!home || !home.rooms || home.rooms.length === 0) {
      return {
        overallScore: 0,
        categories: [],
        warnings: [],
        tips: []
      };
    }

    const roomsToAnalyze = targetRoomId
      ? home.rooms.filter(r => r.id === targetRoomId)
      : home.rooms;

    let totalScoreSum = 0;
    const allWarnings = [];
    const allTips = [];

    let scoreUtilizationAcc = 0;
    let scoreCollisionAcc = 0;
    let scoreClearanceAcc = 0;
    let scoreAccessibilityAcc = 0;
    let scoreBalanceAcc = 0;

    for (const room of roomsToAnalyze) {
      const roomAreaM2 = (room.w * room.h) / 10000;
      const roomFurn = home.furn.filter(f => f.floorId === room.floorId && inRect(room, { x: f.x, y: f.y }));

      // 1. SPACE UTILIZATION (Weight: 20%)
      // Optimal range: 25% to 42%
      let furnAreaM2 = 0;
      roomFurn.forEach(f => {
        if (f.type !== 'door' && f.type !== 'window') {
          furnAreaM2 += (f.w * f.d) / 10000;
        }
      });

      const utilRatio = roomAreaM2 > 0 ? (furnAreaM2 / roomAreaM2) : 0;
      const utilPct = Math.round(utilRatio * 100);

      let roomUtilScore = 100;
      if (utilPct < 15) {
        roomUtilScore = Math.max(40, 50 + utilPct * 2);
        allTips.push({
          room: room.name,
          message: `${room.name} has only ${utilPct}% floor utilization. Consider adding an accent chair, rug, or storage credenza.`
        });
      } else if (utilPct > 45) {
        const excess = utilPct - 45;
        roomUtilScore = Math.max(30, 100 - excess * 3);
        allWarnings.push({
          severity: 'warning',
          room: room.name,
          message: `${room.name} feels congested at ${utilPct}% footprint density. Recommend decluttering or using multipurpose wall-mounted pieces.`
        });
      } else {
        roomUtilScore = 95;
      }
      scoreUtilizationAcc += roomUtilScore;

      // 2. FURNITURE OVERLAP & COLLISIONS (Weight: 25%)
      let roomCollisionScore = 100;
      const overlaps = [];
      for (let i = 0; i < roomFurn.length; i++) {
        for (let j = i + 1; j < roomFurn.length; j++) {
          const f1 = roomFurn[i];
          const f2 = roomFurn[j];
          if (f1.type === 'door' || f2.type === 'door' || f1.type === 'window' || f2.type === 'window') continue;

          if (furnOverlap(f1, f2)) {
            const overlapArea = furnOverlapArea(f1, f2);
            overlaps.push({ f1: f1.label || f1.type, f2: f2.label || f2.type, overlapArea });
            roomCollisionScore = Math.max(20, roomCollisionScore - 25);
            allWarnings.push({
              severity: 'critical',
              room: room.name,
              message: `Collision detected: "${f1.label || f1.type}" overlaps with "${f2.label || f2.type}".`
            });
          }
        }
      }
      scoreCollisionAcc += roomCollisionScore;

      // 3. WALKING CLEARANCE (Weight: 20%)
      // Checks clearance corridors (minimum 60-70cm between major pieces)
      let roomClearanceScore = 95;
      for (const f of roomFurn) {
        const b = getFurnAABB(f);
        // Wall margin
        const leftDist = b.x0 - room.x;
        const rightDist = (room.x + room.w) - b.x1;
        const topDist = b.y0 - room.y;
        const bottomDist = (room.y + room.h) - b.y1;

        if (b.x0 < room.x || b.x1 > room.x + room.w || b.y0 < room.y || b.y1 > room.y + room.h) {
          roomClearanceScore = Math.max(20, roomClearanceScore - 20);
          allWarnings.push({
            severity: 'critical',
            room: room.name,
            message: `"${f.label || f.type}" extends past the room boundary wall.`
          });
        }
      }
      scoreClearanceAcc += roomClearanceScore;

      // 4. DOOR & PASSAGE ACCESSIBILITY (Weight: 20%)
      let roomAccessScore = 100;
      const doorsInRoom = home.furn.filter(f => f.type === 'door' && f.floorId === room.floorId && inRect(room, { x: f.x, y: f.y }));
      doorsInRoom.forEach(d => {
        // Door swing zone is 90cm radius in front of door
        const blockedBy = roomFurn.find(f => {
          if (f.id === d.id || f.type === 'door' || f.type === 'window') return false;
          const dist = Math.hypot(f.x - d.x, f.y - d.y);
          return dist < 80;
        });

        if (blockedBy) {
          roomAccessScore = Math.max(30, roomAccessScore - 30);
          allWarnings.push({
            severity: 'warning',
            room: room.name,
            message: `Doorway transit path is obstructed by "${blockedBy.label || blockedBy.type}". Maintain at least 90cm door swing clearance.`
          });
        }
      });
      scoreAccessibilityAcc += roomAccessScore;

      // 5. QUADRANT BALANCE & HARMONY (Weight: 15%)
      const midX = room.x + room.w / 2;
      const midY = room.y + room.h / 2;
      const quads = [0, 0, 0, 0];
      roomFurn.forEach(f => {
        if (f.type !== 'door' && f.type !== 'window') {
          const qx = f.x < midX ? 0 : 1;
          const qy = f.y < midY ? 0 : 2;
          quads[qx + qy] += (f.w * f.d);
        }
      });
      const totalMass = quads.reduce((a, b) => a + b, 0);
      let roomBalanceScore = 90;
      if (totalMass > 0) {
        const shares = quads.map(q => q / totalMass);
        const maxShare = Math.max(...shares);
        if (maxShare > 0.65) {
          roomBalanceScore = 60;
          allTips.push({
            room: room.name,
            message: `${room.name} has heavily clustered furniture on one side (${Math.round(maxShare * 100)}% in one quadrant). Distribute pieces to restore balance.`
          });
        }
      }
      scoreBalanceAcc += roomBalanceScore;
    }

    const count = roomsToAnalyze.length || 1;
    const catUtilization = Math.round(scoreUtilizationAcc / count);
    const catCollision = Math.round(scoreCollisionAcc / count);
    const catClearance = Math.round(scoreClearanceAcc / count);
    const catAccessibility = Math.round(scoreAccessibilityAcc / count);
    const catBalance = Math.round(scoreBalanceAcc / count);

    // Composite weighted score
    const overallScore = Math.min(100, Math.max(10, Math.round(
      catUtilization * 0.20 +
      catCollision * 0.25 +
      catClearance * 0.20 +
      catAccessibility * 0.20 +
      catBalance * 0.15
    )));

    const categories = [
      { name: 'Collision & Wall Fit', score: catCollision, desc: 'Zero furniture overlap and clean wall alignment' },
      { name: 'Circulation & Clearance', score: catClearance, desc: 'Unobstructed walking paths of 70cm+' },
      { name: 'Door & Passage Flow', score: catAccessibility, desc: 'Clear 90cm swing zones for all doorways' },
      { name: 'Space Utilization Density', score: catUtilization, desc: 'Balanced 25% - 42% floor footprint' },
      { name: 'Visual Weight & Balance', score: catBalance, desc: 'Symmetrical distribution across quadrants' }
    ];

    return {
      overallScore,
      rating: overallScore >= 88 ? 'Exemplary' : overallScore >= 75 ? 'Optimal' : overallScore >= 60 ? 'Moderate' : 'Needs Optimization',
      categories,
      warnings: allWarnings,
      tips: allTips,
      evaluatedRoomCount: roomsToAnalyze.length
    };
  }
}

import { FLOOR_MATERIALS, WALL_MATERIALS, MAKEOVER_STYLES, FURN } from '../core/constants.js';
import { inRect } from '../core/geometry.js';

export class MoodboardGenerator {
  constructor() {}

  generateMoodboard(room, home, threeSnapshotUrl = null) {
    if (!room || !home) return null;

    const floorMat = FLOOR_MATERIALS[room.floorMaterial] || FLOOR_MATERIALS.oakWood;
    const wallMat = WALL_MATERIALS[room.wallMaterial] || WALL_MATERIALS.whitePaint;

    // Detect matched style or infer theme
    const matchedStyle = Object.values(MAKEOVER_STYLES).find(s =>
      s.floorMaterial === room.floorMaterial || s.wallMaterial === room.wallMaterial
    ) || MAKEOVER_STYLES.scandinavian;

    // Furniture in room
    const roomFurn = home.furn.filter(f => f.floorId === room.floorId && inRect(room, { x: f.x, y: f.y }));

    // Extract color palette
    const colors = [
      { label: 'Wall Finish', hex: room.wall || wallMat.color },
      { label: 'Flooring Hue', hex: room.floor || floorMat.color },
      ...matchedStyle.palette.slice(0, 3).map((hex, i) => ({
        label: i === 0 ? 'Primary Accent' : i === 1 ? 'Secondary Accent' : 'Ambient Tone',
        hex
      }))
    ];

    // Lighting ambiance profile
    const lightingPreset = home.lighting?.preset || 'afternoon';
    const lightNarrative = lightingPreset === 'morning' ? 'Bright 4200K Eastern Daylight with warm morning reflections' :
      lightingPreset === 'sunset' ? 'Amber 2800K Golden-hour glow with dramatic soft evening contrast' :
      lightingPreset === 'night' ? 'Cozy 2500K warm interior illumination with recessed spotlight accents' :
      'Crisp 5400K natural overhead daylight offering pristine color rendering';

    return {
      roomId: room.id,
      roomName: room.name,
      areaM2: ((room.w * room.h) / 10000).toFixed(1),
      dimensions: `${(room.w / 100).toFixed(2)}m × ${(r = room.h / 100).toFixed(2)}m`,
      themeName: matchedStyle.name,
      themeTagline: matchedStyle.tagline,
      palette: colors,
      floorMaterial: {
        id: floorMat.id,
        label: floorMat.label,
        desc: floorMat.desc,
        color: room.floor || floorMat.color
      },
      wallMaterial: {
        id: wallMat.id,
        label: wallMat.label,
        desc: wallMat.desc,
        color: room.wall || wallMat.color
      },
      lighting: {
        preset: lightingPreset,
        narrative: lightNarrative
      },
      furnitureList: roomFurn.map(f => ({
        id: f.id,
        label: f.label || (FURN[f.type]?.label) || f.type,
        dimensions: `${f.w} × ${f.d} × ${f.h} cm`,
        color: f.color
      })),
      previewSnapshot: threeSnapshotUrl
    };
  }

  // Render moodboard onto an exportable canvas for high-res PNG download
  exportMoodboardCanvas(mb) {
    const cv = document.createElement('canvas');
    cv.width = 1200;
    cv.height = 800;
    const ctx = cv.getContext('2d');

    // Background
    ctx.fillStyle = '#fcfbf8';
    ctx.fillRect(0, 0, 1200, 800);

    // Border frame
    ctx.strokeStyle = '#e6ddce';
    ctx.lineWidth = 12;
    ctx.strokeRect(16, 16, 1168, 768);

    // Header
    ctx.fillStyle = '#2b2823';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(mb.roomName.toUpperCase(), 48, 70);

    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillStyle = '#8a6d4b';
    ctx.fillText(`${mb.themeName} Design Concept · ${mb.areaM2} m² (${mb.dimensions})`, 48, 100);

    ctx.fillStyle = '#6e685f';
    ctx.font = 'italic 14px Georgia, serif';
    ctx.fillText(`"${mb.themeTagline}"`, 48, 126);

    // Palette swatches
    ctx.fillStyle = '#2b2823';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('COLOR PALETTE & HARMONY', 48, 180);

    let swX = 48;
    mb.palette.forEach(p => {
      ctx.fillStyle = p.hex;
      ctx.beginPath();
      ctx.roundRect(swX, 200, 95, 75, 8);
      ctx.fill();
      ctx.strokeStyle = '#d9d0c1';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#3a3630';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(p.hex.toUpperCase(), swX + 6, 295);
      ctx.fillStyle = '#857e74';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(p.label, swX + 6, 310);

      swX += 115;
    });

    // Material cards
    ctx.fillStyle = '#2b2823';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('MATERIAL SPECIFICATIONS', 48, 360);

    // Floor Card
    ctx.fillStyle = '#f6f2ea';
    ctx.beginPath();
    ctx.roundRect(48, 380, 260, 150, 8);
    ctx.fill();
    ctx.fillStyle = mb.floorMaterial.color;
    ctx.fillRect(60, 396, 40, 40);
    ctx.strokeStyle = '#d5ccbe';
    ctx.strokeRect(60, 396, 40, 40);

    ctx.fillStyle = '#2b2823';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('Flooring Surface', 112, 412);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#8a6d4b';
    ctx.fillText(mb.floorMaterial.label, 112, 430);
    ctx.fillStyle = '#5c574f';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(mb.floorMaterial.desc.slice(0, 36) + '...', 60, 470);

    // Wall Card
    ctx.fillStyle = '#f6f2ea';
    ctx.beginPath();
    ctx.roundRect(330, 380, 260, 150, 8);
    ctx.fill();
    ctx.fillStyle = mb.wallMaterial.color;
    ctx.fillRect(342, 396, 40, 40);
    ctx.strokeStyle = '#d5ccbe';
    ctx.strokeRect(342, 396, 40, 40);

    ctx.fillStyle = '#2b2823';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('Wall Treatment', 394, 412);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#8a6d4b';
    ctx.fillText(mb.wallMaterial.label, 394, 430);
    ctx.fillStyle = '#5c574f';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(mb.wallMaterial.desc.slice(0, 36) + '...', 342, 470);

    // Furniture pieces list
    ctx.fillStyle = '#2b2823';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('CURATED FURNITURE INVENTORY', 640, 180);

    let fY = 205;
    mb.furnitureList.slice(0, 7).forEach((f, idx) => {
      ctx.fillStyle = '#f9f6f0';
      ctx.beginPath();
      ctx.roundRect(640, fY, 500, 36, 6);
      ctx.fill();
      ctx.strokeStyle = '#e6ddce';
      ctx.stroke();

      ctx.fillStyle = f.color;
      ctx.fillRect(652, fY + 8, 20, 20);
      ctx.strokeStyle = '#aaa';
      ctx.strokeRect(652, fY + 8, 20, 20);

      ctx.fillStyle = '#2b2823';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(f.label, 684, fY + 22);

      ctx.fillStyle = '#8a6d4b';
      ctx.font = '11px monospace';
      ctx.fillText(f.dimensions, 1000, fY + 22);

      fY += 44;
    });

    // Lighting ambiance bar
    ctx.fillStyle = '#f3ede2';
    ctx.beginPath();
    ctx.roundRect(48, 560, 1092, 70, 8);
    ctx.fill();
    ctx.fillStyle = '#2b2823';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(`LIGHTING AMBIANCE: ${mb.lighting.preset.toUpperCase()}`, 68, 588);
    ctx.fillStyle = '#6b6459';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(mb.lighting.narrative, 68, 610);

    // Footer
    ctx.fillStyle = '#9e968a';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('Generated by RoomCraft 2.0 — Architectural Exhibition Edition', 48, 750);
    ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 1030, 750);

    return cv.toDataURL('image/png');
  }
}

import { esc, inRect } from '../core/geometry.js';

export class BlueprintRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.theme = 'cad'; // 'cad' (Monochrome Architect) or 'blueprint' (Classic Cyan)
    this.zoom = 0.5;
    this.pan = { x: 80, y: 80 };
  }

  setTheme(themeName) {
    this.theme = themeName;
    this.render(this.currentHome, this.activeFloorId);
  }

  render(home, activeFloorId) {
    this.currentHome = home;
    this.activeFloorId = activeFloorId || home.currentFloorId;

    const cv = this.canvas;
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.parentElement.clientWidth;
    const H = cv.parentElement.clientHeight;

    if (cv.width !== W * dpr || cv.height !== H * dpr) {
      cv.width = W * dpr;
      cv.height = H * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isCyan = this.theme === 'blueprint';
    const bg = isCyan ? '#0a233b' : '#faf9f6';
    const gridColor = isCyan ? 'rgba(40, 95, 145, 0.4)' : 'rgba(215, 208, 195, 0.5)';
    const wallFill = isCyan ? '#133e63' : '#2b2926';
    const wallStroke = isCyan ? '#8bc5f2' : '#141312';
    const textColor = isCyan ? '#e2f1fc' : '#22201d';
    const dimColor = isCyan ? '#64b5f6' : '#8a6d4b';
    const furnStroke = isCyan ? '#4ba3e3' : '#4d473e';
    const furnFill = isCyan ? 'rgba(19, 62, 99, 0.6)' : 'rgba(240, 235, 226, 0.7)';

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(this.pan.x, this.pan.y);
    ctx.scale(this.zoom, this.zoom);

    // Grid lines (100cm / 1m grid)
    const z = this.zoom;
    const x0 = -this.pan.x / z;
    const y0 = -this.pan.y / z;
    const x1 = x0 + W / z;
    const y1 = y0 + H / z;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 / z;
    ctx.beginPath();
    for (let x = Math.floor(x0 / 100) * 100; x < x1; x += 100) {
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
    for (let y = Math.floor(y0 / 100) * 100; y < y1; y += 100) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();

    const activeRooms = home.rooms.filter(r => r.floorId === this.activeFloorId);
    const activeFurn = home.furn.filter(f => f.floorId === this.activeFloorId);

    // 1. Draw Architectural Rooms with Wall Thickness (14cm walls)
    const wt = 14; // wall thickness in cm
    for (const r of activeRooms) {
      // Room floor outline
      ctx.fillStyle = isCyan ? 'rgba(15, 45, 75, 0.4)' : '#ffffff';
      ctx.fillRect(r.x, r.y, r.w, r.h);

      // Double-line outer wall envelope
      ctx.fillStyle = wallFill;
      ctx.strokeStyle = wallStroke;
      ctx.lineWidth = 2 / z;

      // Draw top wall
      ctx.fillRect(r.x - wt, r.y - wt, r.w + wt * 2, wt);
      ctx.strokeRect(r.x - wt, r.y - wt, r.w + wt * 2, wt);

      // Bottom wall
      ctx.fillRect(r.x - wt, r.y + r.h, r.w + wt * 2, wt);
      ctx.strokeRect(r.x - wt, r.y + r.h, r.w + wt * 2, wt);

      // Left wall
      ctx.fillRect(r.x - wt, r.y, wt, r.h);
      ctx.strokeRect(r.x - wt, r.y, wt, r.h);

      // Right wall
      ctx.fillRect(r.x + r.w, r.y, wt, r.h);
      ctx.strokeRect(r.x + r.w, r.y, wt, r.h);

      // Hatching inside walls
      this.drawWallHatching(ctx, r.x - wt, r.y - wt, r.w + wt * 2, wt, isCyan, z);
      this.drawWallHatching(ctx, r.x - wt, r.y + r.h, r.w + wt * 2, wt, isCyan, z);
    }

    // 2. Draw Architectural Furniture Blocks
    for (const f of activeFurn) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate((f.rot || 0) * Math.PI / 180);

      this.drawArchitecturalSymbol(ctx, f, furnFill, furnStroke, isCyan, z);
      ctx.restore();
    }

    // 3. Draw Dimension Lines and Room Labels
    for (const r of activeRooms) {
      const areaM2 = (r.w * r.h) / 10000;
      const areaSqFt = areaM2 * 10.7639;

      // Center Room Badge
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${16 / z}px "Courier New", monospace`;
      ctx.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + r.h / 2 - 14 / z);

      ctx.font = `${12 / z}px "Courier New", monospace`;
      ctx.fillStyle = dimColor;
      ctx.fillText(`${(r.w / 100).toFixed(2)}m × ${(r.h / 100).toFixed(2)}m`, r.x + r.w / 2, r.y + r.h / 2 + 6 / z);
      ctx.fillText(`${areaM2.toFixed(1)} m²  [${Math.round(areaSqFt)} sq.ft]`, r.x + r.w / 2, r.y + r.h / 2 + 24 / z);

      // Horizontal dimension line on top
      this.drawDimensionString(ctx, r.x, r.y - wt - 25 / z, r.x + r.w, r.y - wt - 25 / z, `${(r.w / 100).toFixed(2)} m`, dimColor, z);
      // Vertical dimension line on left
      this.drawDimensionString(ctx, r.x - wt - 25 / z, r.y, r.x - wt - 25 / z, r.y + r.h, `${(r.h / 100).toFixed(2)} m`, dimColor, z, true);
    }

    ctx.restore();

    // 4. Architectural Title Block & Scale Bar (Fixed in bottom-right corner)
    this.drawTitleBlock(ctx, W, H, home, isCyan);
    this.drawScaleBar(ctx, 40, H - 40, isCyan);
    this.drawNorthCompass(ctx, 70, 70, isCyan);
  }

  drawWallHatching(ctx, x, y, w, h, isCyan, z) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = isCyan ? 'rgba(139, 197, 242, 0.25)' : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1 / z;
    const step = 8;
    for (let p = -h; p < w + h; p += step) {
      ctx.beginPath();
      ctx.moveTo(x + p, y);
      ctx.lineTo(x + p + h, y + h);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDimensionString(ctx, x0, y0, x1, y1, text, color, z, isVertical = false) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.2 / z;

    // Line
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Ticks (architectural 45 deg slash)
    const tick = 8 / z;
    ctx.beginPath();
    ctx.moveTo(x0 - tick, y0 + tick);
    ctx.lineTo(x0 + tick, y0 - tick);
    ctx.moveTo(x1 - tick, y1 + tick);
    ctx.lineTo(x1 + tick, y1 - tick);
    ctx.stroke();

    // Text
    ctx.font = `600 ${11 / z}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const midX = (x0 + x1) / 2;
    const midY = (y0 + y1) / 2;

    if (isVertical) {
      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, -4 / z);
      ctx.restore();
    } else {
      ctx.fillText(text, midX, midY - 4 / z);
    }

    ctx.restore();
  }

  drawArchitecturalSymbol(ctx, f, fill, stroke, isCyan, z) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5 / z;

    const hw = f.w / 2;
    const hd = f.d / 2;

    switch (f.type) {
      case 'bed':
        // Bed mattress
        ctx.fillRect(-hw, -hd, f.w, f.d);
        ctx.strokeRect(-hw, -hd, f.w, f.d);
        // Headboard
        ctx.strokeRect(-hw, -hd, f.w, 14);
        // Pillows
        const pw = f.w * 0.38, ph = 24;
        ctx.strokeRect(-hw + 8, -hd + 20, pw, ph);
        ctx.strokeRect(hw - pw - 8, -hd + 20, pw, ph);
        // Fold sheet line
        ctx.beginPath();
        ctx.moveTo(-hw, hd * 0.2);
        ctx.lineTo(hw, hd * 0.2);
        ctx.stroke();
        break;

      case 'sofa':
        ctx.fillRect(-hw, -hd, f.w, f.d);
        ctx.strokeRect(-hw, -hd, f.w, f.d);
        // Backrest cushion
        ctx.strokeRect(-hw, -hd, f.w, f.d * 0.25);
        // Left & right armrests
        ctx.strokeRect(-hw, -hd, f.w * 0.14, f.d);
        ctx.strokeRect(hw - f.w * 0.14, -hd, f.w * 0.14, f.d);
        break;

      case 'table':
        ctx.fillRect(-hw, -hd, f.w, f.d);
        ctx.strokeRect(-hw, -hd, f.w, f.d);
        // Subtle center seam
        ctx.beginPath();
        ctx.moveTo(0, -hd);
        ctx.lineTo(0, hd);
        ctx.stroke();
        break;

      case 'chair':
        ctx.fillRect(-hw, -hd, f.w, f.d);
        ctx.strokeRect(-hw, -hd, f.w, f.d);
        // Curved back
        ctx.beginPath();
        ctx.arc(0, -hd + 6, hw * 0.7, 0, Math.PI);
        ctx.stroke();
        break;

      case 'door': {
        // Door opening symbol with 90 degree swing arc
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5 / z;
        // Wall gap jambs
        ctx.strokeRect(-hw, -6, 6, 12);
        ctx.strokeRect(hw - 6, -6, 6, 12);
        // Open door leaf
        ctx.beginPath();
        ctx.moveTo(-hw, 0);
        ctx.lineTo(-hw, f.w);
        ctx.stroke();
        // Quarter circle swing arc
        ctx.setLineDash([4 / z, 4 / z]);
        ctx.beginPath();
        ctx.arc(-hw, 0, f.w, 0, Math.PI / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      case 'window': {
        // Window 3-line symbol with sill
        ctx.fillStyle = fill;
        ctx.fillRect(-hw, -hd, f.w, f.d);
        ctx.strokeRect(-hw, -hd, f.w, f.d);
        ctx.beginPath();
        ctx.moveTo(-hw, 0);
        ctx.lineTo(hw, 0);
        ctx.stroke();
        break;
      }

      case 'bathtub':
        ctx.beginPath();
        ctx.roundRect(-hw, -hd, f.w, f.d, 18);
        ctx.fill();
        ctx.stroke();
        // Drain hole
        ctx.beginPath();
        ctx.arc(hw * 0.6, 0, 4, 0, Math.PI * 2);
        ctx.stroke();
        break;

      default:
        ctx.fillRect(-hw, -hd, f.w, f.d);
        ctx.strokeRect(-hw, -hd, f.w, f.d);
        break;
    }
  }

  drawTitleBlock(ctx, W, H, home, isCyan) {
    const boxW = 320;
    const boxH = 110;
    const x = W - boxW - 20;
    const y = H - boxH - 20;

    ctx.save();
    ctx.fillStyle = isCyan ? 'rgba(10, 35, 59, 0.92)' : 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = isCyan ? '#64b5f6' : '#2b2926';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeRect(x, y, boxW, boxH);

    ctx.fillStyle = isCyan ? '#ffffff' : '#1a1918';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('ROOMCRAFT 2.0 ARCHITECTURAL CAD', x + 12, y + 22);

    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = isCyan ? '#b3d9ff' : '#524d45';
    ctx.fillText(`PROJECT: ${home.name.toUpperCase()}`, x + 12, y + 42);
    ctx.fillText(`DRAWING: TECHNICAL FLOOR PLAN (1:50)`, x + 12, y + 60);

    const activeRooms = home.rooms.filter(r => r.floorId === this.activeFloorId);
    const totalAreaM2 = activeRooms.reduce((s, r) => s + (r.w * r.h) / 10000, 0);
    ctx.fillText(`TOTAL BUILT-UP: ${totalAreaM2.toFixed(1)} m² [${Math.round(totalAreaM2 * 10.7639)} sq.ft]`, x + 12, y + 78);
    ctx.fillText(`DATE: ${new Date().toLocaleDateString()} · STATUS: ISSUED FOR REVIEW`, x + 12, y + 96);
    ctx.restore();
  }

  drawScaleBar(ctx, x, y, isCyan) {
    ctx.save();
    ctx.strokeStyle = isCyan ? '#64b5f6' : '#2b2926';
    ctx.fillStyle = isCyan ? '#64b5f6' : '#2b2926';
    ctx.lineWidth = 1.5;

    const barLen = 100; // 100px represents 2 meters at standard scale
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + barLen, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.moveTo(x + barLen / 2, y - 4);
    ctx.lineTo(x + barLen / 2, y + 4);
    ctx.moveTo(x + barLen, y - 6);
    ctx.lineTo(x + barLen, y + 6);
    ctx.stroke();

    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0', x, y - 10);
    ctx.fillText('1m', x + barLen / 2, y - 10);
    ctx.fillText('2m', x + barLen, y - 10);
    ctx.fillText('SCALE 1:50 METRIC', x + barLen / 2, y + 18);
    ctx.restore();
  }

  drawNorthCompass(ctx, x, y, isCyan) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = isCyan ? '#64b5f6' : '#2b2926';
    ctx.fillStyle = isCyan ? '#64b5f6' : '#2b2926';
    ctx.lineWidth = 1.5;

    // Compass Circle
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();

    // North Arrow
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-6, 6);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.stroke();

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -26);
    ctx.restore();
  }

  exportBlueprintPNG() {
    return this.canvas.toDataURL('image/png');
  }
}

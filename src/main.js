import { GRID, M, FURN, FURN_CATEGORIES, FLOOR_MATERIALS, WALL_MATERIALS, MAKEOVER_STYLES } from './core/constants.js';
import { snap, clamp, esc, inRect, furnHit, getFurnAABB } from './core/geometry.js';
import {
  loadHomeFromStorage, saveHomeToStorage, blankHome, template2bhk, templateExhibitionShowcase,
  makeRoom, makeFurn, makeDoor, makeWindow
} from './core/state.js';

import { ThreeStudio } from './modules/threeScene.js';
import { WalkthroughController } from './modules/walkthrough.js';
import { MakeoverEngine } from './modules/makeover.js';
import { LayoutEngine } from './modules/layoutEngine.js';
import { LightingSimulator } from './modules/lighting.js';
import { MaterialStudio } from './modules/materials.js';
import { FloorManager } from './modules/floors.js';
import { BlueprintRenderer } from './modules/blueprint.js';
import { ExplodedViewController } from './modules/explodedView.js';
import { BudgetPlanner } from './modules/budget.js';
import { DesignAnalyzer } from './modules/analyzer.js';
import { MoodboardGenerator } from './modules/moodboard.js';
import { DesignComparator } from './modules/comparison.js';
import { PresentationController } from './modules/presentation.js';
import { ProjectManager } from './modules/projects.js';

// DOM References
const $ = id => document.getElementById(id);
const planCanvas = $('plan'), planCtx = planCanvas.getContext('2d');
const threeCanvas = $('three');
const blueprintCanvas = $('blueprint');
const panel = $('panel');
const panelTitle = $('panelTitle');
const modalContainer = $('modalContainer');

// Primary Application State
let home = loadHomeFromStorage();
let sel = null; // { kind: 'room' | 'furn', id }
let tool = 'select'; // 'select' | 'room' | 'door' | 'window'
let view = '2d'; // '2d' | '3d' | 'walk'
let planSubView = 'standard'; // 'standard' | 'blueprint'
let currentFurnCategory = 'living';
let activeSidebarCategory = 'rooms'; // 'rooms' | 'furniture' | 'design' | 'smart'
let furnSearchQuery = '';

let spaceDown = false;
let drag = null, pending = null;
const undoStack = [], redoStack = [];
const cam = { zoom: 0.5, x: 60, y: 60 };

// Subsystems
let threeStudio = null;
let walkthrough = null;
let presentation = null;
let explodedController = null;
let blueprintRenderer = null;
let lightingSim = null;
let materialStudio = null;
let floorManager = null;
let makeoverEngine = null;
let layoutEngine = null;
let budgetPlanner = null;
let analyzer = null;
let moodboardGen = null;
let comparator = null;
let projectManager = null;

function initModules() {
  threeStudio = new ThreeStudio(threeCanvas);
  walkthrough = new WalkthroughController(threeStudio);
  walkthrough.minimapCanvas = $('walkMinimap');

  presentation = new PresentationController(threeStudio);
  explodedController = new ExplodedViewController(threeStudio);
  blueprintRenderer = new BlueprintRenderer(blueprintCanvas);

  lightingSim = new LightingSimulator(threeStudio, () => commit(false));
  materialStudio = new MaterialStudio(() => commit());
  floorManager = new FloorManager(() => commit());
  makeoverEngine = new MakeoverEngine(null);
  layoutEngine = new LayoutEngine();
  budgetPlanner = new BudgetPlanner();
  analyzer = new DesignAnalyzer();
  moodboardGen = new MoodboardGenerator();
  comparator = new DesignComparator();
  projectManager = new ProjectManager(newHome => loadHome(newHome));
}

// ---------------- Helpers & State Operations ----------------
const toWorld = (sx, sy) => ({ x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom });
const pt = e => { const r = planCanvas.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; };

const selItem = () => {
  if (!sel) return null;
  return sel.kind === 'room'
    ? home.rooms.find(r => r.id === sel.id)
    : home.furn.find(f => f.id === sel.id);
};

function bounds() {
  const activeRooms = home.rooms.filter(r => r.floorId === home.currentFloorId);
  if (!activeRooms.length) return null;
  return {
    x0: Math.min(...activeRooms.map(r => r.x)),
    y0: Math.min(...activeRooms.map(r => r.y)),
    x1: Math.max(...activeRooms.map(r => r.x + r.w)),
    y1: Math.max(...activeRooms.map(r => r.y + r.h))
  };
}

function setStatus(text) {
  $('saveStatus').textContent = text;
}

function record(before) {
  if (before && before !== JSON.stringify(home)) {
    undoStack.push(before);
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
  }
}

function commit(rebuild3dScene = true) {
  if (sel && !selItem()) sel = null;

  // Auto-save debounced
  projectManager.scheduleAutoSave(home, setStatus);

  // Update Footer & Badges
  updateFooterBadges();

  // Re-render Active Viewport
  if (view === '2d') {
    if (planSubView === 'blueprint') {
      blueprintRenderer.render(home, home.currentFloorId);
    } else {
      render2D();
    }
  } else if (view === '3d') {
    if (rebuild3dScene) {
      threeStudio.rebuild(home, { isolateFloorId: floorManager.isolatedFloorId });
    }
  }

  // Render context-dependent sidebar contents
  renderSidebarRoomList();
  if (activeSidebarCategory === 'smart') renderSmartToolsPanel();

  // Render Contextual Properties Inspector
  renderContextualProperties();
}

function doUndo() {
  if (undoStack.length) {
    redoStack.push(JSON.stringify(home));
    home = JSON.parse(undoStack.pop());
    commit();
    $('name').value = home.name;
    setStatus('✓ Undo');
  }
}

function doRedo() {
  if (redoStack.length) {
    undoStack.push(JSON.stringify(home));
    home = JSON.parse(redoStack.pop());
    commit();
    $('name').value = home.name;
    setStatus('✓ Redo');
  }
}

function loadHome(newHome) {
  home = newHome;
  sel = null;
  undoStack.length = 0;
  redoStack.length = 0;
  $('name').value = home.name || 'My home';
  commit();
  fit2D();
  if (threeStudio) {
    threeStudio.rebuild(home, { isolateFloorId: floorManager.isolatedFloorId });
    threeStudio.frameScene(home);
  }
}

// ---------------- 2D Plan Canvas Rendering ----------------
function render2D() {
  const dpr = window.devicePixelRatio || 1;
  const W = planCanvas.parentElement.clientWidth;
  const H = planCanvas.parentElement.clientHeight;
  if (planCanvas.width !== W * dpr || planCanvas.height !== H * dpr) {
    planCanvas.width = W * dpr;
    planCanvas.height = H * dpr;
  }

  planCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  planCtx.fillStyle = '#f8f6f1';
  planCtx.fillRect(0, 0, W, H);

  const z = cam.zoom;
  planCtx.save();
  planCtx.translate(cam.x, cam.y);
  planCtx.scale(z, z);

  const x0 = -cam.x / z, y0 = -cam.y / z;
  const x1 = x0 + W / z, y1 = y0 + H / z;

  // 1-meter Grid lines
  planCtx.beginPath();
  planCtx.strokeStyle = '#eae6dd';
  planCtx.lineWidth = 1 / z;
  for (let x = Math.floor(x0 / 100) * 100; x < x1; x += 100) {
    planCtx.moveTo(x, y0);
    planCtx.lineTo(x, y1);
  }
  for (let y = Math.floor(y0 / 100) * 100; y < y1; y += 100) {
    planCtx.moveTo(x0, y);
    planCtx.lineTo(x1, y);
  }
  planCtx.stroke();

  const activeRooms = home.rooms.filter(r => r.floorId === home.currentFloorId);
  const activeFurn = home.furn.filter(f => f.floorId === home.currentFloorId);

  // 1. Draw Room Floors
  for (const r of activeRooms) {
    planCtx.fillStyle = r.floor || '#d9c3a5';
    planCtx.fillRect(r.x, r.y, r.w, r.h);
  }

  // 2. Draw Furniture
  for (const f of activeFurn) {
    planCtx.save();
    planCtx.translate(f.x, f.y);
    planCtx.rotate((f.rot || 0) * Math.PI / 180);

    if (f.type === 'door') {
      planCtx.strokeStyle = '#8a6d4b';
      planCtx.lineWidth = 2 / z;
      planCtx.strokeRect(-f.w / 2, -4, f.w, 8);
      planCtx.setLineDash([4 / z, 4 / z]);
      planCtx.beginPath();
      planCtx.arc(-f.w / 2, 0, f.w, 0, Math.PI / 2);
      planCtx.stroke();
      planCtx.setLineDash([]);
    } else if (f.type === 'window') {
      planCtx.fillStyle = '#bde0fe';
      planCtx.strokeStyle = '#2a5a8a';
      planCtx.lineWidth = 2 / z;
      planCtx.fillRect(-f.w / 2, -6, f.w, 12);
      planCtx.strokeRect(-f.w / 2, -6, f.w, 12);
    } else if (f.type === 'stairs') {
      planCtx.fillStyle = f.color || '#9e8060';
      planCtx.fillRect(-f.w / 2, -f.d / 2, f.w, f.d);
      planCtx.strokeStyle = '#4a3b2c';
      planCtx.lineWidth = 1.5 / z;
      planCtx.strokeRect(-f.w / 2, -f.d / 2, f.w, f.d);
      const steps = 10;
      for (let s = 1; s < steps; s++) {
        const sy = -f.d / 2 + (f.d / steps) * s;
        planCtx.beginPath();
        planCtx.moveTo(-f.w / 2, sy);
        planCtx.lineTo(f.w / 2, sy);
        planCtx.stroke();
      }
    } else {
      planCtx.fillStyle = f.color || '#9c7a52';
      planCtx.strokeStyle = '#524332';
      planCtx.lineWidth = 1.5 / z;
      planCtx.fillRect(-f.w / 2, -f.d / 2, f.w, f.d);
      planCtx.strokeRect(-f.w / 2, -f.d / 2, f.w, f.d);

      if (z > 0.35 && f.w > 40) {
        planCtx.fillStyle = '#ffffff';
        planCtx.textAlign = 'center';
        planCtx.textBaseline = 'middle';
        planCtx.font = `600 ${Math.max(9, Math.min(13, 11 / z))}px Inter, sans-serif`;
        planCtx.fillText(f.label || f.type, 0, 0);
      }
    }
    planCtx.restore();
  }

  // 3. Draw Room Walls & Room Labels
  for (const r of activeRooms) {
    planCtx.strokeStyle = r.wall || '#f5f1ea';
    planCtx.lineWidth = 14;
    planCtx.strokeRect(r.x, r.y, r.w, r.h);

    planCtx.strokeStyle = '#cfc5b4';
    planCtx.lineWidth = 1 / z;
    planCtx.strokeRect(r.x, r.y, r.w, r.h);

    planCtx.fillStyle = '#34332f';
    planCtx.textAlign = 'center';
    planCtx.font = `700 ${14 / z}px Inter, sans-serif`;
    planCtx.fillText(r.name, r.x + r.w / 2, r.y + r.h / 2 - 5 / z);

    planCtx.font = `500 ${11 / z}px Inter, sans-serif`;
    planCtx.fillStyle = '#7a756c';
    planCtx.fillText(
      `${(r.w / 100).toFixed(2)} × ${(r.h / 100).toFixed(2)} m · ${(r.w * r.h / 10000).toFixed(1)} m²`,
      r.x + r.w / 2,
      r.y + r.h / 2 + 13 / z
    );
  }

  // 4. Selection Highlight
  const it = selItem();
  if (it) {
    planCtx.strokeStyle = '#8a6d4b';
    planCtx.lineWidth = 2.5 / z;
    planCtx.setLineDash([6 / z, 4 / z]);
    if (sel.kind === 'room') {
      planCtx.strokeRect(it.x - 2 / z, it.y - 2 / z, it.w + 4 / z, it.h + 4 / z);
    } else {
      planCtx.save();
      planCtx.translate(it.x, it.y);
      planCtx.rotate((it.rot || 0) * Math.PI / 180);
      planCtx.strokeRect(-it.w / 2 - 4 / z, -it.d / 2 - 4 / z, it.w + 8 / z, it.d + 8 / z);
      planCtx.restore();
    }
    planCtx.setLineDash([]);
  }

  // 5. In-progress Room Drawing Box
  if (drag?.kind === 'draw') {
    const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
    planCtx.strokeStyle = '#8a6d4b';
    planCtx.setLineDash([6 / z, 4 / z]);
    planCtx.lineWidth = 2 / z;
    planCtx.strokeRect(x, y, w, h);
    planCtx.setLineDash([]);
    planCtx.fillStyle = '#34332f';
    planCtx.textAlign = 'center';
    planCtx.font = `600 ${12 / z}px Inter, sans-serif`;
    planCtx.fillText(`${(w / 100).toFixed(2)} × ${(h / 100).toFixed(2)} m`, x + w / 2, y + h / 2);
  }

  planCtx.restore();
}

function fit2D() {
  const b = bounds();
  if (!b) {
    cam.zoom = 0.5;
    cam.x = 60;
    cam.y = 60;
    return render2D();
  }
  const W = planCanvas.parentElement.clientWidth;
  const H = planCanvas.parentElement.clientHeight;
  const pad = 80;
  const bw = b.x1 - b.x0;
  const bh = b.y1 - b.y0;
  cam.zoom = clamp(Math.min((W - pad * 2) / bw, (H - pad * 2) / bh), 0.15, 2.5);
  cam.x = (W - bw * cam.zoom) / 2 - b.x0 * cam.zoom;
  cam.y = (H - bh * cam.zoom) / 2 - b.y0 * cam.zoom;
  render2D();
}

// ---------------- 2D Pointer & Gesture Handlers ----------------
planCanvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 && e.button !== 1) return;
  const { sx, sy } = pt(e), p = toWorld(sx, sy);
  planCanvas.setPointerCapture(e.pointerId);
  pending = JSON.stringify(home);

  if (e.button === 1 || spaceDown || e.shiftKey) {
    drag = { kind: 'pan', sx, sy, ox: cam.x, oy: cam.y };
    return;
  }

  if (tool === 'room') {
    drag = { kind: 'draw', x0: snap(p.x), y0: snap(p.y), x1: snap(p.x), y1: snap(p.y) };
    return;
  }

  if (tool === 'door') {
    const door = makeDoor(snap(p.x), snap(p.y), 90, 15, 0, home.currentFloorId);
    home.furn.push(door);
    sel = { kind: 'furn', id: door.id };
    setTool('select');
    record(pending);
    commit();
    return;
  }

  if (tool === 'window') {
    const win = makeWindow(snap(p.x), snap(p.y), 140, 15, 0, home.currentFloorId);
    home.furn.push(win);
    sel = { kind: 'furn', id: win.id };
    setTool('select');
    record(pending);
    commit();
    return;
  }

  const activeFurn = home.furn.filter(f => f.floorId === home.currentFloorId);
  const f = [...activeFurn].reverse().find(f => furnHit(f, p));

  if (f) {
    sel = { kind: 'furn', id: f.id };
    drag = { kind: 'furn', id: f.id, ox: p.x - f.x, oy: p.y - f.y };
  } else {
    const activeRooms = home.rooms.filter(r => r.floorId === home.currentFloorId);
    const r = [...activeRooms].reverse().find(r => inRect(r, p));

    if (r) {
      sel = { kind: 'room', id: r.id };
      const members = activeFurn.filter(f => inRect(r, f)).map(f => ({ id: f.id, x: f.x, y: f.y }));
      drag = { kind: 'room', id: r.id, ox: p.x - r.x, oy: p.y - r.y, rx: r.x, ry: r.y, members };
    } else {
      sel = null;
      drag = { kind: 'pan', sx, sy, ox: cam.x, oy: cam.y };
    }
  }

  render2D();
  renderContextualProperties();
  renderSidebarRoomList();
});

planCanvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const { sx, sy } = pt(e), p = toWorld(sx, sy);

  if (drag.kind === 'pan') {
    cam.x = drag.ox + sx - drag.sx;
    cam.y = drag.oy + sy - drag.sy;
    return render2D();
  }

  if (drag.kind === 'draw') {
    drag.x1 = snap(p.x);
    drag.y1 = snap(p.y);
    return render2D();
  }

  if (drag.kind === 'furn') {
    const f = home.furn.find(f => f.id === drag.id);
    if (f) {
      f.x = snap(p.x - drag.ox);
      f.y = snap(p.y - drag.oy);
    }
  }

  if (drag.kind === 'room') {
    const r = home.rooms.find(r => r.id === drag.id);
    if (r) {
      const nx = snap(p.x - drag.ox), ny = snap(p.y - drag.oy);
      const dx = nx - drag.rx, dy = ny - drag.ry;
      r.x = nx;
      r.y = ny;
      for (const m of drag.members) {
        const f = home.furn.find(f => f.id === m.id);
        if (f) {
          f.x = m.x + dx;
          f.y = m.y + dy;
        }
      }
    }
  }

  render2D();
});

const endDrag = () => {
  if (!drag) return;
  if (drag.kind === 'draw') {
    const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
    if (w >= 80 && h >= 80) {
      const r = makeRoom(`Room ${home.rooms.length + 1}`, x, y, w, h, home.currentFloorId);
      home.rooms.push(r);
      sel = { kind: 'room', id: r.id };
    }
    setTool('select');
  }
  drag = null;
  record(pending);
  pending = null;
  commit();
};
planCanvas.addEventListener('pointerup', endDrag);
planCanvas.addEventListener('pointercancel', endDrag);

planCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  const { sx, sy } = pt(e);
  const before = toWorld(sx, sy);
  cam.zoom = clamp(cam.zoom * (e.deltaY < 0 ? 1.12 : 0.88), 0.15, 3.5);
  cam.x = sx - before.x * cam.zoom;
  cam.y = sy - before.y * cam.zoom;
  render2D();
}, { passive: false });

// ---------------- Primary Workspace Mode Switcher ----------------
function setView(newView) {
  view = newView;

  $('mode2').classList.toggle('on', view === '2d');
  $('mode3').classList.toggle('on', view === '3d');
  $('modeWalk').classList.toggle('on', view === 'walk');

  // Viewport elements
  planCanvas.hidden = view !== '2d' || planSubView === 'blueprint';
  blueprintCanvas.hidden = view !== '2d' || planSubView !== 'blueprint';
  threeCanvas.hidden = view === '2d';

  // 2D Floating dock only in 2D mode
  $('floatingPlanBar').hidden = view !== '2d';

  // 3D Floating dock only in 3D mode
  $('dock3D').hidden = view !== '3d';
  $('explodedOverlay').hidden = true;

  // Walkthrough HUD
  $('walkHud').hidden = view !== 'walk';
  $('presHud').hidden = true;

  if (view === '2d') {
    if (walkthrough.isActive) walkthrough.stop();
    if (presentation.isActive) presentation.stop();
    if (planSubView === 'blueprint') {
      blueprintRenderer.render(home, home.currentFloorId);
    } else {
      fit2D();
    }
  } else if (view === '3d') {
    if (walkthrough.isActive) walkthrough.stop();
    if (presentation.isActive) presentation.stop();
    threeStudio.resize();
    threeStudio.rebuild(home, { isolateFloorId: floorManager.isolatedFloorId });
    threeStudio.frameScene(home);
  } else if (view === 'walk') {
    if (presentation.isActive) presentation.stop();
    threeStudio.resize();
    threeStudio.rebuild(home, { isolateFloorId: home.currentFloorId });
    walkthrough.start(home, () => setView('3d'));
    $('walkCurrentRoom').textContent = walkthrough.getCurrentRoomName();
  }

  renderContextualProperties();
}

$('mode2').onclick = () => setView('2d');
$('mode3').onclick = () => setView('3d');
$('modeWalk').onclick = () => setView('walk');

// 2D Plan Floating Dock Actions
$('btnPlanStandard').onclick = () => {
  planSubView = 'standard';
  $('btnPlanStandard').classList.add('on');
  $('btnPlanBlueprint').classList.remove('on');
  planCanvas.hidden = false;
  blueprintCanvas.hidden = true;
  fit2D();
};
$('btnPlanBlueprint').onclick = () => {
  planSubView = 'blueprint';
  $('btnPlanStandard').classList.remove('on');
  $('btnPlanBlueprint').classList.add('on');
  planCanvas.hidden = true;
  blueprintCanvas.hidden = false;
  blueprintRenderer.render(home, home.currentFloorId);
};
$('btnFitPlan').onclick = () => fit2D();
$('btnZoomIn').onclick = () => {
  cam.zoom = clamp(cam.zoom * 1.2, 0.15, 3.5);
  render2D();
};
$('btnZoomOut').onclick = () => {
  cam.zoom = clamp(cam.zoom * 0.8, 0.15, 3.5);
  render2D();
};

// 3D Floating Dock Actions
$('dockLightingPreset').addEventListener('change', e => {
  lightingSim.setPreset(e.target.value, home);
  commit(false);
});
$('btnDockExploded').onclick = () => {
  $('explodedOverlay').hidden = !$('explodedOverlay').hidden;
  if (!$('explodedOverlay').hidden) {
    $('explodedSlider').value = 0;
    $('explodedVal').textContent = '0%';
    explodedController.setProgress(0);
  }
};
$('btnDockResetCam').onclick = () => threeStudio.frameScene(home);

// Exploded Slider Actions
$('explodedSlider').addEventListener('input', e => {
  const val = parseInt(e.target.value, 10);
  $('explodedVal').textContent = `${val}%`;
  explodedController.setProgress(val / 100);
});
$('btnExplodedToggle').onclick = () => explodedController.toggleExplosion();
$('btnExplodedClose').onclick = () => {
  explodedController.setProgress(0);
  $('explodedOverlay').hidden = true;
};

// Walkthrough Actions
$('walkExit').onclick = () => setView('3d');
$('walkReset').onclick = () => walkthrough.resetPosition();
$('walkNextRoom').onclick = () => {
  walkthrough.nextRoom();
  $('walkCurrentRoom').textContent = walkthrough.getCurrentRoomName();
};
$('walkPrevRoom').onclick = () => {
  walkthrough.prevRoom();
  $('walkCurrentRoom').textContent = walkthrough.getCurrentRoomName();
};
$('walkTourToggle').onclick = () => {
  if (walkthrough.isTouring) {
    walkthrough.pauseTour();
    $('walkTourToggle').textContent = '▶ Auto-Tour';
  } else {
    walkthrough.startTour();
    $('walkTourToggle').textContent = '⏸ Pause Tour';
  }
};

// Presentation Preview Mode
$('btnPreview').onclick = () => {
  if (walkthrough.isActive) walkthrough.stop();
  threeCanvas.hidden = false;
  planCanvas.hidden = true;
  blueprintCanvas.hidden = true;
  $('walkHud').hidden = true;
  $('dock3D').hidden = true;
  $('floatingPlanBar').hidden = true;
  $('presHud').hidden = false;

  threeStudio.resize();
  threeStudio.rebuild(home, { isolateFloorId: null });
  presentation.start(home, roomTarget => {
    $('presRoomName').textContent = roomTarget.name;
    $('presRoomMeta').textContent = `Area: ${roomTarget.areaM2} m² · Dimensions: ${roomTarget.dimensions}`;
  });
};
$('presExit').onclick = () => {
  presentation.stop();
  $('presHud').hidden = true;
  setView('3d');
};
$('presNext').onclick = () => presentation.nextRoom();
$('presPrev').onclick = () => presentation.prevRoom();
$('presPlayToggle').onclick = () => {
  const isPlaying = presentation.toggleAutoPlay();
  $('presPlayToggle').textContent = isPlaying ? '⏸ Pause Tour' : '▶ Play Tour';
};

// ---------------- Sidebar Tabs & Panels ----------------
document.querySelectorAll('.sb-category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sb-category-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    activeSidebarCategory = btn.dataset.cat;

    $('panelRooms').hidden = activeSidebarCategory !== 'rooms';
    $('panelFurniture').hidden = activeSidebarCategory !== 'furniture';
    $('panelDesign').hidden = activeSidebarCategory !== 'design';
    $('panelSmart').hidden = activeSidebarCategory !== 'smart';

    if (activeSidebarCategory === 'furniture') {
      renderFurniturePanel();
    } else if (activeSidebarCategory === 'design') {
      renderDesignStylesPanel();
    } else if (activeSidebarCategory === 'smart') {
      renderSmartToolsPanel();
    }
  });
});

// Sidebar Collapsible Toggles
$('btnToggleLeftSidebar').onclick = () => {
  document.body.classList.toggle('left-collapsed');
  const isCollapsed = document.body.classList.contains('left-collapsed');
  $('btnToggleLeftSidebar').textContent = isCollapsed ? '▶' : '◀';
  setTimeout(() => {
    if (view === '2d') fit2D();
    else if (view === '3d') threeStudio?.resize();
  }, 240);
};

$('btnToggleRightSidebar').onclick = () => {
  document.body.classList.toggle('right-collapsed');
  const isCollapsed = document.body.classList.contains('right-collapsed');
  $('btnToggleRightSidebar').textContent = isCollapsed ? '◀' : '▶';
  setTimeout(() => {
    if (view === '2d') fit2D();
    else if (view === '3d') threeStudio?.resize();
  }, 240);
};

// Category A: Rooms & Walls
function setTool(t) {
  tool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  planCanvas.style.cursor = t === 'room' ? 'crosshair' : 'default';
}

function renderSidebarRoomList() {
  const activeRooms = home.rooms.filter(r => r.floorId === home.currentFloorId);
  $('roomList').innerHTML = activeRooms.map(r =>
    `<button class="room-item ${sel?.id === r.id ? 'on' : ''}" data-room="${r.id}">
      <span class="room-item-title">${esc(r.name)}</span>
      <span class="room-item-meta">${(r.w / 100).toFixed(1)}×${(r.h / 100).toFixed(1)} m · ${(r.w * r.h / 10000).toFixed(1)} m²</span>
    </button>`
  ).join('') || '<div class="section-hint">No rooms on this floor yet. Choose "Draw Room" above.</div>';
}

$('tplShowcase').onclick = () => loadHome(templateExhibitionShowcase());
$('tpl2bhk').onclick = () => loadHome(template2bhk());
$('newBlank').onclick = () => loadHome(blankHome());

// Category B: Furniture Library
function renderFurniturePanel() {
  $('furnCatTabs').innerHTML = FURN_CATEGORIES.map(cat =>
    `<button class="furn-pill ${cat.id === currentFurnCategory ? 'active' : ''}" data-cat="${cat.id}">${cat.label}</button>`
  ).join('');

  filterAndRenderFurniture();
}

function filterAndRenderFurniture() {
  const query = furnSearchQuery.trim().toLowerCase();
  const filtered = Object.entries(FURN).filter(([k, v]) => {
    const matchesCat = v.category === currentFurnCategory;
    const matchesQuery = !query || v.label.toLowerCase().includes(query) || k.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  $('furnList').innerHTML = filtered.map(([k, v]) => `
    <button class="furn-card" data-add="${k}" draggable="true">
      <span class="title">${v.label}</span>
      <span class="dim">${v.w}×${v.d} cm</span>
      <span class="price">₹${(v.price || 15000).toLocaleString('en-IN')}</span>
    </button>
  `).join('');
}

$('furnSearch').addEventListener('input', e => {
  furnSearchQuery = e.target.value;
  filterAndRenderFurniture();
});

function addFurn(type) {
  const before = JSON.stringify(home);
  const activeRooms = home.rooms.filter(r => r.floorId === home.currentFloorId);
  const r = (sel?.kind === 'room' && selItem()) || activeRooms[activeRooms.length - 1];

  const fx = snap(r ? r.x + r.w / 2 : 120);
  const fy = snap(r ? r.y + r.h / 2 : 120);

  const f = makeFurn(type, fx, fy, 0, home.currentFloorId);
  home.furn.push(f);
  sel = { kind: 'furn', id: f.id };
  record(before);
  commit();
}

// Category C: Design & Materials
function renderDesignStylesPanel() {
  const styles = makeoverEngine.getStyles();
  const targetRoom = (sel?.kind === 'room' && selItem()) || home.rooms[0];

  $('designStylesGrid').innerHTML = styles.map(s => `
    <div class="style-card" data-style="${s.id}">
      <span class="badge">${s.badge}</span>
      <h4>${s.name}</h4>
      <div class="palette-dots">
        ${s.palette.map(hex => `<span class="palette-dot" style="background:${hex};"></span>`).join('')}
      </div>
    </div>
  `).join('');

  $('designStylesGrid').querySelectorAll('.style-card').forEach(card => {
    card.addEventListener('click', () => {
      const styleId = card.dataset.style;
      const res = makeoverEngine.generateMakeover(targetRoom, styleId, home);
      if (res) {
        const before = JSON.stringify(home);
        makeoverEngine.applyMakeover(res, home);
        record(before);
        commit();
        setStatus(`Applied ${res.style.name} Style`);
      }
    });
  });
}

$('btnViewMoodboard').onclick = () => {
  const targetRoom = (sel?.kind === 'room' && selItem()) || home.rooms[0];
  if (!targetRoom) return alert('Please create or select a room first.');
  const mb = moodboardGen.generateMoodboard(targetRoom, home);

  modalContainer.hidden = false;
  modalContainer.className = 'modal-backdrop';
  modalContainer.innerHTML = `
    <div class="modal-window">
      <div class="modal-header">
        <h3>${esc(mb.roomName)} — ${mb.themeName} Moodboard</h3>
        <button id="modalClose">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:12px; color:var(--text-secondary); font-style:italic; margin-bottom:14px;">"${mb.themeTagline}"</p>
        
        <h4 style="margin-bottom:6px;">Color Palette</h4>
        <div style="display:flex; gap:6px; margin-bottom:16px;">
          ${mb.palette.map(p => `
            <div style="flex:1; text-align:center;">
              <div style="height:34px; border-radius:6px; background:${p.hex}; border:1px solid #ddd;"></div>
              <div style="font-size:10px; font-weight:600; margin-top:3px;">${p.hex.toUpperCase()}</div>
              <div style="font-size:9px; color:var(--text-muted);">${p.label}</div>
            </div>
          `).join('')}
        </div>

        <div class="row-2" style="margin-bottom:14px;">
          <div style="background:var(--bg-subtle); padding:10px; border-radius:8px;">
            <b>Floor Surface:</b> ${mb.floorMaterial.label}
          </div>
          <div style="background:var(--bg-subtle); padding:10px; border-radius:8px;">
            <b>Wall Finish:</b> ${mb.wallMaterial.label}
          </div>
        </div>

        <h4>Curated Pieces (${mb.furnitureList.length})</h4>
        <div style="max-height:140px; overflow-y:auto; border:1px solid var(--border-subtle); border-radius:6px; background:#fff; margin-bottom:14px;">
          ${mb.furnitureList.map(f => `
            <div style="display:flex; justify-content:space-between; padding:5px 8px; border-bottom:1px solid var(--border-subtle); font-size:11.5px;">
              <span>${f.label}</span>
              <span style="color:var(--text-muted);">${f.dimensions}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button id="btnDlMoodboard" class="btn-primary">Download Moodboard (PNG)</button>
        <button id="btnCloseMb">Close</button>
      </div>
    </div>
  `;

  $('modalClose').onclick = () => { modalContainer.hidden = true; };
  $('btnCloseMb').onclick = () => { modalContainer.hidden = true; };
  $('btnDlMoodboard').onclick = () => {
    const png = moodboardGen.exportMoodboardCanvas(mb);
    const a = document.createElement('a');
    a.download = `${targetRoom.name}_Moodboard.png`;
    a.href = png;
    a.click();
  };
};

// Category D: Smart Tools
function renderSmartToolsPanel() {
  const targetRoom = (sel?.kind === 'room' && selItem()) || home.rooms[0];
  if (!targetRoom) {
    $('smartToolsContainer').innerHTML = '<div class="section-hint">Select a room to evaluate layout and quality.</div>';
    return;
  }

  const layouts = layoutEngine.generateLayouts(targetRoom, home.furn);
  const audit = analyzer.analyze(home, targetRoom.id);

  $('smartToolsContainer').innerHTML = `
    <div style="background:var(--bg-subtle); padding:10px; border-radius:8px; margin-bottom:12px;">
      <div class="section-title">Selected Room:</div>
      <h3 style="margin:2px 0; font-size:14px;">${esc(targetRoom.name)}</h3>
      <div style="font-size:11px; color:var(--text-muted);">
        ${(targetRoom.w * targetRoom.h / 10000).toFixed(1)} m² · Design Score: <b>${audit.overallScore}/100</b> (${audit.rating})
      </div>
    </div>

    <div class="section-title">Smart Furniture Arrangements</div>
    <div style="display:flex; flex-direction:column; gap:8px; margin:6px 0 14px;">
      ${layouts.map((l, idx) => `
        <div class="style-card" style="padding:8px 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
            <span class="badge">${l.badge}</span>
            <b style="color:var(--accent-wood); font-size:11.5px;">Efficiency: ${l.score}/100</b>
          </div>
          <div style="font-weight:600; font-size:12px;">${l.title}</div>
          <div style="font-size:11px; color:var(--text-muted); margin:2px 0 6px;">${l.rationale.slice(0, 90)}...</div>
          <button class="btn-primary btn-apply-smart-layout" data-idx="${idx}" style="font-size:11px; padding:3px 8px; width:100%;">Apply Arrangement</button>
        </div>
      `).join('')}
    </div>

    <div class="section-title">Quality &amp; Clearance Checks</div>
    <div style="margin:6px 0 12px;">
      ${audit.categories.map(c => `
        <div class="score-bar-group">
          <div class="score-bar-label">
            <span>${c.name}</span>
            <b>${c.score}/100</b>
          </div>
          <div class="score-track">
            <div class="score-fill" style="width:${c.score}%; background:${c.score >= 80 ? 'var(--accent-sage)' : c.score >= 60 ? 'var(--accent-gold)' : 'var(--accent-red)'};"></div>
          </div>
        </div>
      `).join('')}
    </div>

    ${audit.warnings.length > 0 ? `
      <div class="section-title">Detected Issues (${audit.warnings.length})</div>
      <div style="margin-top:6px;">
        ${audit.warnings.map(w => `<div class="warning-pill ${w.severity}">${w.message}</div>`).join('')}
      </div>
    ` : '<div class="warning-pill tip">✓ Clear corridors and zero collisions detected!</div>'}
  `;

  $('smartToolsContainer').querySelectorAll('.btn-apply-smart-layout').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx, 10);
      const chosen = layouts[idx];
      const before = JSON.stringify(home);
      const itemMap = new Map(chosen.items.map(it => [it.id, it]));
      home.furn.forEach(f => {
        if (itemMap.has(f.id)) Object.assign(f, itemMap.get(f.id));
      });
      record(before);
      commit();
      setStatus(`Applied ${chosen.title}`);
    });
  });
}

// ---------------- Contextual Right Properties Inspector ----------------
function renderContextualProperties() {
  const it = selItem();

  if (it) {
    if (sel.kind === 'room') {
      panelTitle.textContent = 'Room Settings';
      const floorMat = FLOOR_MATERIALS[it.floorMaterial] || FLOOR_MATERIALS.oakWood;
      const wallMat = WALL_MATERIALS[it.wallMaterial] || WALL_MATERIALS.whitePaint;

      panel.innerHTML = `
        <label>Room Name<input data-k="name" value="${esc(it.name)}"></label>
        <div class="row-2">
          <label>Width (cm)<input type="number" step="10" min="80" data-k="w" value="${it.w}"></label>
          <label>Length (cm)<input type="number" step="10" min="80" data-k="h" value="${it.h}"></label>
        </div>
        <label>Wall Height (cm)<input type="number" step="10" min="220" data-k="wallH" value="${it.wallH || 280}"></label>
        
        <label>Flooring Material
          <select data-k="floorMaterial">
            ${materialStudio.getFloorMaterials().map(m => `<option value="${m.id}" ${m.id === it.floorMaterial ? 'selected' : ''}>${m.label}</option>`).join('')}
          </select>
        </label>
        <label>Floor Tint Color<input type="color" data-k="floor" value="${it.floor || floorMat.color}"></label>

        <label>Wall Finish
          <select data-k="wallMaterial">
            ${materialStudio.getWallMaterials().map(m => `<option value="${m.id}" ${m.id === it.wallMaterial ? 'selected' : ''}>${m.label}</option>`).join('')}
          </select>
        </label>
        <label>Wall Tint Color<input type="color" data-k="wall" value="${it.wall || wallMat.color}"></label>

        <div style="background:var(--bg-subtle); padding:7px 10px; border-radius:6px; margin:10px 0; font-size:11.5px; font-weight:600;">
          Area: ${(it.w * it.h / 10000).toFixed(2)} m² [${Math.round((it.w * it.h / 10000) * 10.7639)} sq.ft]
        </div>

        <div class="btn-row">
          <button data-act="dup">Duplicate</button>
          <button class="btn-danger" data-act="del">Delete</button>
        </div>
      `;
    } else {
      panelTitle.textContent = 'Furniture Settings';
      panel.innerHTML = `
        <div style="font-weight:700; font-size:13px; margin-bottom:8px;">${esc(it.label || it.type)}</div>
        <div class="row-2">
          <label>Width (cm)<input type="number" step="5" min="10" data-k="w" value="${it.w}"></label>
          <label>Depth (cm)<input type="number" step="5" min="10" data-k="d" value="${it.d}"></label>
        </div>
        <div class="row-2">
          <label>Height (cm)<input type="number" step="5" min="10" data-k="h" value="${it.h}"></label>
          <label>Rotation (°)<input type="number" step="90" data-k="rot" value="${it.rot || 0}"></label>
        </div>
        <label>Color Tint<input type="color" data-k="color" value="${it.color || '#9c7a52'}"></label>
        <label>Price (₹)<input type="number" step="1000" data-k="price" value="${it.price || 15000}"></label>

        <div class="btn-row">
          <button data-act="rot">Rotate 90°</button>
          <button data-act="dup">Duplicate</button>
          <button class="btn-danger" data-act="del">Delete</button>
        </div>
      `;
    }
  } else {
    // When nothing is selected
    if (view === '3d') {
      panelTitle.textContent = '3D Environment';
      const lighting = home.lighting || {};
      panel.innerHTML = `
        <div class="section-title">Solar &amp; Ambient Lighting</div>
        
        <label>Time of Day Preset</label>
        <select id="pnlSelectLighting">
          <option value="afternoon" ${lighting.preset === 'afternoon' ? 'selected' : ''}>Afternoon Daylight (1:30 PM)</option>
          <option value="morning" ${lighting.preset === 'morning' ? 'selected' : ''}>Morning Golden Hour (8:30 AM)</option>
          <option value="sunset" ${lighting.preset === 'sunset' ? 'selected' : ''}>Sunset Dusk (6:15 PM)</option>
          <option value="night" ${lighting.preset === 'night' ? 'selected' : ''}>Night Mode (9:45 PM)</option>
        </select>

        <label>Sunlight Intensity (${(lighting.sunIntensity ?? 2.1).toFixed(1)}x)
          <input type="range" id="pnlSunInt" min="0" max="35" value="${Math.round((lighting.sunIntensity ?? 2.1) * 10)}">
        </label>

        <label>Light Warmth</label>
        <div class="row-3">
          <button class="btn-temp ${lighting.colorTemp === 'warm' ? 'btn-primary' : ''}" data-temp="warm">Warm</button>
          <button class="btn-temp ${lighting.colorTemp === 'neutral' ? 'btn-primary' : ''}" data-temp="neutral">Neutral</button>
          <button class="btn-temp ${lighting.colorTemp === 'cool' ? 'btn-primary' : ''}" data-temp="cool">Cool</button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px;">
          <label style="margin:0;">Soft Shadows</label>
          <input type="checkbox" id="pnlChkShadow" ${lighting.shadows !== false ? 'checked' : ''} style="width:16px; height:16px;">
        </div>
      `;

      $('pnlSelectLighting')?.addEventListener('change', e => {
        lightingSim.setPreset(e.target.value, home);
        $('dockLightingPreset').value = e.target.value;
        commit(false);
      });
      $('pnlSunInt')?.addEventListener('input', e => {
        lightingSim.setParam('sunIntensity', parseInt(e.target.value, 10) / 10, home);
      });
      panel.querySelectorAll('.btn-temp').forEach(b => {
        b.addEventListener('click', () => {
          lightingSim.setParam('colorTemp', b.dataset.temp, home);
          commit(false);
          renderContextualProperties();
        });
      });
      $('pnlChkShadow')?.addEventListener('change', e => {
        lightingSim.setParam('shadows', e.target.checked, home);
      });
    } else {
      panelTitle.textContent = 'Space Overview';
      const activeRooms = home.rooms.filter(r => r.floorId === home.currentFloorId);
      const totalArea = activeRooms.reduce((s, r) => s + (r.w * r.h) / 10000, 0);

      panel.innerHTML = `
        <div style="background:var(--bg-subtle); padding:10px; border-radius:8px; margin-bottom:12px;">
          <div class="section-title">Current Level:</div>
          <h3 style="margin:2px 0 4px; font-size:14px;">${esc(floorManager.getActiveFloor(home).name)}</h3>
          <div style="font-size:11.5px; color:var(--text-secondary);">
            ${activeRooms.length} Rooms · ${totalArea.toFixed(1)} m² [${Math.round(totalArea * 10.7639)} sq.ft]
          </div>
        </div>

        <div class="section-hint">Click any room or furniture item on the plan to inspect dimensions, rotate, change materials, or duplicate.</div>

        <div style="margin-top:14px; display:flex; flex-direction:column; gap:6px;">
          <button id="pnlQuickAddRoom" class="btn-outline">+ Draw Room</button>
        </div>
      `;

      $('pnlQuickAddRoom')?.addEventListener('click', () => setTool('room'));
    }
  }
}

panel.addEventListener('change', e => {
  const k = e.target.dataset.k;
  const it = selItem();
  if (!k || !it) return;

  const before = JSON.stringify(home);
  let v = e.target.value;

  if (e.target.type === 'number') {
    v = parseFloat(v);
    if (!Number.isFinite(v)) return;
    if (['w', 'h', 'd'].includes(k)) v = Math.max(10, v);
    if (k === 'rot') v = ((v % 360) + 360) % 360;
  }

  it[k] = v;
  record(before);
  commit();
});

panel.addEventListener('click', e => {
  const a = e.target.dataset.act;
  if (a === 'dup') duplicateSel();
  else if (a === 'del') removeSel();
  else if (a === 'rot') rotateSel();
});

function duplicateSel() {
  const it = selItem();
  if (!it) return;
  const before = JSON.stringify(home);
  if (sel.kind === 'room') {
    const c = { ...it, id: Math.random().toString(36).slice(2, 9), name: it.name + ' Copy', x: it.x + it.w + 30 };
    home.rooms.push(c);
    sel = { kind: 'room', id: c.id };
  } else {
    const c = { ...it, id: Math.random().toString(36).slice(2, 9), x: it.x + 30, y: it.y + 30 };
    home.furn.push(c);
    sel = { kind: 'furn', id: c.id };
  }
  record(before);
  commit();
}

function removeSel() {
  const it = selItem();
  if (!it) return;
  const before = JSON.stringify(home);
  if (sel.kind === 'room') {
    home.furn = home.furn.filter(f => !inRect(it, f));
    home.rooms = home.rooms.filter(r => r.id !== it.id);
  } else {
    home.furn = home.furn.filter(f => f.id !== it.id);
  }
  sel = null;
  record(before);
  commit();
}

function rotateSel() {
  const it = selItem();
  if (!it || sel.kind !== 'furn') return;
  const before = JSON.stringify(home);
  it.rot = ((it.rot || 0) + 90) % 360;
  record(before);
  commit();
}

// ---------------- Footer Badges ----------------
function updateFooterBadges() {
  const audit = analyzer.analyze(home);
  const budget = budgetPlanner.calculateBudget(home);
  $('footerScoreBadge').textContent = `Score: ${audit.overallScore}/100`;
  if (budget) {
    $('footerBudgetBadge').textContent = `Est. ₹${budget.totalEstimatedBudget.toLocaleString('en-IN')}`;
  }
}

// ---------------- Secondary Project Details Modal ----------------
$('btnSaveDetails').onclick = () => openProjectDetailsModal();
$('btnFooterDetails').onclick = () => openProjectDetailsModal();

function openProjectDetailsModal() {
  modalContainer.hidden = false;
  modalContainer.className = 'modal-backdrop';

  let currentTab = 'budget';
  const renderModal = () => {
    const budget = budgetPlanner.calculateBudget(home);
    const variations = home.variations || [];
    const floors = floorManager.getFloors(home);

    modalContainer.innerHTML = `
      <div class="modal-window">
        <div class="modal-header">
          <h3>Project Details &amp; Administration</h3>
          <button id="modalClose">✕</button>
        </div>
        <div class="modal-tabs">
          <button class="modal-tab-btn ${currentTab === 'budget' ? 'on' : ''}" data-mtab="budget">💰 Interior Budget</button>
          <button class="modal-tab-btn ${currentTab === 'variations' ? 'on' : ''}" data-mtab="variations">📁 Portfolio &amp; Variations</button>
          <button class="modal-tab-btn ${currentTab === 'floors' ? 'on' : ''}" data-mtab="floors">🏢 Building Levels (${floors.length})</button>
        </div>
        <div class="modal-body">
          ${currentTab === 'budget' ? `
            <div style="background:var(--bg-subtle); padding:12px; border-radius:8px; margin-bottom:14px; text-align:center;">
              <div class="section-title">Estimated Interior Cost</div>
              <h2 style="font-size:22px; font-weight:700; color:var(--text-primary); margin:3px 0;">₹${budget.totalEstimatedBudget.toLocaleString('en-IN')}</h2>
              <div style="font-size:11.5px; color:var(--text-muted);">
                ₹${budget.costPerM2.toLocaleString('en-IN')} / m² · ₹${budget.costPerSqFt.toLocaleString('en-IN')} / sq.ft (${budget.totalFloorAreaM2.toFixed(1)} m² built-up)
              </div>
            </div>

            <div class="section-title">Category Breakdown</div>
            <div style="margin:8px 0 16px;">
              ${budget.categories.map(c => `
                <div class="score-bar-group">
                  <div class="score-bar-label">
                    <span>${c.name}</span>
                    <b>₹${c.amount.toLocaleString('en-IN')} (${c.pct}%)</b>
                  </div>
                  <div class="score-track">
                    <div class="score-fill" style="width:${c.pct}%; background:${c.color};"></div>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="section-title">Itemized Furniture (${budget.itemizedFurn.length})</div>
            <div style="max-height:160px; overflow-y:auto; border:1px solid var(--border-subtle); border-radius:6px; background:#fff; margin-top:6px;">
              <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                <tbody>
                  ${budget.itemizedFurn.map(f => `
                    <tr style="border-bottom:1px solid var(--border-subtle);">
                      <td style="padding:6px 8px;">${f.label} (×${f.count})</td>
                      <td style="padding:6px 8px; text-align:right; font-weight:600;">₹${f.total.toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : currentTab === 'variations' ? `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div class="section-hint">Save design versions and restore anytime:</div>
              <button id="btnSaveVarNow" class="btn-primary" style="font-size:11px;">+ Save Current</button>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px;">
              ${variations.length === 0 ? '<div class="section-hint">No variations saved yet.</div>' : variations.map(v => `
                <div style="background:#fff; border:1px solid var(--border-subtle); border-radius:6px; padding:9px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <b>${esc(v.name)}</b>
                    <div style="font-size:10.5px; color:var(--text-muted);">${v.timestamp || ''} · ${v.roomsCount || 0} rooms</div>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button class="btn-primary btn-modal-restore-var" data-vid="${v.id}" style="font-size:11px;">Restore</button>
                    <button class="btn-danger btn-modal-del-var" data-vid="${v.id}" style="font-size:11px;">Delete</button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="section-hint">Multi-floor levels and architectural elevations:</div>
            <div style="display:flex; flex-direction:column; gap:6px; margin:10px 0;">
              ${floors.map(f => {
                const isCurrent = f.id === home.currentFloorId;
                return `
                  <div style="background:#fff; border:1px solid ${isCurrent ? 'var(--accent-wood)' : 'var(--border-subtle)'}; border-radius:6px; padding:9px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                      <b style="color:${isCurrent ? 'var(--accent-wood)' : 'var(--text-primary)'};">${esc(f.name)}</b>
                      <div style="font-size:10.5px; color:var(--text-muted);">Elevation: ${(f.elevation / 100).toFixed(1)}m · Height: ${(f.height / 100).toFixed(1)}m</div>
                    </div>
                    <div style="display:flex; gap:6px;">
                      <button class="btn-modal-switch-floor ${isCurrent ? 'btn-primary' : ''}" data-fid="${f.id}" style="font-size:11px;">
                        ${isCurrent ? 'Active Level' : 'Switch'}
                      </button>
                      ${floors.length > 1 ? `<button class="btn-danger btn-modal-del-floor" data-fid="${f.id}" style="font-size:11px;">Delete</button>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="btn-row">
              <button id="btnModalAddFloor" class="btn-primary">+ Add New Level</button>
              <button id="btnModalAddStairs">Insert Staircase</button>
            </div>
          `}
        </div>
        <div class="modal-footer">
          <button id="btnCloseDetails">Close</button>
        </div>
      </div>
    `;

    $('modalClose').onclick = () => { modalContainer.hidden = true; };
    $('btnCloseDetails').onclick = () => { modalContainer.hidden = true; };

    modalContainer.querySelectorAll('.modal-tab-btn').forEach(tb => {
      tb.addEventListener('click', () => {
        currentTab = tb.dataset.mtab;
        renderModal();
      });
    });

    $('btnSaveVarNow')?.addEventListener('click', () => {
      const name = prompt('Name this design variation:', `Concept ${String.fromCharCode(65 + variations.length)}`);
      if (name) {
        comparator.saveVariation(home, name);
        commit(false);
        renderModal();
      }
    });

    modalContainer.querySelectorAll('.btn-modal-restore-var').forEach(b => {
      b.addEventListener('click', () => {
        comparator.restoreVariation(home, b.dataset.vid);
        commit();
        modalContainer.hidden = true;
      });
    });
    modalContainer.querySelectorAll('.btn-modal-del-var').forEach(b => {
      b.addEventListener('click', () => {
        comparator.deleteVariation(home, b.dataset.vid);
        commit(false);
        renderModal();
      });
    });

    modalContainer.querySelectorAll('.btn-modal-switch-floor').forEach(b => {
      b.addEventListener('click', () => {
        floorManager.setActiveFloor(home, b.dataset.fid);
        commit();
        fit2D();
        renderModal();
      });
    });
    modalContainer.querySelectorAll('.btn-modal-del-floor').forEach(b => {
      b.addEventListener('click', () => {
        if (confirm('Delete this level?')) {
          floorManager.removeFloor(home, b.dataset.fid);
          commit();
          fit2D();
          renderModal();
        }
      });
    });
    $('btnModalAddFloor')?.addEventListener('click', () => {
      floorManager.addFloor(home);
      commit();
      renderModal();
    });
    $('btnModalAddStairs')?.addEventListener('click', () => {
      floorManager.addStaircase(home, 200, 200);
      commit();
      modalContainer.hidden = true;
    });
  };

  renderModal();
}

// ---------------- Clean Export Dialog ----------------
$('btnExport').onclick = () => {
  modalContainer.hidden = false;
  modalContainer.className = 'modal-backdrop';
  modalContainer.innerHTML = `
    <div class="modal-window" style="max-width:480px;">
      <div class="modal-header">
        <h3>Export Project</h3>
        <button id="modalClose">✕</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:8px;">
        <button id="expPng2D" class="btn-subtle">
          <b>📷 Floor Plan Image (PNG)</b>
          <small>Export clean 2D plan drawing</small>
        </button>
        <button id="expPng3D" class="btn-subtle">
          <b>🖼️ High-Res 3D Studio Render (PNG)</b>
          <small>Capture current 3D perspective with realistic shadows</small>
        </button>
        <button id="expCad" class="btn-subtle">
          <b>📐 Architectural Blueprint CAD (PNG)</b>
          <small>Technical drawing with dimension strings and scale indicator</small>
        </button>
        <button id="expJson" class="btn-subtle">
          <b>💾 Project Data (JSON)</b>
          <small>Save full project data to reopen anytime</small>
        </button>
      </div>
      <div class="modal-footer">
        <button id="btnCloseExp">Close</button>
      </div>
    </div>
  `;

  $('modalClose').onclick = () => { modalContainer.hidden = true; };
  $('btnCloseExp').onclick = () => { modalContainer.hidden = true; };

  $('expPng2D').onclick = () => {
    projectManager.exportHighResPNG(planCanvas, `${home.name}-floor-plan.png`, 2);
    modalContainer.hidden = true;
  };
  $('expPng3D').onclick = () => {
    threeStudio.renderer.render(threeStudio.scene, threeStudio.camera);
    projectManager.exportHighResPNG(threeStudio.canvas, `${home.name}-3d-render.png`, 2);
    modalContainer.hidden = true;
  };
  $('expCad').onclick = () => {
    blueprintRenderer.render(home, home.currentFloorId);
    projectManager.exportHighResPNG(blueprintCanvas, `${home.name}-blueprint.png`, 2);
    modalContainer.hidden = true;
  };
  $('expJson').onclick = () => {
    projectManager.exportJSON(home);
    modalContainer.hidden = true;
  };
};

// ---------------- Global Keyboard & Event Wiring ----------------
$('undo').onclick = doUndo;
$('redo').onclick = doRedo;
$('name').addEventListener('change', e => {
  home.name = e.target.value.trim() || 'My home';
  commit(false);
});

window.addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea')) return;
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();

  if (e.code === 'Space') {
    spaceDown = true;
    e.preventDefault();
  }
  if (mod && k === 'z') {
    e.preventDefault();
    if (e.shiftKey) doRedo();
    else doUndo();
  } else if (mod && k === 'y') {
    e.preventDefault();
    doRedo();
  } else if (mod && k === 'd') {
    e.preventDefault();
    duplicateSel();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    removeSel();
  } else if (k === 'r' && !mod) {
    if (sel?.kind === 'furn') rotateSel();
    else setTool('room');
  } else if (k === 'v' && !mod) {
    setTool('select');
  } else if (k === 'd' && !mod && !sel) {
    setTool('door');
  } else if (k === 'w' && !mod && !sel) {
    setTool('window');
  } else if (e.key === 'Escape') {
    if (view === 'walk' || presentation.isActive) {
      setView('3d');
    } else {
      sel = null;
      setTool('select');
      commit();
    }
  }
});

window.addEventListener('keyup', e => {
  if (e.code === 'Space') spaceDown = false;
});

window.addEventListener('resize', () => {
  if (view === '2d') {
    if (planSubView === 'blueprint') blueprintRenderer?.render(home, home.currentFloorId);
    else render2D();
  } else if (view === '3d') {
    threeStudio?.resize();
  }
});

document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;

  if (t.dataset.room) {
    sel = { kind: 'room', id: t.dataset.room };
    commit();
  } else if (t.dataset.add) {
    addFurn(t.dataset.add);
  } else if (t.dataset.tool) {
    setTool(t.dataset.tool);
  } else if (t.dataset.cat) {
    currentFurnCategory = t.dataset.cat;
    renderFurniturePanel();
  }
});

// ---------------- Initialize Application ----------------
initModules();
renderFurniturePanel();
renderDesignStylesPanel();
setTool('select');
setView('2d');
commit();
fit2D();

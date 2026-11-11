import { GRID, M, FURN, FURN_CATEGORIES, FLOOR_MATERIALS, WALL_MATERIALS } from './core/constants.js';
import {
  snap, clamp, esc, inRect, furnHit, getFurnAABB
} from './core/geometry.js';
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
import { WebXRPreviewManager } from './modules/xr.js';
import { ProjectManager } from './modules/projects.js';

// DOM Elements
const $ = id => document.getElementById(id);
const planCanvas = $('plan'), planCtx = planCanvas.getContext('2d');
const threeCanvas = $('three');
const blueprintCanvas = $('blueprint');
const panel = $('panel');
const panelTitle = $('panelTitle');
const modalContainer = $('modalContainer');

// State Variables
let home = loadHomeFromStorage();
let sel = null; // { kind: 'room' | 'furn', id }
let tool = 'select'; // 'select' | 'room' | 'door' | 'window'
let view = '2d'; // '2d' | '3d' | 'blueprint' | 'walk' | 'presentation'
let activeStudioTool = null; // null | 'makeover' | 'layout' | 'lighting' | 'materials' | 'floors' | 'budget' | 'analyzer' | 'moodboard' | 'compare'
let currentFurnCategory = 'living';

let spaceDown = false;
let drag = null, pending = null;
const undoStack = [], redoStack = [];
const cam = { zoom: 0.5, x: 60, y: 60 };

// Subsystem Instances
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
let xrManager = null;
let projectManager = null;

// Initialize System Modules
function initModules() {
  threeStudio = new ThreeStudio(threeCanvas);
  walkthrough = new WalkthroughController(threeStudio);
  walkthrough.minimapCanvas = $('walkMinimap');

  presentation = new PresentationController(threeStudio);
  explodedController = new ExplodedViewController(threeStudio);
  blueprintRenderer = new BlueprintRenderer(blueprintCanvas);

  lightingSim = new LightingSimulator(threeStudio, (newLighting) => {
    commit(false);
  });

  materialStudio = new MaterialStudio(() => {
    commit();
  });

  floorManager = new FloorManager(() => {
    updateFloorSelector();
    commit();
  });

  makeoverEngine = new MakeoverEngine(null);
  layoutEngine = new LayoutEngine();
  budgetPlanner = new BudgetPlanner();
  analyzer = new DesignAnalyzer();
  moodboardGen = new MoodboardGenerator();
  comparator = new DesignComparator();
  xrManager = new WebXRPreviewManager(threeStudio);
  projectManager = new ProjectManager((newHome) => {
    loadHome(newHome);
  });
}

// ---------------- Helpers & State Management ----------------
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
  $('status').textContent = text;
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

  // Persist debounced
  projectManager.scheduleAutoSave(home, setStatus);

  // Update Footer Metrics
  updateFooterMetrics();

  // Re-render Views
  if (view === '2d') {
    render2D();
  } else if (view === '3d') {
    if (rebuild3dScene) {
      threeStudio.rebuild(home, { isolateFloorId: floorManager.isolatedFloorId });
    }
  } else if (view === 'blueprint') {
    blueprintRenderer.render(home, home.currentFloorId);
  }

  // Update Panel & Lists
  renderSidebarRoomList();
  if (activeStudioTool) {
    renderStudioPanel(activeStudioTool);
  } else {
    renderPropertiesPanel();
  }
}

function doUndo() {
  if (undoStack.length) {
    redoStack.push(JSON.stringify(home));
    home = JSON.parse(undoStack.pop());
    commit();
    updateFloorSelector();
    $('name').value = home.name;
    setStatus('Undo performed');
  }
}

function doRedo() {
  if (redoStack.length) {
    undoStack.push(JSON.stringify(home));
    home = JSON.parse(redoStack.pop());
    commit();
    updateFloorSelector();
    $('name').value = home.name;
    setStatus('Redo performed');
  }
}

function loadHome(newHome) {
  const before = JSON.stringify(home);
  home = newHome;
  sel = null;
  activeStudioTool = null;
  undoStack.length = 0;
  redoStack.length = 0;
  $('name').value = home.name || 'My home';
  updateFloorSelector();
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
  planCtx.fillStyle = '#fcfbf8';
  planCtx.fillRect(0, 0, W, H);

  const z = cam.zoom;
  planCtx.save();
  planCtx.translate(cam.x, cam.y);
  planCtx.scale(z, z);

  const x0 = -cam.x / z, y0 = -cam.y / z;
  const x1 = x0 + W / z, y1 = y0 + H / z;

  // Background Grid (100cm / 1m major, 50cm minor)
  planCtx.beginPath();
  planCtx.strokeStyle = '#ebe5d8';
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

  // Active Floor items
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
      // Architectural Door
      planCtx.strokeStyle = '#8a6d4b';
      planCtx.lineWidth = 2 / z;
      planCtx.strokeRect(-f.w / 2, -4, f.w, 8);
      // Swing arc
      planCtx.setLineDash([4 / z, 4 / z]);
      planCtx.beginPath();
      planCtx.arc(-f.w / 2, 0, f.w, 0, Math.PI / 2);
      planCtx.stroke();
      planCtx.setLineDash([]);
    } else if (f.type === 'window') {
      // Architectural Window
      planCtx.fillStyle = '#bde0fe';
      planCtx.strokeStyle = '#2a5a8a';
      planCtx.lineWidth = 2 / z;
      planCtx.fillRect(-f.w / 2, -6, f.w, 12);
      planCtx.strokeRect(-f.w / 2, -6, f.w, 12);
    } else if (f.type === 'stairs') {
      // Staircase steps
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
      // Standard Furniture Box with drop shadow and outline
      planCtx.fillStyle = f.color || '#9c7a52';
      planCtx.strokeStyle = '#524332';
      planCtx.lineWidth = 1.5 / z;
      planCtx.fillRect(-f.w / 2, -f.d / 2, f.w, f.d);
      planCtx.strokeRect(-f.w / 2, -f.d / 2, f.w, f.d);

      // Label inside furniture if zoomed in enough
      if (z > 0.35 && f.w > 40) {
        planCtx.fillStyle = '#ffffff';
        planCtx.textAlign = 'center';
        planCtx.textBaseline = 'middle';
        planCtx.font = `600 ${Math.max(9, Math.min(13, 11 / z))}px system-ui, sans-serif`;
        planCtx.fillText(f.label || f.type, 0, 0);
      }
    }
    planCtx.restore();
  }

  // 3. Draw Room Walls & Room Area Labels
  for (const r of activeRooms) {
    planCtx.strokeStyle = r.wall || '#f5f1ea';
    planCtx.lineWidth = 14;
    planCtx.strokeRect(r.x, r.y, r.w, r.h);

    // Inner line definition
    planCtx.strokeStyle = '#cfc5b4';
    planCtx.lineWidth = 1 / z;
    planCtx.strokeRect(r.x, r.y, r.w, r.h);

    // Room Label
    planCtx.fillStyle = '#2b2823';
    planCtx.textAlign = 'center';
    planCtx.font = `700 ${15 / z}px ui-serif, Georgia, serif`;
    planCtx.fillText(r.name, r.x + r.w / 2, r.y + r.h / 2 - 5 / z);

    planCtx.font = `500 ${12 / z}px system-ui, sans-serif`;
    planCtx.fillStyle = '#7a7265';
    planCtx.fillText(
      `${(r.w / 100).toFixed(2)} × ${(r.h / 100).toFixed(2)} m · ${(r.w * r.h / 10000).toFixed(1)} m²`,
      r.x + r.w / 2,
      r.y + r.h / 2 + 13 / z
    );
  }

  // 4. Draw Selected Item Highlight Ring
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

  // 5. Draw in-progress room creation rectangle
  if (drag?.kind === 'draw') {
    const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
    planCtx.strokeStyle = '#8a6d4b';
    planCtx.setLineDash([6 / z, 4 / z]);
    planCtx.lineWidth = 2 / z;
    planCtx.strokeRect(x, y, w, h);
    planCtx.setLineDash([]);
    planCtx.fillStyle = '#2b2823';
    planCtx.textAlign = 'center';
    planCtx.font = `600 ${12 / z}px system-ui, sans-serif`;
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

  // Check Furniture Hit on active floor
  const activeFurn = home.furn.filter(f => f.floorId === home.currentFloorId);
  const f = [...activeFurn].reverse().find(f => furnHit(f, p));

  if (f) {
    sel = { kind: 'furn', id: f.id };
    drag = { kind: 'furn', id: f.id, ox: p.x - f.x, oy: p.y - f.y };
  } else {
    // Check Room Hit on active floor
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

  activeStudioTool = null; // restore properties panel on click
  render2D();
  renderPropertiesPanel();
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
  cam.zoom = clamp(cam.zoom * (e.deltaY < 0 ? 1.12 : 0.88), 0.1, 3.5);
  cam.x = sx - before.x * cam.zoom;
  cam.y = sy - before.y * cam.zoom;
  render2D();
}, { passive: false });

// ---------------- Multi-Floor Selector UI ----------------
function updateFloorSelector() {
  const select = $('activeFloorSelect');
  select.innerHTML = (home.floors || []).map(f =>
    `<option value="${f.id}" ${f.id === home.currentFloorId ? 'selected' : ''}>${esc(f.name)}</option>`
  ).join('');

  const activeFloor = home.floors.find(f => f.id === home.currentFloorId) || home.floors[0];
  $('floorBadge').textContent = activeFloor ? activeFloor.name : 'Ground Floor';
}

$('activeFloorSelect').addEventListener('change', e => {
  floorManager.setActiveFloor(home, e.target.value);
  $('floorBadge').textContent = floorManager.getActiveFloor(home).name;
  sel = null;
  commit();
  fit2D();
});

$('quickAddFloor').onclick = () => {
  floorManager.addFloor(home);
  updateFloorSelector();
  commit();
};

// ---------------- View Mode Switcher ----------------
function setView(newView) {
  view = newView;

  // Toggle active segment buttons
  $('mode2').classList.toggle('on', view === '2d');
  $('mode3').classList.toggle('on', view === '3d');
  $('modeBlueprint').classList.toggle('on', view === 'blueprint');
  $('modeWalk').classList.toggle('on', view === 'walk');
  $('modePres').classList.toggle('on', view === 'presentation');

  // Toggle canvases
  planCanvas.hidden = view !== '2d';
  threeCanvas.hidden = view === '2d' || view === 'blueprint';
  blueprintCanvas.hidden = view !== 'blueprint';

  // Toggle overlays
  $('walkHud').hidden = view !== 'walk';
  $('presHud').hidden = view !== 'presentation';
  $('explodedOverlay').hidden = true;

  if (view === '2d') {
    if (walkthrough.isActive) walkthrough.stop();
    if (presentation.isActive) presentation.stop();
    fit2D();
  } else if (view === '3d') {
    if (walkthrough.isActive) walkthrough.stop();
    if (presentation.isActive) presentation.stop();
    threeStudio.resize();
    threeStudio.rebuild(home, { isolateFloorId: floorManager.isolatedFloorId });
    threeStudio.frameScene(home);
  } else if (view === 'blueprint') {
    if (walkthrough.isActive) walkthrough.stop();
    if (presentation.isActive) presentation.stop();
    blueprintRenderer.render(home, home.currentFloorId);
  } else if (view === 'walk') {
    if (presentation.isActive) presentation.stop();
    threeStudio.resize();
    threeStudio.rebuild(home, { isolateFloorId: home.currentFloorId });
    walkthrough.start(home, () => setView('3d'));
    $('walkCurrentRoom').textContent = walkthrough.getCurrentRoomName();
  } else if (view === 'presentation') {
    if (walkthrough.isActive) walkthrough.stop();
    threeStudio.resize();
    threeStudio.rebuild(home, { isolateFloorId: null });
    presentation.start(home, (roomTarget) => {
      $('presRoomName').textContent = roomTarget.name;
      $('presRoomMeta').textContent = `Area: ${roomTarget.areaM2} m² · Dimensions: ${roomTarget.dimensions}`;
    });
  }
}

$('mode2').onclick = () => setView('2d');
$('mode3').onclick = () => setView('3d');
$('modeBlueprint').onclick = () => setView('blueprint');
$('modeWalk').onclick = () => setView('walk');
$('modePres').onclick = () => setView('presentation');

// Walkthrough HUD Actions
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

// Presentation HUD Actions
$('presExit').onclick = () => setView('3d');
$('presNext').onclick = () => presentation.nextRoom();
$('presPrev').onclick = () => presentation.prevRoom();
$('presPlayToggle').onclick = () => {
  const isPlaying = presentation.toggleAutoPlay();
  $('presPlayToggle').textContent = isPlaying ? '⏸ Pause Tour' : '▶ Play Tour';
};

// Exploded View Slider Actions
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

// ---------------- Drafting Tools & Furniture Palette ----------------
function setTool(t) {
  tool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  planCanvas.style.cursor = t === 'room' ? 'crosshair' : 'default';
}

function renderFurnCategoryTabs() {
  $('furnCatTabs').innerHTML = FURN_CATEGORIES.map(cat =>
    `<button class="furn-cat-tab ${cat.id === currentFurnCategory ? 'active' : ''}" data-cat="${cat.id}">${cat.label}</button>`
  ).join('');
}

function renderFurnGrid() {
  const filtered = Object.entries(FURN).filter(([k, v]) => v.category === currentFurnCategory);
  $('furnList').innerHTML = filtered.map(([k, v]) => `
    <button class="furn-card" data-add="${k}">
      <span class="title">${v.label}</span>
      <span class="dim">${v.w}×${v.d} cm</span>
      <span class="price">₹${(v.price || 15000).toLocaleString('en-IN')}</span>
    </button>
  `).join('');
}

function renderSidebarRoomList() {
  const activeRooms = home.rooms.filter(r => r.floorId === home.currentFloorId);
  $('roomList').innerHTML = activeRooms.map(r =>
    `<button class="item ${sel?.id === r.id ? 'on' : ''}" data-room="${r.id}">
      <span><b>${esc(r.name)}</b></span>
      <small>${(r.w / 100).toFixed(1)}×${(r.h / 100).toFixed(1)} m · ${(r.w * r.h / 10000).toFixed(1)} m²</small>
    </button>`
  ).join('') || '<p class="empty">No rooms on this floor yet. Click "Draw Room" or load a template.</p>';
}

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

// ---------------- Contextual Properties Inspector ----------------
function renderPropertiesPanel() {
  panelTitle.textContent = 'Properties';
  const it = selItem();
  if (!it) {
    panel.innerHTML = `
      <h3>Nothing Selected</h3>
      <p class="empty" style="margin-top:8px;">Click a room or furniture piece on the floor plan to inspect and modify dimensions, colors, or materials.</p>
      <div style="margin-top:20px; display:flex; flex-direction:column; gap:8px;">
        <button id="pnlOpenMakeover" class="btn-studio">✨ Launch Smart Makeover</button>
        <button id="pnlOpenLayout" class="btn-studio">📐 Optimize Furniture Layout</button>
        <button id="pnlOpenQuality" class="btn-studio">📊 Check Design Quality Score</button>
      </div>
    `;

    $('pnlOpenMakeover')?.addEventListener('click', () => openStudioTool('makeover'));
    $('pnlOpenLayout')?.addEventListener('click', () => openStudioTool('layout'));
    $('pnlOpenQuality')?.addEventListener('click', () => openStudioTool('analyzer'));
    return;
  }

  if (sel.kind === 'room') {
    const floorMat = FLOOR_MATERIALS[it.floorMaterial] || FLOOR_MATERIALS.oakWood;
    const wallMat = WALL_MATERIALS[it.wallMaterial] || WALL_MATERIALS.whitePaint;

    panel.innerHTML = `
      <label>Room Name<input data-k="name" value="${esc(it.name)}"></label>
      <div class="row2">
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

      <label>Wall Material
        <select data-k="wallMaterial">
          ${materialStudio.getWallMaterials().map(m => `<option value="${m.id}" ${m.id === it.wallMaterial ? 'selected' : ''}>${m.label}</option>`).join('')}
        </select>
      </label>
      <label>Wall Tint Color<input type="color" data-k="wall" value="${it.wall || wallMat.color}"></label>

      <div style="background:#f5efe6; padding:10px; border-radius:8px; margin:14px 0;">
        <span style="font-weight:600; font-size:12px;">Area: ${(it.w * it.h / 10000).toFixed(2)} m² [${Math.round((it.w * it.h / 10000) * 10.7639)} sq.ft]</span>
      </div>

      <div class="btns">
        <button id="pnlRoomMakeover" class="primary" style="flex:1;">✨ Makeover This Room</button>
        <button data-act="dup">Duplicate</button>
        <button class="danger" data-act="del">Delete</button>
      </div>
    `;

    $('pnlRoomMakeover')?.addEventListener('click', () => openStudioTool('makeover'));
  } else {
    panel.innerHTML = `
      <h3>${esc(it.label || it.type)}</h3>
      <div class="row2">
        <label>X (cm)<input type="number" step="10" data-k="x" value="${it.x}"></label>
        <label>Y (cm)<input type="number" step="10" data-k="y" value="${it.y}"></label>
      </div>
      <div class="row2">
        <label>Width (cm)<input type="number" step="5" min="10" data-k="w" value="${it.w}"></label>
        <label>Depth (cm)<input type="number" step="5" min="10" data-k="d" value="${it.d}"></label>
      </div>
      <div class="row2">
        <label>Height (cm)<input type="number" step="5" min="10" data-k="h" value="${it.h}"></label>
        <label>Rotation (°)<input type="number" step="90" data-k="rot" value="${it.rot || 0}"></label>
      </div>
      <label>Color Tint<input type="color" data-k="color" value="${it.color || '#9c7a52'}"></label>
      <label>Estimated Price (INR ₹)<input type="number" step="1000" data-k="price" value="${it.price || 15000}"></label>

      <div class="btns">
        <button data-act="rot">Rotate 90°</button>
        <button data-act="dup">Duplicate</button>
        <button class="danger" data-act="del">Delete</button>
      </div>
    `;
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

$('panelClose').onclick = () => {
  activeStudioTool = null;
  document.querySelectorAll('.btn-studio').forEach(b => b.classList.remove('active'));
  renderPropertiesPanel();
};

// ---------------- Studio Tools Panel Orchestration ----------------
function openStudioTool(toolId) {
  activeStudioTool = toolId;
  document.querySelectorAll('.btn-studio').forEach(b => b.classList.remove('active'));

  const btnMap = {
    makeover: $('btnMakeover'),
    layout: $('btnLayout'),
    lighting: $('btnLighting'),
    materials: $('btnMaterials'),
    floors: $('btnFloors'),
    budget: $('btnBudget'),
    analyzer: $('btnAnalyzer'),
    moodboard: $('btnMoodboard'),
    compare: $('btnCompare')
  };
  if (btnMap[toolId]) btnMap[toolId].classList.add('active');

  renderStudioPanel(toolId);
}

function renderStudioPanel(toolId) {
  switch (toolId) {
    case 'makeover':
      renderMakeoverStudio();
      break;
    case 'layout':
      renderLayoutOptimizerStudio();
      break;
    case 'lighting':
      renderLightingSimulator();
      break;
    case 'materials':
      renderMaterialStudio();
      break;
    case 'floors':
      renderFloorStudio();
      break;
    case 'budget':
      renderBudgetStudio();
      break;
    case 'analyzer':
      renderAnalyzerStudio();
      break;
    case 'moodboard':
      renderMoodboardStudio();
      break;
    case 'compare':
      renderComparisonStudio();
      break;
    default:
      renderPropertiesPanel();
      break;
  }
}

// 1. SMART ROOM MAKEOVER
function renderMakeoverStudio() {
  panelTitle.textContent = 'Smart Room Makeover';
  const targetRoom = (sel?.kind === 'room' && selItem()) || home.rooms[0];

  if (!targetRoom) {
    panel.innerHTML = '<p class="empty">Please create or select a room first to apply a makeover.</p>';
    return;
  }

  const styles = makeoverEngine.getStyles();

  panel.innerHTML = `
    <div style="background:#f4eee2; padding:10px; border-radius:8px; margin-bottom:12px;">
      <span style="font-size:11px; font-weight:700; color:var(--wood); text-transform:uppercase;">Selected Target Room:</span>
      <h3 style="margin:2px 0;">${esc(targetRoom.name)}</h3>
      <span style="font-size:11.5px; color:var(--muted);">${(targetRoom.w / 100).toFixed(1)}×${(targetRoom.h / 100).toFixed(1)} m · ${(targetRoom.w * targetRoom.h / 10000).toFixed(1)} m²</span>
    </div>

    <p style="font-size:12px; color:var(--ink-soft); margin-bottom:8px;">Choose an architectural interior style to transform walls, floors, furniture colors, and lighting with one click:</p>

    <div class="style-grid">
      ${styles.map(s => `
        <div class="style-card" data-style="${s.id}">
          <span class="badge">${s.badge}</span>
          <h4>${s.name}</h4>
          <div class="palette-dots">
            ${s.palette.map(hex => `<span class="palette-dot" style="background:${hex};"></span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <div id="makeoverActionContainer" style="margin-top:16px;" hidden>
      <div style="background:#fff; border:1px solid var(--line); border-radius:8px; padding:12px; margin-bottom:10px;">
        <h4 id="previewStyleName" style="margin:0 0 4px; font-size:13px; color:var(--ink);">Style</h4>
        <p id="previewStyleTagline" style="font-size:11.5px; color:var(--muted); margin-bottom:10px;">Tagline</p>
        <div class="btns">
          <button id="btnApplyMakeover" class="primary" style="flex:1;">Apply Makeover</button>
          <button id="btnSaveVariation">Save Variation</button>
        </div>
      </div>
    </div>

    ${makeoverEngine.lastBeforeSnapshot ? `
      <div style="margin-top:14px;">
        <button id="btnUndoMakeover" class="danger" style="width:100%;">↶ Undo Last Makeover</button>
      </div>
    ` : ''}
  `;

  let currentMakeoverResult = null;

  panel.querySelectorAll('.style-card').forEach(card => {
    card.addEventListener('click', () => {
      panel.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const styleId = card.dataset.style;
      currentMakeoverResult = makeoverEngine.generateMakeover(targetRoom, styleId, home);

      $('makeoverActionContainer').hidden = false;
      $('previewStyleName').textContent = currentMakeoverResult.style.name;
      $('previewStyleTagline').textContent = currentMakeoverResult.style.tagline;
    });
  });

  $('btnApplyMakeover')?.addEventListener('click', () => {
    if (!currentMakeoverResult) return;
    const before = JSON.stringify(home);
    makeoverEngine.applyMakeover(currentMakeoverResult, home);
    record(before);
    commit();
    setStatus(`Applied ${currentMakeoverResult.style.name} Makeover`);
  });

  $('btnSaveVariation')?.addEventListener('click', () => {
    if (!currentMakeoverResult) return;
    makeoverEngine.saveAsVariation(currentMakeoverResult, home);
    commit(false);
    setStatus(`Saved as new variation`);
  });

  $('btnUndoMakeover')?.addEventListener('click', () => {
    makeoverEngine.undoMakeover(home);
    commit();
    setStatus('Makeover undone');
  });
}

// 2. INTELLIGENT FURNITURE LAYOUT ENGINE
function renderLayoutOptimizerStudio() {
  panelTitle.textContent = 'Intelligent Layout Engine';
  const targetRoom = (sel?.kind === 'room' && selItem()) || home.rooms[0];

  if (!targetRoom) {
    panel.innerHTML = '<p class="empty">Please create or select a room to generate layout optimizations.</p>';
    return;
  }

  const roomFurn = home.furn.filter(f => f.floorId === targetRoom.floorId && inRect(targetRoom, { x: f.x, y: f.y }));
  if (roomFurn.length === 0) {
    panel.innerHTML = `
      <p class="empty">${esc(targetRoom.name)} has no furniture yet. Add furniture from the left sidebar to generate optimized arrangements.</p>
    `;
    return;
  }

  const layouts = layoutEngine.generateLayouts(targetRoom, home.furn);

  panel.innerHTML = `
    <div style="background:#f4eee2; padding:10px; border-radius:8px; margin-bottom:12px;">
      <span style="font-size:11px; font-weight:700; color:var(--wood); text-transform:uppercase;">Optimizing Room:</span>
      <h3 style="margin:2px 0;">${esc(targetRoom.name)}</h3>
      <span style="font-size:11.5px; color:var(--muted);">${roomFurn.length} furniture items · ${(targetRoom.w * targetRoom.h / 10000).toFixed(1)} m² floor</span>
    </div>

    <p style="font-size:12px; color:var(--ink-soft); margin-bottom:12px;">Geometric collision &amp; clearance optimization results:</p>

    <div style="display:flex; flex-direction:column; gap:10px;">
      ${layouts.map((l, idx) => `
        <div class="style-card" style="padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span class="badge" style="background:#f0ebe1; padding:2px 6px; border-radius:4px;">${l.badge}</span>
            <span style="font-weight:700; font-size:13px; color:var(--wood);">Efficiency: ${l.score}/100</span>
          </div>
          <h4 style="font-size:14px; margin-bottom:4px;">${l.title}</h4>
          <p style="font-size:11.5px; color:var(--muted); line-height:1.4; margin-bottom:8px;">${l.rationale}</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:600; color:var(--ink-soft);">Free Floor: ${l.freeSpaceM2.toFixed(1)} m² (${l.freeSpacePct}%)</span>
            <button class="primary btn-apply-layout" data-idx="${idx}" style="font-size:11px; padding:4px 8px;">Apply Layout</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  panel.querySelectorAll('.btn-apply-layout').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx, 10);
      const chosen = layouts[idx];
      const before = JSON.stringify(home);

      // Replace items in home.furn
      const itemMap = new Map(chosen.items.map(it => [it.id, it]));
      home.furn.forEach(f => {
        if (itemMap.has(f.id)) {
          Object.assign(f, itemMap.get(f.id));
        }
      });

      record(before);
      commit();
      setStatus(`Applied ${chosen.title}`);
    });
  });
}

// 3. SMART LIGHTING SIMULATOR
function renderLightingSimulator() {
  panelTitle.textContent = 'Lighting Simulator';
  const lighting = home.lighting || {
    preset: 'afternoon',
    sunIntensity: 1.8,
    ambientIntensity: 0.9,
    artificialIntensity: 1.0,
    colorTemp: 'warm',
    shadows: true,
    artificialEnabled: true
  };

  const presets = lightingSim.getPresets();

  panel.innerHTML = `
    <p style="font-size:12px; color:var(--ink-soft); margin-bottom:12px;">Real-time natural sunlight, shadows, and interior fixtures:</p>

    <label>Day / Night Presets</label>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:14px;">
      ${presets.map(p => `
        <button class="item ${p.id === lighting.preset ? 'on' : ''} btn-light-preset" data-preset="${p.id}" style="padding:8px; display:block; text-align:center;">
          <div style="font-weight:600; font-size:12px;">${p.label.split('(')[0]}</div>
          <small style="font-size:10px;">${p.desc.slice(0, 24)}...</small>
        </button>
      `).join('')}
    </div>

    <label>Color Temperature</label>
    <div class="row3" style="margin-bottom:14px;">
      <button class="btn-temp ${lighting.colorTemp === 'warm' ? 'on' : ''}" data-temp="warm">Warm 2700K</button>
      <button class="btn-temp ${lighting.colorTemp === 'neutral' ? 'on' : ''}" data-temp="neutral">Neutral 4200K</button>
      <button class="btn-temp ${lighting.colorTemp === 'cool' ? 'on' : ''}" data-temp="cool">Cool 6500K</button>
    </div>

    <label>Direct Sunlight Intensity (${(lighting.sunIntensity ?? 1.8).toFixed(1)}x)
      <input type="range" id="sliderSun" min="0" max="35" value="${Math.round((lighting.sunIntensity ?? 1.8) * 10)}">
    </label>

    <label>Ambient Sky Diffusion (${(lighting.ambientIntensity ?? 0.9).toFixed(1)}x)
      <input type="range" id="sliderAmbient" min="1" max="25" value="${Math.round((lighting.ambientIntensity ?? 0.9) * 10)}">
    </label>

    <label>Interior Artificial Light Fixtures (${(lighting.artificialIntensity ?? 1.0).toFixed(1)}x)
      <input type="range" id="sliderArtificial" min="0" max="25" value="${Math.round((lighting.artificialIntensity ?? 1.0) * 10)}">
    </label>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
      <label style="margin:0; font-size:12px;">Real-Time Shadow Casting</label>
      <input type="checkbox" id="chkShadows" ${lighting.shadows !== false ? 'checked' : ''} style="width:20px; height:20px;">
    </div>
  `;

  panel.querySelectorAll('.btn-light-preset').forEach(b => {
    b.addEventListener('click', () => {
      lightingSim.setPreset(b.dataset.preset, home);
      commit(false);
      renderLightingSimulator();
    });
  });

  panel.querySelectorAll('.btn-temp').forEach(b => {
    b.addEventListener('click', () => {
      lightingSim.setParam('colorTemp', b.dataset.temp, home);
      commit(false);
      renderLightingSimulator();
    });
  });

  $('sliderSun')?.addEventListener('input', e => {
    lightingSim.setParam('sunIntensity', parseInt(e.target.value, 10) / 10, home);
  });
  $('sliderAmbient')?.addEventListener('input', e => {
    lightingSim.setParam('ambientIntensity', parseInt(e.target.value, 10) / 10, home);
  });
  $('sliderArtificial')?.addEventListener('input', e => {
    lightingSim.setParam('artificialIntensity', parseInt(e.target.value, 10) / 10, home);
  });
  $('chkShadows')?.addEventListener('change', e => {
    lightingSim.setParam('shadows', e.target.checked, home);
  });
}

// 4. MATERIAL AND TEXTURE STUDIO
function renderMaterialStudio() {
  panelTitle.textContent = 'Material & Texture Studio';
  const targetRoom = (sel?.kind === 'room' && selItem()) || home.rooms[0];
  const floorMats = materialStudio.getFloorMaterials();
  const wallMats = materialStudio.getWallMaterials();
  const combos = materialStudio.savedCombos;

  panel.innerHTML = `
    <div style="background:#f4eee2; padding:10px; border-radius:8px; margin-bottom:12px;">
      <span style="font-size:11px; font-weight:700; color:var(--wood); text-transform:uppercase;">Active Room:</span>
      <h3 style="margin:2px 0;">${targetRoom ? esc(targetRoom.name) : 'Whole Apartment'}</h3>
    </div>

    <h4>Preset Curated Combinations</h4>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:14px;">
      ${combos.map(c => `
        <button class="style-card btn-apply-combo" data-cid="${c.id}" style="padding:8px;">
          <h4 style="font-size:12px; margin:0 0 4px;">${c.name}</h4>
          <div style="display:flex; gap:4px;">
            <span style="display:inline-block; width:16px; height:16px; border-radius:3px; background:${c.floorColor}; border:1px solid #ccc;"></span>
            <span style="display:inline-block; width:16px; height:16px; border-radius:3px; background:${c.wallColor}; border:1px solid #ccc;"></span>
          </div>
        </button>
      `).join('')}
    </div>

    <h4>Flooring Library (PBR Procedural)</h4>
    <div style="max-height:180px; overflow-y:auto; margin-bottom:14px;">
      ${floorMats.map(m => `
        <div class="material-card-row btn-set-floor" data-fid="${m.id}" data-col="${m.color}">
          <div class="material-swatch-box" style="background:${m.color};"></div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:12px;">${m.label}</div>
            <div style="font-size:10.5px; color:var(--muted);">Rate: ₹${m.rateINR}/m²</div>
          </div>
        </div>
      `).join('')}
    </div>

    <h4>Wall Finishes Library</h4>
    <div style="max-height:180px; overflow-y:auto; margin-bottom:14px;">
      ${wallMats.map(m => `
        <div class="material-card-row btn-set-wall" data-wid="${m.id}" data-col="${m.color}">
          <div class="material-swatch-box" style="background:${m.color};"></div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:12px;">${m.label}</div>
            <div style="font-size:10.5px; color:var(--muted);">Rate: ₹${m.rateINR}/m²</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  panel.querySelectorAll('.btn-apply-combo').forEach(b => {
    b.addEventListener('click', () => {
      const combo = combos.find(c => c.id === b.dataset.cid);
      if (!combo) return;
      if (targetRoom) {
        materialStudio.applyToRoom(targetRoom, {
          floorMatId: combo.floor,
          floorColor: combo.floorColor,
          wallMatId: combo.wall,
          wallColor: combo.wallColor
        });
      } else {
        materialStudio.applyGlobally(home, combo);
      }
      commit();
    });
  });

  panel.querySelectorAll('.btn-set-floor').forEach(b => {
    b.addEventListener('click', () => {
      if (!targetRoom) return;
      materialStudio.applyToRoom(targetRoom, {
        floorMatId: b.dataset.fid,
        floorColor: b.dataset.col
      });
      commit();
    });
  });

  panel.querySelectorAll('.btn-set-wall').forEach(b => {
    b.addEventListener('click', () => {
      if (!targetRoom) return;
      materialStudio.applyToRoom(targetRoom, {
        wallMatId: b.dataset.wid,
        wallColor: b.dataset.col
      });
      commit();
    });
  });
}

// 5. MULTI-FLOOR ARCHITECTURE
function renderFloorStudio() {
  panelTitle.textContent = 'Multi-Floor Architecture';
  const floors = floorManager.getFloors(home);
  const activeFloor = floorManager.getActiveFloor(home);

  panel.innerHTML = `
    <p style="font-size:12px; color:var(--ink-soft); margin-bottom:12px;">Manage building levels, heights, staircases, and 3D stacking:</p>

    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
      ${floors.map(f => {
        const stats = floorManager.getFloorStats(home, f.id);
        const isCurrent = f.id === home.currentFloorId;
        return `
          <div style="background:#fff; border:1px solid ${isCurrent ? 'var(--wood)' : 'var(--line)'}; border-radius:8px; padding:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; font-size:13px; color:${isCurrent ? 'var(--wood)' : 'var(--ink)'};">${esc(f.name)}</span>
              <span style="font-size:11px; background:#f5efe6; padding:2px 6px; border-radius:4px;">Elev: ${(f.elevation / 100).toFixed(1)}m</span>
            </div>
            <div style="font-size:11.5px; color:var(--muted); margin:4px 0 8px;">
              ${stats.roomCount} rooms · ${stats.furnCount} furniture · ${stats.areaM2.toFixed(1)} m²
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn-switch-floor ${isCurrent ? 'primary' : ''}" data-fid="${f.id}" style="font-size:11px; padding:3px 8px; flex:1;">
                ${isCurrent ? 'Active Editing Level' : 'Switch To This Level'}
              </button>
              ${floors.length > 1 ? `<button class="danger btn-del-floor" data-fid="${f.id}" style="font-size:11px; padding:3px 8px;">Delete</button>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="btns">
      <button id="btnAddFloorNew" class="primary" style="flex:1;">+ Add New Floor</button>
      <button id="btnAddStairs">Insert Staircase</button>
    </div>

    <div style="margin-top:16px; padding:12px; background:#f4eee2; border-radius:8px;">
      <h4 style="margin:0 0 6px; font-size:12px; color:var(--ink);">3D Building Isolation</h4>
      <div style="display:flex; gap:6px;">
        <button id="btnIsoAll" class="${!floorManager.isolatedFloorId ? 'on' : ''}" style="flex:1; font-size:11.5px;">All Floors Stacked</button>
        <button id="btnIsoCurrent" class="${floorManager.isolatedFloorId ? 'on' : ''}" style="flex:1; font-size:11.5px;">Isolate Active Floor</button>
      </div>
    </div>
  `;

  panel.querySelectorAll('.btn-switch-floor').forEach(b => {
    b.addEventListener('click', () => {
      floorManager.setActiveFloor(home, b.dataset.fid);
      updateFloorSelector();
      commit();
      fit2D();
    });
  });

  panel.querySelectorAll('.btn-del-floor').forEach(b => {
    b.addEventListener('click', () => {
      if (confirm('Delete this floor and all its rooms?')) {
        floorManager.removeFloor(home, b.dataset.fid);
        updateFloorSelector();
        commit();
        fit2D();
      }
    });
  });

  $('btnAddFloorNew')?.addEventListener('click', () => {
    floorManager.addFloor(home);
    updateFloorSelector();
    commit();
  });

  $('btnAddStairs')?.addEventListener('click', () => {
    floorManager.addStaircase(home, 200, 200);
    commit();
  });

  $('btnIsoAll')?.addEventListener('click', () => {
    floorManager.setIsolatedFloor(null);
    threeStudio.rebuild(home, { isolateFloorId: null });
    renderFloorStudio();
  });

  $('btnIsoCurrent')?.addEventListener('click', () => {
    floorManager.setIsolatedFloor(home.currentFloorId);
    threeStudio.rebuild(home, { isolateFloorId: home.currentFloorId });
    renderFloorStudio();
  });
}

// 6. INTERIOR BUDGET PLANNER
function renderBudgetStudio() {
  panelTitle.textContent = 'Interior Budget Planner';
  const data = budgetPlanner.calculateBudget(home);

  if (!data) {
    panel.innerHTML = '<p class="empty">No rooms available for budget calculation.</p>';
    return;
  }

  panel.innerHTML = `
    <div style="background:#f4eee2; padding:12px; border-radius:8px; margin-bottom:14px; text-align:center;">
      <span style="font-size:11px; font-weight:700; color:var(--wood); text-transform:uppercase;">Overall Projected Interior Budget</span>
      <h2 style="font:700 24px ui-serif, Georgia, serif; color:var(--ink); margin:4px 0;">₹${data.totalEstimatedBudget.toLocaleString('en-IN')}</h2>
      <div style="font-size:11.5px; color:var(--muted);">
        ₹${data.costPerM2.toLocaleString('en-IN')} / m² · ₹${data.costPerSqFt.toLocaleString('en-IN')} / sq.ft (${data.totalFloorAreaM2.toFixed(1)} m² built-up)
      </div>
    </div>

    <h4>Category Breakdown</h4>
    <div style="margin-bottom:16px;">
      ${data.categories.map(c => `
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

    <h4>Itemized Furniture Inventory (${data.itemizedFurn.length} Types)</h4>
    <div style="max-height:160px; overflow-y:auto; margin-bottom:14px; border:1px solid var(--line); border-radius:6px; background:#fff;">
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <tbody>
          ${data.itemizedFurn.map(f => `
            <tr style="border-bottom:1px solid var(--line);">
              <td style="padding:6px 8px;">${f.label} (×${f.count})</td>
              <td style="padding:6px 8px; text-align:right; font-weight:600;">₹${f.total.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <p style="font-size:10.5px; color:var(--muted); line-height:1.4; font-style:italic;">
      Disclaimer: Estimated Budget Projection based on standard Indian interior market benchmarks. Not a live contractual quotation.
    </p>
  `;
}

// 7. DESIGN QUALITY ANALYZER
function renderAnalyzerStudio() {
  panelTitle.textContent = 'Design Quality Analyzer';
  const targetRoom = sel?.kind === 'room' ? sel.id : null;
  const audit = analyzer.analyze(home, targetRoom);

  panel.innerHTML = `
    <div style="background:#f4eee2; padding:12px; border-radius:8px; margin-bottom:14px; text-align:center;">
      <span style="font-size:11px; font-weight:700; color:var(--wood); text-transform:uppercase;">Overall Design Quality Score</span>
      <h2 style="font:700 28px ui-serif, Georgia, serif; color:var(--ink); margin:4px 0;">${audit.overallScore} <small style="font-size:16px; color:var(--muted);">/ 100</small></h2>
      <span class="badge" style="background:#e8dfd0; padding:3px 10px; border-radius:12px; font-size:11.5px; font-weight:600;">Rating: ${audit.rating}</span>
    </div>

    <h4>Category Metrics (Transparent Rules)</h4>
    <div style="margin-bottom:14px;">
      ${audit.categories.map(c => `
        <div class="score-bar-group">
          <div class="score-bar-label">
            <span>${c.name}</span>
            <b>${c.score}/100</b>
          </div>
          <div class="score-track">
            <div class="score-fill" style="width:${c.score}%; background:${c.score >= 80 ? 'var(--accent-green)' : c.score >= 60 ? 'var(--accent-gold)' : 'var(--accent-red)'};"></div>
          </div>
          <div style="font-size:10px; color:var(--muted); margin-top:2px;">${c.desc}</div>
        </div>
      `).join('')}
    </div>

    ${audit.warnings.length > 0 ? `
      <h4>Detected Clearance &amp; Collision Issues (${audit.warnings.length})</h4>
      <div style="margin-bottom:14px;">
        ${audit.warnings.map(w => `
          <div class="warning-item ${w.severity}">
            <b>${w.room}:</b> ${w.message}
          </div>
        `).join('')}
      </div>
    ` : '<div class="warning-item tip" style="margin-bottom:14px;">✓ Zero collisions detected! All furniture fits within boundaries.</div>'}

    ${audit.tips.length > 0 ? `
      <h4>Optimization Suggestions (${audit.tips.length})</h4>
      <div>
        ${audit.tips.map(t => `
          <div class="warning-item tip">
            <b>${t.room}:</b> ${t.message}
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

// 8. MOODBOARD GENERATOR
function renderMoodboardStudio() {
  panelTitle.textContent = 'Moodboard Studio';
  const targetRoom = (sel?.kind === 'room' && selItem()) || home.rooms[0];

  if (!targetRoom) {
    panel.innerHTML = '<p class="empty">Please create or select a room to generate a visual moodboard.</p>';
    return;
  }

  const mb = moodboardGen.generateMoodboard(targetRoom, home);

  panel.innerHTML = `
    <div style="background:#f4eee2; padding:10px; border-radius:8px; margin-bottom:12px;">
      <span style="font-size:11px; font-weight:700; color:var(--wood); text-transform:uppercase;">Room Concept:</span>
      <h3 style="margin:2px 0;">${esc(mb.roomName)}</h3>
      <span style="font-size:11.5px; color:var(--wood); font-weight:600;">${mb.themeName} Aesthetic</span>
    </div>

    <h4>Color Palette Swatches</h4>
    <div style="display:flex; gap:6px; margin-bottom:14px;">
      ${mb.palette.map(p => `
        <div style="flex:1; text-align:center;">
          <div style="height:36px; border-radius:6px; background:${p.hex}; border:1px solid rgba(0,0,0,0.1);"></div>
          <div style="font-size:9.5px; font-weight:600; margin-top:3px;">${p.hex.toUpperCase()}</div>
          <div style="font-size:8.5px; color:var(--muted);">${p.label}</div>
        </div>
      `).join('')}
    </div>

    <h4>Specified Materials</h4>
    <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
      <div class="material-card-row">
        <div class="material-swatch-box" style="background:${mb.floorMaterial.color};"></div>
        <div style="flex:1;">
          <div style="font-weight:600; font-size:12px;">Floor: ${mb.floorMaterial.label}</div>
          <div style="font-size:10.5px; color:var(--muted);">${mb.floorMaterial.desc.slice(0, 40)}...</div>
        </div>
      </div>
      <div class="material-card-row">
        <div class="material-swatch-box" style="background:${mb.wallMaterial.color};"></div>
        <div style="flex:1;">
          <div style="font-weight:600; font-size:12px;">Wall: ${mb.wallMaterial.label}</div>
          <div style="font-size:10.5px; color:var(--muted);">${mb.wallMaterial.desc.slice(0, 40)}...</div>
        </div>
      </div>
    </div>

    <h4>Curated Pieces (${mb.furnitureList.length})</h4>
    <div style="max-height:140px; overflow-y:auto; margin-bottom:14px; border:1px solid var(--line); border-radius:6px; background:#fff;">
      ${mb.furnitureList.map(f => `
        <div style="display:flex; justify-content:space-between; padding:5px 8px; border-bottom:1px solid var(--line); font-size:11px;">
          <span>${f.label}</span>
          <span style="color:var(--muted);">${f.dimensions}</span>
        </div>
      `).join('')}
    </div>

    <button id="btnExportMoodboard" class="primary" style="width:100%;">Export High-Res Moodboard Image (PNG)</button>
  `;

  $('btnExportMoodboard')?.addEventListener('click', () => {
    const pngUrl = moodboardGen.exportMoodboardCanvas(mb);
    const a = document.createElement('a');
    a.download = `${targetRoom.name.replace(/\s+/g, '_')}_Moodboard.png`;
    a.href = pngUrl;
    a.click();
  });
}

// 9. DESIGN COMPARISON
function renderComparisonStudio() {
  panelTitle.textContent = 'Design Comparison';
  const variations = home.variations || [];

  panel.innerHTML = `
    <p style="font-size:12px; color:var(--ink-soft); margin-bottom:12px;">Save multiple design options and compare scores, arrangements, and budgets:</p>

    <div style="margin-bottom:14px;">
      <button id="btnSaveCurrentVariation" class="primary" style="width:100%;">+ Save Current Design as Variation</button>
    </div>

    <h4>Saved Variations (${variations.length})</h4>
    ${variations.length === 0 ? `
      <p class="empty">No variations saved yet. Click "Save Current Design" or use the Smart Makeover tool to generate variations.</p>
    ` : `
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${variations.map(v => `
          <div style="background:#fff; border:1px solid var(--line); border-radius:8px; padding:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; font-size:13px; color:var(--ink);">${esc(v.name)}</span>
              <span style="font-size:10px; color:var(--muted);">${v.timestamp || ''}</span>
            </div>
            <div style="font-size:11px; color:var(--muted); margin:4px 0 8px;">
              ${v.roomsCount || 0} rooms · ${v.furnCount || 0} furniture items
            </div>
            <div style="display:flex; gap:6px;">
              <button class="primary btn-restore-var" data-vid="${v.id}" style="font-size:11px; padding:3px 8px; flex:1;">Restore This Design</button>
              <button class="danger btn-del-var" data-vid="${v.id}" style="font-size:11px; padding:3px 8px;">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;

  $('btnSaveCurrentVariation')?.addEventListener('click', () => {
    const name = prompt('Enter a name for this design variation:', `Design Concept ${String.fromCharCode(65 + (home.variations?.length || 0))}`);
    if (name) {
      comparator.saveVariation(home, name);
      commit(false);
      renderComparisonStudio();
      setStatus(`Saved variation "${name}"`);
    }
  });

  panel.querySelectorAll('.btn-restore-var').forEach(b => {
    b.addEventListener('click', () => {
      const vid = b.dataset.vid;
      if (confirm('Restore this design variation? Current unsaved edits will be replaced.')) {
        comparator.restoreVariation(home, vid);
        commit();
        setStatus('Variation restored');
      }
    });
  });

  panel.querySelectorAll('.btn-del-var').forEach(b => {
    b.addEventListener('click', () => {
      comparator.deleteVariation(home, b.dataset.vid);
      commit(false);
      renderComparisonStudio();
    });
  });
}

// ---------------- Footer Status & Metrics Updates ----------------
function updateFooterMetrics() {
  const audit = analyzer.analyze(home);
  const budget = budgetPlanner.calculateBudget(home);

  $('footerScoreLabel').textContent = `Score: ${audit.overallScore}/100 (${audit.rating})`;
  if (budget) {
    $('footerBudgetLabel').textContent = `Est. ₹${budget.totalEstimatedBudget.toLocaleString('en-IN')}`;
  }
}

$('pillScore').onclick = () => openStudioTool('analyzer');
$('pillBudget').onclick = () => openStudioTool('budget');

// ---------------- Studio Bar Event Listeners ----------------
$('btnMakeover').onclick = () => openStudioTool('makeover');
$('btnLayout').onclick = () => openStudioTool('layout');
$('btnLighting').onclick = () => openStudioTool('lighting');
$('btnMaterials').onclick = () => openStudioTool('materials');
$('btnFloors').onclick = () => openStudioTool('floors');
$('btnBudget').onclick = () => openStudioTool('budget');
$('btnAnalyzer').onclick = () => openStudioTool('analyzer');
$('btnMoodboard').onclick = () => openStudioTool('moodboard');
$('btnCompare').onclick = () => openStudioTool('compare');

$('btnExploded').onclick = () => {
  if (view !== '3d') setView('3d');
  $('explodedOverlay').hidden = false;
  $('explodedSlider').value = 0;
  $('explodedVal').textContent = '0%';
  explodedController.setProgress(0);
};

// ---------------- Modal Overlays (Projects & VR) ----------------
$('btnProjects').onclick = () => {
  openProjectsModal();
};

function openProjectsModal() {
  const projects = projectManager.getProjects();
  modalContainer.hidden = false;
  modalContainer.className = 'modal-backdrop';

  modalContainer.innerHTML = `
    <div class="modal-window">
      <div class="modal-header">
        <h3>Project Portfolio &amp; Manager</h3>
        <button id="modalClose" style="font-size:16px; padding:2px 8px;">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:12.5px; color:var(--muted); margin-bottom:16px;">
          Manage saved architectural projects, clone layouts, or switch between apartment portfolios:
        </p>
        <div class="project-grid">
          ${projects.map(p => `
            <div class="project-card" data-pid="${p.id}">
              <div class="project-thumb">
                ${p.thumbnail ? `<img src="${p.thumbnail}">` : `<span>🏠 ${p.roomCount || 5} Rooms</span>`}
              </div>
              <b style="font-size:13.5px; margin-top:4px;">${esc(p.name)}</b>
              <small style="color:var(--muted); font-size:11px;">Updated: ${new Date(p.updatedAt || Date.now()).toLocaleDateString()}</small>
              <div style="display:flex; gap:6px; margin-top:8px;">
                <button class="primary btn-open-proj" data-pid="${p.id}" style="font-size:11px; padding:3px 8px; flex:1;">Open</button>
                <button class="btn-dup-proj" data-pid="${p.id}" style="font-size:11px; padding:3px 8px;">Copy</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button id="btnNewProjectBlank">+ New Project</button>
        <button id="btnCloseModal">Close</button>
      </div>
    </div>
  `;

  $('modalClose').onclick = () => { modalContainer.hidden = true; };
  $('btnCloseModal').onclick = () => { modalContainer.hidden = true; };

  modalContainer.querySelectorAll('.btn-open-proj').forEach(b => {
    b.addEventListener('click', () => {
      const p = projectManager.loadProject(b.dataset.pid);
      loadHome(p);
      modalContainer.hidden = true;
    });
  });

  modalContainer.querySelectorAll('.btn-dup-proj').forEach(b => {
    b.addEventListener('click', () => {
      projectManager.duplicateProject(b.dataset.pid);
      openProjectsModal();
    });
  });

  $('btnNewProjectBlank').onclick = () => {
    loadHome(blankHome());
    modalContainer.hidden = true;
  };
}

$('btnVR').onclick = async () => {
  modalContainer.hidden = false;
  modalContainer.className = 'modal-backdrop';

  const support = await xrManager.checkSupport();

  modalContainer.innerHTML = `
    <div class="modal-window" style="max-width:540px;">
      <div class="modal-header">
        <h3>WebXR AR / VR Immersive Studio</h3>
        <button id="modalClose" style="font-size:16px; padding:2px 8px;">✕</button>
      </div>
      <div class="modal-body" style="line-height:1.5;">
        <p style="font-size:13px; color:var(--ink); margin-bottom:14px;">
          Experience RoomCraft 2.0 inside a virtual reality headset or augmented reality tabletop preview:
        </p>

        <div style="background:#f4efe6; padding:12px; border-radius:8px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="font-weight:600; font-size:12px;">WebXR Immersive VR:</span>
            <span style="font-weight:700; color:${support.vr ? 'var(--accent-green)' : 'var(--muted)'};">${support.vr ? '✓ Supported' : 'Hardware Not Detected'}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="font-weight:600; font-size:12px;">WebXR Immersive AR:</span>
            <span style="font-weight:700; color:${support.ar ? 'var(--accent-green)' : 'var(--muted)'};">${support.ar ? '✓ Supported' : 'Hardware Not Detected'}</span>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <button id="btnEnterVR" class="primary" style="padding:8px;" ${!support.vr ? 'disabled' : ''}>Enter Immersive VR Session</button>
          <button id="btnEnterAR" class="primary" style="padding:8px;" ${!support.ar ? 'disabled' : ''}>Enter Immersive AR Surface Placement</button>
          <button id="btnEnterGyro" style="padding:8px;">📱 Launch 360° Device Gyroscope Preview</button>
        </div>

        <p style="font-size:11px; color:var(--muted); margin-top:14px;">
          Standard desktop browsers without VR tethering can use our rich First-Person 3D Walkthrough mode with WASD and mouse-look for equivalent immersion!
        </p>
      </div>
      <div class="modal-footer">
        <button id="btnCloseModal">Close</button>
      </div>
    </div>
  `;

  $('modalClose').onclick = () => { modalContainer.hidden = true; };
  $('btnCloseModal').onclick = () => { modalContainer.hidden = true; };

  $('btnEnterVR')?.addEventListener('click', async () => {
    const res = await xrManager.enterVR();
    if (!res.success) alert(res.message);
  });
  $('btnEnterAR')?.addEventListener('click', async () => {
    const res = await xrManager.enterAR();
    if (!res.success) alert(res.message);
  });
  $('btnEnterGyro')?.addEventListener('click', () => {
    xrManager.startGyroPreview();
    modalContainer.hidden = true;
    setView('3d');
  });
};

// ---------------- Header Actions, Exports & Templates ----------------
$('undo').onclick = doUndo;
$('redo').onclick = doRedo;
$('name').addEventListener('change', e => {
  home.name = e.target.value.trim() || 'My home';
  commit(false);
});

$('newBlank').onclick = () => {
  loadHome(blankHome());
};
$('tpl2bhk').onclick = () => {
  loadHome(template2bhk());
};
$('tplShowcase').onclick = () => {
  loadHome(templateExhibitionShowcase());
};

$('exportJson').onclick = () => {
  projectManager.exportJSON(home);
};
$('importJson').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  projectManager.importJSON(
    file,
    (importedHome) => {
      loadHome(importedHome);
      setStatus('Project imported successfully');
    },
    (errMsg) => {
      alert(`Import error: ${errMsg}`);
    }
  );
  e.target.value = '';
});

$('exportPng').onclick = () => {
  if (view === '3d' || view === 'walk' || view === 'presentation') {
    threeStudio.renderer.render(threeStudio.scene, threeStudio.camera);
    projectManager.exportHighResPNG(threeStudio.canvas, `${home.name}-3d-render.png`, 2);
  } else if (view === 'blueprint') {
    projectManager.exportHighResPNG(blueprintCanvas, `${home.name}-blueprint-cad.png`, 2);
  } else {
    projectManager.exportHighResPNG(planCanvas, `${home.name}-floor-plan.png`, 2);
  }
};

// ---------------- Global Keyboard & Event Wiring ----------------
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
    if (view === 'walk' || view === 'presentation') {
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
  if (view === '2d') render2D();
  else if (view === '3d') threeStudio?.resize();
  else if (view === 'blueprint') blueprintRenderer?.render(home, home.currentFloorId);
});

// Sidebar Event Delegations
document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;

  if (t.dataset.room) {
    sel = { kind: 'room', id: t.dataset.room };
    activeStudioTool = null;
    commit();
  } else if (t.dataset.add) {
    addFurn(t.dataset.add);
  } else if (t.dataset.tool) {
    setTool(t.dataset.tool);
  } else if (t.dataset.cat) {
    currentFurnCategory = t.dataset.cat;
    renderFurnCategoryTabs();
    renderFurnGrid();
  }
});

// ---------------- Boot RoomCraft 2.0 ----------------
initModules();
updateFloorSelector();
renderFurnCategoryTabs();
renderFurnGrid();
setTool('select');
setView('2d');
commit();
fit2D();

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const KEY = 'roomcraft-project-v1';
const GRID = 10;   // snap step, cm
const M = 0.01;    // cm -> metres in 3D

const FURN = {
  sofa:     { label: 'Sofa',         w: 200, d: 90,  h: 80,  color: '#c9b49a' },
  bed:      { label: 'Double bed',   w: 160, d: 200, h: 50,  color: '#e8e0d2' },
  table:    { label: 'Dining table', w: 160, d: 90,  h: 75,  color: '#b08a5e' },
  chair:    { label: 'Chair',        w: 45,  d: 45,  h: 90,  color: '#9c7a52' },
  wardrobe: { label: 'Wardrobe',     w: 120, d: 60,  h: 200, color: '#a88963' },
  desk:     { label: 'Desk',         w: 120, d: 60,  h: 75,  color: '#b89a72' },
  plant:    { label: 'Plant',        w: 40,  d: 40,  h: 120, color: '#7d9472' },
};

const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 9);
const snap = v => Math.round(v / GRID) * GRID;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inRect = (r, p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

function makeRoom(name, x, y, w, h, extra = {}) {
  return { id: uid(), name, x, y, w, h, wallH: 280, wall: '#f5f1ea', floor: '#d9c3a5', ...extra };
}
function makeFurn(type, x, y, rot = 0) {
  const f = FURN[type];
  return { id: uid(), type, x, y, w: f.w, d: f.d, h: f.h, rot, color: f.color };
}
function blankHome() { return { name: 'My home', rooms: [], furn: [] }; }
function template2bhk() {
  const L = makeRoom('Living room', 0, 0, 420, 360);
  const K = makeRoom('Kitchen', 420, 0, 260, 250, { floor: '#e6dfd2' });
  const B1 = makeRoom('Master bedroom', 0, 360, 340, 330);
  const B2 = makeRoom('Bedroom 2', 340, 360, 280, 330, { floor: '#cfb89a' });
  const BA = makeRoom('Bathroom', 420, 250, 140, 110, { floor: '#e9e4da' });
  return {
    name: '2BHK apartment',
    rooms: [L, K, B1, B2, BA],
    furn: [
      makeFurn('sofa', 200, 290),
      makeFurn('plant', 380, 40),
      makeFurn('table', 550, 120),
      makeFurn('chair', 550, 50),
      makeFurn('chair', 550, 190),
      makeFurn('bed', 170, 520),
      makeFurn('wardrobe', 290, 560, 90),
      makeFurn('bed', 480, 520),
      makeFurn('desk', 590, 500, 90),
    ],
  };
}
function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }

let home = load() || template2bhk();
let sel = null;              // { kind: 'room' | 'furn', id }
let tool = 'select';
let view = '2d';
let spaceDown = false;
let drag = null, pending = null;
const undoStack = [], redoStack = [];
const cam = { zoom: 0.5, x: 40, y: 40 };
let three = null;

const cv = $('plan'), ctx = cv.getContext('2d');
const panel = $('panel');

const toWorld = (sx, sy) => ({ x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom });
const pt = e => { const r = cv.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; };
function furnHit(f, p) {
  const a = -f.rot * Math.PI / 180, dx = p.x - f.x, dy = p.y - f.y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= f.w / 2 && Math.abs(ly) <= f.d / 2;
}
const selItem = () => !sel ? null : sel.kind === 'room'
  ? home.rooms.find(r => r.id === sel.id) : home.furn.find(f => f.id === sel.id);
function bounds() {
  if (!home.rooms.length) return null;
  return {
    x0: Math.min(...home.rooms.map(r => r.x)), y0: Math.min(...home.rooms.map(r => r.y)),
    x1: Math.max(...home.rooms.map(r => r.x + r.w)), y1: Math.max(...home.rooms.map(r => r.y + r.h)),
  };
}
function setStatus(t) { $('status').textContent = t; }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(home)); setStatus('All changes saved'); }
  catch { setStatus('Could not save: browser storage is full'); }
}
function record(before) {
  if (before !== JSON.stringify(home)) {
    undoStack.push(before);
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
  }
}
function commit() {
  if (sel && !selItem()) sel = null;
  save(); render(); renderPanel(); renderRoomList();
  if (view === '3d') rebuild3D();
}
function doUndo() { if (undoStack.length) { redoStack.push(JSON.stringify(home)); home = JSON.parse(undoStack.pop()); commit(); } }
function doRedo() { if (redoStack.length) { undoStack.push(JSON.stringify(home)); home = JSON.parse(redoStack.pop()); commit(); } }

function addFurn(type) {
  const before = JSON.stringify(home);
  const r = (sel?.kind === 'room' && selItem()) || home.rooms[home.rooms.length - 1];
  const f = makeFurn(type, snap(r ? r.x + r.w / 2 : 100), snap(r ? r.y + r.h / 2 : 100));
  home.furn.push(f); sel = { kind: 'furn', id: f.id };
  record(before); commit();
}
function duplicate() {
  const it = selItem(); if (!it) return;
  const before = JSON.stringify(home);
  if (sel.kind === 'room') {
    const c = { ...it, id: uid(), name: it.name + ' copy', x: it.x + it.w + 20 };
    home.rooms.push(c); sel = { kind: 'room', id: c.id };
  } else {
    const c = { ...it, id: uid(), x: it.x + 30, y: it.y + 30 };
    home.furn.push(c); sel = { kind: 'furn', id: c.id };
  }
  record(before); commit();
}
function removeSel() {
  const it = selItem(); if (!it) return;
  const before = JSON.stringify(home);
  if (sel.kind === 'room') {
    home.furn = home.furn.filter(f => !inRect(it, f));
    home.rooms = home.rooms.filter(r => r.id !== it.id);
  } else {
    home.furn = home.furn.filter(f => f.id !== it.id);
  }
  sel = null; record(before); commit();
}
function rotateSel() {
  const it = selItem(); if (!it || sel.kind !== 'furn') return;
  const before = JSON.stringify(home);
  it.rot = (it.rot + 90) % 360; record(before); commit();
}

// ---------- 2D rendering ----------
function render() {
  const dpr = window.devicePixelRatio || 1;
  const W = cv.parentElement.clientWidth, H = cv.parentElement.clientHeight;
  if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#fbf9f4'; ctx.fillRect(0, 0, W, H);
  const z = cam.zoom;
  ctx.save(); ctx.translate(cam.x, cam.y); ctx.scale(z, z);
  const x0 = -cam.x / z, y0 = -cam.y / z, x1 = x0 + W / z, y1 = y0 + H / z;

  ctx.beginPath(); ctx.strokeStyle = '#ece6da'; ctx.lineWidth = 1 / z;
  for (let x = Math.floor(x0 / 100) * 100; x < x1; x += 100) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  for (let y = Math.floor(y0 / 100) * 100; y < y1; y += 100) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
  ctx.stroke();

  for (const r of home.rooms) { ctx.fillStyle = r.floor; ctx.fillRect(r.x, r.y, r.w, r.h); }

  for (const f of home.furn) {
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot * Math.PI / 180);
    ctx.fillStyle = f.color; ctx.strokeStyle = '#6b5a46'; ctx.lineWidth = 1 / z;
    ctx.fillRect(-f.w / 2, -f.d / 2, f.w, f.d); ctx.strokeRect(-f.w / 2, -f.d / 2, f.w, f.d);
    ctx.restore();
  }

  for (const r of home.rooms) {
    ctx.strokeStyle = r.wall; ctx.lineWidth = 12; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#3b3732'; ctx.textAlign = 'center';
    ctx.font = `600 ${15 / z}px system-ui, sans-serif`;
    ctx.fillText(r.name, r.x + r.w / 2, r.y + r.h / 2 - 4 / z);
    ctx.font = `${12 / z}px system-ui, sans-serif`;
    ctx.fillText(`${(r.w / 100).toFixed(2)} × ${(r.h / 100).toFixed(2)} m · ${(r.w * r.h / 10000).toFixed(1)} m²`, r.x + r.w / 2, r.y + r.h / 2 + 12 / z);
  }

  const it = selItem();
  if (it) {
    ctx.strokeStyle = '#8a6d4b'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 4 / z]);
    if (sel.kind === 'room') ctx.strokeRect(it.x, it.y, it.w, it.h);
    else {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot * Math.PI / 180);
      ctx.strokeRect(-it.w / 2 - 3 / z, -it.d / 2 - 3 / z, it.w + 6 / z, it.d + 6 / z); ctx.restore();
    }
    ctx.setLineDash([]);
  }

  if (drag?.kind === 'draw') {
    const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
    ctx.strokeStyle = '#8a6d4b'; ctx.setLineDash([6 / z, 4 / z]); ctx.lineWidth = 2 / z;
    ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
    ctx.fillStyle = '#3b3732'; ctx.textAlign = 'center'; ctx.font = `${12 / z}px system-ui, sans-serif`;
    ctx.fillText(`${(w / 100).toFixed(2)} × ${(h / 100).toFixed(2)} m`, x + w / 2, y + h / 2);
  }
  ctx.restore();
}

function fit() {
  const b = bounds(); if (!b) { cam.zoom = 0.5; cam.x = 40; cam.y = 40; return render(); }
  const W = cv.parentElement.clientWidth, H = cv.parentElement.clientHeight, pad = 60;
  const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  cam.zoom = clamp(Math.min((W - pad * 2) / bw, (H - pad * 2) / bh), 0.1, 3);
  cam.x = (W - bw * cam.zoom) / 2 - b.x0 * cam.zoom;
  cam.y = (H - bh * cam.zoom) / 2 - b.y0 * cam.zoom;
  render();
}

// ---------- 2D input ----------
cv.addEventListener('pointerdown', e => {
  if (e.button !== 0 && e.button !== 1) return;
  const { sx, sy } = pt(e), p = toWorld(sx, sy);
  cv.setPointerCapture(e.pointerId);
  pending = JSON.stringify(home);
  if (e.button === 1 || spaceDown || e.shiftKey) { drag = { kind: 'pan', sx, sy, ox: cam.x, oy: cam.y }; return; }
  if (tool === 'room') { drag = { kind: 'draw', x0: snap(p.x), y0: snap(p.y), x1: snap(p.x), y1: snap(p.y) }; return; }

  const f = [...home.furn].reverse().find(f => furnHit(f, p));
  if (f) {
    sel = { kind: 'furn', id: f.id };
    drag = { kind: 'furn', id: f.id, ox: p.x - f.x, oy: p.y - f.y };
  } else {
    const r = [...home.rooms].reverse().find(r => inRect(r, p));
    if (r) {
      sel = { kind: 'room', id: r.id };
      const members = home.furn.filter(f => inRect(r, f)).map(f => ({ id: f.id, x: f.x, y: f.y }));
      drag = { kind: 'room', id: r.id, ox: p.x - r.x, oy: p.y - r.y, rx: r.x, ry: r.y, members };
    } else {
      sel = null;
      drag = { kind: 'pan', sx, sy, ox: cam.x, oy: cam.y };
    }
  }
  render(); renderPanel(); renderRoomList();
});

cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const { sx, sy } = pt(e), p = toWorld(sx, sy);
  if (drag.kind === 'pan') { cam.x = drag.ox + sx - drag.sx; cam.y = drag.oy + sy - drag.sy; return render(); }
  if (drag.kind === 'draw') { drag.x1 = snap(p.x); drag.y1 = snap(p.y); return render(); }
  if (drag.kind === 'furn') {
    const f = home.furn.find(f => f.id === drag.id);
    if (f) { f.x = snap(p.x - drag.ox); f.y = snap(p.y - drag.oy); }
  }
  if (drag.kind === 'room') {
    const r = home.rooms.find(r => r.id === drag.id);
    if (r) {
      const nx = snap(p.x - drag.ox), ny = snap(p.y - drag.oy);
      const dx = nx - drag.rx, dy = ny - drag.ry;
      r.x = nx; r.y = ny;
      for (const m of drag.members) {
        const f = home.furn.find(f => f.id === m.id);
        if (f) { f.x = m.x + dx; f.y = m.y + dy; }
      }
    }
  }
  render();
});

const endDrag = () => {
  if (!drag) return;
  if (drag.kind === 'draw') {
    const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
    if (w >= 60 && h >= 60) {
      const r = makeRoom('Room ' + (home.rooms.length + 1), x, y, w, h);
      home.rooms.push(r); sel = { kind: 'room', id: r.id };
    }
    setTool('select');
  }
  drag = null;
  record(pending); pending = null;
  commit();
};
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);

cv.addEventListener('wheel', e => {
  e.preventDefault();
  const { sx, sy } = pt(e);
  const before = toWorld(sx, sy);
  cam.zoom = clamp(cam.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.1, 3);
  cam.x = sx - before.x * cam.zoom; cam.y = sy - before.y * cam.zoom;
  render();
}, { passive: false });

// ---------- Panel ----------
function renderPanel() {
  const it = selItem();
  if (!it) {
    panel.innerHTML = '<h3>Nothing selected</h3><p class="empty">Click a room or a piece of furniture to edit it here.</p>';
    return;
  }
  if (sel.kind === 'room') {
    panel.innerHTML = `
      <label>Name<input data-k="name" value="${esc(it.name)}"></label>
      <div class="row2">
        <label>Width (cm)<input type="number" step="10" min="60" data-k="w" value="${it.w}"></label>
        <label>Length (cm)<input type="number" step="10" min="60" data-k="h" value="${it.h}"></label>
      </div>
      <label>Wall height (cm)<input type="number" step="10" min="200" data-k="wallH" value="${it.wallH}"></label>
      <label>Wall colour<input type="color" data-k="wall" value="${it.wall}"></label>
      <label>Floor colour<input type="color" data-k="floor" value="${it.floor}"></label>
      <p class="meta">Area ${(it.w * it.h / 10000).toFixed(2)} m²</p>
      <div class="btns"><button data-act="dup">Duplicate</button><button class="danger" data-act="del">Delete</button></div>`;
  } else {
    panel.innerHTML = `
      <h3>${FURN[it.type].label}</h3>
      <div class="row2">
        <label>X (cm)<input type="number" step="10" data-k="x" value="${it.x}"></label>
        <label>Y (cm)<input type="number" step="10" data-k="y" value="${it.y}"></label>
      </div>
      <div class="row2">
        <label>Width (cm)<input type="number" step="5" min="5" data-k="w" value="${it.w}"></label>
        <label>Depth (cm)<input type="number" step="5" min="5" data-k="d" value="${it.d}"></label>
      </div>
      <label>Rotation (°)<input type="number" step="90" data-k="rot" value="${it.rot}"></label>
      <label>Colour<input type="color" data-k="color" value="${it.color}"></label>
      <div class="btns"><button data-act="rot">Rotate 90°</button><button data-act="dup">Duplicate</button><button class="danger" data-act="del">Delete</button></div>`;
  }
}
panel.addEventListener('change', e => {
  const k = e.target.dataset.k, it = selItem();
  if (!k || !it) return;
  const before = JSON.stringify(home);
  let v = e.target.value;
  if (e.target.type === 'number') {
    v = parseFloat(v);
    if (!Number.isFinite(v)) return;
    if (['w', 'h', 'd'].includes(k)) v = Math.max(5, v);
    if (k === 'rot') v = ((v % 360) + 360) % 360;
  }
  it[k] = v;
  record(before); commit();
});
panel.addEventListener('click', e => {
  const a = e.target.dataset.act;
  if (a === 'dup') duplicate();
  else if (a === 'del') removeSel();
  else if (a === 'rot') rotateSel();
});

// ---------- Sidebar ----------
function renderRoomList() {
  $('roomList').innerHTML = home.rooms.map(r =>
    `<button class="item ${sel?.id === r.id ? 'on' : ''}" data-room="${r.id}">${esc(r.name)}<small>${(r.w / 100).toFixed(1)}×${(r.h / 100).toFixed(1)} m</small></button>`
  ).join('') || '<p class="empty">No rooms yet. Choose "Draw room" and drag on the plan.</p>';
}
function setTool(t) {
  tool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  cv.style.cursor = t === 'room' ? 'crosshair' : 'default';
}
$('furnList').innerHTML = Object.entries(FURN).map(([k, v]) =>
  `<button class="item" data-add="${k}">${v.label}<small>${v.w}×${v.d} cm</small></button>`).join('');

document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.room) { sel = { kind: 'room', id: t.dataset.room }; return commit(); }
  if (t.dataset.add) return addFurn(t.dataset.add);
  if (t.dataset.tool) return setTool(t.dataset.tool);
});

// ---------- Header ----------
$('undo').onclick = doUndo;
$('redo').onclick = doRedo;
$('name').addEventListener('change', e => { home.name = e.target.value.trim() || 'My home'; commit(); });
$('newBlank').onclick = () => { const b = JSON.stringify(home); home = blankHome(); sel = null; record(b); commit(); fit(); };
$('tpl2bhk').onclick = () => { const b = JSON.stringify(home); home = template2bhk(); sel = null; record(b); commit(); fit(); $('name').value = home.name; };
$('mode2').onclick = () => setView('2d');
$('mode3').onclick = () => setView('3d');
$('exportJson').onclick = () => download(`${home.name}.roomcraft.json`, 'application/json', JSON.stringify(home, null, 2));
$('exportPng').onclick = () => {
  if (view === '3d') { three.renderer.render(three.scene, three.camera); return download('home-3d.png', 'image/png', three.c.toDataURL('image/png'), true); }
  download('home-floor-plan.png', 'image/png', cv.toDataURL('image/png'), true);
};
$('importJson').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!Array.isArray(obj.rooms) || !Array.isArray(obj.furn)) throw new Error('bad');
      home = obj; sel = null; undoStack.length = 0; redoStack.length = 0;
      $('name').value = home.name || 'My home'; commit(); fit();
      setStatus('Project imported');
    } catch { setStatus('Import failed: that file is not a RoomCraft project'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

function download(name, type, data, isUrl = false) {
  const a = document.createElement('a');
  a.download = name;
  a.href = isUrl ? data : URL.createObjectURL(new Blob([data], { type }));
  a.click();
  if (!isUrl) setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

window.addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea')) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (e.code === 'Space') { spaceDown = true; e.preventDefault(); }
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
  else if (mod && k === 'y') { e.preventDefault(); doRedo(); }
  else if (mod && k === 'd') { e.preventDefault(); duplicate(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSel(); }
  else if (k === 'r' && !mod) { if (sel?.kind === 'furn') rotateSel(); else setTool('room'); }
  else if (k === 'v' && !mod) setTool('select');
  else if (e.key === 'Escape') { sel = null; setTool('select'); commit(); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
window.addEventListener('resize', () => { render(); if (view === '3d') resize3D(); });

// ---------- 3D ----------
function init3D() {
  const c = $('three');
  const renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3efe7');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  const controls = new OrbitControls(camera, c);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight('#ffffff', '#b8a88a', 1.2));
  const sun = new THREE.DirectionalLight('#fff6e8', 1.6);
  sun.position.set(6, 12, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, far: 60 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#e9e2d4' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.005; ground.receiveShadow = true;
  scene.add(ground);
  const group = new THREE.Group(); scene.add(group);
  three = { renderer, scene, camera, controls, group, c };
  const loop = () => {
    requestAnimationFrame(loop);
    if (view !== '3d') return;
    controls.update(); renderer.render(scene, camera);
  };
  loop();
}
function resize3D() {
  if (!three) return;
  const w = $('three').parentElement.clientWidth, h = $('three').parentElement.clientHeight;
  three.renderer.setSize(w, h, false);
  three.camera.aspect = w / h; three.camera.updateProjectionMatrix();
}
function rebuild3D() {
  if (!three) return;
  const { group } = three;
  group.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  group.clear();
  const b = bounds(); if (!b) return;
  const ox = (b.x0 + b.x1) / 2, oz = (b.y0 + b.y1) / 2;
  const add = (w, h, d, color, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  };
  const t = 0.12;
  for (const r of home.rooms) {
    const cx = (r.x + r.w / 2 - ox) * M, cz = (r.y + r.h / 2 - oz) * M;
    const W = r.w * M, D = r.h * M, H = (r.wallH || 280) * M;
    add(W, 0.02, D, r.floor, cx, 0.01, cz);
    add(W + t, H, t, r.wall, cx, H / 2, cz - D / 2);
    add(W + t, H, t, r.wall, cx, H / 2, cz + D / 2);
    add(t, H, D, r.wall, cx - W / 2, H / 2, cz);
    add(t, H, D, r.wall, cx + W / 2, H / 2, cz);
  }
  for (const f of home.furn) {
    add(f.w * M, f.h * M, f.d * M, f.color, (f.x - ox) * M, f.h * M / 2, (f.y - oz) * M, -f.rot * Math.PI / 180);
  }
}
function frame3D() {
  const b = bounds() || { x0: 0, y0: 0, x1: 500, y1: 500 };
  const s = Math.max(b.x1 - b.x0, b.y1 - b.y0) * M;
  three.controls.target.set(0, 0, 0);
  three.camera.position.set(s * 0.45, s * 1.5, s * 0.75);
  three.controls.update();
}
function setView(v) {
  view = v;
  $('plan').hidden = v === '3d';
  $('three').hidden = v !== '3d';
  $('mode2').classList.toggle('on', v === '2d');
  $('mode3').classList.toggle('on', v === '3d');
  if (v === '3d') { if (!three) init3D(); resize3D(); rebuild3D(); frame3D(); }
  else render();
}

// ---------- Start ----------
$('name').value = home.name;
setTool('select');
setStatus('All changes saved');
fit();
renderPanel();
renderRoomList();

# RoomCraft 2.0 — Advanced Features & Exhibition Edition

<p align="center">
  **Intelligent Architectural Floor Planner & 3D Interactive Design Studio**
</p>

<p align="center">
  RoomCraft 2.0 transforms virtual home design into an intelligent, exhibition-grade platform suitable for technology showcases, academic juries, and professional interior design demonstrations. Powered by Three.js, Canvas 2D drafting, and deterministic geometric algorithms — completely client-side with zero external API dependencies.
</p>

---

## 🌟 What's New in RoomCraft 2.0

RoomCraft 2.0 introduces 15 major engineering and architectural modules:

1. **Module 1: Smart Room Makeover** — 8 curated architectural styles (*Modern Luxury, Minimalist, Scandinavian, Industrial, Contemporary, Bohemian, Traditional Indian, Japandi*) with one-click wall finishes, procedural flooring, furniture color harmonies, lighting adjustments, before/after comparisons, and design variation snapshots.
2. **Module 2: First-Person 3D Walkthrough** — Immersive eye-level (1.6m) exploration with WASD movement, pointer-lock mouse look, continuous collision detection with sliding wall physics, furniture AABB bounding hulls, doorway navigation, interactive minimap HUD, and smooth room-to-room camera tours.
3. **Module 3: Intelligent Furniture Layout Engine** — Rule-based geometric optimization engine generating *Space-Saving*, *Architectural Balance*, and *Ergonomic Comfort* layouts with efficiency scores (0–100), free floor area calculation, and architectural rationales.
4. **Module 4: Smart Lighting Simulator** — Realistic solar and ambient simulation (*Morning, Afternoon, Sunset, Night*) with adjustable sun and ambient intensities, warm/neutral/cool Kelvin temperatures (2700K–6500K), interior ceiling spotlights, and real-time PCF soft shadows.
5. **Module 5: Material and Texture Studio** — Procedural PBR material library with 7 flooring types (*Oak Wood, Walnut Wood, Italian Marble, Ceramic Tile, Micro-Cement, Slate Stone, Woven Carpet*) and 6 wall treatments (*Crisp White, Champagne Eggshell, Venetian Stucco, Exposed Brick, Board-Formed Concrete, Acoustic Timber Slats*).
6. **Module 6: Multi-Floor Architecture** — Multi-level building support (*Ground Floor, Level 1, Level 2*) with elevation calculations, independent floor editing in 2D and 3D, architectural staircases, building-wide stacked 3D visualization, and single-floor isolation.
7. **Module 7: Professional Blueprint CAD Mode** — High-contrast technical drafting mode with wall thickness hatching, CAD symbols (*doors with swing arcs, windows, bed pillows, sofas*), dimension strings, metric scale bars (1:50), North compass, and high-resolution export.
8. **Module 8: Axonometric Exploded Building View** — Interactive vertical layer separation of roofs, interior partition walls, furniture, and foundation floor slabs using smooth easing animations and live 3D scene objects.
9. **Module 9: Interior Budget Planner** — Comprehensive cost projection engine in INR (₹) itemizing furniture, flooring surfaces, wall paints, electrical lighting points, soft furnishings, site labour, and contingencies with editable unit rates.
10. **Module 10: Design Quality Analyzer** — Mathematical architectural evaluation rating space utilization, furniture collision overlaps, circulation clearances (60–90cm), door swing accessibility, and quadrant visual balance out of 100 with actionable warnings and tips.
11. **Module 11: Visual Moodboard Generator** — Generates complete design moodboard cards per room with 5-swatch color palettes, material cards, curated furniture inventories, lighting profiles, and one-click high-res PNG export.
12. **Module 12: Design Comparison Studio** — Save multiple project versions and evaluate side-by-side variations with budget differences, quality score differentials, and instant one-click restoration.
13. **Module 13: Project Presentation Mode** — Exhibition demonstration mode featuring full-screen 3D view, clutter-free glassmorphic HUD, cinematic automated room tour, room dimension cards, and built-in *Skyline Grand Villa Showcase Project*.
14. **Module 14: WebXR AR / VR Immersive Preview** — Feature detection for `immersive-vr` and `immersive-ar`, WebXR headset sessions, and graceful fallback with 360° device gyroscope orientation controls.
15. **Module 15: Advanced Project Management** — Multi-project index, thumbnail previews, auto-save with debounced persistence, JSON schema validation, and high-resolution PNG export up to 4x scaling.

---

## 🛠️ Technology Stack

- **Core Framework**: Vite 5.4, Vanilla JavaScript (ES Modules)
- **3D Graphics & Physics**: Three.js (r160), OrbitControls, WebGLRenderer, PCFSoftShadowMap, ACESFilmicToneMapping
- **2D Drafting & CAD**: HTML5 Canvas API, High-DPI Pixel Ratio Scaling, Path2D
- **Procedural Textures**: Off-screen Canvas Procedural PBR Generators (zero external image asset lag)
- **Persistence**: Browser LocalStorage & IndexedDB with JSON serialization
- **Styling**: Bright ivory/cream architectural palette, responsive CSS Grid & Flexbox, Glassmorphism HUD

---

## 🏗️ System Architecture

```
RoomCraft/
├── index.html                   # HTML5 Shell with Header, Viewports, HUDs, and Modals
├── package.json                 # Vite + Three.js configuration
├── src/
│   ├── main.js                  # Application Controller, UI coordinator & event wiring
│   ├── style.css                # Premium cream & ivory exhibition styling
│   ├── core/
│   │   ├── constants.js         # Furniture catalog, styles, materials, lighting presets, rates
│   │   ├── geometry.js          # Collision detection, AABB hulls, clearance & balance math
│   │   └── state.js             # Data model, floor management, templates & normalization
│   └── modules/
│       ├── threeScene.js        # Three.js 3D rendering engine, meshes & shadows
│       ├── textureGen.js        # Procedural canvas textures (wood, marble, tile, brick, stucco)
│       ├── walkthrough.js       # First-person WASD walkthrough, collision & minimap
│       ├── makeover.js          # Smart Room Makeover engine & style rules
│       ├── layoutEngine.js      # Rule-based layout optimizer (Space-saving, Balanced, Comfort)
│       ├── lighting.js          # Solar & interior lighting simulation engine
│       ├── materials.js         # Material and texture studio & combo manager
│       ├── floors.js            # Multi-floor architecture manager
│       ├── blueprint.js         # Technical drafting CAD mode & dimensions
│       ├── explodedView.js      # Axonometric exploded building view controller
│       ├── budget.js            # Interior budget planner in INR (₹)
│       ├── analyzer.js          # Deterministic room design quality analyzer (0-100)
│       ├── moodboard.js         # Moodboard generator & high-res export
│       ├── comparison.js        # Design variations comparison engine
│       ├── presentation.js      # Fullscreen exhibition showcase tour
│       ├── xr.js                # WebXR AR/VR preview & gyroscope fallback
│       └── projects.js          # Multi-project portfolio manager & JSON/PNG export
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18+ recommended)
- npm or yarn

### Installation

```bash
git clone https://github.com/laharisadimala-spec/RoomCraft.git
cd RoomCraft
npm install
```

### Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🎮 Navigation & Keyboard Controls

| Shortcut | Action |
|---|---|
| **V** | Select & Move tool |
| **R** | Draw Room (or Rotate selected furniture 90°) |
| **D** | Place Door opening |
| **W** | Place Window aperture |
| **Space + Drag** / **Middle Click** | Pan 2D Canvas |
| **Mouse Wheel** | Zoom In / Out |
| **Ctrl + Z** | Undo last action |
| **Ctrl + Y** | Redo last action |
| **Ctrl + D** | Duplicate selected room or furniture |
| **Delete** / **Backspace** | Remove selected item |
| **W, A, S, D** / **Arrows** | Walk in First-Person Walkthrough mode |
| **Shift** | Sprint in Walkthrough mode |
| **Escape** | Deselect item / Exit Walkthrough / Exit Presentation |

---

## 🏛️ Built-In Showcase Templates

- **Skyline Grand Villa — Exhibition Edition**: A multi-floor duplex penthouse featuring a double-height Grand Salon, gourmet kitchen island, guest suite, master penthouse suite, spa ensuite, walk-in dressing room, sky terrace, and connecting architectural staircase.
- **Contemporary 2BHK Apartment**: A practical residential layout featuring a living lounge, kitchen/dining, master bedroom, guest bedroom, and master bathroom.
- **Blank Canvas**: Clean drafting board for custom architectural planning.

---

## 📄 License & Attribution

Developed with Google DeepMind Advanced Agentic Coding for the RoomCraft Exhibition Edition.
Open-source under the MIT License.

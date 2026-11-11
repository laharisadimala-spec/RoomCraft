# RoomCraft — Professional Interior Design Studio

<p align="center">
  **Premium, Elegant & Commercial Interior-Design Desktop Application**
</p>

<p align="center">
  A high-fidelity virtual home design application featuring Three.js 3D rendering, interactive 2D drafting, and rule-based layout optimization. Built with a focus on restrained elegance, generous workspace, and professional desktop ergonomics.
</p>

---

## 🎨 Design System & Visual Language

- **Palette**: Warm ivory (`#F8F6F1`), soft white (`#FFFFFF`), warm grey (`#EAE7E0`), charcoal typography (`#34332F`), muted sage (`#8B9B83`), soft terracotta (`#C58D72`), and warm architectural wood (`#8A6D4B`).
- **Typography**: Inter sans-serif font family with precise letter-spacing and hierarchy.
- **Micro-Interactions**: Smooth 140ms–220ms transitions, subtle collapsible sidebars, and soft tactile feedback on tools and cards.
- **Maximized Canvas**: Svelte 260px sidebars with one-click chevron collapse (`◀` / `▶`) giving up to 100% full-screen width to the 3D apartment.

---

## 🧭 Workspace Architecture

### 1. Minimal Top Navigation
- **Left**: RoomCraft architectural logo, editable project name, live auto-save status (`✓ Saved`).
- **Center**: Primary 3-mode segmented switcher (`2D Plan`, `3D Studio`, `Walkthrough`).
- **Right**: Undo/Redo (`↶` / `↷`), `Preview` (fullscreen showcase tour), `Export` (PNG 2D/3D, CAD Blueprint, JSON), and `Project Details`.

### 2. Collapsible 4-Category Sidebar
- **A. Rooms**: Room library, drafting tools (Select, Draw Room `R`, Add Door `D`, Add Window `W`), active level room list with dimensions, and starter templates (*Skyline Penthouse Showcase, Contemporary 2BHK, Blank Canvas*).
- **B. Furniture**: Categorized library (*Living, Bedroom, Dining, Office, Bath, Architecture*), keyword search bar, and clean furniture cards with dimensions and pricing in INR (₹).
- **C. Design**: 8 curated interior architectural styles (*Modern Luxury, Minimalist, Scandinavian, Industrial, Contemporary, Bohemian, Traditional Indian, Japandi*) with live palette swatches and high-resolution **Room Moodboard** export.
- **D. Smart Tools**: 1-click geometric layout optimization (*Space-Saving*, *Architectural Balance*, *Ergonomic Comfort*) combined with deterministic **Design Quality Analysis** ($0\text{--}100$ score, clearance checks, and collision detection).

### 3. Contextual Right Inspector
- **Room Selected**: Dimensions ($W \times L$), wall height, floor/wall material pickers, color tints, calculated area in $\text{m}^2$ and $\text{sq.ft}$, duplicate, and delete.
- **Furniture Selected**: Label, dimensions ($W \times D \times H$), rotation ($90^\circ$ and custom angle), color tint, estimated unit price (₹), duplicate, and delete.
- **Nothing Selected**:
  - In **2D**: Level overview, room count, total built-up area, and drafting shortcuts.
  - In **3D**: Solar lighting ambiance presets, warmth, sun intensity slider, and soft shadows toggle.
  - In **Walkthrough**: Movement guides and interactive minimap.

### 4. Minimal Canvas Floating Docks
- **2D Plan**: Floating pill `[ Floor Plan | Blueprint CAD ]`, Fit View button, and zoom controls.
- **3D Studio**: Floating dock with Day/Night solar ambiance presets (`Afternoon Daylight`, `Morning Sun`, `Sunset Dusk`, `Night Mode`), **Axonometric Exploded View** slider, and camera reset.

### 5. Secondary Project Details Modal
- **Interior Budget Planner**: Local cost estimation system in INR (₹) covering furniture, flooring surfaces, wall paints, electrical lighting points, soft furnishings, site installation labour, and contingencies.
- **Portfolio & Variations**: Save, compare, and restore design variations.
- **Building Levels**: Multi-floor elevations and staircase placement.

---

## 🛠️ Technology Stack

- **Core**: Vite 5.4, Vanilla JavaScript (ES Modules)
- **3D Graphics**: Three.js (r160), OrbitControls, PCFSoftShadowMap, ACESFilmicToneMapping
- **2D & CAD**: HTML5 Canvas API, Path2D, High-DPI Scaling
- **Textures**: Procedural PBR Canvas Generators (diffuse + bump maps)
- **Persistence**: Browser LocalStorage with automatic debounced saving

---

## 🚀 Getting Started

```bash
git clone https://github.com/laharisadimala-spec/RoomCraft.git
cd RoomCraft
npm install
npm run dev
```

Build for production:
```bash
npm run build
npm run preview
```

---

## 📄 License & Attribution

Developed for RoomCraft Professional Interior Design Studio. Open-source under the MIT License.

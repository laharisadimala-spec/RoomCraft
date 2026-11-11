# RoomCraft — Virtual Home Designer

<p align="center">
  **Simple, Intelligent & Professional Interior Design Platform**
</p>

<p align="center">
  A streamlined, cohesive browser-based home design studio built with Three.js and Canvas. Designed with a focus on simplicity, usability, and realistic 3D architectural rendering — completely client-side without clutter or external backend dependencies.
</p>

---

## 🧭 Simplified Workspace Architecture

RoomCraft provides three core workspace modes with minimal clutter:

1. **2D Floor Planner**: Interactive plan drafting with room boundaries, dimensions, area measurements, door/window openings, furniture positioning, and an integrated **Technical Blueprint CAD** view toggle with architectural wall hatching and scale indicators.
2. **3D Interior Studio**: High-fidelity architectural 3D rendering with procedural PBR materials (Oak, Walnut, Carrara Marble, Ceramic, Micro-Cement, Slate Stone), realistic baseboards, procedural surface bump maps, dynamic day/night solar lighting (*Morning, Afternoon, Sunset, Night*), soft PCF shadows, and an integrated **Axonometric Exploded View**.
3. **Virtual Walkthrough**: Immersive first-person eye-level ($1.6\,\text{m}$) exploration with WASD movement, pointer-lock mouse look, continuous collision detection against walls and furniture, doorway navigation, and an interactive minimap HUD.

---

## 🗂️ Focused 4-Section Editing Sidebar

- **Rooms & Walls**: Quick room creation tools, wall openings (Doors, Windows), and room list with area statistics.
- **Furniture Library**: Categorized library (*Living, Bedroom, Dining, Office, Bath, Architecture*) with dimensions and pricing.
- **Design & Materials**: Combined Design Studio featuring 8 architectural styles (*Modern Luxury, Minimalist, Scandinavian, Industrial, Contemporary, Bohemian, Traditional Indian, Japandi*) with palettes, material specifications, and visual moodboard generation.
- **Smart Tools**: Intelligent Layout Optimizer (*Space-Saving, Balanced, Comfort-Focused*) combined with a deterministic Design Quality Analyzer ($0\text{--}100$ score, clearance checks, and collision detection).

---

## 🎛️ Contextual Properties & Secondary Project Details

- **Contextual Inspector**: The right sidebar automatically displays relevant controls for selected rooms (dimensions, wall/floor materials, colors) or furniture pieces (dimensions, rotation, color tint, unit price). When nothing is selected, it presents clean room statistics or 3D lighting ambiance settings.
- **Project Details Area**: Secondary workspace containing the **Interior Budget Planner** (itemized breakdown in INR ₹ across materials, furniture, lighting, labour, and contingency), **Portfolio & Design Variations**, and **Multi-Floor Building Settings**.
- **Streamlined Top Navigation**: Contains only the brand logo, editable project name, save indicator, undo/redo, the 3 workspace mode switchers, presentation preview, export dialog, and save/details.

---

## 🛠️ Technology Stack

- **Core**: Vite 5.4, Vanilla JavaScript (ES Modules)
- **3D Graphics**: Three.js (r160), OrbitControls, PCFSoftShadowMap, ACESFilmicToneMapping
- **2D & CAD**: HTML5 Canvas API, Path2D, High-DPI Scaling
- **Textures**: Procedural PBR Canvas Generators (diffuse + bump maps)
- **Storage**: Browser LocalStorage with automatic debounced saving

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

Developed for RoomCraft Virtual Home Designer. Open-source under the MIT License.

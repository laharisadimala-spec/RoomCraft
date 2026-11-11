# RoomCraft – Virtual Home Designer

A working browser app for sketching a home floor plan, placing furniture, and viewing the same home in 3D.

## Run it

1. Extract the ZIP and open the `RoomCraft` folder in VS Code.
2. Install Node.js 18 or newer if you don't have it: https://nodejs.org
3. In the VS Code terminal, run:
   ```
   npm install
   npm run dev
   ```
4. Open the address shown (usually http://localhost:5173).

## Using it

- **Draw room**: press R (or the sidebar button), then drag on the plan. Rooms snap to 10 cm.
- **Select and move**: click a room or furniture and drag it. Moving a room carries the furniture inside it.
- **Furniture**: pick an item from "Add furniture". It appears in the selected room (or the last room).
- **Edit**: the right panel edits names, sizes, wall/floor colours, positions and rotation.
- **Rotate**: press R with furniture selected, or use the panel button.
- **Delete**: press Delete. Deleting a room also deletes the furniture inside it.
- **Undo / redo**: Ctrl+Z and Ctrl+Y (or Ctrl+Shift+Z).
- **Pan and zoom**: drag empty space (or hold Space), and scroll the mouse wheel.
- **3D**: click 3D in the top bar. Drag to orbit, scroll to zoom. The 3D view updates from the same data as the 2D plan.
- **Save**: changes autosave in your browser. Use "Save JSON" to keep a file, and "Open JSON" to reload one.
- **Export**: "Export PNG" saves the current 2D plan or 3D view.

## Troubleshooting

- **Blank 3D view**: your browser needs WebGL. Try a current Chrome, Edge or Firefox.
- **Project didn't save**: browser storage may be full or disabled. Use "Save JSON" as a backup.
- **`npm` not found**: install Node.js, then reopen VS Code.
- **Port in use**: run `npm run dev -- --port 5180`.

## Current limitations

- One floor only. Multi-floor design is not included yet.
- Furniture is simple box shapes, not detailed 3D models.
- Walls belong to each room. Shared walls between two rooms draw twice.
- No doors or windows yet. No wall-by-wall editing and no textures.
- No collision warnings and no clamping of furniture to room boundaries.
- Storage uses browser localStorage, so a project lives in one browser. Use JSON export to move it.
- No dashboard or project list. The app opens straight into the workspace.
- Templates: one 2BHK template. Blank start is available.

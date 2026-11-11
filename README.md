# RoomCraft — Virtual Home Designer

<p align="center">
  **Design Your Space. Visualize Your Ideas. Build Your Dream Home.**
</p>

<p align="center">
  A browser-based virtual home design application that allows users to create room layouts, arrange furniture, customize interiors, and visualize their designs in interactive 2D and 3D environments.
</p>

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [How RoomCraft Works](#how-roomcraft-works)
- [2D and 3D Visualization](#2d-and-3d-visualization)
- [Data Management](#data-management)
- [Installation and Setup](#installation-and-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Application Workflow](#application-workflow)
- [Advantages](#advantages)
- [Limitations](#limitations)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## 1. Overview

**RoomCraft** is an interactive virtual home design application developed to simplify the process of planning and visualizing interior spaces.

Traditional interior design planning often requires manual sketches, physical measurements, expensive software, or professional assistance. RoomCraft provides a browser-based alternative where users can experiment with room layouts and furniture arrangements in a visual environment.

The application provides a 2D design workspace and an interactive 3D visualization environment, allowing users to understand how their room designs may look from different perspectives.

Users can create rooms, add and customize furniture, modify object properties, save their designs, and export their work.

RoomCraft is developed using HTML5, CSS3, JavaScript, Canvas API, Three.js and Vite.

The application works directly in the browser without requiring a dedicated backend server or database.

## 2. Problem Statement

Planning an interior space can be challenging because users often struggle to visualize how furniture, room dimensions, and different arrangements will work together.

Some common problems include:

- Difficulty visualizing a room before arranging furniture.
- Lack of accessible interior design tools for beginners.
- Time-consuming manual floor-plan creation.
- Difficulty experimenting with different furniture arrangements.
- Limited ability to understand a design through 2D drawings alone.
- Dependence on expensive or complicated design applications.

**Proposed Solution:**

RoomCraft addresses these challenges by providing an accessible virtual design workspace where users can create, modify, and visualize room layouts using interactive 2D and 3D representations.

## 3. Project Objectives

The primary objectives are:

1. Develop an interactive browser-based room design application.
2. Provide an easy-to-use 2D room planning workspace.
3. Enable interactive 3D visualization of room layouts.
4. Allow users to add, position, modify, duplicate, and remove furniture.
5. Provide tools for editing object properties.
6. Implement undo and redo functionality.
7. Support saving and reopening project designs.
8. Enable users to export their completed designs.
9. Maintain a lightweight architecture without requiring backend infrastructure.

## 4. Key Features

### 4.1 Interactive Room Creation

Users can create and work with room layouts through the design workspace.

RoomCraft provides a visual environment for planning interior spaces and experimenting with different arrangements.

### 4.2 Furniture Placement

Users can add furniture objects to their room designs and position them according to their requirements.

Furniture arrangement helps users experiment with different interior configurations.

### 4.3 Furniture Customization

The application provides property-editing functionality for modifying selected design objects.

Users can adjust available object properties to customize their room arrangements.

### 4.4 2D Design Workspace

The 2D workspace provides a top-down representation of the room.

It allows users to work with object placement and room layouts through a canvas-based interface.

### 4.5 Interactive 3D Visualization

RoomCraft uses Three.js and WebGL to display room designs in a three-dimensional environment.

Users can inspect their designs from different perspectives using camera controls.

### 4.6 Undo and Redo

Undo and redo functionality allows users to move backward and forward through design changes.

This makes experimentation easier and reduces the risk of losing previous arrangements.

### 4.7 Zoom and Pan

Users can navigate the design workspace using zoom and pan interactions.

This helps when working with larger layouts or adjusting smaller details.

### 4.8 Duplicate and Delete

Users can duplicate existing objects to create repeated furniture arrangements.

Unwanted objects can also be removed from the design.

### 4.9 Save and Open Designs

RoomCraft supports saving and reopening designs through JSON project files.

This makes it possible to continue working on previously created room layouts.

### 4.10 Automatic Local Storage

The application uses browser LocalStorage to retain supported design data locally.

This allows saved application state to remain available after refreshing or reopening the browser, subject to browser storage availability.

### 4.11 PNG Export

Users can export their design workspace as an image in PNG format.

This makes it easier to share or document completed room layouts.

### 4.12 Room Templates

Available room templates provide starting points for creating designs without beginning with a completely empty workspace.

---

## 5. Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling and layout |
| JavaScript ES6+ | Application logic and interactions |
| Canvas API | 2D rendering and drawing |
| Three.js | 3D scene rendering |
| WebGL | Hardware-accelerated 3D graphics |
| LocalStorage | Local browser data persistence |
| JSON | Design data storage and exchange |
| Vite | Development server and build tooling |
| npm | Package and dependency management |

### Why These Technologies?

**HTML5:** Provides the structural foundation of the application.

**CSS3:** Handles the visual presentation, layout, and interface styling.

**JavaScript:** Controls user interactions, object management, design operations, and application logic.

**Canvas API:** Enables dynamic drawing and rendering of the 2D workspace.

**Three.js:** Simplifies the creation and management of 3D scenes, objects, lighting, and cameras.

**WebGL:** Enables rendering of interactive 3D graphics in supported browsers.

**LocalStorage:** Provides browser-based persistence without requiring an external database.

**Vite:** Provides a fast development environment and production build process.

---

## 6. System Architecture

RoomCraft follows a client-side application architecture.

The application operates within the user's browser and separates the main responsibilities into different functional layers.

### Architecture Overview

```text
              USER
                |
                v
       ROOMCRAFT INTERFACE
                |
                v
       APPLICATION LOGIC
                |
       +--------+--------+
       |                 |
       v                 v
   2D DESIGN         3D VISUALIZATION
   ENGINE              ENGINE
       |                 |
       v                 v
   CANVAS API          THREE.JS
       |                 |
       +--------+--------+
                |
                v
         DESIGN STATE
                |
       +--------+--------+
       |                 |
       v                 v
   LOCAL STORAGE      JSON FILES
       |                 |
       v                 v
  AUTO PERSISTENCE   SAVE / OPEN
```

### Architecture Explanation

**1. User Interface Layer**

Provides the interface through which users interact with RoomCraft.

**2. Application Logic Layer**

Processes user actions such as adding furniture, changing object properties, duplicating objects, and deleting objects.

**3. 2D Rendering Layer**

Uses the Canvas API to display the room layout and its objects.

**4. 3D Rendering Layer**

Uses Three.js and WebGL to visualize the room in three dimensions.

**5. Design State Management**

Maintains the current design information so that the 2D and 3D representations can reflect the same room configuration.

**6. Persistence Layer**

Uses LocalStorage and JSON files to retain and transfer design information.

---

## 7. How RoomCraft Works

The general working process can be divided into the following steps.

### Step 1: Application Initialization

When the application starts, the browser loads the HTML, CSS, and JavaScript resources.

Vite serves the application during development.

### Step 2: Workspace Initialization

The application initializes the design workspace and its rendering components.

The 2D canvas and 3D visualization environment are prepared for user interaction.

### Step 3: Room Design

Users create or select a room layout and begin arranging furniture.

### Step 4: Object Manipulation

Users can select furniture and perform operations such as:

- Positioning objects.
- Editing available properties.
- Duplicating objects.
- Removing objects.

### Step 5: Rendering

The application displays the design through its 2D and 3D visualization systems.

The 2D workspace provides a top-down view, while the 3D workspace provides spatial visualization.

### Step 6: Saving

Users can save their work through the supported JSON export and local persistence functionality.

### Step 7: Exporting

The completed design can be exported as a PNG image for future reference.

---

## 8. 2D and 3D Visualization

One of the main aspects of RoomCraft is its combination of 2D design and 3D visualization.

### 2D Visualization

The Canvas API provides a drawing surface where the application can render the room layout and furniture objects.

It is useful for:

- Understanding furniture positions.
- Planning room arrangements.
- Working with a top-down layout.
- Modifying object placement.

### 3D Visualization

Three.js provides the framework for displaying the room in a three-dimensional environment.

A typical Three.js rendering setup consists of:

- Scene: Contains the objects and environment.
- Camera: Determines the viewing perspective.
- Renderer: Displays the scene.
- Geometry: Defines the shapes of objects.
- Materials: Determine object appearance.
- Lighting: Helps create a visible 3D environment.

The 3D camera controls allow users to inspect their design from different viewing angles.

---

## 9. Data Management

RoomCraft uses client-side data management.

### LocalStorage

LocalStorage provides a browser-based mechanism for retaining application data.

Unlike temporary JavaScript variables, LocalStorage data can persist between browser sessions.

### JSON Project Files

JSON provides a structured format for saving and reopening room designs.

A conceptual design representation may contain:

```json
{
  "project": "RoomCraft",
  "room": {
    "width": 500,
    "height": 400
  },
  "objects": [
    {
      "type": "furniture",
      "position": {
        "x": 100,
        "y": 120
      }
    }
  ]
}
```

This is an illustrative representation of design data, not necessarily the application's exact internal JSON schema.

### Why No Backend?

RoomCraft is designed to operate as a client-side application.

This approach provides several benefits:

- No server installation required.
- No database configuration required.
- No authentication system required.
- Reduced infrastructure complexity.
- Designs can be managed locally.

Note: LocalStorage is browser-specific. It does not automatically synchronize designs between different devices.

---

## 10. Installation and Setup

### Prerequisites

Before running RoomCraft, ensure the following are installed:

- Node.js (LTS recommended)
- npm
- A modern web browser
- Git (optional, for cloning the repository)

### Clone the Repository

```bash
git clone https://github.com/laharisadimala-spec/RoomCraft.git
```

### Navigate to the Project

```bash
cd RoomCraft
```

### Install Dependencies

```bash
npm install
```

This installs the packages defined in the project's package manifest.

---

## 11. Running the Application

### Development Mode

```bash
npm run dev
```

Vite starts the local development server and displays the local URL in the terminal.

Open that URL in your browser to use RoomCraft.

### Production Build

```bash
npm run build
```

This generates the optimized production build in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

This allows you to preview the production build locally.

---

## 12. Project Structure

The main project files include:

```text
RoomCraft/
│
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
│
└── src/
    ├── main.js
    └── style.css
```

Additional files and assets may be present depending on the complete project implementation.

### Important Files

| File | Responsibility |
|---|---|
| `index.html` | Main HTML entry point |
| `src/main.js` | Main JavaScript application logic |
| `src/style.css` | Application styling |
| `package.json` | Project metadata and dependencies |
| `package-lock.json` | Dependency version lockfile |
| `.gitignore` | Excludes generated and sensitive files |
| `README.md` | Project documentation |

---

## 13. Application Workflow

The typical user workflow is:

1. Open RoomCraft in a browser.
2. Enter the room design workspace.
3. Select a room template or create a layout.
4. Add furniture to the design.
5. Position and customize the furniture.
6. Use zoom and pan to navigate the workspace.
7. Switch to the 3D visualization to inspect the room.
8. Make additional adjustments if required.
9. Undo or redo changes when necessary.
10. Save the project or export the design as a PNG.

---

## 14. Advantages

- Easy-to-use browser-based interface.
- No dedicated backend infrastructure.
- Interactive 2D and 3D visualization.
- Supports experimentation with furniture arrangements.
- Local design persistence.
- JSON-based project portability.
- PNG image export.
- Reduced dependence on traditional manual floor-plan sketches.
- Uses widely adopted web technologies.

---

## 15. Limitations

The current client-side architecture has some limitations:

- Designs stored in LocalStorage are not automatically synchronized across devices.
- There is no centralized cloud database.
- Browser storage capacity is limited.
- 3D rendering performance depends on the user's hardware and browser.
- The application is a visualization and planning tool, not a professional architectural CAD system.
- Real-world construction measurements and structural validation require separate professional tools.

---

## 16. Future Enhancements

RoomCraft can be extended with several additional capabilities:

**1. Cloud-Based Project Storage**

Introduce cloud storage to allow users to access their designs across devices.

**2. User Authentication**

Provide personal accounts and private project management.

**3. Advanced Furniture Library**

Add more furniture models, textures, materials, and customization options.

**4. Advanced 3D Rendering**

Introduce improved lighting, shadows, textures, and realistic material rendering.

**5. Measurement Tools**

Add more advanced dimensioning and measurement capabilities.

**6. Collaborative Design**

Allow multiple users to work on the same room design.

**7. AI-Assisted Interior Design**

Explore automated furniture recommendations and layout suggestions.

**8. Mobile Optimization**

Improve the design workspace for touch-based mobile interactions.

---

## 17. Contributing

Contributions and suggestions are welcome.

To contribute:

1. Fork the repository.
2. Create a new feature branch.
3. Implement your changes.
4. Test the application.
5. Submit a pull request with a clear description.

---

## 18. License

This project is developed as an educational and practical web technology project.

A formal open-source license can be added to specify permissions for redistribution and modification.

---

## 19. Author

**Developed by: Lahari Sadimala**

GitHub: [@laharisadimala-spec](https://github.com/laharisadimala-spec)

Project Repository: [RoomCraft](https://github.com/laharisadimala-spec/RoomCraft)

---

<p align="center">
  **RoomCraft — Turn Your Ideas Into Spaces.**
</p>

<p align="center">
  Designed to make room planning more visual, interactive, and accessible.
</p>
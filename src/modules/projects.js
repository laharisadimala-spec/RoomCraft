import { PROJECTS_LIST_KEY, STORAGE_KEY } from '../core/constants.js';
import { normalizeHome, template2bhk, templateExhibitionShowcase } from '../core/state.js';

export class ProjectManager {
  constructor(onProjectChangeCallback) {
    this.onChange = onProjectChangeCallback;
    this.autoSaveTimer = null;
    this.projectsIndex = this.loadIndex();
  }

  loadIndex() {
    try {
      const data = localStorage.getItem(PROJECTS_LIST_KEY);
      if (data) return JSON.parse(data);
    } catch {}

    // Initial default index
    const defaultIndex = [
      {
        id: 'proj_2bhk',
        name: 'Contemporary 2BHK Apartment',
        updatedAt: new Date().toISOString(),
        roomCount: 5,
        floorCount: 1,
        thumbnail: null
      },
      {
        id: 'proj_exhibition',
        name: 'Skyline Grand Villa — Exhibition Edition',
        updatedAt: new Date().toISOString(),
        roomCount: 8,
        floorCount: 2,
        thumbnail: null
      }
    ];
    this.saveIndex(defaultIndex);
    return defaultIndex;
  }

  saveIndex(index) {
    this.projectsIndex = index;
    try {
      localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(index));
    } catch {}
  }

  getProjects() {
    return this.projectsIndex;
  }

  // Load a project by ID
  loadProject(projectId) {
    if (projectId === 'proj_exhibition') {
      const home = templateExhibitionShowcase();
      return home;
    }
    if (projectId === 'proj_2bhk') {
      const home = template2bhk();
      return home;
    }

    try {
      const raw = localStorage.getItem(`roomcraft_proj_${projectId}`);
      if (raw) return normalizeHome(JSON.parse(raw));
    } catch {}

    return template2bhk();
  }

  // Save active project and update its index entry & thumbnail
  saveProject(home, thumbnailDataUrl = null) {
    const currentId = home.id || 'proj_active';
    home.id = currentId;
    home.updatedAt = new Date().toISOString();

    try {
      localStorage.setItem(`roomcraft_proj_${currentId}`, JSON.stringify(home));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(home));

      // Update index
      let entry = this.projectsIndex.find(p => p.id === currentId);
      if (!entry) {
        entry = { id: currentId, name: home.name };
        this.projectsIndex.unshift(entry);
      }
      entry.name = home.name;
      entry.updatedAt = home.updatedAt;
      entry.roomCount = home.rooms.length;
      entry.floorCount = (home.floors || []).length;
      if (thumbnailDataUrl) {
        entry.thumbnail = thumbnailDataUrl;
      }

      this.saveIndex(this.projectsIndex);
      return true;
    } catch (err) {
      console.error('Failed saving project:', err);
      return false;
    }
  }

  // Trigger debounced auto-save
  scheduleAutoSave(home, onStatusUpdate) {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    if (onStatusUpdate) onStatusUpdate('Saving changes...');

    this.autoSaveTimer = setTimeout(() => {
      this.saveProject(home);
      if (onStatusUpdate) onStatusUpdate(`All changes auto-saved (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
    }, 1200);
  }

  // Duplicate an existing project
  duplicateProject(projectId) {
    const original = this.loadProject(projectId);
    const newId = 'proj_' + Math.random().toString(36).slice(2, 9);
    const cloned = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`
    };

    this.saveProject(cloned);
    return cloned;
  }

  // Delete project
  deleteProject(projectId) {
    this.projectsIndex = this.projectsIndex.filter(p => p.id !== projectId);
    this.saveIndex(this.projectsIndex);
    try {
      localStorage.removeItem(`roomcraft_proj_${projectId}`);
    } catch {}
  }

  // Export JSON with metadata schema
  exportJSON(home) {
    const exportData = {
      schema: 'RoomCraft_Project_v2',
      exportedAt: new Date().toISOString(),
      project: home
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${home.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.roomcraft.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Import JSON with validation
  importJSON(file, onSuccess, onError) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target.result);
        const projectData = raw.project || raw;
        if (!Array.isArray(projectData.rooms)) {
          throw new Error('Missing rooms array in project file');
        }
        const normalized = normalizeHome(projectData);
        normalized.id = 'proj_' + Math.random().toString(36).slice(2, 9);
        this.saveProject(normalized);
        if (onSuccess) onSuccess(normalized);
      } catch (err) {
        if (onError) onError(err.message || 'Invalid RoomCraft project JSON format');
      }
    };
    reader.readAsText(file);
  }

  // High-Resolution PNG export helper with multiplier
  exportHighResPNG(canvas, filename = 'roomcraft-export.png', scale = 2) {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width * scale;
    exportCanvas.height = canvas.height * scale;
    const ctx = exportCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    const a = document.createElement('a');
    a.download = filename;
    a.href = exportCanvas.toDataURL('image/png');
    a.click();
  }
}

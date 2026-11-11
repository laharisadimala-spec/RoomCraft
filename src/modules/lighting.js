import { LIGHTING_PRESETS } from '../core/constants.js';

export class LightingSimulator {
  constructor(threeStudio, onUpdateCallback) {
    this.three = threeStudio;
    this.onUpdate = onUpdateCallback;
  }

  getPresets() {
    return Object.values(LIGHTING_PRESETS);
  }

  setPreset(presetId, home) {
    const preset = LIGHTING_PRESETS[presetId];
    if (!preset) return;

    home.lighting = {
      ...home.lighting,
      preset: presetId,
      sunIntensity: preset.sunIntensity,
      ambientIntensity: preset.ambientIntensity,
      colorTemp: preset.colorTemp < 3500 ? 'warm' : preset.colorTemp > 5000 ? 'cool' : 'neutral'
    };

    this.three.applyLighting(home.lighting);
    if (this.onUpdate) this.onUpdate(home.lighting);
  }

  setParam(key, value, home) {
    if (!home.lighting) home.lighting = {};
    home.lighting[key] = value;

    this.three.applyLighting(home.lighting);
    if (this.onUpdate) this.onUpdate(home.lighting);
  }
}

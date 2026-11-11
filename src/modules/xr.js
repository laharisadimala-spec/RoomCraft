export class WebXRPreviewManager {
  constructor(threeStudio) {
    this.three = threeStudio;
    this.supportVR = false;
    this.supportAR = false;
    this.checkSupport();
  }

  async checkSupport() {
    if (typeof navigator !== 'undefined' && 'xr' in navigator && navigator.xr) {
      try {
        this.supportVR = await navigator.xr.isSessionSupported('immersive-vr');
      } catch {
        this.supportVR = false;
      }
      try {
        this.supportAR = await navigator.xr.isSessionSupported('immersive-ar');
      } catch {
        this.supportAR = false;
      }
    }
    return { vr: this.supportVR, ar: this.supportAR };
  }

  async enterVR() {
    if (!this.supportVR) {
      return {
        success: false,
        message: 'WebXR Immersive VR is not supported on this browser/hardware. A VR Headset (Meta Quest, HTC Vive, Apple Vision Pro) is required.'
      };
    }

    try {
      this.three.renderer.xr.enabled = true;
      const session = await navigator.xr.requestSession('immersive-vr');
      await this.three.renderer.xr.setSession(session);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async enterAR() {
    if (!this.supportAR) {
      return {
        success: false,
        message: 'WebXR Immersive AR is not supported on this browser/hardware. An ARCore or ARKit compatible device with Chrome/Edge WebXR AR support is required.'
      };
    }

    try {
      this.three.renderer.xr.enabled = true;
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test']
      });
      await this.three.renderer.xr.setSession(session);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // Graceful Fallback: Device Orientation 360 camera preview on mobile devices
  startGyroPreview() {
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      const handleOrientation = (e) => {
        if (!e.gamma || !e.beta) return;
        const radBeta = (e.beta * Math.PI) / 180;
        const radGamma = (e.gamma * Math.PI) / 180;
        this.three.camera.rotation.set(radBeta, radGamma, 0, 'YXZ');
      };

      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(() => {});
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }
  }
}

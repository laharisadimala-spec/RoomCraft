export class ExplodedViewController {
  constructor(threeStudio) {
    this.three = threeStudio;
    this.isAnimating = false;
    this.targetProgress = 0;
    this.currentProgress = 0;
    this.animId = null;
  }

  setProgress(val) {
    this.currentProgress = Math.max(0, Math.min(1, val));
    this.targetProgress = this.currentProgress;
    this.three.setExplosionProgress(this.currentProgress);
  }

  animateTo(targetVal, durationMs = 1200) {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.targetProgress = Math.max(0, Math.min(1, targetVal));
    const startProgress = this.currentProgress;
    const startTime = performance.now();

    const loop = (time) => {
      const elapsed = time - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Smooth cubic ease-in-out
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.currentProgress = startProgress + (this.targetProgress - startProgress) * ease;
      this.three.setExplosionProgress(this.currentProgress);

      if (t < 1) {
        this.animId = requestAnimationFrame(loop);
      } else {
        this.currentProgress = this.targetProgress;
        this.three.setExplosionProgress(this.currentProgress);
      }
    };

    this.animId = requestAnimationFrame(loop);
  }

  toggleExplosion() {
    if (this.currentProgress > 0.3) {
      this.animateTo(0);
    } else {
      this.animateTo(0.85);
    }
  }
}

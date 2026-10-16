// Procedural Web Audio API sound generator for mechanical clicks & lock snaps
// No external MP3 files needed! Lightweight, instant, 0 latency.

class SoundFXController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastClickTime: number = 0;
  private lastSnappedState: "title" | "hero" | "none" = "none";

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Soft mechanical ratchet tick when gears rotate
  public playRatchetClick(pitchMult: number = 1.0) {
    if (this.isMuted) return;
    const now = performance.now();
    // Throttle clicks so it doesn't sound like static noise
    if (now - this.lastClickTime < 38) return;
    this.lastClickTime = now;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Highpass to give metallic crispness
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1400 * pitchMult, t);

      // Pitch sweep downward quickly (tick effect)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800 * pitchMult, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.018);

      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.02);
    } catch {
      // AudioContext policy catch
    }
  }

  // Deep satisfying mechanical magnetic lock sound when puzzle resolves
  public playSnapLock(type: "title" | "hero") {
    if (this.isMuted) return;
    if (this.lastSnappedState === type) return; // Prevent duplicate fire
    this.lastSnappedState = type;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;

      // 1. Heavy resonant "thud / thwack"
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      const baseFreq = type === "title" ? 180 : 140;
      osc1.frequency.setValueAtTime(baseFreq, t);
      osc1.frequency.exponentialRampToValueAtTime(45, t + 0.15);

      gain1.gain.setValueAtTime(0.18, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.17);

      // 2. Metallic latch chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      const chimeFreq = type === "title" ? 1420 : 1050;
      osc2.frequency.setValueAtTime(chimeFreq, t);
      osc2.frequency.exponentialRampToValueAtTime(chimeFreq * 0.7, t + 0.22);

      gain2.gain.setValueAtTime(0.08, t);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.23);
    } catch {
      // AudioContext policy catch
    }
  }

  public resetSnapState() {
    this.lastSnappedState = "none";
  }
}

export const soundFX = new SoundFXController();

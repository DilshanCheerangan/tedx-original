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

  // Ancient heavy stone grinding & mechanical gear scrape during rotation
  public playRatchetClick(pitchMult: number = 1.0) {
    if (this.isMuted) return;
    const now = performance.now();
    // Throttle so fast dragging sounds like continuous textured stone friction
    if (now - this.lastClickTime < 32) return;
    this.lastClickTime = now;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;

      // ── 1. Granular Stone Scrape (Porous rock friction grain) ──
      const grainDur = 0.024;
      const grainSamples = Math.floor(ctx.sampleRate * grainDur);
      const grainBuf = ctx.createBuffer(1, grainSamples, ctx.sampleRate);
      const grainData = grainBuf.getChannelData(0);
      let acc = 0;
      for (let i = 0; i < grainSamples; i++) {
        acc = (acc + (Math.random() * 2 - 1) * 0.12) / 1.12;
        grainData[i] = acc * 2.8;
      }
      const grainSrc = ctx.createBufferSource();
      grainSrc.buffer = grainBuf;

      const grainFilt = ctx.createBiquadFilter();
      grainFilt.type = "bandpass";
      grainFilt.frequency.setValueAtTime(450 * pitchMult, t);
      grainFilt.Q.setValueAtTime(2.2, t);

      const grainGain = ctx.createGain();
      grainGain.gain.setValueAtTime(0.08, t);
      grainGain.gain.exponentialRampToValueAtTime(0.001, t + grainDur);

      grainSrc.connect(grainFilt);
      grainFilt.connect(grainGain);
      grainGain.connect(ctx.destination);
      grainSrc.start(t);

      // ── 2. Heavy Stone Tooth Notch / Gear Clunk (Low resonant knock) ──
      const clunkOsc = ctx.createOscillator();
      const clunkGain = ctx.createGain();
      clunkOsc.type = "sine";
      const startHz = 135 * pitchMult;
      clunkOsc.frequency.setValueAtTime(startHz, t);
      clunkOsc.frequency.exponentialRampToValueAtTime(45, t + 0.028);

      clunkGain.gain.setValueAtTime(0.065, t);
      clunkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);

      clunkOsc.connect(clunkGain);
      clunkGain.connect(ctx.destination);
      clunkOsc.start(t);
      clunkOsc.stop(t + 0.03);
    } catch {
      // AudioContext policy catch
    }
  }

  // Ancient Stone Puzzle Solved Snap & Lock Sound
  public playSnapLock(type: "title" | "hero") {
    if (this.isMuted) return;
    if (this.lastSnappedState === type) return; // Prevent duplicate fire
    this.lastSnappedState = type;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;

      // ── 1. The Instant Stone-Bite "SNAP" (Sharp impact of ancient locking blocks meeting) ──
      const snapDur = 0.035;
      const snapSamples = Math.floor(ctx.sampleRate * snapDur);
      const snapBuf = ctx.createBuffer(1, snapSamples, ctx.sampleRate);
      const snapData = snapBuf.getChannelData(0);
      for (let i = 0; i < snapSamples; i++) {
        // High-energy initial transient spike
        const decay = Math.exp(-i / (ctx.sampleRate * 0.005));
        snapData[i] = (Math.random() * 2 - 1) * decay;
      }
      const snapSrc = ctx.createBufferSource();
      snapSrc.buffer = snapBuf;

      const snapFilter = ctx.createBiquadFilter();
      snapFilter.type = "bandpass";
      snapFilter.frequency.setValueAtTime(type === "title" ? 1750 : 1420, t);
      snapFilter.Q.setValueAtTime(2.5, t);

      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(0.25, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + snapDur);

      snapSrc.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapSrc.start(t);

      // ── 2. Heavy Stone Tooth Latch Impact (Immediate solid mechanical "CHACK") ──
      const latchOsc = ctx.createOscillator();
      const latchGain = ctx.createGain();
      const latchFilter = ctx.createBiquadFilter();

      latchOsc.type = "triangle";
      const latchFreq = type === "title" ? 480 : 380;
      latchOsc.frequency.setValueAtTime(latchFreq, t);
      latchOsc.frequency.exponentialRampToValueAtTime(110, t + 0.045);

      latchFilter.type = "lowpass";
      latchFilter.frequency.setValueAtTime(1200, t);

      latchGain.gain.setValueAtTime(0.22, t);
      latchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      latchOsc.connect(latchFilter);
      latchFilter.connect(latchGain);
      latchGain.connect(ctx.destination);

      latchOsc.start(t);
      latchOsc.stop(t + 0.055);

      // ── 3. Megalithic Sub-Resonant "THUD" (Heavy stone mass settling into place) ──
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = "sine";
      const baseSub = type === "title" ? 120 : 95;
      thudOsc.frequency.setValueAtTime(baseSub, t + 0.005);
      thudOsc.frequency.exponentialRampToValueAtTime(32, t + 0.22);

      thudGain.gain.setValueAtTime(0.20, t + 0.005);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);

      thudOsc.start(t + 0.005);
      thudOsc.stop(t + 0.26);

      // ── 4. Ancient Resonant Hollow Chamber Echo (Quick stone crypt chamber resonance) ──
      const chamberOsc = ctx.createOscillator();
      const chamberGain = ctx.createGain();
      const chamberFilter = ctx.createBiquadFilter();

      chamberOsc.type = "sine";
      const chamberFreq = type === "title" ? 220 : 174.6; // A3 or F3
      chamberOsc.frequency.setValueAtTime(chamberFreq, t + 0.02);

      chamberFilter.type = "bandpass";
      chamberFilter.frequency.setValueAtTime(chamberFreq, t + 0.02);
      chamberFilter.Q.setValueAtTime(6.0, t + 0.02);

      chamberGain.gain.setValueAtTime(0.0001, t);
      chamberGain.gain.linearRampToValueAtTime(0.07, t + 0.035);
      chamberGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      chamberOsc.connect(chamberFilter);
      chamberFilter.connect(chamberGain);
      chamberGain.connect(ctx.destination);

      chamberOsc.start(t + 0.02);
      chamberOsc.stop(t + 0.36);
    } catch {
      // AudioContext policy catch
    }
  }

  public resetSnapState() {
    this.lastSnappedState = "none";
  }
}

export const soundFX = new SoundFXController();

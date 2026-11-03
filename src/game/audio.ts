/**
 * Tiny WebAudio engine: a two-oscillator drone whose pitch follows rpm,
 * plus one-shot blips for shifts and launches. Everything is wrapped so a
 * missing/blocked AudioContext never breaks the game.
 */
class Engine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    }
  }

  /** Must be called from a user gesture the first time. */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.9;
      master.connect(ctx.destination);

      const gain = ctx.createGain();
      gain.gain.value = 0;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 7;

      const a = ctx.createOscillator();
      a.type = 'sawtooth';
      a.frequency.value = 60;
      const b = ctx.createOscillator();
      b.type = 'square';
      b.frequency.value = 92;

      a.connect(filter);
      b.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      a.start();
      b.start();

      this.ctx = ctx;
      this.master = master;
      this.gain = gain;
      this.filter = filter;
      this.oscA = a;
      this.oscB = b;
    } catch {
      this.ctx = null;
    }
  }

  /** ratio = rpm / redline, throttle 0..1 */
  update(ratio: number, throttle: number): void {
    if (!this.ctx || !this.gain || !this.oscA || !this.oscB || !this.filter) return;
    const t = this.ctx.currentTime;
    const base = 44 + ratio * 170;
    this.oscA.frequency.setTargetAtTime(base, t, 0.04);
    this.oscB.frequency.setTargetAtTime(base * 1.507, t, 0.04);
    this.filter.frequency.setTargetAtTime(420 + ratio * 2400, t, 0.06);
    const level = throttle > 0 ? 0.03 + ratio * 0.055 : 0.012;
    this.gain.gain.setTargetAtTime(this.muted ? 0 : level, t, 0.06);
  }

  silence(): void {
    if (!this.ctx || !this.gain) return;
    this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
    if (!this.ctx || !this.master || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      /* ignore */
    }
  }

  shift(perfect: boolean): void {
    this.blip(perfect ? 880 : 620, 0.09, 'square', 0.09, perfect ? 1400 : 480);
  }

  launch(): void {
    this.blip(150, 0.28, 'sawtooth', 0.14, 60);
  }

  foul(): void {
    this.blip(200, 0.5, 'square', 0.12, 90);
  }

  finish(win: boolean): void {
    if (win) {
      this.blip(660, 0.16, 'square', 0.1, 660);
      window.setTimeout(() => this.blip(990, 0.22, 'square', 0.1, 990), 150);
    } else {
      this.blip(330, 0.3, 'sawtooth', 0.09, 200);
    }
  }
}

export const engine = new Engine();

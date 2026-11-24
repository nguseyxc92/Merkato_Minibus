// 100% Procedural Web Audio sound engine for Merkato Minibus (zero external audio files)

export class MerkatoAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private crowdGain: GainNode | null = null;
  private muted = false;
  private started = false;

  public start(): void {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.48;
    master.connect(ctx.destination);
    this.masterGain = master;

    // 4-cylinder HiAce diesel/petrol engine synth
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 210;
    engineFilter.Q.value = 2.2;

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.12;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 46;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 92;

    osc1.connect(engineFilter);
    osc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);

    osc1.start();
    osc2.start();

    this.engineOsc1 = osc1;
    this.engineOsc2 = osc2;
    this.engineFilter = engineFilter;
    this.engineGain = engineGain;

    // Merkato street ambience (filtered pink-ish noise bed)
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.08;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const crowdFilter = ctx.createBiquadFilter();
    crowdFilter.type = 'bandpass';
    crowdFilter.frequency.value = 680;
    crowdFilter.Q.value = 0.7;

    const crowdGain = ctx.createGain();
    crowdGain.gain.value = 0.14;

    noise.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(master);
    noise.start();
    this.crowdGain = crowdGain;

    this.started = true;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(m ? 0 : 0.48, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateEngine(speedKmh: number, throttle: number, isPlaying: boolean): void {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) {
      return;
    }
    const t = this.ctx.currentTime;
    const absSpeed = Math.abs(speedKmh);
    const gearRatio = absSpeed < 14 ? 1 : absSpeed < 28 ? 0.68 : 0.48;
    const rpmNorm = Math.min(1, 0.15 + (absSpeed / 45) * gearRatio + Math.abs(throttle) * 0.28);
    const f1 = 38 + rpmNorm * 82;
    this.engineOsc1.frequency.setTargetAtTime(f1, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(f1 * 2.01, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(160 + rpmNorm * 420, t, 0.08);
    this.engineGain.gain.setTargetAtTime(isPlaying ? 0.08 + rpmNorm * 0.1 : 0.02, t, 0.1);
    if (this.crowdGain) {
      this.crowdGain.gain.setTargetAtTime(isPlaying ? 0.16 : 0.06, t, 0.2);
    }
  }

  public playHorn(): void {
    this.start();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.28, now + 0.025);
    gain.gain.setValueAtTime(0.25, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    gain.connect(this.masterGain);

    // Dual-tone Ethiopian minibus horn (F4 + A4 brassy reed)
    const o1 = this.ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = 349.2;

    const o2 = this.ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = 440.0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1150;
    filter.Q.value = 1.4;

    o1.connect(filter);
    o2.connect(filter);
    filter.connect(gain);

    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.36);
    o2.stop(now + 0.36);
  }

  public playDoorSlide(opening: boolean): void {
    this.start();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Metallic rail slide + latch clack
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(opening ? 190 : 320, now);
    osc.frequency.exponentialRampToValueAtTime(opening ? 340 : 140, now + 0.18);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playStopBell(isFareEarned = false): void {
    this.start();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = isFareEarned ? [587.3, 880.0] : [523.25, 659.25];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      const t0 = now + idx * 0.09;
      g.gain.setValueAtTime(0.001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.26);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.28);
    });
  }

  public playBump(severity: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.45, 0.15 + severity * 0.25), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public dispose(): void {
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      void this.ctx?.close();
    } catch {
      // ignore cleanup errors
    }
    this.started = false;
  }
}

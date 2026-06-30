"use client";

export type MakeAudioFn = (ctx: AudioContext, out: GainNode, t: number) => void;

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private volume = 0.8;
  private muted = false;
  lastActive = 0;

  ensure(): AudioContext {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.analyser = analyser;
    return ctx;
  }

  setVolume(v: number, muted: boolean): void {
    this.volume = v;
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : v,
        this.ctx.currentTime,
        0.01,
      );
    }
  }

  playSynth(make: MakeAudioFn): void {
    const ctx = this.ensure();
    const t = ctx.currentTime + 0.01;
    try {
      make(ctx, this.master!, t);
    } catch {
      // a node failed to schedule — keep the board alive
    }
    this.lastActive = performance.now() + 1400;
  }

  async playUrl(url: string): Promise<void> {
    const ctx = this.ensure();
    let buf = this.bufferCache.get(url);
    if (!buf) {
      const data = await fetch(url).then((r) => r.arrayBuffer());
      buf = await ctx.decodeAudioData(data);
      this.bufferCache.set(url, buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master!);
    src.start();
    this.lastActive = performance.now() + Math.min(buf.duration * 1000, 6000);
  }

  stopAll(): void {
    if (!this.ctx || !this.master) return;
    const m = this.master;
    m.gain.cancelScheduledValues(this.ctx.currentTime);
    m.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    m.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.ctx.currentTime + 0.08,
      0.05,
    );
    this.lastActive = 0;
  }
}

let engine: AudioEngine | null = null;
export function getEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}

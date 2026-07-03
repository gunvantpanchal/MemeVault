"use client";

export type MakeAudioFn = (ctx: AudioContext, out: GainNode, t: number) => void;

const MAX_CACHED_BUFFERS = 40;

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private loadingUrls = new Set<string>();
  private activeSources: AudioBufferSourceNode[] = [];
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

  private cacheBuffer(url: string, buf: AudioBuffer): void {
    this.bufferCache.delete(url);
    this.bufferCache.set(url, buf);
    if (this.bufferCache.size > MAX_CACHED_BUFFERS) {
      const oldest = this.bufferCache.keys().next().value;
      if (oldest !== undefined) this.bufferCache.delete(oldest);
    }
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
    this.stopAll();
    const ctx = this.ensure();
    const t = ctx.currentTime + 0.01;
    try {
      make(ctx, this.master!, t);
    } catch {
      // a node failed to schedule — keep the board alive
    }
    this.lastActive = performance.now() + 1400;
  }

  preload(url: string, fallback?: string): void {
    if (this.bufferCache.has(url) || this.loadingUrls.has(url)) return;
    this.loadingUrls.add(url);
    const ctx = this.ensure();
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((d) => ctx.decodeAudioData(d))
      .then((buf) => { this.cacheBuffer(url, buf); })
      .catch(() => { if (fallback) this.preload(fallback); })
      .finally(() => { this.loadingUrls.delete(url); });
  }

  async playUrl(url: string, fallback?: string): Promise<number> {
    this.stopAll();
    const ctx = this.ensure();
    let buf = this.bufferCache.get(url);
    if (buf) {
      this.cacheBuffer(url, buf); // refresh recency
    } else {
      try {
        const data = await fetch(url).then((r) => r.arrayBuffer());
        buf = await ctx.decodeAudioData(data);
        this.cacheBuffer(url, buf);
      } catch {
        if (fallback) return this.playUrl(fallback);
        throw new Error("Audio unavailable");
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master!);
    this.activeSources.push(src);
    src.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== src);
    };
    src.start();
    const durMs = buf.duration * 1000;
    this.lastActive = performance.now() + durMs;
    return durMs;
  }

  stopAll(): void {
    for (const src of this.activeSources) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    this.activeSources = [];
    this.lastActive = 0;
  }
}

let engine: AudioEngine | null = null;
export function getEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}

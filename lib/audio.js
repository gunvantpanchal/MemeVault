"use client";

// A single shared audio engine for the whole app: one AudioContext,
// one master gain (volume), and one analyser (the visualizer reads it).
// Supports both synthesized sounds and real files from a URL.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.bufferCache = new Map(); // url -> decoded AudioBuffer
    this.volume = 0.8;
    this.muted = false;
    this.lastActive = 0; // performance.now() timestamp; visualizer "liveness"
  }

  ensure() {
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

  setVolume(v, muted) {
    this.volume = v;
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : v,
        this.ctx.currentTime,
        0.01
      );
    }
  }

  // Play a synthesized sound. `make` is a (ctx, out, t) => nodes[] function.
  playSynth(make) {
    const ctx = this.ensure();
    const t = ctx.currentTime + 0.01;
    try {
      make(ctx, this.master, t);
    } catch (e) {
      // a node failed to schedule — keep the board alive
    }
    this.lastActive = performance.now() + 1400;
  }

  // Play a real audio file from a URL (Firebase Storage download URL, blob:, etc.)
  async playUrl(url) {
    const ctx = this.ensure();
    let buf = this.bufferCache.get(url);
    if (!buf) {
      const data = await fetch(url).then((r) => r.arrayBuffer());
      buf = await ctx.decodeAudioData(data);
      this.bufferCache.set(url, buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
    this.lastActive = performance.now() + Math.min(buf.duration * 1000, 6000);
  }

  // Cut everything: briefly duck the master to silence, then restore.
  stopAll() {
    if (!this.ctx) return;
    const m = this.master;
    m.gain.cancelScheduledValues(this.ctx.currentTime);
    m.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    m.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.ctx.currentTime + 0.08,
      0.05
    );
    this.lastActive = 0;
  }
}

let engine = null;
export function getEngine() {
  if (!engine) engine = new AudioEngine();
  return engine;
}

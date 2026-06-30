import type { MakeAudioFn } from "./audio";

export interface Synth {
  id: string;
  name: string;
  category: string;
  hotkey: string;
  dur: string;
  make: MakeAudioFn;
}

function noiseBuffer(ctx: AudioContext, dur: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export const SYNTHS: Synth[] = [
  {
    id: "airhorn", name: "Airhorn", category: "Memes", hotkey: "1", dur: "0:01",
    make: (ctx, out, t) => {
      const g = ctx.createGain(); g.connect(out);
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.connect(g);
      const honk = (s: number, f: number) => {
        o.frequency.setValueAtTime(f, s);
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.45, s + 0.02);
        g.gain.setValueAtTime(0.45, s + 0.17);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.26);
      };
      honk(t, 415); honk(t + 0.34, 440);
      o.start(t); o.stop(t + 0.62);
    },
  },
  {
    id: "boing", name: "Boing", category: "Memes", hotkey: "2", dur: "0:01",
    make: (ctx, out, t) => {
      const g = ctx.createGain(); g.connect(out);
      const o = ctx.createOscillator(); o.type = "sine"; o.connect(g);
      o.frequency.setValueAtTime(600, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.42);
      g.gain.setValueAtTime(0.6, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = 19; lg.gain.value = 45;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t + 0.46);
      o.start(t); o.stop(t + 0.46);
    },
  },
  {
    id: "bruh", name: "Bruh", category: "Memes", hotkey: "3", dur: "0:01",
    make: (ctx, out, t) => {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(out);
      const g = ctx.createGain(); g.connect(lp);
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.connect(g);
      o.frequency.setValueAtTime(120, t);
      o.frequency.setValueAtTime(82, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.start(t); o.stop(t + 0.36);
    },
  },
  {
    id: "ding", name: "Ding", category: "Alerts", hotkey: "4", dur: "0:01",
    make: (ctx, out, t) => {
      ([[1, 0.5], [2.01, 0.28], [3.0, 0.14]] as [number, number][]).forEach(([m, a]) => {
        const o = ctx.createOscillator(); o.type = "sine"; const g = ctx.createGain();
        o.frequency.value = 880 * m; o.connect(g); g.connect(out);
        g.gain.setValueAtTime(a, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        o.start(t); o.stop(t + 1.25);
      });
    },
  },
  {
    id: "coin", name: "Coin", category: "Game", hotkey: "5", dur: "0:01",
    make: (ctx, out, t) => {
      const o = ctx.createOscillator(); o.type = "square"; const g = ctx.createGain();
      o.connect(g); g.connect(out);
      o.frequency.setValueAtTime(988, t);
      o.frequency.setValueAtTime(1319, t + 0.08);
      g.gain.setValueAtTime(0.3, t);
      g.gain.setValueAtTime(0.3, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.start(t); o.stop(t + 0.34);
    },
  },
  {
    id: "laser", name: "Laser", category: "Game", hotkey: "6", dur: "0:01",
    make: (ctx, out, t) => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; const g = ctx.createGain();
      o.connect(g); g.connect(out);
      o.frequency.setValueAtTime(1400, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.3);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.start(t); o.stop(t + 0.34);
    },
  },
  {
    id: "bonk", name: "Bonk", category: "Memes", hotkey: "7", dur: "0:01",
    make: (ctx, out, t) => {
      const o = ctx.createOscillator(); o.type = "sine"; const g = ctx.createGain();
      o.connect(g); g.connect(out);
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      const ns = ctx.createBufferSource(); ns.buffer = noiseBuffer(ctx, 0.04);
      const ng = ctx.createGain(); ng.gain.value = 0.4; ns.connect(ng); ng.connect(out);
      o.start(t); o.stop(t + 0.2); ns.start(t); ns.stop(t + 0.04);
    },
  },
  {
    id: "drumroll", name: "Drum Roll", category: "FX", hotkey: "8", dur: "0:01",
    make: (ctx, out, t) => {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, 1.0);
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.8;
      const g = ctx.createGain(); src.connect(bp); bp.connect(g); g.connect(out);
      let s = t; const step = 1 / 26;
      for (let i = 0; i < 24; i++) {
        g.gain.setValueAtTime(0.03 + 0.012 * i, s);
        g.gain.setValueAtTime(0.0, s + step * 0.45);
        s += step;
      }
      const o = ctx.createOscillator(); o.type = "triangle"; const hg = ctx.createGain();
      o.frequency.value = 180; o.connect(hg); hg.connect(out);
      hg.gain.setValueAtTime(0.0001, s);
      hg.gain.exponentialRampToValueAtTime(0.5, s + 0.01);
      hg.gain.exponentialRampToValueAtTime(0.0001, s + 0.3);
      src.start(t); src.stop(s); o.start(s); o.stop(s + 0.32);
    },
  },
  {
    id: "sadtrombone", name: "Sad Trombone", category: "Alerts", hotkey: "9", dur: "0:02",
    make: (ctx, out, t) => {
      const seq = [311, 277, 247, 196]; let s = t;
      seq.forEach((f, i) => {
        const last = i === seq.length - 1;
        const o = ctx.createOscillator(); o.type = "sawtooth";
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100;
        const g = ctx.createGain(); o.connect(lp); lp.connect(g); g.connect(out);
        o.frequency.setValueAtTime(f, s);
        if (last) o.frequency.exponentialRampToValueAtTime(f * 0.8, s + 0.55);
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.32, s + 0.03);
        g.gain.setValueAtTime(0.32, s + (last ? 0.45 : 0.18));
        g.gain.exponentialRampToValueAtTime(0.0001, s + (last ? 0.62 : 0.24));
        o.start(s); o.stop(s + (last ? 0.66 : 0.26));
        s += last ? 0 : 0.22;
      });
    },
  },
  {
    id: "tada", name: "Ta-da", category: "Alerts", hotkey: "0", dur: "0:01",
    make: (ctx, out, t) => {
      [523, 659, 784, 1047].forEach((f) => {
        const o = ctx.createOscillator(); o.type = "triangle"; const g = ctx.createGain();
        o.frequency.value = f; o.connect(g); g.connect(out);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.start(t); o.stop(t + 0.92);
      });
    },
  },
  {
    id: "pop", name: "Pop", category: "Game", hotkey: "Q", dur: "0:01",
    make: (ctx, out, t) => {
      const o = ctx.createOscillator(); o.type = "sine"; const g = ctx.createGain();
      o.connect(g); g.connect(out);
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(960, t + 0.05);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.start(t); o.stop(t + 0.1);
    },
  },
  {
    id: "zap", name: "Zap", category: "Game", hotkey: "W", dur: "0:01",
    make: (ctx, out, t) => {
      const ns = ctx.createBufferSource(); ns.buffer = noiseBuffer(ctx, 0.25);
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200;
      const g = ctx.createGain(); ns.connect(hp); hp.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      const o = ctx.createOscillator(); o.type = "square"; const og = ctx.createGain();
      o.connect(og); og.connect(out);
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.18);
      og.gain.setValueAtTime(0.18, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      ns.start(t); ns.stop(t + 0.22); o.start(t); o.stop(t + 0.22);
    },
  },
  {
    id: "whistle", name: "Whistle", category: "FX", hotkey: "E", dur: "0:01",
    make: (ctx, out, t) => {
      const o = ctx.createOscillator(); o.type = "sine"; const g = ctx.createGain();
      o.connect(g); g.connect(out);
      o.frequency.setValueAtTime(800, t);
      o.frequency.exponentialRampToValueAtTime(1700, t + 0.25);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = 6; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t + 0.55);
      o.start(t); o.stop(t + 0.55);
    },
  },
  {
    id: "riser", name: "Riser", category: "FX", hotkey: "R", dur: "0:01",
    make: (ctx, out, t) => {
      const ns = ctx.createBufferSource(); ns.buffer = noiseBuffer(ctx, 1.2);
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 2;
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(5000, t + 1.1);
      const g = ctx.createGain(); ns.connect(bp); bp.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.05, t);
      g.gain.linearRampToValueAtTime(0.4, t + 1.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      ns.start(t); ns.stop(t + 1.2);
    },
  },
  {
    id: "sparkle", name: "Sparkle", category: "FX", hotkey: "T", dur: "0:01",
    make: (ctx, out, t) => {
      for (let i = 0; i < 7; i++) {
        const s = t + i * 0.06;
        const o = ctx.createOscillator(); o.type = "sine"; const g = ctx.createGain();
        o.frequency.value = 1200 + Math.random() * 2000;
        o.connect(g); g.connect(out);
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.2, s + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.12);
        o.start(s); o.stop(s + 0.13);
      }
    },
  },
  {
    id: "heartbeat", name: "Heartbeat", category: "Alerts", hotkey: "Y", dur: "0:01",
    make: (ctx, out, t) => {
      [t, t + 0.28].forEach((s, i) => {
        const o = ctx.createOscillator(); o.type = "sine"; const g = ctx.createGain();
        o.frequency.setValueAtTime(i ? 70 : 60, s);
        o.frequency.exponentialRampToValueAtTime(35, s + 0.16);
        o.connect(g); g.connect(out);
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.8, s + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18);
        o.start(s); o.stop(s + 0.2);
      });
    },
  },
  {
    id: "click", name: "Click", category: "FX", hotkey: "U", dur: "0:01",
    make: (ctx, out, t) => {
      const ns = ctx.createBufferSource(); ns.buffer = noiseBuffer(ctx, 0.03);
      const g = ctx.createGain(); ns.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      ns.start(t); ns.stop(t + 0.03);
    },
  },
  {
    id: "wow", name: "Wow", category: "Memes", hotkey: "I", dur: "0:01",
    make: (ctx, out, t) => {
      const o = ctx.createOscillator(); o.type = "sawtooth";
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 5;
      const g = ctx.createGain(); o.connect(bp); bp.connect(g); g.connect(out);
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(720, t + 0.18);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.4);
      bp.frequency.setValueAtTime(600, t);
      bp.frequency.exponentialRampToValueAtTime(1600, t + 0.18);
      bp.frequency.exponentialRampToValueAtTime(900, t + 0.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.start(t); o.stop(t + 0.46);
    },
  },
  {
    id: "vibe", name: "Vibe Pad", category: "Memes", hotkey: "O", dur: "0:02",
    make: (ctx, out, t) => {
      [220, 261.6, 329.6].forEach((f) => {
        const o = ctx.createOscillator(); o.type = "triangle"; const g = ctx.createGain();
        o.frequency.value = f; o.connect(g); g.connect(out);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.3);
        g.gain.setValueAtTime(0.16, t + 1.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
        o.start(t); o.stop(t + 1.72);
      });
    },
  },
  {
    id: "buzzer", name: "Buzzer", category: "Alerts", hotkey: "P", dur: "0:01",
    make: (ctx, out, t) => {
      [110, 110.8].forEach((f) => {
        const o = ctx.createOscillator(); o.type = "sawtooth"; const g = ctx.createGain();
        o.frequency.value = f; o.connect(g); g.connect(out);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
        g.gain.setValueAtTime(0.3, t + 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.start(t); o.stop(t + 0.62);
      });
    },
  },
];

const byId = Object.fromEntries(SYNTHS.map((s) => [s.id, s]));
export function getSynth(id: string): Synth | undefined {
  return byId[id];
}

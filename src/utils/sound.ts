import type { Rarity } from '@/types';

/** 使用 WebAudio 合成音效，不依赖任何音频资源 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const C =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.15) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(start: number, dur: number, gain = 0.2) {
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1800;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(c.currentTime + start);
}

export const sfx = {
  click() {
    tone(660, 0, 0.08, 'triangle', 0.08);
  },
  shake() {
    tone(120, 0, 0.12, 'sawtooth', 0.05);
  },
  tear() {
    noise(0, 0.45, 0.25);
    tone(300, 0.05, 0.3, 'triangle', 0.06);
  },
  whoosh() {
    noise(0, 0.25, 0.08);
  },
  flip(rarity: Rarity) {
    tone(520, 0, 0.1, 'triangle', 0.08);
    if (rarity === 'rare') tone(880, 0.05, 0.25, 'sine', 0.1);
    if (rarity === 'epic') {
      [660, 880, 1100].forEach((f, i) => tone(f, 0.05 + i * 0.07, 0.35, 'sine', 0.1));
    }
    if (rarity === 'legendary') {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.05 + i * 0.09, 0.6, 'triangle', 0.12));
    }
    if (rarity === 'mythic') {
      [523, 659, 784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.05 + i * 0.08, 0.9, 'sine', 0.12));
      [262, 392].forEach((f) => tone(f, 0.05, 1.4, 'triangle', 0.08));
      noise(0.5, 0.6, 0.05);
    }
  },
  success() {
    [523, 784].forEach((f, i) => tone(f, i * 0.1, 0.3, 'sine', 0.08));
  },
};

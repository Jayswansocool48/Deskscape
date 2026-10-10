// Every sound in Deskscape is made here, in code, with the Web Audio API: interface sounds
// (clicks, opening the drawer, launching an app…) and slow ambient soundscapes (rain, ocean,
// fireplace, space…). No audio files are bundled, so there is nothing to license.

export const SOUND_PACKS = { glass: 'Glass (bells)', soft: 'Soft (muted)', retro: 'Retro (8-bit)' };
export const SOUNDSCAPES = {
  none: 'None', rain: 'Rain', ocean: 'Ocean waves', wind: 'Wind', fire: 'Fireplace', forest: 'Forest birds',
  space: 'Deep space', cyber: 'Cyber hum', chimes: 'Wind chimes', night: 'Night crickets',
  custom: 'My own sound file (loops)',
};
/** Interface sounds you can replace with your own files. */
export const CUSTOM_SOUNDS = { click: 'Clicks', open: 'Opening and closing', launch: 'Opening an app', notify: 'Done / success', chime: 'Focus timer chime' };
const CUSTOM_FOR = { click: 'click', hover: 'click', toggleOn: 'click', toggleOff: 'click', type: 'click', open: 'open', close: 'open', launch: 'launch', success: 'notify', notify: 'notify', error: 'notify', chime: 'chime' };

// Notes for each interface event: [semitones above the pack's root, start (s), length (s), loudness]
const EVENTS = {
  click: [[12, 0, 0.07, 0.35]],
  hover: [[19, 0, 0.04, 0.12]],
  toggleOn: [[7, 0, 0.06, 0.3], [12, 0.05, 0.08, 0.3]],
  toggleOff: [[12, 0, 0.06, 0.3], [7, 0.05, 0.08, 0.3]],
  open: [[0, 0, 0.18, 0.3], [7, 0.06, 0.2, 0.28], [12, 0.12, 0.3, 0.25]],
  close: [[12, 0, 0.12, 0.25], [7, 0.05, 0.14, 0.22], [0, 0.1, 0.22, 0.2]],
  launch: [[7, 0, 0.1, 0.35], [14, 0.07, 0.12, 0.3], [19, 0.13, 0.35, 0.28]],
  success: [[0, 0, 0.15, 0.3], [4, 0.08, 0.15, 0.3], [7, 0.16, 0.15, 0.3], [12, 0.24, 0.5, 0.3]],
  error: [[-5, 0, 0.16, 0.4], [-6, 0.12, 0.26, 0.35]],
  notify: [[12, 0, 0.12, 0.25], [19, 0.1, 0.3, 0.22]],
  chime: [[12, 0, 1.2, 0.4], [16, 0.25, 1.2, 0.35], [19, 0.5, 1.6, 0.35]],
  type: [[24, 0, 0.025, 0.08]],
};
const ROOT = { glass: 523.25, soft: 329.63, retro: 440 };
const WHOOSH = { open: [300, 2400], close: [2400, 300] };
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.settings = { ui: true, pack: 'glass', volume: 0.45, hover: false, ambient: false, ambientVolume: 0.35, pauseForMusic: true };
    this.scape = 'none';
    this.scapeUrl = '';
    this.buffers = new Map(); // url -> Promise<AudioBuffer>
    this.running = null; // { name, stop() }
    this.ducked = false;
    this.paused = false;
    this.primary = true;
    const unlock = () => { this.ctx?.resume().catch(() => null); this.refreshAmbient(); };
    addEventListener('pointerdown', unlock, { capture: true });
    addEventListener('keydown', unlock, { capture: true });
  }

  /** settings: cfg.general.sound; scape: the scene's soundscape; primary: only one monitor plays ambience. */
  configure(settings, scape, primary, scapeUrl = '') {
    this.settings = { ...this.settings, ...(settings || {}) };
    this.scape = scape || 'none';
    this.scapeUrl = scapeUrl || '';
    this.primary = primary;
    if (this.ctx) {
      this.ui.gain.setTargetAtTime(this.settings.volume, this.ctx.currentTime, 0.05);
      this.amb.gain.setTargetAtTime(this.ambientLevel(), this.ctx.currentTime, 0.4);
    }
    this.refreshAmbient();
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { this.ctx = new Ctx(); } catch { return null; }
    const c = this.ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.connect(c.destination);
    this.ui = c.createGain();
    this.ui.gain.value = this.settings.volume;
    this.ui.connect(comp);
    this.amb = c.createGain();
    this.amb.gain.value = 0;
    this.amb.connect(comp);
    // a soft room so everything sits together
    this.verb = c.createConvolver();
    this.verb.buffer = impulse(c, 1.8);
    const wet = c.createGain();
    wet.gain.value = 0.22;
    this.verb.connect(wet).connect(comp);
    this.ui.connect(this.verb);
    this.amb.connect(this.verb);
    return c;
  }

  ambientLevel() {
    return this.settings.ambient && !this.ducked && !this.settings.muted ? this.settings.ambientVolume * 0.9 : 0;
  }

  /** Quiet the soundscape while music plays (and bring it back after). */
  duck(on) {
    on = !!on && this.settings.pauseForMusic;
    if (on === this.ducked) return;
    this.ducked = on;
    if (this.ctx) this.amb.gain.setTargetAtTime(this.ambientLevel(), this.ctx.currentTime, 0.8);
  }

  play(event) {
    if (this.settings.muted || (!this.settings.ui && event !== 'chime') || this.settings.volume <= 0) return; // the timer's chime is an alarm, so it plays unless muted
    if (event === 'hover' && !this.settings.hover) return;
    const notes = EVENTS[event];
    if (!notes) return;
    const c = this.ensure();
    if (!c || c.state !== 'running') { c?.resume().catch(() => null); if (c?.state !== 'running') return; }
    const own = this.settings.custom?.[CUSTOM_FOR[event]];
    if (own) {
      // your own sound file instead of the built-in one (quieter for hovers)
      this.buffer(own).then(buf => this.playBuffer(buf, event === 'hover' ? 0.3 : 1)).catch(() => null);
      return;
    }
    const pack = ROOT[this.settings.pack] ? this.settings.pack : 'glass';
    const t0 = c.currentTime + 0.005;
    for (const [semi, at, len, loud] of notes) voice(c, pack, ROOT[pack] * 2 ** (semi / 12), t0 + at, len, loud, this.ui);
    if (WHOOSH[event] && pack !== 'retro') whoosh(c, t0, ...WHOOSH[event], 0.35, this.ui);
  }

  buffer(url) {
    if (!this.buffers.has(url)) {
      const c = this.ensure();
      this.buffers.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(data => c.decodeAudioData(data))
        .catch(e => { this.buffers.delete(url); throw e; }));
    }
    return this.buffers.get(url);
  }

  playBuffer(buf, gain = 1) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.ui);
    src.start();
  }

  /** Plays one of your own sound files once (for "Play" next to it in Settings). */
  previewFile(url) {
    const c = this.ensure();
    c?.resume().catch(() => null);
    return this.buffer(url).then(buf => this.playBuffer(buf));
  }

  /** While the wallpaper is paused, the soundscape stops (and comes back after). */
  setPaused(on) {
    this.paused = on;
    this.refreshAmbient();
  }

  /** A pretty preview of the soundscape volume or a pack, for the settings. */
  preview() { this.play('success'); }

  /** Your own file as the soundscape, looping. */
  customScape(c, out, url) {
    let src = null;
    let stopped = false;
    this.buffer(url).then(buf => {
      if (stopped) return;
      src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(out);
      src.start();
    }).catch(() => null);
    return () => { stopped = true; try { src?.stop(); } catch { /* not started */ } };
  }

  refreshAmbient() {
    let want = this.settings.ambient && !this.settings.muted && this.primary && !this.paused && SOUNDSCAPES[this.scape] && this.scape !== 'none' ? this.scape : 'none';
    if (want === 'custom') want = this.scapeUrl ? 'custom:' + this.scapeUrl : 'none';
    if ((this.running?.name || 'none') === want) return;
    this.running?.stop();
    this.running = null;
    if (want === 'none') return;
    const c = this.ensure();
    if (!c) return;
    if (c.state !== 'running') { c.resume().catch(() => null); if (c.state !== 'running') return; } // starts on the first click or key
    const bus = c.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(1, c.currentTime, 1.2);
    bus.connect(this.amb);
    this.amb.gain.setTargetAtTime(this.ambientLevel(), c.currentTime, 0.4);
    const stopInner = want.startsWith('custom:') ? this.customScape(c, bus, this.scapeUrl) : SCAPES[want](c, bus);
    this.running = {
      name: want,
      stop: () => {
        bus.gain.setTargetAtTime(0, c.currentTime, 0.4);
        setTimeout(() => { stopInner(); bus.disconnect(); }, 2000);
      },
    };
  }
}

// ---- voices --------------------------------------------------------------------------
function voice(c, pack, f, t, len, loud, out) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(loud, t + (pack === 'soft' ? 0.012 : 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + (pack === 'glass' ? 0.5 : 0.12));
  g.connect(out);
  const partials = pack === 'glass' ? [[1, 1, 'sine'], [2.76, 0.28, 'sine'], [5.4, 0.08, 'sine']]
    : pack === 'soft' ? [[1, 1, 'triangle'], [2, 0.15, 'sine']]
      : [[1, 1, 'square']];
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = pack === 'soft' ? 1800 : pack === 'retro' ? 3200 : 9000;
  lp.connect(g);
  for (const [mult, amp, type] of partials) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f * mult;
    const pg = c.createGain();
    pg.gain.value = amp * (pack === 'retro' ? 0.25 : 1);
    o.connect(pg).connect(lp);
    o.start(t);
    o.stop(t + len + 0.7);
  }
}

function whoosh(c, t, from, to, loud, out) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + 0.28);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(loud * 0.5, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  src.connect(bp).connect(g).connect(out);
  src.start(t);
  src.stop(t + 0.4);
}

let NOISE;
function noiseBuffer(c, seconds = 4) {
  if (NOISE && NOISE.sampleRate === c.sampleRate) return NOISE;
  const len = c.sampleRate * seconds;
  NOISE = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = NOISE.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0; // gently pinked noise: warmer than white
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
  }
  return NOISE;
}

function impulse(c, seconds) {
  const len = c.sampleRate * seconds;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  return buf;
}

// ---- soundscape building blocks ---------------------------------------------------------
function loopNoise(c, out, { type = 'lowpass', freq = 800, q = 0.7, gain = 0.3 } = {}) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  src.loopStart = Math.random();
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(out);
  src.start();
  return { src, filter: f, gain: g, stop: () => { try { src.stop(); } catch { /* already stopped */ } } };
}

function lfo(c, param, rate, depth) {
  const o = c.createOscillator();
  o.frequency.value = rate;
  const g = c.createGain();
  g.gain.value = depth;
  o.connect(g).connect(param);
  o.start();
  return { stop: () => o.stop() };
}

/** Calls fn at random intervals between min and max seconds until stopped. */
function every(min, max, fn) {
  let timer;
  let alive = true;
  const next = () => { timer = setTimeout(() => { if (!alive) return; fn(); next(); }, (min + Math.random() * (max - min)) * 1000); };
  next();
  return { stop: () => { alive = false; clearTimeout(timer); } };
}

function blip(c, out, { f, len = 0.05, loud = 0.05, type = 'sine', glide = 0, pan = 0, at = 0 }) {
  const t = c.currentTime + 0.02 + at;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(f * glide, t + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(loud, t + Math.min(0.01, len / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const p = c.createStereoPanner ? c.createStereoPanner() : null;
  if (p) { p.pan.value = pan; o.connect(g).connect(p).connect(out); } else o.connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.05);
}

function crackle(c, out, loud) {
  const t = c.currentTime + 0.01;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1500 + Math.random() * 2500;
  const g = c.createGain();
  const len = 0.01 + Math.random() * 0.04;
  g.gain.setValueAtTime(loud, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(hp).connect(g).connect(out);
  src.start(t, Math.random() * 3);
  src.stop(t + len + 0.02);
}

const stopAll = parts => () => parts.forEach(p => p.stop());
const rnd = (a, b) => a + Math.random() * (b - a);

const SCAPES = {
  rain(c, out) {
    const hiss = loopNoise(c, out, { type: 'highpass', freq: 600, gain: 0.35 });
    const body = loopNoise(c, out, { type: 'lowpass', freq: 900, gain: 0.25 });
    const drops = every(0.04, 0.25, () => blip(c, out, { f: rnd(2500, 6000), len: 0.03, loud: rnd(0.01, 0.04), glide: 0.6, pan: rnd(-0.8, 0.8) }));
    return stopAll([hiss, body, drops, lfo(c, hiss.gain.gain, 0.05, 0.08)]);
  },
  ocean(c, out) {
    const surf = loopNoise(c, out, { type: 'lowpass', freq: 700, gain: 0.45 });
    const foam = loopNoise(c, out, { type: 'bandpass', freq: 2200, q: 0.5, gain: 0.1 });
    return stopAll([surf, foam, lfo(c, surf.filter.frequency, 0.09, 450), lfo(c, surf.gain.gain, 0.09, 0.3), lfo(c, foam.gain.gain, 0.09, 0.08)]);
  },
  wind(c, out) {
    const w = loopNoise(c, out, { type: 'bandpass', freq: 500, q: 1.4, gain: 0.5 });
    const low = loopNoise(c, out, { type: 'lowpass', freq: 220, gain: 0.3 });
    return stopAll([w, low, lfo(c, w.filter.frequency, 0.06, 300), lfo(c, w.gain.gain, 0.11, 0.25)]);
  },
  fire(c, out) {
    const rumble = loopNoise(c, out, { type: 'lowpass', freq: 260, gain: 0.55 });
    const pops = every(0.03, 0.35, () => crackle(c, out, rnd(0.04, 0.25)));
    const hiss = loopNoise(c, out, { type: 'highpass', freq: 3000, gain: 0.03 });
    return stopAll([rumble, pops, hiss, lfo(c, rumble.gain.gain, 0.3, 0.12)]);
  },
  forest(c, out) {
    const breeze = loopNoise(c, out, { type: 'bandpass', freq: 700, q: 0.8, gain: 0.12 });
    const birds = every(2.5, 8, () => {
      const f = rnd(2200, 3800), pan = rnd(-0.9, 0.9), n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) blip(c, out, { f, len: 0.09, loud: 0.05, glide: rnd(1.2, 1.5), pan, at: i * 0.13 });
    });
    return stopAll([breeze, birds, lfo(c, breeze.gain.gain, 0.07, 0.06)]);
  },
  space(c, out) {
    const parts = [];
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.connect(out);
    for (const [f, type] of [[55, 'sine'], [82.6, 'triangle'], [110.4, 'sine'], [164.8, 'triangle']]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = rnd(-8, 8);
      const g = c.createGain();
      g.gain.value = 0.09;
      o.connect(g).connect(lp);
      o.start();
      parts.push({ stop: () => o.stop() }, lfo(c, g.gain, rnd(0.03, 0.08), 0.05));
    }
    parts.push(lfo(c, lp.frequency, 0.04, 250));
    parts.push(every(3, 9, () => blip(c, out, { f: 880 * 2 ** (PENTA[Math.floor(Math.random() * PENTA.length)] / 12), len: 2.5, loud: 0.025, pan: rnd(-0.7, 0.7) })));
    return stopAll(parts);
  },
  cyber(c, out) {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 41.2;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    lp.Q.value = 6;
    const g = c.createGain();
    g.gain.value = 0.12;
    o.connect(lp).connect(g).connect(out);
    o.start();
    const hum = loopNoise(c, out, { type: 'highpass', freq: 5000, gain: 0.03 });
    const data = every(0.6, 3, () => {
      const n = 1 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) blip(c, out, { f: rnd(1200, 4200), len: 0.03, loud: 0.02, type: 'square', pan: rnd(-0.6, 0.6), at: i * 0.05 });
    });
    return stopAll([{ stop: () => o.stop() }, hum, data, lfo(c, lp.frequency, 0.05, 90)]);
  },
  chimes(c, out) {
    const breeze = loopNoise(c, out, { type: 'bandpass', freq: 900, q: 0.6, gain: 0.08 });
    const ring = every(0.8, 4, () => {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const f = 1046.5 * 2 ** (PENTA[Math.floor(Math.random() * 8)] / 12);
        blip(c, out, { f, len: 2.2, loud: 0.04, pan: rnd(-0.6, 0.6), at: i * rnd(0.15, 0.4) });
        blip(c, out, { f: f * 2.76, len: 0.8, loud: 0.008, at: i * 0.2 });
      }
    });
    return stopAll([breeze, ring, lfo(c, breeze.gain.gain, 0.1, 0.05)]);
  },
  night(c, out) {
    const air = loopNoise(c, out, { type: 'lowpass', freq: 400, gain: 0.12 });
    const crickets = every(0.4, 1.4, () => {
      const f = rnd(4200, 4800), pan = rnd(-0.9, 0.9);
      for (let i = 0; i < 3; i++) blip(c, out, { f, len: 0.035, loud: 0.018, pan, at: i * 0.06 });
    });
    return stopAll([air, crickets]);
  },
};

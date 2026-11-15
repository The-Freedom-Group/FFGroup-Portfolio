/* Sound, all made in the browser: there are no audio files. Under the whole page is a galaxy: a deep drone that
   breathes, a wash of air, soft high tones that drift in and out, and now and then a distant sparkle, all in one long
   room. It has no tune and no beat. It shifts a little with each part of the story: fuller out in space, quieter and
   warmer over the paper. On top of it, in the same room: a soft note as the story steps (a company), a tick (a
   territory), the three count beats and the launch.
   `galaxy(ctx)` builds all of it on any audio context, so the same sound can be rendered to a buffer and measured;
   `createSound()` runs it live: it fades in and out, never clicks, and rests while the tab is hidden. */
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
/* the same numbers every time, so every visitor gets the same room at the same level */
function seeded(a) { return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* how each part sits: the drone's root note, and how full the sound is there */
const SPACE = { level: 1, open: 900, shim: 1, wash: 1, warm: 0, gap: [7, 19] };          // the scenes out in space
const NIGHT = { level: 0.86, open: 700, shim: 0.75, wash: 0.8, warm: 0.3, gap: [10, 24] }; // the night-sky sheets
const PAPER = { level: 0.6, open: 460, shim: 0.36, wash: 0.45, warm: 1, gap: [18, 38] };   // the paper: quieter, warmer
const ACTS = { top: [38, SPACE], system: [35, SPACE], journey: [38, PAPER], traction: [40, PAPER], market: [43, PAPER], map: [35, SPACE],
  plan: [40, NIGHT], horizon: [42, NIGHT], crew: [38, PAPER], raise: [33, SPACE], beyond: [35, NIGHT], liftoff: [38, SPACE] };
const SPARK = [86, 88, 90, 93, 95, 98, 100];                                              // the notes a sparkle may be
export const LEVEL = 0.8;                                                                 // the master level when sound is on

export function galaxy(ctx, { room = 6.5 } = {}) {
  const sr = ctx.sampleRate, G = { gap: SPACE.gap };
  const gain = (v, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const osc = (type, f, to, cents = 0) => { const o = ctx.createOscillator(); if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type); o.frequency.value = f; o.detune.value = cents; if (to) o.connect(to); o.start(); return o; };
  const lfo = (rate, depth, param) => osc('sine', rate, gain(depth, param));
  const pan = (v, to) => { if (!ctx.createStereoPanner) return to; const p = ctx.createStereoPanner(); p.pan.value = v; p.connect(to); return p; };

  /* the way out: the master level (silent until asked for), then a soft ceiling, so nothing can ever clip */
  const ceil = ctx.createWaveShaper(); { const n = 2049, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1, a = Math.abs(x); c[i] = Math.sign(x) * (a <= 0.5 ? a : 0.5 + 0.45 * Math.tanh((a - 0.5) / 0.45)); } ceil.curve = c; ceil.oversample = '2x'; }
  ceil.connect(ctx.destination); const master = gain(0, ceil);

  /* the room: long and soft, darker as it dies away; each side carries the same energy */
  const verb = ctx.createConvolver(); verb.normalize = false;
  { const len = Math.floor(sr * room), ir = ctx.createBuffer(2, len, sr), pre = Math.floor(sr * 0.024), rise = sr * 0.04, fall = Math.exp(-6.2 / (len - pre));
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c), rnd = seeded(7 + c * 13); let lp = 0, env = 1, e = 0, k = 0.5;
      for (let i = pre; i < len; i++) { if ((i & 255) === 0) k = 0.5 * Math.pow(1 - (i - pre) / (len - pre), 1.6) + 0.03;   // how much top gets through: less as it decays
        lp += ((rnd() * 2 - 1) - lp) * k; const v = lp * env * Math.min(1, (i - pre) / rise); env *= fall; d[i] = v; e += v * v; }
      const s = 1 / Math.sqrt(e); for (let i = pre; i < len; i++) d[i] *= s; }
    verb.buffer = ir; }
  verb.connect(gain(0.62, master));

  /* the bed: what plays all the time. Some of it goes straight out, most of it goes through the room. */
  const bed = gain(1); bed.connect(gain(0.5, master)); bed.connect(gain(0.5, verb));
  /* the drone: a low root in a pair a few cents apart (the two drift slowly against each other), its fifth and its
     octave. The root and fifth are a soft, rounded wave rather than a bare sine: their overtones are what a laptop's
     small speakers can play, and the ear puts the deep note back under them. */
  const soft = ctx.createPeriodicWave(new Float32Array(9), Float32Array.from([0, 1, 0.6, 0.42, 0.3, 0.2, 0.14, 0.09, 0.06]));
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 900; tone.Q.value = 0.4; tone.connect(bed);
  const drone = gain(0.3, tone);
  const voices = [[-12, 'sine', 0.22, 0], [0, soft, 0.46, -4], [0, soft, 0.38, 5], [7, soft, 0.24, 2], [12, 'sine', 0.2, -3], [19, 'sine', 0.1, 4]]
    .map(([st, type, g, cents]) => ({ st, o: osc(type, hz(38 + st), gain(g, drone), cents) }));
  const warmG = gain(0, drone); voices.push({ st: 16, o: osc('sine', hz(38 + 16), warmG, -2) });   // a major third: only over the paper
  lfo(0.047, 110, tone.frequency); lfo(0.031, 0.03, drone.gain);                                  // it opens and closes, and swells, very slowly
  /* the wash: air, moving */
  const nb = ctx.createBuffer(1, Math.floor(sr * 6), sr); { const d = nb.getChannelData(0), rnd = seeded(31); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; } G.noise = nb;
  const washG = gain(0.08, bed), band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 520; band.Q.value = 0.7; band.connect(washG);
  { const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true; src.connect(band); src.start(); } lfo(0.023, 240, band.frequency);
  /* the shimmer: five high tones, each rising and falling at its own slow pace, a little off pitch, spread left to right */
  const shim = gain(1); shim.connect(gain(0.8, verb)); shim.connect(gain(0.14, master));
  [[74, 0.105, 17, -0.6], [81, 0.095, 23, 0.5], [86, 0.078, 13, -0.25], [88, 0.062, 29, 0.7], [93, 0.045, 19, 0.15]].forEach(([m, peak, period, p], k) => {
    const g = gain(peak / 2, pan(p, shim)), o = osc('sine', hz(m), g); lfo(1 / period, (k % 2 ? -1 : 1) * peak / 2, g.gain); lfo(0.11 + k * 0.03, 5, o.detune); });

  G.level = (v, tau = 0.4, t = ctx.currentTime) => master.gain.setTargetAtTime(v, t, tau);
  G.act = (id, t = ctx.currentTime) => {
    const [root, k] = ACTS[id] || ACTS.top; G.gap = k.gap;
    voices.forEach(v => v.o.frequency.setTargetAtTime(hz(root + v.st), t, 1.8));
    tone.frequency.setTargetAtTime(k.open, t, 1.5); bed.gain.setTargetAtTime(k.level, t, 1.5); shim.gain.setTargetAtTime(k.shim, t, 1.5);
    washG.gain.setTargetAtTime(0.08 * k.wash, t, 1.5); warmG.gain.setTargetAtTime(0.15 * k.warm, t, 2);
  };

  /* one short sound: a tone from f0 to f1 that rises fast and dies away, into the room (wet), straight out (dry), or both */
  function ping(type, f0, f1, dur, peak, t, { wet = 1, dry = 0, p = 0, att = 0.012 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); if (wet) g.connect(gain(wet, p ? pan(p, verb) : verb)); if (dry) g.connect(gain(dry, p ? pan(p, master) : master));
    o.start(t); o.stop(t + dur + 0.05);
  }
  /* a distant sparkle: one small high note far back in the room, sometimes answered by a second */
  G.sparkle = (t = ctx.currentTime, rnd = Math.random) => {
    const m = SPARK[Math.floor(rnd() * SPARK.length)], f = hz(m), p = rnd() * 1.6 - 0.8, g = 0.03 + rnd() * 0.02, dur = 1.4 + rnd() * 1.4;
    ping('sine', f, f, dur, g, t, { dry: 0.12, p, att: 0.006 }); ping('sine', f * 2, f * 2, dur * 0.4, g * 0.25, t, { p, att: 0.004 });
    if (rnd() < 0.35) { const f2 = hz(m + (rnd() < 0.5 ? 5 : 7)); ping('sine', f2, f2, dur * 0.8, g * 0.6, t + 0.09 + rnd() * 0.16, { p: -p, att: 0.006 }); }
  };
  G.step = (i, t = ctx.currentTime) => { const f = hz(74 + [0, 4, 7, 9, 12, 14][i % 6]); ping('sine', f, f * 0.998, 1.4, 0.05, t); ping('sine', f * 2, f * 2, 0.5, 0.012, t); };
  G.tick = (t = ctx.currentTime) => ping('sine', 1500, 1100, 0.05, 0.03, t, { wet: 0.5, dry: 1 });
  G.beat = (t = ctx.currentTime) => ping('sine', 880, 880, 0.16, 0.09, t);
  /* the launch: a bright note, a rumble that opens up, and a low note falling away */
  G.launch = (t = ctx.currentTime) => {
    ping('sine', 1320, 1320, 0.5, 0.1, t);
    const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(90, t); lp.frequency.exponentialRampToValueAtTime(1500, t + 2.2); lp.frequency.exponentialRampToValueAtTime(260, t + 6.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.9); g.gain.setValueAtTime(0.5, t + 3.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 7); src.connect(lp); lp.connect(g); g.connect(master); g.connect(gain(0.5, verb)); src.start(t); src.stop(t + 7.2);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(58, t); o.frequency.exponentialRampToValueAtTime(30, t + 6.5); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.45, t + 0.7); og.gain.exponentialRampToValueAtTime(0.0001, t + 6.8); o.connect(og); og.connect(master); o.start(t); o.stop(t + 7);
  };
  return G;
}

export function createSound() {
  const S = { ctx: null, G: null, on: false, act: 'top', begun: false, sp: 0, rest: 0, stepT: 0, tickT: 0 };
  function init() {
    if (S.ctx) return true; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try { S.ctx = new AC(); S.G = galaxy(S.ctx, { room: matchMedia('(pointer: coarse)').matches ? 3.8 : 6.5 }); S.G.act(S.act, 0); } catch (e) { console.error('sound', e); S.ctx = null; return false; }
    S.ctx.addEventListener('statechange', () => { if (S.ctx.state === 'running') S.begun = true; });
    return true;
  }
  const live = () => !!(S.ctx && S.on && !document.hidden && S.ctx.state === 'running');
  /* the sparkles come when they like: a new wait is drawn each time, longer over the paper */
  function sparkles() { clearTimeout(S.sp); if (!S.on || document.hidden) return; const [a, b] = S.G.gap; S.sp = setTimeout(() => { if (live()) S.G.sparkle(S.ctx.currentTime + 0.05); sparkles(); }, (a + Math.random() * (b - a)) * 1000); }
  document.addEventListener('visibilitychange', () => {
    if (!S.ctx) return; clearTimeout(S.rest);
    if (document.hidden) { S.G.level(0, 0.06); clearTimeout(S.sp); S.rest = setTimeout(() => { if (document.hidden) S.ctx.suspend().catch(() => {}); }, 350); }
    else if (S.on) { S.ctx.resume().catch(() => {}); S.G.level(LEVEL, 0.5); sparkles(); }
  });
  return {
    get on() { return S.on; },
    get running() { return !!(S.ctx && S.ctx.state === 'running'); },
    /* on: wake the audio (a browser only allows this from a press or a key) and fade in over a few seconds the first
       time, quicker after that. off: fade out, then let the audio rest. */
    setOn(on) {
      S.on = !!on; if ((!S.on && !S.ctx) || !init()) return; clearTimeout(S.rest);
      if (S.on) { if (document.hidden) return; S.ctx.resume().catch(() => {}); S.G.level(LEVEL, S.begun ? 0.45 : 1.2); S.G.act(S.act); sparkles(); }
      else { S.G.level(0, 0.25); clearTimeout(S.sp); S.rest = setTimeout(() => { if (!S.on) S.ctx.suspend().catch(() => {}); }, 2200); }
    },
    act(id) { S.act = id; if (S.G) S.G.act(id); },
    /* a fast pull through the story would fire these in a flurry: each waits a moment after the last */
    step(i) { const t = performance.now(); if (live() && t - S.stepT > 140) { S.stepT = t; S.G.step(i); } },
    tick() { const t = performance.now(); if (live() && t - S.tickT > 70) { S.tickT = t; S.G.tick(); } },
    countdown() { if (live()) [0, 1, 2].forEach(k => S.G.beat(S.ctx.currentTime + k)); },
    launch() { if (live()) S.G.launch(); }
  };
}

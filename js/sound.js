/* Sound, all made in the browser and off until asked for: a slow bed of four soft notes that changes chord with each
   part of the story, a small tick as the story steps (a company, a territory), the three count beats, and the launch
   itself: a rumble that opens up and a low note falling away. A short synthetic room gives the big sounds some air. */
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = { top: [50, 57, 64, 69], system: [47, 54, 61, 66], focus: [43, 50, 57, 62], journey: [45, 52, 59, 64], traction: [50, 57, 62, 66], market: [48, 55, 60, 64], map: [40, 47, 54, 59],
  plan: [43, 55, 59, 62], horizon: [45, 52, 57, 64], crew: [50, 57, 62, 69], raise: [42, 49, 56, 61], beyond: [38, 50, 57, 64], liftoff: [50, 57, 64, 68] };

export function createSound() {
  const S = { ctx: null, on: false, act: 'top' };
  function init() {
    if (S.ctx) return; const AC = window.AudioContext || window.webkitAudioContext; const ctx = S.ctx = new AC();
    S.master = ctx.createGain(); S.master.gain.value = 0; const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; S.master.connect(comp); comp.connect(ctx.destination);
    /* a room: two seconds of decaying noise */
    const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    S.verb = ctx.createConvolver(); S.verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.5; S.verb.connect(vg); vg.connect(S.master);
    /* the bed: four sines through a slow filter */
    S.bed = ctx.createGain(); S.bed.gain.value = 0.05; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; S.bed.connect(lp); lp.connect(S.master); lp.connect(S.verb);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 320; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    S.voices = CHORDS.top.map((m, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = hz(m); o.detune.value = (i - 1.5) * 4; g.gain.value = i === 0 ? 0.9 : 0.5; o.connect(g); g.connect(S.bed); o.start(); return o; });
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; S.noise = nb;
  }
  const ready = () => !!(S.ctx && S.on);
  function tone(type, f0, f1, dur, gain, dest) { const ctx = S.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest || S.master); o.start(t); o.stop(t + dur + 0.05); }
  function chord(id) { const c = CHORDS[id] || CHORDS.top, t = S.ctx.currentTime; S.voices.forEach((v, i) => v.frequency.setTargetAtTime(hz(c[i]), t, 0.9)); }
  return {
    get on() { return S.on; },
    setOn(on) { init(); S.ctx.resume(); S.on = on; S.master.gain.setTargetAtTime(on ? 0.7 : 0, S.ctx.currentTime, 0.35); if (on) chord(S.act); },
    act(id) { S.act = id; if (ready()) chord(id); },
    step(i) { if (!ready()) return; const f = hz(74 + [0, 4, 7, 9, 12, 14][i % 6]); tone('sine', f, f * 0.998, 1.4, 0.05, S.verb); tone('sine', f * 2, f * 2, 0.5, 0.012, S.verb); },
    tick() { if (ready()) tone('sine', 1500, 1100, 0.05, 0.03); },
    countdown() { if (!ready()) return; [0, 1, 2].forEach(k => setTimeout(() => ready() && tone('sine', 880, 880, 0.16, 0.09, S.verb), k * 1000)); },
    launch() {
      if (!ready()) return; const ctx = S.ctx, t = ctx.currentTime; tone('sine', 1320, 1320, 0.5, 0.1, S.verb);
      const src = ctx.createBufferSource(); src.buffer = S.noise; src.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(90, t); lp.frequency.exponentialRampToValueAtTime(1500, t + 2.2); lp.frequency.exponentialRampToValueAtTime(260, t + 6.5);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.9); g.gain.setValueAtTime(0.55, t + 3.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 7); src.connect(lp); lp.connect(g); g.connect(S.master); g.connect(S.verb); src.start(t); src.stop(t + 7.2);
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(58, t); o.frequency.exponentialRampToValueAtTime(30, t + 6.5); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.5, t + 0.7); og.gain.exponentialRampToValueAtTime(0.0001, t + 6.8); o.connect(og); og.connect(S.master); o.start(t); o.stop(t + 7);
    }
  };
}

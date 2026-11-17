/* The world behind the page: one renderer, the space scene (mark, system, map, night sky), the cloud that passes over it
   on the way down and the way up, the launch pad, and the film finish on every frame. The page says which world is on
   screen and how far through each scene the story is; this draws it, and tells the page where the names go. */
import * as THREE from 'three';
import { createPost } from './post.js';
import { pickQuality, levelSpec, remember } from './quality.js';
import { maps } from './planets.js';
import { createOrbit } from './w-orbit.js';
import { createClouds } from './w-clouds.js';
import { createPad, ARRIVE } from './w-pad.js';
import { createGlobe } from './w-globe.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/* the last three parts are one evening in one world: the climb at dusk, the night sky over Beyond ('eve'), the pad.
   The expansion map's night is the night sky itself (w-globe draws over it), so those two join with no dip between them */
const FAMILY = { orbit: 'space', descent: 'space', sky: 'sky', globe: 'sky', climb: 'pad', eve: 'pad', pad: 'pad' };

/* Built at once and drawn from the first frame; `ready` settles when the maps the opening needs have landed. */
export function createWorld({ canvas, onProgress }) {
  const coarse = matchMedia('(pointer: coarse)').matches, small = coarse && Math.min(screen.width, screen.height) <= 600;
  const q = pickQuality({ small }), spec = levelSpec(q.level, small); maps.quality = spec.maps;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x030308, 1);
  let W = innerWidth, H = innerHeight; const dprCap = () => Math.max(0.6, Math.min(devicePixelRatio || 1, spec.cap, Math.sqrt(spec.budget / (W * H))));
  let dpr = dprCap(), scale = 1; renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
  maps.onTexture = t => renderer.initTexture(t);                                     // each map is uploaded as it lands, not on the frame it is first seen

  const orbit = createOrbit({ renderer, small, dpr, spec }), clouds = createClouds({ small, lite: q.level === 'low' }), pad = createPad({ renderer, small, dpr, spec });
  const post = createPost(renderer, { phone: small, bloom: spec.bloom, dof: false, samples: dpr >= 1.4 ? 0 : 2 });
  post.uniforms.bloomK.value = 0.16; post.uniforms.vignette.value = 0.5;
  /* the expansion map: its own globe. By day it stands on the page's white, so the finish is eased off there (no glow
     bleeding off the sheet, no darkened corners, less grain) and comes back as its night falls */
  const globe = createGlobe({ renderer, small, grade: post.uniforms }), finish = { bloomK: post.uniforms.bloomK.value, vignette: post.uniforms.vignette.value, grain: post.uniforms.grain.value };
  const setFinish = k => { post.uniforms.bloomK.value = finish.bloomK * (k ? k.bloom : 1); post.uniforms.vignette.value = finish.vignette * (k ? k.vignette : 1); post.uniforms.grain.value = finish.grain * (k ? k.grain : 1); };
  function drawMap(s, dt, time) {
    orbit.update(s, dt, time, 'sky'); clouds.update(null, 0, time, W / H); setFinish(globe.update(s, dt, time));
    if (globe.look.solid) post.render(globe.scene, globe.camera, time); else post.render(orbit.scene, orbit.camera, time, r => globe.draw(r));   // the sky is only drawn once the sheet lets it show
  }

  function resize() { W = innerWidth; H = innerHeight; dpr = dprCap() * scale; renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); orbit.resize(W, H); pad.resize(W, H); orbit.setDpr(dpr); pad.setDpr(dpr); }
  resize(); addEventListener('resize', resize);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); setTimeout(() => location.reload(), 300); });

  /* the opening needs the globe's maps and the sky; the other worlds' maps carry on arriving behind it */
  const NEED = ['earth-day', 'earth-night', 'earth-clouds', 'earth-spec', 'earth-normal', 'milkyway']; const got = new Set(); let loadK = 0, isReady = false;
  const ready = new Promise(res => {
    maps.onItem = name => { if (NEED.includes(name)) got.add(name); loadK = got.size / NEED.length; onProgress(Math.min(0.97, loadK), loadK < 0.6 ? 'Plotting the orbit' : 'Lighting the worlds'); if (got.size >= NEED.length) res(); };
    setTimeout(res, 20000);
  }).then(() => { isReady = true; onProgress(1, 'Ready'); });
  /* the evening's shaders are built while the page is idle, against the target they will be drawn into, so the first sight of the raise does not stall the scroll */
  orbit.warm(); (window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => { const rt = renderer.getRenderTarget(); renderer.setRenderTarget(post.target); pad.warm(); clouds.warm(renderer); renderer.setRenderTarget(rt); });
  (window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => globe.warm());

  /* ───────── which world, and the dip through black between worlds that do not join ───────── */
  let mode = null, shown = null, dipT = 0, veil = null;
  function setMode(m) { mode = m; if (!shown || !m || FAMILY[shown] === FAMILY[m] || FAMILY[shown] === 'space' && false) { swap(); return; } if (!dipT) { dipT = 1; canvas.style.transition = 'opacity .22s'; canvas.style.opacity = 0; setTimeout(() => { swap(); canvas.style.transition = 'opacity .55s'; canvas.style.opacity = 1; dipT = 0; }, 230); } }
  function swap() { const was = shown; shown = mode; if (shown && (!was || FAMILY[was] !== FAMILY[shown])) { orbit.snap(); pad.snap(); } }

  /* ───────── frame ───────── */
  let introK = 0, introB = 0, frames = 0, acc = 0, calm = 0, late = 0; const sky = { x: 0, y: 0, dusk: 1 };
  function update(s, dt, time) {
    if (!isReady) introK += (loadK * 0.9 - introK) * (1 - Math.exp(-dt * 3));         // while it loads, the orbit closes as far as the loading has got
    orbit.setIntro(introK, introB);
    pad.out.on = FAMILY[shown] === 'pad';
    if (!shown) return;
    setFinish(null);
    if (pad.out.on) {   /* the evening: the pad's own sky and ground, with the cloud of the climb over it while the raise is on screen */
      pad.update(s, dt, time); sky.x = pad.out.moonX / W; sky.y = pad.out.moonY / H; sky.dusk = pad.out.dusk;
      clouds.update(s.raise.on ? 'up' : null, s.raise.pe, time, W / H, sky);
      post.st.aperture = 0; post.render(pad.scene, pad.camera, time, clouds.st.on ? r => clouds.draw(r) : null);
    } else if (shown === 'globe') drawMap(s, dt, time);                // the expansion map draws itself
    else {
      const fam = FAMILY[shown]; orbit.update(s, dt, time, fam === 'space' ? 'orbit' : fam);
      clouds.st.dive = orbit.out.dive;                                 // the way down is told how far the dive has got
      clouds.update(fam === 'space' ? 'down' : null, s.focus.pe, time, W / H);
      /* the way down comes out into even daylight, so the lens stops darkening the corners there */
      post.uniforms.vignette.value = finish.vignette * (1 - (clouds.st.downAt === time ? clouds.st.flat : 0));
      Object.assign(post.st.lens, orbit.out.lens);                    // the opening's hole bends the light round it
      post.render(orbit.scene, orbit.camera, time, clouds.st.on ? r => clouds.draw(r) : null);
    }
    /* keep the frame rate: draw fewer pixels when frames run long, more again when they are comfortably short */
    acc += dt; if (++frames >= 45) { const avg = acc / frames; frames = 0; acc = 0;
      if (avg > 0.024 && scale > 0.62) { scale = Math.max(0.6, scale - 0.14); calm = 0; late++; resize(); if (late === 3) remember('low', 'frames ran long'); }
      else if (avg < 0.0185 && scale < 1 && ++calm >= 5) { scale = Math.min(1, scale + 0.1); calm = 0; resize(); } }
  }

  /* the start: the orbit closes round the globe, then the three bodies arrive */
  function intro() { return new Promise(res => { const t0 = performance.now(), k0 = introK; const tick = now => { const t = (now - t0) / 1000, e = 1 - Math.pow(1 - clamp(t / 0.9), 3); introK = k0 + (1 - k0) * e; introB = clamp((t - 0.35) / 0.9); if (t < 1.3) requestAnimationFrame(tick); else { introK = 1; introB = 1; res(); } }; requestAnimationFrame(tick); }); }

  return { setMode, update, intro, resize, ready, quality: q, spec,
    get out() { return orbit.out; }, get veil() { return clouds.st.veil; }, get mode() { return shown; },
    /* the launch rocket on the screen (see `out` in w-pad.js), and the stretch of the liftoff scene over which it arrives */
    get pad() { return pad.out; }, arriveSpan: ARRIVE,
    get map() { return globe.out; },                              // where the expansion map's globe and pins are on the stage, and how far its night has fallen
    launch() { return pad.launch(); }, arrive() { pad.reset(); orbit.snap(); },
    peek() { return { mode: shown, dpr, scale, level: q.level, gpu: q.gpu }; }, dbg: { orbit, pad, clouds, post, renderer } };
}

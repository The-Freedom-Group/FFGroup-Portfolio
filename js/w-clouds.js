/* Cloud, drawn over whatever is behind it. The view is along the direction of travel: going down (the way into the
   journey) you look at the ground and fall through one deck of cloud after another, each swelling out from the middle of
   the screen until you are inside it and through; going up (the raise) the decks come at you out of the dusk and fall
   away (that cloud is quieter and has its own shader, further down). Each deck is a field of puffed cloud lit from one
   side, hazier the further off it is. Behind the decks on the way down is the air itself, which fades in over space; a
   fog can close over everything, which is how the descent ends in the colour of the page. One full-screen triangle. */
import * as THREE from 'three';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FS = `precision highp float; varying vec2 vUv;
uniform float time, aspect, depth, air, fog, grainK, gaps, rim;
uniform vec3 airA, airB, cLit, cShade, cFog; uniform vec2 light;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.0, w = 0.5; for (int i = 0; i < OCT; i++) { a += w * noise(p); p = p * 2.07 + vec2(13.7, 7.1); w *= 0.5; } return a; }
void main(){
  vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5); float r = length(p);
  vec3 airC = mix(airA, airB, smoothstep(0.0, 0.85, r));
  vec3 col = airC; float a = air;
  for (int i = LAYERS - 1; i >= 0; i--) {
    float z = float(i) + 1.0 - depth;                             // how far off this deck is: 0 = we are in it
    if (z < 0.015 || z > 4.2) continue;
    vec2 off = vec2(hash(vec2(float(i), 1.7)), hash(vec2(float(i), 9.2))) * 40.0;
    vec2 q = p * z * 1.55 + off + vec2(time * 0.006, 0.0);
    vec2 w = (vec2(fbm(q * 1.3 + 2.0), fbm(q * 1.3 + 7.3)) - 0.5) * WARP;       // the shapes are pushed about, so edges billow rather than run straight
    float d = fbm(q + w) + noise(q * 8.0) * 0.03, l = fbm(q + w + light * 0.055);
    float th = mix(0.6, 0.47, gaps) - 0.05 * hash(vec2(float(i), 3.3));
    float soft = mix(0.34, 0.09, smoothstep(0.1, 1.2, z));
    float dens = smoothstep(th, th + soft, d);
    dens *= smoothstep(4.2, 2.6, z) * smoothstep(0.015, 0.22, z);  // decks fade in from the distance, and thin as we pass through
    float lit = clamp(0.5 + (d - l) * 7.0, 0.0, 1.0); lit = lit * lit * (3.0 - 2.0 * lit);
    lit *= mix(1.0, 1.0 - smoothstep(th + 0.02, th + 0.2, d), rim);  // rim: only the edges catch the light, the body stays dark
    vec3 c = mix(cShade, cLit, lit) * (0.9 + 0.2 * d);
    c = mix(c, airC, smoothstep(1.4, 4.2, z) * 0.62);              // distance takes the contrast out
    col = mix(col, c, dens); a = a + (1.0 - a) * dens;
    float inside = (1.0 - smoothstep(0.0, 0.42, z)) * 0.7;         // inside a deck everything goes to its own grey-white
    col = mix(col, mix(cShade, cLit, 0.62), inside); a = max(a, inside);
  }
  col = mix(col, cFog, fog); a = max(a, fog);
  col += (hash(gl_FragCoord.xy + fract(time) * 91.7) - 0.5) * grainK;
  gl_FragColor = vec4(col, a);
}`;

/* the sky of the way down. Colours are scene-linear and go through the same finish as everything else. */
const DOWN = { airA: [0.07, 0.19, 0.4], airB: [0.42, 0.58, 0.78], cLit: [1.14, 1.1, 1.04], cShade: [0.46, 0.52, 0.64], cFog: [0.9, 0.86, 0.8], light: [-0.62, 0.78], rim: 0 };

/* The climb (the raise) has its own, quieter cloud, drawn over the evening sky of the launch pad's world, so the moon and
   the dusk behind it are the real ones. It starts under a deck of cloud, rises into it (the frame fills with mist) and
   comes out above: from there the cloud is dark and sparse and keeps to the edges of the frame, lit along its rims from
   where the moon is, the last pink of the dusk on its undersides, and the deck that was climbed through lies along the
   bottom as a soft bank. As night settles it all thins away. Colour comes out already multiplied by its cover. */
const FS_UP = `precision highp float; varying vec2 vUv;
uniform float time, aspect, ride, cover, room, veil, bank, thin, dusk; uniform vec2 moon;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.0, w = 0.5; for (int i = 0; i < OCT; i++) { a += w * noise(p); p = p * 2.07 + vec2(13.7, 7.1); w *= 0.5; } return a; }
void main(){
  vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  vec2 toMoon = normalize(moon - p + vec2(1e-4)); float nearMoon = exp(-length(moon - p) * 2.4);
  vec3 cShade = mix(vec3(0.011, 0.011, 0.02), vec3(0.03, 0.025, 0.05), dusk);         // the body of the cloud: dark, purple while there is dusk
  vec3 cLit = mix(vec3(0.085, 0.09, 0.125), vec3(0.17, 0.15, 0.225), dusk);           // where the moon catches it
  vec3 cGlow = vec3(0.15, 0.048, 0.092) * dusk;                                       // the last of the dusk, from below
  vec3 pm = vec3(0.0); float a = 0.0;
  float edge = length(vec2(p.x / (aspect * 0.5), p.y / 0.5));                         // 0 in the middle of the frame, 1 at its sides
  float keep = mix(1.0, mix(0.06, 1.0, smoothstep(0.55, 1.22, edge)), room) * (1.0 - nearMoon * 0.8 * room) * (1.0 - thin);
  float th = mix(0.575, 0.47, cover), f = fract(ride), base = floor(ride);
  for (int j = LAYERS - 1; j >= 0; j--) {
    float z = (float(j) + 1.0 - f) / float(LAYERS);                                   // 1: a deck far ahead; 0: going past
    float id = base + float(j);
    vec2 q = p * mix(0.5, 2.5, z) + vec2(hash(vec2(id, 1.7)), hash(vec2(id, 9.2))) * 40.0 + vec2(time * 0.004, 0.0);
    vec2 w = (vec2(noise(q * 1.4 + 2.0), noise(q * 1.4 + 7.3)) - 0.5) * WARP;
    float d = fbm(q + w), l = fbm(q + w + toMoon * 0.07);
    float dens = smoothstep(th, th + mix(0.3, 0.13, z), d) * smoothstep(1.0, 0.7, z) * smoothstep(0.0, 0.22, z) * keep;
    float lit = clamp(0.5 + (d - l) * 6.5, 0.0, 1.0); lit = lit * lit * (3.0 - 2.0 * lit);
    lit *= 1.0 - smoothstep(th + 0.03, th + 0.2, d) * 0.85;                           // only the rims catch it
    vec3 c = mix(cShade, cLit, lit * (0.55 + 0.9 * nearMoon)) + cGlow * (0.1 + 0.9 * smoothstep(0.15, -0.5, p.y)) * (1.0 - lit);
    pm = c * dens + pm * (1.0 - dens); a = dens + a * (1.0 - dens);
  }
  if (bank > 0.002) {                                                                 // the deck below: two soft ridges, the nearer one darker
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      float crest = -0.5 + bank * (0.2 - fk * 0.085) - (1.0 - bank) * 0.08 + (fbm(vec2(p.x * (1.5 + fk * 0.9) + fk * 11.0 + time * (0.006 + fk * 0.005), 1.3 + fk * 4.0)) - 0.5) * (0.2 - fk * 0.05);
      float body = smoothstep(crest + 0.014, crest - 0.085, p.y);
      float tex = fbm(vec2(p.x * 3.2 + time * 0.008 + fk * 5.0, p.y * 5.5 + 9.0));
      float top = smoothstep(crest - 0.17, crest + 0.01, p.y);
      vec3 c = mix(cShade * (1.5 - fk * 0.5), cLit * (0.8 - fk * 0.22), top * (0.35 + 0.65 * tex)) + cGlow * 0.3 * (1.0 - top);
      float al = body * (0.5 + 0.38 * tex + fk * 0.1) * bank * (1.0 - thin);
      pm = c * al + pm * (1.0 - al); a = al + a * (1.0 - al);
    }
  }
  if (veil > 0.002) {                                                                 // inside the deck
    float t = fbm(p * 1.3 + vec2(0.0, ride * 0.8) + 20.0);
    vec3 c = mix(cShade * 1.5, cLit * 0.6, 0.25 + 0.6 * t) + cGlow * 0.2 * smoothstep(0.2, -0.5, p.y);
    float al = veil * (0.62 + 0.38 * t) * (1.0 - nearMoon * 0.35);
    pm = c * al + pm * (1.0 - al); a = al + a * (1.0 - al);
  }
  pm += (hash(gl_FragCoord.xy + fract(time) * 91.7) - 0.5) * 0.008 * a;
  gl_FragColor = vec4(pm, a);
}`;

export function createClouds({ small, lite }) {
  const K = small ? 5 : 6;
  const u = { time: { value: 0 }, aspect: { value: 1 }, depth: { value: 0 }, air: { value: 0 }, fog: { value: 0 }, gaps: { value: 0.5 }, rim: { value: 0 }, grainK: { value: 0.012 }, light: { value: new THREE.Vector2() } };
  ['airA', 'airB', 'cLit', 'cShade', 'cFog'].forEach(k => { u[k] = { value: new THREE.Vector3() }; });
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, defines: { LAYERS: K, OCT: small ? 4 : 5, WARP: small && lite ? '0.0' : small ? '0.6' : '0.85' }, transparent: true, depthTest: false, depthWrite: false });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; const scene = new THREE.Scene(); scene.add(mesh); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let look = null; const base = {};
  const set = L => { if (look === L) return; look = L; for (const k in L) { if (typeof L[k] === 'number') { u[k].value = L[k]; continue; } const v = u[k].value; L[k].length === 2 ? v.set(L[k][0], L[k][1]) : v.set(L[k][0], L[k][1], L[k][2]); } base.a = L.airA.slice(); base.b = L.airB.slice(); };
  const sp = (v, a, b) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const st = { on: false, veil: 0 };
  /* the climb's own cloud: fewer decks, fewer octaves, and it is laid over the sky rather than replacing it */
  const uu = { time: { value: 0 }, aspect: { value: 1 }, ride: { value: 0 }, cover: { value: 0 }, room: { value: 1 }, veil: { value: 0 }, bank: { value: 0 }, thin: { value: 0 }, dusk: { value: 1 }, moon: { value: new THREE.Vector2(-0.4, 0.3) } };
  const matUp = new THREE.ShaderMaterial({ uniforms: uu, vertexShader: VS, fragmentShader: FS_UP, defines: { LAYERS: small ? 2 : 3, OCT: small ? 3 : 4, WARP: small && lite ? '0.0' : '0.7' }, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false });
  const meshUp = new THREE.Mesh(geo, matUp); meshUp.frustumCulled = false; const sceneUp = new THREE.Scene(); sceneUp.add(meshUp); let cur = null;
  return { st, scene, mat, matUp,
    /* which: 'down' with e = progress through the descent (negative while the dive is still arriving), 'up' through the raise
       (sky: where the moon is on the screen as fractions of its width and height, and how much dusk is left), or null */
    update(which, e, time, aspect, sky) {
      cur = which;
      u.time.value = time; u.aspect.value = aspect; st.veil = 0;
      if (which === 'down') {
        goDown(e, time, aspect, { st, scene, mesh, mat, small, lite });      // the way down has its own picture: see the end of this file
      } else if (which === 'up') {
        /* under the deck as the scene arrives, through it as it pins, above it by the time the heading is up; the bank
           holds below the brief and sinks as the brief leaves; everything thins as night settles */
        uu.time.value = time; uu.aspect.value = aspect; uu.ride.value = 1.9 + Math.max(-0.4, e) * 5.2;
        uu.cover.value = 0.8 * (1 - sp(e, -0.05, 0.11)); uu.room.value = sp(e, -0.02, 0.12); uu.veil.value = sp(e, -0.13, 0.0) * (1 - sp(e, 0.015, 0.105)) * 0.86;
        uu.bank.value = sp(e, 0.05, 0.2) * (1 - sp(e, 0.81, 0.94)); uu.thin.value = sp(e, 0.82, 0.955); uu.dusk.value = sky ? sky.dusk : 1;
        if (sky) uu.moon.value.set((sky.x - 0.5) * aspect, 0.5 - sky.y);
        st.on = e < 0.96;
      } else st.on = false;
    },
    draw(renderer) { const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(cur === 'up' ? sceneUp : scene, cam); renderer.autoClear = ac; },
    /* the climb's shader is built before the raise is reached, so the first sight of it does not stall the scroll */
    warm(renderer) { renderer.compile(sceneUp, cam); } };
}

/* ───────── the way down ─────────
   Going down is not the ride going up is, so it has its own picture, drawn on the same triangle. The dive ends with
   Freedom Global filling the screen. From there:
   - the planet's own blue closes over it, bright where the light comes in at the upper left and deepening away from it;
   - the light blooms out of that corner until the whole screen is white;
   - the glare clears to a pale sky with cloud in it, already lit; you fall through one deck of it and into the next;
   - that second deck is the cool white sheet the investment screen stands on. The page lays its own sheet over the top
     at that point (the exact colour, no grain), so nothing is drawn here until the screen moves on;
   - on the way out more cloud passes, light on light, with a little of Global's blue left high in the air, while the
     white turns from Global's cool to the paper's warm; the last deck closes to the colour of the journey's page.
   Every value is a plain function of how far the scroll has got, so it runs the same backwards as forwards. */
const DOWN_FS = `precision highp float; varying vec2 vUv;
uniform float time, aspect, grainK, blue, white, depth, decks, gap, soften, fog, warm, wash;
uniform vec3 cPale, cMid, cDeep, cNight, skyA, skyGap, skyB, litA, litB, shadeA, shadeB, fogA, fogB, cWash; uniform vec2 light;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.0, w = 0.5; for (int i = 0; i < OCT; i++) { a += w * noise(p); p = p * 2.07 + vec2(13.7, 7.1); w *= 0.5; } return a; }
float fbm3(vec2 p){ float a = 0.0, w = 0.5; for (int i = 0; i < 3; i++) { a += w * noise(p); p = p * 2.07 + vec2(13.7, 7.1); w *= 0.5; } return a; }
void main(){
  vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  float d = length(vec2((vUv.x - 0.32) * aspect, vUv.y - 0.70)) / (0.9 * length(vec2(aspect, 1.0)));   // how far from where the light comes in
  vec3 col = mix(cPale, cMid, pow(smoothstep(0.0, 0.4, d), 0.6)); col = mix(col, cDeep, smoothstep(0.4, 0.75, d)); col = mix(col, cNight, smoothstep(0.75, 1.0, d));
  vec3 lit = mix(litA, litB, warm), shade = mix(mix(shadeA, shadeB, warm), lit, soften);
  vec3 sky = mix(mix(skyA, skyGap, gap * (1.0 - 0.35 * d)), skyB, warm);
  sky = mix(sky, cWash, wash * smoothstep(0.25, 1.0, vUv.y));                             // Global's blue, thin, high in the air
  col = mix(col, sky, smoothstep(0.0, 1.0, white * 1.85 - d));                           // the whiteout, out from the light
  if (decks > 0.002) for (int i = LAYERS - 1; i >= 0; i--) {
    float z = float(i) + 1.0 - depth;                             // how far off this deck is: 0 = we are in it
    if (z < 0.02 || z > 3.6) continue;
    vec2 q = p * z * 1.15 + vec2(hash(vec2(float(i), 1.7)), hash(vec2(float(i), 9.2))) * 40.0 + vec2(time * 0.006, 0.0);
#ifdef WARP
    q += (vec2(fbm3(q * 1.3 + 2.0), fbm3(q * 1.3 + 7.3)) - 0.5) * WARP;                  // the shapes are pushed about, so edges billow
#endif
    float n = fbm(q), l = fbm(q + light * 0.07);
    float th = 0.47 - 0.05 * hash(vec2(float(i), 3.3));
    float dens = smoothstep(th, th + mix(0.4, 0.15, smoothstep(0.1, 1.2, z)), n) * smoothstep(3.6, 2.2, z) * smoothstep(0.02, 0.25, z) * decks;
    float k = clamp(0.5 + (n - l) * 9.0, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);
    vec3 c = mix(mix(shade, lit, k), sky, smoothstep(1.2, 3.6, z) * 0.55);               // distance takes the contrast out
    col = mix(col, c, dens);
    col = mix(col, mix(shade, lit, 0.78), (1.0 - smoothstep(0.0, 0.3, z)) * 0.6 * decks);    // inside a deck everything goes to its own white
  }
  col = mix(col, mix(fogA, fogB, warm), fog);
  col *= 1.0 + (hash(gl_FragCoord.xy + fract(time) * 91.7) - 0.5) * grainK;
  gl_FragColor = vec4(col, blue);
}`;

/* The colours, scene-linear, each worked back from the screen colour it has to arrive at once the film finish has had
   it (post.js: the filmic curve, then warmer highlights). The blues are the earlier portfolio's own for this planet. */
const TINT = {
  cPale: [0.126, 1.041, 3.511], cMid: [0.028, 0.252, 0.888], cDeep: [0.032, 0.087, 0.268], cNight: [0.015, 0.026, 0.094],   // #c2e6f8, #3f9ae2, #1c4f9c, #071c52
  skyA: [1.36, 2.216, 6.085], skyGap: [0.516, 1.058, 3.671], skyB: [1.175, 1.078, 0.921],   // behind the cloud: the glare #f2f5fa, the pale sky it clears to #dae6f8, and warm #eae6de
  litA: [2.277, 3.526, 8.358], litB: [3.238, 3.182, 3.166],         // the lit side of the cloud: #f9fafb cool, #fbf9f5 warm
  shadeA: [0.428, 0.603, 1.27], shadeB: [0.774, 0.69, 0.584],       // its shaded side: #c4d0e8 cool, #dcd6cc warm
  fogA: [1.194, 1.722, 4.272], fogB: [1.868, 1.738, 1.534],         // what it clears to: the sheet #eef1f8, then the paper #f4f1eb
  cWash: [0.113, 0.701, 3.002] };                                   // Global's blue thinned out: #b0d8f8
/* a bright field also glows (post.js adds its whole glow chain back on top), so each colour is turned down by what the
   glow will add to it; gain is the chain's length times its strength, nothing where the glow is off */
function underGlow(C, gain) {
  let c = C; if (!gain) return c;
  for (let n = 0; n < 24; n++) { const br = Math.max(c[0], c[1], c[2], 1e-4), soft = Math.min(0.9, Math.max(0, br - 0.45)) ** 2 / 1.8, w = Math.max(soft, br - 0.9) / br; c = C.map(v => v / (1 + gain * w)); }
  return c;
}
function makeDown({ scene, mesh, mat, small, lite }) {
  const gain = lite ? 0 : (small ? 4 : 6) * 0.16;
  const u = { time: { value: 0 }, aspect: { value: 1 }, grainK: { value: 0.012 }, light: { value: new THREE.Vector2(-0.62, 0.78) } };
  ['blue', 'white', 'depth', 'decks', 'gap', 'soften', 'fog', 'warm', 'wash'].forEach(k => { u[k] = { value: 0 }; });
  for (const k in TINT) u[k] = { value: new THREE.Vector3(...underGlow(TINT[k], gain)) };
  const defines = { LAYERS: 6, OCT: small ? 4 : 5 }; if (!(small && lite)) defines.WARP = small ? '0.4' : '0.55';
  const dmat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: DOWN_FS, defines, transparent: true, depthTest: false, depthWrite: false });
  const d = { u, mat: dmat, at: -1 };
  /* the one triangle wears this picture on the frames the way down asked for, and the shared one on every other */
  scene.onBeforeRender = () => { mesh.material = d.at === mat.uniforms.time.value ? dmat : mat; };
  return d;
}
let down = null;                                                   // made the first time the way down is on screen
const c01 = v => Math.min(1, Math.max(0, v)), ss = (v, a, b) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
/* e: progress through the investment-focus scene, negative while the dive is still arriving. The page's own sheet and
   words keep time with these same numbers (main.js): the bar turns light at 0.028, as the white reaches the top of
   the screen; the sheet comes in from 0.20 to 0.275 and goes from 0.69 to 0.77; the page lays its paper over the last
   of it from 0.80 to 0.95, rising from the foot of the screen, and the journey itself comes up under that from 0.86. */
function goDown(e, time, aspect, c) {
  const d = down || (down = makeDown(c)), u = d.u, st = c.st; d.at = st.downAt = time;
  const dive = st.dive === undefined ? 1 : st.dive;                // how far the dive at Global has got (world.js passes it on)
  /* the blue closes as the planet comes to fill the screen, and is shut by the time the scene pins whatever the dive is doing */
  const blue = Math.max(Math.min(ss(dive, 0.86, 0.995), ss(e, -0.19, -0.02)), ss(e, 0, 0.06)), second = e > 0.5;
  u.time.value = time; u.aspect.value = aspect;
  u.blue.value = blue; u.white.value = ss(e, -0.01, 0.095) * blue * blue;
  u.depth.value = second ? 2.4 + c01((e - 0.67) / 0.27) * 2.1 : -0.2 + c01((e - 0.03) / 0.23) * 2.1;
  u.decks.value = second ? 1 : ss(e, 0.045, 0.105); u.gap.value = second ? 0.5 : ss(e, 0.055, 0.13); u.soften.value = second ? 0.1 : 0;
  u.fog.value = second ? Math.max(1 - ss(e, 0.69, 0.765), ss(e, 0.86, 0.95)) : ss(e, 0.195, 0.265);
  u.warm.value = ss(e, 0.75, 0.87); u.wash.value = ss(e, 0.69, 0.76) * (1 - ss(e, 0.78, 0.87)) * 0.7;
  st.veil = ss(e, 0.8, 0.95);                                      // the page's paper rises over the last of it
  st.flat = blue;                                                  // inside Global's air the light is even: the lens stops darkening the corners
  st.on = blue > 0.002 && e < 1.002 && !(e > 0.28 && e < 0.685);
}

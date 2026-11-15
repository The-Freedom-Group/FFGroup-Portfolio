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
        set(DOWN); u.air.value = sp(e, -0.44, -0.04); u.depth.value = -0.9 + Math.max(-0.5, e) * (K + 1.6); u.gaps.value = 0.55; u.fog.value = sp(e, 0.74, 0.93); st.veil = sp(e, 0.9, 0.995); st.on = e > -0.46;
        const hz = sp(e, 0.25, 0.8); u.airA.value.set(base.a[0] + (0.8 - base.a[0]) * hz, base.a[1] + (0.8 - base.a[1]) * hz, base.a[2] + (0.8 - base.a[2]) * hz); u.airB.value.set(base.b[0] + (0.88 - base.b[0]) * hz, base.b[1] + (0.86 - base.b[1]) * hz, base.b[2] + (0.83 - base.b[2]) * hz);
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

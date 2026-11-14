/* Cloud, drawn over whatever is behind it. The view is along the direction of travel: going down (the way into the
   journey) you look at the ground and fall through one deck of cloud after another, each swelling out from the middle of
   the screen until you are inside it and through; going up (the raise) the decks come down at you from the night and fall
   away. Each deck is a field of puffed cloud lit from one side, hazier the further off it is. Behind the decks is the air
   itself, which fades in over space on the way down and thins to the stars on the way up; a fog can close over
   everything, which is how the descent ends in the colour of the page. One full-screen triangle. */
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

/* the two skies. Colours are scene-linear and go through the same finish as everything else. */
const DOWN = { airA: [0.07, 0.19, 0.4], airB: [0.42, 0.58, 0.78], cLit: [1.14, 1.1, 1.04], cShade: [0.46, 0.52, 0.64], cFog: [0.9, 0.86, 0.8], light: [-0.62, 0.78], rim: 0 };
const UP = { airA: [0.011, 0.011, 0.016], airB: [0.03, 0.022, 0.032], cLit: [0.85, 0.28, 0.46], cShade: [0.03, 0.028, 0.036], cFog: [0.02, 0.02, 0.03], light: [0.35, -0.94], rim: 1 };

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
  return { st, scene, mat,
    /* which: 'down' with e = progress through the descent (negative while the dive is still arriving), 'up' through the raise, or null */
    update(which, e, time, aspect) {
      u.time.value = time; u.aspect.value = aspect; st.veil = 0;
      if (which === 'down') {
        set(DOWN); u.air.value = sp(e, -0.44, -0.04); u.depth.value = -0.9 + Math.max(-0.5, e) * (K + 1.6); u.gaps.value = 0.55; u.fog.value = sp(e, 0.74, 0.93); st.veil = sp(e, 0.9, 0.995); st.on = e > -0.46;
        const hz = sp(e, 0.25, 0.8); u.airA.value.set(base.a[0] + (0.8 - base.a[0]) * hz, base.a[1] + (0.8 - base.a[1]) * hz, base.a[2] + (0.8 - base.a[2]) * hz); u.airB.value.set(base.b[0] + (0.88 - base.b[0]) * hz, base.b[1] + (0.86 - base.b[1]) * hz, base.b[2] + (0.83 - base.b[2]) * hz);
      } else if (which === 'up') {
        set(UP); u.air.value = 1 - sp(e, 0.55, 0.93); u.depth.value = -0.35 + Math.max(-0.3, e) * (K + 1.2) / 0.9; u.gaps.value = 0.62; u.fog.value = 0; st.on = e < 0.96;
      } else st.on = false;
    },
    draw(renderer) { const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(scene, cam); renderer.autoClear = ac; } };
}

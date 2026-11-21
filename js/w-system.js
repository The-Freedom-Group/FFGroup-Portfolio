/* What the system is drawn with, beyond the worlds themselves:
   - the orbit rings: each a line of light a few pixels wide at any distance, dotted along its length, with a soft glow;
     a ring draws itself in from behind Enterprise, both ways round at once, a bright head on each end, until the two
     meet at the front;
   - the licence lanes: from Enterprise out to each company, a line that turns from the group's pink to the company's
     colour and ends in an arrowhead on the company's limb. They are laid out on the screen (so they bend the way the
     old map's did and stay a constant width) from where the worlds really are, every frame;
   - the nova the system is born from: a star that brightens, flashes white with a flare along the horizon, and blows
     off two shells of gas and a spray of sparks;
   - and the sums that put the worlds where the page has left room for them: every company's world sits on a ring, and
     every ring passes behind Enterprise, as the globe sits on the orbit in the group's logo. */
import * as THREE from 'three';

const DEG = Math.PI / 180;
export const SYS_EL = 14 * DEG;                                      // how far above the plane of the rings the system is seen from
/* each ring's far side, as a height above the middle of Enterprise in Enterprise radii: every ring runs through the globe
   (as the orbit does in the logo), each further back than the one inside it, enough that their far sides stand apart
   behind it as their near sides do in front (never crossing, never bunched into one line) */
const APEX = [0, 0.15, 0.3, 0.45, 0.6];
/* the year each ring stands for. Its mark sits on the ring beside the ring's own company: this far along the ring from
   the world on the screen, in Enterprise radii (Global's to the right; a plus is away from the front, a minus toward it) */
export const YEARS = [['2026', 1.55], ['2027', 1.75], ['2028', 1.75], ['2029', -2.0], ['2030+', -2.05]];
/* the worlds: which ring, how big beside Enterprise (as on the old map), and the company colour its lane ends in */
export const SYS_WORLDS = {
  global: { ring: 0, size: 0.585, colour: '#38a9ff', at: 'global' }, facilities: { ring: 1, size: 0.555, colour: '#2fe0a0', at: 'facilities' }, distribution: { ring: 2, size: 0.53, colour: '#ff6a3d', at: 'distribution' },
  form: { ring: 3, size: 0.38, colour: '#d7b35f', at: 'future29', pair: -1 }, freight: { ring: 3, size: 0.47, colour: '#d7b35f', at: 'future29', pair: 1 },
  fly: { ring: 4, size: 0.43, colour: '#a487df', at: 'future30', pair: -1 }, fuel: { ring: 4, size: 0.35, colour: '#a487df', at: 'future30', pair: 1 }
};

/* The colour to hand the renderer so that the screen shows `hex` once the film finish has been through it (post.js: its
   filmic curve, then sRGB, then a touch of saturation). The curve mutes strong colours, so the logo's pinks have to go in
   stronger than they come out; this steps toward the answer (Newton, on a numeric slope) and remembers it. */
const A_IN = [[0.59719, 0.35458, 0.04823], [0.07600, 0.90834, 0.01566], [0.02840, 0.13383, 0.83777]], A_OUT = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]];
const mul3 = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
function onScreen(c) {
  let v = mul3(A_IN, c.map(x => Math.max(0, x) / 0.6)).map(x => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.4329510) + 0.238081));
  v = mul3(A_OUT, v).map(x => { x = Math.min(1, Math.max(0, x)); return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; });
  const l = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; return v.map(x => l + (x - l) * 1.05);
}
const seen = {};
export function sceneColour(hex) {
  if (seen[hex]) return seen[hex];
  const want = new THREE.Color(hex), t = [want.r, want.g, want.b].map(x => x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);   // THREE.Color holds linear values; the target is what the screen shows
  let x = [want.r, want.g, want.b];
  for (let it = 0; it < 60; it++) {
    const f = onScreen(x), e = [t[0] - f[0], t[1] - f[1], t[2] - f[2]]; if (Math.abs(e[0]) + Math.abs(e[1]) + Math.abs(e[2]) < 0.002) break;
    const J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], h = 0.01;
    for (let j = 0; j < 3; j++) { const y = x.slice(); y[j] += h; const g = onScreen(y); for (let i = 0; i < 3; i++) J[i][j] = (g[i] - f[i]) / h; }
    const det = J[0][0] * (J[1][1] * J[2][2] - J[1][2] * J[2][1]) - J[0][1] * (J[1][0] * J[2][2] - J[1][2] * J[2][0]) + J[0][2] * (J[1][0] * J[2][1] - J[1][1] * J[2][0]);
    if (Math.abs(det) < 1e-9) { x = x.map((v, i) => Math.max(0, v + e[i] * 0.5)); continue; }
    const inv = [[J[1][1] * J[2][2] - J[1][2] * J[2][1], J[0][2] * J[2][1] - J[0][1] * J[2][2], J[0][1] * J[1][2] - J[0][2] * J[1][1]], [J[1][2] * J[2][0] - J[1][0] * J[2][2], J[0][0] * J[2][2] - J[0][2] * J[2][0], J[0][2] * J[1][0] - J[0][0] * J[1][2]], [J[1][0] * J[2][1] - J[1][1] * J[2][0], J[0][1] * J[2][0] - J[0][0] * J[2][1], J[0][0] * J[1][1] - J[0][1] * J[1][0]]];
    const d = mul3(inv, e).map(v => v / det); x = x.map((v, i) => Math.min(6, Math.max(0, v + Math.max(-0.4, Math.min(0.4, d[i] * 0.7)))));
  }
  return seen[hex] = new THREE.Color().setRGB(x[0], x[1], x[2], THREE.LinearSRGBColorSpace);
}
const PINK = sceneColour('#ff3d9a');

/* ───────── the sums ───────── */
/* Given where the page wants Enterprise and each company on the screen (px, y down), seen from SYS_EL above the plane with
   Enterprise held at its place, this finds each company's spot on the plane, the ring through it (a circle whose far
   side passes behind Enterprise), and how big each world must be drawn to fill its place.
   slots: { enterprise, global, facilities, distribution, future29, future30 } each { x, y, r };  R: Enterprise's radius in
   the world;  focal: the camera's focal length in px.  Returns { dist, rings: [{ c, r }], worlds: { id: { x, z, scale } } }. */
export function solveSystem(slots, R, focal, radii) {
  const E = slots.enterprise, se = Math.sin(SYS_EL), ce = Math.cos(SYS_EL), dist = R * focal / Math.max(2, E.r);
  const cam = [0, se * dist, ce * dist];
  /* a place on the screen → the point of the plane behind it, and how far off that is along the line of sight */
  const plane = (sx, sy) => {
    const dx = sx - E.x, dy = sy - E.y, rx = dx, ry = -se * focal - ce * dy, rz = -ce * focal + se * dy;   // the ray: forward × focal + right × dx − up × dy
    const t = -cam[1] / Math.min(-1e-3, ry);
    return { x: cam[0] + rx * t, z: cam[2] + rz * t };
  };
  const depthOf = (x, z) => (cam[2] - z) * ce + cam[1] * se;
  const rings = [], worlds = {}, anchors = ['global', 'facilities', 'distribution', 'future29', 'future30'];
  anchors.forEach((id, k) => {
    const p = plane(slots[id].x, slots[id].y), e = Math.max(0, -plane(E.x, E.y - APEX[k] * E.r).z);
    const c = (p.x * p.x + p.z * p.z - e * e) / (2 * Math.max(1e-3, p.z + e));
    rings.push({ c, r: c + e, ax: p.x, az: p.z });
  });
  for (const id in SYS_WORLDS) {
    const w = SYS_WORLDS[id], ring = rings[w.ring], rpx = E.r * w.size; let x = ring.ax, z = ring.az;
    if (w.pair) {
      /* two worlds share this place: one each side of it along the ring, just clear of each other */
      const mate = Object.keys(SYS_WORLDS).find(k => k !== id && SYS_WORLDS[k].at === w.at);
      const theirs = E.r * SYS_WORLDS[mate].size * (radii[mate].wide || 1), a0 = Math.atan2(x, z - ring.c);      // how wide the other one is on the screen; where the place is on the ring
      const da = w.pair * (theirs + E.r * 0.12) * depthOf(x, z) / focal / ring.r * (Math.sign(x) || 1);          // −1 sits nearer the front of the ring, +1 further round
      x = Math.sin(a0 + da) * ring.r; z = ring.c + Math.cos(a0 + da) * ring.r;
    }
    worlds[id] = { x, z, scale: rpx * depthOf(x, z) / (radii[id].R * focal) };
  }
  /* where each ring's year mark stands */
  const screen = (x, z) => { const vy = -cam[1], vz = z - cam[2], d = -vy * se - vz * ce; return [E.x + focal * x / d, E.y - focal * (vy * ce - vz * se) / d]; };
  const years = rings.map((ring, k) => { const a0 = Math.atan2(ring.ax, ring.az - ring.c), p0 = screen(ring.ax, ring.az), want = Math.abs(YEARS[k][1]) * E.r, dir = k === 0 ? 1 : (Math.sign(ring.ax) || 1) * Math.sign(YEARS[k][1]);
    let a = a0; for (let i = 0; i < 500; i++) { a += dir * 0.004; const q = screen(Math.sin(a) * ring.r, ring.c + Math.cos(a) * ring.r); if (Math.hypot(q[0] - p0[0], q[1] - p0[1]) >= want) break; }
    return { x: Math.sin(a) * ring.r, z: ring.c + Math.cos(a) * ring.r }; });
  return { dist, rings, worlds, years };
}

/* ───────── rings ───────── */
const RING_VS = `attribute float u; attribute float side; uniform vec3 centre; uniform float R; uniform vec2 res; uniform float halfW;
varying float vU; varying float vS;
vec4 at(float t){ float a = t * 6.2831853; return projectionMatrix * viewMatrix * vec4(centre.x + sin(a) * R, centre.y, centre.z - cos(a) * R, 1.0); }
void main(){
  vec4 c0 = at(u), c1 = at(u + 0.0016);
  vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * res; float l = length(d); d = l > 1e-6 ? d / l : vec2(1.0, 0.0);
  c0.xy += vec2(-d.y, d.x) * side * halfW * 2.0 / res * c0.w;
  gl_Position = c0; vU = u; vS = side; }`;
const RING_FS = `uniform vec3 colour; uniform float k; uniform float draw; uniform float dots; uniform float fill; uniform float time; uniform float flow; uniform float halfW; uniform float coreW; uniform float glowK; uniform vec4 keep; uniform float feather;
varying float vU; varying float vS;
void main(){
  float uf = 1.0 - abs(2.0 * vU - 1.0);                              // 0 behind Enterprise, 1 at the front
  float vis = draw >= 0.9995 ? 1.0 : 1.0 - smoothstep(draw - 0.01, draw, uf);
  vis *= 0.14 + 0.86 * smoothstep(0.0, 0.5, uf);                     // the far half thins away toward the globe, as a ring seen at a tilt does
  vec2 fc = gl_FragCoord.xy; vis *= smoothstep(0.0, feather, max(max(keep.x - fc.x, fc.x - keep.z), max(keep.y - fc.y, fc.y - keep.w)));   // and it stays out of the heading's words
  float d = abs(vS) * halfW;
  float core = 1.0 - smoothstep(coreW * 0.55, coreW * 1.3, d);
  float ph = fract(vU * dots + time * flow);
  float dotK = smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(fill - 0.1, fill, ph));
  float glow = exp(-d * d / (halfW * halfW * 0.13));
  float head = draw > 0.002 && draw < 0.9995 ? exp(-pow((draw - uf) * 42.0, 2.0)) * step(uf, draw + 0.003) : 0.0;
  float a = (core * dotK + glow * glowK) * vis + head * (core * 2.6 + glow * 1.7);
  a *= k; if (a < 0.003) discard;
  gl_FragColor = vec4(colour, a); }`;

function makeRings(n) {
  const SEG = 512, u = new Float32Array((SEG + 1) * 2), side = new Float32Array((SEG + 1) * 2), idx = [];
  for (let i = 0; i <= SEG; i++) { u[i * 2] = u[i * 2 + 1] = i / SEG; side[i * 2] = -1; side[i * 2 + 1] = 1; }
  for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 6), 3)); geo.setAttribute('u', new THREE.BufferAttribute(u, 1)); geo.setAttribute('side', new THREE.BufferAttribute(side, 1)); geo.setIndex(idx);
  const res = new THREE.Vector2(1, 1), keep = new THREE.Vector4(-9, -9, -9, -9), feather = { value: 20 };
  return Array.from({ length: n }, (_, i) => {
    const future = i >= 3;
    const m = new THREE.ShaderMaterial({ uniforms: { centre: { value: new THREE.Vector3() }, R: { value: 100 }, res: { value: res }, keep: { value: keep }, feather, halfW: { value: 9 }, coreW: { value: 1.1 }, glowK: { value: 0.3 },
      colour: { value: new THREE.Color(future ? '#e9e6f2' : '#ff4fa3') }, k: { value: 0 }, draw: { value: 0 }, dots: { value: 200 }, fill: { value: future ? 0.42 : 0.62 }, time: { value: 0 }, flow: { value: (i % 2 ? -1 : 1) * 0.012 } },
      vertexShader: RING_VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.visible = false; return mesh;
  });
}

/* ───────── lanes ───────── */
const LANE_N = 40, LANE_V = (LANE_N + 1) * 2 + 3;
const LANE_VS = `attribute vec2 p; attribute vec4 col; attribute float side; varying vec4 vC; varying float vS; void main(){ vC = col; vS = side; gl_Position = vec4(p, 0.0, 1.0); }`;
const LANE_FS = `uniform float halfW; uniform float coreW; varying vec4 vC; varying float vS;
void main(){ float a;
  if (vS > 1.5) a = 1.0;                                              // the arrowhead: solid
  else { float d = abs(vS) * halfW; a = (1.0 - smoothstep(coreW * 0.55, coreW * 1.25, d)) + exp(-d * d / (halfW * halfW * 0.12)) * 0.34; }
  a *= vC.a; if (a < 0.003) discard; gl_FragColor = vec4(vC.rgb, a); }`;

function makeLanes(ids) {
  const n = ids.length, P = new Float32Array(n * LANE_V * 2), C = new Float32Array(n * LANE_V * 4), S = new Float32Array(n * LANE_V), idx = [];
  ids.forEach((_, l) => { const o = l * LANE_V; for (let i = 0; i < LANE_N; i++) { const a = o + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } const h = o + (LANE_N + 1) * 2; idx.push(h, h + 1, h + 2); });
  const geo = new THREE.BufferGeometry(); const aP = new THREE.BufferAttribute(P, 2), aC = new THREE.BufferAttribute(C, 4), aS = new THREE.BufferAttribute(S, 1); aP.setUsage(THREE.DynamicDrawUsage); aC.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * LANE_V * 3), 3)); geo.setAttribute('p', aP); geo.setAttribute('col', aC); geo.setAttribute('side', aS); geo.setIndex(idx);
  ids.forEach((_, l) => { const o = l * LANE_V; for (let i = 0; i <= LANE_N; i++) { S[o + i * 2] = -1; S[o + i * 2 + 1] = 1; } for (let k = 0; k < 3; k++) S[o + (LANE_N + 1) * 2 + k] = 2; });
  const mat = new THREE.ShaderMaterial({ uniforms: { halfW: { value: 8 }, coreW: { value: 1.3 } }, vertexShader: LANE_VS, fragmentShader: LANE_FS, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 8; mesh.visible = false;
  const cols = ids.map(id => sceneColour(SYS_WORLDS[id].colour)), tmpC = new THREE.Color(), mid = ids.map(() => new Float32Array((LANE_N + 2) * 2));   // mid: each lane's own line on the screen, kept for checking
  /* lay one lane: from Enterprise's limb to the world's, drawn as far as `draw`, at strength `a`.
     E, Wd: { x, y, r } on the screen in px;  W, H: the screen;  pr: device pixels per px */
  const kinds = ids.map(id => SYS_WORLDS[id].pair ? 2 : SYS_WORLDS[id].ring ? 1 : 0);
  function lay(l, E, Wd, draw, a, W, H, pr) {
    const o = l * LANE_V, hw = mat.uniforms.halfW.value / pr, kind = kinds[l];
    if (draw <= 0.002 || a <= 0.004) { for (let i = 0; i < LANE_V; i++) C[(o + i) * 4 + 3] = 0; mid[l][0] = NaN; return; }
    let dx = Wd.x - E.x, dy = Wd.y - E.y; const L0 = Math.hypot(dx, dy) || 1, side = Math.sign(dx) || 1; dx /= L0; dy /= L0;
    /* three ways out, as on the old map. To Global: straight down. To the companies either side: out along the line to
       them and down onto their crowns. To the future pairs: out wide first, clear of what is written under Global,
       then down the open channel onto them from above. */
    let sx = dx, sy = dy, ex = -dx, ey = -dy, k1 = 0.3, k2 = 0.3;
    if (kind === 1) { sy += 0.05; ey -= 0.7; k1 = 0.34; k2 = 0.36; }
    else if (kind === 2) { sx += side * 0.35; sy -= 0.05; ex = -side * 0.24; ey = -0.97; k1 = 0.45; k2 = 0.5; }
    let n = Math.hypot(sx, sy) || 1; sx /= n; sy /= n; n = Math.hypot(ex, ey) || 1; ex /= n; ey /= n;
    const head = Math.max(7, Math.min(13, E.r * 0.24)), x0 = E.x + sx * E.r * 0.985, y0 = E.y + sy * E.r * 0.985, x3 = Wd.x + ex * (Wd.r + 1.5), y3 = Wd.y + ey * (Wd.r + 1.5);
    const L = Math.hypot(x3 - x0, y3 - y0);
    const x1 = x0 + sx * L * k1, y1 = y0 + sy * L * k1, x2 = x3 + ex * L * k2, y2 = y3 + ey * L * k2;
    const at = (t, out) => { const m = 1 - t, b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t; out[0] = b0 * x0 + b1 * x1 + b2 * x2 + b3 * x3; out[1] = b0 * y0 + b1 * y1 + b2 * y2 + b3 * y3; };
    const tan = (t, out) => { const m = 1 - t; out[0] = 3 * m * m * (x1 - x0) + 6 * m * t * (x2 - x1) + 3 * t * t * (x3 - x2); out[1] = 3 * m * m * (y1 - y0) + 6 * m * t * (y2 - y1) + 3 * t * t * (y3 - y2); const q = Math.hypot(out[0], out[1]) || 1; out[0] /= q; out[1] /= q; };
    const pt = [0, 0], tg = [0, 0], tEnd = Math.min(1, draw), hk = Math.min(1, draw * 7) * head, tBody = Math.max(0, tEnd - hk * 0.8 / Math.max(1, L));
    const put = (i, px, py, c, alpha) => { P[i * 2] = px / W * 2 - 1; P[i * 2 + 1] = 1 - py / H * 2; C[i * 4] = c.r; C[i * 4 + 1] = c.g; C[i * 4 + 2] = c.b; C[i * 4 + 3] = alpha; };
    for (let i = 0; i <= LANE_N; i++) {
      const t = i / LANE_N * tBody; at(t, pt); tan(t, tg); mid[l][i * 2] = pt[0]; mid[l][i * 2 + 1] = pt[1]; tmpC.copy(PINK).lerp(cols[l], t * t * (3 - 2 * t));
      const fade = Math.min(1, i / 2.5);                                                    // the lane comes out of Enterprise's glow, not from a hard end
      put(o + i * 2, pt[0] - tg[1] * hw, pt[1] + tg[0] * hw, tmpC, a * fade); put(o + i * 2 + 1, pt[0] + tg[1] * hw, pt[1] - tg[0] * hw, tmpC, a * fade);
    }
    at(tEnd, pt); tan(tEnd, tg); mid[l][(LANE_N + 1) * 2] = pt[0]; mid[l][(LANE_N + 1) * 2 + 1] = pt[1]; tmpC.copy(PINK).lerp(cols[l], tEnd * tEnd * (3 - 2 * tEnd)); const h = o + (LANE_N + 1) * 2, bx = pt[0] - tg[0] * hk, by = pt[1] - tg[1] * hk, hwid = hk * 0.46;
    put(h, pt[0], pt[1], tmpC, a); put(h + 1, bx - tg[1] * hwid, by + tg[0] * hwid, tmpC, a); put(h + 2, bx + tg[1] * hwid, by - tg[0] * hwid, tmpC, a);
  }
  return { mesh, lay, mid, flush() { aP.needsUpdate = true; aC.needsUpdate = true; } };
}

/* ───────── the nova ───────── */
const NOVA_VS = `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const NOVA_FS = `precision highp float;
uniform vec2 res; uniform vec2 c0; uniform vec2 c1; uniform float p; uniform float pr;
float hash(float n){ return fract(sin(n) * 43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
float h2(vec2 v){ return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
float sm(float a, float b, float x){ return smoothstep(a, b, x); }
void main(){
  float m = min(res.x, res.y); vec2 q = (gl_FragCoord.xy - c0) / m; float r = length(q), a = atan(q.y, q.x);
  float ignite = sm(0.005, 0.12, p), burn = ignite * sm(0.07, 0.28, p), collapse = sm(0.28, 0.35, p);
  float det = clamp((p - 0.36) / 0.61, 0.0, 1.0), detE = det * det * (3.0 - 2.0 * det);
  float fl = pow(max(0.0, 1.0 - abs(p - 0.4) / 0.11), 1.5);
  vec3 pink = vec3(1.0, 0.1, 0.42), rose = vec3(1.0, 0.42, 0.7), white = vec3(1.0, 0.96, 0.98), col = vec3(0.0);
  /* the star before it blows: a core, fine rays, a cross of four */
  float pre = clamp(1.0 - det * 3.2, 0.0, 1.0);
  if (pre > 0.01) {
    float rc = (0.012 + 0.02 * ignite + 0.05 * burn) * (1.0 + 0.04 * sin(burn * 21.0) + 0.02 * sin(burn * 43.0 + 2.0)) * (1.0 - 0.6 * collapse);
    float heat = (0.45 * ignite + 0.55 * burn + 0.9 * collapse) * pre;
    float core = exp(-r * r / (rc * rc * 0.5)), halo = exp(-r / (rc * 1.3));
    float rays = pow(n1(a * 16.0 + burn * 2.0) * n1(a * 41.0 - p * 6.0 + 7.0), 1.6) * exp(-r / (rc * 1.15)) * sm(rc * 0.4, rc * 1.3, r);
    float cross = pow(abs(cos((a - 0.26) * 2.0)), 240.0) * exp(-r / (rc * 1.9));
    col += (white * core * 2.6 + pink * halo * 0.8 + rose * rays * 2.2 + white * cross * 1.0) * heat;
  }
  /* the flash, and its flare along the horizon */
  if (fl > 0.01) { float streak = exp(-abs(q.y) / 0.0045) * exp(-q.x * q.x / 0.2); col += white * fl * (0.62 + streak * 5.0 + exp(-r * r / 0.02) * 2.4); }
  /* the blast: two shells, the gas inside them, the sparks */
  if (det > 0.0 && det < 1.0) {
    float rsh = 0.05 + pow(detE, 0.8) * 1.18, fade = 1.0 - det, w1 = 0.006 + 0.02 * detE;
    float s1 = exp(-pow((r - rsh) / w1, 2.0)) * (0.5 + 0.7 * n1(a * 9.0 + 3.0) + 1.6 * pow(n1(a * 46.0 + 1.3), 5.0)) + exp(-pow((r - rsh) / (w1 * 4.0), 2.0)) * 0.16;
    float s2 = exp(-pow((r - rsh * 0.68) / (w1 * 0.8), 2.0)) * (0.35 + 0.7 * n1(a * 7.0 + 11.0 - detE) + 1.2 * pow(n1(a * 38.0 + 5.1), 5.0));
    vec2 g1 = q * 2.6 / (0.25 + rsh), g2 = mat2(0.8, -0.6, 0.6, 0.8) * g1 * 2.03 + 7.3;
    float gas = sm(rsh, rsh * 0.1, r) * sin(det * 3.14159) * (0.5 * n2(g1 + 3.0) + 0.3 * n2(g2) + 0.2 * n2(mat2(0.8, -0.6, 0.6, 0.8) * g2 * 2.1 + 1.7));
    float cell = floor(a * 11.459 + 40.0), ca = (cell - 40.0 + 0.5) / 11.459, sr = hash(cell * 1.7 + 3.0);
    float sd = pow(detE, 0.85) * (0.2 + 0.95 * sr) * 1.15, tail = 0.012 + 0.05 * sr * (1.0 - detE * 0.5);
    float spark = sm(2.4 * pr / m, 0.6 * pr / m, abs(a - ca) * r) * sm(tail, 0.0, sd - r) * step(r, sd) * (0.3 + 0.7 * hash(cell * 5.3));
    col += (mix(rose, white, 0.35) * s1 * 2.0 + rose * s2 * 1.1) * fade * 1.2 + pink * gas * (0.03 + 0.1 * r / rsh) + mix(white, rose, sr) * spark * fade * 2.2;
  }
  /* what is left: the newborn star, drifting to where the system will stand */
  float born = sm(0.5, 0.7, p) * (1.0 - sm(0.86, 1.0, p));
  if (born > 0.01) { float r1 = length((gl_FragCoord.xy - c1) / m); col += pink * born * (exp(-r1 / 0.16) * 0.34 + exp(-r1 * r1 / 0.0006) * 2.6); }
  gl_FragColor = vec4(col, 1.0);
}`;

function makeNova() {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mat = new THREE.ShaderMaterial({ uniforms: { res: { value: new THREE.Vector2(1, 1) }, c0: { value: new THREE.Vector2() }, c1: { value: new THREE.Vector2() }, p: { value: 0 }, pr: { value: 1 } },
    vertexShader: NOVA_VS, fragmentShader: NOVA_FS, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 9; mesh.visible = false; return mesh;
}

/* ───────── the shooting star that crosses as the opening is pulled away ───────── */
function makeStreak() {
  const P = new Float32Array(8), C = new Float32Array(16), geo = new THREE.BufferGeometry(), aP = new THREE.BufferAttribute(P, 2), aC = new THREE.BufferAttribute(C, 4); aP.setUsage(THREE.DynamicDrawUsage); aC.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3)); geo.setAttribute('p', aP); geo.setAttribute('col', aC); geo.setAttribute('side', new THREE.BufferAttribute(new Float32Array([-1, 1, -1, 1]), 1)); geo.setIndex([0, 1, 2, 1, 3, 2]);
  const mat = new THREE.ShaderMaterial({ uniforms: { halfW: { value: 7 }, coreW: { value: 1.3 } }, vertexShader: LANE_VS, fragmentShader: LANE_FS, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 8; mesh.visible = false; const col = sceneColour('#ffb884');
  /* q: 0 to 1 across the sky, from the upper right down toward the middle; its tail longest half way */
  return { mesh, set(q, W, H, pr, tx, ty) {
    mesh.visible = q > 0.002 && q < 0.998; if (!mesh.visible) return;
    const x0 = W * 0.97, y0 = H * 0.05, x1 = tx === undefined ? W * 0.5 : tx, y1 = ty === undefined ? H * 0.66 : ty, e = q * q * (3 - 2 * q), L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, a = Math.sin(q * Math.PI);
    const hx = x0 + (x1 - x0) * e, hy = y0 + (y1 - y0) * e, tail = Math.min(260, L * 0.34) * a, hw = mat.uniforms.halfW.value / pr;
    const put = (i, x, y, al) => { P[i * 2] = x / W * 2 - 1; P[i * 2 + 1] = 1 - y / H * 2; C[i * 4] = col.r; C[i * 4 + 1] = col.g; C[i * 4 + 2] = col.b; C[i * 4 + 3] = al; };
    put(0, hx + uy * hw, hy - ux * hw, a); put(1, hx - uy * hw, hy + ux * hw, a); put(2, hx - ux * tail + uy * hw, hy - uy * tail - ux * hw, 0); put(3, hx - ux * tail - uy * hw, hy - uy * tail + ux * hw, 0);
    aP.needsUpdate = true; aC.needsUpdate = true; } };
}

/* everything above, added to the scene */
export function createSystem({ scene, renderer }) {
  const rings = makeRings(5), laneIds = Object.keys(SYS_WORLDS), lanes = makeLanes(laneIds), nova = makeNova(), streak = makeStreak();
  rings.forEach(r => scene.add(r)); scene.add(lanes.mesh, nova, streak.mesh);
  const size = new THREE.Vector2();
  return { rings, lanes, laneIds, nova, streak,
    /* once a frame: the drawing buffer's size, for the lines that are sized in pixels */
    /* keep: a part of the screen the rings stay out of (px, y down), or null */
    frame(time, keep, H) { renderer.getDrawingBufferSize(size); const pr = renderer.getPixelRatio(), u0 = rings[0].material.uniforms; u0.res.value.copy(size); nova.material.uniforms.res.value.copy(size); nova.material.uniforms.pr.value = pr;
      if (keep) u0.keep.value.set(keep.x0 * pr, (H - keep.y1) * pr, keep.x1 * pr, (H - keep.y0) * pr); else u0.keep.value.set(-9, -9, -9, -9); u0.feather.value = 22 * pr;
      rings.forEach((r, i) => { const u = r.material.uniforms; u.time.value = time; u.halfW.value = (i < 3 ? 8 : 7) * pr; u.coreW.value = (i === 0 ? 1.15 : 0.95) * pr; }); lanes.mesh.material.uniforms.halfW.value = 8 * pr; lanes.mesh.material.uniforms.coreW.value = 1.25 * pr; streak.mesh.material.uniforms.halfW.value = 7 * pr; streak.mesh.material.uniforms.coreW.value = 1.3 * pr; return pr; } };
}

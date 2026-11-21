/* The launch pad at night: the rocket on its mount beside the service tower, flood-lit, mist lying on the ground and in
   the valleys, and high over the hills on the far side the group's own world, the pink planet the story's rocket set out
   from, turning slowly. Units are metres.
   The night is built as a photograph of it would show it: a sky graded from a deep zenith down to a faint warm glow on the
   horizon, the Milky Way across it (the real one, from the star map the opening uses) and stars of every size and colour,
   thin high cloud catching the planet's light; three ranges of hills, each further off and further lost in the haze, with
   a few lights of the towns along them and a red beacon on a mast; the tree line in front; searchlights sweeping slowly up
   from beyond the pad; the floodlights pooling on the ground, which is damp enough to shine; a few birds going over.
   The same evening stands behind the two parts before it. Through the raise the camera looks up into a dusk sky (the
   cloud of the climb is drawn over it, lit from the planet); as the raise ends the dusk goes out of it and the planet
   crosses to its night place, and that sky is what Beyond sits under. As Beyond ends the camera comes down out of the sky
   to the complex (the planet sinks to its place over the pad, and the searchlights and the hills come up into the frame
   as it does), and as the page scrolls on the rocket comes down too, under its own burn, and settles on the pad. On
   "Press for liftoff" the engines light, the pad fills with smoke and the rocket climbs out of the top of the frame. */
import * as THREE from 'three';
import { mapTex, softDisc, makeWorld } from './planets.js';
import { WORLDS } from './worlds.js';
import { GLSL_NOISE } from './util.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), Y_UP = V(0, 1, 0);
let seed = 4711; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const span = (v, a, b) => smooth((v - a) / (b - a));
const FOV = 40, TANH = Math.tan(FOV * Math.PI / 360), DEG = Math.PI / 180;
/* a direction from its bearing (0 straight ahead, down -z; positive to the right) and its height above the horizon, in degrees */
const dirDeg = (az, el) => V(Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), -Math.cos(az * DEG) * Math.cos(el * DEG));
/* the stretch of the liftoff scene (0 at its start, 1 at its end) over which the rocket comes down and settles */
export const ARRIVE = [0.12, 0.6];
const DOWN = 0.86;                                               // how far through that stretch it touches the pad; the rest is the settle
/* the planet: the group's own world (made as the system makes Enterprise), high in the sky on the far side of the rocket
   from the words. Down at the pad it stands at these places on the screen (fractions of its width and height): the first
   as the view has just come down, the second once it has closed in on the rocket. On a phone, where the pad is seen
   through a narrow frame, it is held this far round from straight ahead and this high (degrees), just under the heading.
   While the camera is still looking up, earlier in the evening, it rides this high. Its radius as an angle, how far off it
   is drawn (it keeps that distance from the camera, as anything so far off does), and the seconds it takes to turn once. */
const PLANET_FAR = [0.725, 0.15], PLANET_AT = [0.734, 0.31], PLANET_PHONE = [9.3, 18.0], PLANET_UP = 42 * DEG;
const PLANET_ANG = 1.93 * DEG, PLANET_D = 3200, PLANET_R = PLANET_D * Math.tan(PLANET_ANG), PLANET_TURN = 80;
const PLANET_LON = 8;                                            // the longitude it shows the viewer at first: Europe and Africa, home at the top
/* where its light comes from, seen from the viewer: from the left, a little above and in front, so the day side fills most
   of the disc and the terminator runs down its far side (right, up, toward the viewer) */
const PLANET_SUN = [-0.62, 0.42, 0.55];
/* where the camera stands, and what it looks at, at the pad: as the view comes down, and once it has closed in */
const CAM_FAR = [V(-70, 13, 236), V(6, 31, 0)], CAM_NEAR = [V(-22, 4.2, 82), V(3, 26.5, 0)];
/* the Milky Way runs along the great circle through these two points (low beside the tower, high over the rocket), its
   bright core rising here */
const MW_A = [2, 0], MW_B = [27, 42], MW_CORE = [7, 9];

/* the sky's colour in a direction (scene-linear): a deep zenith, the night's blue lower down, a faint warm glow on the
   horizon, strongest on the side the dusk went down. Shared with the hills, which take the colour of the air in front of
   them from it */
const SKY_COL = `uniform float dusk;
vec3 skyCol(vec3 d){ float y = d.y;
  vec3 top = mix(vec3(0.0042, 0.0054, 0.0155), vec3(0.03, 0.028, 0.058), dusk), mid = mix(vec3(0.0125, 0.013, 0.034), vec3(0.07, 0.056, 0.1), dusk), hor = mix(vec3(0.05, 0.023, 0.045), vec3(0.19, 0.09, 0.15), dusk);
  float glow = pow(max(0.0, dot(normalize(d.xz + vec2(1e-5, 0.0)), normalize(vec2(0.55, -1.0)))), 6.0);   // the last of the dusk, low on one side
  vec3 c = mix(hor + vec3(0.085, 0.02, 0.045) * glow, mid, smoothstep(-0.02, 0.17, y)); c = mix(c, top, smoothstep(0.11, 0.66, y));
  c += vec3(0.042, 0.014, 0.028) * (1.0 - dusk) * exp(-max(y, 0.0) * 26.0) * (0.6 + 0.4 * glow);         // and the dome of light the towns put on the haze
  return c; }`;
const SKY_FS = GLSL_NOISE + SKY_COL + `uniform float time, cloudK; uniform vec3 planetDir; varying vec3 vDir;
void main(){ vec3 d = normalize(vDir); vec3 c = skyCol(d); float mu = max(dot(d, planetDir), 0.0);
  c += vec3(0.015, 0.006, 0.011) * pow(mu, 14.0) * (1.0 - 0.6 * dusk);                         /* the air round the planet, faintly pink with its light */
  if (d.y > 0.03 && cloudK > 0.002) {   /* thin high cloud on a sheet overhead, drawn out in streaks, catching the planet's light (never in front of it) */
    vec2 q = d.xz / (d.y + 0.12); q = vec2(q.x * 0.82 + q.y * 0.57, -q.x * 0.57 + q.y * 0.82);
    vec3 p = vec3(q.x * 0.55 + time * 0.004, q.y * 2.6, 0.5);
    #ifdef LOW
    float n = fbm3(p) * 1.07;
    #else
    float n = fbm(p);
    #endif
    float cl = smoothstep(0.53, 0.8, n) * smoothstep(0.03, 0.22, d.y) * (1.0 - smoothstep(0.9969, 0.9989, mu)) * cloudK;
    vec3 lit = mix(vec3(0.026, 0.029, 0.04), vec3(0.16, 0.08, 0.12), dusk) * (vec3(0.5) + vec3(2.9, 2.0, 2.5) * pow(mu, 8.0));
    c = mix(c, lit, cl * 0.6);
  }
  gl_FragColor = vec4(c, 1.0); }`;
/* the Milky Way: the star map on a sphere round the camera, added to the sky, its core warmed the way a camera sees it,
   lost low down in the air */
const MW_VS = `varying vec2 vUv; varying vec3 vD; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vD = w.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * w; }`;
const MW_FS = `uniform sampler2D map; uniform float k; varying vec2 vUv; varying vec3 vD;
void main(){ vec3 c = texture2D(map, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(mix(c, vec3(l), 0.45), vec3(l) * vec3(1.16, 1.0, 0.86), smoothstep(0.03, 0.3, l) * 0.6);
  gl_FragColor = vec4(c * k * smoothstep(0.015, 0.3, normalize(vD).y), 1.0); }`;
/* stars of every size and colour, the faint ones most; they scintillate, more so low down */
const STAR_VS = `attribute float size; attribute float phase; attribute vec3 tint; uniform float time, pr, k, low; varying vec3 vC;
void main(){ float el = normalize(position).y; float tw = 1.0 + (0.14 + 0.32 * (1.0 - smoothstep(0.08, 0.5, el))) * sin(time * (1.1 + phase * 3.3) + phase * 40.0);
  vC = tint * k * smoothstep(low, low + 0.1, el) * tw; gl_PointSize = size * pr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const STAR_FS = `varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vC * exp(-r * r * 5.0) * (1.0 - smoothstep(0.8, 1.0, r)), 1.0); }`;
const BEAM_VS = `varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
/* (both beams are kept finite: where the view runs exactly along the cone's wall the sums can come out undefined, and one
   such pixel, spread by the glow, used to put great white rings in the sky as the camera climbed with the rocket) */
const BEAM_FS = `uniform vec3 colour; uniform float k; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main(){ float f = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.4); float y = clamp(vUv.y, 0.0, 1.0), along = mix(0.16, 1.0, y * y); gl_FragColor = vec4(clamp(colour * k * f * along, 0.0, 4.0), 1.0); }`;
/* a searchlight's beam: brightest at the lamp, where the air is thickest, thinning away up the sky */
const SEARCH_FS = `uniform vec3 colour; uniform float k; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main(){ float f = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.6); float y = clamp(vUv.y, 0.0, 1.0); gl_FragColor = vec4(clamp(colour * k * f * pow(y, 2.6), 0.0, 4.0), 1.0); }`;
const SKY_VS = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
/* the hills: each range takes the colour of the air in front of it, more of it the further off it is, and most in its valleys */
const HILL_VS = `attribute vec2 aK; varying vec2 vK; varying vec3 vD; void main(){ vK = aK; vec4 w = modelMatrix * vec4(position, 1.0); vD = w.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * w; }`;
const HILL_FS = SKY_COL + `uniform vec3 dark; varying vec2 vK; varying vec3 vD;
void main(){ vec3 d = normalize(vD); gl_FragColor = vec4(mix(dark, skyCol(d), vK.x * mix(1.0, 0.72, vK.y)), 1.0); }`;
/* lights far off: the towns along the near hills, and a red beacon on a mast here and there */
const FAR_VS = `attribute vec3 tint; attribute float phase; attribute float kind; uniform float time, pr, k; varying vec3 vC;
void main(){ float on = kind > 0.5 ? smoothstep(0.0, 0.08, fract(time * 0.42 + phase)) * (1.0 - smoothstep(0.32, 0.5, fract(time * 0.42 + phase))) : 0.86 + 0.14 * sin(time * (2.0 + phase * 6.0) + phase * 30.0);
  vC = tint * on * k; gl_PointSize = (kind > 0.5 ? 3.4 : 1.6 + phase * 1.1) * pr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FAR_FS = `varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vC * exp(-r * r * 4.5) * (1.0 - smoothstep(0.8, 1.0, r)), 1.0); }`;

const SMOKE_VS = `attribute float aSize; attribute float aAlpha; attribute float aHeat; uniform float px; varying float vA; varying float vH;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(900.0, aSize * px / max(1.0, -mv.z)); vA = aAlpha; vH = aHeat; gl_Position = projectionMatrix * mv; }`;
const SMOKE_FS = `uniform sampler2D map; varying float vA; varying float vH;
void main(){ float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.004) discard; vec3 cold = vec3(0.27, 0.26, 0.3), warm = vec3(0.95, 0.46, 0.62), hot = vec3(2.3, 1.3, 1.6);
  vec3 c = mix(cold, warm, smoothstep(0.0, 0.6, vH)); c = mix(c, hot, smoothstep(0.6, 1.0, vH)); gl_FragColor = vec4(c, a); }`;
/* an engine's flame: a volume inside a bounding cylinder (its axis +z from the nozzle exit), marched along the view ray, as
   the group site's FG-01 draws its own. JETS nozzles feed it: apart at the exits, they run together into one column a
   little way down. White-hot down the middle, through the pink to a deep magenta at the edge, turbulent at its skin, with
   shock diamonds down the axis. It is never marched past its own length, nor past zMax (the mount or the ground). */
const PLUME_VS = `varying vec3 vPos; varying vec3 vCam;
void main(){ vPos = position; vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const plumeFS = (steps, jets) => GLSL_NOISE + `
varying vec3 vPos; varying vec3 vCam; uniform float time, L, zMax, RJ, RC, RM, spread, power, seed; uniform vec2 jet[${jets}];
void main(){
  vec3 ro = vCam, rd = normalize(vPos - vCam); float tEnd = length(vPos - vCam), zEnd = min(zMax, L);
  float a = dot(rd.xy, rd.xy), b = dot(ro.xy, rd.xy), c = dot(ro.xy, ro.xy) - RM * RM, h = b * b - a * c;
  if (h <= 0.0 || a < 1e-7 || zEnd <= 0.0) discard;
  float sq = sqrt(h), t0 = (-b - sq) / a, t1 = (-b + sq) / a;
  float iz = 1.0 / (abs(rd.z) > 1e-5 ? rd.z : 1e-5), z0 = -ro.z * iz, z1 = (zEnd - ro.z) * iz;
  float tn = max(max(t0, min(z0, z1)), 0.0), tf = min(min(t1, max(z0, z1)), tEnd);
  if (tf <= tn) discard;
  float dt = (tf - tn) / ${steps}.0, jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + seed) * 43758.5453);
  const vec3 coreC = vec3(2.3, 2.0, 2.15), midC = vec3(1.8, 0.3, 0.85), hazeC = vec3(0.7, 0.08, 0.3);
  vec3 col = vec3(0.0);
  for (int i = 0; i < ${steps}; i++) {
    vec3 p = ro + rd * (tn + (float(i) + jit) * dt); float z = clamp(p.z / L, 0.0, 1.0);
    float w = 1.0 + z * spread, m = smoothstep(0.0, 0.14, z), core = 0.0;
    float wc = mix(RJ, RC, m) * (1.0 - 0.62 * z);                                    /* the hot core narrows as it goes, the sheath round it spreads */
    for (int j = 0; j < ${jets}; j++) { float q = length(p.xy - jet[j] * (1.0 - m)) / wc; core += exp(-q * q * 5.0); }
    float fall = pow(1.0 - z, 1.35), qs = length(p.xy) / (RC * w * 1.25);
    float n = noise3(vec3(p.xy / RJ * 1.4, p.z / RJ * 0.45 - time * 9.0 + seed));
    core *= fall / mix(1.0, ${jets}.0, m);
    float sheath = exp(-qs * qs * 1.4) * fall * (0.45 + 0.75 * n);
    float shock = pow(0.5 + 0.5 * cos(z * 6.2832 * 3.4), 10.0) * exp(-qs * qs * 9.0) * (1.0 - z) * 0.9 * smoothstep(0.04, 0.2, z);
    float hot = clamp(core * 2.2 + shock, 0.0, 1.0);
    col += (mix(midC, coreC, hot) * (core + shock) * 2.2 + hazeC * sheath * 0.5) * dt / RJ;
  }
  col *= power / (1.0 + 5.0 * pow(abs(rd.z), 4.0)); col /= 1.0 + 0.25 * max(col.r, max(col.g, col.b)); gl_FragColor = vec4(col, 1.0);   /* seen up the flame it would bloom into a disc; a soft ceiling keeps it a flame */
}`;

export function createPad({ renderer, small, dpr, spec }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020308); scene.fog = new THREE.FogExp2(0x24182a, 0.0017);   // the haze: the colour the near hills' foot is lost in
  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.5, 12000); scene.add(camera);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o));
  const carbon = M(0x17181c, { roughness: 0.5, metalness: 0.5 }), steel = M(0x2a2d33, { roughness: 0.7, metalness: 0.6 });   // the mount and the tower (the rocket has its own, below)
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const cyl = (rt, rb, h, mat, x, y, z, parent, seg = 40, open = false) => add(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat, x, y, z, parent);

  const puff = softDisc(128, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.55)'], [0.7, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']]);
  const glowTex = softDisc(64, [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,255,255,.32)'], [0.55, 'rgba(255,255,255,.06)'], [1, 'rgba(255,255,255,0)']]);
  const glowAt = (parent, x, y, z, size, colour) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: colour, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); s.position.set(x, y, z); s.scale.setScalar(size); parent.add(s); return s; };

  /* ───────── the sky ───────── */
  const skyU = { dusk: { value: 0 }, time: { value: 0 }, cloudK: { value: 0.8 }, planetDir: { value: V(0, 0.3, -1).normalize() } };
  const sky = add(new THREE.SphereGeometry(6000, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, defines: small ? { LOW: 1 } : {}, side: THREE.BackSide, depthWrite: false, fog: false })); sky.renderOrder = -5;
  /* the Milky Way, and the stars, which turn with the planet as it crosses the sky through the evening (see update) */
  const mwN = V().crossVectors(dirDeg(...MW_A), dirDeg(...MW_B)).normalize(), mwC = dirDeg(...MW_CORE); mwC.addScaledVector(mwN, -mwC.dot(mwN)).normalize();
  const mwS = V().crossVectors(mwC, mwN), mwBase = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(mwC, mwN, mwS));   // the map's band runs round its equator, its core at +x
  const mwU = { map: { value: mapTex('milkyway') }, k: { value: 0 } };
  const milky = add(new THREE.SphereGeometry(5800, 64, 32), new THREE.ShaderMaterial({ uniforms: mwU, vertexShader: MW_VS, fragmentShader: MW_FS, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); milky.renderOrder = -4.5;
  const stars = (() => { const n = small ? 700 : 1800, pos = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n), tint = new Float32Array(n * 3), v = V();
    const TINTS = [[1, 1, 1], [0.8, 0.87, 1], [1, 0.88, 0.74], [1, 0.82, 0.86], [0.88, 0.93, 1], [1, 0.95, 0.88]];
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 20; tries++) {
        if (i % 5 < 2) { const t = rnd() * Math.PI * 2, off = (rnd() + rnd() + rnd() - 1.5) * 0.14; v.copy(mwC).multiplyScalar(Math.cos(t)).addScaledVector(mwS, Math.sin(t)).addScaledVector(mwN, off).normalize(); }   // two in five crowd along the band
        else { const el = Math.asin(0.02 + 0.98 * Math.pow(rnd(), 0.9)), az = rnd() * Math.PI * 2; v.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)); }
        if (v.y > 0.03) break; }
      pos.set([v.x * 5200, v.y * 5200, v.z * 5200], i * 3);
      const b = Math.pow(rnd(), 6), tn = TINTS[Math.floor(rnd() * TINTS.length)], br = 0.3 + 0.25 * rnd() + 2.1 * b;   // most are faint; a few stand out
      size[i] = 1.25 + 0.5 * rnd() + b * 3.2; ph[i] = rnd(); tint.set([tn[0] * br, tn[1] * br, tn[2] * br], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('size', new THREE.BufferAttribute(size, 1)); geo.setAttribute('phase', new THREE.BufferAttribute(ph, 1)); geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, pr: { value: dpr }, k: { value: 1 }, low: { value: 0.1 } }, vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    pts.frustumCulled = false; pts.renderOrder = -4; scene.add(pts); return pts; })();
  /* the planet: the group's own world, as the system draws Enterprise (sea and land, relief from the normal map, a layer of
     cloud, its air, the lights of its cities on the night side), made in this sky's own size. It turns slowly, shows the
     viewer the same tilt of its axis (tipped a little toward them) wherever it stands, and takes its light from PLANET_SUN */
  const planetSun = V(0, 0, 1e6), planetW = makeWorld(Object.assign({}, WORLDS.enterprise, { R: PLANET_R, spin: 0, cloudK: 0.6 }), planetSun, { seg: small ? 64 : 112 });
  const planet = new THREE.Group(), planetTip = new THREE.Group(); planetTip.rotation.x = 0.32; planet.add(planetTip); planetTip.add(planetW.group); scene.add(planet);
  planetW.look.gain.value = 0.84; planetW.look.sat.value = 1.08;  // a night photograph's exposure of it: bright, its pink full, but nothing burnt out under the glow
  /* its cloud lies a few metres over its ground, which this far off is finer than the depth buffer can tell apart, so the
     cloud is drawn a little forward */
  planetW.spin.children.forEach(m => { if (m.material.uniforms.cloudTint) Object.assign(m.material, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -6 }); });
  /* and its light in the air round it: soft, and pink */
  const planetGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(256, [[0, 'rgba(255,92,172,.3)'], [0.2, 'rgba(255,72,160,.12)'], [0.42, 'rgba(255,61,154,.035)'], [0.7, 'rgba(255,55,150,.01)'], [1, 'rgba(255,55,150,0)']]), depthWrite: false, fog: false, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
  planetGlow.scale.setScalar(PLANET_R * 7.5); planetGlow.renderOrder = -3; planet.add(planetGlow);
  const atFar = { az: 0, el: 0 }, atNear = { az: 0, el: 0 }, aimCam = new THREE.PerspectiveCamera(FOV, 1, 0.5, 12000), pRight = V(), pUp = V();
  /* which way the planet has to be, from the camera, for it to stand at PLANET_FAR as the view comes down to the pad and at
     PLANET_AT once it has closed in on the rocket, at this size of screen */
  function aim([cpos, ctgt], [fx, fy], w, h, o) { aimCam.aspect = w / h; aimCam.position.copy(cpos); aimCam.up.set(0, 1, 0); aimCam.lookAt(ctgt); aimCam.setViewOffset(w, h, -w * 0.15, 0, w, h); aimCam.updateProjectionMatrix(); aimCam.updateMatrixWorld();
    const d = V(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(aimCam).sub(aimCam.position).normalize(); o.az = Math.atan2(d.x, -d.z); o.el = Math.asin(d.y); }
  function placePlanet(w, h) { aim(CAM_FAR, PLANET_FAR, w, h, atFar); aim(CAM_NEAR, PLANET_AT, w, h, atNear); }
  placePlanet(innerWidth, innerHeight);

  /* ───────── the horizon ───────── */
  /* three ranges of hills, each a ridge line all the way round: low wooded hills, higher ground behind, and mountains, a
     massif of them on the planet's side. The seam of each is straight behind the camera, where it never looks */
  const vt = Array.from({ length: 512 }, rnd), vn = x => { const i = Math.floor(x), f = x - i, a = vt[(i % 512 + 512) % 512], b = vt[((i + 1) % 512 + 512) % 512]; return a + (b - a) * f * f * (3 - 2 * f); };
  const ridge = x => { let a = 0, w = 0.5, s = 0; for (let o = 0; o < 5; o++) { a += w * vn(x); s += w; x = x * 2.03 + 17.1; w *= 0.5; } return a / s; };
  const HILLS = [[1150, 9, 44, 7, 0.36], [2100, 26, 120, 3.4, 0.58], [3700, 70, 230, 2.3, 0.77]];   // distance, foot, rise, how broken, how far into the haze
  const hillH = (L, az) => { const [R, base, rise, fr] = HILLS[L]; let h = base + rise * Math.pow(ridge(az * fr + L * 41 + 100), 1.7) * 1.9;
    if (L === 2) h += 165 * Math.exp(-Math.pow((az - 0.55) / 0.2, 2)); if (L === 0) h += 3.5 * vn(az * 700) + 2 * vn(az * 2100); return h; };
  const hills = (() => { const seg = small ? 260 : 520, pos = [], k = [], idx = [];
    HILLS.forEach(([R, , , , hz], L) => { const o = pos.length / 3;
      for (let i = 0; i <= seg; i++) { const az = -Math.PI + i / seg * Math.PI * 2, x = Math.sin(az) * R, z = -Math.cos(az) * R; pos.push(x, -30, z, x, hillH(L, az), z); k.push(hz, 0, hz, 1); }
      for (let i = 0; i < seg; i++) { const a = o + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aK', new THREE.Float32BufferAttribute(k, 2)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { dusk: skyU.dusk, dark: { value: V(0.0032, 0.0034, 0.0062) } }, vertexShader: HILL_VS, fragmentShader: HILL_FS, side: THREE.DoubleSide })); m.frustumCulled = false; scene.add(m); return m; })();
  /* the lights of the towns along the near hills, and red beacons on masts on the higher ground */
  const farLights = (() => { const P = [], C = [], F = [], K = [];
    (small ? [[-0.42, 6], [0.12, 7], [0.5, 9], [0.86, 5]] : [[-0.62, 8], [-0.4, 10], [-0.1, 6], [0.14, 9], [0.46, 12], [0.7, 8], [0.92, 7]]).forEach(([az0, n]) => {
      for (let i = 0; i < n; i++) { const az = az0 + (rnd() - 0.5) * 0.07, R = HILLS[0][0] - 12, h = 2 + rnd() * hillH(0, az) * 0.5; P.push(Math.sin(az) * R, h, -Math.cos(az) * R);
        const r = rnd(), c = r < 0.62 ? [1.5, 0.82, 0.38] : r < 0.88 ? [1.2, 1.2, 1.32] : [1.45, 0.5, 0.95], b = 0.55 + rnd() * 0.6; C.push(c[0] * b, c[1] * b, c[2] * b); F.push(rnd()); K.push(0); } });
    [[-0.3, 1], [0.22, 2], [0.62, 1]].forEach(([az, L]) => { const R = HILLS[L][0] - 20; P.push(Math.sin(az) * R, hillH(L, az) + 14, -Math.cos(az) * R); C.push(2.2, 0.16, 0.22); F.push(rnd()); K.push(1); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('tint', new THREE.Float32BufferAttribute(C, 3)); geo.setAttribute('phase', new THREE.Float32BufferAttribute(F, 1)); geo.setAttribute('kind', new THREE.Float32BufferAttribute(K, 1));
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, pr: { value: dpr }, k: { value: 1 } }, vertexShader: FAR_VS, fragmentShader: FAR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    pts.frustumCulled = false; pts.renderOrder = -1; scene.add(pts); return pts; })();
  /* mist lying in bands along the valleys in front of the hills */
  const banks = []; for (let i = 0; i < (small ? 5 : 10); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: 0x564a68, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    const a = -0.7 + rnd() * 1.75, r = 360 + rnd() * 760; s.position.set(Math.sin(a) * r, 6 + rnd() * 20, -Math.cos(a) * r); s.scale.set(420 + rnd() * 620, 22 + rnd() * 26, 1); s.userData = { o: 0.07 + rnd() * 0.07, v: (rnd() - 0.5) * 3 }; s.renderOrder = -1; scene.add(s); banks.push(s); }

  /* ───────── the ground ───────── */
  const gtex = (() => { const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'); x.fillStyle = '#2b2d31'; x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 5200; i++) { x.fillStyle = 'rgba(' + (rnd() < 0.5 ? '0,0,0,' : '255,255,255,') + (0.02 + rnd() * 0.05) + ')'; x.fillRect(rnd() * 1024, rnd() * 1024, 1 + rnd() * 3, 1 + rnd() * 3); }
    x.strokeStyle = 'rgba(244,241,235,.5)'; x.lineWidth = 5; [470, 300].forEach(r => { x.beginPath(); x.arc(512, 512, r, 0, 7); x.stroke(); });
    x.strokeStyle = 'rgba(255,45,141,.75)'; x.lineWidth = 9; x.setLineDash([36, 26]); x.beginPath(); x.arc(512, 512, 180, 0, 7); x.stroke(); x.setLineDash([]);
    x.strokeStyle = 'rgba(244,241,235,.22)'; x.lineWidth = 3; for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; x.beginPath(); x.moveTo(512 + Math.cos(an) * 190, 512 + Math.sin(an) * 190); x.lineTo(512 + Math.cos(an) * 470, 512 + Math.sin(an) * 470); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  /* the ground is damp: patches of it shine where a light is low enough to be seen in it */
  const wet = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = 'rgb(228,228,228)'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) { const v = Math.round(170 + rnd() * 85); x.fillStyle = `rgba(${v},${v},${v},.3)`; x.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 1 + rnd() * 3); }
    for (let i = 0; i < 26; i++) { const px = rnd() * 256, py = rnd() * 256, r = 5 + rnd() * 16, v = Math.round(105 + rnd() * 55); for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r); g.addColorStop(0, `rgba(${v},${v},${v},.9)`); g.addColorStop(0.6, `rgba(${v},${v},${v},.5)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); x.fillStyle = g; x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 70); t.anisotropy = 8; return t; })();
  const ground = add(new THREE.PlaneGeometry(9000, 9000), M(0x0e1014, { roughness: 1, metalness: 0, roughnessMap: wet }), 0, 0, 0); ground.rotation.x = -Math.PI / 2;
  const apron = add(new THREE.CircleGeometry(46, 96), M(0xffffff, { map: gtex, roughness: 0.62, metalness: 0 }), 0, 0.03, 0); apron.rotation.x = -Math.PI / 2;
  const road = add(new THREE.PlaneGeometry(9, 520), M(0x1a1c20, { roughness: 0.7 }), 30, 0.02, 280); road.rotation.x = -Math.PI / 2; road.rotation.z = 0.12;
  /* the tree line: conifers, in stands, the nearer ones black against the haze, the further going into it */
  const tree = (() => { const parts = [[0.5, 0.44, 0.27], [0.38, 0.4, 0.52], [0.25, 0.36, 0.78]].map(([r, h, y]) => new THREE.ConeGeometry(r, h, 7, 1, true).translate(0, y, 0).toNonIndexed());   // three tiers, in units of its height
    const pos = new Float32Array(parts.reduce((s, p) => s + p.attributes.position.array.length, 0)); let o = 0; parts.forEach(p => { pos.set(p.attributes.position.array, o); o += p.attributes.position.array.length; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g; })();
  const NT = small ? 300 : 520, treeMat = new THREE.MeshBasicMaterial({ color: 0x030306, side: THREE.DoubleSide }), trees = new THREE.InstancedMesh(tree, treeMat, NT), dm = new THREE.Object3D();
  const stands = Array.from({ length: 16 }, () => [rnd() * Math.PI * 2, 0.08 + rnd() * 0.25]);
  for (let i = 0; i < NT; i++) { const st = stands[i % 16], a = i % 3 ? st[0] + (rnd() - 0.5) * st[1] : rnd() * Math.PI * 2, r = 240 + Math.pow(rnd(), 0.8) * 620;
    if (Math.cos(a) * r > 100 && Math.abs(Math.sin(a) * r) < 60) dm.scale.setScalar(0.001); else { const h = 9 + rnd() * 17; dm.scale.set(h * 0.34, h, h * 0.34); }
    dm.position.set(Math.sin(a) * r, 0, -Math.abs(Math.cos(a) * r) * (rnd() < 0.8 ? 1 : -1)); dm.rotation.y = rnd() * 6; dm.updateMatrix(); trees.setMatrixAt(i, dm.matrix); }
  scene.add(trees);

  /* ───────── searchlights, sweeping slowly up from beyond the pad ───────── */
  const searches = (small ? [[-380, -820, -0.3, 66], [560, -900, 0.42, 62]] : [[-380, -820, -0.3, 66], [240, -1150, 0.1, 72], [640, -760, 0.5, 60]]).map(([x, z, az, el], i) => {
    const len = 2600, geo = new THREE.ConeGeometry(150, len, 28, 1, true); geo.rotateX(Math.PI); geo.translate(0, len / 2, 0);
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { colour: { value: new THREE.Color(i === 1 ? 0xffd2e6 : 0xd6e0ff) }, k: { value: 0 } }, vertexShader: BEAM_VS, fragmentShader: SEARCH_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, 1, z); m.userData = { az, el: el * DEG, ph: i * 2.3 + 0.7 }; m.renderOrder = 5; m.frustumCulled = false; scene.add(m); return m; });

  /* ───────── birds, a few, going over now and then ───────── */
  const NB = small ? 5 : 7, birdPos = new Float32Array(NB * 6 * 3), birdGeo = new THREE.BufferGeometry(); birdGeo.setAttribute('position', new THREE.BufferAttribute(birdPos, 3));
  const birds = new THREE.Mesh(birdGeo, new THREE.MeshBasicMaterial({ color: 0x07060b, side: THREE.DoubleSide, fog: false })); birds.frustumCulled = false; scene.add(birds);
  const flock = Array.from({ length: NB }, (_, i) => ({ o: V(-i * 5 - rnd() * 4, (rnd() - 0.5) * 5, (i % 2 ? 1 : -1) * (2 + i * 2.6)), ph: rnd() * 6, f: 2.4 + rnd() * 0.8 }));
  const B0 = V(-200, 55, -120), B1 = V(280, 92, -540), bDir = V().subVectors(B1, B0).normalize(), bSide = V().crossVectors(bDir, V(0, 1, 0)).normalize();

  /* the mount, the tower, the lights */
  box(11, 2.2, 11, carbon, 0, 1.1, 0); box(15, 0.5, 15, steel, 0, 0.25, 0); box(5, 1.6, 22, M(0x0d0e11, { roughness: 1 }), 0, 0.2, 16);
  const tower = new THREE.Group(); tower.position.set(-10.5, 0, -2); scene.add(tower);
  const TH = 56; [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]].forEach(([x, z]) => box(0.42, TH, 0.42, steel, x, TH / 2, z, tower));
  for (let y = 4; y <= TH; y += 4) { box(5.2, 0.24, 0.24, steel, 0, y, -2.4, tower); box(5.2, 0.24, 0.24, steel, 0, y, 2.4, tower); box(0.24, 0.24, 5.2, steel, -2.4, y, 0, tower); box(0.24, 0.24, 5.2, steel, 2.4, y, 0, tower);
    if (y < TH) { const d = box(6.3, 0.16, 0.16, steel, 0, y + 2, 2.4, tower); d.rotation.z = (y / 4 % 2 ? 1 : -1) * 0.69; const e = box(0.16, 0.16, 6.3, steel, 2.4, y + 2, 0, tower); e.rotation.x = (y / 4 % 2 ? 1 : -1) * 0.69; } }
  box(5.6, 0.3, 5.6, steel, 0, TH + 0.2, 0, tower); cyl(0.09, 0.16, 16, steel, 0, TH + 8, 0, tower, 8);
  const arms = [box(8.4, 0.7, 1.5, steel, 5.2, 33, 0, tower), box(8.4, 0.7, 1.5, steel, 5.2, 21, 0, tower)];
  const beacons = [[0, TH + 16.2, 0], [-2.4, TH + 0.6, -2.4], [2.4, TH + 0.6, 2.4]].map(p => add(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff2040, fog: false }), p[0], p[1], p[2], tower));
  const beaconGlow = [[0, TH + 16.2, 0], [-2.4, TH + 0.6, -2.4], [2.4, TH + 0.6, 2.4]].map((p, i) => glowAt(tower, p[0], p[1], p[2], i ? 1.6 : 2.2, new THREE.Color(2.4, 0.3, 0.42)));
  const poleGlow = [];
  const lamps = [[-82, 36, 12, 0xcfe0ff, 1.7], [66, 30, 48, 0xffe8dc, 0.8], [44, 40, -58, 0xff7ab8, 1.5]].map(([x, y, z, c, power], i) => {
    cyl(0.25, 0.4, y, steel, x, y / 2, z, scene, 8); box(2.6, 1.3, 0.9, M(0x111216), x, y + 0.6, z).lookAt(0, 24, 0); add(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2), fog: false }), x, y + 0.6, z);
    add(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2040, fog: false }), x, y + 1.5, z); poleGlow.push(glowAt(scene, x, y + 1.5, z, 1.5, new THREE.Color(2.2, 0.26, 0.4)));   // a warning light on each mast
    const len = Math.hypot(x, y - 24, z), cone = add(new THREE.ConeGeometry(7, len, 40, 1, true), new THREE.ShaderMaterial({ uniforms: { colour: { value: new THREE.Color(c) }, k: { value: i === 1 ? 0.07 : 0.11 } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), x / 2, (y + 24) / 2, z / 2);
    cone.quaternion.setFromUnitVectors(V(0, 1, 0), V(x, y - 24, z).normalize()); cone.renderOrder = 6;
    const l = new THREE.SpotLight(c, power, 0, 0.22, 0.7, 0); l.position.set(x, y, z); l.target.position.set(0, 24, 0); scene.add(l, l.target);
    /* the spill of each floodlight on the ground round its mast, and its long reflection in the damp (not on a phone) */
    if (!small) { const p = new THREE.PointLight(c, [520, 320, 480][i], 0, 2); p.position.set(x, y + 0.2, z); scene.add(p); }
    return l; });
  /* the pad's own lights, from high on the far mast, down onto the apron round the mount */
  const padLight = new THREE.SpotLight(0xfff0e6, 1.1, 0, 0.55, 0.85, 0); padLight.position.set(30, 70, 46); padLight.target.position.set(0, 0, -6); scene.add(padLight, padLight.target);
  scene.add(new THREE.HemisphereLight(0x2c3552, 0x060607, 0.42)); const planetLight = new THREE.DirectionalLight(0xe8c6e6, 0.28); planetLight.position.set(0.4, 0.4, -0.8).normalize(); scene.add(planetLight);   // the planet's light, faintly pink

  /* ───────── the rocket ─────────
     A core stage and two side boosters, built the way the real ones are. Each body is turned on a lathe from its own
     profile, each nose a tangent ogive; a carbon interstage joins the core's two stages; each booster is held on by a
     forward attach fairing and by struts low down; carbon skirts close the engine bays, and under them hang metal engine
     bells, three on the core and one on each booster, heat-tinted from the throat to the lip. The porcelain is paint under
     a clear coat: its panels, ring welds, rivet rows, hatches and the soot of the landing burns are one painted skin and
     its relief, which the clear coat follows too. What is of one material is one mesh. Units are metres, y up from the
     mount. (The courier, courier.js, is this vehicle drawn in two dimensions: the same stations, bands and engines.) */
  const R = 1.86, BR = 1.02, BX = 3.08, TIP = 44.7, BTIP = 24.1, THROAT = -0.35, EXIT = -1.6, SKIN = 45;   // the radii, where the boosters stand, the noses, the engines; how tall the skin is
  const rocket = new THREE.Group(); rocket.position.y = 2.2; scene.add(rocket);
  for (let i = 0; i < 8000; i++) rnd();                          // the draws the old skin made, so the mist and the smoke after it fall where they always have
  let rs = 20261121; const rr = () => { rs = (rs * 16807) % 2147483647; return (rs - 1) / 2147483646; };
  const canvas2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const dot = (x, px, py, r, fill, w) => { x.fillStyle = fill; for (const o of [0, -w, w]) { if (px + o < -r || px + o > w + r) continue; x.beginPath(); x.arc(px + o, py, r, 0, 7); x.fill(); } };
  const band = (x, px, py, bw, bh, fill, w) => { x.fillStyle = fill; for (const o of [0, -w, w]) if (px + o + bw > 0 && px + o < w) x.fillRect(px + o, py, bw, bh); };
  /* a relief (grey: raised is light) turned into a tangent-space normal map, in place; it wraps round the body */
  const reliefToNormals = (x, w, h, k) => { const s = x.getImageData(0, 0, w, h).data, o = x.createImageData(w, h), d = o.data;
    for (let y = 0; y < h; y++) { const yu = Math.max(0, y - 1) * w, yd = Math.min(h - 1, y + 1) * w, yr = y * w;
      for (let i = 0; i < w; i++) { const dx = (s[(yr + (i + 1) % w) * 4] - s[(yr + (i + w - 1) % w) * 4]) / 255, dy = (s[(yd + i) * 4] - s[(yu + i) * 4]) / 255;
        const nx = -dx * k, ny = dy * k, l = Math.hypot(nx, ny, 1), j = (yr + i) * 4; d[j] = (nx / l * 0.5 + 0.5) * 255; d[j + 1] = (ny / l * 0.5 + 0.5) * 255; d[j + 2] = (0.5 / l + 0.5) * 255; d[j + 3] = 255; } }
    x.putImageData(o, 0, 0); };
  const tex = (c, colour) => { const t = new THREE.CanvasTexture(c); if (colour) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  /* the skin: u round the body from +z toward +x, v up it, SKIN metres (a booster wears the core's from 0.8 m up, so its
     skirt meets the same rivet row). The core is laid out in barrels between ring welds, eight panels round, every other
     ring turned half a panel and each panel a shade apart; rivet rows where the skirt, the interstage and the fairing join;
     the fairing's split line, riveted each side; a few hatches, a vent; and the soot of the landing burns, low down */
  const [skinCol, skinNrm] = (() => {
    const w = small ? 256 : 512, h = w * 4, k = w / 512, px = w / (2 * Math.PI * R), [cc, c] = canvas2d(w, h), [rc, r] = canvas2d(w, h);
    const Y = y => (1 - y / SKIN) * h, U = phi => ((phi / (2 * Math.PI)) % 1 + 1) % 1 * w;
    c.fillStyle = '#f3f0ea'; c.fillRect(0, 0, w, h); r.fillStyle = '#808080'; r.fillRect(0, 0, w, h);
    const RINGS = [3, 5.48, 7.96, 10.44, 12.92, 15.4, 17.88, 20.36, 22.84, 25.32, 27.8, 30.28, 32, 33.6];
    for (let i = 0; i < RINGS.length - 1; i++) { const y0 = Y(RINGS[i]), y1 = Y(RINGS[i + 1]), off = i % 2 ? 0.5 : 0;
      for (let j = 0; j < 8; j++) { const x0 = (j + off) / 8 * w;
        band(c, x0, y1, w / 8, y0 - y1, rr() < 0.5 ? `rgba(92,80,68,${(0.014 + rr() * 0.026).toFixed(3)})` : `rgba(255,255,255,${(0.03 + rr() * 0.05).toFixed(3)})`, w);
        band(r, x0 - 0.8 * k, y1, 1.6 * k, y0 - y1, '#585858', w); band(c, x0 - 0.5 * k, y1, k, y0 - y1, 'rgba(70,60,52,.16)', w); } }
    for (const y of RINGS) { const yy = Y(y); r.fillStyle = '#505050'; r.fillRect(0, yy - 1.7 * k, w, 3.4 * k); r.fillStyle = '#c4c4c4'; r.fillRect(0, yy - 0.8 * k, w, 1.6 * k); c.fillStyle = 'rgba(70,60,52,.2)'; c.fillRect(0, yy - 0.6 * k, w, 1.2 * k); }
    const rivets = y => { const n = Math.round(w / (0.16 * px)); for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) { const x = (i + row * 0.5) / n * w, yy = Y(y + (row - 0.5) * 0.07); dot(r, x, yy, 1.15 * k, '#dadada', w); dot(c, x, yy, 0.75 * k, 'rgba(80,70,60,.34)', w); } };
    [3.14, 30.66, 32.16, 33.44, 33.76].forEach(rivets);
    for (const phi of [-Math.PI / 3, Math.PI * 2 / 3]) { const x = U(phi); band(r, x - 1.1 * k, 0, 2.2 * k, Y(33.6), '#4c4c4c', w); band(c, x - 0.6 * k, 0, 1.2 * k, Y(33.6), 'rgba(70,60,52,.24)', w);   // the fairing's split line
      for (let y = 33.8; y < 42.5; y += 0.17) for (const s of [-1, 1]) dot(r, x + s * 3.2 * k, Y(y), 0.95 * k, '#d4d4d4', w); }
    [[-0.32, 4.4, 0.8, 0.55], [0.62, 6.15, 0.5, 0.5], [-0.95, 11.2, 0.6, 0.9], [0.18, 26.5, 0.7, 0.5], [0.45, 32.85, 0.55, 0.4], [2.6, 8, 0.6, 0.6], [3.7, 19, 0.7, 0.5]].forEach(([phi, y, hw, hh]) => {   // hatches
      const x0 = U(phi) - hw * px / 2, y0 = Y(y + hh / 2), ww = hw * px, h2 = Y(y - hh / 2) - y0;
      for (const o of [0, -w, w]) { r.strokeStyle = '#555'; r.lineWidth = 1.5 * k; r.strokeRect(x0 + o, y0, ww, h2); c.strokeStyle = 'rgba(70,60,52,.3)'; c.lineWidth = k; c.strokeRect(x0 + o, y0, ww, h2); }
      for (const [fx, fy] of [[0.12, 0.15], [0.88, 0.15], [0.12, 0.85], [0.88, 0.85]]) { dot(r, x0 + ww * fx, y0 + h2 * fy, 1.1 * k, '#d8d8d8', w); dot(c, x0 + ww * fx, y0 + h2 * fy, 0.8 * k, 'rgba(70,60,52,.4)', w); } });
    for (let i = 0; i < 4; i++) { const x0 = U(-0.15) - 0.15 * px, yy = Y(32.75 - i * 0.08); band(c, x0, yy, 0.3 * px, 1.4 * k, 'rgba(34,30,28,.55)', w); band(r, x0, yy, 0.3 * px, 1.4 * k, '#3c3c3c', w); }   // a vent
    const soot = c.createLinearGradient(0, Y(3), 0, Y(8.5)); soot.addColorStop(0, 'rgba(54,42,40,.22)'); soot.addColorStop(0.35, 'rgba(54,42,40,.08)'); soot.addColorStop(1, 'rgba(54,42,40,0)'); c.fillStyle = soot; c.fillRect(0, Y(8.5), w, Y(3) - Y(8.5));
    for (let i = 0; i < 46; i++) { const x = rr() * w, top = 3.4 + rr() * 5.5, g = c.createLinearGradient(0, Y(3), 0, Y(top)); g.addColorStop(0, 'rgba(50,40,38,.1)'); g.addColorStop(1, 'rgba(50,40,38,0)'); band(c, x, Y(top), (1 + rr() * 4) * k, Y(3) - Y(top), g, w); }
    reliefToNormals(r, w, h, 2.4); return [tex(cc, true), tex(rc, false)]; })();
  /* the carbon: stringers all the way round and a rivet row along each edge (v runs 0 to 1 over each part's height) */
  const carbonNrm = (() => { const w = small ? 256 : 512, h = w / 8, k = w / 512, [cv, x] = canvas2d(w, h); x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 64; i++) { const u = i / 64 * w; band(x, u - 1.5 * k, 0, 3 * k, h, '#a4a4a4', w); band(x, u + 1.5 * k, 0, k, h, '#666', w); }
    for (const v of [0.12, 0.88]) for (let i = 0; i < 128; i++) dot(x, (i + 0.5) / 128 * w, v * h, 1.1 * k, '#d4d4d4', w);
    reliefToNormals(x, w, h, 2); return tex(cv, false); })();
  /* the bells: a regeneratively cooled wall, tubes all the way round */
  const bellNrm = (() => { const w = 256, h = 8, [cv, x] = canvas2d(w, h); for (let i = 0; i < w; i++) { const v = Math.round(128 + 80 * Math.cos(i / w * Math.PI * 2 * 72)); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, 0, 1, h); } reliefToNormals(x, w, h, 1.4); return tex(cv, false); })();
  /* what the paint and the metal reflect: the night (a dark dome, warmer toward the horizon), the floodlights on their masts
     and the light over the pad, and the planet's pink, high on the far side */
  const env = (() => { const e = new THREE.Scene();
    e.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: SKY_VS,
      fragmentShader: `varying vec3 vDir; void main(){ vec3 d = normalize(vDir); vec3 c = mix(vec3(0.05, 0.026, 0.045), vec3(0.008, 0.01, 0.026), smoothstep(0.0, 0.5, d.y)); gl_FragColor = vec4(mix(c, vec3(0.01, 0.01, 0.013), smoothstep(0.0, -0.08, d.y)), 1.0); }` })));
    [[-82, 12, 12, 7, [9, 10, 12]], [66, 6, 48, 6, [8, 7, 6.5]], [44, 16, -58, 7, [10, 3.5, 6]], [30, 46, 46, 9, [5, 4.6, 4.3]], [0.4, 0.5, -0.75, 10, [0.9, 0.25, 0.55]]].forEach(([x, y, z, s, c]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.7), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), side: THREE.DoubleSide })); m.position.set(x, y, z).normalize().multiplyScalar(40); m.lookAt(0, 0, 0); e.add(m); });
    const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(e, 0.02).texture; pm.dispose(); e.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); return t; })();
  /* a floodlight caught in the clear coat is a pinpoint far brighter than the paint round it, and the bloom would ring it
     with a halo: past the paint's own brightness the light rolls off on a soft shoulder, so a glint stays a glint */
  const tame = m => { m.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>',
    'float pk = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b)); if (pk > 0.9) outgoingLight *= (0.9 + 0.35 * (1.0 - exp((0.9 - pk) / 0.35))) / pk;\n#include <opaque_fragment>'); }; return m; };
  const PH = o => tame(new THREE.MeshPhysicalMaterial(Object.assign({ envMap: env, envMapIntensity: 0.8, metalness: 0 }, o))), NS = s => new THREE.Vector2(s, s);
  const paint = PH({ color: 0xffffff, map: skinCol, normalMap: skinNrm, normalScale: NS(0.55), roughness: 0.46, clearcoat: 1, clearcoatRoughness: 0.16, clearcoatNormalMap: skinNrm, clearcoatNormalScale: NS(0.4) });
  const pinkPaint = PH({ color: 0xff2d8d, emissive: 0xff2d8d, emissiveIntensity: 0.05, normalMap: skinNrm, normalScale: NS(0.55), roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.14, clearcoatNormalMap: skinNrm, clearcoatNormalScale: NS(0.4) });
  const carbonFibre = PH({ color: 0x121316, normalMap: carbonNrm, normalScale: NS(0.7), roughness: 0.5, metalness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x34373e, roughness: 0.45, metalness: 0.85, envMap: env });
  const bellMat = tame(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.92, roughness: 0.3, normalMap: bellNrm, normalScale: NS(0.6), side: THREE.DoubleSide, envMap: env, envMapIntensity: 1.2 }));
  const glowIn = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, fog: false }), glowThroat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
  /* the parts, gathered by material and joined into one mesh each */
  const byMat = new Map(), put = (mat, g) => { if (!byMat.has(mat)) byMat.set(mat, []); byMat.get(mat).push(g); return g; };
  const S = small ? 48 : 80, BS = small ? 32 : 48;
  /* a body of revolution from its profile ([radius, height], bottom to top, so its faces point out), v from the height */
  const turn = (pts, seg, vOf) => { const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), p = g.attributes.position, uv = g.attributes.uv; if (vOf) for (let i = 0; i < p.count; i++) uv.setY(i, vOf(p.getY(i))); return g; };
  const skinV = off => y => (y + off) / SKIN, partV = (y0, y1) => y => (y - y0) / (y1 - y0);
  /* a tangent ogive of radius r from y0 to its tip at y1 (as a radius at a height), and a run of a profile, closer toward a tip */
  const ogive = (r, y0, y1) => { const L = y1 - y0, rho = (r * r + L * L) / (2 * r); return y => Math.max(0, Math.sqrt(Math.max(0, rho * rho - (y - y0) * (y - y0))) + r - rho); };
  const run = (f, ya, yb, n, tip) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, y = ya + (yb - ya) * (tip ? 1 - Math.pow(1 - t, 1.7) : t); return [f(y), y]; });
  const ring = (r, y0, y1, d) => [[r - 0.004, y0], [r + d, y0 + 0.03], [r + d, y1 - 0.03], [r - 0.004, y1]];   // a band a little proud of the body, its edges turned down into it
  /* an engine: its powerhead, a bell turned on a bell curve from the throat to the lip (heat-tinted: bronze at the throat,
     blue and violet down the middle, pale at the lip), the glow inside it and at its throat when it burns */
  const TINT = [[0, [0.56, 0.37, 0.25]], [0.45, [0.3, 0.24, 0.42]], [1, [0.72, 0.69, 0.64]]];
  const bellGeo = (rt, re, len, n, colour) => { const pts = []; for (let i = 16; i >= 0; i--) { const u = i / 16; pts.push([rt + (re - rt) * Math.pow(u, 0.62), THROAT - u * len]); }
    const g = turn(pts, n); if (!colour) { g.deleteAttribute('uv'); return g; } const p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const u = (THROAT - p.getY(i)) / len, j = u < TINT[1][0] ? 0 : 1, a = TINT[j], b = TINT[j + 1], f = clamp((u - a[0]) / (b[0] - a[0])); for (let c = 0; c < 3; c++) col[i * 3 + c] = lerp(a[1][c], b[1][c], f); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; };
  const engine = (x, z, rt, re) => { const len = THROAT - EXIT;
    put(metal, new THREE.CylinderGeometry(rt * 1.2, rt * 1.45, 0.5, 16).translate(x, (THROAT + 0.15) / 2, z));
    put(bellMat, bellGeo(rt, re, len, small ? 24 : 36, true).translate(x, 0, z)); put(glowIn, bellGeo(rt * 0.97, re * 0.97, len * 0.98, small ? 16 : 24, false).translate(x, 0, z));
    put(glowThroat, new THREE.CircleGeometry(rt * 1.04, 16).rotateX(Math.PI / 2).translate(x, THROAT - 0.02, z).deleteAttribute('uv')); };
  /* a rod from one point to another */
  const rod = (a, b, r) => { const d = V().subVectors(b, a), g = new THREE.CylinderGeometry(r, r, d.length(), 8); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y_UP, d.normalize())); return put(metal, g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)); };

  /* the core: the aft skirt over the engine bay, the first stage to the interstage, the second stage and the fairing, the nose */
  const noseR = ogive(R, 34, TIP);
  put(carbonFibre, turn([[1.97, 0], [1.975, 0.06], [1.95, 0.5], [R + 0.012, 2.94], [R, 3]], S, partV(0, 3)));
  put(paint, turn([[R, 3], [R, 30.8]], S, skinV(0)));
  put(carbonFibre, turn([[R, 30.8], [R + 0.024, 30.83], [R + 0.024, 31.97], [R, 32]], S, partV(30.8, 32)));
  put(paint, turn([[R, 32], ...run(noseR, 34, 40.4, 12)], S, skinV(0)));
  put(pinkPaint, turn(run(noseR, 40.4, TIP, 18, true), S, skinV(0)));
  put(pinkPaint, turn(ring(R, 22.35, 23.65, 0.014), S, skinV(0)));
  put(metal, new THREE.CircleGeometry(1.95, 48).rotateX(Math.PI / 2).translate(0, 0.14, 0));   // the base of the engine bay
  const ENG = [[0, 0.95], [-0.8227, -0.475], [0.8227, -0.475]]; ENG.forEach(([x, z]) => engine(x, z, 0.21, 0.66));
  /* a cable raceway up the first stage, and a short one past the interstage; its skin is the body's own column of it */
  const PHI_RW = -0.78; [[3.2, 22.35], [22.35, 23.65, pinkPaint], [23.65, 30.7], [32.1, 33.5]].forEach(([y0, y1, mat]) => { const g = new THREE.BoxGeometry(0.22, y1 - y0, 0.07).translate(0, (y0 + y1) / 2, R + 0.03).rotateY(PHI_RW), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, ((PHI_RW / (2 * Math.PI)) % 1 + 1) % 1, p.getY(i) / SKIN); put(mat || paint, g); });   // painted with the band where it crosses it
  /* the boosters: skirt, body, band, nose and engine each, held to the core by a forward attach fairing and by struts low down */
  for (const sx of [-1, 1]) { const x = sx * BX, bNose = ogive(BR, 20.2, BTIP), at = g => g.translate(x, 0, 0);
    put(carbonFibre, at(turn([[1.1, 0], [1.1, 0.06], [1.08, 0.4], [BR + 0.008, 2.14], [BR, 2.2]], BS, partV(0, 2.2))));
    put(paint, at(turn([[BR, 2.2], [BR, 20.2]], BS, skinV(0.8))));
    put(pinkPaint, at(turn(run(bNose, 20.2, BTIP, 16, true), BS, skinV(0.8))));
    put(pinkPaint, at(turn(ring(BR, 15.05, 15.95, 0.012), BS, skinV(0.8))));
    put(metal, at(new THREE.CircleGeometry(1.06, 32).rotateX(Math.PI / 2).translate(0, 0.12, 0)));
    engine(x, 0, 0.17, 0.56);
    put(carbonFibre, new THREE.CapsuleGeometry(0.15, 0.5, 4, 12).rotateZ(Math.PI / 2).scale(1, 0.9, 1.6).translate(sx * (R + 0.1), 17.6, 0));
    for (const z of [-1, 1]) rod(V(sx * 1.8, 3.5, z * 0.55), V(sx * 2.14, 4.6, z * 0.32), 0.045);
    rod(V(sx * 1.8, 4.1, 0), V(sx * 2.14, 4.1, 0), 0.05); }
  /* join each material's parts */
  for (const [mat, list] of byMat) { const names = Object.keys(list[0].attributes), g = new THREE.BufferGeometry(), idx = []; let n = 0;
    for (const nm of names) { const sz = list[0].attributes[nm].itemSize, arr = new Float32Array(list.reduce((s, q) => s + q.attributes[nm].count * sz, 0)); let o = 0; for (const q of list) { arr.set(q.attributes[nm].array, o); o += q.attributes[nm].count * sz; } g.setAttribute(nm, new THREE.BufferAttribute(arr, sz)); }
    for (const q of list) { const c = q.attributes.position.count; if (q.index) for (const i of q.index.array) idx.push(i + n); else for (let i = 0; i < c; i++) idx.push(i + n); n += c; q.dispose(); }
    g.setIndex(idx); g.computeBoundingSphere(); const m = add(g, mat, 0, 0, 0, rocket); if (mat === glowIn || mat === glowThroat) m.visible = false; }
  const glows = rocket.children.filter(m => m.material === glowIn || m.material === glowThroat);
  /* the name down the side: drawn once the wordmark face has loaded, under the same clear coat */
  const decalMat = PH({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.12 });
  const decal = add(new THREE.CylinderGeometry(R + 0.004, R + 0.004, 13.5, 32, 1, true, -0.52, 1.04), decalMat, 0, 13.6, 0, rocket); decal.rotation.y = 0.35; decal.visible = false;
  const drawDecal = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 1792; const x = c.getContext('2d'); x.translate(128, 896); x.rotate(-Math.PI / 2); x.font = '400 150px Michroma, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#101010'; x.fillText('FREEDOM', 0, 6);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; decalMat.map = t; decalMat.needsUpdate = true; decal.visible = true; };
  (document.fonts && document.fonts.load ? document.fonts.load('400 150px Michroma').then(drawDecal, drawDecal) : Promise.resolve().then(drawDecal));

  /* the flames: one volume for the core's three engines (they run together a little way down) and one for each booster's */
  const steps = small ? 6 : spec && spec.lite ? 8 : 11;
  const plume = (x, o) => { const LMAX = o.L0 * 1.6, g = new THREE.CylinderGeometry(o.RM, o.RM, LMAX, 20, 1, false); g.translate(0, LMAX / 2, 0); g.rotateX(Math.PI / 2);
    const mat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, L: { value: o.L0 }, zMax: { value: LMAX }, RJ: { value: o.RJ }, RC: { value: o.RC }, RM: { value: o.RM }, spread: { value: o.spread }, power: { value: 0 }, seed: { value: rr() * 40 }, jet: { value: o.jets.map(j => new THREE.Vector2(j[0], j[1])) } },
      vertexShader: PLUME_VS, fragmentShader: plumeFS(steps, o.jets.length), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false });
    const m = add(g, mat, x, EXIT + 0.05, 0, rocket); m.rotation.x = Math.PI / 2; m.renderOrder = 6; m.frustumCulled = false; m.visible = false; m.userData = { L0: o.L0, LMAX }; return m; };   // turned so its axis runs down
  const plumes = [plume(0, { L0: 21, RJ: 0.55, RC: 1.2, RM: 4, spread: 0.8, jets: ENG }), ...[-1, 1].map(sx => plume(sx * BX, { L0: 16, RJ: 0.48, RC: 0.52, RM: 1.9, spread: 0.9, jets: [[0, 0]] }))];
  const fire = new THREE.PointLight(0xffa6cf, 0, 600, 1.1); fire.position.set(0, 3, 6); scene.add(fire);
  /* the engines seen from far off: one bright point under the rocket while it burns */
  const burn = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(128, [[0, 'rgba(255,246,250,1)'], [0.16, 'rgba(255,176,218,.5)'], [0.5, 'rgba(255,70,155,.1)'], [1, 'rgba(255,45,141,0)']]), color: new THREE.Color(2.2, 1.5, 1.9), transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); burn.position.set(0, -3.5, 0); burn.renderOrder = 8; rocket.add(burn);
  const N = small ? 260 : 620, sp = new Float32Array(N * 3), sSize = new Float32Array(N), sAlpha = new Float32Array(N), sHeat = new Float32Array(N), parts = []; for (let i = 0; i < N; i++) parts.push({ life: 0, max: 1, v: V(), s0: 1, s1: 1, a: 0 });
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1)); sGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sAlpha, 1)); sGeo.setAttribute('aHeat', new THREE.BufferAttribute(sHeat, 1));
  const smokeMat = new THREE.ShaderMaterial({ uniforms: { map: { value: puff }, px: { value: 800 } }, vertexShader: SMOKE_VS, fragmentShader: SMOKE_FS, transparent: true, depthWrite: false, fog: false });
  const smoke = new THREE.Points(sGeo, smokeMat); smoke.frustumCulled = false; smoke.renderOrder = 7; scene.add(smoke); let cursor = 0;
  function emit(x, y, z, vx, vy, vz, life, s0, s1, a) { const p = parts[cursor]; sp[cursor * 3] = x; sp[cursor * 3 + 1] = y; sp[cursor * 3 + 2] = z; p.v.set(vx, vy, vz); p.life = p.max = life; p.s0 = s0; p.s1 = s1; p.a = a; cursor = (cursor + 1) % N; }
  const mist = []; for (let i = 0; i < (small ? 7 : 14); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: 0x8f9bb8, transparent: true, opacity: 0.05 + rnd() * 0.05, depthWrite: false, fog: false })); s.position.set(-170 + rnd() * 340, 3 + rnd() * 5, -60 + rnd() * 150); s.scale.set(90 + rnd() * 90, 14 + rnd() * 10, 1); s.userData.v = 0.6 + rnd() * 1.2; s.userData.o = s.material.opacity; scene.add(s); mist.push(s); }

  /* ───────── the camera, the arrival, the burn ───────── */
  let W = innerWidth, H = innerHeight, T = -1, thrust = 0, done = null, vent = 0, ry = 0, shake = 0, wasDown = false;
  const cp = V(), ct = V(), pos = V(), tgt = V(), skyAt = V(-140, 150, 820), md = V(), pv = V(), tv = V(), px = { x: 0, y: 0 }, mistCold = new THREE.Color(0x8f9bb8), mistWarm = new THREE.Color(0xff9ccb); let first = true;
  /* what the page (and anything that has to meet the rocket) may read each frame, in CSS pixels: the rocket's centre line x,
     the middle of its height y, its height on screen h (top and base are its nose and its engines), whether it is drawn
     (vis) and whether it is standing on the pad, and k, how far its arrival has gone (0: waiting just above the top of the
     screen, on the line it will come down; 1: settled). on: this world is being drawn; down: how far the view has come
     down from the sky to the pad (x is where the rocket will enter once this is 1). planetX, planetY: where the planet is
     (the climb's cloud is lit from there); dusk: how much of the dusk is left. */
  const out = { x: 0, y: 0, h: 0, top: 0, base: 0, vis: false, onPad: false, k: 0, on: false, down: 0, planetX: 0, planetY: 0, dusk: 0 };
  const dirOf = (az, el, o) => o.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  const toPx = v => { pv.copy(v).project(camera); px.x = (pv.x * 0.5 + 0.5) * W; px.y = (-pv.y * 0.5 + 0.5) * H; return px; };
  function resize(w, h) { W = w; H = h; camera.aspect = w / h; camera.updateProjectionMatrix(); smokeMat.uniforms.px.value = h * (renderer.getPixelRatio ? renderer.getPixelRatio() : 1) / (2 * TANH); placePlanet(w, h); first = true; }
  function update(s, dt, time) {
    const phone = W < 900, lo = s.liftoff, e = s.raise.pe;
    const dusk = 1 - span(e, 0.83, 0.99);                                    // the evening: dusk through the raise, night as it ends
    const g = smooth(clamp((lo.x + 1) / 1.05));                              // how far the view has come down out of the sky to the complex
    const L = smooth(clamp((lo.pe - 0.04) / 0.74));                          // and how far it has closed in on the rocket
    const a = clamp((lo.pe - ARRIVE[0]) / (ARRIVE[1] - ARRIVE[0]));          // the rocket's arrival
    /* looking up: the camera stands well back from the complex, turned so the planet sits where the page leaves it room
       (beside the raise's heading; then, as night settles, it crosses to the open side of Beyond's) */
    const over = span(e, 0.9, 1.06), planetR = Math.tan(PLANET_ANG) * 1.12 / TANH * H / 2;        // planetR: the planet's radius on the screen, with its air
    const mx = phone ? lerp(0.76, 0.95, over) : lerp(0.24, 0.8, over), my = phone ? lerp(clamp(Math.max((s.pad.sky || H * 0.42) - 14 - planetR, (s.pad.skyTop || 0) + 10 + planetR) / H, 0.14, 0.6), 0.115, over) : lerp(0.2, 0.3, over);   // on a phone: just above the raise's cards, and if the words leave no room there, behind the cards rather than behind the words
    /* where it stands once the view is down at the pad (see PLANET_AT); on a phone, through the narrow frame, closer in beside the rocket, and lower */
    const pAz = phone ? PLANET_PHONE[0] * DEG : lerp(atFar.az, atNear.az, L), pEl = phone ? PLANET_PHONE[1] * DEG : lerp(atFar.el, atNear.el, L);
    const ax = (mx * 2 - 1) * camera.aspect * TANH, ay = (1 - my * 2) * TANH;
    const pitch = Math.asin(clamp(Math.sin(PLANET_UP) * Math.sqrt(ax * ax + ay * ay + 1) / Math.sqrt(1 + ay * ay), -1, 1)) - Math.atan(ay), yaw = pAz - Math.atan2(ax, Math.cos(pitch) - ay * Math.sin(pitch));
    /* at the pad */
    let pox = 0, poy = 0, room = 0;
    if (phone) {   /* the rocket (47 m and its mount) is fitted to the room the page gives it: under the closing words, then above the controls */
      const k = smooth(clamp((lo.pe - 0.62) / 0.14)), r0 = lerp(s.pad.a0, s.pad.b0, k), r1 = lerp(s.pad.a1, s.pad.b1, k), rh = Math.max(120, r1 - r0), d = Math.max(150, 58 * H / (2 * TANH * rh));
      cp.set(lerp(-22, -10, L), 6, d); ct.set(0, 24, 0); poy = (r0 + r1) / 2 - H / 2; room = r0; }
    else { cp.lerpVectors(CAM_FAR[0], CAM_NEAR[0], L); ct.lerpVectors(CAM_FAR[1], CAM_NEAR[1], L); pox = W * 0.15; }
    /* coming down: where the camera stands and which way it faces are eased separately, so the turn down to the complex is even
       and the planet, sinking at the same rate, keeps its place in the frame */
    tv.subVectors(ct, cp); const far = tv.length(), padPitch = Math.asin(tv.y / far), padYaw = Math.atan2(tv.x, -tv.z);
    cp.lerpVectors(skyAt, cp, g); dirOf(lerp(yaw, padYaw, g), lerp(pitch, padPitch, g), ct).multiplyScalar(lerp(600, far, g)).add(cp); pox *= g; poy *= g;
    /* the burn */
    if (T >= 0) {
      T += dt; thrust = clamp(T / 0.7) * (0.85 + 0.15 * Math.sin(time * 47)); const tt = Math.max(0, T - 0.9); ry = 1.5 * tt * tt + 1.05 * tt * tt * tt;
      const follow = smooth(clamp((ry - 4) / 30)); ct.y += ry * 0.86 * follow; cp.y += ry * 0.2 * follow; cp.z += ry * 0.34 * follow;
      shake = thrust * (1 - clamp(ry / 240)) * 0.35;
      const rate = (small ? 90 : 210) * thrust * (1 - clamp(ry / 120)); let n = Math.floor(rate * dt + rnd());
      while (n-- > 0) { const a = rnd() * Math.PI * 2, r = 0.5 + rnd() * 2.5, out = 9 + rnd() * 26; emit(Math.cos(a) * r, 1 + rnd() * 2 + Math.min(ry, 10) * 0.2, Math.sin(a) * r, Math.cos(a) * out, 1 + rnd() * 5, Math.sin(a) * out * (0.8 + 0.5 * rnd()), 3.5 + rnd() * 3.5, 4 + rnd() * 4, 26 + rnd() * 34, 0.34 + rnd() * 0.26); }
      if (ry > 2) { let k = Math.floor((small ? 22 : 46) * dt + rnd()); while (k-- > 0) emit((rnd() - 0.5) * 3, rocket.position.y - 4 - rnd() * 16, (rnd() - 0.5) * 3, (rnd() - 0.5) * 4, -22 - rnd() * 16, (rnd() - 0.5) * 4, 1.6 + rnd() * 1.4, 4, 16 + rnd() * 10, 0.42); }
      if (T > 5.6 && done) { const d = done; done = null; d(); }
    } else ry = 0;
    /* the camera */
    const k = first ? 1 : 1 - Math.exp(-dt * (T >= 0 ? 3.2 : 5)); pos.lerp(cp, k); tgt.lerp(ct, k);
    camera.position.copy(pos); if (shake > 0) camera.position.add(tv.set((rnd() - 0.5) * shake, (rnd() - 0.5) * shake, 0)); camera.up.set(0, 1, 0); camera.lookAt(tgt);
    if (pox || poy) camera.setViewOffset(W, H, -pox, -poy, W, H); else camera.clearViewOffset(); camera.updateMatrixWorld();
    /* the sky goes with the camera. The planet rides high while the camera looks up and has sunk to its place over the pad
       by the time the view is down; the stars turn with it. It is so far off that it keeps its distance from the camera
       wherever the camera goes. Through a phone's narrow frame it never rises into the words over the room the page gives
       the rocket: if its top would, it is held down to the top of that room */
    const el = lerp(PLANET_UP, pEl, g); dirOf(pAz, el, md);
    if (phone && g > 0.5) { toPx(tv.copy(camera.position).add(md)); const push = room - (px.y - planetR); if (push > 0) dirOf(pAz, el - Math.atan(push * 2 * TANH / H) * span(g, 0.5, 1), md); }
    planet.position.copy(camera.position).addScaledVector(md, PLANET_D); planet.lookAt(camera.position); planetLight.position.copy(md);
    sky.position.copy(camera.position); stars.position.copy(camera.position); stars.quaternion.setFromUnitVectors(dirOf(pAz, pEl, tv), md);
    milky.position.copy(camera.position); milky.quaternion.copy(stars.quaternion).multiply(mwBase);
    skyU.dusk.value = dusk; skyU.time.value = time; skyU.planetDir.value.copy(md); skyU.cloudK.value = lerp(0.85, 0.7, g);
    stars.material.uniforms.time.value = time; stars.material.uniforms.k.value = 1 - dusk * 0.75; stars.material.uniforms.low.value = lerp(0.42, 0.035, g);
    mwU.k.value = (1 - dusk) * lerp(0.05, 0.12, g);                       // the Milky Way: only once it is dark, and quieter behind Beyond's words
    /* the planet turns, once in PLANET_TURN seconds; its light comes from PLANET_SUN, as the viewer sees it */
    planetW.update(dt, time); planetW.spin.rotation.y = (-90 - PLANET_LON) * DEG + time * Math.PI * 2 / PLANET_TURN;
    pRight.crossVectors(md, Y_UP).normalize(); pUp.crossVectors(pRight, md);
    planetSun.copy(md).multiplyScalar(-PLANET_SUN[2]).addScaledVector(pRight, PLANET_SUN[0]).addScaledVector(pUp, PLANET_SUN[1]).normalize().multiplyScalar(1e6).add(planet.position);
    /* the searchlights sweep; they and the far lights come up with the hills */
    const lowK = span(g, 0.2, 0.9);
    searches.forEach(b => { const u = b.userData; b.quaternion.setFromUnitVectors(Y_UP, dirOf(u.az + 0.26 * Math.sin(time * 0.083 + u.ph), u.el + 0.07 * Math.sin(time * 0.061 + u.ph * 1.7), tv)); b.material.uniforms.k.value = 0.032 * lowK; b.visible = lowK > 0.002; });
    farLights.material.uniforms.time.value = time; farLights.material.uniforms.k.value = lowK;
    banks.forEach(b => { b.position.x += b.userData.v * dt; b.material.opacity = b.userData.o * lowK; });
    /* birds: a few going over every minute or so, out across the pad and away toward the hills */
    const bt = (time % 64) / 46; birds.visible = bt < 1 && lowK > 0.01;
    if (birds.visible) { const c = tv.copy(B0).lerp(B1, bt), up = Y_UP;
      flock.forEach((b, i) => { const o = pv.copy(c).addScaledVector(bDir, b.o.x).addScaledVector(up, b.o.y + Math.sin(time * 0.7 + b.ph) * 0.6).addScaledVector(bSide, b.o.z), f = Math.sin(time * b.f * 6.283 + b.ph), span2 = 1.2, j = i * 18;
        const lift = f * 0.55, x0 = o.x, y0 = o.y, z0 = o.z, nx = bDir.x * 0.35, nz = bDir.z * 0.35;
        for (const [k, s] of [[0, 1], [9, -1]]) { birdPos[j + k] = x0 + nx; birdPos[j + k + 1] = y0; birdPos[j + k + 2] = z0 + nz; birdPos[j + k + 3] = x0 - nx; birdPos[j + k + 4] = y0; birdPos[j + k + 5] = z0 - nz;
          birdPos[j + k + 6] = x0 + bSide.x * span2 * s - bDir.x * 0.25; birdPos[j + k + 7] = y0 + lift; birdPos[j + k + 8] = z0 + bSide.z * span2 * s - bDir.z * 0.25; } });
      birdGeo.attributes.position.needsUpdate = true; }
    /* the arrival: down out of the top of the screen on its engines, slowing all the way, a touch on the pad, a settle.
       It follows the scroll, so it hovers where the reader stops and climbs away again if they go back up. */
    let hgt = 0, lean = 0;
    if (T < 0) {
      if (a < DOWN) {   /* the height at which the flame is just clear of the top of the screen, from where the camera stands now */
        let y0 = 10, y1 = 700; for (let i = 0; i < 12; i++) { const ym = (y0 + y1) / 2; pv.set(0, ym - 15, 0).project(camera); if (pv.y > 1.05) y1 = ym; else y0 = ym; }
        const u = 1 - a / DOWN; hgt = y1 * u * u + (a > 0 ? Math.sin(time * 1.3) * 0.45 * u : 0); lean = Math.sin(time * 0.9) * 0.02 * u;
      } else { const u = (a - DOWN) / (1 - DOWN); hgt = 0.45 * (1 - u) * (1 - u) * Math.abs(Math.sin(u * Math.PI * 2)); }
      thrust = a > 0 ? (a < DOWN ? 1 : 1 - span(a, DOWN, DOWN + 0.07)) * (0.88 + 0.12 * Math.sin(time * 43)) : 0;
      const near = clamp(1 - hgt / 30); shake = thrust * near * 0.12;
      if (thrust > 0.01) {   /* dust off the pad as it nears, and the exhaust itself trailing under the engines */
        let n = Math.floor((small ? 60 : 140) * near * near * thrust * dt + rnd() * 0.999);
        while (n-- > 0) { const an = rnd() * Math.PI * 2, r = 1 + rnd() * 3, o = 9 + rnd() * 22; emit(Math.cos(an) * r, 0.8 + rnd() * 1.6, Math.sin(an) * r, Math.cos(an) * o, 0.4 + rnd() * 3, Math.sin(an) * o * (0.8 + 0.5 * rnd()), 2.4 + rnd() * 2.8, 3 + rnd() * 3, 16 + rnd() * 22, 0.2 + rnd() * 0.2); }
        let m = Math.floor((small ? 12 : 26) * thrust * dt + rnd() * 0.999); while (m-- > 0) emit((rnd() - 0.5) * 3, 2.2 + hgt - 7 - rnd() * 9, (rnd() - 0.5) * 3, (rnd() - 0.5) * 3, -13 - rnd() * 9, (rnd() - 0.5) * 3, 0.8 + rnd() * 0.8, 3, 8 + rnd() * 6, 0.28);
      }
      const down = a >= DOWN;   /* the touch: a ring of dust and steam rolls out across the apron */
      if (down && !wasDown && !first) for (let i = 0; i < (small ? 34 : 70); i++) { const an = rnd() * Math.PI * 2, o = 12 + rnd() * 26; emit(Math.cos(an) * 2.5, 0.8 + rnd() * 1.4, Math.sin(an) * 2.5, Math.cos(an) * o, 0.3 + rnd() * 2.4, Math.sin(an) * o, 3 + rnd() * 3.4, 4 + rnd() * 3, 22 + rnd() * 26, 0.22 + rnd() * 0.2); }
      wasDown = down;
      if (a >= 1) { vent += dt; if (vent > 0.16) { vent = 0; emit(-1.9 + rnd() * 0.4, 6 + rnd() * 20, 1.4, -1.5 - rnd() * 1.5, 0.3 + rnd() * 0.6, 0.4 + rnd(), 2.6 + rnd() * 1.5, 0.8, 5 + rnd() * 3, 0.1); } }
    }
    first = false;
    rocket.position.y = 2.2 + ry + hgt; rocket.rotation.z = lean; rocket.visible = T >= 0 || a > 0;
    /* the flames: longer the harder it burns, longer still on the climb, flickering; the mount stops them while it is low */
    const lit2 = thrust > 0.01, flick = 0.94 + 0.04 * Math.sin(time * 37) + 0.02 * Math.sin(time * 23), floor = (rocket.position.y + EXIT - 2.2) / Math.max(0.5, Math.cos(lean));
    plumes.forEach(p => { p.visible = lit2; if (!lit2) return; const u = p.material.uniforms; u.time.value = time; u.power.value = thrust * 2.4; u.zMax.value = floor;
      u.L.value = Math.min(p.userData.LMAX - 0.05, p.userData.L0 * (0.55 + thrust * 0.6) * (T >= 0 ? 1.25 : 1) * flick); });
    glowIn.color.setRGB(1.5, 0.5, 1.0).multiplyScalar(thrust * (0.92 + 0.08 * Math.sin(time * 53))); glowThroat.color.copy(glowIn.color).multiplyScalar(2.2); glows.forEach(m => { m.visible = lit2; });
    burn.material.opacity = thrust * 0.6; burn.visible = thrust > 0.01; burn.scale.setScalar(15 + 2.5 * Math.sin(time * 37));
    fire.intensity = thrust * (T >= 0 ? 420 : 300); fire.position.set(0, T >= 0 ? 3 + Math.min(ry, 40) : Math.max(3, hgt - 2), 6);
    const clear = T >= 0 ? T >= 0.15 : a < DOWN + 0.05;                                  // the service arms stand clear while the rocket is in the air
    arms.forEach((a, i) => { a.rotation.y += ((clear ? -1.2 : 0) - a.rotation.y) * (1 - Math.exp(-dt * 2.2)); a.position.x = 5.2 - Math.sin(-a.rotation.y) * 1.2; });
    beacons.forEach((b, i) => { b.visible = (time * 0.9 + i * 0.33) % 1 < 0.55; beaconGlow[i].visible = b.visible; });
    poleGlow.forEach((p, i) => { const u = (time * 0.5 + i * 0.29) % 1; p.material.opacity = smooth(u / 0.1) * (1 - smooth((u - 0.35) / 0.2)); });
    /* smoke: spreads along the ground, slows, lifts, thins */
    for (let i = 0; i < N; i++) { const p = parts[i]; if (p.life <= 0) { sAlpha[i] = 0; continue; } p.life -= dt; const u = 1 - p.life / p.max, j = i * 3;
      p.v.x *= 1 - 1.3 * dt; p.v.z *= 1 - 1.3 * dt; p.v.y += (u > 0.12 ? 2.6 : 0) * dt * (p.v.y < 0 ? 0 : 1); if (sp[j + 1] < 0.8 && p.v.y < 0) { p.v.y = 0.4; const a = rnd() * 6.28; p.v.x += Math.cos(a) * 14; p.v.z += Math.sin(a) * 14; }
      sp[j] += p.v.x * dt; sp[j + 1] += p.v.y * dt; sp[j + 2] += p.v.z * dt; sSize[i] = lerp(p.s0, p.s1, Math.sqrt(u)); sAlpha[i] = p.a * Math.min(1, u * 9) * (1 - u) * (1 - u); sHeat[i] = Math.max(0, 1 - u * 3.2) * (p.a > 0.2 ? 1 : 0); }
    sGeo.attributes.position.needsUpdate = sGeo.attributes.aSize.needsUpdate = sGeo.attributes.aAlpha.needsUpdate = sGeo.attributes.aHeat.needsUpdate = true;
    /* the ground mist drifts, and takes the colour of the exhaust as the rocket nears it */
    const lit = T >= 0 ? 0 : thrust * clamp(1 - hgt / 110);
    mist.forEach(m => { m.position.x += m.userData.v * dt; if (m.position.x > 190) m.position.x = -190; const nr = lit * clamp(1 - Math.hypot(m.position.x, m.position.z - 20) / 170); m.material.opacity = m.userData.o * (1 + nr * 3.2); m.material.color.copy(mistCold).lerp(mistWarm, nr); });
    /* where things are on the screen */
    toPx(tv.set(0, rocket.position.y - 1.5, 0)); const bx = px.x, by = px.y; toPx(tv.set(0, rocket.position.y + TIP, 0));
    out.x = (bx + px.x) / 2; out.base = by; out.top = px.y; out.y = (by + px.y) / 2; out.h = Math.abs(by - px.y); out.k = a; out.onPad = T < 0 && a >= 1; out.down = g; out.dusk = dusk; out.vis = rocket.visible;
    if (g < 0.5) { out.y = -out.h; out.top = -out.h * 1.5; out.base = -out.h * 0.5; }           // the camera is still up in the sky: the rocket is somewhere above the frame
    toPx(planet.position); out.planetX = px.x; out.planetY = px.y;
  }
  return { scene, camera, update, resize, out,
    launch() { return new Promise(res => { T = 0; done = res; }); },
    reset() { T = -1; ry = 0; thrust = 0; done = null; for (const p of parts) p.life = 0; arms.forEach(a => { a.rotation.y = -1.2; }); first = true; },
    snap() { first = true; },
    setDpr(v) { stars.material.uniforms.pr.value = v; farLights.material.uniforms.pr.value = v; smokeMat.uniforms.px.value = H * v / (2 * TANH); },
    warm() { [...plumes, ...glows, burn, rocket, planet, birds, ...searches].forEach(o => { o.visible = true; }); renderer.compile(scene, camera); } };
}

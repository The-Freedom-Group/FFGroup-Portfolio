/* The launch pad at night: the rocket on its mount beside the service tower, flood-lit, mist lying on the ground and in
   the valleys, the moon up, and low over the hills on the far side the group's own world, the pink planet the story's
   rocket set out from. Units are metres.
   The night is built as a photograph of it would show it: a sky graded from a deep zenith down to a faint warm glow on the
   horizon, the Milky Way across it (the real one, from the star map the opening uses) and stars of every size and colour,
   thin high cloud catching the moon; three ranges of hills, each further off and further lost in the haze, with a few
   lights of the towns along them and a red beacon on a mast; the tree line in front; searchlights sweeping slowly up
   from beyond the pad; the floodlights pooling on the ground, which is damp enough to shine; a few birds going over.
   The same evening stands behind the two parts before it. Through the raise the camera looks up into a dusk sky (the
   cloud of the climb is drawn over it); as the raise ends the dusk goes out of it and the moon crosses to its night
   place, and that sky is what Beyond sits under. As Beyond ends the camera comes down out of the sky to the complex
   (the planet, the searchlights and the hills come up into the frame as it does), and as the page scrolls on the rocket
   comes down too, under its own burn, and settles on the pad. On "Press for liftoff" the engines light, the pad fills
   with smoke and the rocket climbs out of the top of the frame. */
import * as THREE from 'three';
import { mapTex, softDisc } from './planets.js';
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
/* the moon: where it stands over the pad, and how high it rides earlier in the evening, while the camera is looking up */
const MOON = V(1500, 1380, -3400), MOON_R = MOON.length(), MOON_AZ = Math.atan2(MOON.x, -MOON.z), MOON_EL = Math.asin(MOON.y / MOON_R), MOON_UP = 42 * DEG, MOON_SIZE = 150;
/* the planet: once the view has closed on the rocket it stands at this place on the screen (fractions of its width and
   height: low on the far side of the rocket from the words, its foot behind the far hills), this large across; on a
   phone, in the narrow frame beside the rocket, smaller: there it is held this far round from the way the camera faces
   the pad (degrees right, and up), as the camera turns a little while it closes in and would otherwise bring the rocket
   down over it. Where the camera stands when it is placed so, on each. */
const PLANET_AT = [0.872, 0.655], PLANET_ANG = 4.3 * DEG, PLANET_PHONE = [5.7, 5.7], PLANET_ANG_PHONE = 2.1 * DEG, PLANET_D = 4700;
const CAM_DESK = [V(-22, 4.2, 82), V(3, 26.5, 0)], CAM_PHONE = V(-10, 6, 150);
const PLANET_LON = 8;                                            // the longitude it turns to the viewer: Europe and Africa, home at the top
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
const SKY_FS = GLSL_NOISE + SKY_COL + `uniform float time, cloudK; uniform vec3 moonDir; varying vec3 vDir;
void main(){ vec3 d = normalize(vDir); vec3 c = skyCol(d); float mu = max(dot(d, moonDir), 0.0);
  c += vec3(0.014, 0.016, 0.024) * pow(mu, 14.0) * (1.0 - 0.6 * dusk);                          // the air round the moon, lit by it
  if (d.y > 0.03 && cloudK > 0.002) {   /* thin high cloud on a sheet overhead, drawn out in streaks, catching the moon (never in front of it) */
    vec2 q = d.xz / (d.y + 0.12); q = vec2(q.x * 0.82 + q.y * 0.57, -q.x * 0.57 + q.y * 0.82);
    vec3 p = vec3(q.x * 0.55 + time * 0.004, q.y * 2.6, 0.5);
    #ifdef LOW
    float n = fbm3(p) * 1.07;
    #else
    float n = fbm(p);
    #endif
    float cl = smoothstep(0.53, 0.8, n) * smoothstep(0.03, 0.22, d.y) * (1.0 - smoothstep(0.9975, 0.9995, mu)) * cloudK;
    vec3 lit = mix(vec3(0.026, 0.029, 0.04), vec3(0.16, 0.08, 0.12), dusk) * (0.5 + 2.6 * pow(mu, 8.0));
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
const BEAM_FS = `uniform vec3 colour; uniform float k; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.4); float along = mix(0.16, 1.0, vUv.y * vUv.y); gl_FragColor = vec4(colour * k * f * along, 1.0); }`;
/* a searchlight's beam: brightest at the lamp, where the air is thickest, thinning away up the sky */
const SEARCH_FS = `uniform vec3 colour; uniform float k; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); gl_FragColor = vec4(colour * k * f * pow(vUv.y, 2.6), 1.0); }`;
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

/* the planet is drawn as the logo draws the globe (w-globe.js): a hot pink sea under white land, cut from the water map.
   It is designed in the colours the screen should show and worked back through the film finish (post.js), so that the
   pink lands as the brand's pink; the inverse of the finish's curve and matrices, as there */
const M_IN = new THREE.Matrix3().set(0.59719, 0.35458, 0.04823, 0.07600, 0.90834, 0.01566, 0.02840, 0.13383, 0.83777);
const M_OUT = new THREE.Matrix3().set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);
const glInv = m => 'mat3(' + m.clone().invert().elements.map(v => v.toFixed(7)).join(', ') + ')';
const UNGRADE = `
const mat3 IN_INV = ${glInv(M_IN)}; const mat3 OUT_INV = ${glInv(M_OUT)};
vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 curveInv(vec3 y){ y = clamp(y, 0.0, 0.985); vec3 A = 1.0 - y * 0.983729; vec3 B = 0.0245786 - y * 0.4329510; vec3 C = -(0.000090537 + y * 0.238081); return (-B + sqrt(B * B - 4.0 * A * C)) / (2.0 * A); }
vec3 ungrade(vec3 c){ return max(IN_INV * curveInv(OUT_INV * toLin(clamp(c, 0.0, 1.0))), 0.0) * 0.6; }`;
const PLANET_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const PLANET_FS = `varying vec2 vUv; varying vec3 vN; varying vec3 vW; uniform sampler2D water; uniform vec3 sun; uniform float k; uniform vec3 haze;` + UNGRADE + `
void main(){
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float edge = 1.0 - clamp(dot(N, V), 0.0, 1.0);
  float wv = texture2D(water, vUv).r, aa = clamp(fwidth(wv) * 0.8, 0.02, 0.5), land = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, wv);
  float nl = dot(N, sun), day = smoothstep(-0.1, 0.3, nl), lit = clamp(nl, 0.0, 1.0);
  /* by day: the sea from a deep shade to the brand's pink where the light is full on it, the land white; deeper toward the
     limb. A night photograph's exposure: bright, but nothing burnt out */
  vec3 sea = mix(vec3(0.34, 0.015, 0.17), vec3(0.9, 0.12, 0.47), smoothstep(0.0, 0.75, lit));
  vec3 ground = mix(vec3(0.5, 0.4, 0.46), vec3(0.88, 0.83, 0.86), smoothstep(0.0, 0.8, lit));
  vec3 col = mix(sea, ground, land) * (1.0 - 0.3 * pow(edge, 1.8));
  col += vec3(1.0, 0.8, 0.9) * pow(max(dot(reflect(-sun, N), V), 0.0), 40.0) * (1.0 - land) * 0.1;    // the sun on its sea
  col = mix(mix(vec3(0.022, 0.003, 0.013), vec3(0.035, 0.022, 0.032), land), col, day);               // the night side
  col += vec3(1.0, 0.36, 0.66) * pow(edge, 3.0) * smoothstep(-0.25, 0.35, nl) * 0.26;                  // its air, lit on the day side,
  col += vec3(1.0, 0.62, 0.84) * pow(edge, 9.0) * smoothstep(-0.1, 0.45, nl) * 0.55;                   // and the thin bright line of it on the limb
  /* low in our own sky it is seen through more air: dimmer, warmer, a little lost in the haze toward its foot */
  float ext = 1.0 - smoothstep(0.02, 0.2, normalize(vW - cameraPosition).y);
  col = mix(col, col * vec3(0.92, 0.7, 0.8) * 0.72 + haze, ext * 0.6);
  gl_FragColor = vec4(ungrade(col), k);
}`;
const SMOKE_VS = `attribute float aSize; attribute float aAlpha; attribute float aHeat; uniform float px; varying float vA; varying float vH;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(900.0, aSize * px / max(1.0, -mv.z)); vA = aAlpha; vH = aHeat; gl_Position = projectionMatrix * mv; }`;
const SMOKE_FS = `uniform sampler2D map; varying float vA; varying float vH;
void main(){ float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.004) discard; vec3 cold = vec3(0.27, 0.26, 0.3), warm = vec3(0.95, 0.46, 0.62), hot = vec3(2.3, 1.3, 1.6);
  vec3 c = mix(cold, warm, smoothstep(0.0, 0.6, vH)); c = mix(c, hot, smoothstep(0.6, 1.0, vH)); gl_FragColor = vec4(c, a); }`;

export function createPad({ renderer, small, dpr, spec }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020308); scene.fog = new THREE.FogExp2(0x24182a, 0.0017);   // the haze: the colour the near hills' foot is lost in
  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.5, 12000); scene.add(camera);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o));
  const porcelain = M(0xf0ece4, { roughness: 0.42 }), pink = M(0xff2d8d, { roughness: 0.4, emissive: 0x4a0a26 }), carbon = M(0x17181c, { roughness: 0.5, metalness: 0.5 }), steel = M(0x2a2d33, { roughness: 0.7, metalness: 0.6 });
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const cyl = (rt, rb, h, mat, x, y, z, parent, seg = 40, open = false) => add(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat, x, y, z, parent);

  const puff = softDisc(128, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.55)'], [0.7, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']]);
  const glowTex = softDisc(64, [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,255,255,.32)'], [0.55, 'rgba(255,255,255,.06)'], [1, 'rgba(255,255,255,0)']]);
  const glowAt = (parent, x, y, z, size, colour) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: colour, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); s.position.set(x, y, z); s.scale.setScalar(size); parent.add(s); return s; };

  /* ───────── the sky ───────── */
  const skyU = { dusk: { value: 0 }, time: { value: 0 }, cloudK: { value: 0.8 }, moonDir: { value: V(0, 0.3, -1).normalize() } };
  const sky = add(new THREE.SphereGeometry(6000, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, defines: small ? { LOW: 1 } : {}, side: THREE.BackSide, depthWrite: false, fog: false })); sky.renderOrder = -5;
  /* the Milky Way, and the stars, which turn with the moon as it crosses the sky through the evening (see update) */
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
  const moon = add(new THREE.SphereGeometry(MOON_SIZE, 48, 24), new THREE.MeshBasicMaterial({ map: mapTex('moon'), color: 0xcfcac2, fog: false }), 1500, 1380, -3400); moon.rotation.y = 4.4;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(256, [[0, 'rgba(255,240,230,.28)'], [0.16, 'rgba(255,225,228,.07)'], [0.5, 'rgba(255,220,225,.02)'], [1, 'rgba(255,220,225,0)']]), depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); halo.position.copy(moon.position); halo.scale.setScalar(1300); scene.add(halo);

  /* the planet: the group's own world, low over the far hills. It stands still in the world (the hills and the tree line
     go across its foot as the camera moves), turns slowly, and takes its light from the moon's side of the sky */
  const planet = new THREE.Group(), planetTip = new THREE.Group(), planetSpin = new THREE.Group(); planetTip.rotation.x = 0.32; planet.add(planetTip); planetTip.add(planetSpin); scene.add(planet);
  const planetU = { water: { value: mapTex('earth-spec', { colour: false }) }, sun: { value: V(0, 0, 1) }, k: { value: 0 }, haze: { value: V(0.07, 0.03, 0.055) } };
  const planetBall = new THREE.Mesh(new THREE.SphereGeometry(1, small ? 64 : 96, small ? 32 : 48), new THREE.ShaderMaterial({ uniforms: planetU, vertexShader: PLANET_VS, fragmentShader: PLANET_FS, transparent: true }));
  planetBall.renderOrder = -2; planetSpin.add(planetBall);
  const planetGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(256, [[0, 'rgba(255,80,165,.22)'], [0.24, 'rgba(255,64,155,.16)'], [0.36, 'rgba(255,50,145,.06)'], [0.62, 'rgba(255,45,141,.015)'], [1, 'rgba(255,45,141,0)']]), depthWrite: false, fog: false, transparent: true, blending: THREE.AdditiveBlending }));
  planetGlow.renderOrder = -2; planet.add(planetGlow);
  const pdDesk = V(), pdPhone = V(), sunDir = V(), aimCam = new THREE.PerspectiveCamera(FOV, 1, 0.5, 12000);
  /* where the planet has to be for it to stand at PLANET_AT once the view has closed on the rocket, at this size of screen */
  function placePlanet(w, h) { aimCam.aspect = w / h; aimCam.position.copy(CAM_DESK[0]); aimCam.lookAt(CAM_DESK[1]); aimCam.setViewOffset(w, h, -w * 0.15, 0, w, h); aimCam.updateProjectionMatrix(); aimCam.updateMatrixWorld();
    pdDesk.set(PLANET_AT[0] * 2 - 1, 1 - PLANET_AT[1] * 2, 0.5).unproject(aimCam).sub(aimCam.position).normalize(); }
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
  scene.add(new THREE.HemisphereLight(0x2c3552, 0x060607, 0.42)); const moonLight = new THREE.DirectionalLight(0xbfd0ff, 0.28); moonLight.position.set(1500, 1380, -3400).normalize(); scene.add(moonLight);

  /* the rocket */
  const rocket = new THREE.Group(); rocket.position.y = 2.2; scene.add(rocket);
  const skin = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const x = c.getContext('2d'); x.fillStyle = '#f0ece4'; x.fillRect(0, 0, 512, 1024);
    for (let i = 0; i < 1600; i++) { x.fillStyle = 'rgba(40,38,34,' + (rnd() * 0.035) + ')'; x.fillRect(rnd() * 512, rnd() * 1024, 2 + rnd() * 30, 1 + rnd() * 3); }
    x.strokeStyle = 'rgba(30,28,26,.3)'; x.lineWidth = 2; for (let y = 64; y < 1024; y += 128) { x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke(); }
    x.strokeStyle = 'rgba(30,28,26,.16)'; x.lineWidth = 1.5; for (let y = 0; y < 1024; y += 128) for (let k = 0; k < 4; k++) { const px = ((k + (y / 128 % 2) * 0.5) / 4) * 512; x.beginPath(); x.moveTo(px, y + 64); x.lineTo(px, y + 192); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
  porcelain.map = skin; porcelain.color.set(0xffffff);
  const lathe = (pts, mat) => add(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 56), mat, 0, 0, 0, rocket);
  cyl(1.86, 1.98, 3, carbon, 0, 1.5, 0, rocket); cyl(1.86, 1.86, 31, porcelain, 0, 18.5, 0, rocket, 56); cyl(1.9, 1.9, 1.3, pink, 0, 23, 0, rocket, 56); cyl(1.9, 1.9, 0.35, carbon, 0, 31.4, 0, rocket, 56);
  lathe([[1.86, 34], [1.8, 36], [1.6, 38.4], [1.28, 40.4]], porcelain); lathe([[1.28, 40.4], [0.92, 42.2], [0.5, 43.7], [0.16, 44.5], [0, 44.7]], pink);
  [[0, 0.95], [-0.82, -0.47], [0.82, -0.47]].forEach(([x, z]) => cyl(0.34, 0.72, 1.7, carbon, x, -0.7, z, rocket, 24, true));
  const boosters = [-1, 1].map(sx => { const g = new THREE.Group(); g.position.x = sx * 2.92; rocket.add(g);
    cyl(1.02, 1.1, 2.2, carbon, 0, 1.1, 0, g); cyl(1.02, 1.02, 18, porcelain, 0, 11.2, 0, g, 40); cyl(1.05, 1.05, 0.9, pink, 0, 15.5, 0, g, 40);
    add(new THREE.LatheGeometry([[1.02, 20.2], [0.86, 21.8], [0.5, 23.2], [0.12, 24], [0, 24.1]].map(p => new THREE.Vector2(p[0], p[1])), 40), pink, 0, 0, 0, g); cyl(0.3, 0.62, 1.5, carbon, 0, -0.6, 0, g, 20, true);
    box(1, 0.3, 0.3, steel, -sx * 0.95, 5, 0, g); box(1, 0.3, 0.3, steel, -sx * 0.95, 17, 0, g); return g; });
  /* the name down the side: drawn once the wordmark face has loaded */
  const decalMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const decal = add(new THREE.CylinderGeometry(1.875, 1.875, 13.5, 32, 1, true, -0.52, 1.04), decalMat, 0, 13.6, 0, rocket); decal.rotation.y = 0.35; decal.visible = false;
  const drawDecal = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 1792; const x = c.getContext('2d'); x.translate(128, 896); x.rotate(-Math.PI / 2); x.font = '400 150px Michroma, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#17181c'; x.fillText('FREEDOM', 0, 6);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; decalMat.map = t; decalMat.needsUpdate = true; decal.visible = true; };
  (document.fonts && document.fonts.load ? document.fonts.load('400 150px Michroma').then(drawDecal, drawDecal) : Promise.resolve().then(drawDecal));

  /* flame, smoke, mist */
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.25, 2.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), coreMat = flameMat.clone(); coreMat.color.setRGB(6, 5, 5.4);
  const flames = [[0, 0, 1.25], [-2.92, 0, 0.8], [2.92, 0, 0.8]].flatMap(([x, z, r]) => { const o = add(new THREE.ConeGeometry(r, 15, 24, 1, true), flameMat, x, -9, z, rocket); o.rotation.x = Math.PI; const i = add(new THREE.ConeGeometry(r * 0.5, 9, 16, 1, true), coreMat, x, -6, z, rocket); i.rotation.x = Math.PI; return [o, i]; });
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
     down from the sky to the pad (x is where the rocket will enter once this is 1). */
  const out = { x: 0, y: 0, h: 0, top: 0, base: 0, vis: false, onPad: false, k: 0, on: false, down: 0, moonX: 0, moonY: 0, dusk: 0 };
  const dirOf = (az, el, o) => o.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  const toPx = v => { pv.copy(v).project(camera); px.x = (pv.x * 0.5 + 0.5) * W; px.y = (-pv.y * 0.5 + 0.5) * H; return px; };
  function resize(w, h) { W = w; H = h; camera.aspect = w / h; camera.updateProjectionMatrix(); smokeMat.uniforms.px.value = h * (renderer.getPixelRatio ? renderer.getPixelRatio() : 1) / (2 * TANH); placePlanet(w, h); first = true; }
  function update(s, dt, time) {
    const phone = W < 900, lo = s.liftoff, e = s.raise.pe;
    const dusk = 1 - span(e, 0.83, 0.99);                                    // the evening: dusk through the raise, night as it ends
    const g = smooth(clamp((lo.x + 1) / 1.05));                              // how far the view has come down out of the sky to the complex
    const L = smooth(clamp((lo.pe - 0.04) / 0.74));                          // and how far it has closed in on the rocket
    const a = clamp((lo.pe - ARRIVE[0]) / (ARRIVE[1] - ARRIVE[0]));          // the rocket's arrival
    /* looking up: the camera stands well back from the complex, turned so the moon sits where the page leaves it room
       (beside the raise's heading; then, as night settles, it crosses to the open side of Beyond's) */
    const over = span(e, 0.9, 1.06), moonR = MOON_SIZE / MOON_R / TANH * H / 2;                     // moonR: the moon's radius on the screen
    const mx = phone ? lerp(0.76, 0.95, over) : lerp(0.24, 0.8, over), my = phone ? lerp(clamp(Math.max((s.pad.sky || H * 0.42) - 14 - moonR, (s.pad.skyTop || 0) + 10 + moonR) / H, 0.14, 0.6), 0.115, over) : lerp(0.2, 0.3, over);   // on a phone: just above the raise's cards, and if the words leave no room there, behind the cards rather than behind the words
    /* on a phone the pad is seen through a narrow frame, so there the moon stands closer in beside the rocket, and lower */
    const moonAz = phone ? 9.5 * DEG : MOON_AZ, moonEl = phone ? 18.5 * DEG : MOON_EL;
    const ax = (mx * 2 - 1) * camera.aspect * TANH, ay = (1 - my * 2) * TANH;
    const pitch = Math.asin(clamp(Math.sin(MOON_UP) * Math.sqrt(ax * ax + ay * ay + 1) / Math.sqrt(1 + ay * ay), -1, 1)) - Math.atan(ay), yaw = moonAz - Math.atan2(ax, Math.cos(pitch) - ay * Math.sin(pitch));
    /* at the pad */
    let pox = 0, poy = 0;
    if (phone) {   /* the rocket (47 m and its mount) is fitted to the room the page gives it: under the closing words, then above the controls */
      const k = smooth(clamp((lo.pe - 0.62) / 0.14)), r0 = lerp(s.pad.a0, s.pad.b0, k), r1 = lerp(s.pad.a1, s.pad.b1, k), rh = Math.max(120, r1 - r0), d = Math.max(150, 58 * H / (2 * TANH * rh));
      cp.set(lerp(-22, -10, L), 6, d); ct.set(0, 24, 0); poy = (r0 + r1) / 2 - H / 2; }
    else { cp.set(lerp(-70, -22, L), lerp(13, 4.2, L), lerp(236, 82, L)); ct.set(lerp(6, 3, L), lerp(31, 26.5, L), 0); pox = W * 0.15; }
    /* coming down: where the camera stands and which way it faces are eased separately, so the turn down to the complex is even
       and the moon, sinking at the same rate, keeps its place in the frame */
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
    /* the sky goes with the camera. The moon rides high while the camera looks up and has sunk to its place over the pad by
       the time the view is down; the stars turn with it */
    dirOf(moonAz, lerp(MOON_UP, moonEl, g), md); moon.position.copy(md).multiplyScalar(MOON_R).addScaledVector(camera.position, 1 - g); halo.position.copy(moon.position); moonLight.position.copy(md);
    sky.position.copy(camera.position); stars.position.copy(camera.position); stars.quaternion.setFromUnitVectors(dirOf(moonAz, moonEl, tv), md);
    milky.position.copy(camera.position); milky.quaternion.copy(stars.quaternion).multiply(mwBase);
    skyU.dusk.value = dusk; skyU.time.value = time; skyU.moonDir.value.copy(md); skyU.cloudK.value = lerp(0.85, 0.7, g);
    stars.material.uniforms.time.value = time; stars.material.uniforms.k.value = 1 - dusk * 0.75; stars.material.uniforms.low.value = lerp(0.42, 0.035, g);
    mwU.k.value = (1 - dusk) * lerp(0.05, 0.12, g);                       // the Milky Way: only once it is dark, and quieter behind Beyond's words
    /* the planet comes up into the frame with the hills as the view comes down; its light from the moon's side of the sky */
    if (phone) dirOf(padYaw + PLANET_PHONE[0] * DEG, PLANET_PHONE[1] * DEG, pdPhone);
    const pd = phone ? pdPhone : pdDesk, pk = span(g, 0.45, 0.9);
    planet.visible = pk > 0.002; planetU.k.value = pk; planetGlow.material.opacity = pk;
    if (planet.visible) {
      planet.position.copy(phone ? CAM_PHONE : CAM_DESK[0]).addScaledVector(pd, PLANET_D); planet.lookAt(camera.position);
      const R = PLANET_D * Math.tan(phone ? PLANET_ANG_PHONE : PLANET_ANG); planetBall.scale.setScalar(R); planetGlow.scale.setScalar(R * 5.6);
      planetSpin.rotation.y = (-90 - PLANET_LON) * DEG + time * 0.003;
      tv.copy(md).addScaledVector(pd, -md.dot(pd)).normalize(); planetU.sun.value.copy(pd).multiplyScalar(-0.62).addScaledVector(tv, 0.78).normalize(); }
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
    flames.forEach((f, i) => { f.material.opacity = (i % 2 ? 0.95 : 0.6) * thrust; f.visible = thrust > 0.01; const sy = (0.55 + thrust * 0.6) * (0.9 + 0.1 * Math.sin(time * 61 + i * 1.7)); f.scale.set(1, sy, 1); f.position.y = -(i % 2 ? 4.5 : 7.5) * sy - 0.8; });
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
    toPx(tv.set(0, rocket.position.y - 1.5, 0)); const bx = px.x, by = px.y; toPx(tv.set(0, rocket.position.y + 44.7, 0));
    out.x = (bx + px.x) / 2; out.base = by; out.top = px.y; out.y = (by + px.y) / 2; out.h = Math.abs(by - px.y); out.k = a; out.onPad = T < 0 && a >= 1; out.down = g; out.dusk = dusk; out.vis = rocket.visible;
    if (g < 0.5) { out.y = -out.h; out.top = -out.h * 1.5; out.base = -out.h * 0.5; }           // the camera is still up in the sky: the rocket is somewhere above the frame
    toPx(moon.position); out.moonX = px.x; out.moonY = px.y;
  }
  return { scene, camera, update, resize, out,
    launch() { return new Promise(res => { T = 0; done = res; }); },
    reset() { T = -1; ry = 0; thrust = 0; done = null; for (const p of parts) p.life = 0; arms.forEach(a => { a.rotation.y = -1.2; }); first = true; },
    snap() { first = true; },
    setDpr(v) { stars.material.uniforms.pr.value = v; farLights.material.uniforms.pr.value = v; smokeMat.uniforms.px.value = H * v / (2 * TANH); },
    warm() { flames.forEach(f => { f.visible = true; }); [burn, rocket, planet, birds, ...searches].forEach(o => { o.visible = true; }); renderer.compile(scene, camera); } };
}

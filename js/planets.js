/* The worlds: a pink Earth for the holding company, rock and gas worlds from real maps recoloured to the diagram's palette,
   relief, rings with shadows, atmospheres, the brand moons, the Milky Way and the stars. Maps: Solar System Scope / INOVE, CC BY 4.0. */
import * as THREE from 'three';
import { GLSL_NOISE, GLSL_PERTURB, PLANET_VS, OUT, rnd } from './util.js';

/* ───────────── maps ───────────── */
const SIZES = { 'earth-day': ['4k', '2k'], 'earth-night': ['4k', '2k'], 'earth-clouds': ['4k', '2k'], 'earth-spec': ['2k'], 'earth-normal': ['4k', '2k'],   /* as the group site has them */
  venus: ['4k', '2k'], mars: ['4k', '2k'], 'mars-normal': ['2k'], jupiter: ['4k', '2k'], saturn: ['4k', '2k'], 'saturn-ring': ['2k'],
  uranus: ['2k'], neptune: ['2k'], moon: ['2k'], 'moon-normal': ['2k'], milkyway: ['4k', '2k'], sun: ['2k'] };
export const maps = { quality: '4k', low: false, base: 'assets/maps/', manager: new THREE.LoadingManager(), cache: {}, loaded: 0, total: 0, onItem: null, onTexture: null };
const loader = new THREE.TextureLoader(maps.manager);
export function mapTex(name, { colour = true, anis = 8 } = {}) {
  const sizes = SIZES[name]; const size = sizes.includes(maps.quality) ? maps.quality : sizes[sizes.length - 1];
  const key = name + '-' + size; if (maps.cache[key]) return maps.cache[key];
  maps.total++;
  const done = tex => { maps.loaded++; if (tex && maps.onTexture) maps.onTexture(tex); if (maps.onItem) maps.onItem(name); };
  const t = loader.load(maps.base + key + '.webp', done, undefined, () => { done(); console.warn('map missing', key); });
  if (colour) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.anisotropy = anis;
  return maps.cache[key] = t;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t; }
function thinRingTex() {
  return canvasTex(1024, 4, (ctx, w, h) => { ctx.clearRect(0, 0, w, h);
    [[0.08, 0.02, 0.35], [0.2, 0.015, 0.25], [0.31, 0.012, 0.2], [0.44, 0.03, 0.4], [0.58, 0.02, 0.3], [0.72, 0.012, 0.22], [0.86, 0.045, 0.55], [0.96, 0.02, 0.3]].forEach(([x, wd, a]) => {
      ctx.fillStyle = 'rgba(214,232,240,' + a + ')'; ctx.fillRect(Math.round(x * w), 0, Math.max(1, Math.round(wd * w)), h); }); });
}
export function softDisc(size, stops) { return canvasTex(size, size, (ctx, w, h) => { const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); stops.forEach(s => g.addColorStop(s[0], s[1])); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }); }

/* ───────────── shaders ───────────── */
/* every world can be told to lose its colour and dim, or to brighten (the system does this as the story reaches a company) */
const LOOK = `uniform float sat; uniform float gain; vec3 look(vec3 c){ float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); return mix(vec3(l), c, sat) * gain; }`;
const HEAD = `varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vObj; uniform vec3 sunPos; uniform float time;` + LOOK + GLSL_NOISE + GLSL_PERTURB;
const RAMP = `uniform float useRamp; uniform vec3 rampA; uniform vec3 rampB;
vec3 recolour(vec3 alb){ if (useRamp < 0.5) return alb; float l = dot(alb, vec3(0.299, 0.587, 0.114)); l = smoothstep(0.06, 0.9, l); return mix(rampA, rampB, l); }`;
const HEX = `uniform float hex;
float hexDist(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x); }
float hexEdge(vec2 uv){ vec2 r = vec2(1.0, 1.7320508); vec2 h = r * 0.5; vec2 a = mod(uv, r) - h; vec2 b = mod(uv - h, r) - h; vec2 gv = dot(a, a) < dot(b, b) ? a : b; return 0.5 - hexDist(gv); }`;

const EARTH_FS = HEAD + `
uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D cloudMap; uniform sampler2D specMap; uniform sampler2D normalMap;
uniform float cloudOffset; uniform float normalScale; uniform float radius; uniform float pink; uniform float cloudK;
void main(){
  vec3 Ng = normalize(vN); vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(sunPos - vW);
  vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0; vec3 N = perturbN(Ng, mapN, vW, vUv, normalScale);
  float nl = dot(N, L); float nlg = dot(Ng, L);
  vec3 albedo = texture2D(dayMap, vUv).rgb;
  vec3 city = texture2D(nightMap, vUv).rgb;
  float water = texture2D(specMap, vUv).r;
  if (pink > 0.5) {
    float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
    /* the logo's globe: a hot magenta sea (the artwork's is #E722A2) under white land */
    vec3 sea = mix(vec3(0.52, 0.004, 0.215), vec3(0.37, 0.0, 0.14), smoothstep(0.0, 0.35, lum) * 0.7);
    vec3 land = vec3(1.0, 0.985, 0.97) * (0.86 + 0.3 * lum);
    albedo = mix(land, sea, smoothstep(0.3, 0.7, water)); city *= vec3(1.0, 0.75, 0.9) * 0.6;
  }
  float cl = texture2D(cloudMap, vec2(vUv.x + cloudOffset - 0.0015, vUv.y + 0.001)).r;
  float day = smoothstep(-0.08, 0.15, nlg);
  float shadow = 1.0 - cl * 0.5 * day * cloudK;
  float diffuse = max(mix(nlg, nl, 1.0 - water * 0.8), 0.0);
  vec3 col = albedo * (vec3(0.010, 0.016, 0.030) + diffuse * 1.5) * shadow;
  vec3 H = normalize(L + V); float glint = pow(max(dot(Ng, H), 0.0), 110.0) * water * max(nlg, 0.0) * 0.8;
  col += vec3(1.0, 0.85, 0.65) * glint * (pink > 0.5 ? 0.22 : 1.0);
  col += city * vec3(1.0, 0.72, 0.40) * 2.4 * (1.0 - smoothstep(-0.2, 0.12, nlg));
  float rim = pow(1.0 - max(dot(Ng, V), 0.0), 3.4);
  vec3 rimC = pink > 0.5 ? vec3(0.62, 0.05, 0.3) : vec3(0.06, 0.31, 0.65);
  col += rimC * rim * smoothstep(-0.45, 0.2, nlg) * 0.8;
  float sunset = exp(-abs(nlg) * 22.0) * rim; col += vec3(0.6, 0.3, 0.12) * sunset * 0.18;
  gl_FragColor = vec4(look(col), 1.0);` + OUT;

const CLOUD_FS = HEAD + `uniform sampler2D cloudMap; uniform float cloudOffset; uniform vec3 cloudTint; uniform float cloudK;
void main(){
  float c = texture2D(cloudMap, vec2(vUv.x + cloudOffset, vUv.y)).r;
  vec3 L = normalize(sunPos - vW); float nl = dot(normalize(vN), L); float d = max(nl, 0.0);
  vec3 col = vec3(0.012, 0.022, 0.040) + cloudTint * d * 1.6;
  col += vec3(0.7, 0.23, 0.06) * exp(-abs(nl) * 18.0) * 0.08;
  gl_FragColor = vec4(look(col), smoothstep(0.12, 0.85, c) * 0.93 * cloudK);` + OUT;

/* the atmosphere seen from outside: a shell well beyond the surface; along each line of sight, the air it passes through
   (densest at the surface, thinning exponentially with height), lit where the sun reaches it, scattered more toward the
   light (a forward lobe) and turning to the dusk colour at the terminator; over the disc itself, only a thin veil */
const SKY_FS = HEAD + `uniform vec3 cDay; uniform vec3 cDusk; uniform float strength; uniform vec3 centre; uniform float R; uniform float Ra; uniform float falloff;
void main(){
  vec3 rd = normalize(vW - cameraPosition); vec3 oc = cameraPosition - centre;
  float tc = -dot(oc, rd); vec3 P = cameraPosition + rd * max(tc, 0.0); float h = length(P - centre);
  float x = clamp((h - R) / (Ra - R), 0.0, 1.0);
  float dens = exp(-x * falloff) * (1.0 - smoothstep(0.7, 1.0, x));
  // over the disc the line of sight meets the ground: only the air in front of it counts, a thin veil thickest at the edge
  float b = dot(oc, rd); float c = dot(oc, oc) - R * R; float disc = b * b - c;
  if (disc > 0.0 && tc > 0.0) { float edge = 1.0 - clamp(sqrt(disc) / R, 0.0, 1.0); dens = mix(0.0, 0.9, pow(edge, 2.5)) * 0.9; }
  vec3 L = normalize(sunPos - centre); vec3 n = normalize(P - centre);
  float nl = dot(n, L); float lit = smoothstep(-0.32, 0.35, nl);
  float mu = dot(rd, L); float phase = 0.8 + 0.2 * mu * mu + 0.9 * pow(max(mu, 0.0), 6.0);
  vec3 col = mix(cDusk, cDay, smoothstep(-0.12, 0.28, nl));
  col += cDusk * exp(-abs(nl) * 9.0) * 0.6;                            // the warm band where day turns to night
  gl_FragColor = vec4(look(col * dens * lit * phase * strength * 1.25), 1.0);` + OUT;

const RING_SHADOW = `uniform float hasRing; uniform sampler2D ringMap; uniform vec3 ringN; uniform vec3 ringC; uniform float ringIn; uniform float ringOut;
float ringShadow(vec3 p, vec3 L){ if (hasRing < 0.5) return 1.0; float dn = dot(L, ringN); if (abs(dn) < 1e-4) return 1.0;
  float s = dot(ringC - p, ringN) / dn; if (s <= 0.0) return 1.0; vec3 h = p + L * s; float r = length(h - ringC);
  if (r < ringIn || r > ringOut) return 1.0; float a = texture2D(ringMap, vec2((r - ringIn) / (ringOut - ringIn), 0.5)).a; return 1.0 - a * 0.85; }`;

const GAS_FS = HEAD + RAMP + RING_SHADOW + `uniform sampler2D map; uniform float flow; uniform float bands; uniform float storm; uniform float limbDark; uniform float detail;
uniform vec3 tint; uniform float radius; uniform vec3 atmo; uniform float atmoAmt; uniform float expo;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(sunPos - vW); vec3 p = vObj / radius;
  float lat = (vUv.y - 0.5) * 3.14159;
  float band = sin(lat * 9.0 + 1.3) * 0.5 + 0.5;
  float u = vUv.x + time * flow * (0.4 + 0.6 * band) + (fbm3(p * 3.0 + vec3(0.0, time * 0.01, 0.0)) - 0.5) * 0.006;
  vec3 alb = recolour(texture2D(map, vec2(u, vUv.y)).rgb) * tint;
  alb *= 1.0 + bands * 0.10 * sin(lat * 15.0 + (fbm3(p * 4.0) - 0.5) * 6.0);
  alb *= 1.0 + bands * 0.14 * (fbm3(vec3(p.x * 2.5, p.y * 9.0, p.z * 2.5) + vec3(time * 0.012, 0.0, 0.0)) - 0.5);
  if (storm > 0.5) { vec2 d = vec2((fract(u - 0.3) - 0.5) * 1.4, (vUv.y - 0.36) * 2.4); float m = 1.0 - smoothstep(0.035, 0.11, length(d)); alb *= 1.0 - 0.42 * m; }
  #ifndef LOW
  alb *= 1.0 + detail * (fbm(p * 28.0 + vec3(time * 0.004)) - 0.5) * 0.25;
  #endif
  float nl = dot(N, L); float diff = smoothstep(-0.06, 0.45, nl);
  float mu = max(dot(N, V), 0.0); float limb = 1.0 - limbDark * pow(1.0 - mu, 1.5);
  float sh = ringShadow(vW, L);
  vec3 col = alb * (0.012 + diff * expo * sh) * limb;
  float rim = pow(1.0 - mu, 3.0) * smoothstep(-0.35, 0.3, nl); col += atmo * rim * atmoAmt;
  gl_FragColor = vec4(look(col), 1.0);` + OUT;

const ROCK_FS = HEAD + RAMP + HEX + `uniform sampler2D map; uniform sampler2D normalMap; uniform float normalScale; uniform float detail; uniform vec3 tint; uniform float radius; uniform vec3 atmo; uniform float atmoAmt;
void main(){
  vec3 Ng = normalize(vN); vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(sunPos - vW); vec3 p = vObj / radius;
  vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0; vec3 N = perturbN(Ng, mapN, vW, vUv, normalScale);
  vec3 alb = recolour(texture2D(map, vUv).rgb) * tint;
  #ifndef LOW
  alb *= 1.0 + detail * (fbm(p * 60.0) - 0.5) * 0.3;
  #endif
  if (hex > 0.5) { float e = hexEdge(vec2(vUv.x * 48.0, vUv.y * 24.0)); float line = smoothstep(0.07, 0.0, e) * (1.0 - pow(abs(vUv.y - 0.5) * 2.0, 5.0)); alb = mix(alb, vec3(0.75, 1.0, 0.88), line * 0.55); }
  float nl = dot(N, L); float nlg = dot(Ng, L);
  float diff = max(nl, 0.0) * smoothstep(-0.05, 0.12, nlg);
  float mu = max(dot(Ng, V), 0.0);
  vec3 col = alb * (0.010 + diff * 1.5);
  float rim = pow(1.0 - mu, 3.2) * smoothstep(-0.3, 0.3, nlg); col += atmo * rim * atmoAmt;
  float dusk = exp(-abs(nlg) * 14.0) * atmoAmt * 0.35; col += atmo * dusk * 0.5;
  gl_FragColor = vec4(look(col), 1.0);` + OUT;

const RING_FS = LOOK + `varying vec2 vUv; varying vec3 vN; varying vec3 vW; uniform sampler2D ringMap; uniform vec3 sunPos; uniform vec3 planetPos; uniform float planetR; uniform float tone;
void main(){
  vec4 tex = texture2D(ringMap, vec2(vUv.x, 0.5));
  vec3 L = normalize(sunPos - vW); float facing = dot(normalize(vN), L);
  float lit = 0.22 + 0.78 * abs(facing);
  vec3 oc = vW - planetPos; float b = dot(oc, L); float c = dot(oc, oc) - planetR * planetR; float sh = 1.0;
  if (b < 0.0) { float d = b * b - c; sh = 1.0 - smoothstep(-planetR * planetR * 0.06, planetR * planetR * 0.06, d) * 0.93; }
  gl_FragColor = vec4(look(tex.rgb * lit * sh * tone), tex.a);` + OUT;

const STAR_VS = `attribute float size; attribute float phase; attribute vec3 tint; uniform float time; uniform float pr; varying float vA; varying vec3 vT;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float tw = 0.72 + 0.28 * sin(time * (0.6 + phase * 2.0) + phase * 17.0); vA = tw; vT = tint;
  gl_PointSize = size * pr * tw; gl_Position = projectionMatrix * mv; }`;
const STAR_FS = `varying float vA; varying vec3 vT; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard; float a = pow(1.0 - r, 2.2); gl_FragColor = vec4(vT * (0.85 + 0.6 * a), a * vA); }`;

/* ───────────── builders ───────────── */
function sphere(R, seg) { return new THREE.SphereGeometry(R, seg, seg / 2); }
function shaderMat(fs, uniforms, extra = {}) { return new THREE.ShaderMaterial(Object.assign({ uniforms, vertexShader: PLANET_VS, fragmentShader: fs, defines: maps.low ? { LOW: 1 } : {} }, extra)); }
const u3 = v => ({ value: new THREE.Vector3(v[0], v[1], v[2]) });
function rampU(spec) { return { useRamp: { value: spec.ramp ? 1 : 0 }, rampA: u3(spec.ramp ? spec.ramp[0] : [0, 0, 0]), rampB: u3(spec.ramp ? spec.ramp[1] : [1, 1, 1]) }; }

function skyShell(R, a, sunPos, seg, look) {
  const Ra = R * (1 + Math.max(0.1, (a.shell - 1) * 4.5)); // the halo reaches well past the limb
  const m = shaderMat(SKY_FS, { sunPos: { value: sunPos }, time: { value: 0 }, sat: look.sat, gain: look.gain, cDay: u3(a.day), cDusk: u3(a.dusk), strength: { value: a.strength }, centre: { value: new THREE.Vector3() }, R: { value: R * 0.995 }, Ra: { value: Ra }, falloff: { value: 5.5 } },
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
  const mesh = new THREE.Mesh(sphere(Ra, seg), m); mesh.renderOrder = 2;
  mesh.onBeforeRender = () => { mesh.getWorldPosition(m.uniforms.centre.value); };
  return mesh;
}
function ringGeometry(inner, outer, segs = 256) {
  const g = new THREE.BufferGeometry(); const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) { const a = i / segs * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pos.push(inner * c, 0, inner * s, outer * c, 0, outer * s); uv.push(0, 0.5, 1, 0.5); }
  for (let i = 0; i < segs; i++) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function makeWorld(spec, sunPos, { seg = 160 } = {}) {
  const group = new THREE.Group(); const spin = new THREE.Group(); group.add(spin);
  group.rotation.z = spec.tilt || 0;
  const look = { sat: { value: 1 }, gain: { value: 1 } };            // shared by every part of this world
  const uniforms = { sunPos: { value: sunPos }, time: { value: 0 }, sat: look.sat, gain: look.gain };
  let mesh, ring = null, extras = {};
  if (spec.kind === 'earth' || spec.kind === 'pinkEarth') {
    Object.assign(uniforms, { dayMap: { value: mapTex('earth-day') }, nightMap: { value: mapTex('earth-night') }, cloudMap: { value: mapTex('earth-clouds', { colour: false }) },
      specMap: { value: mapTex('earth-spec', { colour: false }) }, normalMap: { value: mapTex('earth-normal', { colour: false }) }, cloudOffset: { value: 0 }, normalScale: { value: 0.75 }, radius: { value: spec.R }, pink: { value: spec.kind === 'pinkEarth' ? 1 : 0 },
      cloudK: { value: spec.cloudK === undefined ? 1 : spec.cloudK } });
    mesh = new THREE.Mesh(sphere(spec.R, seg), shaderMat(EARTH_FS, uniforms));
    const clouds = new THREE.Mesh(sphere(spec.R * 1.006, seg), shaderMat(CLOUD_FS, { sunPos: uniforms.sunPos, time: uniforms.time, sat: look.sat, gain: look.gain, cloudMap: uniforms.cloudMap, cloudOffset: uniforms.cloudOffset, cloudK: uniforms.cloudK, cloudTint: u3(spec.cloud || [1, 0.97, 0.91]) }, { transparent: true, depthWrite: false }));
    clouds.renderOrder = 1; spin.add(clouds);
    spin.add(skyShell(spec.R, spec.atmo, sunPos, seg, look));
  } else if (spec.kind === 'gas') {
    Object.assign(uniforms, rampU(spec), { map: { value: mapTex(spec.map) }, flow: { value: spec.flow || 0 }, bands: { value: spec.bands || 0 }, storm: { value: spec.storm || 0 }, limbDark: { value: spec.limbDark || 0.4 },
      detail: { value: spec.detail || 0 }, tint: u3(spec.tint || [1, 1, 1]), radius: { value: spec.R }, atmo: u3(spec.atmo.day), atmoAmt: { value: spec.atmo.inner || 0.3 }, expo: { value: spec.expo || 1.45 },
      hasRing: { value: spec.ring ? 1 : 0 }, ringMap: { value: null }, ringN: { value: new THREE.Vector3(0, 1, 0) }, ringC: { value: new THREE.Vector3() }, ringIn: { value: 0 }, ringOut: { value: 0 } });
    mesh = new THREE.Mesh(sphere(spec.R, seg), shaderMat(GAS_FS, uniforms));
    spin.add(skyShell(spec.R, spec.atmo, sunPos, seg, look));
    if (spec.ring) {
      const rmap = spec.ring.map === 'thin-ring' ? thinRingTex() : mapTex(spec.ring.map);
      uniforms.ringMap.value = rmap; uniforms.ringIn.value = spec.R * spec.ring.inner; uniforms.ringOut.value = spec.R * spec.ring.outer;
      const rm = shaderMat(RING_FS, { ringMap: { value: rmap }, sat: look.sat, gain: look.gain, sunPos: { value: sunPos }, planetPos: { value: new THREE.Vector3() }, planetR: { value: spec.R }, tone: { value: spec.ring.tone } },
        { transparent: true, side: THREE.DoubleSide, depthWrite: false });
      ring = new THREE.Mesh(ringGeometry(spec.R * spec.ring.inner, spec.R * spec.ring.outer), rm); ring.renderOrder = 1; group.add(ring); extras.ring = ring;
    }
  } else if (spec.kind === 'rock') {
    Object.assign(uniforms, rampU(spec), { map: { value: mapTex(spec.map) }, normalMap: { value: mapTex(spec.normal, { colour: false }) }, normalScale: { value: spec.normalScale || 0.8 }, detail: { value: spec.detail || 0 },
      tint: u3(spec.tint || [1, 1, 1]), radius: { value: spec.R }, atmo: u3(spec.atmo ? spec.atmo.day : [0, 0, 0]), atmoAmt: { value: spec.atmo ? spec.atmo.inner : 0 }, hex: { value: spec.hex || 0 } });
    mesh = new THREE.Mesh(sphere(spec.R, seg), shaderMat(ROCK_FS, uniforms));
    if (spec.atmo) spin.add(skyShell(spec.R, spec.atmo, sunPos, seg, look));
  }
  spin.add(mesh);
  const _n = new THREE.Vector3();
  return { spec, group, spin, mesh, uniforms, extras, look, R: spec.R,
    update(dt, time) {
      uniforms.time.value = time; if (spec.spin) spin.rotation.y += spec.spin * dt;
      if (uniforms.cloudOffset) uniforms.cloudOffset.value = time * 0.0005;
      if (ring) { group.getWorldPosition(uniforms.ringC.value); ring.material.uniforms.planetPos.value.copy(uniforms.ringC.value); _n.set(0, 1, 0).applyQuaternion(group.quaternion); uniforms.ringN.value.copy(_n); }
    } };
}

/* a brand moon: the Moon's map with relief, tinted */
export function makeMoon(m, sunPos, seg = 40) {
  const uniforms = { sunPos: { value: sunPos }, time: { value: 0 }, sat: { value: 1 }, gain: { value: 1 }, map: { value: mapTex('moon') }, normalMap: { value: mapTex('moon-normal', { colour: false }) }, normalScale: { value: 0.9 }, detail: { value: 0.3 },
    tint: u3(m.tint), radius: { value: m.R }, atmo: u3([0, 0, 0]), atmoAmt: { value: 0 }, hex: { value: 0 }, useRamp: { value: 0 }, rampA: u3([0, 0, 0]), rampB: u3([1, 1, 1]) };
  const mesh = new THREE.Mesh(sphere(m.R, seg), shaderMat(ROCK_FS, uniforms)); mesh.rotation.y = m.phase; return mesh;
}

/* the sky: a real Milky Way behind a field of twinkling stars */
export function makeMilkyWay(radius) {
  const m = new THREE.MeshBasicMaterial({ map: mapTex('milkyway'), side: THREE.BackSide, color: 0x9a9aa4, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), m); mesh.rotation.set(0.35, 0.8, 0.2); mesh.renderOrder = -2; return mesh;
}
export function makeStars(n, radius, dpr) {
  const pos = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n), tint = new Float32Array(n * 3);
  const tints = [[1, 1, 1], [0.86, 0.9, 1], [1, 0.92, 0.84], [1, 0.8, 0.9], [0.95, 0.95, 1]]; const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.set(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar(radius * (0.92 + rnd() * 0.08)); pos.set([v.x, v.y, v.z], i * 3);
    size[i] = 0.7 + Math.pow(rnd(), 3) * 3.4; ph[i] = rnd(); tint.set(tints[Math.floor(rnd() * tints.length)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1)); g.setAttribute('phase', new THREE.BufferAttribute(ph, 1)); g.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  const m = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, pr: { value: dpr } }, vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -1; return pts;
}

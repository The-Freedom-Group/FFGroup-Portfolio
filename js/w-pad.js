/* The launch pad at night: the rocket on its mount beside the service tower, flood-lit, mist on the ground, the moon up,
   trees along the horizon. Units are metres.
   The same evening stands behind the two parts before it. Through the raise the camera looks up into a dusk sky (the
   cloud of the climb is drawn over it); as the raise ends the dusk goes out of it and the moon crosses to its night
   place, and that sky is what Beyond sits under. As Beyond ends the camera comes down out of the sky to the complex,
   and as the page scrolls on the rocket comes down too, under its own burn, and settles on the pad. On "Press for
   liftoff" the engines light, the pad fills with smoke and the rocket climbs out of the top of the frame. */
import * as THREE from 'three';
import { mapTex, softDisc } from './planets.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
let seed = 4711; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const span = (v, a, b) => smooth((v - a) / (b - a));
const FOV = 40, TANH = Math.tan(FOV * Math.PI / 360), DEG = Math.PI / 180;
/* the stretch of the liftoff scene (0 at its start, 1 at its end) over which the rocket comes down and settles */
export const ARRIVE = [0.12, 0.6];
const DOWN = 0.86;                                               // how far through that stretch it touches the pad; the rest is the settle
/* the moon: where it stands over the pad, and how high it rides earlier in the evening, while the camera is looking up */
const MOON = V(1500, 1380, -3400), MOON_R = MOON.length(), MOON_AZ = Math.atan2(MOON.x, -MOON.z), MOON_EL = Math.asin(MOON.y / MOON_R), MOON_UP = 42 * DEG, MOON_SIZE = 150;

const SKY_FS = `uniform float dusk; varying vec3 vDir; void main(){ vec3 d = normalize(vDir); float y = d.y;
  vec3 top = mix(vec3(0.0075, 0.009, 0.023), vec3(0.03, 0.028, 0.058), dusk), mid = mix(vec3(0.019, 0.018, 0.04), vec3(0.07, 0.056, 0.1), dusk), hor = mix(vec3(0.05, 0.022, 0.04), vec3(0.19, 0.09, 0.15), dusk);
  float glow = pow(max(0.0, dot(normalize(d.xz), normalize(vec2(0.55, -1.0)))), 6.0);          // the last of the dusk, low on one side
  vec3 c = mix(hor + vec3(0.1, 0.022, 0.05) * glow, mid, smoothstep(-0.02, 0.16, y)); c = mix(c, top, smoothstep(0.1, 0.62, y)); gl_FragColor = vec4(c, 1.0); }`;
/* a few quiet stars: more of them, and lower, once night has settled over the pad */
const STAR_VS = `attribute float size; attribute float phase; uniform float time, pr, k, low; varying float vA;
void main(){ float el = normalize(position).y; vA = k * smoothstep(low, low + 0.16, el) * (0.5 + 0.5 * sin(time * (0.5 + phase * 1.2) + phase * 40.0)) * (0.45 + 0.55 * phase);
  gl_PointSize = size * pr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const STAR_FS = `varying float vA; void main(){ float a = smoothstep(0.5, 0.08, length(gl_PointCoord - 0.5)) * vA; gl_FragColor = vec4(vec3(1.1, 1.18, 1.4) * a, 1.0); }`;
const BEAM_VS = `varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const BEAM_FS = `uniform vec3 colour; uniform float k; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.4); float along = mix(0.16, 1.0, vUv.y * vUv.y); gl_FragColor = vec4(colour * k * f * along, 1.0); }`;
const SKY_VS = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SMOKE_VS = `attribute float aSize; attribute float aAlpha; attribute float aHeat; uniform float px; varying float vA; varying float vH;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(900.0, aSize * px / max(1.0, -mv.z)); vA = aAlpha; vH = aHeat; gl_Position = projectionMatrix * mv; }`;
const SMOKE_FS = `uniform sampler2D map; varying float vA; varying float vH;
void main(){ float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.004) discard; vec3 cold = vec3(0.27, 0.26, 0.3), warm = vec3(0.95, 0.46, 0.62), hot = vec3(2.3, 1.3, 1.6);
  vec3 c = mix(cold, warm, smoothstep(0.0, 0.6, vH)); c = mix(c, hot, smoothstep(0.6, 1.0, vH)); gl_FragColor = vec4(c, a); }`;

export function createPad({ renderer, small, dpr, spec }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020308); scene.fog = new THREE.FogExp2(0x05060b, 0.0017);
  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.5, 12000); scene.add(camera);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o));
  const porcelain = M(0xf0ece4, { roughness: 0.42 }), pink = M(0xff2d8d, { roughness: 0.4, emissive: 0x4a0a26 }), carbon = M(0x17181c, { roughness: 0.5, metalness: 0.5 }), steel = M(0x2a2d33, { roughness: 0.7, metalness: 0.6 }), dark = M(0x0b0d11, { roughness: 1, metalness: 0 });
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const cyl = (rt, rb, h, mat, x, y, z, parent, seg = 40, open = false) => add(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat, x, y, z, parent);

  /* sky, stars, moon */
  const skyU = { dusk: { value: 0 } };
  const sky = add(new THREE.SphereGeometry(6000, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false })); sky.renderOrder = -5;
  const stars = (() => { const n = small ? 150 : 300, pos = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { const el = Math.asin(0.1 + 0.88 * Math.pow(rnd(), 0.8)), az = rnd() * Math.PI * 2; pos.set([Math.sin(az) * Math.cos(el) * 5200, Math.sin(el) * 5200, -Math.cos(az) * Math.cos(el) * 5200], i * 3); size[i] = 1.7 + Math.pow(rnd(), 3) * 2.6; ph[i] = rnd(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('size', new THREE.BufferAttribute(size, 1)); geo.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, pr: { value: dpr }, k: { value: 1 }, low: { value: 0.1 } }, vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    pts.frustumCulled = false; pts.renderOrder = -4; scene.add(pts); return pts; })();
  const moon = add(new THREE.SphereGeometry(MOON_SIZE, 48, 24), new THREE.MeshBasicMaterial({ map: mapTex('moon'), color: 0xcfcac2, fog: false }), 1500, 1380, -3400); moon.rotation.y = 4.4;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(256, [[0, 'rgba(255,240,230,.28)'], [0.16, 'rgba(255,225,228,.07)'], [0.5, 'rgba(255,220,225,.02)'], [1, 'rgba(255,220,225,0)']]), depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); halo.position.copy(moon.position); halo.scale.setScalar(1300); scene.add(halo);

  /* ground, apron, horizon */
  const gtex = (() => { const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'); x.fillStyle = '#2b2d31'; x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 5200; i++) { x.fillStyle = 'rgba(' + (rnd() < 0.5 ? '0,0,0,' : '255,255,255,') + (0.02 + rnd() * 0.05) + ')'; x.fillRect(rnd() * 1024, rnd() * 1024, 1 + rnd() * 3, 1 + rnd() * 3); }
    x.strokeStyle = 'rgba(244,241,235,.5)'; x.lineWidth = 5; [470, 300].forEach(r => { x.beginPath(); x.arc(512, 512, r, 0, 7); x.stroke(); });
    x.strokeStyle = 'rgba(255,45,141,.75)'; x.lineWidth = 9; x.setLineDash([36, 26]); x.beginPath(); x.arc(512, 512, 180, 0, 7); x.stroke(); x.setLineDash([]);
    x.strokeStyle = 'rgba(244,241,235,.22)'; x.lineWidth = 3; for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; x.beginPath(); x.moveTo(512 + Math.cos(an) * 190, 512 + Math.sin(an) * 190); x.lineTo(512 + Math.cos(an) * 470, 512 + Math.sin(an) * 470); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const ground = add(new THREE.PlaneGeometry(9000, 9000), dark, 0, 0, 0); ground.rotation.x = -Math.PI / 2;
  const apron = add(new THREE.CircleGeometry(46, 96), M(0xffffff, { map: gtex, roughness: 0.95, metalness: 0 }), 0, 0.03, 0); apron.rotation.x = -Math.PI / 2;
  const road = add(new THREE.PlaneGeometry(9, 520), M(0x1a1c20, { roughness: 1 }), 30, 0.02, 280); road.rotation.x = -Math.PI / 2; road.rotation.z = 0.12;
  const tree = new THREE.ConeGeometry(1, 1, 7), treeMat = new THREE.MeshBasicMaterial({ color: 0x030407 }), trees = new THREE.InstancedMesh(tree, treeMat, 260), dm = new THREE.Object3D();
  for (let i = 0; i < 260; i++) { const a = rnd() * Math.PI * 2, r = 240 + rnd() * 520; if (Math.cos(a) * r > 100 && Math.abs(Math.sin(a) * r) < 60) { dm.scale.setScalar(0.001); } else { const h = 9 + rnd() * 16; dm.scale.set(h * 0.32, h, h * 0.32); } dm.position.set(Math.sin(a) * r, dm.scale.y / 2, -Math.abs(Math.cos(a) * r) * (rnd() < 0.8 ? 1 : -1)); dm.updateMatrix(); trees.setMatrixAt(i, dm.matrix); }
  scene.add(trees);
  for (let i = 0; i < 7; i++) { const hgt = 40 + rnd() * 70, m = add(new THREE.SphereGeometry(1, 24, 12), treeMat, -2600 + i * 860 + rnd() * 300, -6, -2100 - rnd() * 900); m.scale.set(900 + rnd() * 500, hgt, 300); }

  /* the mount, the tower, the lights */
  box(11, 2.2, 11, carbon, 0, 1.1, 0); box(15, 0.5, 15, steel, 0, 0.25, 0); box(5, 1.6, 22, M(0x0d0e11, { roughness: 1 }), 0, 0.2, 16);
  const tower = new THREE.Group(); tower.position.set(-10.5, 0, -2); scene.add(tower);
  const TH = 56; [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]].forEach(([x, z]) => box(0.42, TH, 0.42, steel, x, TH / 2, z, tower));
  for (let y = 4; y <= TH; y += 4) { box(5.2, 0.24, 0.24, steel, 0, y, -2.4, tower); box(5.2, 0.24, 0.24, steel, 0, y, 2.4, tower); box(0.24, 0.24, 5.2, steel, -2.4, y, 0, tower); box(0.24, 0.24, 5.2, steel, 2.4, y, 0, tower);
    if (y < TH) { const d = box(6.3, 0.16, 0.16, steel, 0, y + 2, 2.4, tower); d.rotation.z = (y / 4 % 2 ? 1 : -1) * 0.69; const e = box(0.16, 0.16, 6.3, steel, 2.4, y + 2, 0, tower); e.rotation.x = (y / 4 % 2 ? 1 : -1) * 0.69; } }
  box(5.6, 0.3, 5.6, steel, 0, TH + 0.2, 0, tower); cyl(0.09, 0.16, 16, steel, 0, TH + 8, 0, tower, 8);
  const arms = [box(8.4, 0.7, 1.5, steel, 5.2, 33, 0, tower), box(8.4, 0.7, 1.5, steel, 5.2, 21, 0, tower)];
  const beacons = [[0, TH + 16.2, 0], [-2.4, TH + 0.6, -2.4], [2.4, TH + 0.6, 2.4]].map(p => add(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff2040, fog: false }), p[0], p[1], p[2], tower));
  const lamps = [[-82, 36, 12, 0xcfe0ff, 1.7], [66, 30, 48, 0xffe8dc, 0.8], [44, 40, -58, 0xff7ab8, 1.5]].map(([x, y, z, c, power], i) => {
    cyl(0.25, 0.4, y, steel, x, y / 2, z, scene, 8); box(2.6, 1.3, 0.9, M(0x111216), x, y + 0.6, z).lookAt(0, 24, 0); add(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2), fog: false }), x, y + 0.6, z);
    const len = Math.hypot(x, y - 24, z), cone = add(new THREE.ConeGeometry(7, len, 40, 1, true), new THREE.ShaderMaterial({ uniforms: { colour: { value: new THREE.Color(c) }, k: { value: i === 1 ? 0.07 : 0.11 } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), x / 2, (y + 24) / 2, z / 2);
    cone.quaternion.setFromUnitVectors(V(0, 1, 0), V(x, y - 24, z).normalize()); cone.renderOrder = 6;
    const l = new THREE.SpotLight(c, power, 0, 0.22, 0.7, 0); l.position.set(x, y, z); l.target.position.set(0, 24, 0); scene.add(l, l.target); return l; });
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
  const puff = softDisc(128, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.55)'], [0.7, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']]);
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
  function resize(w, h) { W = w; H = h; camera.aspect = w / h; camera.updateProjectionMatrix(); smokeMat.uniforms.px.value = h * (renderer.getPixelRatio ? renderer.getPixelRatio() : 1) / (2 * TANH); first = true; }
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
    skyU.dusk.value = dusk; stars.material.uniforms.time.value = time; stars.material.uniforms.k.value = 1 - dusk * 0.75; stars.material.uniforms.low.value = lerp(0.42, 0.1, g);
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
    beacons.forEach((b, i) => { b.visible = (time * 0.9 + i * 0.33) % 1 < 0.55; });
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
    setDpr(v) { stars.material.uniforms.pr.value = v; smokeMat.uniforms.px.value = H * v / (2 * TANH); },
    warm() { flames.forEach(f => { f.visible = true; }); burn.visible = true; rocket.visible = true; renderer.compile(scene, camera); } };
}

/* The launch pad at night: the rocket on its mount beside the service tower, flood-lit, mist on the ground, the moon up,
   trees along the horizon. The camera comes in from the fields as the page scrolls; on "Press for liftoff" the engines
   light, the pad fills with smoke and the rocket climbs out of the top of the frame. Units are metres. */
import * as THREE from 'three';
import { makeStars, mapTex, softDisc } from './planets.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
let seed = 4711; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const FOV = 40, TANH = Math.tan(FOV * Math.PI / 360);

const SKY_FS = `varying vec3 vDir; void main(){ float y = normalize(vDir).y; vec3 d = normalize(vDir); vec3 top = vec3(0.004, 0.005, 0.011), mid = vec3(0.014, 0.013, 0.026), hor = vec3(0.05, 0.022, 0.04);
  float glow = pow(max(0.0, dot(normalize(d.xz), normalize(vec2(0.55, -1.0)))), 6.0);          // the last of the dusk, low on one side
  vec3 c = mix(hor + vec3(0.1, 0.022, 0.05) * glow, mid, smoothstep(-0.02, 0.16, y)); c = mix(c, top, smoothstep(0.1, 0.62, y)); gl_FragColor = vec4(c, 1.0); }`;
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
  const sky = add(new THREE.SphereGeometry(6000, 32, 16), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false })); sky.renderOrder = -5;
  const stars = makeStars(small ? 1400 : 3200, 5200, dpr); scene.add(stars);
  const moon = add(new THREE.SphereGeometry(150, 48, 24), new THREE.MeshBasicMaterial({ map: mapTex('moon'), color: 0xcfcac2, fog: false }), 1500, 1380, -3400); moon.rotation.y = 4.4;
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
  const N = small ? 260 : 620, sp = new Float32Array(N * 3), sSize = new Float32Array(N), sAlpha = new Float32Array(N), sHeat = new Float32Array(N), parts = []; for (let i = 0; i < N; i++) parts.push({ life: 0, max: 1, v: V(), s0: 1, s1: 1, a: 0 });
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1)); sGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sAlpha, 1)); sGeo.setAttribute('aHeat', new THREE.BufferAttribute(sHeat, 1));
  const puff = softDisc(128, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.55)'], [0.7, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']]);
  const smokeMat = new THREE.ShaderMaterial({ uniforms: { map: { value: puff }, px: { value: 800 } }, vertexShader: SMOKE_VS, fragmentShader: SMOKE_FS, transparent: true, depthWrite: false, fog: false });
  const smoke = new THREE.Points(sGeo, smokeMat); smoke.frustumCulled = false; smoke.renderOrder = 7; scene.add(smoke); let cursor = 0;
  function emit(x, y, z, vx, vy, vz, life, s0, s1, a) { const p = parts[cursor]; sp[cursor * 3] = x; sp[cursor * 3 + 1] = y; sp[cursor * 3 + 2] = z; p.v.set(vx, vy, vz); p.life = p.max = life; p.s0 = s0; p.s1 = s1; p.a = a; cursor = (cursor + 1) % N; }
  const mist = []; for (let i = 0; i < (small ? 7 : 14); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: 0x8f9bb8, transparent: true, opacity: 0.05 + rnd() * 0.05, depthWrite: false, fog: false })); s.position.set(-170 + rnd() * 340, 3 + rnd() * 5, -60 + rnd() * 150); s.scale.set(90 + rnd() * 90, 14 + rnd() * 10, 1); s.userData.v = 0.6 + rnd() * 1.2; scene.add(s); mist.push(s); }

  /* ───────── the camera, the burn ───────── */
  let W = innerWidth, H = innerHeight, T = -1, thrust = 0, done = null, vent = 0, ry = 0, shake = 0;
  const cp = V(), ct = V(), pos = V(), tgt = V(); let first = true;
  function resize(w, h) { W = w; H = h; camera.aspect = w / h; camera.updateProjectionMatrix(); smokeMat.uniforms.px.value = h * (renderer.getPixelRatio ? renderer.getPixelRatio() : 1) / (2 * TANH); first = true; }
  function update(s, dt, time) {
    const phone = W < 900, L = smooth(clamp(s.liftoff.pe, 0, 1)), far = clamp(-s.liftoff.pe * s.liftoff.len);          // far: still arriving from the section above
    let pox = 0, poy = 0;
    if (phone) {   /* the rocket (47 m and its mount) is fitted to the room the page gives it: under the closing words, then above the controls */
      const k = smooth(clamp((s.liftoff.pe - 0.38) / 0.24)), r0 = lerp(s.pad.a0, s.pad.b0, k), r1 = lerp(s.pad.a1, s.pad.b1, k), rh = Math.max(120, r1 - r0), d = Math.max(150, 58 * H / (2 * TANH * rh));
      cp.set(lerp(-22, -10, L), 6, d + far * 60); ct.set(0, 24, 0); poy = (r0 + r1) / 2 - H / 2; }
    else { cp.set(lerp(-70, -22, L), lerp(13, 4.2, L), lerp(236, 82, L) + far * 60); ct.set(lerp(6, 3, L), lerp(31, 26.5, L), 0); }
    /* the burn */
    if (T >= 0) {
      T += dt; thrust = clamp(T / 0.7) * (0.85 + 0.15 * Math.sin(time * 47)); const tt = Math.max(0, T - 0.9); ry = 1.5 * tt * tt + 1.05 * tt * tt * tt;
      const follow = smooth(clamp((ry - 4) / 30)); ct.y += ry * 0.86 * follow; cp.y += ry * 0.2 * follow; cp.z += ry * 0.34 * follow;
      shake = thrust * (1 - clamp(ry / 240)) * 0.35;
      const rate = (small ? 90 : 210) * thrust * (1 - clamp(ry / 120)); let n = Math.floor(rate * dt + rnd());
      while (n-- > 0) { const a = rnd() * Math.PI * 2, r = 0.5 + rnd() * 2.5, out = 9 + rnd() * 26; emit(Math.cos(a) * r, 1 + rnd() * 2 + Math.min(ry, 10) * 0.2, Math.sin(a) * r, Math.cos(a) * out, 1 + rnd() * 5, Math.sin(a) * out * (0.8 + 0.5 * rnd()), 3.5 + rnd() * 3.5, 4 + rnd() * 4, 26 + rnd() * 34, 0.34 + rnd() * 0.26); }
      if (ry > 2) { let k = Math.floor((small ? 22 : 46) * dt + rnd()); while (k-- > 0) emit((rnd() - 0.5) * 3, rocket.position.y - 4 - rnd() * 16, (rnd() - 0.5) * 3, (rnd() - 0.5) * 4, -22 - rnd() * 16, (rnd() - 0.5) * 4, 1.6 + rnd() * 1.4, 4, 16 + rnd() * 10, 0.42); }
      if (T > 5.6 && done) { const d = done; done = null; d(); }
    } else { thrust = 0; ry = 0; shake = 0; vent += dt; if (vent > 0.16) { vent = 0; emit(-1.9 + rnd() * 0.4, 6 + rnd() * 20, 1.4, -1.5 - rnd() * 1.5, 0.3 + rnd() * 0.6, 0.4 + rnd(), 2.6 + rnd() * 1.5, 0.8, 5 + rnd() * 3, 0.1); } }
    rocket.position.y = 2.2 + ry;
    flames.forEach((f, i) => { f.material.opacity = (i % 2 ? 0.95 : 0.6) * thrust; f.visible = thrust > 0.01; const sy = (0.55 + thrust * 0.6) * (0.9 + 0.1 * Math.sin(time * 61 + i * 1.7)); f.scale.set(1, sy, 1); f.position.y = -(i % 2 ? 4.5 : 7.5) * sy - 0.8; });
    fire.intensity = thrust * 420; fire.position.set(0, 3 + Math.min(ry, 40), 6);
    arms.forEach((a, i) => { a.rotation.y += ((T >= 0.15 ? -1.2 : 0) - a.rotation.y) * (1 - Math.exp(-dt * 2.2)); a.position.x = 5.2 - Math.sin(-a.rotation.y) * 1.2; });
    beacons.forEach((b, i) => { b.visible = (time * 0.9 + i * 0.33) % 1 < 0.55; });
    /* smoke: spreads along the ground, slows, lifts, thins */
    for (let i = 0; i < N; i++) { const p = parts[i]; if (p.life <= 0) { sAlpha[i] = 0; continue; } p.life -= dt; const u = 1 - p.life / p.max, j = i * 3;
      p.v.x *= 1 - 1.3 * dt; p.v.z *= 1 - 1.3 * dt; p.v.y += (u > 0.12 ? 2.6 : 0) * dt * (p.v.y < 0 ? 0 : 1); if (sp[j + 1] < 0.8 && p.v.y < 0) { p.v.y = 0.4; const a = rnd() * 6.28; p.v.x += Math.cos(a) * 14; p.v.z += Math.sin(a) * 14; }
      sp[j] += p.v.x * dt; sp[j + 1] += p.v.y * dt; sp[j + 2] += p.v.z * dt; sSize[i] = lerp(p.s0, p.s1, Math.sqrt(u)); sAlpha[i] = p.a * Math.min(1, u * 9) * (1 - u) * (1 - u); sHeat[i] = Math.max(0, 1 - u * 3.2) * (p.a > 0.2 ? 1 : 0); }
    sGeo.attributes.position.needsUpdate = sGeo.attributes.aSize.needsUpdate = sGeo.attributes.aAlpha.needsUpdate = sGeo.attributes.aHeat.needsUpdate = true;
    mist.forEach(m => { m.position.x += m.userData.v * dt; if (m.position.x > 190) m.position.x = -190; });
    stars.material.uniforms.time.value = time;
    const k = first ? 1 : 1 - Math.exp(-dt * (T >= 0 ? 3.2 : 5)); first = false; pos.lerp(cp, k); tgt.lerp(ct, k);
    camera.position.copy(pos); if (shake > 0) camera.position.add(V((rnd() - 0.5) * shake, (rnd() - 0.5) * shake, 0)); camera.up.set(0, 1, 0); camera.lookAt(tgt);
    const ox = phone ? pox : W * 0.15, oy = phone ? poy : 0; if (ox || oy) camera.setViewOffset(W, H, -ox, -oy, W, H); else camera.clearViewOffset();
  }
  return { scene, camera, update, resize,
    launch() { return new Promise(res => { T = 0; done = res; }); },
    reset() { T = -1; ry = 0; thrust = 0; done = null; for (const p of parts) p.life = 0; arms.forEach(a => { a.rotation.y = 0; }); first = true; },
    setDpr(v) { stars.material.uniforms.pr.value = v; smokeMat.uniforms.px.value = H * v / (2 * TANH); },
    warm() { flames.forEach(f => { f.visible = true; }); renderer.compile(scene, camera); } };
}

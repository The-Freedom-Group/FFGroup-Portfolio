/* The expansion map: the group's own globe, as the logo draws it (hot pink sea, white land, a soft pink glow round it).
   It rises out of the white sheet the market ends on, turns once in daylight, then night falls across it from the right:
   the sheet goes dark, the globe becomes dark glass with a glowing rim, and the nine territories arrive in order of their
   distance from Bury as the globe turns east to face them. At the end the glass clears, the rim is left as a ring, and
   the ring opens out and is gone, leaving the night sky the growth plan stands in.
   Everything here is a function of how far through the scene the scroll is, so it runs the same forwards and backwards.
   It never uses the Earth's photograph, clouds or city lights: only the water map, as a clean cut-out.
   Drawn over the night sky (w-orbit) once the sheet has gone; on its own while the sheet is up. */
import * as THREE from 'three';
import { mapTex } from './planets.js';

const DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const span = (v, a, b) => smooth((v - a) / (b - a));
const FOV = 22, TANH = Math.tan(FOV * DEG / 2), TILT = 0.34, TILT_NIGHT = 0.56;      // a long lens, so the globe reads as a disc; the north tipped toward the viewer

/* the nine territories, nearest Bury first: [longitude, latitude, the side its card stands on (-1 left, 1 right), the
   longitude the globe faces while the story is on it]. The distances are great-circle, from the first row. */
export const PLACES = [
  [-2.3, 53.6, -1, 24],       // United Kingdom       0 km
  [4.5, 50.6, -1, 27],        // Belgium            571 km
  [19.4, 52, -1, 31],         // Poland           1,464 km
  [12.5, 42, -1, 36],         // Italy            1,692 km
  [35, 39, -1, 48],           // Turkey           3,241 km
  [74.5, 32.5, 1, 60],        // Pakistan         6,322 km
  [114, 34, 1, 76],           // China            8,515 km
  [121, 23.8, 1, 80],         // Taiwan           9,837 km
  [101.7, 3.2, 1, 84]];       // Malaysia        10,636 km
const PRIMARY = 6;                                                // China: the primary region of manufacturing, marked in green
const onGlobe = (lon, lat, r = 1) => new THREE.Vector3(Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.sin(lat * DEG), -Math.cos(lat * DEG) * Math.sin(lon * DEG)).multiplyScalar(r);

/* ───────── colour: undoing the finish ─────────
   Every frame goes through the film finish (post.js): a filmic curve that turns a bright, saturated pink pale. The globe
   is designed in the colours the screen should show, and these work back to what the scene must hold for the finish to
   land on them. The curve and its two matrices are the ones in post.js. */
const M_IN = new THREE.Matrix3().set(0.59719, 0.35458, 0.04823, 0.07600, 0.90834, 0.01566, 0.02840, 0.13383, 0.83777);
const M_OUT = new THREE.Matrix3().set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);
const IN_INV = M_IN.clone().invert(), OUT_INV = M_OUT.clone().invert();
const glMat = m => 'mat3(' + m.elements.map(v => v.toFixed(7)).join(', ') + ')';
const UNGRADE = `
const mat3 IN_INV = ${glMat(IN_INV)}; const mat3 OUT_INV = ${glMat(OUT_INV)};
vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 curveInv(vec3 y){ y = clamp(y, 0.0, 0.985); vec3 A = 1.0 - y * 0.983729; vec3 B = 0.0245786 - y * 0.4329510; vec3 C = -(0.000090537 + y * 0.238081); return (-B + sqrt(B * B - 4.0 * A * C)) / (2.0 * A); }
vec3 ungrade(vec3 c){ return max(IN_INV * curveInv(OUT_INV * toLin(clamp(c, 0.0, 1.0))), 0.0) * 0.6; }`;
/* the same on the page's side, in full (it also undoes the split tone, the touch of saturation and the lift that follow
   the curve), for the sheet: it has to land on the page's porcelain exactly, since the market's sheet ends against it */
const toLin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const curveInv = y => { y = clamp(y, 0, 0.985); const A = 1 - y * 0.983729, B = 0.0245786 - y * 0.432951, C = -(0.000090537 + y * 0.238081); return (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A); };
const _v = new THREE.Vector3();
function ungradeExact(rgb, out, lift = 0.006, exposure = 1) {
  const c = rgb.map(v => (v - lift) / (1 - lift)); let x = c.slice();
  for (let i = 0; i < 8; i++) { const l = 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2], lo = 1 - smooth(l / 0.3), hi = smooth((l - 0.5) / 0.5), st = [-0.004 * lo + 0.012 * hi, -0.002 * lo + 0.005 * hi, 0.006 * lo - 0.01 * hi]; x = c.map((v, k) => (v - l) / 1.05 + l - st[k]); }
  _v.set(toLin(clamp(x[0])), toLin(clamp(x[1])), toLin(clamp(x[2]))).applyMatrix3(OUT_INV); _v.set(curveInv(_v.x), curveInv(_v.y), curveInv(_v.z)).applyMatrix3(IN_INV);
  return out.set(Math.max(0, _v.x), Math.max(0, _v.y), Math.max(0, _v.z)).multiplyScalar(0.6 / exposure);
}
const PORCELAIN = [244 / 255, 241 / 255, 235 / 255], NIGHT = [5 / 255, 5 / 255, 9 / 255];

/* ───────── shaders ───────── */
/* the white sheet: one triangle over the whole screen, the page's porcelain by day, going dark and then clear as night falls */
const SHEET_VS = `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const SHEET_FS = `uniform vec3 col; uniform float a; void main(){ gl_FragColor = vec4(col * a, a); }`;

const GLOBE_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vNv; varying vec3 vW;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vNv = normalize(normalMatrix * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const GLOBE_FS = `varying vec2 vUv; varying vec3 vN; varying vec3 vNv; varying vec3 vW;
uniform sampler2D water; uniform float dusk; uniform float body;` + UNGRADE + `
void main(){
  vec3 N = normalize(vN); vec3 Nv = normalize(vNv); vec3 V = normalize(cameraPosition - vW);
  float edge = 1.0 - clamp(dot(N, V), 0.0, 1.0);                       // 0 in the middle of the disc, 1 on the limb
  // land and sea from the water map, cut clean; the sea just south of a coast takes a soft shade, as a paper cut-out would
  float wv = texture2D(water, vUv).r; float aa = clamp(fwidth(wv) * 0.8, 0.02, 0.5);
  float land = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, wv);
  float shade = (1.0 - smoothstep(0.3, 0.7, texture2D(water, vUv + vec2(0.0, 0.0042), 1.2).r)) * (1.0 - land);
  // day: the logo's globe. Light from over the left shoulder, wrapped well round so no part of it is dark
  float lit = smoothstep(-0.6, 0.92, dot(Nv, normalize(vec3(-0.42, 0.46, 0.78))));
  vec3 sea = mix(vec3(0.647, 0.047, 0.353), vec3(1.0, 0.176, 0.553), lit);          // #A50C5A in the shade to the brand's #FF2D8D in the light
  sea = mix(sea, vec3(1.0, 0.31, 0.635), pow(lit, 6.0) * 0.35);                      // a little lighter where the light lands
  sea = mix(sea, vec3(0.5, 0.02, 0.26), shade * 0.42);
  vec3 ground = mix(vec3(0.9, 0.77, 0.845), vec3(1.0, 0.988, 0.972), lit);
  vec3 day = mix(sea, ground, land) * (1.0 - 0.3 * pow(edge, 2.4));                  // deeper toward the limb
  day += vec3(1.0, 0.82, 0.9) * pow(edge, 6.0) * 0.1;                                // a thin haze of air inside the limb
  // the soft window of light, upper left, that the logo's globe carries
  vec2 q = Nv.xy - vec2(-0.4, 0.5); float cs = cos(0.55), sn = sin(0.55); q = vec2(q.x * cs + q.y * sn, -q.x * sn + q.y * cs) / vec2(0.3, 0.115);
  float win = 1.0 - smoothstep(0.35, 1.0, length(q));
  float sheen = pow(max(dot(Nv, normalize(vec3(-0.5, 0.56, 0.66))), 0.0), 3.0);
  day = mix(day, vec3(1.0), win * 0.17 + sheen * 0.05);
  // night: dark glass. The land is a ghost in it, the rim glows pink from inside, and the window of light stays
  vec3 glass = mix(vec3(0.05, 0.007, 0.03), vec3(0.165, 0.035, 0.105), sheen);
  glass += vec3(0.082, 0.064, 0.074) * land * (0.55 + 0.45 * sheen);
  glass += vec3(1.0, 0.176, 0.553) * pow(edge, 3.0) * 0.5;
  glass = mix(glass, vec3(1.0, 0.94, 0.97), win * 0.2 + sheen * 0.06);
  // nightfall: the sun goes round behind the globe to the left, so the dark comes in from the right limb
  float ang = dusk * 3.14159265; vec3 S = vec3(-sin(ang), 0.14 * sin(ang), cos(ang));
  float n = 1.0 - smoothstep(-0.34, 0.34, dot(Nv, S) + mix(0.36, -0.36, dusk));
  gl_FragColor = vec4(ungrade(mix(day, glass, n)), body);
}`;

/* the rim: the fine bright line on the limb, the pink ring just outside it and the soft glow beyond, on a card that
   faces the viewer. vP is in limb radii; grow opens the ring out on the way out. */
const RIM_VS = `varying vec2 vP; uniform float reach; void main(){ vP = position.xy * reach; gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * reach, 0.0, 1.0); }`;
const RIM_FS = `varying vec2 vP; uniform float limb; uniform float grow; uniform float night; uniform float glow; uniform float line; uniform float thin;
uniform vec3 paper; uniform vec3 paperScene; uniform float sheet;` + UNGRADE + `
void main(){
  float r = length(vP) / (limb * grow); float px = fwidth(r);
  /* the glow. On the sheet it is pink ink soaking into the paper: worked out in the colours the screen shows (so it is
     a true soft pink that meets the sheet exactly where it ends), then written as the light the ink takes off the sheet
     under it. Once the sheet has gone it is light added to the night, keeping closer to the limb */
  float h = pow(1.0 - clamp((r - 0.998) / 0.42, 0.0, 1.0), 2.1) * step(0.998, r) * glow;
  vec3 ink = paperScene * (ungrade(mix(paper, vec3(1.0, 0.36, 0.66), h * 0.5)) / max(ungrade(paper), vec3(1e-4)) - 1.0);
  float hn = h * h * 0.3 * (1.0 - sheet);
  vec3 c = ink * sheet + ungrade(vec3(1.0, 0.2, 0.58)) * hn; float a = hn;
  /* the pink ring just outside the limb, and the fine bright line on it */
  float ring = (1.0 - smoothstep(0.011 * thin, 0.011 * thin + px * 1.5, abs(r - 1.017))) * mix(0.5, 0.46, night) * line;
  c = c * (1.0 - ring) + ungrade(mix(vec3(1.0, 0.47, 0.73), vec3(0.78, 0.13, 0.43), night)) * ring; a = a * (1.0 - ring) + ring;
  float hw = max(mix(0.0045, 0.0024, night) * thin, px * 0.55);
  float hair = (1.0 - smoothstep(hw, hw + px * 1.25, abs(r - 1.0))) * mix(0.82, 0.72, night) * line;
  c = c * (1.0 - hair) + ungrade(mix(vec3(1.0), vec3(0.98, 0.8, 0.89), night)) * hair; a = a * (1.0 - hair) + hair;
  gl_FragColor = vec4(c, a);
}`;

/* routes and the marks under the pins: one flat colour, as the screen should show it */
const FLAT_VS = `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLAT_FS = `uniform vec3 col; uniform float a;` + UNGRADE + ` void main(){ gl_FragColor = vec4(ungrade(col) * a, a); }`;
const flat = (hex, extra) => new THREE.ShaderMaterial(Object.assign({ uniforms: { col: { value: new THREE.Color(hex).convertLinearToSRGB() }, a: { value: 1 } }, vertexShader: FLAT_VS, fragmentShader: FLAT_FS, transparent: true, premultipliedAlpha: true, depthWrite: false }, extra));

/* grade: the finish's own settings (post.js uniforms), so the sheet stays on the page's colour if its lift or exposure is changed */
export function createGlobe({ renderer, small, grade }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 1, 200);

  /* the sheet */
  const sheetU = { col: { value: new THREE.Vector3() }, a: { value: 1 } };
  const sheetGeo = new THREE.BufferGeometry(); sheetGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const sheet = new THREE.Mesh(sheetGeo, new THREE.ShaderMaterial({ uniforms: sheetU, vertexShader: SHEET_VS, fragmentShader: SHEET_FS, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false }));
  sheet.frustumCulled = false; sheet.renderOrder = -10; scene.add(sheet);

  /* the globe: tipped, then turned about its own axis */
  const tip = new THREE.Group(), spin = new THREE.Group(); tip.rotation.x = TILT; tip.add(spin); scene.add(tip);
  const globeU = { water: { value: mapTex('earth-spec', { colour: false }) }, dusk: { value: 0 }, body: { value: 1 } };
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, small ? 96 : 144, small ? 48 : 72), new THREE.ShaderMaterial({ uniforms: globeU, vertexShader: GLOBE_VS, fragmentShader: GLOBE_FS, transparent: true }));
  spin.add(ball);

  /* the rim */
  const rimU = { reach: { value: 1.7 }, limb: { value: 1 }, grow: { value: 1 }, night: { value: 0 }, glow: { value: 1 }, line: { value: 1 }, thin: { value: 1 }, paper: { value: new THREE.Vector3() }, paperScene: { value: sheetU.col.value }, sheet: { value: 1 } };
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: rimU, vertexShader: RIM_VS, fragmentShader: RIM_FS, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false }));
  rim.renderOrder = 6; rim.frustumCulled = false; scene.add(rim);

  /* the territories: a mark on the ground under each pin, and each one's route home to Bury */
  const marks = new THREE.Group(); spin.add(marks);
  const home = onGlobe(PLACES[0][0], PLACES[0][1]);
  const places = PLACES.map(([lon, lat, side, face], i) => {
    const hex = i === PRIMARY ? 0x2fe0a0 : 0xff2d8d, local = onGlobe(lon, lat, 1.003), g = new THREE.Group(); g.position.copy(local); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), local.clone().normalize()); marks.add(g);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0085, 20), flat(0xfff4f9)); dot.renderOrder = 3; g.add(dot);
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48), flat(hex)); pulse.renderOrder = 3; g.add(pulse);
    let arc = null, n = 0;
    if (i > 0) { const a = onGlobe(lon, lat), ang = a.angleTo(home), lift = 0.012 + ang * 0.085, pts = [];
      for (let k = 0; k <= 56; k++) { const t = k / 56; pts.push(a.clone().lerp(home, t).normalize().multiplyScalar(1.003 + Math.sin(t * Math.PI) * lift)); }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0028, 6, false); n = geo.index.count;
      arc = new THREE.Mesh(geo, flat(hex)); arc.renderOrder = 2; arc.geometry.setDrawRange(0, 0); marks.add(arc); }
    return { lon, lat, side, face, local, g, dot, pulse, arc, n };
  });

  /* which way the globe faces, in degrees of longitude, all the way through: the Americas as it rises, once round by
     day, on round into the night to Europe, then east from stop to stop */
  function facing(pe, len, A, B) {
    const w = (B - A) / PLACES.length, at = i => A + (i + 0.5) * w, T = A - 0.14, c0 = at(0);
    if (pe <= 0) return lerp(-118, -92, clamp(1 + pe * len));
    if (pe <= T) return lerp(-92, 250, pe / T);
    if (pe <= c0) { const t = (pe - T) / (c0 - T), d = 360 + PLACES[0][3] - 250, v = 342 / T * (c0 - T); return 250 + v * t + (3 * d - 2 * v) * t * t + (v - 2 * d) * t * t * t; }   // slows into the first stop from the speed of the day's turn
    const last = PLACES.length - 1;
    if (pe >= at(last)) return 360 + PLACES[last][3] + clamp((pe - at(last)) / (1.1 - at(last))) * 14;
    const i = Math.min(last - 1, Math.floor((pe - c0) / w)); return 360 + lerp(PLACES[i][3], PLACES[i + 1][3], smooth((pe - at(i)) / w));
  }

  const out = { pins: PLACES.map(() => ({ x: 0, y: 0, a: 0, k: 0 })), night: 0, cards: 0, x: 0, y: 0, r: 0, live: false };
  const look = { solid: true, bloom: 0, vignette: 0, grain: 0.35 };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), toCam = new THREE.Vector3();
  let yaw = 0, lastT = -9, W = 0, H = 0, paperKey = -1;

  /* s: what the page knows (see world.js). s.map is the scene's progress; s.globeRoom says where on the stage the globe
     sits (cx, cy, r in pixels), the stretch of the scene the nine stops share (a, b) and whether the cards stand beside
     the globe (cols) or one at a time below it; s.pin is the territory the story is on. */
  function update(s, dt, time) {
    const M = s.map, g = s.globeRoom, A = g.a, B = g.b, pe = M.pe, len = M.len;
    if (W !== innerWidth || H !== innerHeight) { W = innerWidth; H = innerHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); }
    const fresh = time - lastT > 0.25; lastT = time;

    /* the timeline */
    const night = span(pe, A - 0.16, A - 0.04), dusk = span(pe, A - 0.13, A + 0.005);
    const cardsOut = 1 - span(pe, B + 0.005, B + 0.06), body = 1 - span(pe, B + 0.02, B + 0.085);
    const ringOut = span(pe, B + 0.06, 1 + 0.42 / len), rise = smooth(clamp(1 + pe * len));

    /* the sheet: porcelain, darkening as the screen should see it, then clearing to the sky behind */
    const k = night, lift = grade ? grade.lift.value : 0.006, expo = grade ? grade.exposure.value : 1, key = k + lift * 7 + expo * 13;
    if (key !== paperKey) { paperKey = key; const paper = PORCELAIN.map((v, i) => lerp(v, NIGHT[i], k)); ungradeExact(paper, sheetU.col.value, lift, expo); rimU.paper.value.fromArray(paper); }
    sheetU.a.value = rimU.sheet.value = 1 - span(k, 0.5, 1); sheet.visible = sheetU.a.value > 0.003;
    /* the finish: its glow only once the globe has gone dark (or the day side would flare), and gently then; all of it back as the ring goes, since the sky behind carries on into the next sheet */
    look.solid = sheetU.a.value > 0.999; look.bloom = lerp(span(dusk, 0.72, 1) * 0.36, 1, ringOut); look.vignette = span(k, 0.15, 0.85); look.grain = lerp(0.35, 1, k);

    /* where the globe stands: fixed to the stage, so it rises with the page on the way in and leaves with it on the way out */
    const stageTop = M.x < 0 ? -M.x * H : M.x > len ? -(M.x - len) * H : 0;
    const rpx = Math.max(24, g.r * lerp(0.84, 1, rise)), cx = g.cx, cy = g.cy + stageTop;
    const t = rpx * 2 * TANH / H, dist = 1 / Math.sin(Math.atan(t));
    camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0); camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H); camera.updateMatrixWorld();
    rimU.limb.value = 1 / Math.sqrt(1 - 1 / (dist * dist));

    /* the turn */
    const want = (-90 - facing(pe, len, A, B)) * DEG; let d = want - yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    yaw = fresh ? want : yaw + d * (1 - Math.exp(-dt * 7)); spin.rotation.y = yaw;
    tip.rotation.x = lerp(TILT, TILT_NIGHT, dusk);                                 // it nods a little further as night falls, so the territories sit across the middle of it

    /* day into night, and the way out: the glass clears, the rim is left as a ring, the ring opens and goes */
    globeU.dusk.value = dusk; globeU.body.value = body; ball.visible = body > 0.003;
    rimU.night.value = dusk; rimU.glow.value = (1 - span(pe, B + 0.045, B + 0.1)) * lerp(0.7, 1, rise); rimU.line.value = 1 - ringOut; rimU.grow.value = 1 + 0.7 * ringOut * ringOut; rimU.thin.value = 1 - 0.6 * ringOut;
    rimU.reach.value = Math.max(1.7, rimU.limb.value * rimU.grow.value * 1.08); rim.visible = rimU.line.value > 0.003 || rimU.glow.value > 0.003;
    tip.updateMatrixWorld(true);

    /* the territories: each arrives when the story reaches it, shows while it faces the viewer on its card's side of
       the globe, and leaves before the glass clears */
    const w = (B - A) / PLACES.length, cols = g.cols, on = cardsOut > 0.003 && pe > A - 0.03; marks.visible = on; let cards = 0;
    places.forEach((p, i) => {
      const o = out.pins[i], reach = span(pe, A + i * w - 0.014, A + i * w + 0.012) * cardsOut; o.k = reach;
      if (!on) { o.a = 0; return; }
      tmp.copy(p.local); spin.localToWorld(tmp); tmp2.copy(tmp).normalize(); const f = tmp2.dot(toCam.copy(camera.position).sub(tmp).normalize());
      tmp.project(camera); o.x = (tmp.x * 0.5 + 0.5) * W; o.y = (-tmp.y * 0.5 + 0.5) * H - stageTop;
      const side = cols ? span((o.x - cx) / rpx * p.side, -0.42, -0.2) : 1, near = span(-Math.sin(p.lon * DEG + yaw), 0.5, 0.64);   // near: within about fifty-five degrees of longitude of where the globe faces (further round, the pins bunch on the limb and their lines would cross)
      o.a = reach * span(f, 0.14, 0.4) * side * near; cards = Math.max(cards, o.a);
      const act = s.pin === i, u = (time * 0.55 + i * 0.37) % 1, hot = reach * (act ? 1 : 0.55);
      p.dot.material.uniforms.a.value = reach; p.dot.visible = reach > 0.01;
      p.pulse.scale.setScalar(act ? 0.02 + u * 0.05 : 0.02); p.pulse.material.uniforms.a.value = hot * (act ? (1 - u) * 0.9 : 0.7); p.pulse.visible = hot > 0.01;
      if (p.arc) { p.arc.geometry.setDrawRange(0, Math.floor(p.n * span(pe, A + i * w - 0.01, A + i * w + 0.035) / 3) * 3); p.arc.material.uniforms.a.value = cardsOut * (act ? 0.62 : 0.2); p.arc.visible = cardsOut > 0.01; }
    });
    out.night = night; out.cards = cards; out.x = cx; out.y = cy - stageTop; out.r = rpx; out.live = true;
    return look;
  }

  return { scene, camera, update, out, look, places,
    /* over whatever is already in the frame (the night sky), with a depth of its own */
    draw(r) { const ac = r.autoClear; r.autoClear = false; r.clearDepth(); r.render(scene, camera); r.autoClear = ac; },
    warm() { const hid = []; scene.traverse(o => { if (o.visible === false) { hid.push(o); o.visible = true; } }); places.forEach(p => p.arc && p.arc.geometry.setDrawRange(0, p.n)); renderer.compile(scene, camera); places.forEach(p => p.arc && p.arc.geometry.setDrawRange(0, 0)); hid.forEach(o => { o.visible = false; }); } };
}

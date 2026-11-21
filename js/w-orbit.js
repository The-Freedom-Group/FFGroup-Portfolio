/* Space: the group's mark alive in three dimensions (the pink globe on its orbit, with the three bodies of the logo),
   which is pulled away to a point, blows as a nova and comes back as the whole Freedom system, laid out as the group's
   hierarchy; then the dive at Freedom Global. The same sky stands behind the night sheets and behind the expansion
   map, which has a globe of its own (w-globe.js).
   The camera never cuts inside this module: every view is a pose (what it looks at, from where, how far, and where on
   the screen that point sits) and the camera eases from pose to pose. */
import * as THREE from 'three';
import { WORLDS, LIGHT_DIR } from './worlds.js';
import { makeWorld, makeStars, softDisc } from './planets.js';
import { createSpace } from './space.js';
import { createSystem, solveSystem, sceneColour, SYS_WORLDS, SYS_EL, YEARS } from './w-system.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const span = (v, a, b) => smooth((v - a) / (b - a));
const ease = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const FOV = 40, TANH = Math.tan(FOV * Math.PI / 360);
const DEG = Math.PI / 180;
/* the dive at Freedom Global, in screens of scroll: it starts this long before the system scene ends and runs on into the next */
const DIVE_LEAD = 0.675, DIVE_SPAN = 1.404;

/* the mark's orbit, fitted to the logo artwork (assets/brand/group-logo-white.png), all in units of the wordmark's width:
   an ellipse whose middle is 0.4652 across and 0.5042 down, 0.5456 by 0.2496, its long axis leaning 54.42 degrees; the
   globe 0.7573 across and 0.5073 down; and, counting round the ellipse from its upper right end the way the artwork's
   stroke thickens, the green body at 355.8 degrees, the blue at 155.2, the ember at 284.3 (radii 0.0519, 0.0414, 0.0247).
   The orbit lies flat in the plane of the first screen, so head on it is the logo's ellipse exactly. */
const MK = { cx: 0.4652, cy: 0.5042, a: 0.5456, b: 0.2496, lean: 54.42 * DEG, gx: 0.7573, gy: 0.5073 }, KY = MK.b / MK.a;
const BODIES = [{ at: 355.8, r: 0.0519, world: 'facilities' }, { at: 155.2, r: 0.0414, world: 'global' }, { at: 284.3, r: 0.0247, world: 'distribution' }];
/* the stroke round the orbit, read off the artwork: [degrees, width in wordmark widths, how solid, colour]. It runs thick
   and deep from the green body past the globe to the blue, thin and pale from there, and breaks where it would cross the letters. */
const STROKE = [[0, 0.026, 1, '#ff3ecc'], [12, 0.0262, 1, '#fe3ecc'], [30, 0.029, 1, '#f52eb7'], [42, 0.0306, 1, '#e5199b'], [54, 0.0328, 1, '#d2047d'], [66, 0.0336, 1, '#cc0074'], [84, 0.0336, 1, '#cc0074'], [96, 0.0322, 1, '#d30680'],
  [108, 0.03, 1, '#e01596'], [120, 0.028, 1, '#ee27ae'], [132, 0.0246, 1, '#f935c1'], [144, 0.022, 1, '#fe3cca'], [153, 0.021, 1, '#fe3cca'], [158, 0.0128, 1, '#ff3ecc'], [170, 0.0135, 1, '#ff3ecc'], [180, 0.0125, 1, '#ff43cd'], [192, 0.0118, 1, '#ff52d5'],
  [204, 0.0112, 1, '#ff6ce0'], [214, 0.0102, 0.9, '#ff8eea'], [222, 0.0096, 0.5, '#ffa5ef'], [229, 0.008, 0, '#ffa5ef'], [261, 0.004, 0, '#ff93ed'], [266, 0.006, 0.6, '#ff93ed'], [272, 0.0078, 1, '#ff93ed'], [284, 0.0105, 1, '#ff91ea'], [294, 0.0148, 1, '#ff8fe5'],
  [306, 0.0186, 1, '#ff73dc'], [318, 0.0218, 1, '#ff56d3'], [330, 0.0238, 1, '#ff43cd'], [342, 0.0248, 1, '#ff3bc9'], [360, 0.026, 1, '#ff3ecc']];


const RIG_VS = `attribute vec4 tint; varying vec4 vC; varying vec3 vN; void main(){ vC = tint; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RIG_FS = `uniform float k; uniform float charge; uniform vec3 light; varying vec4 vC; varying vec3 vN;
void main(){ float a = vC.a * k; if (a < 0.004) discard; float sh = 0.9 + 0.2 * max(dot(normalize(vN), light), 0.0);      // the artwork's colours, with just enough shading to be a thing and not a line
  gl_FragColor = vec4(vC.rgb * sh * (1.0 + charge * 1.6) + vec3(1.0, 0.5, 0.8) * charge * 0.5, a); }`;

export function createOrbit({ renderer, small, dpr, spec }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030308);
  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.5, 22000); scene.add(camera);
  const sunDir = V(...LIGHT_DIR).normalize(), sunHome = sunDir.clone().multiplyScalar(6000), sunPos = sunHome.clone();
  const space = createSpace({ renderer, scene, camera, phone: small, dpr });
  const stars = makeStars(spec.stars, 8000, dpr); scene.add(stars);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5)); const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.copy(sunDir); scene.add(key);

  /* the worlds */
  const worlds = {}; const ids = Object.keys(WORLDS), radii = {};
  ids.forEach(id => { const w = makeWorld(WORLDS[id], sunPos, { seg: small ? 96 : 160 }); w.group.position.set(...WORLDS[id].pos); w.k = id === 'enterprise' ? 1 : 0; w.sat = 1; w.gain = 1; w.size = 1; scene.add(w.group); worlds[id] = w;
    radii[id] = { R: w.R, wide: id === 'form' ? 1.75 : id === 'fuel' ? 1.25 : 1 }; });
  const ent = worlds.enterprise, R = ent.R, entTilt = WORLDS.enterprise.tilt;
  ent.spin.rotation.y = -Math.PI / 2 + 38 * DEG;                                 // the Atlantic to the front, as on the logo

  /* the system's rings, lanes and nova */
  const sys = createSystem({ scene, renderer });

  /* the mark's orbit: a tube as thick as the artwork's stroke at every point, and the three bodies on it */
  const rig = new THREE.Group(); scene.add(rig);
  const SEG = 480, RAD = 10, pos = [], col = [], nor = [], idx = [];
  { const cA = new THREE.Color(), cB = new THREE.Color();
    for (let i = 0; i <= SEG; i++) {
      const deg = i / SEG * 360, t = deg * DEG; let j = 0; while (j < STROKE.length - 2 && STROKE[j + 1][0] < deg) j++;
      const s0 = STROKE[j], s1 = STROKE[j + 1], f = clamp((deg - s0[0]) / (s1[0] - s0[0])), tr = lerp(s0[1], s1[1], f) / 2 / MK.a, alpha = lerp(s0[2], s1[2], f);
      cA.copy(sceneColour(s0[3])).lerp(cB.copy(sceneColour(s1[3])), f);
      const px = Math.cos(t), py = -Math.sin(t) * KY; let tx = -Math.sin(t), ty = -Math.cos(t) * KY; const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
      for (let q = 0; q < RAD; q++) { const a = q / RAD * Math.PI * 2, nx = Math.cos(a) * -ty, ny = Math.cos(a) * tx, nz = Math.sin(a); pos.push(px + nx * tr, py + ny * tr, nz * tr); nor.push(nx, ny, nz); col.push(cA.r, cA.g, cA.b, alpha); }
    } }
  for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) { const a = i * RAD + j, b = i * RAD + (j + 1) % RAD, c = a + RAD, d = b + RAD; idx.push(a, c, b, b, c, d); }
  const ringGeo = new THREE.BufferGeometry(); ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ringGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); ringGeo.setAttribute('tint', new THREE.Float32BufferAttribute(col, 4)); ringGeo.setIndex(idx);
  const ringMat = new THREE.ShaderMaterial({ uniforms: { k: { value: 1 }, charge: { value: 0 }, light: { value: sunDir } }, vertexShader: RIG_VS, fragmentShader: RIG_FS, transparent: true });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.frustumCulled = false; rig.add(ring); const RING_N = idx.length;
  /* inside the orbit, as the opening is pulled away: a dark well with a hot rim, the mark turning into the hole it falls down */
  const wellMat = new THREE.ShaderMaterial({ uniforms: { k: { value: 0 } }, vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float k; varying vec2 vP; void main(){ float r = length(vP); float a = mix(0.9, 0.5, smoothstep(0.0, 0.5, r)); a = mix(a, 0.2, smoothstep(0.5, 0.8, r)); a = mix(a, 0.4, smoothstep(0.8, 0.95, r)); a *= 1.0 - smoothstep(0.95, 1.0, r); gl_FragColor = vec4(vec3(1.0, 0.2, 0.56) * smoothstep(0.6, 0.97, r) * 1.3, a * k); }', transparent: true, depthWrite: false });
  const well = new THREE.Mesh(new THREE.CircleGeometry(1, 96), wellMat); well.scale.set(1, KY, 1); well.renderOrder = 1; rig.add(well); ring.renderOrder = 2;
  /* and round Enterprise once it is a planet: a soft pink glow, behind it */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(128, [[0, 'rgba(255,61,154,.6)'], [0.42, 'rgba(255,61,154,.2)'], [1, 'rgba(255,61,154,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); glow.visible = false; scene.add(glow);
  /* the logo's three bodies are the three companies' own worlds, built as the system builds them (green Facilities, blue
     Global, the small ember one Distribution), each drawn at the logo's size for it */
  const bodies = BODIES.map(b => { const w = makeWorld(WORLDS[b.world], sunPos, { seg: small ? 48 : 96 }); w.group.userData = Object.assign({ k: b.r / MK.a / w.R }, b); rig.add(w.group); w.group.w = w; return w.group; });

  /* ───────── poses ───────── */
  const cur = { target: V(), dir: V(0, 0.42, 1).normalize(), dist: 700, ox: 0, oy: 0 }, want = { target: V(), dir: V(), dist: 700, ox: 0, oy: 0 };
  const dirHero = V(0, 0.3, 1).normalize(), dirSys = V(0, Math.sin(SYS_EL), Math.cos(SYS_EL)), dirDock = V(0, Math.sin(SYS_EL + 9 * DEG), Math.cos(SYS_EL + 9 * DEG));
  /* the first screen's plane: it faces the opening's camera, and tips back about the globe as it is pulled away */
  const heroQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(dirHero, V(), V(0, 1, 0))), planeQ = new THREE.Quaternion(), tipQ = new THREE.Quaternion(), leanQ = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), MK.lean), eul = new THREE.Euler();
  const tmp = V(), tmp2 = V(), e1 = V(), right = V(), up = V(), shift = V(), zAxis = V(0, 0, 1), turnQ = new THREE.Quaternion(), qa = { x: 0, y: 0 }, qb = { x: 0, y: 0 };
  let W = innerWidth, H = innerHeight, snap = true, novaPrimed = 0, intro = 0, introBodies = 0, sol = null, solKey = '';
  const out = { worlds: {}, years: [], hero: new Array(16).fill(0), heroOk: false, dive: 0, focus: 0, lens: { u: 0.5, v: 0.5, r: 0.1, k: 0 }, hole: { x: 0, y: 0, r: 0 } };
  ids.forEach(id => { out.worlds[id] = { x: 0, y: 0, r: 0, a: 0 }; }); YEARS.forEach(() => out.years.push({ x: 0, y: 0, a: 0 }));

  function resize(w, h) { W = w; H = h; camera.aspect = w / h; camera.updateProjectionMatrix(); snap = true; }
  const distFor = rpx => R * H / (2 * Math.max(4, rpx) * TANH);            // how far back to stand for the globe to be rpx pixels in radius
  const project = (v, o) => { tmp.copy(v).project(camera); o.x = (tmp.x * 0.5 + 0.5) * W; o.y = (-tmp.y * 0.5 + 0.5) * H; return tmp.z < 1; };
  /* the system, worked out for the places the page gives (again only when they change) */
  function solve(Y) {
    const q = Y.slots; let key = W + '|' + H; for (const k in q) key += '|' + q[k].x.toFixed(1) + ',' + q[k].y.toFixed(1) + ',' + q[k].r.toFixed(1);
    if (key !== solKey) { solKey = key; sol = solveSystem(q, R, H / (2 * TANH), radii); sys.rings.forEach((r, i) => { const u = r.material.uniforms; u.centre.value.set(0, 0, sol.rings[i].c); u.R.value = sol.rings[i].r; u.dots.value = Math.max(40, Math.round(Math.PI * 2 * sol.rings[i].r * (H / (2 * TANH)) / sol.dist / (i < 3 ? 9 : 12))); }); }
    return sol;
  }

  /* s: what the page knows (see world.js); mode: 'orbit' | 'sky' */
  function update(s, dt, time, mode) {
    const A = s.top, B = s.system, Y = s.sys, focal = H / (2 * TANH);     // A, B: progress through the two orbit sections, running on past either end; Y: the opening and the system as the page drives them (sysmap.js)
    const dive = mode === 'orbit' ? ease((B.x - (B.len - DIVE_LEAD)) / DIVE_SPAN) : 0;
    const S = solve(Y), bh = mode === 'orbit' ? Y.bh : 0, nv = Y.nova;
    /* THE RING IS THE WARP. The first screen does not move: the mark's own orbit charges with light, the inside of it
       becomes a dark well that drags the light round and down, and everything falls INTO it on winding paths: the globe,
       the three bodies, the letters, the headline and the figures (the page's parts, sysmap.js). The ring goes last: it
       turns, tightens and implodes to a point, and the nova blows at that point. Then the newborn planet comes up out of it. */
    const fallG = clamp((bh - 0.04) / 0.8), fall = fallG * fallG, tiny = Math.max(0.01, 1 - fall * 0.99), back = span(nv, 0.5, 0.94), grown = span(nv, 0.6, 0.95);
    const rc = clamp((bh - 0.62) / 0.36), ringS = Math.max(0.012, 1 - rc * rc * 0.988), ringTurn = (16 * bh + 58 * rc * rc) * DEG;
    const assembly = lerp(tiny, 1, grown);                                // the size the globe is drawn at
    const kpx0 = R / Math.max(1, Y.slot.r);                               // world units to a pixel of the first screen
    /* the middle of the ring, in the world: the camera looks at it while the opening runs (so it stands still on the screen
       at the hole the page measured), and hands back to the globe's own place as the nova begins */
    shift.set((MK.cx - MK.gx) * Y.markW * kpx0, -(MK.cy - MK.gy) * Y.markW * kpx0, 0).applyQuaternion(heroQ).multiplyScalar(mode === 'orbit' ? 1 - span(nv, 0.02, 0.45) : 0);
    if (mode === 'sky') {
      const yaw = 2.2 + time * 0.006 + s.skyTurn * 0.5, pitch = 0.3; tmp.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      want.target.set(0, 2600, 600).addScaledVector(tmp, 1000); want.dir.copy(tmp).negate(); want.dist = 1000; want.ox = 0; want.oy = 0;
    } else {
      /* the mark → pulled away to the hole → the nova → the newborn planet low in the middle → up to its place in the system → the dive at Global */
      const E = Y.slots.enterprise, heroDist = distFor(Y.slot.r), k2 = span(nv, 0.58, 0.94), k3 = Y.pose;
      want.target.set(0, 0, 0);
      want.dir.copy(dirHero).lerp(dirDock, span(nv, 0.25, 0.9)).lerp(dirSys, k3).normalize();
      want.dist = Math.exp(lerp(Math.log(heroDist), Math.log(S.dist), back));
      want.ox = lerp(lerp(Y.hole.x, Y.dock.x, k2), E.x, k3) - W / 2; want.oy = lerp(lerp(Y.hole.y, Y.dock.y, k2), E.y, k3) - H / 2;
      if (dive > 0) { const g = worlds.global; tmp.copy(sunDir).multiplyScalar(0.7).add(tmp2.set(0.15, 0.1, 0.6)).normalize();
        want.target.lerp(g.group.position, smooth(dive * 2.4)); want.dir.lerp(tmp, dive).normalize();      /* the camera finds Global first, then closes on it */ want.dist = Math.exp(lerp(Math.log(want.dist), Math.log(g.R * g.size * 1.55), dive)); want.ox *= 1 - dive; want.oy *= 1 - dive; }
    }
    /* ease toward the pose; a change of view (or the first frame) lands at once */
    const k = snap ? 1 : 1 - Math.exp(-dt * (mode === 'orbit' && dive > 0 ? 7 : 5)); snap = false;
    cur.target.lerp(want.target, k); cur.dir.lerp(want.dir, k).normalize(); cur.dist += (want.dist - cur.dist) * k; cur.ox += (want.ox - cur.ox) * k; cur.oy += (want.oy - cur.oy) * k;
    tmp.copy(cur.target).add(shift); camera.position.copy(tmp).addScaledVector(cur.dir, cur.dist); camera.up.set(0, 1, 0); camera.lookAt(tmp);
    if (Math.abs(cur.ox) > 0.5 || Math.abs(cur.oy) > 0.5) camera.setViewOffset(W, H, -cur.ox, -cur.oy, W, H); else camera.clearViewOffset();
    camera.updateMatrixWorld(); right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);

    /* light: the sun where it always is */
    sunPos.copy(sunHome);
    key.position.copy(sunPos).normalize();

    /* the worlds: Enterprise always; each company at its place on its ring, the size its place asks for, once the story
       has reached it. The one the story is on (or the pointer, or a press) brightens; the others lose their colour. */
    const showSys = mode === 'orbit', lit = showSys ? Y.focus : null, kL = 1 - Math.exp(-dt * 7); let priming = false;
    ids.forEach(id => { const w = worlds[id];
      if (id !== 'enterprise') {
        if (!w.maps) w.maps = Object.values(w.uniforms).map(u => u.value).filter(v => v && v.isTexture);
        const there = showSys && w.maps.every(t => t.image) ? Y.world[id] : 0; w.k = showSys ? there : w.k + (0 - w.k) * (1 - Math.exp(-dt * 6));
        const p = S.worlds[id]; w.size = p.scale; w.group.position.set(p.x, 0, p.z); w.group.visible = w.k > 0.002;
        const pop = w.k < 1 ? 1 - Math.pow(1 - w.k, 3) + Math.sin(w.k * Math.PI) * 0.12 : 1; w.group.scale.setScalar(Math.max(0.0001, p.scale * pop));
        /* the first real draw of a world costs a long frame. So each is drawn once, tiny, out of sight inside Enterprise,
           while the opening is at rest (one world at a time), and not as its company arrives */
        if (!w.primed && !priming && showSys && w.k < 0.002 && bh < 0.01 && intro >= 1 && w.maps.every(t => t.image)) { priming = true; w.primeN = (w.primeN || 0) + 1; w.group.visible = true; w.group.position.set(0, 0, 0); w.group.scale.setScalar(0.1); if (w.primeN > 2) w.primed = true; }
      } else {
        w.size = mode === 'orbit' ? assembly : 1; w.group.scale.setScalar(Math.max(0.0001, w.size));
        /* the globe falls into the ring: round the middle on a winding, shrinking path (none of it once the nova has begun) */
        if (mode === 'orbit' && fall > 0 && fall < 1) { const rx = (MK.gx - MK.cx) * Y.markW * kpx0, ry = -(MK.gy - MK.cy) * Y.markW * kpx0, a = Math.atan2(ry, rx) + 2.3 * fall, d = Math.hypot(rx, ry) * (1 - fall);
          w.group.position.set(Math.cos(a) * d, Math.sin(a) * d, 0).applyQuaternion(heroQ).add(shift); }
        else if (mode === 'orbit' && fall >= 1) w.group.position.copy(shift); else w.group.position.set(0, 0, 0);
      }
      const on = !lit || lit.includes(id), bright = lit && on && id !== 'enterprise', sat = on ? (bright ? 1.1 : 1) : id === 'enterprise' ? 0.72 : 0.6, gain = on ? (bright ? 1.18 : 1) : id === 'enterprise' ? 0.88 : 0.8;   // the others lose most of their colour but stay worlds; Enterprise keeps more of its pink: it is what the others hang from
      w.sat += (sat - w.sat) * kL; w.gain += (gain - w.gain) * kL; w.look.sat.value = w.sat; w.look.gain.value = w.gain; w.update(dt, time); });
    ent.group.rotation.set(0, 0, entTilt);

    /* the mark's orbit, standing where the logo draws it on the first screen: it charges, turns, and implodes last */
    const rigK = mode === 'orbit' ? 1 - span(bh, 0.93, 1) : 0;
    rig.visible = rigK > 0.002 && intro > 0;
    if (rig.visible) {
      rig.quaternion.copy(heroQ).multiply(leanQ).multiply(turnQ.setFromAxisAngle(zAxis, ringTurn));
      rig.position.copy(shift); rig.scale.setScalar(MK.a * Y.markW * kpx0 * ringS);
      ringMat.uniforms.k.value = rigK; ringMat.uniforms.charge.value = Math.min(1.6, bh * bh + rc * 0.7); wellMat.uniforms.k.value = Math.min(1, bh * 1.5) * rigK; well.visible = bh > 0.004; ring.geometry.setDrawRange(0, Math.floor(RING_N * clamp(intro) / 3) * 3);
      /* the three bodies leave the ring one after another and wind in to the middle, faster as they go */
      bodies.forEach((b, i) => { const u = b.userData, pb = clamp((bh - 0.06 - i * 0.07) / 0.62), f2 = pb * pb, th = (u.at + Math.sin(time * (0.21 + i * 0.07) + i * 2.1) * 1.3 - bh * (60 + i * 30) - f2 * 220) * DEG, rr = 1 - f2;
        b.position.set(Math.cos(th) * rr, -Math.sin(th) * KY * rr, 0); const kk = clamp(introBodies * 3 - i) * rigK * (1 - f2); b.scale.setScalar(u.k * Math.max(0.0001, ease(kk)) / Math.max(0.05, ringS)); b.visible = kk > 0.002; b.w.update(dt, time); });
      rig.updateMatrixWorld();
    }
    /* the warp is the ring: inside it the light is dragged round and down into a dark mouth; the ring itself and the sky
       outside it are not bent (they only dim). Its place, size, shape and lean are read off the ring as drawn, so the warp
       tightens and goes with the ring when it implodes */
    out.lens.k = 0;
    if (rig.visible && mode === 'orbit' && bh > 0.004) {
      const o = out.hole; project(rig.position, o); project(tmp2.set(1, 0, 0).applyMatrix4(rig.matrixWorld), qa); project(tmp2.set(0, KY, 0).applyMatrix4(rig.matrixWorld), qb);
      const ra = Math.hypot(qa.x - o.x, qa.y - o.y), rb = Math.hypot(qb.x - o.x, qb.y - o.y); o.r = ra;
      out.lens.u = o.x / W; out.lens.v = 1 - o.y / H; out.lens.r = Math.max(2, ra) / H; out.lens.e = clamp(rb / Math.max(1, ra), 0.05, 1); out.lens.a = Math.atan2(-(qa.y - o.y), qa.x - o.x);
      out.lens.k = smooth(span(bh, 0.06, 0.46)) * (1 - span(bh, 0.95, 1));
    }
    out.heroOk = false;                                                   // the first screen's own sheet no longer moves: its parts fall in one by one (sysmap.js)

    { const gk = mode === 'orbit' ? span(nv, 0.6, 0.96) * (1 - span(dive, 0, 0.25)) : 0; glow.visible = gk > 0.004; if (glow.visible) { glow.material.opacity = gk * 0.5; glow.position.copy(ent.group.position); glow.scale.setScalar(R * ent.size * 5.2); } }
    /* the sky and the dust */
    stars.material.uniforms.time.value = time;
    space.update(dt, time, { map: 0, rings: 0, focus: cur.dist, blur: 0.3, belt: time * 0.0045 });
    space.fine.visible = false; space.dust.visible = true;

    /* the system's own drawing: rings, lanes, year marks, the nova */
    const pr = sys.frame(time, showSys ? Y.keep : null, H), sysK = mode === 'orbit' ? 1 - span(dive, 0.02, 0.3) : 0, e0 = out.worlds.enterprise;
    project(ent.group.position, e0); e0.r = R * ent.size * focal / Math.max(1, tmp2.copy(ent.group.position).sub(camera.position).dot(tmp.copy(cur.dir).negate())); e0.a = 1;
    sys.rings.forEach((r, i) => { const u = r.material.uniforms, lt = lit && Object.keys(SYS_WORLDS).some(id => SYS_WORLDS[id].ring === i && lit.includes(id)); u.draw.value = showSys ? Y.ring[i] : 0; u.k.value = sysK * (i < 3 ? (i === 0 ? 0.9 : 0.72) : 0.5) * (lit && !lt && !lit.includes('enterprise') ? 0.55 : 1) * (lt ? 1.3 : 1); r.visible = u.k.value > 0.004 && u.draw.value > 0.001; });
    let anyLane = false;
    sys.laneIds.forEach((id, l) => { const w = worlds[id], o = out.worlds[id]; project(w.group.position, o); const depth = tmp2.copy(w.group.position).sub(camera.position).dot(tmp.copy(cur.dir).negate()); o.r = w.R * w.size * focal / Math.max(1, depth); o.a = w.k;
      const on = !lit || lit.includes(id) || lit.includes('enterprise'), a = showSys ? sysK * (on ? 1 : 0.22) : 0; w.laneA = w.laneA === undefined ? a : w.laneA + (a - w.laneA) * kL;
      sys.lanes.lay(l, e0, o, showSys ? Y.lane[id] : 0, w.laneA, W, H, pr); if (w.laneA > 0.004 && Y.lane[id] > 0.002) anyLane = true; });
    sys.lanes.mesh.visible = anyLane; if (anyLane) sys.lanes.flush();
    YEARS.forEach((_, kq) => { const o = out.years[kq]; tmp2.set(S.years[kq].x, 0, S.years[kq].z); const ok = project(tmp2, o); o.a = ok && showSys ? Y.year[kq] * sysK : 0; });
    sys.streak.set(clamp((bh - 0.1) / 0.4), W, H, pr, Y.hole.x, Y.hole.y);      /* a meteor crosses the sky and goes into the ring */
    const nova = sys.nova; nova.visible = showSys && nv > 0.001 && nv < 0.999;
    if (!nova.visible && novaPrimed < 3 && showSys && intro >= 1 && bh < 0.01) { novaPrimed++; nova.visible = true; nova.material.uniforms.p.value = 0; }   /* drawn dark a few times at the start, for the same reason as the worlds */
    else if (nova.visible) { const u = nova.material.uniforms; u.p.value = nv; u.c0.value.set(Y.hole.x * pr, (H - Y.hole.y) * pr); u.c1.value.set(e0.x * pr, (H - e0.y) * pr); }

    out.dive = dive; out.focus = cur.dist;
  }

  return { scene, camera, update, resize, out, space, stars, worlds, sys,
    snap() { snap = true; }, setIntro(k, b) { intro = k; introBodies = b; }, setDpr(v) { stars.material.uniforms.pr.value = v; space.setDpr(v); },
    warm() { const vis = []; scene.traverse(o => { if (o.visible === false) { vis.push(o); o.visible = true; } }); ids.forEach(id => worlds[id].group.scale.setScalar(1)); ring.geometry.setDrawRange(0, RING_N); renderer.compile(scene, camera); vis.forEach(o => { o.visible = false; }); } };
}

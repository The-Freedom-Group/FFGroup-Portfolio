/* Space: the group's mark alive in three dimensions (the pink globe on its orbit, with the three bodies of the logo),
   which opens out into the whole Freedom system, then dives at Freedom Global. The same globe, close up, is the expansion
   map: nine pins and their routes home to Bury. And the same sky stands behind the night sheets.
   The camera never cuts inside this module: every view is a pose (what it looks at, from where, how far, and where on
   the screen that point sits) and the camera eases from pose to pose. */
import * as THREE from 'three';
import { WORLDS, RINGS, LIGHT_DIR } from './worlds.js';
import { makeWorld, makeStars } from './planets.js';
import { createSpace } from './space.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const span = (v, a, b) => smooth((v - a) / (b - a));
const ease = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const FOV = 40, TANH = Math.tan(FOV * Math.PI / 360), BIG = 1.75;      // BIG: how much larger than true scale the worlds are drawn once the system is open
const DEG = Math.PI / 180;

/* the mark's orbit, fitted to the logo artwork: an ellipse 0.5525 by 0.232 of the wordmark's width, leaning 55.4 degrees,
   the globe 74.5 degrees round from the top end, the three bodies at 7, 200 and 78.5 degrees. Here it is tipped away from
   the viewer (TIP) so it has a near and a far side, and squeezed (KY) so it still reads as the logo's ellipse head on. */
const LEAN = 55.4 * DEG, TIP = 50 * DEG, KY = 0.232 / 0.5525 / Math.cos(TIP), A_OF_W = 0.5525, GLOBE_AT = -74.5 * DEG; const GAP_AT = 112.5 * DEG;
const BODIES = [{ at: 7 * DEG, r: 0.09, c: 0x16c98d, e: 0x063d2a }, { at: 200 * DEG, r: 0.0735, c: 0x1c9bff, e: 0x06305c }, { at: 78.5 * DEG, r: 0.04, c: 0xff4a1e, e: 0x5a1205 }];

/* the nine territories: [longitude, latitude] of the place the pin stands on */
export const PINS = [[-2.3, 53.6], [19.4, 52], [4.5, 50.6], [12.5, 42], [35, 39], [114, 34], [74.5, 32.5], [121, 23.8], [101.7, 3.2]];
const onGlobe = (lon, lat, r) => V(Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.sin(lat * DEG), -Math.cos(lat * DEG) * Math.sin(lon * DEG)).multiplyScalar(r);

export function createOrbit({ renderer, small, dpr, spec }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030308);
  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.5, 22000); scene.add(camera);
  const sunDir = V(...LIGHT_DIR).normalize(), sunHome = sunDir.clone().multiplyScalar(6000), sunPos = sunHome.clone();
  const space = createSpace({ renderer, scene, camera, phone: small, dpr });
  const stars = makeStars(spec.stars, 8000, dpr); scene.add(stars);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5)); const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.copy(sunDir); scene.add(key);

  /* the worlds */
  const worlds = {}; const ids = Object.keys(WORLDS);
  ids.forEach(id => { const w = makeWorld(WORLDS[id], sunPos, { seg: small ? 96 : 144 }); w.group.position.set(...WORLDS[id].pos); w.home = V(...WORLDS[id].pos); w.k = id === 'enterprise' ? 1 : 0; scene.add(w.group); worlds[id] = w; });
  const ent = worlds.enterprise, R = ent.R, entTilt = WORLDS.enterprise.tilt;
  const entClouds = ent.spin.children.find(c => c.material && c.material.uniforms && c.material.uniforms.cloudTint);

  /* the mark's orbit: a tube that swells toward the globe and thins to nothing on the far side, and the three bodies on it */
  const rig = new THREE.Group(); scene.add(rig);
  const SEG = 360, RAD = 10, pos = [], col = [], nor = [], idx = [];
  const cThin = new THREE.Color(0xff8fd0), cMid = new THREE.Color(0xff2d8d), cDeep = new THREE.Color(0xc60f6e), cc = new THREE.Color();
  for (let i = 0; i <= SEG; i++) {
    /* as on the logo: thickest opposite the break, thinning to nothing where the orbit would cross the letters (97 to 128 degrees) */
    const th = GLOBE_AT + i / SEG * Math.PI * 2, f = Math.pow((1 + Math.cos(th - (GAP_AT - Math.PI))) / 2, 1.5), tr = lerp(0.0034, 0.027, f);
    const gap = Math.abs(((th - GAP_AT) + Math.PI * 3) % (Math.PI * 2) - Math.PI), alpha = smooth((gap - 14 * DEG) / (16 * DEG));
    f < 0.5 ? cc.copy(cThin).lerp(cMid, f * 2) : cc.copy(cMid).lerp(cDeep, (f - 0.5) * 2);
    const cx = Math.cos(th), cy = Math.sin(th);
    for (let j = 0; j < RAD; j++) { const a = j / RAD * Math.PI * 2, nx = Math.cos(a) * cx, ny = Math.cos(a) * cy, nz = Math.sin(a); pos.push(cx + nx * tr, cy * KY + ny * tr, nz * tr); nor.push(nx, ny, nz); col.push(cc.r, cc.g, cc.b, alpha); }
  }
  for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) { const a = i * RAD + j, b = i * RAD + (j + 1) % RAD, c = a + RAD, d = b + RAD; idx.push(a, c, b, b, c, d); }
  const ringGeo = new THREE.BufferGeometry(); ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ringGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); ringGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); ringGeo.setIndex(idx);
  const ringMat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 0.42, metalness: 0.05, emissive: 0xff2d8d, emissiveIntensity: 0.42 });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.frustumCulled = false; rig.add(ring); const RING_N = idx.length;
  const bodies = BODIES.map(b => { const m = new THREE.Mesh(new THREE.SphereGeometry(b.r, 48, 32), new THREE.MeshStandardMaterial({ color: b.c, roughness: 0.3, metalness: 0.05, emissive: b.e, emissiveIntensity: 1.2 })); m.userData = b; rig.add(m); return m; });

  /* the pins and their routes, on the globe */
  const pinGroup = new THREE.Group(); ent.spin.add(pinGroup); pinGroup.visible = false;
  const pinMat = (c) => new THREE.MeshBasicMaterial({ color: c });
  const pins = PINS.map(([lon, lat], i) => {
    const p = onGlobe(lon, lat, R * 1.004), g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 1, 0), p.clone().normalize()); pinGroup.add(g);
    const c = i === 5 ? 0x5fe0a0 : i === 0 ? 0xf4f1eb : 0xff2d8d;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.012, 16, 12), pinMat(c)); g.add(dot);
    const halo = new THREE.Mesh(new THREE.RingGeometry(R * 0.022, R * 0.027, 40), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })); halo.rotation.x = -Math.PI / 2; halo.position.y = R * 0.002; g.add(halo);
    let arc = null, n = 0;
    if (i > 0) { const a = onGlobe(lon, lat, 1), b = onGlobe(PINS[0][0], PINS[0][1], 1), ang = a.angleTo(b), lift = 0.02 + ang * 0.2, pts = [];
      for (let k = 0; k <= 48; k++) { const t = k / 48; pts.push(a.clone().lerp(b, t).normalize().multiplyScalar(R * (1.004 + Math.sin(t * Math.PI) * lift))); }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, R * 0.0032, 6, false); n = geo.index.count;
      arc = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 })); arc.geometry.setDrawRange(0, 0); pinGroup.add(arc); }
    return { g, dot, halo, arc, n, k: 0, lon, lat, local: p };
  });

  /* the ring that marks whichever company the story is on */
  const mark = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.035, 96), new THREE.MeshBasicMaterial({ color: 0xff2d8d, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, depthTest: false })); mark.renderOrder = 9; scene.add(mark);
  const mark2 = mark.clone(); mark2.material = mark.material.clone(); scene.add(mark2);

  /* ───────── poses ───────── */
  const cur = { target: V(), dir: V(0, 0.42, 1).normalize(), dist: 700, ox: 0, oy: 0 }, want = { target: V(), dir: V(), dist: 700, ox: 0, oy: 0 };
  const dirHero = V(0, 0.3, 1).normalize(), dirSysD = V(0, 0.66, 1).normalize(), dirSysP = V(0, 1.2, 1).normalize(), dirGlobe = V(0, 0.2, 1).normalize();
  const tmp = V(), tmp2 = V(), q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), e1 = V(), e2 = V(), e3 = V(), right = V(), up = V();
  let W = innerWidth, H = innerHeight, snap = true, intro = 0, introBodies = 0, sysCam = { t: V(), d: 1, az: 0 }, globeYaw = -Math.PI / 2 - PINS[0][0] * DEG, pinsOn = 0, mx = 0, my = 0, mxs = 0, mys = 0;
  const out = { labels: {}, pins: [], cover: 0 }; ids.forEach(id => { out.labels[id] = { x: 0, y: 0, a: 0 }; }); PINS.forEach(() => out.pins.push({ x: 0, y: 0, a: 0, left: false }));
  if (!small) addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; } }, { passive: true });

  function resize(w, h) { W = w; H = h; camera.aspect = w / h; camera.updateProjectionMatrix(); snap = true; }
  const distFor = rpx => R * H / (2 * Math.max(4, rpx) * TANH);            // how far back to stand for the globe to be rpx pixels in radius
  const project = (v, o) => { tmp.copy(v).project(camera); o.x = (tmp.x * 0.5 + 0.5) * W; o.y = (-tmp.y * 0.5 + 0.5) * H; return tmp.z < 1; };

  /* s: what the page knows (see world.js); mode: 'orbit' | 'sky' | 'globe' */
  function update(s, dt, time, mode) {
    const phone = W < 900, A = s.top, B = s.system;                       // A, B: progress through the two orbit sections, running on past either end
    mxs += (mx - mxs) * (1 - Math.exp(-dt * 3)); mys += (my - mys) * (1 - Math.exp(-dt * 3));
    /* how far the mark has opened into the system, and how far the dive has gone */
    const open = ease((A.x - 0.35) / 1.75), dive = mode === 'orbit' ? ease((B.pe - 0.875) / 0.26) : 0;
    /* the system is fitted to the room the page gives it */
    const sysDir = phone ? dirSysP : dirSysD, rm = s.room, rw = Math.max(160, rm.x1 - rm.x0), rh = Math.max(140, rm.y1 - rm.y0), wide = RINGS[2] * 2 + (phone ? 130 : 190), tall = RINGS[2] * 2 * sysDir.y + (phone ? 150 : 210);
    const sysDist = Math.max(wide * H / (2 * rw * TANH), tall * H / (2 * rh * TANH)), sox = (rm.x0 + rm.x1) / 2 - W / 2, soy = (rm.y0 + rm.y1) / 2 - H / 2 + (phone ? 6 : 14);
    if (mode === 'sky') {
      const yaw = 2.2 + time * 0.006 + s.skyTurn * 0.5, pitch = 0.3; tmp.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      want.target.set(0, 2600, 600).addScaledVector(tmp, 1000); want.dir.copy(tmp).negate(); want.dist = 1000; want.ox = 0; want.oy = 0;
    } else if (mode === 'globe') {
      const M = s.map, inn = span(M.pe, -1 / M.len, 0.05), outK = span(M.pe, 0.95, 1 + 0.8 / M.len);
      /* the globe is fitted to the room the page gives it */
      const g = s.globeRoom, rpx = Math.max(60, Math.min(g.x1 - g.x0, g.y1 - g.y0) * (phone ? 0.46 : 0.45));
      want.target.set(0, 0, 0); want.dir.copy(dirGlobe); want.dist = distFor(rpx) * (1 + outK * 2.2);
      want.ox = (g.x0 + g.x1) / 2 - W / 2; want.oy = (g.y0 + g.y1) / 2 - H / 2 + (1 - inn) * H * 0.75 - outK * H * 0.9;
    } else {
      /* the mark → the system → each stop → the dive at Global */
      const heroDist = distFor(s.slot.r), hx = s.slot.x - W / 2, hy = s.slot.y - H / 2;
      const st = s.sysStep > 0 ? s.sysWorlds.reduce((a, id) => a.add(worlds[id].home), V()).multiplyScalar(1 / s.sysWorlds.length) : V();
      const kS = 1 - Math.exp(-dt * 2.4); sysCam.t.lerp(tmp2.copy(st).multiplyScalar(0.42), kS); sysCam.d += ((s.sysStep > 0 ? 0.76 : 1) - sysCam.d) * kS; sysCam.az += ((s.sysStep > 0 ? Math.atan2(st.x, Math.max(120, st.z + 260)) * 0.5 : 0) - sysCam.az) * kS;
      tmp.copy(sysDir).applyAxisAngle(V(0, 1, 0), sysCam.az + mxs * 0.05);
      want.dir.copy(dirHero).lerp(tmp, open).normalize(); want.target.copy(sysCam.t).multiplyScalar(open);
      want.dist = Math.exp(lerp(Math.log(heroDist), Math.log(sysDist * sysCam.d), open));
      want.ox = lerp(hx, sox, open); want.oy = lerp(hy, soy, open);
      if (dive > 0) { const g = worlds.global; tmp.copy(sunDir).multiplyScalar(0.7).add(tmp2.set(0.15, 0.1, 0.6)).normalize();
        want.target.lerp(g.home, dive); want.dir.lerp(tmp, dive).normalize(); want.dist = Math.exp(lerp(Math.log(want.dist), Math.log(g.R * BIG * 1.55), dive)); want.ox *= 1 - dive; want.oy *= 1 - dive; }
    }
    /* ease toward the pose; a change of view (or the first frame) lands at once */
    const k = snap ? 1 : 1 - Math.exp(-dt * (mode === 'orbit' && dive > 0 ? 7 : 5)); snap = false;
    cur.target.lerp(want.target, k); cur.dir.lerp(want.dir, k).normalize(); cur.dist += (want.dist - cur.dist) * k; cur.ox += (want.ox - cur.ox) * k; cur.oy += (want.oy - cur.oy) * k;
    camera.position.copy(cur.target).addScaledVector(cur.dir, cur.dist); camera.up.set(0, 1, 0); camera.lookAt(cur.target);
    if (mode === 'orbit' && open < 0.5) camera.position.addScaledVector(right.setFromMatrixColumn(camera.matrix, 0), -mxs * cur.dist * 0.035 * (1 - open * 2)), camera.lookAt(cur.target);
    if (Math.abs(cur.ox) > 0.5 || Math.abs(cur.oy) > 0.5) camera.setViewOffset(W, H, -cur.ox, -cur.oy, W, H); else camera.clearViewOffset();
    camera.updateMatrixWorld(); right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);

    /* light: the sun where it always is, except at the map, where it stands over the viewer's shoulder */
    if (mode === 'globe') sunPos.copy(camera.position).addScaledVector(right, -cur.dist * 0.55).addScaledVector(up, cur.dist * 0.45).sub(cur.target).normalize().multiplyScalar(6000).add(cur.target); else sunPos.copy(sunHome);
    key.position.copy(sunPos).normalize();

    /* the worlds: only the globe at the mark; the rest arrive as the system opens; none at the map */
    const showSys = mode === 'orbit';
    ids.forEach((id, i) => { const w = worlds[id]; if (id !== 'enterprise') { if (!w.maps) w.maps = Object.values(w.uniforms).map(u => u.value).filter(v => v && v.isTexture); const target = showSys && w.maps.every(t => t.image) ? span(A.x, 0.9 + i * 0.09, 1.5 + i * 0.09) : 0; w.k += (target - w.k) * (snapK(dt)); w.group.visible = w.k > 0.002; w.group.scale.setScalar(Math.max(0.0001, w.k * BIG)); } else w.group.scale.setScalar(mode === 'orbit' ? lerp(1, BIG, open) : 1); w.update(dt, time); });
    if (mode === 'globe') { ent.group.rotation.set(0.5, 0, 0.08); const yawTo = s.pin >= 0 ? -Math.PI / 2 - PINS[s.pin][0] * DEG + (W < 900 ? 0 : 0.12) : -Math.PI / 2 - 20 * DEG; let d = yawTo - globeYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); globeYaw += d * (1 - Math.exp(-dt * 2.6)); ent.spin.rotation.y = globeYaw; }
    else { ent.group.rotation.set(0, 0, entTilt); globeYaw = ent.spin.rotation.y; }
    if (entClouds) entClouds.visible = mode !== 'globe';

    /* the mark's orbit: set in the camera's own frame so it sits round the wordmark, the globe on it */
    const rigK = mode === 'orbit' ? 1 - span(A.x, 0.5, 1.25) : 0; rig.visible = rigK > 0.002 && intro > 0;
    if (rig.visible) {
      const Ar = A_OF_W * s.markW * R / Math.max(1, s.slot.r);                               // the orbit's radius in world units, from the wordmark's width on screen at the globe's scale
      const cr = Math.cos(LEAN), sr = Math.sin(LEAN), ct = Math.cos(TIP), stp = Math.sin(TIP);
      e1.set(cr, sr, 0); e2.set(-sr * ct, cr * ct, -stp); e3.crossVectors(e1, e2);
      m4.makeBasis(e1, e2, e3); q.setFromRotationMatrix(m4); rig.quaternion.copy(camera.quaternion).multiply(q);
      tmp.set(Math.cos(GLOBE_AT), Math.sin(GLOBE_AT) * KY, 0).multiplyScalar(-Ar).applyQuaternion(rig.quaternion); rig.position.copy(ent.group.position).add(tmp); rig.scale.setScalar(Ar * (1 + (1 - rigK) * 0.5));
      ringMat.opacity = rigK; ring.geometry.setDrawRange(0, Math.floor(RING_N * clamp(intro) / 3) * 3);
      bodies.forEach((b, i) => { const u = b.userData, th = u.at + Math.sin(time * (0.21 + i * 0.07) + i * 2.1) * 0.07; b.position.set(Math.cos(th), Math.sin(th) * KY, 0); const kk = clamp(introBodies * 3 - i) * rigK; b.scale.setScalar(Math.max(0.0001, ease(kk))); b.rotation.y += dt * 0.4; });
    }

    /* the sky and the dust */
    stars.material.uniforms.time.value = time;
    space.update(dt, time, { map: mode === 'orbit' ? open * (1 - dive) : 0, rings: mode === 'orbit' ? open * (1 - dive) : 0, focus: cur.dist, blur: 0.3, belt: time * 0.0045 });
    space.fine.visible = mode === 'orbit'; space.dust.visible = mode !== 'globe';

    /* the marker round the company the story is on */
    const act = mode === 'orbit' && s.sysStep >= 0 && open > 0.9 && dive < 0.2 ? s.sysWorlds : [];
    [mark, mark2].forEach((m, i) => { const id = act[i], w = id && worlds[id]; const a = w ? 0.85 * (1 - dive * 5) : 0; if (mode !== 'orbit') m.material.opacity = 0; m.material.opacity += (a - m.material.opacity) * (1 - Math.exp(-dt * 6));
      if (w) { m.position.copy(w.home); m.quaternion.copy(camera.quaternion); const pulse = 1 + Math.sin(time * 2.2) * 0.03; m.scale.setScalar(w.R * BIG * (id === 'form' ? 2.7 : id === 'fuel' ? 2.3 : 1.55) * pulse); } m.visible = m.material.opacity > 0.01; });

    /* where the names go */
    const labK = mode === 'orbit' ? span(A.x, 1.7, 2.2) * (1 - span(B.pe, 0.86, 0.9)) : 0;
    ids.forEach(id => { const w = worlds[id], o = out.labels[id]; if (labK < 0.01 || w.k < 0.5) { o.a = 0; return; } tmp2.copy(w.home).addScaledVector(up, w.R * BIG * (id === 'form' ? 1.7 : 1.3) + cur.dist * 0.012); const ok = project(tmp2, o); o.a = ok ? labK : 0; });

    /* the map's pins: in view when they face the viewer; their routes draw as the story reaches them */
    pinGroup.visible = mode === 'globe'; pinsOn += ((mode === 'globe' ? 1 : 0) - pinsOn) * (1 - Math.exp(-dt * 4));
    if (mode === 'globe') pins.forEach((p, i) => {
      const reached = s.pin >= i || i === 0; p.k += ((reached ? 1 : 0) - p.k) * (1 - Math.exp(-dt * 2.2));
      if (p.arc) { p.arc.geometry.setDrawRange(0, Math.floor(p.n * p.k / 3) * 3); p.arc.material.opacity = s.pin === i ? 0.95 : 0.4; }
      const on = s.pin === i; p.dot.scale.setScalar(on ? 1.7 : 1); const u = (time * 0.6 + i * 0.37) % 1; p.halo.scale.setScalar(on ? 1 + u * 2.4 : 1); p.halo.material.opacity = on ? (1 - u) * 0.95 : 0.55;
      tmp2.copy(p.local); p.g.parent.localToWorld(tmp2); const o = out.pins[i]; const facing = tmp.copy(tmp2).sub(ent.group.position).normalize().dot(e1.copy(camera.position).sub(tmp2).normalize());
      const ok = project(tmp2, o); const cxp = W / 2 + cur.ox; o.left = o.x < cxp; o.x += o.left ? -12 : 12; o.a = ok ? clamp((facing - 0.12) * 6) * pinsOn * (W < 900 ? (on ? 1 : 0) : 1) : 0;
    }); else out.pins.forEach(o => { o.a = 0; });
    out.dive = dive; out.focus = cur.dist;
  }
  const snapK = dt => 1 - Math.exp(-dt * 6);

  return { scene, camera, update, resize, out, space, stars, worlds,
    snap() { snap = true; }, setIntro(k, b) { intro = k; introBodies = b; }, setDpr(v) { stars.material.uniforms.pr.value = v; space.setDpr(v); },
    warm() { const vis = []; scene.traverse(o => { if (o.visible === false) { vis.push(o); o.visible = true; } }); ids.forEach(id => worlds[id].group.scale.setScalar(1)); ring.geometry.setDrawRange(0, RING_N); pins.forEach(p => p.arc && p.arc.geometry.setDrawRange(0, p.n)); renderer.compile(scene, camera); vis.forEach(o => { o.visible = false; }); } };
}

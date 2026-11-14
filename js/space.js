/* The space round the worlds.
   - The sky: the real Milky Way (Solar System Scope, CC BY 4.0) under a nebula baked once at start into a panorama: hydrogen
     glows pink (H-alpha is the colour of the brand's pink, which is why emission nebulae photograph that way), threaded
     with dark dust lanes that also dim the Milky Way behind them.
   - Dust: two layers of points. Near the camera, a field that wraps round it wherever it goes, each mote drawn as a soft
     disc sized by how far it is from the focus, so the ones that pass close are big, faint and out of focus; and through
     the system, fine glittering dust concentrated in the belt and along the rings, drifting with the belt.
   - The rings: each a circle of round dots, a constant few pixels across at any distance, flowing slowly round; brighter on
     the map. Every operating world sits on one. */
import * as THREE from 'three';
import { RINGS } from './worlds.js';
import { mapTex } from './planets.js';
import { GLSL_NOISE, rnd } from './util.js';

const BAKE_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BAKE_FS = `varying vec2 vUv;` + GLSL_NOISE + `
vec3 dirOf(vec2 uv){ float lon = (uv.x - 0.5) * 6.2831853, lat = (uv.y - 0.5) * 3.1415927; return vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon)); }
void main(){
  vec3 d = dirOf(vUv);
  vec3 bandN = normalize(vec3(0.32, 0.9, -0.28));                     // the plane the nebula lies along
  float b = dot(d, bandN); float band = exp(-b * b / 0.09); float wide = exp(-b * b / 0.5);
  vec3 q = d * 2.2;
  vec3 w = vec3(fbm(q + 3.1), fbm(q + 7.7), fbm(q + 12.9));            // domain warp: the filaments
  float n = fbm(q * 1.5 + w * 2.2);
  float fine = fbm(q * 5.0 + w * 1.4);
  float glow = smoothstep(0.42, 0.9, n) * (0.15 + band * 1.1 + wide * 0.25);
  glow *= 0.65 + 0.7 * fine;
  float clump = smoothstep(0.55, 0.95, fbm(q * 0.7 + 21.0)); glow *= 0.4 + clump * 1.4;   // a few brighter clouds, not an even sheet
  float lanes = smoothstep(0.5, 0.72, fbm(q * 3.1 + w * 2.6 + 40.0)) * (band * 0.9 + wide * 0.2);
  vec3 deep = vec3(0.30, 0.012, 0.09), pink = vec3(1.0, 0.16, 0.42), hot = vec3(1.0, 0.62, 0.68);
  vec3 col = mix(deep, pink, smoothstep(0.0, 0.6, glow)); col = mix(col, hot, smoothstep(0.75, 1.3, glow) * 0.5);
  col *= glow * 0.11;
  col *= 1.0 - lanes * 0.85;
  gl_FragColor = vec4(col, clamp(lanes, 0.0, 1.0));
}`;
const SKY_VS = `varying vec3 vD; varying vec2 vUv; void main(){ vUv = uv; vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FS = `varying vec3 vD; varying vec2 vUv; uniform sampler2D milky; uniform sampler2D neb; uniform float milkyK; uniform float nebK; uniform mat3 rot;
void main(){
  vec3 m = texture2D(milky, vUv).rgb;
  vec3 d = normalize(rot * vD); vec2 eq = vec2(atan(d.x, d.z) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5);
  vec4 n = texture2D(neb, eq);
  vec3 col = m * m * milkyK * (1.0 - n.a * 0.8) + n.rgb * nebK;
  gl_FragColor = vec4(col, 1.0);
}`;

/* dust near the camera: positions wrap inside a box that follows the camera */
const DUST_VS = `attribute float size; attribute float tw; attribute vec3 tint; uniform vec3 camPos; uniform float box; uniform float time; uniform float pr; uniform float focus; uniform float blur; uniform float vh;
varying float vA; varying vec3 vC; varying float vSoft;
void main(){
  vec3 rel = mod(position - camPos + box * 0.5 + vec3(time * 0.6, time * 0.15, time * 0.4), box) - box * 0.5;
  vec4 mv = viewMatrix * vec4(camPos + rel, 1.0); float z = -mv.z;
  float edge = 1.0 - smoothstep(box * 0.3, box * 0.5, length(rel));
  float coc = abs(z - focus) / max(z, 0.1) * blur;                     // how out of focus, as a camera would see it
  float px = size * pr * vh / max(z, 0.5) * 0.02;                      // its true size on screen
  float d = max(px, 1.2 * pr) + coc * 26.0 * pr;
  d = min(d, 120.0 * pr);
  vA = edge * (0.55 + 0.45 * sin(time * (0.8 + tw * 1.7) + tw * 40.0)) * min(1.0, (1.6 * pr * 1.6 * pr) / (d * d) * 2.4 + 0.035) * smoothstep(0.4, 2.0, z);
  vC = tint; vSoft = clamp(coc * 1.4, 0.0, 1.0);
  gl_PointSize = d; gl_Position = projectionMatrix * mv;
}`;
const DUST_FS = `varying float vA; varying vec3 vC; varying float vSoft;
void main(){ vec2 p = gl_PointCoord - 0.5; float r = length(p) * 2.0; if (r > 1.0) discard;
  float core = pow(1.0 - r, 2.0); float disc = smoothstep(1.0, 0.82, r) * (0.55 + 0.45 * smoothstep(0.55, 0.95, r)); // in focus a speck, out of focus a disc with a brighter rim
  float a = mix(core, disc, vSoft) * vA;
  gl_FragColor = vec4(vC * a, a); }`;

/* fine dust through the system: static positions, the belt's turning with it */
const FINE_VS = `attribute float size; attribute float tw; attribute vec3 tint; attribute float belt; uniform float time; uniform float pr; uniform float spin; uniform float vh;
varying float vA; varying vec3 vC;
void main(){
  float a = spin * belt; float c = cos(a), s = sin(a); vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); float z = -mv.z;
  float px = size * pr * vh / max(z, 1.0) * 0.02;
  float d = max(px, 1.0 * pr);
  vA = (0.45 + 0.55 * sin(time * (0.5 + tw * 2.0) + tw * 30.0)) * min(1.0, px / (1.0 * pr) * 0.9 + 0.25) * smoothstep(1.0, 8.0, z);
  vC = tint; gl_PointSize = min(d, 6.0 * pr); gl_Position = projectionMatrix * mv;
}`;
const FINE_FS = `varying float vA; varying vec3 vC; uniform float k;
void main(){ vec2 p = gl_PointCoord - 0.5; float r = length(p) * 2.0; if (r > 1.0) discard; float a = pow(1.0 - r, 1.6) * vA * k; gl_FragColor = vec4(vC * a, a); }`;

/* the dotted rings */
const RING_VS = `attribute float ang; uniform float R; uniform float time; uniform float flow; uniform float pr; uniform float px; varying float vZ;
void main(){ float a = ang + time * flow; vec3 p = vec3(cos(a) * R, 0.0, sin(a) * R);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); vZ = -mv.z; gl_PointSize = px * pr; gl_Position = projectionMatrix * mv; }`;
const RING_FS = `uniform vec3 colour; uniform float k; varying float vZ;
void main(){ vec2 p = gl_PointCoord - 0.5; float r = length(p) * 2.0; float a = smoothstep(1.0, 0.55, r) * k * smoothstep(2.0, 30.0, vZ); if (a < 0.003) discard; gl_FragColor = vec4(colour * a, a); }`;

export function createSpace({ renderer, scene, camera, phone, dpr }) {
  const group = new THREE.Group(); scene.add(group);

  /* the nebula, baked once */
  const W = phone ? 1024 : 2048; const bakeRT = new THREE.WebGLRenderTarget(W, W / 2, { type: THREE.HalfFloatType, depthBuffer: false });
  bakeRT.texture.wrapS = THREE.RepeatWrapping; bakeRT.texture.generateMipmaps = false; bakeRT.texture.minFilter = THREE.LinearFilter;
  { const s = new THREE.Scene(); const m = new THREE.ShaderMaterial({ vertexShader: BAKE_VS, fragmentShader: BAKE_FS, depthTest: false, depthWrite: false });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; s.add(q);
    const prev = renderer.getRenderTarget(); renderer.setRenderTarget(bakeRT); renderer.render(s, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)); renderer.setRenderTarget(prev);
    m.dispose(); q.geometry.dispose(); }
  const skyRot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.35, 0.8, 0.2)));
  const skyMat = new THREE.ShaderMaterial({ uniforms: { milky: { value: mapTex('milkyway') }, neb: { value: bakeRT.texture }, milkyK: { value: 0.7 }, nebK: { value: 1.9 }, rot: { value: skyRot } },
    vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), skyMat); sky.rotation.set(0.35, 0.8, 0.2); sky.renderOrder = -3; sky.frustumCulled = false; group.add(sky);

  /* dust near the camera */
  const DN = phone ? 1400 : 3600; const BOX = 140;
  const dPos = new Float32Array(DN * 3), dSize = new Float32Array(DN), dTw = new Float32Array(DN), dTint = new Float32Array(DN * 3);
  const warm = [1.0, 0.93, 0.86], pinkT = [1.0, 0.42, 0.68], cool = [0.82, 0.86, 0.95];
  for (let i = 0; i < DN; i++) { dPos.set([(rnd() - 0.5) * BOX, (rnd() - 0.5) * BOX, (rnd() - 0.5) * BOX], i * 3); dSize[i] = 0.05 + Math.pow(rnd(), 3) * 0.35; dTw[i] = rnd(); const r = rnd(); dTint.set(r < 0.62 ? warm : r < 0.84 ? pinkT : cool, i * 3); }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3)); dGeo.setAttribute('size', new THREE.BufferAttribute(dSize, 1)); dGeo.setAttribute('tw', new THREE.BufferAttribute(dTw, 1)); dGeo.setAttribute('tint', new THREE.BufferAttribute(dTint, 3));
  const dustMat = new THREE.ShaderMaterial({ uniforms: { camPos: { value: new THREE.Vector3() }, box: { value: BOX }, time: { value: 0 }, pr: { value: dpr }, focus: { value: 60 }, blur: { value: 0.3 }, vh: { value: innerHeight }, k: { value: 1 } },
    vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dGeo, dustMat); dust.frustumCulled = false; dust.renderOrder = 5; group.add(dust);

  /* fine dust through the system: the belt, the rings and a thin haze in the plane */
  const FN = phone ? 7000 : 20000;
  const fPos = new Float32Array(FN * 3), fSize = new Float32Array(FN), fTw = new Float32Array(FN), fTint = new Float32Array(FN * 3), fBelt = new Float32Array(FN);
  const gold = [1.0, 0.82, 0.6], white = [0.95, 0.94, 0.92], rose = [1.0, 0.5, 0.72];
  for (let i = 0; i < FN; i++) {
    const u = rnd(); let r, y, belt = 0;
    if (u < 0.55) { r = 262 + Math.pow(rnd(), 0.9) * 76 + (rnd() - 0.5) * 30; y = (rnd() - 0.5) * 18 * (1 + rnd()); belt = 1; }                  // the belt
    else if (u < 0.85) { const ring = RINGS[Math.floor(rnd() * RINGS.length)]; r = ring + (rnd() - 0.5) * 14 * (0.3 + rnd()); y = (rnd() - 0.5) * 5; }  // along the rings
    else { r = 40 + rnd() * 480; y = (rnd() - 0.5) * 40 * rnd(); }                                                                                    // a thin haze
    const a = rnd() * Math.PI * 2; fPos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    fSize[i] = 0.12 + Math.pow(rnd(), 4) * 0.9; fTw[i] = rnd(); const c = rnd(); fTint.set(c < 0.5 ? gold : c < 0.85 ? white : rose, i * 3); fBelt[i] = belt;
  }
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3)); fGeo.setAttribute('size', new THREE.BufferAttribute(fSize, 1)); fGeo.setAttribute('tw', new THREE.BufferAttribute(fTw, 1)); fGeo.setAttribute('tint', new THREE.BufferAttribute(fTint, 3)); fGeo.setAttribute('belt', new THREE.BufferAttribute(fBelt, 1));
  const fineMat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, pr: { value: dpr }, spin: { value: 0 }, vh: { value: innerHeight }, k: { value: 0.8 } },
    vertexShader: FINE_VS, fragmentShader: FINE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const fine = new THREE.Points(fGeo, fineMat); fine.frustumCulled = false; fine.renderOrder = 4; group.add(fine);

  /* the dotted rings */
  const rings = RINGS.map((R, i) => {
    const n = Math.round(R * 1.35); const ang = new Float32Array(n), pos = new Float32Array(n * 3); for (let k = 0; k < n; k++) ang[k] = k / n * Math.PI * 2;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ang', new THREE.BufferAttribute(ang, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { R: { value: R }, time: { value: 0 }, flow: { value: (i % 2 ? -1 : 1) * 0.004 }, pr: { value: dpr }, px: { value: 2.6 }, colour: { value: new THREE.Color(i === 0 ? 0xff5aa8 : 0xd9dee8) }, k: { value: 0.3 } },
      vertexShader: RING_VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 3; group.add(pts); return pts;
  });

  let ringK = 0;
  /* fx: { map 0..1, rings 0..1 (off for the opening), focus, blur, belt angle } */
  function update(dt, time, fx) {
    dustMat.uniforms.time.value = time; dustMat.uniforms.camPos.value.copy(camera.position); dustMat.uniforms.vh.value = innerHeight;
    dustMat.uniforms.focus.value = fx.focus || 60; dustMat.uniforms.blur.value = fx.blur === undefined ? 0.3 : fx.blur;
    fineMat.uniforms.time.value = time; fineMat.uniforms.spin.value = fx.belt || 0; fineMat.uniforms.vh.value = innerHeight;
    ringK += ((fx.rings === undefined ? 1 : fx.rings) - ringK) * (1 - Math.pow(0.1, dt));
    rings.forEach(r => { const u = r.material.uniforms; u.time.value = time; u.k.value = (0.22 + fx.map * 0.6) * ringK; u.px.value = 2.4 + fx.map * 0.8; });
  }
  function setDpr(v) { dustMat.uniforms.pr.value = v; fineMat.uniforms.pr.value = v; rings.forEach(r => { r.material.uniforms.pr.value = v; }); }
  return { group, sky, dust, fine, rings, update, setDpr, warmList: [sky, dust, fine, ...rings] };
}

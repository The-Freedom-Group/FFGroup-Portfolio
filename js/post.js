/* The finish on every frame, as a film camera would give it. The scene is drawn into a linear high-range target with its
   depth; then
   - bloom: the bright parts are pulled out with a soft knee and spread through a chain of half-size targets (a dual
     filter: four taps down, a tent up), so highlights bleed the way they do on a lens;
   - depth of field: a circle of confusion from the depth (thin lens: how far each point is from the focus distance, over
     its own distance), and a gather blur at half size on a golden-angle spiral, weighted so sharp things do not bleed onto
     blurred ones; the far blur is capped, so the stars soften but never vanish;
   - the grade: exposure, a filmic curve (ACES), a gentle split tone (cool shadows, warm porcelain highlights), a touch of
     saturation in the mids, lens fringing that grows toward the edges, a vignette, and fine animated grain that also
     breaks up banding in the dark gradients.
   Phones get the same grade with a shorter bloom chain and no depth of field. */
import * as THREE from 'three';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/* bloom: prefilter (soft threshold) into half size */
const PRE_FS = `varying vec2 vUv; uniform sampler2D src; uniform vec2 texel; uniform float threshold; uniform float knee;
void main(){
  vec3 c = vec3(0.0);
  c += texture2D(src, vUv + texel * vec2(-1.0, -1.0)).rgb; c += texture2D(src, vUv + texel * vec2(1.0, -1.0)).rgb;
  c += texture2D(src, vUv + texel * vec2(-1.0, 1.0)).rgb; c += texture2D(src, vUv + texel * vec2(1.0, 1.0)).rgb; c *= 0.25;
  c = min(c, vec3(60.0));
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - threshold + knee, 0.0, 2.0 * knee); soft = soft * soft / (4.0 * knee + 1e-4);
  float w = max(soft, br - threshold) / max(br, 1e-4);
  gl_FragColor = vec4(c * w, 1.0);
}`;
/* dual filter: down (centre + four diagonals) and up (a tent of eight) */
const DOWN_FS = `varying vec2 vUv; uniform sampler2D src; uniform vec2 texel;
void main(){ vec2 h = texel * 0.5;
  vec3 c = texture2D(src, vUv).rgb * 4.0;
  c += texture2D(src, vUv - h).rgb; c += texture2D(src, vUv + h).rgb; c += texture2D(src, vUv + vec2(h.x, -h.y)).rgb; c += texture2D(src, vUv - vec2(h.x, -h.y)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0); }`;
const UP_FS = `varying vec2 vUv; uniform sampler2D src; uniform sampler2D base; uniform vec2 texel; uniform float mixK;
void main(){ vec2 h = texel * 0.5;
  vec3 c = texture2D(src, vUv + vec2(-h.x * 2.0, 0.0)).rgb + texture2D(src, vUv + vec2(-h.x, h.y)).rgb * 2.0 + texture2D(src, vUv + vec2(0.0, h.y * 2.0)).rgb + texture2D(src, vUv + vec2(h.x, h.y)).rgb * 2.0
         + texture2D(src, vUv + vec2(h.x * 2.0, 0.0)).rgb + texture2D(src, vUv + vec2(h.x, -h.y)).rgb * 2.0 + texture2D(src, vUv + vec2(0.0, -h.y * 2.0)).rgb + texture2D(src, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
  c /= 12.0;
  gl_FragColor = vec4(texture2D(base, vUv).rgb + c * mixK, 1.0); }`;

/* depth of field: half-size colour with the circle of confusion in alpha, then the gather */
const COC_FS = `varying vec2 vUv; uniform sampler2D src; uniform sampler2D depth; uniform vec2 texel; uniform float near; uniform float far; uniform float focus; uniform float aperture; uniform float maxFar;
float lin(float d){ return near * far / (far - d * (far - near)); }
float coc(vec2 uv){ float z = lin(texture2D(depth, uv).x); float c = (z - focus) / z * aperture; return c > 0.0 ? min(c, maxFar) : max(c, -1.0); }
void main(){
  vec3 c = vec3(0.0); float k = 0.0; float cn = 1e3; // the colour averaged, the most negative (nearest) circle kept so near blur spreads
  for (int i = 0; i < 4; i++) { vec2 o = vec2(i == 0 || i == 2 ? -0.5 : 0.5, i < 2 ? -0.5 : 0.5) * texel; c += texture2D(src, vUv + o).rgb; float q = coc(vUv + o); k += q; cn = min(cn, q); }
  c *= 0.25; k *= 0.25; if (cn < k) k = mix(k, cn, 0.7);
  gl_FragColor = vec4(min(c, vec3(40.0)), k);
}`;
const BLUR_FS = `varying vec2 vUv; uniform sampler2D src; uniform vec2 texel; uniform float radius;
const float GA = 2.39996323;
void main(){
  vec4 ctr = texture2D(src, vUv); float cc = abs(ctr.a);
  vec3 acc = ctr.rgb; float wsum = 1.0;
  for (int i = 1; i < TAPS; i++) {
    float fi = float(i); float r = sqrt(fi / float(TAPS)); float a = fi * GA;
    float d = r * cc;                                            // how far out this tap is, in units of the largest blur
    vec4 s = texture2D(src, vUv + vec2(cos(a), sin(a)) * d * radius * texel);
    // a tap counts only if its own blur reaches this far, so a sharp thing never smears onto the blurred ground round it
    float w = smoothstep(d - 0.08, d + 0.001, abs(s.a));
    acc += s.rgb * w; wsum += w;
  }
  gl_FragColor = vec4(acc / wsum, cc);
}`;

/* the final grade, straight to the screen */
const FINAL_FS = `varying vec2 vUv; uniform sampler2D src; uniform sampler2D bloom; uniform sampler2D dof; uniform float useDof; uniform float useBloom;
uniform float bloomK; uniform float exposure; uniform float time; uniform float grain; uniform float vignette; uniform float fringe; uniform float aspect; uniform float lift; uniform float warp;
uniform vec2 lensC; uniform float lensR; uniform float lensK; uniform float lensE; uniform float lensA;
// the same filmic curve three.js uses (ACES fitted, with its input and output matrices), so the calibration matches
vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c){
  const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUTM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c /= 0.6; c = IN * c; c = rrt(c); c = OUTM * c; return clamp(c, 0.0, 1.0); }
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 c = vUv - 0.5; vec2 cq = c * vec2(aspect, 1.0); float r2 = dot(cq, cq);
  vec2 uv = vUv + c * warp * r2 * 0.6;                                  // a little barrel warp in the rush of a jump
  /* the warp is the mark's ring. Worked out in the ring's own frame (its long axis lensA, its short axis lensE of the
     long one, lensR long), where the ring is the unit circle: inside it the light is dragged round and pulled down into a
     dark mouth, most at the middle; the ring itself and the sky outside it are not bent, only dimmed */
  float hole = 1.0;
  if (lensK > 0.001) {
    vec2 d = (uv - lensC) * vec2(aspect, 1.0), ax = vec2(cos(lensA), sin(lensA)), ay = vec2(-ax.y, ax.x);
    float E = max(lensE, 0.05), Rr = max(lensR, 1e-4);
    vec2 q = vec2(dot(d, ax), dot(d, ay) / E) / Rr; float f = length(q) + 1e-5;
    float inside = 1.0 - smoothstep(0.7, 0.92, f), deep = clamp(1.0 - f, 0.0, 1.0);
    float sw = -lensK * inside * (1.1 + 3.6 * deep * deep); float cs = cos(sw), sn = sin(sw); q = vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs);
    q *= 1.0 + lensK * inside * 0.6 * deep;
    hole = 1.0 - lensK * 0.94 * (1.0 - smoothstep(0.05, 0.16 + 0.5 * lensK, f));            /* its mouth: no light comes back out of the middle */
    hole *= 1.0 - lensK * 0.42 * smoothstep(1.15, 2.8, f);                                       /* the sky round it dims as it feeds */
    uv = lensC + (ax * q.x + ay * q.y * E) * Rr / vec2(aspect, 1.0);
  }
  vec2 fo = c * (fringe * (0.25 + r2 * 1.6));                          // lens fringing, stronger at the edges
  vec3 col = vec3(texture2D(src, uv - fo).r, texture2D(src, uv).g, texture2D(src, uv + fo).b);
  if (useDof > 0.5) { vec4 b = texture2D(dof, uv); float k = smoothstep(0.08, 0.6, b.a); col = mix(col, b.rgb, k); }
  if (useBloom > 0.5) col += texture2D(bloom, uv).rgb * bloomK;
  col *= exposure * hole;
  col = aces(col);
  col = mix(col * 12.92, 1.055 * pow(max(col, 1e-6), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));   // to the screen's sRGB here, so the grade and grain work in what the eye sees
  // split tone: faintly cool shadows, warm porcelain highlights; a little more colour in the mids; blacks deep but not crushed
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col += vec3(-0.004, -0.002, 0.006) * (1.0 - smoothstep(0.0, 0.3, l)) + vec3(0.012, 0.005, -0.01) * smoothstep(0.5, 1.0, l);
  col = mix(vec3(l), col, 1.05);
  col = max(col, 0.0) * (1.0 - lift) + lift;
  float vig = smoothstep(1.25, 0.25, length(c * vec2(aspect * 0.82, 1.0)) * 1.12); col *= mix(1.0, vig, vignette);
  float g = hash(gl_FragCoord.xy + fract(time * 7.13) * 917.0) + hash(gl_FragCoord.yx * 1.7 + fract(time * 3.31) * 431.0) - 1.0;   // triangular noise: film grain that also hides banding
  col += g * grain * (0.6 + 0.4 * (1.0 - l));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function quadPass(fs, uniforms, defines) {
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, defines: defines || {}, depthTest: false, depthWrite: false, toneMapped: false });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; const s = new THREE.Scene(); s.add(q); return { m, s, u: uniforms };
}

export function createPost(renderer, { phone, bloom = true, dof = true, samples = 2 }) {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2();
  const mk = (w, h, o = {}) => new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), Object.assign({ type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }, o));
  const depthTex = new THREE.DepthTexture(1, 1); depthTex.type = THREE.UnsignedIntType;
  const scene = mk(1, 1, { depthBuffer: true, depthTexture: depthTex, samples });
  const levels = phone ? 4 : 6; const down = []; const up = [];
  const pre = quadPass(PRE_FS, { src: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 0.9 }, knee: { value: 0.45 } });
  const dn = quadPass(DOWN_FS, { src: { value: null }, texel: { value: new THREE.Vector2() } });
  const upP = quadPass(UP_FS, { src: { value: null }, base: { value: null }, texel: { value: new THREE.Vector2() }, mixK: { value: 1 } });
  const cocP = quadPass(COC_FS, { src: { value: null }, depth: { value: depthTex }, texel: { value: new THREE.Vector2() }, near: { value: 0.05 }, far: { value: 22000 }, focus: { value: 100 }, aperture: { value: 0 }, maxFar: { value: 0.35 } });
  const blurP = quadPass(BLUR_FS, { src: { value: null }, texel: { value: new THREE.Vector2() }, radius: { value: 9 } }, { TAPS: phone ? 18 : 34 });
  const fin = quadPass(FINAL_FS, { src: { value: scene.texture }, bloom: { value: null }, dof: { value: null }, useDof: { value: 0 }, useBloom: { value: bloom ? 1 : 0 }, bloomK: { value: 0.2 },
    exposure: { value: 1.0 }, time: { value: 0 }, grain: { value: 0.018 }, vignette: { value: 0.55 }, fringe: { value: 0.0016 }, aspect: { value: 1 }, lift: { value: 0.006 }, warp: { value: 0 },
    lensC: { value: new THREE.Vector2(0.5, 0.5) }, lensR: { value: 0.1 }, lensK: { value: 0 }, lensE: { value: 1 }, lensA: { value: 0 } });
  let cocRT = null, blurRT = null; let dofOn = !!dof, stale = false;
  const st = { focus: 100, aperture: 0, warp: 0, fringeBoost: 0, lens: { u: 0.5, v: 0.5, r: 0.1, k: 0, e: 1, a: 0 } };   // lens: the ring's middle (0-1 across, 0-1 up), its long half axis (in screen heights), strength, short/long, lean; for one frame

  function setSize(w, h) { // w, h: the drawing buffer in pixels
    scene.setSize(w, h);
    down.forEach(t => t.dispose()); up.forEach(t => t.dispose()); down.length = 0; up.length = 0;
    if (bloom) { let bw = Math.ceil(w / 2), bh = Math.ceil(h / 2); for (let i = 0; i < levels; i++) { down.push(mk(bw, bh)); up.push(mk(bw, bh)); bw = Math.max(1, Math.ceil(bw / 2)); bh = Math.max(1, Math.ceil(bh / 2)); } }
    if (cocRT) { cocRT.dispose(); blurRT.dispose(); cocRT = blurRT = null; }
    if (dofOn) { cocRT = mk(Math.ceil(w / 2), Math.ceil(h / 2)); blurRT = mk(Math.ceil(w / 2), Math.ceil(h / 2)); }
    fin.u.aspect.value = w / Math.max(1, h);
  }
  function draw(p, target) { renderer.setRenderTarget(target); renderer.render(p.s, cam); }

  /* render the scene into the target; extra(renderer) may draw more into it (the effects that should be graded too) */
  function render(sceneObj, camera, time, extra) {
    renderer.getDrawingBufferSize(size); if (stale || scene.width !== size.x || scene.height !== size.y) { stale = false; setSize(size.x, size.y); }
    renderer.setRenderTarget(scene); renderer.clear(); renderer.render(sceneObj, camera); if (extra) extra(renderer);
    if (bloom) {
      pre.u.src.value = scene.texture; pre.u.texel.value.set(1 / size.x, 1 / size.y); draw(pre, down[0]);
      for (let i = 1; i < levels; i++) { dn.u.src.value = down[i - 1].texture; dn.u.texel.value.set(1 / down[i - 1].width, 1 / down[i - 1].height); draw(dn, down[i]); }
      let prev = down[levels - 1];
      for (let i = levels - 2; i >= 0; i--) { upP.u.src.value = prev.texture; upP.u.base.value = down[i].texture; upP.u.texel.value.set(1 / prev.width, 1 / prev.height); upP.u.mixK.value = 1.0; draw(upP, up[i]); prev = up[i]; }
      fin.u.bloom.value = prev.texture;
    }
    const useDof = dofOn && st.aperture > 0.01;
    if (useDof) {
      cocP.u.src.value = scene.texture; cocP.u.texel.value.set(1 / size.x, 1 / size.y); cocP.u.near.value = camera.near; cocP.u.far.value = camera.far; cocP.u.focus.value = st.focus; cocP.u.aperture.value = st.aperture; draw(cocP, cocRT);
      blurP.u.src.value = cocRT.texture; blurP.u.texel.value.set(1 / cocRT.width, 1 / cocRT.height); draw(blurP, blurRT);
      fin.u.dof.value = blurRT.texture;
    }
    fin.u.useDof.value = useDof ? 1 : 0; fin.u.useBloom.value = bloom ? 1 : 0; fin.u.time.value = time; fin.u.warp.value = st.warp; fin.u.fringe.value = 0.0016 + st.fringeBoost;
    fin.u.lensC.value.set(st.lens.u, st.lens.v); fin.u.lensR.value = st.lens.r; fin.u.lensK.value = st.lens.k; fin.u.lensE.value = st.lens.e === undefined ? 1 : st.lens.e; fin.u.lensA.value = st.lens.a || 0; st.lens.k = 0;
    draw(fin, null);
  }
  /* switch the glow or the focus blur on or off; the targets are remade on the next frame */
  function set(o) { if (o.bloom !== undefined && !!o.bloom !== bloom) { bloom = !!o.bloom; stale = true; } if (o.dof !== undefined && !!o.dof !== dofOn) { dofOn = !!o.dof; stale = true; } }
  function dispose() { [scene, ...down, ...up].forEach(t => t.dispose()); if (cocRT) { cocRT.dispose(); blurRT.dispose(); } }
  return { render, setSize, set, dispose, st, uniforms: fin.u, get target() { return scene; }, get bloom() { return bloom; }, get dof() { return dofOn; } };
}

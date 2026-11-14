/* How much this device can draw. Three levels (low, balanced, high) and Auto, which picks one from a quick test of the
   graphics chip, what the browser says about the device, and how the last visit went. While the site runs, the controller
   in main.js still scales the resolution, and on Auto turns effects off if the frame rate cannot hold; that is remembered
   here for a few days so the next visit starts where this one ended. */
export const LEVELS = ['low', 'balanced', 'high'];
const KEY = 'fg-auto', DAYS = 4;

/* what each level means: `small` is a phone-sized device, which keeps the lighter models and maps at every level */
export function levelSpec(level, small) {
  const T = small
    ? { low: { budget: 0.8e6, cap: 1.5, bloom: false, dof: false, lite: true, maps: '2k', stars: 3500, dust: 0.5 },
        balanced: { budget: 1.5e6, cap: 2, bloom: true, dof: false, lite: true, maps: '2k', stars: 6000, dust: 1 },
        high: { budget: 2.4e6, cap: 2.5, bloom: true, dof: false, lite: true, maps: '2k', stars: 9000, dust: 1 } }
    : { low: { budget: 1.3e6, cap: 1, bloom: false, dof: false, lite: true, maps: '2k', stars: 5000, dust: 0.5 },
        balanced: { budget: 2.6e6, cap: 2, bloom: true, dof: true, lite: false, maps: '4k', stars: 16000, dust: 1 },
        high: { budget: 4.4e6, cap: 2, bloom: true, dof: true, lite: false, maps: '4k', stars: 16000, dust: 1 } };
  return Object.assign({ level }, T[level] || T.balanced);
}

/* the chip's name, and how long it takes to fill about two million pixels with layered noise (a frame's worth of hard
   shading), on a throwaway context that is released straight after */
export function probeGpu() {
  const out = { gpu: 'unknown', bench: null };
  try {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const gl = c.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' }) || c.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return out;
    const ext = gl.getExtension('WEBGL_debug_renderer_info'); if (ext) out.gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision highp float; uniform float t;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){ vec2 p = gl_FragCoord.xy / 64.0; float a = 0.0, w = 0.5; for (int i = 0; i < 24; i++) { a += w * n(p + t); p = p * 1.9 + 3.1; w *= 0.6; } gl_FragColor = vec4(vec3(a), 1.0); }`));
    gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return out;
    gl.useProgram(prog); const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const ut = gl.getUniformLocation(prog, 't'), px = new Uint8Array(4);
    const run = n => { for (let i = 0; i < n; i++) { gl.uniform1f(ut, i * 0.37); gl.drawArrays(gl.TRIANGLES, 0, 3); } gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    run(2);                                                    // the first draws pay for compiling; not counted
    const t0 = performance.now(); run(8); out.bench = +(performance.now() - t0).toFixed(1);
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch (e) { /* no test: the browser's own description decides */ }
  return out;
}

/* what the last visit learned, if it is recent */
function recall() { try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r && LEVELS.includes(r.level) && Date.now() - r.at < DAYS * 864e5) return r; } catch (e) { /* private mode */ } return null; }
export function remember(level, why) { try { localStorage.setItem(KEY, JSON.stringify({ level, why, at: Date.now() })); } catch (e) { /* private mode */ } }

/* Auto: the level this device should start at, and why */
export function pickQuality({ small }) {
  const { gpu, bench } = probeGpu(); const mem = navigator.deviceMemory || 0, cores = navigator.hardwareConcurrency || 6;
  const soft = /SwiftShader|llvmpipe|Basic Render|Software|Microsoft Basic/i.test(gpu); let level = 'balanced', why = 'a capable chip';
  if (small) {
    const old = /Adreno \(TM\) [1-5]\d\d|Mali-(4|T|G3\d|G5[0-2])|PowerVR (SGX|Rogue G[6E]|GE8)|Apple A([789]|10) /i.test(gpu);
    if (soft) { level = 'low'; why = 'no graphics chip in use'; }
    else if (old) { level = 'low'; why = 'an older phone chip'; }
    else if (mem && mem <= 3) { level = 'low'; why = 'little memory'; }
    else if (bench !== null && bench > 80) { level = 'low'; why = 'a slow chip test'; }
    else if (cores <= 4 && (bench === null || bench > 40)) { level = 'low'; why = 'few processor cores'; }
    else if (bench !== null && bench < 9 && cores >= 6 && (!mem || mem >= 6)) { level = 'high'; why = 'a fast phone chip'; }
  } else {
    const strong = /RTX|RX [5-9]\d{3}|Radeon Pro|Arc\(TM\) A[57]|Apple M\d+ (Pro|Max|Ultra)|GTX 1[06][678]0|GTX 1080|Quadro RTX/i.test(gpu);
    if (soft) { level = 'low'; why = 'no graphics chip in use'; }
    else if (bench !== null && bench > 70) { level = 'low'; why = 'a slow chip test'; }
    else if (mem && mem <= 2) { level = 'low'; why = 'little memory'; }
    else if (strong && bench !== null && bench < 7) { level = 'high'; why = 'a fast graphics card'; }
  }
  const past = recall();
  if (past && LEVELS.indexOf(past.level) < LEVELS.indexOf(level)) { level = past.level; why = 'the last visit ran slowly'; }
  return { level, why, gpu, bench };
}

/* small helpers shared by the site modules */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeInOut = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

export const motionMQ = matchMedia('(prefers-reduced-motion: reduce)');
/* layouts: 'phone' is the narrow, tall one (panel along the bottom); 'short' is a phone held sideways or any very short window */
export const phoneMQ = matchMedia('(max-width: 820px) and (orientation: portrait), (max-width: 820px) and (min-height: 501px)');
export const shortMQ = matchMedia('(max-height: 500px) and (orientation: landscape)');
export const isPhone = () => phoneMQ.matches;
export const isShort = () => shortMQ.matches;
export const coarse = matchMedia('(pointer: coarse)').matches;
/* a phone-sized device, whichever way up it is held: lighter maps, models and effects */
export const handheld = coarse && Math.min(screen.width, screen.height) <= 600;
export const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 && coarse;

/* a seeded random so the stars and rocks are the same every visit */
let seed = 1337;
export const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* GLSL shared by the planet shaders: 3D value noise and fbm, plus a screen-space normal perturbation */
export const GLSL_NOISE = `
float hash31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.0, w = 0.5; for (int i = 0; i < 5; i++) { a += w * noise3(p); p = p * 2.03 + 11.7; w *= 0.5; } return a; }
float fbm3(vec3 p){ float a = 0.0, w = 0.5; for (int i = 0; i < 3; i++) { a += w * noise3(p); p = p * 2.07 + 5.1; w *= 0.5; } return a; }
`;
export const GLSL_PERTURB = `
vec3 perturbN(vec3 N, vec3 mapN, vec3 pos, vec2 uv, float scale){
  vec3 q0 = dFdx(pos); vec3 q1 = dFdy(pos); vec2 st0 = dFdx(uv); vec2 st1 = dFdy(uv);
  vec3 q1perp = cross(q1, N); vec3 q0perp = cross(N, q0);
  vec3 T = q1perp * st0.x + q0perp * st1.x; vec3 B = q1perp * st0.y + q0perp * st1.y;
  float det = max(dot(T, T), dot(B, B)); float s = (det == 0.0) ? 0.0 : inversesqrt(det);
  mapN.xy *= scale;
  return normalize(T * (mapN.x * s) + B * (mapN.y * s) + N * mapN.z);
}
`;
export const PLANET_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vObj;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vObj = position; gl_Position = projectionMatrix * viewMatrix * w; }`;
export const OUT = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

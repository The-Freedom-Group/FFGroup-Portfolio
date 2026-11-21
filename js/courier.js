/* The courier: the small rocket that travels the whole story. It is the launch rocket of the last part (w-pad.js: the
   porcelain body, the pink nose and bands, the two boosters) drawn once in two dimensions, and that one drawing is also
   the handle on the progress rail.
   The first screen has its own copy (sysmap.js), which falls into the hole; this one comes out of the new planet after
   the nova and circles it while the map builds. Once the system has built itself it patrols behind Enterprise,
   through the open sky under the heading and under the four figures; it goes into Freedom Global ahead of the dive, is
   seen falling through the cloud, and holds beside the investment focus; down the journey it is the head of the line
   on the left. Then it flies on the figures themselves (legs, below): it draws the revenue line in, each year landing
   as it passes, and parks on the last; crosses the page in the gap between two parts; rides the market's timelines;
   circles the expansion map's globe, in front and then away behind it; climbs over the tops of the plan's columns and
   rounds the year's breakdown; draws the line to 2036 in the same way; comes down into the team and circles its hub;
   rounds the raise at dusk; rides round the flywheel, each step lighting as it passes; and as the view comes down to
   the launch pad it climbs out through the top of the screen on the very line the launch rocket then comes down.
   Between two of those it waits in a margin, never over the words. On a phone it flies the two lines only.
   The scroll owns the flight: where the rocket is, which way its nose points (the way it is going, so on the way back
   up the page it rolls round to face up it), how it leans into a turn and how long it burns are all read off one route
   at the scroll. Only the half turn when the scroll changes direction is eased in time; the rest stops when the page
   stops, and scrolling back plays the same flight backwards.
   One layer over the page, nothing in it can be pressed; each frame writes one transform, and an opacity when it changes.
   Everything it steers by is measured from the page when the layout changes, never in the frame. */
import { $, $$, el, svg, clamp, lerp, smooth, span, STILL } from './kit.js';

/* ───────── the drawing ─────────
   In its own units: the nose at (0, 0) pointing up, 48 long to the nozzles, the flame beyond. */
export const ART = { w: 12.8, len: 48, tail: 16.4 };
const CORE = 'M0 0C1 1.2 1.55 2.9 1.75 4.7C2.2 6.8 2.5 9 2.5 11.4V43.6L2.7 46.6H1.3L1.9 48H-1.9L-1.3 46.6H-2.7L-2.5 43.6V11.4C-2.5 9-2.2 6.8-1.75 4.7C-1.55 2.9-1 1.2 0 0Z';
const SIDE = 'M3.95 21.4C4.7 22.3 5.2 23.6 5.35 25.2V44.3L5.45 46.6H4.75L5.15 47.9H2.75L3.15 46.6H2.45L2.55 44.3V25.2C2.7 23.6 3.2 22.3 3.95 21.4Z';
/* one booster's parts (the right-hand one; the other is its mirror): porcelain, pink, carbon, flame */
const SIDE_P = 'M2.55 25.2H5.35V44.3H2.55Z', SIDE_H = 'M3.95 21.4C4.7 22.3 5.2 23.6 5.35 25.2H2.55C2.7 23.6 3.2 22.3 3.95 21.4ZM2.55 30H5.35V31.2H2.55Z';
const SIDE_C = 'M2.55 44.3H5.35L5.45 46.6H2.45ZM3.15 46.6H4.75L5.15 47.9H2.75Z', SIDE_X = 'M2.95 47.3C2.5 50.6 3.4 54.4 3.95 57.6C4.5 54.4 5.4 50.6 4.95 47.3Z';
const FLIP = 'scale(-1 1)';
/* draws the rocket into an svg (or a g): flame first, then a keyline that shows on a light ground, then the livery.
   Returns the flame, so the caller can lengthen it. trail: a faint streak beyond the flame (the courier only). */
export function rocketArt(parent, { trail = false } = {}) {
  const g = svg('g', { class: 'rk-art' }, parent), flame = svg('g', { class: 'rk-x' }, g), lick = svg('g', { class: 'rk-xf' }, flame);
  if (trail) { const id = 'rkTrail' + (rocketArt.n = (rocketArt.n || 0) + 1), lg = svg('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 56, x2: 0, y2: 82 }, svg('defs', null, lick));
    svg('stop', { offset: 0, 'stop-color': '#ff74b8', 'stop-opacity': 0.5 }, lg); svg('stop', { offset: 1, 'stop-color': '#ff74b8', 'stop-opacity': 0 }, lg);
    svg('path', { d: 'M-.7 56H.7V82H-.7Z', fill: `url(#${id})`, class: 'rk-t' }, lick); }
  svg('path', { d: 'M-1.75 47.4C-2.5 52-.9 58 0 64.4C.9 58 2.5 52 1.75 47.4Z' + SIDE_X, class: 'rk-xo' }, lick); svg('path', { d: SIDE_X, class: 'rk-xo', transform: FLIP }, lick);
  svg('path', { d: 'M-.85 47.4C-1.15 50-.4 53.6 0 56.6C.4 53.6 1.15 50 .85 47.4Z', class: 'rk-xi' }, lick);
  svg('path', { d: CORE + SIDE, class: 'rk-k' }, g); svg('path', { d: SIDE, class: 'rk-k', transform: FLIP }, g);
  svg('path', { d: 'M-1.75 4.7H1.75C2.2 6.8 2.5 9 2.5 11.4V43.6H-2.5V11.4C-2.5 9-2.2 6.8-1.75 4.7Z' + SIDE_P, class: 'rk-p' }, g); svg('path', { d: SIDE_P, class: 'rk-p', transform: FLIP }, g);
  svg('path', { d: 'M0 0C1 1.2 1.55 2.9 1.75 4.7H-1.75C-1.55 2.9-1 1.2 0 0ZM-2.5 21.7H2.5V23.4H-2.5Z' + SIDE_H, class: 'rk-h' }, g); svg('path', { d: SIDE_H, class: 'rk-h', transform: FLIP }, g);
  svg('path', { d: 'M-2.5 13.6H2.5V14.4H-2.5ZM-2.5 43.6H2.5L2.7 46.6H-2.7ZM-1.3 46.6H1.3L1.9 48H-1.9Z' + SIDE_C, class: 'rk-c' }, g); svg('path', { d: SIDE_C, class: 'rk-c', transform: FLIP }, g);
  /* the side away from the light, a shade darker */
  svg('path', { d: 'M.8 1.2C1.3 2.3 1.6 3.5 1.75 4.7C2.2 6.8 2.5 9 2.5 11.4V43.6L2.7 46.6H.8ZM4.3 22C4.9 22.9 5.25 24 5.35 25.2V44.3L5.45 46.6H4.3ZM-3.6 22C-3.3 22.4-2.7 24-2.55 25.2V46.6H-3.6Z', class: 'rk-s' }, g);
  return flame;
}

/* the figures the courier flies on, handed over by charts.js: rev and traj, a line each ({ svg, line: { xs, ys, cum, len },
   go(k) shows k of it drawn }); plan, the tops of the columns ({ svg, cx, cy, band }); fly, the flywheel ({ svg, size, r,
   n, at(i) lights a step }). live: a courier is here to fly them (without one, a line draws itself in) */
export const RIDES = { live: false };
/* where a line of points ({ xs, ys, cum, len }) is, d along it */
export function lineAt(L, d, o) {
  const c = L.cum; d = clamp(d, 0, L.len); let lo = 0, hi = c.length - 1; while (lo + 1 < hi) { const m = (lo + hi) >> 1; if (c[m] <= d) lo = m; else hi = m; }
  const u = (d - c[lo]) / Math.max(1e-4, c[hi] - c[lo]); o.x = lerp(L.xs[lo], L.xs[hi], clamp(u)); o.y = lerp(L.ys[lo], L.ys[hi], clamp(u)); return o;
}

/* ───────── the flight ─────────
   One scroll position owns the flight. The route is a chain of phases laid end to end down the page's scroll, each a
   pure function of the scroll: a chart's line, an orbit, a wait in a margin, a scene of its own. Between two of them a
   bridge (a cubic through its keys) leaves the one at its exact place and velocity and meets the next at its, so the
   route is smooth to its first derivative everywhere, in both directions and at any speed. A figure is flown on its own
   timing, which enters and leaves at .65 of its cruising pace, so no figure is begun or left from a standstill.
   Each frame the pose is read off the route at the eased scroll (the same tenth-of-a-second lowpass the world is drawn
   with, which converges exactly and is skipped on a jump of more than two and a half screens): where it is, which way
   the route runs there (the nose), how fast that turns (the lean) and how fast it goes (the flame). On a figure the
   route is fixed to the page, and the rocket is carried with the page through the lowpass; a soft fence keeps it on
   the screen without a jump. The one thing that is not read off the route is the roll that turns the nose round to
   point the way it is going when the page goes back (and round again when it goes on): an eased half turn.
   The route is laid from the layout when the layout changes, never in the frame; the world's own places (the system,
   the globe, the pad) are read as the world draws them. */
const PI = Math.PI, TAU = PI * 2, DOWN = PI / 2, UP = -PI / 2;
const wrap = a => { a = (a + PI) % TAU; return (a < 0 ? a + TAU : a) - PI; };
const BODY = 96;                                                   // the length the courier is drawn at; it is only ever scaled down from this, so it stays sharp
const MARGIN = ['traction', 'market', 'plan', 'horizon', 'crew', 'beyond'];   // the reading parts, each with a margin it can wait in
const ease3 = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };   // the dive's own ease (w-orbit.js)
const ease5 = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };                           // the new planet's (sysmap.js)
/* a figure's timing over its stretch of the scroll, 0 to 1: it enters and leaves at EDGE of its cruising pace */
const EDGE = 0.65, timing = q => { q = clamp(q); const q2 = q * q, q3 = q2 * q; return 3 * q2 - 2 * q3 + EDGE * (2 * q3 - 3 * q2 + q); };
/* the soft fence: the last FENCE px before an edge are mapped onto a curve that never reaches it; further in nothing
   changes, and where the curve begins its value and slope match, so a route through it stays smooth */
const FENCE = 44, softIn = d => d >= FENCE ? d : FENCE * Math.exp(d / FENCE - 1);
const fenceAxis = (v, lo, hi) => hi - lo < FENCE * 2 ? (lo + hi) / 2 : hi - softIn(hi - (lo + softIn(v - lo)));

/* a smooth line through points, walked by distance. marks[i]: how far along the i-th point is. Centripetal
   Catmull-Rom: through every point, with no loop or cusp however unevenly the points are spaced */
function track(pts, closed) {
  const n = pts.length, P = i => closed ? pts[(i % n + n) % n] : i < 0 ? [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]] : i > n - 1 ? [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]] : pts[i], xs = [], ys = [], marks = [];
  const kn = (p, q) => Math.max(1e-3, Math.sqrt(Math.hypot(q[0] - p[0], q[1] - p[1])));
  for (let i = 0, segs = closed ? n : n - 1; i < segs; i++) {
    const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2), steps = Math.max(3, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 9)); marks.push(xs.length);
    const t0 = kn(a, b), t1 = kn(b, c), t2 = kn(c, d), m = [0, 1].map(j => [c[j] - b[j] + t1 * ((b[j] - a[j]) / t0 - (c[j] - a[j]) / (t0 + t1)), c[j] - b[j] + t1 * ((d[j] - c[j]) / t2 - (d[j] - b[j]) / (t1 + t2))]);
    for (let k = 0; k < steps; k++) { const u = k / steps, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = 3 * u2 - 2 * u3, h11 = u3 - u2;
      xs.push(h00 * b[0] + h10 * m[0][0] + h01 * c[0] + h11 * m[0][1]); ys.push(h00 * b[1] + h10 * m[1][0] + h01 * c[1] + h11 * m[1][1]); }
  }
  marks.push(xs.length); xs.push(P(closed ? 0 : n - 1)[0]); ys.push(P(closed ? 0 : n - 1)[1]);
  const cum = [0]; for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  const len = cum[cum.length - 1] || 1;
  return { xs, ys, cum, len, closed, marks: marks.map(i => cum[i]),
    at(d, o) {
      d = closed ? ((d % len) + len) % len : clamp(d, 0, len); let lo = 0, hi = cum.length - 1; while (lo + 1 < hi) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
      const u = (d - cum[lo]) / Math.max(1e-4, cum[hi] - cum[lo]); o.x = lerp(xs[lo], xs[hi], u); o.y = lerp(ys[lo], ys[hi], u); return o;
    } };
}
/* does the line keep clear of every box (each [left, top, right, bottom]) by this much? */
function clear(tr, boxes, by) {
  for (let i = 0; i < tr.xs.length; i++) { const x = tr.xs[i], y = tr.ys[i]; for (const b of boxes) if (x > b[0] - by && x < b[2] + by && y > b[1] - by && y < b[3] + by) return false; }
  return true;
}
/* a cubic through keys { s, x, y, d } (d: the velocity there, px per px of scroll; a key without one takes the chord of
   its neighbours), so two stretches that meet at a key share its place and its velocity. The keys keep the order they
   are given in: an inner one is held between its neighbours, never sorted past them */
function keyed(raw) {
  let ks = raw.filter(k => k && isFinite(k.s) && isFinite(k.x) && isFinite(k.y)); if (ks.length < 2) return null;
  const a = ks[0].s, b = ks[ks.length - 1].s; if (!(b - a >= 1)) return null;
  if (b - a < (ks.length - 1) * 3) ks = [ks[0], ks[ks.length - 1]];
  const K = [{ ...ks[0] }];
  for (let i = 1; i < ks.length - 1; i++) K.push({ ...ks[i], s: clamp(ks[i].s, K[i - 1].s + 3, b - (ks.length - 1 - i) * 3) });
  K.push({ ...ks[ks.length - 1] });
  K.forEach((k, i) => { if (k.d) return; const p = K[Math.max(0, i - 1)], q = K[Math.min(K.length - 1, i + 1)], ds = Math.max(1, q.s - p.s), f = i && i < K.length - 1 ? 0.82 : 1; k.d = { x: (q.x - p.x) / ds * f, y: (q.y - p.y) / ds * f }; });
  return { K, at(s, o) {
    let i = 0; while (i < K.length - 2 && s > K[i + 1].s) i++;
    const A = K[i], B = K[i + 1], ds = Math.max(1e-3, B.s - A.s), u = clamp((s - A.s) / ds), u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = 3 * u2 - 2 * u3, h11 = u3 - u2;
    o.x = h00 * A.x + h10 * ds * A.d.x + h01 * B.x + h11 * ds * B.d.x; o.y = h00 * A.y + h10 * ds * A.d.y + h01 * B.y + h11 * ds * B.d.y; return o; } };
}
/* a smooth curve through (x, y) pairs, x rising, that never overshoots them (a monotone cubic): a long route's pace */
function monotone(xs, ys) {
  const n = xs.length, m = [], t = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) m[i] = (ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]);
  t[0] = m[0]; t[n - 1] = m[n - 2]; for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (!m[i]) { t[i] = t[i + 1] = 0; continue; } const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; } }
  return x => { if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++; const h = xs[i + 1] - xs[i], u = (x - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * t[i] + (3 * u2 - 2 * u3) * ys[i + 1] + (u3 - u2) * h * t[i + 1]; };
}

/* byId: the page's sections (main.js keeps their progress); sys: the system as the page drives it (sysmap.js);
   mapSpan: the stretch of the map scene its nine territories share */
export function createCourier({ byId, sys, mapSpan = [0.44, 0.895] }) {
  const layer = el('div', { id: 'courier', 'aria-hidden': 'true' }), ship = el('div.cr'), pic = svg('svg', { viewBox: `${-ART.w / 2} -1 ${ART.w} ${ART.len + 2}`, class: 'rk' }, ship);
  const flameEl = rocketArt(pic, { trail: true }); layer.append(ship); document.body.append(layer); RIDES.live = true;
  const canClip = !!(window.CSS && CSS.supports && CSS.supports('clip-path', 'path(evenodd, "M0 0H1V1Z")'));
  const A = byId.top, B = byId.system, F = byId.focus, J = byId.journey, M = byId.map, R = byId.raise, L = byId.liftoff;

  /* ───────── what it steers by: measured when the layout changes ───────── */
  let dirty = true, vw = 0, vh = 0, phone = false, railX = 1e5, navH = 64;
  const gut = {}, lanes = {}, jr = { ok: false, x: 0, top: 0, bottom: 0, shift: 0, len: 40 }, fo = { left: 0, ok: false }, rs = { ok: false }, lo = { ok: false }, yr = { w: 46, h: 20 };
  let sysRoute = null, sysKey = '', sysT0 = 0, rsRoute = null;
  /* where a thing is on its scene's stage, whatever the page has moved it by since */
  const box = (e, stage) => { if (!e || !e.offsetParent) return null; let x = 0, y = 0, n = e; while (n && n !== stage) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y, x + e.offsetWidth, y + e.offsetHeight]; };
  const join = (...b) => { b = b.filter(Boolean); return b.length ? [Math.min(...b.map(v => v[0])), Math.min(...b.map(v => v[1])), Math.max(...b.map(v => v[2])), Math.max(...b.map(v => v[3]))] : null; };
  const room = w => clamp(w * 0.62, 30, 50);                       // how long it may be in a margin this wide
  /* where a thing is on the page, whatever transform the page has on it for now (a figure still easing up into place) */
  const docBox = e => { if (!e || !e.offsetParent) return null; let x = e.offsetLeft, y = e.offsetTop, n = e.offsetParent; while (n) { x += n.offsetLeft + n.clientLeft; y += n.offsetTop + n.clientTop; n = n.offsetParent; } return [x, y, x + e.offsetWidth, y + e.offsetHeight]; };
  /* and a figure's drawing: where its (0, 0) is on the page, and how many px one of its units is */
  const svgAt = s => { const f = s && s.parentElement, b = docBox(f); if (!b) return null; const a = s.getBoundingClientRect(), c = f.getBoundingClientRect(), vb = s.viewBox && s.viewBox.baseVal, k = vb && vb.width ? a.width / vb.width : 1; return [b[0] + a.left - c.left, b[1] + a.top - c.top, k]; };
  function measure() {
    dirty = false; vw = innerWidth; vh = innerHeight; phone = vw < 900; rsRoute = null;
    const rail = $('#rail'), rk = rail && $('.rk', rail); railX = rk && getComputedStyle(rail).display !== 'none' ? rk.getBoundingClientRect().left : 1e5;
    navH = ($('#nav') || {}).offsetHeight || 64;
    /* the left margin of each reading sheet: from the edge of the screen to where its words begin */
    const edgeR = railX < 1e4 ? railX - 8 : vw;
    MARGIN.forEach(id => { const w = $('.wrap', byId[id].sec), r = w && w.getBoundingClientRect(); let free = r ? r.left + parseFloat(getComputedStyle(w).paddingLeft) : 0, end = r ? r.right - parseFloat(getComputedStyle(w).paddingRight) : vw;
      if (id === 'crew') { const wide = $('.crew-wide', byId[id].sec); if (wide && wide.offsetParent) { const q = wide.getBoundingClientRect(), cs = getComputedStyle(wide); free = Math.min(free, q.left + parseFloat(cs.paddingLeft)); end = Math.max(end, q.right - parseFloat(cs.paddingRight)); } }   // the staff chart runs wider than the words
      const freeR = edgeR - end;
      gut[id] = { ok: free >= 48, x: free / 2, len: room(free), rok: freeR >= 48, rx: end + freeR / 2, rlen: room(freeR) };
      /* the lanes it waits in between two figures: beside the words themselves (the staff chart is flown round, not waited beside) */
      const lf = r ? r.left + parseFloat(getComputedStyle(w).paddingLeft) : 0, le = r ? r.right - parseFloat(getComputedStyle(w).paddingRight) : vw, lr = edgeR - le;
      lanes[id] = { ok: lf >= 48, x: lf / 2, len: room(lf), rok: lr >= 48, rx: le + lr / 2, rlen: room(lr) }; });
    /* the journey's line */
    const line = $('#jrLine'), j = $('#jr');
    if (line && j && getComputedStyle(line).display !== 'none') { const r = j.getBoundingClientRect(), x = line.getBoundingClientRect().left + 0.5; jr.ok = x >= 26; jr.x = x; jr.top = r.top + scrollY; jr.bottom = r.bottom + scrollY; jr.shift = Math.min(40, x * 0.5); jr.len = clamp(vh * 0.062, 40, 56); } else jr.ok = false;
    /* the investment focus: the room to the left of its box */
    const fb = $('#focusBox'); fo.left = fb ? (vw - fb.offsetWidth) / 2 : 0; fo.ok = fo.left >= 110;
    /* the raise: its heading, cards and mechanism on their stage */
    { const st = $('.stage', R.sec), head = box($('#rs .sh'), st), all = join(head, box($('#rsCards'), st), box($('#rsMech'), st)); rs.ok = !!(all && head); if (rs.ok) { rs.l = all[0]; rs.r = all[2]; rs.b = all[3]; rs.t = all[1]; } }
    /* liftoff: the words the rocket has to keep clear of on its way out */
    { const st = $('.stage', L.sec), t = join(box($('#loHead'), st), box($('#loClose'), st)); lo.ok = !!t; if (t) { lo.l = t[0]; lo.t = t[1]; lo.r = t[2]; lo.b = t[3]; } }
    { const y = $('#sysYears .yr'); if (y && y.offsetWidth) { yr.w = y.offsetWidth; yr.h = y.offsetHeight; } }
    lay();
  }
  const soil = () => { dirty = true; };
  addEventListener('resize', soil); if ('ResizeObserver' in window) new ResizeObserver(soil).observe($('#main'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(soil);

  /* ───────── the system: a patrol behind Enterprise ─────────
     Wide: out from behind Enterprise to the right, under the four figures, round in the open sky above Distribution,
     back behind Enterprise, out under the heading to the left, round above Facilities, and back: the far side of the
     outer rings, kept to the sky the layout leaves free. Narrow: a small orbit round Enterprise itself.
     Laid from where the page has put its furniture; a lobe that cannot keep clear of it is left out. */
  function buildSys(S, out) {
    const st = $('.stage', B.sec), E = S.slots.enterprise, e0 = [E.x, E.y - E.r * 0.05], q = id => $(`.co[data-co="${id}"]`, st), fam = id => box($('.fam', q(id)), st);
    const slot = id => { const s = S.slots[id], w = id.startsWith('future') ? s.r * 2.6 : s.r; return [s.x - w, s.y - s.r, s.x + w, s.y + s.r]; };
    const label = k => { const o = out.years[k]; return [o.x - yr.w / 2, o.y - yr.h / 2, o.x + yr.w / 2, o.y + yr.h / 2]; };
    const cos = ['global', 'facilities', 'distribution', 'future29', 'future30'], keep = [[0, 0, vw, navH], [railX - 6, 0, vw + 9, vh]];
    if (S.wide) {
      const head = box($('#sysHead'), st), stats = box($('#sysStats'), st), fac = fam('facilities'), dis = fam('distribution'); if (!head || !stats || !fac || !dis) return null;
      const size = clamp(E.r * 1.08, 24, 46), m = size * 0.13 + 5;
      keep.push(head, stats, fam('enterprise'), box($('#sysSteps'), st), box($('#sysFoot .fine'), st), ...cos.map(fam), ...cos.map(slot), ...out.years.map((_, k) => label(k)));
      const boxes = keep.filter(Boolean);
      /* one lobe: s is -1 for the left, 1 for the right; over: what is above its sky; under: the company below it;
         lab: the year mark that stands in its way; edge: how far out it may go */
      const lobe = (s, over, under, lab, slotBox, edge, shrink) => {
        const top = over[3] + m, bot = under[1] - m, r = clamp((bot - top) / 2 - 1, 0, 40) * shrink; if (r < 10) return null;
        const cy = (top + bot) / 2, cx = edge - s * (r + m + 4), inner = s < 0 ? over[2] : over[0];
        const above = lab[1] - over[3], below = Math.min(under[1], slotBox[1]) - lab[3], pass = above >= below ? (over[3] + lab[1]) / 2 : (lab[3] + Math.min(under[1], slotBox[1])) / 2;
        if (Math.max(above, below) < m * 2) return null;
        const a = [E.x + s * E.r * 1.7, E.y + E.r * 0.12], b = [inner - s * (size * 0.5 + 4), over[3] + m + 2], c = [(lab[0] + lab[2]) / 2, pass];
        if ((cx - c[0]) * s < r * 2.6 || (c[0] - b[0]) * s < 8 || (b[0] - a[0]) * s < 8) return null;      // no room to turn round out there
        return { go: [a, b, c, [cx - s * r * 2.3, cy - r * 0.92], [cx, cy - r], [cx + s * r, cy], [cx, cy + r], [cx - s * r * 2.3, cy + r * 0.92], c, b, a] };
      };
      const make = (s, shrink) => s < 0 ? lobe(-1, head, fac, label(1), slot('facilities'), Math.max(8, head[0] - 4), shrink) : lobe(1, stats, dis, label(2), slot('distribution'), Math.min(dis[2], railX - 12), shrink);
      const tried = s => { for (const k of [1, 0.75, 0.55]) { const l = make(s, k); if (l && clear(track([e0, ...l.go, e0], false), boxes, m - 2)) return l; } return null; };
      const right = tried(1), left = tried(-1); if (!right && !left) return null;
      const pts = [e0, ...(right ? right.go : []), ...(right && left ? [e0] : []), ...(left ? left.go : [])], tr = track(pts, true);
      return { tr, size, speed: 0.55, E };
    }
    /* narrow: an ellipse round Enterprise, behind it across the top and in front across the bottom */
    const names = $$('.lb', st).map(n => { const b = box(n, st), w = b ? (b[2] - b[0]) / 2 : 0; return b && [b[0] - w, b[1], b[2] - w, b[3]]; });      // each name is centred on its world (the page shifts it left by half its width)
    const boxes = [...keep, box($('#sysHead'), st), ...names, ...cos.map(slot)].filter(Boolean), size = clamp(E.r * 0.95, 20, 28);
    for (const k of [1, 0.82, 0.66]) {
      const rx = Math.min(vw * 0.36, E.r * 5.4) * k, ry = Math.max(E.r * 0.74, 13), pts = []; for (let i = 0; i < 24; i++) { const a = -PI / 2 + i / 24 * TAU; pts.push([E.x + Math.cos(a) * rx, E.y + Math.sin(a) * ry]); }
      const tr = track(pts, true), far = [E.x - E.r, E.y - E.r, E.x + E.r, E.y + E.r];
      if (clear(tr, boxes.filter(b => !(b[0] <= far[0] && b[2] >= far[2] && b[1] <= far[1] && b[3] >= far[3])), size * 0.13 + 3)) return { tr, size, speed: 0.4, E };
    }
    return null;
  }

  /* ───────── the raise: round the outside of the brief ─────────
     Down the left of it, a long pass under it through the bank of cloud, and up the right of it where there is room
     (where there is not, it waits low on the right); then, when the brief has gone, a long pass back across the open sky. */
  function buildRaise() {
    if (!rs.ok) return null;
    const xl = rs.l / 2, yb = (rs.b + vh) / 2, wideR = railX < 1e4 ? railX - 10 : vw - 8, xr = (rs.r + wideR) / 2;
    if (rs.l < 56 || vh - rs.b < 40) return null;
    const up = wideR - rs.r >= 64, x1 = up ? xr : rs.r - 70, c = Math.min(70, (rs.b - vh * 0.5) * 0.5), size = clamp(Math.min(rs.l, vh - rs.b) * 0.55, 34, 56);
    const pts = [[xl, vh * 0.48], [xl, yb - c], [xl + c, yb], [(xl + x1) / 2, yb + Math.min(8, (vh - yb) * 0.25)], [x1 - (up ? c : 0), yb]]; if (up) pts.push([xr, yb - c], [xr, vh * 0.3]);
    const end = pts.length - 1, back = gut.beyond.ok;        // end: where it waits for the brief to go; then the pass back, to Beyond's margin
    if (back) pts.push([lerp(pts[end][0], gut.beyond.x, 0.52), lerp(pts[end][1], vh * 0.5, 0.5) - vh * 0.07], [gut.beyond.x, vh * 0.5]);
    const tr = track(pts, false); return { tr, m: tr.marks, end, back, size };
  }

  /* ───────── the phases ─────────
     A phase writes, for a scroll s, where the rocket is on the screen as it stands at that scroll (x, y) and how it is
     drawn there: len, its length; a, how visible; g, how far it is fixed to the page (1: carried with the page, 0: with
     the screen); fr, how far the ground under it moves with the page (the way it faces is the way it moves over that);
     fx, fy, the way it faces where the route itself barely moves (added to the route's own direction, so it only counts
     at a near standstill); free, how far it may leave the screen; hx, hy, hr, a disc it is behind; cut, a line it is not
     shown above. Each is a function of s and of the layout (a live one also of the world as it is drawn), never of time. */
  let W = null, ROOMS = {}, CL = 40, route = [], rides = [], stops = [], laid = [];
  const RID = ['rev', 'traj', 'plan', 'fly'], Q = { x: 0, y: 0 }, Q2 = { x: 0, y: 0 }, NONE = {};
  const look = (o, len, a = 1, g = 0, face = DOWN, phi = 0.08, free = 0) => { o.len = len; o.a = a; o.g = g; o.fr = g; o.gy = NaN; o.fx = Math.cos(face) * phi; o.fy = Math.sin(face) * phi; o.free = free; o.cut = 0; o.hr = 0; return o; };
  const behind = (o, x, y, r) => { o.hx = x; o.hy = y; o.hr = r; };
  const phase = (name, at, more) => Object.assign({ name, s0: 0, s1: 0, at }, more);
  const qOf = (P, s) => clamp((s - P.s0) / Math.max(1, P.s1 - P.s0));
  const at = (Y, f) => Y - f * vh;                                   /* the scroll at which page height Y stands f of the way down the screen */
  const headAt = (Ln, d) => { const e = Math.min(6, Ln.len / 2), d0 = clamp(d - e, 0, Math.max(0, Ln.len - 2 * e)); lineAt(Ln, d0, Q2); const x0 = Q2.x, y0 = Q2.y; lineAt(Ln, d0 + 2 * e, Q2); return Math.atan2(Q2.y - y0, Q2.x - x0); };

  /* a wait in a part's margin (side 1: the right one), fixed to the screen and drifting slowly down it. Where there is
     no margin it waits just off the screen, out of sight */
  const lane = (id, side) => phase('lane ' + id + (side ? ' R' : ' L'), function (s, o) {
    const g = lanes[id], ok = g && (side ? g.rok : g.ok);
    o.x = ok ? (side ? g.rx : g.x) : side ? vw + 90 : -90; o.y = vh * 0.49 + (qOf(this, s) * 2 - 1) * Math.min(vh * 0.11, (this.s1 - this.s0) * 0.12);   /* never faster than an eighth of the scroll */
    look(o, ok ? (side ? g.rlen : g.len) : CL, ok ? 1 : 0, 0, DOWN, 0.08, ok ? 0 : 1);
  }, { soft: true, key: id + side });
  /* away, just off one side of the screen (a phone, between its figures) */
  const park = side => phase('park ' + (side ? 'R' : 'L'), function (s, o) { o.x = side ? vw + 90 : -90; o.y = vh * lerp(0.45, 0.55, qOf(this, s)); look(o, CL, 0, 0, DOWN, 0.08, 1); }, { soft: true, park: true, key: 'park' + side });
  /* along a line of points on the page */
  const pagePath = (name, pts) => { const tr = track(pts, false); return phase(name, function (s, o) { lineAt(tr, timing(qOf(this, s)) * tr.len, Q); o.x = Q.x; o.y = Q.y - s; look(o, CL, 1, 1); }, { tr, glued: true, dlen: tr.len }); };
  /* round a circle on the page from th0, turns times, clockwise or not */
  const pageOrbit = (name, c) => phase(name, function (s, o) {
    const t = c.th0 + (c.cw ? 1 : -1) * c.turns * TAU * timing(qOf(this, s)); o.x = c.x + Math.cos(t) * c.rx; o.y = c.y + Math.sin(t) * c.ry - s; look(o, CL, 1, 1);
  }, { c, glued: true, dlen: c.turns * TAU * Math.max(c.rx, c.ry) });
  /* a chart's line, drawn in at the courier's tail: from its first point to its last, a little ahead of the line's head
     (the line is read as it is drawn, so a line that changes its scale is flown as it changes) */
  const lineRide = id => { const Rd = RIDES[id], ps = Rd && Rd.line && svgAt(Rd.svg); if (!ps) return null; const [ox, oy, k0] = ps, L0 = Rd.line;
    const P = phase('ride ' + id, function (s, o) { const Ln = Rd.line || L0, d = timing(qOf(this, s)) * Ln.len, ang = headAt(Ln, d), off = CL * 0.62 + 3; lineAt(Ln, d, Q);
      o.x = ox + Q.x * k0 + Math.cos(ang) * off; o.y = oy + Q.y * k0 + Math.sin(ang) * off - s; look(o, CL, 1, 1); }, { live: true, R: Rd, glued: true, dlen: L0.len * k0 });
    /* from when the line's start is near the foot of the screen until its end is near the top: as long as the whole
       line can be flown in sight */
    const sY = oy + L0.ys[0] * k0, eY = oy + L0.ys[L0.ys.length - 1] * k0; P.s0 = at(sY, 0.96); P.s1 = Math.max(P.s0 + vh * 0.3, at(eY, 0.1)); P.b = Math.max(P.s1, at(eY, 0.1));
    P.k = s => s <= P.s0 ? 0 : s >= P.s1 ? 1 : timing(qOf(P, s)); return P; };

  /* the whole flight, from the new planet to liftoff, in story order */
  function lay() {
    laid = RID.map(id => RIDES[id] && RIDES[id].svg); CL = phone ? 30 : clamp(vw * 0.027, 34, 46);
    const seq = [];
    /* 01 · the system. Out of the new planet after the nova and round it close while the map builds, in behind it as
       the map stands, out again on the patrol, and on into Freedom Global ahead of the dive */
    if (sys) {
      const S = sys.state, total = S.wide ? 28 : 17, beat = Math.max(0.05, (B.len - 0.95 - 0.675) / (total - 1));   // as sysmap.js beats it (HOLD, DIVE_LEAD)
      const sBorn = A.top + (A.len + 0.7) * vh, sBuilt = Math.max(sBorn + vh * 0.3, B.top + 5 * beat * vh), sDive = Math.max(sBuilt + vh, B.top + (B.len - 0.675) * vh), sGone = B.top + (B.len - 0.216) * vh;
      const born = s => ease5(((s - A.top) / vh - A.len - 0.7) / 0.3), diveT = s => ((s - B.top) / vh - (B.len - 0.675)) / 1.404, dive = s => ease3(diveT(s));
      const ent = () => W ? W.out.worlds.enterprise : { x: vw / 2, y: vh / 2, r: 30 }, SWEEP = 1.75 * TAU;
      const close = phase('new planet', function (s, o) {
        const e = ent(), a = smooth((born(s) - 0.55) / 0.3), q = qOf(this, s), th = UP + SWEEP * (1 - q);       // round and round, ending over the top of it
        const rx = Math.max(e.r * 2.25, 46), ry = rx * 0.3, tl = -0.16, k = (0.35 + 0.65 * a) * (1 - smooth((q - 0.88) / 0.12)), ex = Math.cos(th) * rx * k, ey = Math.sin(th) * ry * k;   // and in behind it, to the middle
        o.x = e.x + ex * Math.cos(tl) - ey * Math.sin(tl); o.y = e.y + ex * Math.sin(tl) + ey * Math.cos(tl); look(o, clamp(e.r * 0.95, 22, 42), a);
        if (Math.sin(th) < 0) behind(o, e.x, e.y, e.r * 0.97);
      }, { live: true, abs: true }); close.s0 = sBorn; close.s1 = sBuilt;
      const patrol = phase('patrol', function (s, o) {
        const rt = sysRoute; if (!rt) { const e = ent(); o.x = e.x; o.y = e.y; look(o, 30, 0); behind(o, e.x, e.y, e.r * 0.97); return; }   // until it is laid, it waits behind Enterprise
        const E = rt.E; rt.tr.at((s - sBuilt) * rt.speed, Q); o.x = Q.x; o.y = Q.y; look(o, rt.size, sysShow);
        if (sys.state.wide ? Math.abs(Q.x - E.x) < E.r * 1.65 : Q.y < E.y + 1) behind(o, E.x, E.y, E.r * 0.97);       /* behind Enterprise: on the wide patrol whenever it is near the planet (it only ever passes behind it); on the small orbit, across the top */
      }, { live: true, abs: true }); patrol.s0 = sBuilt; patrol.s1 = sDive;
      const into = phase('dive', function (s, o) {         /* it goes in ahead: peels off the patrol to Freedom Global, smaller and smaller, and into it */
        const dv = dive(s); patrol.at(s, o); const hid = o.hr > 0, hx = o.hx, hy = o.hy, hr = o.hr, a = o.a, len0 = o.len;
        const g = W ? W.out.worlds.global : { x: vw / 2, y: vh / 2 }, w = smooth(diveT(s) / 0.3);
        o.x = lerp(o.x, g.x, w); o.y = lerp(o.y, g.y, w); look(o, lerp(len0, 9, span(dv, 0.015, 0.12)), a * (1 - span(dv, 0.08, 0.14)));
        if (hid) behind(o, hx, hy, hr);
      }, { live: true, abs: true, join: true }); into.s0 = sDive; into.s1 = sGone;
      seq.push(close, patrol, into);
    }
    /* the way down: it falls nose down through the cloud a little to the left of the middle, draws across to its place
       beside the investment focus as the sheet comes in, and across to the journey's line as the sheet goes */
    const focus = phase('focus', function (s, o) {
      const pe = (s - F.top) / vh / Math.max(0.001, F.len), hx = fo.ok ? fo.left - 60 : vw * 0.5, hy = vh * 0.5 + 24, k = smooth((pe - 0.07) / 0.23);
      o.x = lerp(lerp(vw * 0.5, hx, 0.45), hx, span(pe, 0.19, 0.31)); o.y = lerp(vh * 0.26, hy, k); let len = lerp(phone ? 52 : 68, phone ? 40 : 52, k);
      let a = span(pe, 0.055, 0.1) * (fo.ok ? 1 : 1 - span(pe, 0.2, 0.26));
      const k2 = span(pe, 0.6, 0.8); if (k2 > 0) { if (jr.ok) { o.x = lerp(o.x, jr.x - jr.shift, k2); o.y = lerp(o.y, vh * 0.5, k2); len = lerp(len, jr.len, k2); } else a *= 1 - span(pe, 0.6, 0.68); }
      look(o, len, a, 0, DOWN, 0.3);
    }, { abs: true }); focus.s0 = F.top + 0.04 * F.len * vh; focus.s1 = F.top + 0.8 * F.len * vh;
    seq.push(focus);
    /* 02 · the journey: the head of the line's pink fill, which ends at the middle of the screen. Before the line has come
       up that far, and after it has gone, it waits a little to the left of it, clear of the headings */
    const journey = phase('journey', function (s, o) {
      if (!jr.ok) { o.x = -90; o.y = vh * 0.5; look(o, 40, 0, 0, DOWN, 0.08, 1); return; }
      const top = jr.top - s, bot = jr.bottom - s, y = vh * 0.5, off = top > y ? smooth((top - y) / 80) : bot < y ? smooth((y - bot) / 80) : 0;
      o.x = jr.x - jr.shift * off; o.y = y; look(o, jr.len, 1, 0, DOWN, 0.3);
    }, { abs: true }); journey.s0 = focus.s1;
    const rev = lineRide('rev'), traj = lineRide('traj');
    journey.s1 = Math.max(journey.s0 + vh, Math.min(byId.traction.top - vh * 0.5, rev ? rev.s0 - vh * 0.3 : 1e12));
    seq.push(journey);
    rides = [rev, traj].filter(Boolean); stops = [];
    /* 05 · the expansion map: round the globe, in front and then away behind it, from when the globe is well up the
       screen until it begins to leave (laid on the globe as the world draws it; until it has, where it will stand) */
    const gl = globe.ok ? globe : { x: vw / 2, y: vh * 0.55, r: Math.max(60, Math.min(vh * 0.3, vw * 0.3)) }, th0 = phone ? 0 : PI;
    const orbit = phase('globe', function (s, o) {
      const mx = (s - M.top) / vh, len = Math.max(0.001, M.len), pe = mx / len, moving = mx < 0 || mx > len, st = mx < 0 ? -mx * vh : mx > len ? -(mx - len) * vh : 0;
      const G = W && W.map && W.map.live && W.mode === 'globe' ? W.map : null, gx = G ? G.x : gl.x, gy = (G ? G.y : gl.y) + st;      /* the globe as the world draws it (on a phone it moves on its stage as the cards come and go) */
      const r = G ? G.r : Math.max(24, gl.r * lerp(0.84, 1, smooth(clamp(1 + pe * len)))), night = G ? G.night : span(pe, mapSpan[0] - 0.16, mapSpan[0] - 0.04);
      const base = clamp(r * 0.19, 28, 58), reach = vw / 2 - 18, tilt = clamp(Math.acos(Math.min(1, reach / (r * 1.24))), 12 * PI / 180, 38 * PI / 180), ct = Math.cos(tilt), sn = Math.sin(tilt);
      const cols = vw >= 1200 && vh >= 600, tight = cols ? night * (1 - span(pe, mapSpan[1] + 0.005, mapSpan[1] + 0.06)) : 0, grow = 1 + 0.5 * span(pe, mapSpan[1] + 0.06, 1.075);
      const rx = Math.min(lerp(r * 1.24, r + clamp(r * 0.2, 48, 96) - base * 0.5 - 12, tight), reach) / ct * grow, ry = rx * 0.27;
      const th = th0 - this.turns * TAU * timing(qOf(this, s)), ex = Math.cos(th) * rx, ey = Math.sin(th) * ry;   /* it joins at one end, and takes the front first */
      o.x = gx + ex * ct + ey * sn; o.y = gy - ex * sn + ey * ct; look(o, base * (1 + 0.14 * Math.sin(th))); o.fr = moving ? 1 : 0; o.gy = gy;
      if (Math.sin(th) < 0) behind(o, gx, gy, r);
    }, { live: true });
    orbit.s0 = M.top + Math.max(0, gl.y - vh * 0.72); orbit.s1 = Math.max(orbit.s0 + vh, M.top + (M.len + 0.2) * vh);
    { const per = PI * 1.5 * Math.max(gl.r * 1.3, 60); orbit.turns = Math.max(1, Math.round((orbit.s1 - orbit.s0) * 0.75 / per)); }
    /* 09 · the raise, and 11 · liftoff */
    const raise = raisePhase(), lift = liftPhase();
    if (phone) {
      /* a phone: the two lines, the globe, the two passes over the raise and liftoff; between them it is away */
      seq.push(park(0)); if (rev) seq.push(rev, park(1));
      seq.push(orbit, park(1), park(0));
      if (traj) seq.push(traj, park(1), park(0));
      if (raise) seq.push(raise, park(0));
      if (lift) seq.push(lift);
      chain(seq); return;
    }
    /* 03 · the revenue line, then the right margin */
    if (rev) seq.push(rev); seq.push(lane('traction', 1));
    /* a crossing in the gap between two blocks, from one margin to the other, as the gap comes up the screen: down the
       margin into the gap, across it, and on down the other margin */
    const seam = (y0, y1, idA, sideA, idB, sideB) => { const Y = (y0 + y1) / 2, D = Math.min(70, vh * 0.08), ga = lanes[idA], gb = lanes[idB], xa = sideA ? (ga.rok ? ga.rx : vw - 20) : (ga.ok ? ga.x : 20), xb = sideB ? (gb.rok ? gb.rx : vw - 20) : (gb.ok ? gb.x : 20);
      const P = pagePath('seam ' + idA + (idA === idB ? (sideA ? ' R-L' : ' L-R') : ' ' + idB), [[xa, Y - D], [xa, Y], [lerp(xa, xb, 0.5), Y], [xb, Y], [xb, Y + D]]); P.s0 = at(Y, 0.86); P.s1 = at(Y, 0.16); return P; };
    /* 03 → 04: across the gap under the four pillars */
    { const p = docBox($('#traction .pillars')), h = docBox($('#market .sh')); if (p && h) seq.push(seam(p[3], h[1], 'traction', 1, 'market', 0)); }
    seq.push(lane('market', 0));
    /* 04: along the first timeline, down between it and its figures, back along the second, and out to the margin */
    { const sl = $$('.mkp .runway-slider').map(docBox), pn = $$('.mkp').map(docBox), ro = $$('.mkp .readouts').map(docBox);
      if (sl[0] && sl[1] && pn[1] && ro[0]) { const r1 = sl[0], r2 = sl[1], y1 = (r1[1] + r1[3]) / 2 - 23, y2 = (r2[1] + r2[3]) / 2 - 23, gx = (r1[2] + ro[0][0]) / 2, px = (pn[1][0] + r2[0]) / 2;
        const P = pagePath('timelines', [[r1[0] + 6, y1], [r1[2] - 16, y1], [gx, y1 + 34], [gx, y2 - 34], [r2[2] - 16, y2], [r2[0] + 16, y2], [px, y2 + 40]]); P.s0 = at(y1, 0.74); P.s1 = at(y2, 0.36); seq.push(P); } }
    seq.push(lane('market', 0));
    /* 05 · the globe */
    seq.push(orbit);
    /* 06: from the margin over the tops of the plan's columns, then round the year's breakdown and out to the right */
    seq.push(lane('plan', 0));
    let planP = null;
    { const PL = RIDES.plan, ps = PL && svgAt(PL.svg);
      if (ps && PL.cx && PL.cx.length > 1) { const [ox, oy, k0] = ps, n = PL.cx.length; let key = '', tr = null;
        const make = () => { const cy = PL.cy, hw = PL.band * 0.5, up = 50 / k0, pts = [[PL.cx[0] - hw * 0.95, cy[0] - up * 0.6]];     /* over each year's total, clear of its figure */
          for (let i = 0; i < n; i++) { pts.push([PL.cx[i], cy[i] - up]); if (i < n - 1) pts.push([(PL.cx[i] + PL.cx[i + 1]) / 2, Math.min(cy[i], cy[i + 1]) - up]); }
          pts.push([PL.cx[n - 1] + hw * 0.85, cy[n - 1] - up * 1.3]); return track(pts.map(p => [ox + p[0] * k0, oy + p[1] * k0]), false); };
        const get = () => { const k = PL.cy.map(v => Math.round(v)).join(); if (k !== key || !tr) { key = k; tr = make(); } return tr; };   /* the tops move when the view or the channels change: it flies them as they are */
        const t0 = get(), P = phase('plan', function (s, o) { const t = get(); lineAt(t, timing(qOf(this, s)) * t.len, Q); o.x = Q.x; o.y = Q.y - s; look(o, CL, 1, 1); }, { live: true, glued: true, dlen: t0.len });
        P.s0 = at(t0.ys[0], 0.92); P.s1 = Math.max(P.s0 + vh * 0.2, at(t0.ys[t0.ys.length - 1], 0.16)); planP = P; seq.push(P); } }
    /* the year's breakdown: once round it where there is the scroll for it, else over its top and down its far side. The
       part is barely a screen tall, so the columns and the ring share the stretch in which both are in sight, each by
       the length of its own way round */
    { const sv = $('#ydDonut svg'), ps = svgAt(sv), pn = docBox($('#yearDetail'));
      if (ps && pn) { const [ox, oy, k0] = ps, cx = ox + 110 * k0, cy = oy + 110 * k0, r = 100 * k0 + 14, s1 = Math.max(at(cy, 0.14), planP ? planP.s0 + vh * 0.3 : -1e9);
        const turns = !planP || s1 - planP.s0 >= vh * 0.9 ? 1.5 : 0.5, P = pageOrbit('year', { x: cx, y: cy, rx: r, ry: r, th0: PI, turns, cw: true }); P.s0 = at(cy, 0.85); P.s1 = s1; seq.push(P); } }
    seq.push(lane('plan', 1));
    /* 06 → 07: across the gap under the data matrix */
    { const m = docBox($('#matrixBox')), h = docBox($('#horizon .sh')); if (m && h) seq.push(seam(m[3], h[1], 'plan', 1, 'horizon', 0)); }
    seq.push(lane('horizon', 0));
    /* 07: the line to 2036, then the right margin */
    if (traj) seq.push(traj);
    seq.push(lane('horizon', 1));
    /* 07 → 08: across the gap under the conditions */
    { const a = docBox($('#horizon .panel.assume')), h = docBox($('#crew .sh')); if (a && h) seq.push(seam(a[3], h[1], 'horizon', 1, 'crew', 0)); }
    seq.push(lane('crew', 0));
    /* 08: in across the top of the team's chart, down onto its hub, round it, and down out of the team toward the raise */
    { const hub = $('.sp-hub'), sp = $('#spider'), hb = docBox(hub), sb = docBox(sp);
      if (hb && sb && hub.offsetWidth) { const hx = (hb[0] + hb[2]) / 2, hy = (hb[1] + hb[3]) / 2, rH = (parseFloat(sp.style.getPropertyValue('--hub')) / 2 || 100) + 24, band = sb[1] + 26, lx = lanes.crew.ok ? lanes.crew.x : 20;
        const h0 = at(hy, 0.7), h1 = at(hy, 0.2);
        const pin = pagePath('team', [[lx, band], [hx - rH - 90, band], [hx - rH * 0.62, hy - rH - 14], [hx, hy - rH]]); pin.s0 = at(band, 0.75); pin.s1 = h0 - vh * 0.01;
        const hubP = pageOrbit('hub', { x: hx, y: hy, rx: rH, ry: rH, th0: -PI / 2, turns: 1.5, cw: true }); hubP.s0 = h0; hubP.s1 = h1;
        const out = pagePath('team out', [[hx, hy + rH], [hx - 34, hy + rH + 44], [hx - 44, sb[3] + 70]]); out.s0 = h1 + vh * 0.005; out.s1 = h1 + vh * 0.3;
        seq.push(pin, hubP, out); } }
    /* 09 · the raise */
    if (raise) seq.push(raise);
    /* 10: into the left margin, across under the heading, round the flywheel (each stop it passes is the step the story
       is on), and back across under the scenarios */
    seq.push(lane('beyond', 0));
    { const h = docBox($('#beyond .sh')), g = docBox($('#beyond .by-grid')); if (h && g) seq.push(seam(h[3], g[1], 'beyond', 0, 'beyond', 1)); }
    seq.push(lane('beyond', 1));
    { const FW = RIDES.fly, ps = FW && svgAt(FW.svg);
      if (ps) { const [ox, oy, k0] = ps, cx = ox + FW.size / 2 * k0, cy = oy + FW.size / 2 * k0, step = TAU / FW.n;
        const P = pageOrbit('flywheel', { x: cx, y: cy, rx: FW.r * k0, ry: FW.r * k0, th0: 0, turns: 1, cw: true }); P.s0 = at(cy, 0.84); P.s1 = at(cy, 0.2);
        let was = -1; P.stop = s => { if (s <= P.s0 || s >= P.s1) return; const t = TAU * timing(qOf(P, s)), i = Math.floor((t + PI / 2) / step + 1e-6); if (i !== was) { was = i; FW.at(i); } };
        stops.push(P); seq.push(P); } }
    seq.push(lane('beyond', 1));
    { const sc = docBox($('#beyond .scen')), By = byId.beyond; if (sc) { const Y = (sc[3] + By.top + By.h) / 2, sm = seam(Y, Y, 'beyond', 1, 'beyond', 0); sm.s0 = at(Y, 0.92); sm.s1 = at(Y, 0.4); seq.push(sm); } }
    seq.push(lane('beyond', 0));
    /* 11 · liftoff */
    if (lift) seq.push(lift);
    chain(seq);
  }

  /* the raise: down the left of the brief, under it, up the right, and back across to Beyond's margin, at a pace set by
     how far the scene has got (a monotone curve through the scene's beats, so it never stops between them) */
  function raisePhase() {
    const away = 1 + 0.45 / Math.max(0.1, R.len), eOf = s => (s - R.top) / vh / Math.max(0.001, R.len);
    if (phone || !gut.crew.ok) {      /* no room round the brief: two long passes across the sky, between the heading and the cards */
      const P = phase('raise', function (s, o) {
        const e = eOf(s), y0 = (ROOMS.skyTop || (rs.ok ? rs.t : navH)) + 10, y1 = (ROOMS.sky || vh * 0.4) - 10, amp = Math.max(0, Math.min(12, (y1 - y0) / 2 - 16));
        const k = e < 0.45 ? clamp((e - 0.09) / 0.31) : clamp((e - 0.5) / 0.32), there = e < 0.45 ? k : 1 - k;
        o.x = lerp(-60, vw + 60, there); o.y = (y0 + y1) / 2 + Math.sin(k * TAU) * amp; look(o, 34, y1 - y0 < 40 ? 0 : 1, 0, DOWN, 0.08, 1);
      }, { live: true, abs: true }); P.s0 = R.top + 0.06 * R.len * vh; P.s1 = R.top + 0.86 * R.len * vh; return P;
    }
    if (!rsRoute) rsRoute = buildRaise();
    const rt = rsRoute; if (!rt) return null;
    const m = rt.m, n = rt.end, endE = rt.back ? away : 0.93;
    const pace = monotone([0, 0.3, 0.62, 0.91, endE], [0, m[2], m[4], m[n], rt.back ? rt.tr.len : m[n]]);
    const P = phase('raise', function (s, o) {
      const e = eOf(s), d = clamp(pace(e), 0, rt.tr.len), last = clamp((d - m[n]) / Math.max(1, rt.tr.len - m[n]));
      rt.tr.at(d, Q); o.x = Q.x; o.y = Q.y; look(o, rt.back ? lerp(rt.size, gut.beyond.len, last) : rt.size, rt.back ? 1 : 1 - span(e, 0.9, 0.93), 0, DOWN, 0.12);
    }, { abs: true }); P.s0 = R.top; P.s1 = R.top + endE * R.len * vh; return P;
  }

  /* liftoff. While the view comes down to the pad it drops down the margin to the foot of the screen; from there one
     long climbing turn takes it under the closing words and across onto the line the launch rocket will come down, then
     straight up that line and out through the top of the screen, well before that rocket is due. From then on it waits
     above the screen on that line: if the story goes back, it comes down it again. The turn is laid on the scene's own
     stage, so it keeps clear of the words while the stage is still rising; it is the flight the page has always had
     here, taken through keys so it is smooth at every scroll, and the line is wherever the world puts the launch rocket */
  function liftPhase() {
    if (!lo.ok) return null;
    const narrow = phone || lo.l < 48, C0 = -0.3, len0 = phone ? 40 : 56, top = phone ? lo.b : 0, X0 = vw * (phone ? 0.5 : 0.62);
    const ax = narrow ? vw * 0.14 : lo.l / 2, ay = narrow ? lo.b + (vh - lo.b) * 0.5 : Math.max(lo.b + 70, vh * (1 + C0) - 50);   // where the climb starts from, on the stage
    const jy = Math.max(top + vh * 0.2, ay - vh * 0.32), gone = top - Math.max((len0 + 8) * 1.7, vh * (phone ? 0.2 : 0.45));
    const lineX = () => { const pd = W && W.pad; return pd && pd.on ? lerp(X0, pd.x, smooth(pd.down * 2 - 1)) : X0; };
    const lenTop = () => { const pd = W && W.pad; return clamp(pd && pd.on ? pd.h * 0.4 : 0, len0 + 8, BODY); };
    const loE = x0 => Math.pow(clamp((x0 - C0) / 0.66), 1.25);
    /* the old flight here, as the scene has it at x0 (screens since the scene pinned) */
    const path = x0 => { const st = x0 < 0 ? -x0 * vh : 0;
      if (x0 < C0) { if (narrow) { const k = span(x0, -0.42, C0); return [lerp(-70, ax, k), Math.min(ay + st, vh - 40) + (1 - k) * 24]; } return [ax, lerp(vh * 0.55, Math.min(ay + st, vh - 40), smooth(span(x0, -0.62, C0)))]; }
      const e = loE(x0), u = clamp(e / 0.6), q = 1 - u, v = clamp((e - 0.6) / 0.4);
      return [X0 + (ax - X0) * Math.pow(q, 2.4), Math.min(v > 0 ? lerp(jy, gone, v) : q * q * ay + 2 * u * q * (ay + vh * 0.03) + u * u * jy, vh - 40 - st) + st]; };
    const xs = narrow ? [-0.42, -0.36, C0, -0.2, -0.1, 0, 0.06, 0.139, 0.2, 0.28, 0.36] : [-0.62, -0.5, -0.4, C0, -0.2, -0.1, 0, 0.06, 0.139, 0.2, 0.28, 0.36];
    const sOf = x0 => L.top + x0 * vh, curve = keyed(xs.map(x0 => { const p = path(x0); return { s: sOf(x0), x: p[0], y: p[1] }; }));
    if (!curve) return null;
    const sEnd = sOf(0.36);
    const P = phase('liftoff', function (s, o) {
      const x0 = (s - L.top) / vh, pe = x0 / Math.max(0.001, L.len), e = loE(x0), u = clamp(e / 0.6), v = clamp((e - 0.6) / 0.4);
      if (s >= sEnd) { o.x = X0; o.y = gone; } else curve.at(s, o);
      o.x += (lineX() - X0) * (1 - Math.pow(1 - u, 2.4));
      const a = document.body.classList.contains('launching') ? 0 : 1 - span(pe, 0.108, 0.117);
      look(o, lerp(len0, lenTop(), smooth((e - 0.45) / 0.55)), a, 0, DOWN, 0.06, Math.max(smooth(v / 0.15), narrow ? 1 - span(x0, -0.42, C0) : 0));   /* free to leave the screen: coming in from its edge, and going out of its top */
      if (phone) o.cut = lo.b + (x0 < 0 ? -x0 * vh : 0);
    }, { live: true, abs: true }); P.s0 = sOf(xs[0]); P.s1 = Math.max(sEnd + vh, L.top + L.h);
    return P;
  }

  /* the phases in story order, laid end to end: the figures keep their own stretches (where two would touch, both give
     a little); a margin takes the room its neighbours leave it (or none, and the bridge goes straight across); and every
     gap is bridged, from the end of one to the start of the next, at both their velocities */
  function chain(seq) {
    const BW = clamp(vh * 0.16, 70, 170), MINB = Math.max(40, vh * 0.06), MINL = vh * 0.12;
    const hard = seq.filter(p => !p.soft);
    for (const p of hard) if (!(p.s1 > p.s0 + 2)) p.s1 = p.s0 + Math.max(40, vh * 0.05);
    for (let i = 1; i < hard.length; i++) {
      const p = hard[i - 1], n = hard[i];
      if (n.join) { n.s0 = p.s1; if (n.s1 < n.s0 + 20) n.s1 = n.s0 + 20; continue; }
      const need = p.s1 + MINB - n.s0; if (need <= 0) continue;
      /* a figure gives up to half of its stretch; a scene of its own simply hands over a little earlier or later */
      const take = (P, want) => P.abs ? want : Math.min(want, Math.max(0, (P.s1 - P.s0) * 0.5 - 20));
      let a = take(n, need / 2); const b = take(p, need - a); if (a + b < need) a = take(n, need - b);
      n.s0 += a; p.s1 -= b;
      if (p.s1 + MINB > n.s0) { const mid = (p.s1 + n.s0) / 2; p.s1 = mid - MINB / 2; n.s0 = mid + MINB / 2; }
      if (p.s1 < p.s0 + 20) p.s1 = p.s0 + 20; if (n.s0 < p.s1 + 8) n.s0 = p.s1 + 8; if (n.s1 < n.s0 + 20) n.s1 = n.s0 + 20;
    }
    const out = [];
    for (let i = 0; i < seq.length; i++) {
      const g = seq[i];
      if (g.soft) {
        const p = out.filter(x => !x.soft).pop(), n = seq.slice(i + 1).find(x => !x.soft); if (!p || !n) continue;
        g.s0 = p.s1 + BW; g.s1 = n.s0 - BW;
        if (g.s1 - g.s0 < (g.park ? 4 : MINL)) { if (g.park && n.s0 - p.s1 > 12) { const m = (p.s1 + n.s0) / 2; g.s0 = m - 2; g.s1 = m + 2; } else continue; }
        const last = out[out.length - 1];
        if (last && last.soft) {
          if (last.key === g.key) { last.s1 = g.s1; continue; }
          if (g.s0 < last.s1 + MINB) { const m = (Math.max(last.s0, g.s0) + Math.min(last.s1, g.s1)) / 2; last.s1 = Math.max(last.s0 + 2, m - MINB / 2); g.s0 = Math.max(last.s1 + MINB, m + MINB / 2); if (g.s1 < g.s0 + 2) continue; }
        }
      }
      out.push(g);
    }
    /* a run of figures with no wait between them: the stretch from the first one's start to the last one's end is shared
       out by the length of each one's way, and of each crossing from one to the next, so the pace is even along the run */
    for (let i = 0; i < out.length;) { let j = i; while (j + 1 < out.length && out[j].glued && out[j + 1].glued) j++; if (j > i) evenOut(out.slice(i, j + 1)); i = j + 1; }
    route = [];
    for (let i = 0; i < out.length; i++) { if (i && !out[i].join) route.push(bridge(out[i - 1], out[i])); route.push(out[i]); }
  }
  function evenOut(run) {
    const S0 = run[0].s0, T = run[run.length - 1].s1 - S0, w = [];
    for (let k = 0; k < run.length; k++) {
      w.push(Math.max(40, run[k].dlen || 0));
      if (k < run.length - 1) { const P = run[k], N = run[k + 1]; P.at(P.s1, E1); N.at(N.s0, E2); w.push(Math.max(30, Math.hypot(E2.x - E1.x, E2.y + N.s0 - E1.y - P.s1) * 1.15)); }
    }
    const tot = w.reduce((a, b) => a + b, 0); let s = S0;
    run.forEach((P, k) => { P.s0 = s; s += w[2 * k] / tot * T; P.s1 = s; if (k < run.length - 1) s += w[2 * k + 1] / tot * T; });
  }

  /* a bridge from the end of one phase to the start of the next: a cubic from the one's place and velocity there to the
     other's, with the way it is drawn (length, visibility, how far it is fixed to the page...) passing smoothly from the
     one to the other. Where either end is read from the world (or from a figure that can change), the bridge carries
     the difference between where that end was when it was laid and where it is now, so it always meets it */
  const E1 = {}, E2 = {};
  /* where a phase is at one of its ends, and its velocity there, taken from inside it (side -1: its end, 1: its start) */
  function endOf(P, s, side, o) {
    const h = 2; P.at(s, o); const x = o.x, y = o.y; P.at(s + side * h, E2);
    o.dx = side < 0 ? (x - E2.x) / h : (E2.x - x) / h; o.dy = side < 0 ? (y - E2.y) / h : (E2.y - y) / h; return o;
  }
  function bridge(P, N) {
    const a = endOf(P, P.s1, -1, {}), b = endOf(N, N.s0, 1, {}), s0 = P.s1, s1 = N.s0;
    const K = keyed([{ s: s0, x: a.x, y: a.y, d: { x: a.dx, y: a.dy } }, { s: s1, x: b.x, y: b.y, d: { x: b.dx, y: b.dy } }]), live = P.live || N.live;
    return phase('bridge', function (s, o) {
      const u = smooth((s - s0) / Math.max(1, s1 - s0)); if (K) K.at(s, o); else { o.x = lerp(a.x, b.x, u); o.y = lerp(a.y, b.y, u); }
      if (live) { P.at(s0, E1); N.at(s1, E2); } const A = live ? E1 : a, Z = live ? E2 : b;
      if (live) { o.x += lerp(A.x - a.x, Z.x - b.x, u); o.y += lerp(A.y - a.y, Z.y - b.y, u); }
      o.len = lerp(a.len, b.len, u); o.a = lerp(a.a, b.a, u); o.g = lerp(a.g, b.g, u); o.fr = lerp(a.fr, b.fr, u); o.fx = lerp(a.fx, b.fx, u); o.fy = lerp(a.fy, b.fy, u); o.free = lerp(a.free, b.free, u); o.cut = 0; o.gy = NaN;
      if (A.hr > 0 && Z.hr > 0) { o.hx = lerp(A.hx, Z.hx, u); o.hy = lerp(A.hy, Z.hy, u); o.hr = lerp(A.hr, Z.hr, u); } else o.hr = 0;     /* behind the same planet at both ends: behind it all the way */
    }, { s0, s1, bridge: true, from: P, to: N });
  }

  /* where the route is at scroll s (before its start, at its start; after its end, at its end) */
  function sample(s, o) {
    const n = route.length; if (!n) return null;
    if (s <= route[0].s0) { route[0].at(route[0].s0, o); o.P = route[0]; return o; }
    if (s >= route[n - 1].s1) { route[n - 1].at(route[n - 1].s1, o); o.P = route[n - 1]; return o; }
    let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (route[m].s1 < s) lo = m + 1; else hi = m; }
    route[lo].at(s, o); o.P = route[lo]; return o;
  }
  /* which way the route runs at s, over the ground under it: a ladder of centred chords (a crisp one where it moves,
     wider ones where it barely does), plus the way this part of the story faces, which only tells at a standstill */
  const H1 = {}, H2 = {}, V = { x: 0, y: 0 }, LADDER = [22, 60, 150];
  /* how fast, and which way, it goes over the ground under it at s (px per px of scroll) */
  function vel(s, h, o) {
    sample(s - h, H1); sample(s + h, H2); o.x = (H2.x - H1.x) / (2 * h);
    o.y = H1.P === H2.P && isFinite(H1.gy) && isFinite(H2.gy) ? (H2.y - H2.gy - H1.y + H1.gy) / (2 * h) : (H2.y - H1.y) / (2 * h) + (H1.fr + H2.fr) / 2; return o;   /* gy: where a phase knows exactly how far its ground has moved */
  }
  function heading(s) {
    vel(s, 4, V); let vx = V.x, vy = V.y, w = 0.225;
    for (const r of LADDER) { vel(s - r, 4, V); vx += w * V.x; vy += w * V.y; vel(s + r, 4, V); vx += w * V.x; vy += w * V.y; w *= 0.45; }
    sample(s, H1); return Math.atan2(vy + H1.fy, vx + H1.fx);
  }

  /* ───────── the world's own places ───────── */
  const globe = { ok: false, x: 0, y: 0, r: 0, key: '' };
  let worldOn = false, sysShow = 1;
  function watchWorld(world) {
    let again = false;
    if (!!world !== worldOn) { worldOn = !!world; again = true; }
    /* the globe: where it stands on its stage, and its size once risen (read back through the rise it is at). The route
       is laid on it when it is first drawn and when its size changes; where it moves on its stage is read as it goes */
    const o = world && world.map;
    if (o && o.live && world.mode === 'globe') { const rise = lerp(0.84, 1, smooth(clamp(1 + M.pe * M.len))), r = o.r / rise, key = [vw, vh, Math.round(r / 6)].join();
      if (key !== globe.key) { globe.key = key; globe.ok = true; globe.x = o.x; globe.y = o.y; globe.r = r; again = true; why = 'globe ' + key; } }
    /* the patrol is laid out once the view has settled on the finished system (the year marks are where the world
       draws them); the first time, it fades in over a third of a second, in case it is laid while it is in sight */
    if (world && sys) { const S = sys.state, E = S.slots.enterprise, built = S.pose >= 0.999 && S.ring[4] >= 0.999 && world.out.dive < 0.003;
      if (built) { const key = [vw, vh, S.wide, E.x.toFixed(1), E.y.toFixed(1), E.r.toFixed(1)].join(), e = world.out.worlds.enterprise;
        if (key !== sysKey && Math.abs(e.x - E.x) + Math.abs(e.y - E.y) < 1.5) { const had = !!sysRoute; sysKey = key; sysRoute = buildSys(S, world.out); if (!had && sysRoute) { sysT0 = performance.now(); sysShow = 0; } again = true; why = 'system'; } } }
    if (sysShow < 1) sysShow = clamp((performance.now() - sysT0) / 330);
    return again;
  }

  /* ───────── the rocket itself ───────── */
  const PO = {}, PA = {};
  let sE = null, lastE = 0, revWant = 0, revMix = 0, contOff = null, lastPose = null, lays = 0, why = '';
  const pose = { x: 0, y: 0, ang: DOWN, len: 40, alpha: 0, flame: 0.55, bank: 0, s: 0, phase: '' };
  let wShown = false, wTr = '', wOp = -1, wFlame = -1, wClip = '', wCut = -1;
  function hideShip() { if (wShown) { wShown = false; ship.style.visibility = 'hidden'; } }
  /* the layout changed: the route is laid again. A rocket on the screen is carried from where it was onto the new route
     over the next stretch of scroll (or, if the page is still, in under a second), never jumped there */
  function relay() {
    const was = lastPose; measure(); lays++;
    if (was && was.alpha > 0.01 && route.length) { sample(was.s, PA); const dx = was.rx - PA.x, dy = was.ry - PA.y; if (Math.abs(dx) < vh * 0.5 && Math.abs(dy) < vh * 0.5 && Math.hypot(dx, dy) > 0.5) contOff = { dx, dy, at: was.s, t0: performance.now() }; }
  }

  /* sy: the scroll; syS: the scroll the scenes are eased to; dt: seconds since the last frame; world: the world behind
     the page, or null; rooms: what the page has measured on a phone's raise (padRooms in main.js) */
  function frame(sy, syS, dt, t, world, rooms) {
    W = world; ROOMS = rooms || NONE;
    let again = dirty; if (again) why = 'layout'; else for (let i = 0; i < RID.length; i++) { const r = RIDES[RID[i]]; if ((r && r.svg) !== laid[i]) { again = true; why = 'figure ' + RID[i]; break; } }     /* a figure drawn (or drawn again at a new size) */
    if (watchWorld(world)) again = true;
    if (again) relay();
    if (STILL || !world || !sys) { flatFrame(sy); return; }
    /* the eased scroll: the same lowpass as the world's, so the two never part; a jump of more than two and a half
       screens is taken at once */
    if (sE === null || Math.abs(sy - sE) > vh * 2.5) sE = sy;
    else if (sE !== sy) { sE += (sy - sE) * (1 - Math.exp(-dt * 10)); if (Math.abs(sy - sE) < 0.4) sE = sy; }
    const s = sE, delta = s - lastE; lastE = s;
    /* the lines it draws, and the stops it lights */
    for (const P of rides) P.R.go(P.k(s));
    for (const P of stops) P.stop(s);
    if (!sample(s, PO)) { hideShip(); return; }
    /* the nose: the way the route runs, turned round to point the way it is going while the page goes back */
    const h = heading(s);
    if (Math.abs(delta) > 1.5) revWant = delta < 0 ? 1 : 0;
    revMix += (revWant - revMix) * Math.min(1, dt * 5.5); if (Math.abs(revWant - revMix) < 1e-3) revMix = revWant;
    const lean = clamp(wrap(heading(s + 6) - heading(s - 6)) * 0.72, -0.18, 0.18) * (1 - 2 * revMix);
    /* the flame: how fast it goes over the ground under it, with a flicker that moves with the scroll and stops with it */
    const pace = Math.hypot(vel(s, 4, V).x, V.y);
    let fl = clamp(0.55 + Math.max(0, pace - 0.25) * 0.34, 0.55, 1.5); if (fl > 0.62) fl *= 1 + 0.06 * Math.sin(s * 0.019) + 0.04 * Math.sin(s * 0.047 + 2);
    /* where: on the route; as far as the route is fixed to the page, carried with the page; then kept on the screen */
    const lag = vh * 0.4; let x = PO.x, y = PO.y - PO.g * lag * Math.tanh((sy - s) / lag);
    let keep = 0; if (contOff) { keep = (1 - smooth(Math.abs(s - contOff.at) / 260)) * (1 - smooth((performance.now() - contOff.t0) / 800)); if (keep <= 0.001) { contOff = null; keep = 0; } else { x += contOff.dx * keep; y += contOff.dy * keep; } }
    const len = PO.len, m = len * 0.5 + 4, right = Math.min(vw, railX < 1e4 ? railX - 6 : vw);
    if (PO.free < 1) { x = lerp(fenceAxis(x, m, right - m), x, PO.free); y = lerp(fenceAxis(y, navH + 4 + m, vh - m), y, PO.free); }
    const ang = wrap(h + PI * revMix);
    pose.x = x; pose.y = y; pose.ang = ang; pose.len = len; pose.alpha = PO.a; pose.flame = fl; pose.bank = lean; pose.s = s; pose.phase = PO.P.name;
    lastPose = { rx: PO.x + (contOff ? contOff.dx * keep : 0), ry: PO.y + (contOff ? contOff.dy * keep : 0), alpha: PO.a, s };
    draw(x, y, ang, lean, len, PO.a, fl, PO, PO.cut);
  }
  /* no flight (still, or no world): it stands at the head of a chart's line, wherever the scroll has drawn it to, or at
     the head of the journey's line; no flame */
  function flatFrame(sy) {
    sE = null; revMix = revWant = 0; lastPose = null;
    for (const P of rides) P.R.go(STILL ? 1 : P.k(sy));
    for (const P of rides) { if (sy < P.s0 || sy > Math.max(P.b, P.s1)) continue;
      const s = STILL ? P.s1 : clamp(sy, P.s0, P.s1); P.at(s, PO); const y = PO.y + s - sy;
      if (y < navH + PO.len * 0.6 || y > vh - PO.len * 0.6) break;
      draw(PO.x, y, headAt(P.R.line, P.k(s) * P.R.line.len), 0, PO.len, 1, STILL ? 0 : 0.5, null, 0); return; }
    const mid = sy + vh * 0.5;
    if (jr.ok && mid >= J.top - vh && mid < byId.traction.top + vh) { const y = clamp(vh * 0.5, jr.top - sy, jr.bottom - sy);
      if (y > navH + jr.len && y < vh - jr.len * 0.5) { draw(jr.x, y, DOWN, 0, jr.len, 1, STILL ? 0 : 0.5, null, 0); return; } }
    hideShip();
  }
  /* one transform; the flame's length, the opacity and the cuts only when they change */
  function draw(px, py, ang, bank, len, alpha, flame, hid, cutY) {
    if (alpha < 0.004) { hideShip(); return; }
    const k = len / BODY, roll = (1 - Math.abs(bank) * 0.5) * (1 - 0.3 * Math.sin(PI * revMix)), rot = ang + bank * 0.5;   /* roll: it leans into a turn, and rolls as it turns round */
    const tr = `translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0) rotate(${(rot * 180 / PI + 90).toFixed(2)}deg) scale(${(k * roll).toFixed(4)},${k.toFixed(4)})`;
    if (tr !== wTr) { wTr = tr; ship.style.transform = tr; }
    if (!wShown) { wShown = true; ship.style.visibility = 'visible'; }
    let op = Math.round(alpha * 50) / 50;
    const fq = Math.round(flame * 25) / 25; if (fq !== wFlame) { wFlame = fq; flameEl.style.setProperty('--f', fq); }
    /* behind a planet: the planet's disc is cut out of it, in its own frame (a circle there is an ellipse here) */
    let clip = '';
    if (hid && hid.hr > 0) { const dx = hid.hx - px, dy = hid.hy - py, r = hid.hr;
      if (Math.hypot(dx, dy) < r + len * 1.6) {
        if (canClip) { const a = -rot - PI / 2, c = Math.cos(a), s = Math.sin(a), cx = (dx * c - dy * s) / (k * roll), cy = (dx * s + dy * c) / k, rx = r / (k * roll), ry = r / k;
          clip = `path(evenodd,"M-300-300H300V400H-300ZM${(cx - rx).toFixed(1)} ${cy.toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx + rx).toFixed(1)} ${cy.toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx - rx).toFixed(1)} ${cy.toFixed(1)}Z")`; }
        else op = Math.round(alpha * clamp((Math.hypot(dx, dy) - r + len * 0.3) / (len * 0.6)) * 50) / 50; } }
    if (op !== wOp) { wOp = op; ship.style.opacity = op; }
    if (clip !== wClip) { wClip = clip; ship.style.clipPath = clip || 'none'; }
    const cut = Math.max(0, Math.round(cutY || 0)); if (cut !== wCut) { wCut = cut; layer.style.clipPath = cut ? `inset(${cut}px 0 0 0)` : 'none'; }
  }

  /* for checking: the pose the route gives at a scroll (the reading a frame makes there, before it is carried with the
     page or fenced), and the route's phases */
  function probe(s) { if (!route.length) return null; sample(s, PA); return { s, phase: PA.P.name, x: PA.x, y: PA.y, len: PA.len, a: PA.a, g: PA.g, free: PA.free, ang: heading(s) }; }
  return { frame, soil, probe,
    phases: () => route.map(p => ({ name: p.name, s0: Math.round(p.s0), s1: Math.round(p.s1) })),
    peek: () => ({ s: sE, x: pose.x, y: pose.y, ang: pose.ang, len: pose.len, alpha: wShown ? pose.alpha : 0, flame: pose.flame, bank: pose.bank, rev: revMix, phase: pose.phase, shown: wShown, lays, why, clip: wClip !== '', cut: wCut }) };
}

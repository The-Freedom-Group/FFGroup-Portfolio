/* The courier: the small rocket that travels the whole story. It is the launch rocket of the last part (w-pad.js: the
   porcelain body, the pink nose and bands, the two boosters) drawn once in two dimensions, and that one drawing is also
   the handle on the progress rail and the rocket that leads the two chart lines.
   The first screen has its own copy (sysmap.js), which falls into the hole; this one comes out of the new planet after
   the nova and circles it while the map builds. Once the system has built itself it patrols behind Enterprise,
   through the open sky under the heading and under the four figures; it goes into Freedom Global ahead of the dive, is
   seen falling through the cloud, and holds beside the investment focus; down the journey it is the head of the line
   on the left; beside the figures, the plan, the team and Beyond it rests in a margin and crosses the page to the
   other one now and then; it circles the expansion map's
   globe, in front and then away behind it; it rounds the raise at dusk; and as the view comes down to the launch pad
   it climbs out through the top of the screen on the very line the launch rocket then comes down.
   The page moves a target along that route; the rocket chases it (it is never glued to the scroll), turns its nose
   through its own heading, leans into turns, burns longer the faster it goes and bobs when it rests. If the target is
   suddenly far away (a jump to another part) it leaves by the nearest edge and comes in again by another.
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

/* ───────── the flight ───────── */
const PI = Math.PI, TAU = PI * 2, DOWN = PI / 2, UP = -PI / 2;
const wrap = a => { a = (a + PI) % TAU; return (a < 0 ? a + TAU : a) - PI; };
const BODY = 96;                                                   // the length the courier is drawn at; it is only ever scaled down from this, so it stays sharp
const MARGIN = ['traction', 'market', 'plan', 'horizon', 'crew', 'beyond'];   // the parts where it keeps to the left margin

/* a smooth line through points (Catmull-Rom), walked by distance. marks[i]: how far along the i-th point is */
function track(pts, closed) {
  const n = pts.length, P = i => pts[closed ? (i % n + n) % n : clamp(i, 0, n - 1)], xs = [], ys = [], marks = [];
  for (let i = 0, segs = closed ? n : n - 1; i < segs; i++) {
    const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2), steps = Math.max(3, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 9)); marks.push(xs.length);
    for (let k = 0; k < steps; k++) { const t = k / steps, t2 = t * t, t3 = t2 * t;
      xs.push(0.5 * (2 * b[0] + (c[0] - a[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (3 * b[0] - a[0] - 3 * c[0] + d[0]) * t3));
      ys.push(0.5 * (2 * b[1] + (c[1] - a[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (3 * b[1] - a[1] - 3 * c[1] + d[1]) * t3)); }
  }
  marks.push(xs.length); xs.push(P(closed ? 0 : n - 1)[0]); ys.push(P(closed ? 0 : n - 1)[1]);
  const cum = [0]; for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  const len = cum[cum.length - 1] || 1;
  return { xs, ys, len, closed, marks: marks.map(i => cum[i]),
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

/* byId: the page's sections (main.js keeps their progress); sys: the system as the page drives it (sysmap.js);
   mapSpan: the stretch of the map scene its nine territories share */
export function createCourier({ byId, sys, mapSpan = [0.44, 0.895] }) {
  const layer = el('div', { id: 'courier', 'aria-hidden': 'true' }), ship = el('div.cr'), pic = svg('svg', { viewBox: `${-ART.w / 2} -1 ${ART.w} ${ART.len + 2}`, class: 'rk' }, ship);
  const flameEl = rocketArt(pic, { trail: true }); layer.append(ship); document.body.append(layer);
  const canClip = !!(window.CSS && CSS.supports && CSS.supports('clip-path', 'path(evenodd, "M0 0H1V1Z")'));
  const A = byId.top, B = byId.system, F = byId.focus, J = byId.journey, M = byId.map, R = byId.raise, L = byId.liftoff;

  /* ───────── what it steers by: measured when the layout changes ───────── */
  let dirty = true, vw = 0, vh = 0, phone = false, railX = 1e5, navH = 64;
  const gut = {}, jr = { ok: false, x: 0, top: 0, bottom: 0, shift: 0, len: 40 }, fo = { left: 0, ok: false }, rs = { ok: false }, lo = { ok: false }, yr = { w: 46, h: 20 };
  let sysRoute = null, sysKey = '', rsRoute = null;
  /* where a thing is on its scene's stage, whatever the page has moved it by since */
  const box = (e, stage) => { if (!e || !e.offsetParent) return null; let x = 0, y = 0, n = e; while (n && n !== stage) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y, x + e.offsetWidth, y + e.offsetHeight]; };
  const join = (...b) => { b = b.filter(Boolean); return b.length ? [Math.min(...b.map(v => v[0])), Math.min(...b.map(v => v[1])), Math.max(...b.map(v => v[2])), Math.max(...b.map(v => v[3]))] : null; };
  const room = w => clamp(w * 0.62, 30, 50);                       // how long it may be in a margin this wide
  function measure() {
    dirty = false; vw = innerWidth; vh = innerHeight; phone = vw < 900; sysKey = ''; rsRoute = null;
    const rail = $('#rail'), rk = rail && $('.rk', rail); railX = rk && getComputedStyle(rail).display !== 'none' ? rk.getBoundingClientRect().left : 1e5;
    navH = ($('#nav') || {}).offsetHeight || 64;
    /* the left margin of each reading sheet: from the edge of the screen to where its words begin */
    const edgeR = railX < 1e4 ? railX - 8 : vw;
    MARGIN.forEach(id => { const w = $('.wrap', byId[id].sec), r = w && w.getBoundingClientRect(); let free = r ? r.left + parseFloat(getComputedStyle(w).paddingLeft) : 0, end = r ? r.right - parseFloat(getComputedStyle(w).paddingRight) : vw;
      if (id === 'crew') { const wide = $('.crew-wide', byId[id].sec); if (wide && wide.offsetParent) { const q = wide.getBoundingClientRect(), cs = getComputedStyle(wide); free = Math.min(free, q.left + parseFloat(cs.paddingLeft)); end = Math.max(end, q.right - parseFloat(cs.paddingRight)); } }   // the staff chart runs wider than the words
      const freeR = edgeR - end;
      gut[id] = { ok: free >= 48, x: free / 2, len: room(free), rok: freeR >= 48, rx: end + freeR / 2, rlen: room(freeR) }; });
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
      return { tr, size, homes: right && left ? [0, tr.marks[1 + right.go.length], tr.len] : [0, tr.len], speed: 0.55, drift: 46 };   // homes: how far round it is behind Enterprise
    }
    /* narrow: an ellipse round Enterprise, behind it across the top and in front across the bottom */
    const names = $$('.lb', st).map(n => { const b = box(n, st), w = b ? (b[2] - b[0]) / 2 : 0; return b && [b[0] - w, b[1], b[2] - w, b[3]]; });      // each name is centred on its world (the page shifts it left by half its width)
    const boxes = [...keep, box($('#sysHead'), st), ...names, ...cos.map(slot)].filter(Boolean), size = clamp(E.r * 0.95, 20, 28);
    for (const k of [1, 0.82, 0.66]) {
      const rx = Math.min(vw * 0.36, E.r * 5.4) * k, ry = Math.max(E.r * 0.74, 13), pts = []; for (let i = 0; i < 24; i++) { const a = -PI / 2 + i / 24 * TAU; pts.push([E.x + Math.cos(a) * rx, E.y + Math.sin(a) * ry]); }
      const tr = track(pts, true), far = [E.x - E.r, E.y - E.r, E.x + E.r, E.y + E.r];
      if (clear(tr, boxes.filter(b => !(b[0] <= far[0] && b[2] >= far[2] && b[1] <= far[1] && b[3] >= far[3])), size * 0.13 + 3)) return { tr, size, homes: [0, tr.len], speed: 0.4, drift: 30 };
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

  /* ───────── where it should be now ─────────
     T: where (x, y), how long (len), how visible (a), which way it faces at rest (face), how hard it follows (k),
     how much the scroll feeds its flame (thr), the disc it is behind (hide), a line it does not show above (cut).
     show: this part of the story has the courier in it. dock: hidden where it stands, to be shown from there. */
  const T = { show: false, x: 0, y: 0, len: 40, a: 1, face: null, k: 7, thr: 0, hide: null, cut: 0, dock: false, hard: false }, P = { x: 0, y: 0 }, hole = { x: 0, y: 0, r: 0 };
  let dir = 1, lead = 0, sysOn = false, sysU = 0, orbitOn = false, preOn = false, pth = 0, curMid = 0, side = 0, th = PI, rsOn = false, rsD = 0, loOn = false, loE = 0, run = 0, lastS = 0, lastSy = 0, sv = 0;
  const partAt = mid => { let id = MARGIN[0]; for (const m of MARGIN) if (mid >= byId[m].top) id = m; return id; };
  /* the reading parts: it rests in a margin, and every so often (every screen and a bit of scroll) it crosses the page
     to the other margin, on a long diagonal, nose first, with its trail out: the old site's rocket did the same. The
     crossing is its own flight (the scroll only says which side it should be on), so it never stops over the words */
  const CROSS = 1.15;
  function margin(id) {
    const g = gut[id]; if (!g || !g.ok) return false; T.show = true; T.face = dir > 0 ? DOWN : UP; T.thr = 0.55;
    const u = (curMid - byId[id].top) / vh, want = g.rok ? ((Math.floor(u / CROSS) % 2) + 2) % 2 : 0;
    side = want; const right = side === 1;
    T.x = right ? g.rx : g.x; T.len = right ? g.rlen : g.len; T.y = vh * (right ? 0.36 : 0.62) + lead; T.k = 4; T.hard = true;     // k: a crossing takes about a second
    return true;
  }
  /* the journey: it is the head of the line's pink fill, which ends at the middle of the screen. Before the line has
     come up that far, and after it has gone, it waits a little to the left of it, clear of the headings */
  function onLine(sy, flat) {
    if (!jr.ok) return; const top = jr.top - sy, bot = jr.bottom - sy, y = vh * 0.5, off = top > y ? smooth((top - y) / 80) : bot < y ? smooth((y - bot) / 80) : 0;
    T.len = jr.len; T.face = dir > 0 ? DOWN : UP; T.thr = 0.6; T.k = 11;
    if (flat) { T.x = jr.x; T.y = clamp(y, top, bot); T.show = T.y > navH + T.len && T.y < vh - T.len * 0.5; return; }   // parked: on the line, wherever its fill ends
    T.show = true; T.x = jr.x - jr.shift * off; T.y = y + lead * off;
  }
  function aim(sy, syS, dt, world, rooms, flat, moved) {
    T.show = false; T.a = 1; T.face = null; T.k = 7; T.thr = 0; T.hide = null; T.cut = 0; T.dock = false; T.hard = false; T.len = 40;
    const mid = syS + vh * 0.5, wasOrbit = orbitOn, wasRs = rsOn, wasLo = loOn, wasPre = preOn; orbitOn = rsOn = loOn = preOn = false; curMid = mid;   // round the globe, round the brief, up from the pad: each begins afresh when the story comes back to it
    if (flat) { if (mid >= J.top - vh && mid < byId.traction.top + vh) onLine(sy, true); return; }   // no flight: it stands at the head of the journey's line
    if (B.x < 0 && sys.state.born < 0.5) { sysOn = false; return; }                                  // the opening: it is away (in the first screen's own rocket, sysmap.js) until the new planet is born
    const out = world.out;
    /* 01 · the system, and the dive at Freedom Global */
    if (F.x < -0.3) {
      const S = sys.state, E = S.slots.enterprise, built = S.pose >= 0.999 && S.ring[4] >= 0.999 && out.dive < 0.003;
      /* the patrol is laid out once the view has settled on the finished system (the year marks are where the world draws them) */
      if (built) { const key = [vw, vh, S.wide, E.x.toFixed(1), E.y.toFixed(1), E.r.toFixed(1)].join(), o = out.worlds.enterprise; if (key !== sysKey && Math.abs(o.x - E.x) + Math.abs(o.y - E.y) < 1.5) { sysKey = key; sysRoute = buildSys(S, out); sysOn = false; } }
      const rt = sysKey ? sysRoute : null; T.show = true; T.len = rt ? rt.size : 30;
      if (out.dive >= 0.003) {      /* it goes in ahead: down to Freedom Global, smaller and smaller, and into it */
        const g = out.worlds.global; T.x = g.x; T.y = g.y; if (!sysOn || !rt) { T.a = 0; T.dock = true; return; }
        T.len = lerp(rt.size, 9, span(out.dive, 0.015, 0.12)); T.a = 1 - span(out.dive, 0.08, 0.14); T.k = 6; T.dock = T.a < 0.004; return;
      }
      /* the new planet: it comes out of it after the nova and circles it close, behind and in front, while the map builds */
      const o = out.worlds.enterprise;
      if (!built && !sysOn && o.r > 3) {
        if (!wasPre) pth = PI * 0.35; preOn = true;
        const rx = Math.max(o.r * 2.25, 46), ry = rx * 0.3, tl = -0.16, a = smooth(span(S.born, 0.55, 0.85));
        pth -= Math.min(moved * 0.6 + 70 * dt, 700 * dt) / rx; if (pth < -PI) pth += TAU;
        const ex = Math.cos(pth) * rx * (0.35 + 0.65 * a), ey = Math.sin(pth) * ry * (0.35 + 0.65 * a);
        T.x = o.x + ex * Math.cos(tl) - ey * Math.sin(tl); T.y = o.y + ex * Math.sin(tl) + ey * Math.cos(tl); T.len = clamp(o.r * 0.95, 22, 42); T.k = 10; T.a = a; T.dock = a < 0.004;
        if (T.dock) { T.x = o.x; T.y = o.y; }
        if (Math.sin(pth) < 0) { hole.x = o.x; hole.y = o.y; hole.r = o.r * 0.97; T.hide = hole; }
        return;
      }
      if (!rt || (!built && !sysOn)) { T.a = 0; T.dock = true; T.x = E.x; T.y = E.y; return; }       // not yet: it waits behind Enterprise
      const tr = rt.tr;
      if (!sysOn) { sysOn = true; sysU = 0; if (!wasPre) { T.a = 0; T.dock = true; T.x = E.x; T.y = E.y; return; } }   // it sets out from behind Enterprise; straight on from the close orbit if it was on it
      if (!built) {                 /* the story has gone back to before the system stood: home behind Enterprise by the shorter way, then out of sight */
        const u = ((sysU % tr.len) + tr.len) % tr.len; let to = rt.homes[0]; for (const h of rt.homes) if (Math.abs(h - u) < Math.abs(to - u)) to = h;
        const step = 1100 * dt; if (Math.abs(to - u) <= step + 2) { sysOn = false; T.a = 0; T.dock = true; T.x = E.x; T.y = E.y; return; } sysU = u + Math.sign(to - u) * step;
      } else sysU += Math.min(moved * rt.speed + rt.drift * dt, 900 * dt);
      tr.at(sysU, P); T.x = P.x; T.y = P.y; T.k = 9;
      /* behind Enterprise: on the wide patrol whenever it is near the planet (it only ever passes behind it); on the small orbit, across the top */
      if (S.wide ? Math.abs(P.x - E.x) < E.r * 1.65 : P.y < E.y + 1) { hole.x = E.x; hole.y = E.y; hole.r = E.r * 0.97; T.hide = hole; }
      return;
    }
    /* the way down: through the cloud, then beside the investment focus, then across to the journey's line */
    if (mid < J.top) {
      /* it falls nose down through the cloud, a little to the left of the middle, and draws across to its place beside the box as the sheet comes in */
      const pe = F.pe, hx = fo.ok ? fo.left - 60 : vw * 0.5, hy = vh * 0.5 + 24, k = smooth((pe - 0.07) / 0.23);
      T.show = true; T.face = DOWN; T.thr = 0.5; T.x = lerp(lerp(vw * 0.5, hx, 0.45), hx, span(pe, 0.19, 0.31)); T.y = lerp(vh * 0.26, hy, k); T.len = lerp(phone ? 52 : 68, phone ? 40 : 52, k);
      if (pe < 0.055) { T.a = 0; T.dock = true; return; }
      T.a = span(pe, 0.055, 0.1) * (fo.ok ? 1 : 1 - span(pe, 0.2, 0.26));
      const k2 = span(pe, 0.6, 0.8); if (k2 > 0) { if (jr.ok) { T.x = lerp(T.x, jr.x - jr.shift, k2); T.y = lerp(T.y, vh * 0.5, k2); T.len = lerp(T.len, jr.len, k2); } else T.a *= 1 - span(pe, 0.6, 0.68); }
      if (T.a < 0.004) T.dock = true; return;
    }
    /* 02 · the journey: the head of the line */
    if (mid < byId.traction.top) { onLine(sy, false); return; }
    /* 03, 04 · the figures: the left margin */
    if (mid < M.top) { margin(partAt(mid)); return; }
    /* 05 · the expansion map: round the globe, in front and then away behind it */
    if (mid < byId.plan.top) {
      const o = world.map, before = M.x < M.len * 0.5, side = before ? 'market' : 'plan';
      if (!o || !o.live || world.mode !== 'globe') { margin(side); return; }
      const st = M.x < 0 ? -M.x * vh : M.x > M.len ? -(M.x - M.len) * vh : 0, gx = o.x, gy = o.y + st, r = o.r;
      /* it goes over to the globe once the globe is well up the screen, and back to the margin as the globe leaves */
      const w0 = span(gy, vh * 1.02, vh * 0.72) * (1 - span(M.x - M.len, 0.2, 0.5)), had = margin(side), mx = T.x, my = T.y;
      if (w0 <= 0.001 || (!had && w0 < 0.6)) { if (!had) T.show = false; return; }
      const w = had ? w0 : 1;                                                    // where there is no margin to come from, it comes in from the edge of the screen
      /* the orbit: wide by day; closer in while the cards stand beside the globe; out again with the ring as it goes */
      const base = clamp(r * 0.19, 28, 58), reach = vw / 2 - 18, tilt = clamp(Math.acos(Math.min(1, reach / (r * 1.24))), 12 * PI / 180, 38 * PI / 180), ct = Math.cos(tilt), sn = Math.sin(tilt);
      const cols = vw >= 1200 && vh >= 600, tight = cols ? o.night * (1 - span(M.pe, mapSpan[1] + 0.005, mapSpan[1] + 0.06)) : 0, grow = 1 + 0.5 * span(M.pe, mapSpan[1] + 0.06, 1.075);
      const rx = Math.min(lerp(r * 1.24, r + clamp(r * 0.2, 48, 96) - base * 0.5 - 12, tight), reach) / ct * grow, ry = rx * 0.27;
      if (!wasOrbit) th = PI; orbitOn = true;                                    // it joins at the left end, and takes the front first
      th -= Math.min(moved * 0.8 + 34 * dt, 900 * dt) / rx; if (th < -PI) th += TAU;
      const ex = Math.cos(th) * rx, ey = Math.sin(th) * ry, ox = gx + ex * ct + ey * sn, oy = gy - ex * sn + ey * ct;
      T.show = true; T.face = null; T.thr = 0; T.k = 9; T.len = lerp(had ? T.len : base, base * (1 + 0.14 * Math.sin(th)), w); T.x = lerp(mx, ox, w); T.y = Math.min(lerp(my, oy, w), M.x < 0 ? vh - T.len : 1e5);   // while the globe is still rising its lower half is off the screen: the rocket is not
      if (Math.sin(th) < 0 && w > 0.5) { hole.x = gx; hole.y = gy; hole.r = r; T.hide = hole; }
      return;
    }
    /* 06, 07, 08 · the growth plan, the horizon, the team: the left margin */
    if (mid < R.top) { margin(partAt(mid)); return; }
    /* 09 · the raise */
    if (mid < byId.beyond.top) {
      const e = R.pe;
      if (phone || !gut.crew.ok) {  /* no room round the brief: two long passes across the sky between the heading and the cards */
        const y0 = (rooms.skyTop || (rs.ok ? rs.t : navH)) + 10, y1 = (rooms.sky || vh * 0.4) - 10; if (!R.on || y1 - y0 < 40) return;
        const k = e < 0.45 ? (e - 0.09) / 0.31 : (e - 0.5) / 0.32; if (k <= 0 || k >= 1) return;
        T.show = true; T.len = 34; T.x = lerp(-60, vw + 60, e < 0.45 ? k : 1 - k); T.y = (y0 + y1) / 2 + Math.sin(k * TAU) * Math.min(12, (y1 - y0) / 2 - 16); return;
      }
      if (!rsRoute) rsRoute = buildRaise() || { none: true };
      const rt = rsRoute, away = 1 + 0.45 / R.len;
      if (rt.none) { if (e < 0.02 || e > away) margin(e < 0.5 ? 'crew' : 'beyond'); return; }
      /* how far round it should be by now; it gets there at its own pace, so a quick scroll never drags it across the brief */
      const m = rt.m, n = rt.end, to = e < 0.3 ? lerp(0, m[2], smooth(e / 0.3)) : e < 0.62 ? lerp(m[2], m[4], (e - 0.3) / 0.32) : e < 0.91 ? lerp(m[4], m[n], smooth((e - 0.62) / 0.22)) : lerp(m[n], rt.tr.len, smooth((e - 0.91) / (away - 0.91)));
      rsD = wasRs ? rsD + clamp((to - rsD) * Math.min(1, dt * 6), -1200 * dt, 1200 * dt) : to; rsOn = true;
      const last = clamp((rsD - m[n]) / Math.max(1, rt.tr.len - m[n]));
      rt.tr.at(rsD, P); T.show = true; T.thr = 0.3; T.k = 8; T.len = rt.back ? lerp(rt.size, gut.beyond.len, last) : rt.size; T.x = P.x; T.y = P.y + lead * smooth(last); if (last > 0.96) T.face = dir > 0 ? DOWN : UP;
      if (!rt.back && e > 0.93) T.show = false;                                    // nowhere to go on to: it leaves with the brief
      if (e < 0.02 && margin('crew')) { const k = span(R.x, -0.5, 0); T.x = lerp(T.x, P.x, k); T.y = lerp(T.y, P.y, k); T.len = lerp(T.len, rt.size, k); }
      return;
    }
    /* 10 · Beyond: the left margin, until liftoff's own words are about to come up beside it */
    if (L.x < -0.66) { margin('beyond'); return; }
    /* 11 · liftoff. While the view comes down to the pad it drops down the margin to the foot of the screen; from
       there one long climbing turn takes it under the closing words and across onto the line the launch rocket will
       come down, then straight up that line and out through the top of the screen, well before that rocket is due.
       From then on it waits above the screen on that line: if the story goes back, it comes down it again.
       The turn is laid out on the scene's own stage, so it keeps clear of the words while the stage is still rising. */
    const pad = world.pad, x0 = L.x, pe = L.pe; if (!lo.ok || !pad) return;
    const narrow = phone || lo.l < 48, st = x0 < 0 ? -x0 * vh : 0, X = lerp(vw * (phone ? 0.5 : 0.62), pad.x, pad.on ? smooth(pad.down * 2 - 1) : 0), C0 = -0.3;   // C0: when the climb begins, in screens before the scene pins
    const len0 = phone ? 40 : 56, len1 = clamp(pad.on ? pad.h * 0.4 : 0, len0 + 8, BODY), top = phone ? lo.b : 0, gone = top - Math.max(len1 * 1.7, vh * (phone ? 0.2 : 0.45));   // on a phone the words stand on a band of their own, which the launch rocket comes down behind: the courier leaves behind it too
    T.show = true; T.thr = 0.3; T.hard = true; T.len = len0; if (phone) T.cut = lo.b + st;
    if (pe >= 0.118 || document.body.classList.contains('launching')) { T.a = 0; T.dock = true; T.x = X; T.y = gone; T.len = len1; return; }
    T.a = 1 - span(pe, 0.108, 0.117);
    const ax = narrow ? vw * 0.14 : lo.l / 2, ay = narrow ? lo.b + (vh - lo.b) * 0.5 : Math.max(lo.b + 70, vh * (1 + C0) - 50);      // where the climb starts from, on the stage
    if (x0 < C0) {
      if (narrow) { if (x0 < -0.42) { T.show = false; return; } const k = span(x0, -0.42, C0); T.x = lerp(-70, ax, k); T.y = Math.min(ay + st, vh - 40) + (1 - k) * 24; return; }   // no margin to come down: in from the left edge, low
      const had = margin('beyond'), k = span(x0, -0.5, C0); T.show = true; T.thr = 0.3; T.x = lerp(had ? T.x : ax, ax, span(x0, -0.66, -0.53)); T.y = lerp(had ? T.y : vh * 0.6, Math.min(ay + st, vh - 40), k); T.len = lerp(had ? gut.beyond.len : len0, len0, k); T.face = DOWN; return;   // across to this scene's own margin before its heading comes up, then down
    }
    /* how far up it should be by now; it never takes the whole climb in less than seven tenths of a second, however fast the scroll */
    const to = Math.pow(clamp((x0 - C0) / 0.66), 1.25); loE = wasLo ? loE + clamp(to - loE, -dt / 0.7, dt / 0.7) : to; loOn = true;
    const jy = Math.max(top + vh * 0.2, ay - vh * 0.32), u = clamp(loE / 0.6), q = 1 - u, v = clamp((loE - 0.6) / 0.4);
    T.x = X + (ax - X) * q * q * q; T.y = Math.min(v > 0 ? lerp(jy, gone, v) : q * q * ay + 2 * u * q * (ay + vh * 0.03) + u * u * jy, vh - 40 - st) + st;
    T.len = lerp(len0, len1, smooth((loE - 0.45) / 0.55)); T.k = lerp(9, 26, smooth(u * 2 - 0.8));      // on the line it holds the line: the hand-over is exact
  }

  /* ───────── the rocket itself ───────── */
  let state = 'off', x = 0, y = 0, vx = 0, vy = 0, ang = UP, bank = 0, len = 40, alpha = 0, flame = 0.5, exitX = 0, exitY = 0, calm = 0; const NONE = {};
  let wShown = false, wTr = '', wOp = -1, wFlame = -1, wClip = '', wCut = -1;
  /* the edge nearest a point (the right-hand one only where no rail stands on it), and a place just outside it */
  function edge(px, py, o) {
    const cl = px, cr = railX < 1e4 ? 1e6 : vw - px, ct = py * 1.4, cb = (vh - py) * 1.1, m = Math.min(cl, cr, ct, cb);
    o.x = m === cl ? -120 : m === cr ? vw + 120 : px; o.y = m === ct ? -120 : m === cb ? vh + 120 : py; return o;
  }
  const outside = (px, py, by) => px < -by || px > vw + by || py < -by || py > vh + by;
  function hideShip() { if (wShown) { wShown = false; ship.style.visibility = 'hidden'; } }

  /* sy: the scroll; syS: the scroll the scenes are eased to; t: seconds; world: the world behind the page, or null;
     rooms: what the page has measured on a phone's raise (see padRooms in main.js) */
  function frame(sy, syS, dt, t, world, rooms) {
    if (dirty) measure();
    const flat = STILL || !world || !sys, dS = sy - lastSy, dSm = syS - lastS, jumped = Math.abs(dSm) > vh * 0.9; lastSy = sy; lastS = syS;
    if (!flat && dS) { run = (dS > 0) === (run > 0) ? run + dS : dS; if (Math.abs(run) > 24) dir = run > 0 ? 1 : -1; }      // which way the page is heading: a real move, not a pixel of settling
    sv += (dS / Math.max(dt, 0.004) - sv) * Math.min(1, dt * 8); lead += (dir * vh * 0.09 - lead) * Math.min(1, dt * 2.2);
    aim(sy, syS, dt, world, rooms || NONE, flat, jumped ? 0 : Math.abs(dSm));
    if (flat) {                     /* parked at the head of the line: no flight, no flame */
      if (!T.show) { hideShip(); return; } x = T.x; y = T.y; len = T.len; alpha = 1; ang = DOWN; bank = 0; flame = STILL ? 0 : 0.5; state = 'on'; draw(t, 0); return;
    }
    /* is it here, leaving, or away */
    if (!T.show) { if (state === 'on') { if (outside(x, y, len)) state = 'off'; else { state = 'out'; edge(x, y, P); exitX = P.x; exitY = P.y; } } }
    else if (T.a < 0.004 && T.dock) { state = 'on'; x = T.x; y = T.y; vx = vy = 0; len = T.len; alpha = 0; hideShip(); return; }
    else if (state === 'off') {
      calm = jumped ? 0 : calm + dt;
      if (calm > 0.22) { state = 'on'; len = T.len; alpha = 0; if (outside(T.x, T.y, 0)) { x = T.x; y = T.y; vx = vy = 0; } else { edge(T.x, T.y, P); x = P.x; y = P.y; const d = Math.hypot(T.x - x, T.y - y) || 1; vx = (T.x - x) / d * 500; vy = (T.y - y) / d * 500; ang = Math.atan2(vy, vx); } }
    } else if (state === 'on' && (jumped || (!T.hard && Math.hypot(T.x - x, T.y - y) > Math.max(420, vh * 0.62))) && !outside(x, y, len)) { state = 'out'; edge(x, y, P); exitX = P.x; exitY = P.y; }
    if (state === 'off') { hideShip(); return; }
    /* it chases its target: a critically damped spring, stable at any frame length */
    let tx = T.x, ty = T.y, w = T.k;
    if (state === 'out') { tx = exitX; ty = exitY; w = 9; if (outside(x, y, len * 1.1)) { state = 'off'; calm = 0; hideShip(); return; } }
    const f = 1 + 2 * dt * w, hw = dt * w * w, det = 1 / (f + dt * hw), nx = (f * x + dt * vx + dt * hw * tx) * det, ny = (f * y + dt * vy + dt * hw * ty) * det;
    vx = (vx + hw * (tx - x)) * det; vy = (vy + hw * (ty - y)) * det; x = nx; y = ny;
    const speed = Math.hypot(vx, vy);
    /* the nose follows the way it is going; at rest it faces where this part of the story says */
    const want = speed > 26 || T.face === null || state === 'out' ? (speed > 6 ? Math.atan2(vy, vx) : ang) : T.face, da = wrap(want - ang), turn = clamp(da * Math.min(1, dt * 9), -(5.2 + 3.6 * Math.abs(da) / PI) * dt, (5.2 + 3.6 * Math.abs(da) / PI) * dt);
    ang = wrap(ang + turn); bank += (clamp(turn / Math.max(dt, 0.004) * 0.06, -0.35, 0.35) - bank) * Math.min(1, dt * 6);
    len += ((state === 'out' ? len : T.len) - len) * Math.min(1, dt * 5);
    const aTo = state === 'out' ? 1 : T.a; alpha = T.hard && aTo < alpha ? aTo : alpha + (aTo - alpha) * Math.min(1, dt * 9);
    flame += (clamp(0.5 + Math.max(speed, Math.abs(sv) * T.thr) / 700, 0.5, 1.7) - flame) * Math.min(1, dt * 5);
    draw(t, clamp(1 - speed / 60));
  }
  /* one transform; the flame's length, the opacity and the cuts only when they change */
  function draw(t, rest) {
    if (alpha < 0.004) { hideShip(); return; }
    const k = len / BODY, by = rest * Math.sin(t * 1.3) * 2.6, px = x, py = y + by, roll = 1 - Math.abs(bank) * 0.3;
    const tr = `translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0) rotate(${((ang + bank * 0.4) * 180 / PI + 90).toFixed(2)}deg) scale(${(k * roll).toFixed(4)},${k.toFixed(4)})`;
    if (tr !== wTr) { wTr = tr; ship.style.transform = tr; }
    if (!wShown) { wShown = true; ship.style.visibility = 'visible'; }
    const op = Math.round(alpha * 50) / 50; if (op !== wOp) { wOp = op; ship.style.opacity = op; }
    const fl = flame > 0.62 ? flame * (1 + 0.1 * Math.sin(t * 41) + 0.05 * Math.sin(t * 67)) : flame, fq = Math.round(fl * 25) / 25; if (fq !== wFlame) { wFlame = fq; flameEl.style.setProperty('--f', fq); }
    /* behind a planet: the planet's disc is cut out of it, in its own frame (a circle there is an ellipse here) */
    let clip = '';
    if (T.hide && canClip) { const h = T.hide, reach = len * 1.6; if (Math.hypot(h.x - px, h.y - py) < h.r + reach) {
      const a = -(ang + bank * 0.4) - PI / 2, c = Math.cos(a), s = Math.sin(a), dx = h.x - px, dy = h.y - py, cx = (dx * c - dy * s) / (k * roll), cy = (dx * s + dy * c) / k, rx = h.r / (k * roll), ry = h.r / k;
      clip = `path(evenodd,"M-300-300H300V400H-300ZM${(cx - rx).toFixed(1)} ${cy.toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx + rx).toFixed(1)} ${cy.toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx - rx).toFixed(1)} ${cy.toFixed(1)}Z")`; } }
    else if (T.hide) { const h = T.hide, d = Math.hypot(h.x - px, h.y - py); ship.style.opacity = wOp = Math.round(alpha * clamp((d - h.r + len * 0.3) / (len * 0.6)) * 50) / 50; }
    if (clip !== wClip) { wClip = clip; ship.style.clipPath = clip || 'none'; }
    const cut = Math.max(0, Math.round(T.cut)); if (cut !== wCut) { wCut = cut; layer.style.clipPath = cut ? `inset(${cut}px 0 0 0)` : 'none'; }
  }
  return { frame, soil, peek: () => ({ state, x, y, len, alpha: state === 'off' || !wShown ? 0 : alpha, ang, flame, speed: Math.hypot(vx, vy), show: T.show, tx: T.x, ty: T.y, hide: !!T.hide, clip: wClip !== '', cut: wCut }) };
}

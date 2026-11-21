/* The opening and the system, as the page drives them. One timeline, read from the scroll and nothing else, so it runs
   the same forwards, backwards and from a jump:
   - the opening is pulled away: the whole first screen (the mark, the headline, the three figures) is one plane in the
     world; it tips back and shrinks to a point where the mark's orbit was, the figures flying off it as it goes;
   - a nova at that point, and out of it Freedom Group Enterprise, small, low in the middle of the screen;
   - then one beat at a time: the five orbit rings draw themselves, the planet rises to the top centre, the heading and
     the four figures arrive, and each company comes in turn: its lane from Enterprise, its world and its year, its cards;
   - the whole map holds, then the dive at Freedom Global begins.
   This module keeps the timeline and everything written on the page; the world (w-orbit.js) draws what it is told and
   says where things ended up. Each company's world stands in the place the page's layout gives it (.slot). */
import { $, $$, el, svg, clamp, span, smooth, STILL } from './kit.js';
import { rocketArt, ART } from './courier.js';

const ease5 = t => t * t * t * (t * (t * 6 - 15) + 10);
const NOVA = 0.7, HOLD = 0.95, DIVE_LEAD = 0.675;                    // in screens: the nova, the finished map held, how long before the scene ends the dive starts
const WIDE = '(min-width:1100px) and (min-height:560px)';

/* the companies, in the order the story reaches them */
const COS = [
  { co: 'enterprise', label: 'Enterprise', worlds: ['enterprise'] }, { co: 'global', label: 'Global', worlds: ['global'] },
  { co: 'facilities', label: 'Facilities', worlds: ['facilities'] }, { co: 'distribution', label: 'Distribution', worlds: ['distribution'] },
  { co: 'future29', label: ['Form', 'Freight'], worlds: ['form', 'freight'] }, { co: 'future30', label: ['Fly', 'Fuel'], worlds: ['fly', 'fuel'] }
];
/* which beat each thing arrives on. Wide: the old map's 28 beats. Narrow: the same order, a company in two beats. */
const PLAN = {
  wide: { total: 28, head: 6, ent: 7, stats: 8, foot: 8, fams: { global: { lane: 9, world: 10, cards: [11, 12, 13] }, facilities: { lane: 14, world: 15, cards: [16, 17] }, distribution: { lane: 18, world: 19, cards: [20, 21] }, future29: { lane: 22, world: 23, cards: [24] }, future30: { lane: 25, world: 26, cards: [27] } } },
  small: { total: 17, head: 6, ent: 6, stats: 6, foot: 6, fams: { global: { lane: 7, world: 8 }, facilities: { lane: 9, world: 10 }, distribution: { lane: 11, world: 12 }, future29: { lane: 13, world: 14 }, future30: { lane: 15, world: 16 } } }
};
/* the wordmark, measured off the logo artwork, in thousandths of its own width: [left, width, baseline, cap height] */
const TYPE = { mkThe: [0, 137.5, 402.1, 37.3], mkFreed: [0, 664.6, 556.3, 89.3], mkM: [854.2, 145.8, 556.3, 89.3], mkGroup: [739.6, 260.4, 655.3, 36.5] };
const ORBIT_C = [0.4652, 0.5042];                                    // the middle of the mark's orbit, across and down, in wordmark widths
/* the mark's orbit as the artwork draws it, in wordmark widths: half its long and short axes and its lean; and the globe on it */
const ORB = { a: 0.5456, b: 0.2496, lean: 54.42 * Math.PI / 180 }, GLOBE = { x: 0.759, y: 0.5086, r: 0.0742 };

export function initSystem({ byId, onStep }) {
  const hero = $('#hero'), mark = $('#mark'), markO = $('#markO'), sysEl = $('#sys'), board = $('#sysBoard'), head = $('#sysHead'), stageTop = $('#top .stage'), stageSys = $('#system .stage');
  const wideMQ = matchMedia(WIDE); let wide = wideMQ.matches, plan = wide ? PLAN.wide : PLAN.small, vw = innerWidth, vh = innerHeight, dirty = true, bx0 = 0, by0 = 0, ready = null;
  const cos = COS.map(c => { const node = $(`.co[data-co="${c.co}"]`, board), slot = $('.slot', node); const core = el('i'); slot.append(core); return Object.assign({ node, slot, core, fam: $('.fam', node), lb: $('.lb', node) }, c); });
  const byCo = Object.fromEntries(cos.map(c => [c.co, c]));

  /* ───────── what the world is told ───────── */
  const S = { wide, slot: { x: 0, y: 0, r: 0 }, markW: 0, hole: { x: 0, y: 0 }, dock: { x: 0, y: 0 }, slots: {}, bh: 0, nova: 0, born: 0, pose: 0, ring: [0, 0, 0, 0, 0],
    lane: { global: 0, facilities: 0, distribution: 0, form: 0, freight: 0, fly: 0, fuel: 0 }, world: { global: 0, facilities: 0, distribution: 0, form: 0, freight: 0, fly: 0, fuel: 0 }, year: [0, 0, 0, 0, 0], focus: null, map: 0, keep: null };
  cos.forEach(c => { S.slots[c.co] = { x: 0, y: 0, r: 10 }; });

  /* ───────── the mark's letters, set to the artwork ───────── */
  const ctx = document.createElement('canvas').getContext('2d');
  function fitMark() {
    const fam = getComputedStyle($('#mkThe')).fontFamily; ctx.font = '400 200px ' + fam; const cap = ctx.measureText('H').actualBoundingBoxAscent || 144;
    for (const id in TYPE) {
      const t = $('#' + id), [x, w, base, ch] = TYPE[id], fs = 200 * ch / cap, m = ctx.measureText(t.textContent), sw = ch * 0.085;
      const left = -m.actualBoundingBoxLeft * fs / 200, ink = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * fs / 200, sx = (w - sw) / Math.max(1, ink);
      t.setAttribute('font-size', fs.toFixed(2)); t.style.strokeWidth = sw.toFixed(2); t.parentNode.setAttribute('transform', `translate(${(x + sw / 2 - left * sx).toFixed(2)} ${base}) scale(${sx.toFixed(4)} 1)`);
    }
    mark.classList.add('fit');
  }

  /* ───────── the first screen's parts, each with its own way into the hole ───────── */
  const parts = [$('.hero h1'), $('.hero-sub'), $('.hero-cta'), ...$$('#kpis li')].filter(Boolean).map((node, i) => ({ node, d: Math.min(0.5, i * 0.05), spin: -(1.9 + i * 0.4), x0: 0, y0: 0, last: -1 }));
  const type = $('.mk-type');
  /* the four words of the mark fall into the ring too, each about its own middle (in the artwork's units: 1000 = the mark's width) */
  const NS = 'http://www.w3.org/2000/svg', HOLE = [ORBIT_C[0] * 1000, ORBIT_C[1] * 1000];
  const words = Object.keys(TYPE).map((id, i) => { const g = $('#' + id).parentNode, w = document.createElementNS(NS, 'g'); g.parentNode.insertBefore(w, g); w.append(g);
    const [x, wd, base, ch] = TYPE[id], cx = x + wd / 2, cy = base - ch / 2; return { w, cx, cy, d: [0.03, 0.1, 0.16, 0.07][i], spin: -(2.3 + i * 0.35), last: -1 }; });
  /* the rocket on the first screen: the courier's own drawing, flying the mark's orbit, behind the globe as it passes it.
     As the screen is pulled away it is pulled in too: round and round on a shrinking orbit, faster as it falls, stretched
     along its way and burning hard, until it is gone into the hole (it comes out of the new planet after the nova) */
  const hrk = el('div.hero-rk', { 'aria-hidden': 'true' }), hpic = svg('svg', { viewBox: `${-ART.w / 2} -1 ${ART.w} ${ART.len + 2}`, class: 'rk burn' }, hrk), hflame = rocketArt(hpic, { trail: true });
  mark.append(hrk);
  const HR = { tr: '', op: -1, f: -1, clip: '', th0: 2.35 };
  const orbAt = (th, s, mw, o) => { const lx = Math.cos(th), ly = -Math.sin(th) * ORB.b / ORB.a, c = Math.cos(ORB.lean), n = Math.sin(ORB.lean), A = ORB.a * mw * s;
    o.x = ORBIT_C[0] * mw + A * (lx * c - ly * n); o.y = ORBIT_C[1] * mw - A * (lx * n + ly * c); return o; };
  const q0 = { x: 0, y: 0 }, q1 = { x: 0, y: 0 };
  function heroRocket(bh) {
    const mw = S.markW; if (!mw) return;
    const t = performance.now() / 1000, pe = clamp((bh - 0.03) / 0.8), fall = pe * pe, s = 1 - fall * 0.94;
    const th = STILL ? HR.th0 : HR.th0 - t * 0.34 - fall * 7.5 - pe * 1.2;          // a lap in about eighteen seconds; more turns the further it falls
    orbAt(th, s, mw, q0); orbAt(th - 0.03, s * (1 - 0.03 * (0.2 + pe * 2.4)), mw, q1);
    const ang = Math.atan2(q1.y - q0.y, q1.x - q0.x), k = mw * 0.088 / 96, sx = k * (1 - 0.55 * fall), sy = k * (1 + 1.5 * fall);
    const tr = `translate3d(${q0.x.toFixed(1)}px,${q0.y.toFixed(1)}px,0) rotate(${(ang * 180 / Math.PI + 90).toFixed(2)}deg) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
    if (tr !== HR.tr) { HR.tr = tr; hrk.style.transform = tr; }
    const op = Math.round(clamp(1 - span(pe, 0.7, 0.93)) * 50) / 50; if (op !== HR.op) { HR.op = op; hrk.style.opacity = op; hrk.style.visibility = op < 0.02 ? 'hidden' : ''; }
    const f = Math.round((STILL ? 0.55 : 0.72 + 0.8 * pe) * 25) / 25; if (f !== HR.f) { HR.f = f; hflame.style.setProperty('--f', f); }
    /* behind the globe: its disc is cut out of the rocket, in the rocket's own frame */
    const gx = GLOBE.x * mw - q0.x, gy = GLOBE.y * mw - q0.y, gr = GLOBE.r * mw * (1 - fall); let clip = '';
    if (Math.hypot(gx, gy) < gr + mw * 0.09) { const a = -(ang + Math.PI / 2), c = Math.cos(a), n = Math.sin(a), cx = (gx * c - gy * n) / sx, cy = (gx * n + gy * c) / sy, rx = gr / sx, ry = gr / sy;
      clip = `path(evenodd,"M-300-300H300V400H-300ZM${(cx - rx).toFixed(1)} ${cy.toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx + rx).toFixed(1)} ${cy.toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx - rx).toFixed(1)} ${cy.toFixed(1)}Z")`; }
    if (clip !== HR.clip) { HR.clip = clip; hrk.style.clipPath = clip || 'none'; }
  }

  /* ───────── steps, year marks ───────── */
  const mini = id => el('img.mini', { src: `assets/minis/${id}.webp`, srcset: `assets/minis/${id}.webp 1x, assets/minis/${id}@2x.webp 2x`, width: 22, height: 22, alt: '' });
  const steps = $('#sysSteps');
  cos.forEach(c => { const pair = Array.isArray(c.label);
    c.btn = el('button', { type: 'button', 'aria-pressed': 'false', 'data-pick': c.co, 'aria-label': pair ? c.label.join(' and ') : c.label }, c.worlds.map(mini), el('span', null, pair ? [c.label[0], ' ', el('span.amp', { text: '&' }), ' ', c.label[1]] : c.label)); steps.append(c.btn); });
  const years = ['2026', '2027', '2028', '2029', '2030+'].map((y, i) => { const n = el('span.yr' + (i > 2 ? '.future' : ''), { text: y }); $('#sysYears').append(n); return { n, last: -1 }; });

  /* ───────── everything that arrives on a beat ───────── */
  let reg = [];
  function register() {
    reg.forEach(r => { r.el.style.opacity = ''; r.el.style.transform = ''; r.el.style.visibility = ''; });
    reg = []; const add = (node, beat, fx) => { if (node) reg.push({ el: node, beat, fx, last: -1 }); };
    add($('#sysHead'), plan.head, 'rise'); add($('#sysStats'), plan.stats, 'rise'); add($('#sysFoot'), plan.foot, 'fade'); add($('#sysHint'), plan.foot, 'fade');
    if (wide) { add(byCo.enterprise.fam, plan.ent, 'rise'); for (const co in plan.fams) [...byCo[co].fam.children].forEach((n, i) => add(n, plan.fams[co].cards[Math.min(i, plan.fams[co].cards.length - 1)], 'rise')); }
    else { add(byCo.enterprise.lb, plan.ent, 'fade'); for (const co in plan.fams) add(byCo[co].lb, plan.fams[co].world, 'fade'); }
  }

  /* ───────── measuring: where the mark and each company's place are on the stage ───────── */
  function measure() {
    dirty = false; vw = innerWidth; vh = innerHeight;
    if (wideMQ.matches !== wide) { wide = S.wide = wideMQ.matches; plan = wide ? PLAN.wide : PLAN.small; register(); }
    const keep = hero.style.transform; hero.style.transform = 'none'; parts.forEach(p => { p.node.style.transform = ''; p.last = -1; });
    const st = stageTop.getBoundingClientRect(), o = markO.getBoundingClientRect(), mk = mark.getBoundingClientRect();
    if (o.width > 2) { S.slot.x = o.left + o.width / 2 - st.left; S.slot.y = o.top + o.height / 2 - st.top; S.slot.r = o.width / 2; S.markW = mk.width; S.hole.x = mk.left - st.left + ORBIT_C[0] * mk.width; S.hole.y = mk.top - st.top + ORBIT_C[1] * mk.width; }
    parts.forEach(p => { const r = p.node.getBoundingClientRect(); p.x0 = r.left + r.width / 2 - st.left - S.hole.x; p.y0 = r.top + r.height / 2 - st.top - S.hole.y; });
    hero.style.transform = keep;
    if (wide) board.style.removeProperty('--mt'); else board.style.setProperty('--mt', (head.offsetTop + head.offsetHeight + 10) + 'px');   // on a narrow screen the worlds start under the heading, however tall it is
    const ss = stageSys.getBoundingClientRect(), bb = board.getBoundingClientRect(); bx0 = bb.left - ss.left; by0 = bb.top - ss.top;
    cos.forEach(c => { const r = c.core.getBoundingClientRect(), q = S.slots[c.co]; q.x = r.left + r.width / 2 - ss.left; q.y = r.top + r.height / 2 - ss.top; q.r = Math.max(4, r.height / 2); });
    S.keep = wide ? { x0: bx0 + head.offsetLeft - 6, y0: by0 + head.offsetTop - 4, x1: bx0 + head.offsetLeft + head.offsetWidth + 6, y1: by0 + head.offsetTop + head.offsetHeight + 4 } : null;   // the rings stay out of the heading
    const E = S.slots.enterprise; S.dock.x = vw / 2; S.dock.y = wide ? Math.max(E.y + vh * 0.2, vh * 0.6) : E.y + vh * 0.12;
  }
  const soil = () => { dirty = true; };
  addEventListener('resize', soil); if ('ResizeObserver' in window) new ResizeObserver(soil).observe(board);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitMark(); soil(); });
  fitMark(); register();

  /* ───────── which company is the bright one ───────── */
  let pinned = null, pinY = 0, hover = null, hoverT = 0, story = null, shown = null, lastFocus = undefined, lastStory = undefined, beatLen = 0.3;
  const famStart = co => co === 'enterprise' ? 0 : plan.fams[co].lane, famEnd = co => { const i = cos.findIndex(c => c.co === co); return i + 1 < cos.length ? famStart(cos[i + 1].co) : plan.total; };
  const arrives = co => co === 'enterprise' ? -1 : (plan.fams[co].world + 0.93 - 1) * beatLen;        // in screens through the system scene
  function pick(co) {
    const B = byId.system, x = B.x;
    if (x >= arrives(co) - 0.01 && x < B.len - DIVE_LEAD) { pinned = pinned === co ? null : co; pinY = scrollY; return; }   // already on the map: light it where it is
    pinned = null; scrollTo({ top: B.top + (famEnd(co) - 0.05 - 1) * beatLen * vh, behavior: 'smooth' });                    // not there yet: go to where it arrives
  }
  board.addEventListener('click', e => { const t = e.target.closest('[data-pick], .fam'); if (!t) { pinned = null; return; } if (e.target.closest('a')) return; pick(t.dataset.pick || t.closest('.co').dataset.co); });
  /* pointing at a company lights it, but only when the pointer itself has moved: a card that the scroll carries under a
     resting pointer must not take the light from the company the story has just reached */
  let mx = -1, my = -1, movedAt = -1e9;
  const over = e => { const t = e.target.closest && e.target.closest('[data-pick], .fam'); if (e.pointerType !== 'mouse' || performance.now() - movedAt > 250) return; clearTimeout(hoverT); if (t) hover = t.dataset.pick || t.closest('.co').dataset.co; else hoverT = setTimeout(() => { hover = null; }, 140); };
  board.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || (e.clientX === mx && e.clientY === my)) return; mx = e.clientX; my = e.clientY; movedAt = performance.now(); over(e); });
  board.addEventListener('pointerover', over); board.addEventListener('pointerleave', () => { clearTimeout(hoverT); hover = null; });
  addEventListener('scroll', () => { if (hover && performance.now() - movedAt > 250) { clearTimeout(hoverT); hover = null; } }, { passive: true });
  addEventListener('keydown', e => { if (e.key === 'Escape') pinned = null; });

  const setOT = (r, v) => { if (Math.abs(v - r.last) < 0.0015) return; r.last = v; const st = r.el.style; st.opacity = v >= 0.999 ? '' : v.toFixed(3); st.visibility = v < 0.004 ? 'hidden' : ''; st.transform = r.fx === 'rise' && v < 0.999 ? `translate3d(0,${((1 - v) * 14).toFixed(1)}px,0)` : ''; };

  /* ───────── once a frame, before the world is drawn ───────── */
  function frame() {
    if (dirty) measure();
    const A = byId.top, B = byId.system, nx = A.x - A.len;                 // nx: screens past the end of the opening's own scroll
    S.bh = smooth(clamp(A.x / A.len)); S.nova = clamp(nx / NOVA); S.born = ease5(clamp((nx - NOVA) / (1 - NOVA)));
    beatLen = Math.max(0.05, (B.len - HOLD - DIVE_LEAD) / (plan.total - 1));
    const bx = 1 + B.x / beatLen, bv = n => n <= 0 ? S.born : ease5(clamp((bx - n - 0.08) / 0.84));
    for (let k = 0; k < 5; k++) S.ring[k] = bv(1 + k);
    S.pose = smooth(clamp((bx - 1) / 5));
    for (const co in plan.fams) { const f = plan.fams[co], l = bv(f.lane), w = bv(f.world), c = byCo[co], off = w < 0.5; c.worlds.forEach(id => { S.lane[id] = l; S.world[id] = w; }); if (off !== c.off) { c.off = off; c.node.classList.toggle('off', off); } }   // a company cannot be pressed before it is there
    ['global', 'facilities', 'distribution', 'future29', 'future30'].forEach((co, k) => { S.year[k] = bv(plan.fams[co].world); });
    const diveA = 1 - DIVE_LEAD / B.len, gone = span(B.p, diveA, diveA + 0.035);
    S.map = B.on && B.x > -0.04 ? 1 - gone : 0;
    /* the story's own bright one: the company whose beats these are; none once the whole map is in */
    story = B.x < -0.04 || bx >= plan.total - 0.02 || gone > 0.5 ? null : cos.reduce((a, c) => bx >= famStart(c.co) ? c.co : a, 'enterprise');
    if (pinned && (Math.abs(scrollY - pinY) > vh * 0.3 || gone > 0.5)) pinned = null;
    if (hover && (byCo[hover].off || S.map < 0.5)) hover = null;
    const focus = hover || pinned || story;
    if (focus !== lastFocus || story !== lastStory) {
      lastFocus = focus; lastStory = story; S.focus = focus ? byCo[focus].worlds : null;
      const card = wide ? focus : focus || 'global';                    // wide: one company written out at a time, none while the whole map rests (every world in its colour, each with its name)
      cos.forEach(c => { c.node.classList.toggle('lit', c.co === focus); c.node.classList.toggle('dim', !!focus && c.co !== focus); c.node.classList.toggle('show', c.co === card); c.btn.setAttribute('aria-pressed', String(c.co === focus)); });
      if (story !== shown) { shown = story; if (story && onStep) onStep(cos.findIndex(c => c.co === story)); }
    }
    /* what arrives on a beat */
    const sv = S.map; if (Math.abs(sv - (sysEl.__v || 0)) > 0.001 || sysEl.__v === undefined) { sysEl.__v = sv; sysEl.style.opacity = sv.toFixed(3); sysEl.style.visibility = sv < 0.004 ? 'hidden' : 'visible'; }
    if (sv > 0.004) reg.forEach(r => setOT(r, bv(r.beat)));
    const rd = bv(plan.head) > 0.5; if (rd !== ready) { ready = rd; board.classList.toggle('ready', rd); }
    /* the first screen's parts fall in toward the hole: a winding path, stretched along the way in, each a moment after the last */
    const bh = S.bh;
    parts.forEach(p => {
      const pe = clamp((bh - p.d) / (0.86 - p.d)); if (Math.abs(pe - p.last) < 0.0008) return; p.last = pe; const st = p.node.style;
      if (pe <= 0) { st.transform = ''; st.opacity = ''; return; }
      const pe2 = pe * pe, ang0 = Math.atan2(p.y0, p.x0), dist = Math.hypot(p.x0, p.y0), th = ang0 + p.spin * pe2 * 0.55, rr = dist * (1 - pe2 * 0.9);
      st.transform = `translate3d(${(Math.cos(th) * rr - p.x0).toFixed(1)}px,${(Math.sin(th) * rr - p.y0).toFixed(1)}px,0) rotate(${(th - ang0).toFixed(3)}rad) scale(${((1 - pe2) * (1 + 0.5 * pe)).toFixed(4)},${((1 - pe2) * (1 - 0.3 * pe)).toFixed(4)})`;
      st.opacity = clamp(1 - (pe - 0.62) * 3.2).toFixed(3);
    });
    words.forEach(q => {
      const pe = clamp((bh - q.d) / (0.84 - q.d)); if (Math.abs(pe - q.last) < 0.0008) return; q.last = pe;
      if (pe <= 0) { q.w.removeAttribute('transform'); q.w.style.opacity = ''; return; }
      const pe2 = pe * pe, x0 = q.cx - HOLE[0], y0 = q.cy - HOLE[1], ang0 = Math.atan2(y0, x0), th = ang0 + q.spin * pe2 * 0.55, rr = Math.hypot(x0, y0) * (1 - pe2 * 0.96);
      q.w.setAttribute('transform', `translate(${(HOLE[0] + Math.cos(th) * rr).toFixed(1)} ${(HOLE[1] + Math.sin(th) * rr).toFixed(1)}) rotate(${((th - ang0) * 180 / Math.PI).toFixed(2)}) scale(${((1 - pe2) * (1 + 0.4 * pe)).toFixed(4)} ${((1 - pe2) * (1 - 0.3 * pe)).toFixed(4)}) translate(${(-q.cx).toFixed(1)} ${(-q.cy).toFixed(1)})`);
      q.w.style.opacity = clamp(1 - (pe - 0.6) * 3).toFixed(3);
    });
    if (bh < 0.9995) heroRocket(bh);
    const tk = 1 - span(bh, 0.74, 0.95); if (type.__v !== tk) { type.__v = tk; type.style.opacity = tk >= 0.999 ? '' : tk.toFixed(3); }
    return S;
  }

  /* ───────── and after: the world says where its plane and its year marks are ───────── */
  let sheet = '';                                                       // how the first screen stands: at rest, moving with the world, or gone
  function after(out) {
    const now = S.bh >= 0.9995 ? 'gone' : 'rest';                        // the sheet stands still: its parts fall into the ring one by one (frame)
    if (now !== sheet) { sheet = now; hero.style.transform = 'none'; hero.style.visibility = now === 'gone' ? 'hidden' : 'visible'; }
    years.forEach((y, k) => { const o = out.years[k], a = wide ? o.a * S.map : 0; if (a < 0.02) { if (y.last !== 0) { y.last = 0; y.n.style.opacity = 0; y.n.style.visibility = 'hidden'; } return; }
      y.last = a; y.n.style.visibility = 'visible'; y.n.style.opacity = a.toFixed(2); y.n.style.transform = `translate3d(${(o.x - bx0).toFixed(1)}px,${(o.y - by0).toFixed(1)}px,0) translate(-50%,-50%)`; });
  }

  /* where a jump to the system lands: on the finished map, as the earlier portfolio's did */
  const land = () => { const B = byId.system, len = Math.max(0.5, (B.h - innerHeight) / innerHeight); return 1 - (DIVE_LEAD + HOLD * 0.55) / len; };
  return { frame, after, land, measure: soil, state: S, pick };
}

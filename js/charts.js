/* The figures, drawn as SVG at the size they are shown (so the type never shrinks with the chart): revenue by year as a
   rising line, the three nested markets on their timelines, the eight channel plan with its year breakdown and data
   matrix, the line to 2036, the 2036 mix, how the mix shifts, and the flywheel. Colour follows the channel everywhere,
   in the earlier portfolio's colours and order; the two direct channels are hatched and tagged "direct" wherever they
   are listed, and every figure also names its channels in a legend, a tooltip and the matrix, never by colour alone.
   A small rocket (the rail's own) flies the two lines in as they are first seen and parks at the last point. */
import { $, $$, el, svg, clamp, lerp, easeOut, easeInOut, fmtCompact, fmtGBP, onSeen, STILL } from './kit.js';

/* fixed order and colour for every channel: six marketplaces, then the two direct channels */
export const CHANNELS = [
  { name: 'eBay', c: '#38a9ff' }, { name: 'Amazon', c: '#ffb020' }, { name: 'Temu', c: '#ff6a3d' }, { name: 'Shopify', c: '#2fe0a0' },
  { name: 'TikTok Shop', c: '#22d3ee' }, { name: 'OnBuy', c: '#b79bff' }, { name: 'On Site Servicing', c: '#ff4fa3', direct: true }, { name: 'B2B', c: '#9aa6bd', direct: true }
];
const chan = n => CHANNELS.find(c => c.name === n);
const DIRECT_NOTE = 'Direct channel, not a marketplace';
const O_PINK = '#ff3d9a', O_BLUE = '#38a9ff', O_MINT = '#2fe0a0';        // the three bodies of the logo: the line's gradient, actuals, targets
let uid = 0;

/* a round step for an axis that has to reach v: three to six intervals */
function axisStep(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [10, 5, 2.5, 2, 1, 0.5, 0.25, 0.2, 0.1]) { const n = Math.ceil(v / (m * p)); if (n >= 3 && n <= 6) return m * p; } return p; }
const short = n => n >= 1e6 ? '£' + (n / 1e6 >= 10 ? Math.round(n / 1e6) : +(n / 1e6).toFixed(1)) + 'm' : n >= 1e3 ? '£' + Math.round(n / 1e3) + 'k' : '£' + n;
const share = v => v <= 0 ? '0%' : v < 0.005 ? '<1%' : Math.round(v * 100) + '%';

/* draw again when the figure's size really changes (its height too, for a figure that fills its panel) */
function sized(fig, draw, both) {
  let w = 0, h = 0; const run = () => { const nw = Math.round(fig.clientWidth), nh = Math.round(fig.clientHeight); if (nw < 120 || (Math.abs(nw - w) < 2 && (!both || Math.abs(nh - h) < 2))) return; w = nw; h = nh; draw(nw, nh); };
  run(); if ('ResizeObserver' in window) new ResizeObserver(run).observe(fig); else addEventListener('resize', run);
}
/* a move over time that always reaches its end; returns a way to stop it. Still pages and hidden tabs go straight there */
function tween(dur, step, done) {
  if (STILL || document.hidden || dur <= 0) { step(1); if (done) done(); return () => {}; }
  let raf = 0, t0 = 0, dead = false;
  const f = now => { if (dead) return; if (!t0) t0 = now; const k = clamp((now - t0) / dur); step(k); if (k < 1) raf = requestAnimationFrame(f); else if (done) done(); };
  raf = requestAnimationFrame(f); return () => { dead = true; cancelAnimationFrame(raf); };
}
/* the direct channels' fill: the channel's colour under a light 45 degree stripe */
function hatch(defs, id, colour) {
  const p = svg('pattern', { id, patternUnits: 'userSpaceOnUse', width: 7, height: 7, patternTransform: 'rotate(45)' }, defs);
  svg('rect', { width: 7, height: 7, fill: colour }, p); svg('rect', { width: 2.6, height: 7, fill: 'rgba(255,255,255,.5)' }, p); return 'url(#' + id + ')';
}
/* a column with its top rounded */
function roundBar(x, y, w, h, r) {
  if (h < 0.3 || w < 0.3) return ''; r = Math.min(r, w / 2, h / 2); if (r <= 0.2) return `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}Z`;
  return `M${x.toFixed(1)} ${(y + h).toFixed(1)}V${(y + r).toFixed(1)}a${r} ${r} 0 0 1 ${r} ${-r}h${(w - 2 * r).toFixed(1)}a${r} ${r} 0 0 1 ${r} ${r}V${(y + h).toFixed(1)}Z`;
}
/* a smooth line through the points that never overshoots them (monotone cubic): the slopes first, then any stretch of it */
function slopes(p) {
  const n = p.length, m = [], t = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) m[i] = (p[i + 1].y - p[i].y) / (p[i + 1].x - p[i].x);
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (!m[i]) { t[i] = t[i + 1] = 0; continue; } const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; } }
  return t;
}
function curve(p, t, a = 0, b = p.length - 1) {
  let d = `M${p[a].x.toFixed(1)} ${p[a].y.toFixed(1)}`;
  for (let i = a; i < b; i++) { const h = (p[i + 1].x - p[i].x) / 3; d += `C${(p[i].x + h).toFixed(1)} ${(p[i].y + t[i] * h).toFixed(1)} ${(p[i + 1].x - h).toFixed(1)} ${(p[i + 1].y - t[i + 1] * h).toFixed(1)} ${p[i + 1].x.toFixed(1)} ${p[i + 1].y.toFixed(1)}`; }
  return d;
}
/* where a path is a given distance along it, and which way it is heading there */
function along(path, len, total) {
  const p = path.getPointAtLength(clamp(len, 0, total)), a = clamp(len - 6, 0, Math.max(0, total - 12)), p0 = path.getPointAtLength(a), p1 = path.getPointAtLength(Math.min(total, a + 12));
  return { x: p.x, y: p.y, deg: Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI };
}
/* the site's one rocket, the same drawing as the one on the progress rail (js/main.js), set down on a chart: the tip of
   its flame sits `gap` px ahead of (x, y) and its nose points along `deg`. Parked, the flame is out, so the gap is
   taken back by the flame's length (6.6 of the drawing's units) and the body stands just past the last point. */
function rocket(parent) {
  const g = svg('g', { class: 'rk', 'aria-hidden': 'true' }, parent);
  svg('path', { d: 'M4.4 19.4h4.2L6.5 26Z', class: 'rk-x' }, g);
  svg('path', { d: 'M6.5 0C9.6 3.4 10.6 7.4 10.6 12v6.2H2.4V12C2.4 7.4 3.4 3.4 6.5 0Z', class: 'rk-b' }, g);
  svg('path', { d: 'M2.4 13.5 0 19.5h2.4ZM10.6 13.5l2.4 6h-2.4Z', class: 'rk-f' }, g);
  svg('circle', { cx: 6.5, cy: 8.4, r: 1.7, class: 'rk-w' }, g);
  return { at(x, y, deg, s, gap) { g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(deg + 90).toFixed(1)}) scale(${s}) translate(-6.5 ${(-26 - gap / s).toFixed(2)})`); }, burn(on) { g.classList.toggle('burn', on); } };
}

/* one tooltip per figure. show(x, y, { head, sub, rows, note }): rows are { name, value, c, direct, tag }: direct hatches
   the row's colour key, tag writes "direct" after a channel's name. It keeps inside the window, and after a tap it stays
   until the next tap somewhere else. */
let stuck = null;
document.addEventListener('pointerdown', e => { if (stuck && !stuck.node.contains(e.target)) { stuck.hide(); stuck = null; } }, true);
function tipOf(fig) {
  const t = el('div.tip', { role: 'status' }); fig.append(t);
  return {
    show(x, y, { head, sub, rows = [], note }) {
      t.replaceChildren(...[el('b', { text: head }), sub ? el('p', { text: sub }) : null,
        ...rows.map(r => el('span', null, el('i' + (r.direct ? '.direct' : '') + (r.c ? '' : '.bare'), r.c ? { style: '--c:' + r.c } : null, r.name, r.tag ? el('small', { text: 'direct' }) : null), r.value)),
        note ? el('em', { text: note }) : null].filter(Boolean));
      const box = fig.getBoundingClientRect(); t.classList.add('on');
      const w = t.offsetWidth, h = t.offsetHeight; let lx = x - box.left + 14, ly = y - box.top - h - 12;
      if (box.left + lx + w > innerWidth - 8) lx = x - box.left - w - 14; if (box.left + lx < 8) lx = 8 - box.left; if (box.top + ly < 8) ly = y - box.top + 18;
      t.style.left = lx.toFixed(0) + 'px'; t.style.top = ly.toFixed(0) + 'px';
    },
    hide() { t.classList.remove('on'); }
  };
}
/* the same reading three ways: under a mouse, after a tap, and from the keyboard */
function inspect(node, show, hide) {
  node.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') show(e); });
  node.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { show(e); stuck = { node, hide }; } });
  node.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hide(); });
}
function legend(items) { return el('ul.legend', null, items.map(i => el('li' + (i.direct ? '.direct' : '') + (i.cls ? '.' + i.cls : ''), { style: '--c:' + i.c }, el('i'), i.name))); }
const kind = () => el('small.kind', { title: DIRECT_NOTE, text: 'direct' });

/* ───────── 03 · revenue by year: the rising line, and the rocket that flies it in ───────── */
function revenue(DATA) {
  const fig = $('#revChart'); if (!fig) return; const tip = tipOf(fig), D = DATA.revenue, n = D.length; let W = 0, entered = STILL, stop = null;
  const dotC = [O_PINK, O_BLUE, O_MINT];
  function draw(play) {
    if (stop) stop(); stop = null; tip.hide(); $$('svg', fig).forEach(s => s.remove());
    const w = W, small = w < 560, L = small ? 46 : 62, R = small ? 46 : 76, T = small ? 50 : 54, B = 38, H = Math.round(clamp(w * 0.4, 290, 460)), ih = H - T - B, base = T + ih, x0 = L + (small ? 18 : 34), x1 = w - R, max = 1200000;
    const X = i => x0 + (x1 - x0) * i / (n - 1), Y = v => base - ih * v / max;
    const s = svg('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'presentation' }); fig.prepend(s);
    const id = 'rv' + (++uid), defs = svg('defs', null, s);
    const lg = svg('linearGradient', { id: id + 'l', gradientUnits: 'userSpaceOnUse', x1: x0, x2: x1, y1: 0, y2: 0 }, defs); [[0, O_PINK], [0.55, O_BLUE], [1, O_MINT]].forEach(([o, c]) => svg('stop', { offset: o, 'stop-color': c }, lg));
    const ag = svg('linearGradient', { id: id + 'a', x1: 0, x2: 0, y1: 0, y2: 1 }, defs); svg('stop', { offset: 0, 'stop-color': O_BLUE, 'stop-opacity': 0.24 }, ag); svg('stop', { offset: 1, 'stop-color': O_BLUE, 'stop-opacity': 0 }, ag);
    const veil = svg('rect', { x: 0, y: 0, width: w, height: H }, svg('clipPath', { id: id + 'c' }, defs));
    [0, 400000, 800000, 1200000].forEach(v => { svg('line', { x1: L, x2: x1, y1: Y(v), y2: Y(v), class: v ? 'ax' : 'ax ax0' }, s); svg('text', { x: L - 10, y: Y(v) + 4, 'text-anchor': 'end' }, s, v ? fmtCompact(v) : '£0'); });
    const pts = D.map((d, i) => ({ x: X(i), y: Y(d.value) })), d = curve(pts, slopes(pts));
    svg('path', { d: d + `L${pts[n - 1].x.toFixed(1)} ${base}L${pts[0].x.toFixed(1)} ${base}Z`, fill: `url(#${id}a)`, 'clip-path': `url(#${id}c)` }, s);
    const line = svg('path', { d, class: 'gline', stroke: `url(#${id}l)` }, s), len = line.getTotalLength();
    D.forEach((r, i) => svg('text', { x: pts[i].x, y: H - 12, 'text-anchor': 'middle', class: 'xl' }, s, r.year));
    const cross = svg('line', { y1: T - 12, y2: base, class: 'cross' }, s);
    const marks = D.map((r, i) => {
      const last = i === n - 1, g = svg('g', { class: 'pt', tabindex: 0, role: 'img', 'aria-label': r.year + ': ' + fmtGBP(r.value) + ' total' + (i ? ', ' + (r.value / D[i - 1].value).toFixed(1) + '× the previous year' : '') + '. ' + r.breakdown.map(b => b[0] + ' ' + fmtGBP(b[1])).join(', ') + '.' }, s);
      svg('circle', { cx: pts[i].x, cy: pts[i].y, r: 20, fill: 'transparent' }, g); svg('circle', { cx: pts[i].x, cy: pts[i].y, r: 7, fill: dotC[i], class: 'dot' }, g);
      svg('text', { x: last ? pts[i].x - 8 : pts[i].x, y: pts[i].y - 19, 'text-anchor': last ? 'end' : 'middle', class: 'val' }, g, fmtCompact(r.value));
      g.addEventListener('focus', () => at(i)); g.addEventListener('blur', off); return g;
    });
    const rk = rocket(s), size = small ? 1.45 : 1.9;
    /* k of the line is drawn: the rocket is at its head, the wash follows underneath, each point lands as it is passed */
    const set = k => {
      line.style.strokeDasharray = len.toFixed(1); line.style.strokeDashoffset = (len * (1 - k)).toFixed(1);
      const a = along(line, len * k, len); rk.at(a.x, a.y, a.deg, size, k >= 1 ? 14 - 6.6 * size : 3); veil.setAttribute('width', Math.max(0, a.x).toFixed(1));
      marks.forEach((g, i) => g.classList.toggle('in', a.x >= pts[i].x - 0.5));
    };
    function at(i, e) {
      const r = D[i], bx = fig.getBoundingClientRect(); cross.setAttribute('x1', pts[i].x); cross.setAttribute('x2', pts[i].x); cross.style.opacity = 1; marks.forEach((g, k) => g.classList.toggle('on', k === i));
      tip.show(e ? e.clientX : bx.left + pts[i].x, e ? e.clientY : bx.top + pts[i].y - 14, { head: r.year + ' · ' + fmtCompact(r.value) + ' total',
        rows: [...r.breakdown.map(b => ({ name: b[0], value: fmtCompact(b[1]), c: chan(b[0]).c, direct: chan(b[0]).direct, tag: chan(b[0]).direct })), ...(i ? [{ name: 'vs ' + D[i - 1].year, value: (r.value / D[i - 1].value).toFixed(1) + '×' }] : [])] });
    }
    function off() { cross.style.opacity = 0; marks.forEach(g => g.classList.remove('on')); tip.hide(); }
    const hit = svg('rect', { x: L, y: T - 30, width: w - L, height: ih + 30 + B, fill: 'transparent' }, s);
    inspect(hit, e => { const bx = s.getBoundingClientRect(), mx = (e.clientX - bx.left) * (w / bx.width); let best = 0; pts.forEach((p, i) => { if (Math.abs(p.x - mx) < Math.abs(pts[best].x - mx)) best = i; }); at(best, e); }, off);
    if (play && !STILL) { set(0); rk.burn(true); stop = tween(2000, k => set(easeInOut(k)), () => { rk.burn(false); stop = null; }); } else set(entered ? 1 : 0);
  }
  sized(fig, w => { W = w; draw(false); });
  if (!STILL) onSeen(fig, () => { entered = true; draw(true); });
}

/* ───────── 04 · three nested markets, each on its own timeline ─────────
   The same Freedom revenue measured against all UK online retail, then the UK fire safety market, then the slice of it
   already bought online: the share climbs an order of magnitude each step down. Each bar keeps its own scale (barMax),
   because the shares are orders of magnitude apart. The two online markets stop at 2031, the horizon of the forecast
   they come from. The thumb moves freely under the hand and comes to rest on a year; the figures are always a year's. */
/* the display face draws every figure the same width but 1: give 1 the others' room, so a number keeps its width as it changes */
const even = text => text.split(/(1)/).filter(Boolean).map(t => t === '1' ? el('span.d1', { text: t }) : t);
function market(DATA) {
  const M = DATA.market, T = DATA.trajectory, STEP = 100;
  const CFG = {
    ecommerce: { barMax: 0.05, maxYear: 2031, size: y => 132e9 * Math.pow(1.07, y - 2026) },
    fire: { barMax: 1.2, size: y => y <= M.nowYear ? M.now : y >= 2030 ? M.y2030 : M.now + (M.y2030 - M.now) * ((y - M.nowYear) / (2030 - M.nowYear)), suffix: y => y >= 2030 ? '(2030 est.)' : '' },
    'fire-ecommerce': { barMax: 6, maxYear: 2031, size: y => 380e6 * Math.pow(1.08, y - 2026) }
  };
  $$('.mkp').forEach(panel => {
    const cfg = CFG[panel.dataset.mk], input = $('.runway-slider', panel), box = $('.runway-years', panel); if (!cfg || !input) return;
    const yrs = T.filter(d => !cfg.maxYear || d.year <= cfg.maxYear), n = yrs.length, r = k => $('[data-r="' + k + '"]', panel), track = $('.share-track', panel);
    let cur = -1, glide = null, touched = false; const start = Math.max(0, yrs.findIndex(d => d.year === 2025));
    input.min = 0; input.max = (n - 1) * STEP; input.step = 1; track.setAttribute('role', 'img'); track.title = 'The bar is full at ' + cfg.barMax + '%';
    const ticks = yrs.map((d, i) => { const b = el('button', { type: 'button', tabindex: -1, style: '--p:' + (i / (n - 1)).toFixed(4), 'aria-label': 'Show ' + d.year, onclick: () => { touched = true; go(i); } }, el('span', { text: d.year }), el('span.s', { 'aria-hidden': 'true', text: '’' + String(d.year).slice(-2) })); box.append(b); return b; });
    function show(i) {
      if (i === cur) return; cur = i; const d = yrs[i], mk = cfg.size(d.year), p = d.value / mk * 100, sh = p < 0.0005 ? '<0.001%' : p < 0.1 ? p.toFixed(3) + '%' : p.toFixed(2) + '%', sfx = cfg.suffix ? cfg.suffix(d.year) : '';
      r('kind').textContent = d.kind === 'actual' ? '(actual)' : '(target)'; r('rev').replaceChildren(...even(fmtCompact(d.value) + (d.year === 2025 ? '+' : '')));
      r('mkt').replaceChildren(...even(fmtCompact(mk)), sfx ? el('small', { text: sfx }) : ''); r('share').replaceChildren(...even(sh)); r('fill').style.width = Math.min(100, p / cfg.barMax * 100).toFixed(2) + '%';
      ticks.forEach((b, k) => b.classList.toggle('on', k === i)); track.setAttribute('aria-label', 'Share of the market in ' + d.year + ': ' + sh + '. The bar is full at ' + cfg.barMax + '%.');
      input.setAttribute('aria-valuetext', d.year + ': revenue ' + fmtCompact(d.value) + ', market share ' + p.toFixed(3) + '%');
    }
    const near = () => clamp(Math.round(input.value / STEP), 0, n - 1);
    function go(i, ms = 320) { i = clamp(i, 0, n - 1); const from = +input.value, to = i * STEP; if (glide) glide(); glide = tween(ms, k => { input.value = Math.round(lerp(from, to, easeInOut(k))); show(near()); }, () => { glide = null; show(i); }); }
    input.addEventListener('input', () => { touched = true; if (glide) { glide(); glide = null; } show(near()); });
    input.addEventListener('change', () => { const from = +input.value, to = cur * STEP; if (glide) glide(); glide = tween(from === to ? 0 : 180, k => { input.value = Math.round(lerp(from, to, easeOut(k))); }, () => { glide = null; }); });
    input.addEventListener('keydown', e => { const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 2, PageDown: -2 }[e.key]; const to = by ? cur + by : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null; if (to === null) return; e.preventDefault(); touched = true; go(to, 160); });
    /* it starts at the first year and walks to 2025 as the panel is first seen, so it is plain that it moves */
    if (STILL) { input.value = start * STEP; show(start); } else { input.value = 0; show(0); onSeen(box, () => setTimeout(() => { if (!touched) go(start, 1100); }, 450)); }   // (the panel itself is already watched, for its own arrival)
  });
}

/* ───────── 06 · the channel plan ───────── */
/* a ring of parts with the total in the middle; over a part (or its row) the others stand back and the middle names it */
function donut(fig, parts, centre, onHover, tip) {
  $$('svg', fig).forEach(s => s.remove()); const s = svg('svg', { viewBox: '0 0 220 220', role: 'img', 'aria-label': centre.label }); fig.prepend(s); const defs = svg('defs', null, s);
  const total = parts.reduce((a, p) => a + p.v, 0) || 1, C = 110, R = 100, r = 64, gap = 0.012; let a = -Math.PI / 2; const segs = {}, ink = svg('g', null, s), hits = svg('g', null, s);
  parts.forEach(p => {
    const sw = p.v / total * Math.PI * 2; if (sw <= 0) return;
    const a0 = a + Math.min(gap, sw / 4), a1 = a + sw - Math.min(gap, sw / 4), mid = a + sw / 2; a += sw; const large = a1 - a0 > Math.PI ? 1 : 0;
    const pt = (rad, ang) => (C + rad * Math.cos(ang)).toFixed(2) + ' ' + (C + rad * Math.sin(ang)).toFixed(2), d = `M${pt(R, a0)}A${R} ${R} 0 ${large} 1 ${pt(R, a1)}L${pt(r, a1)}A${r} ${r} 0 ${large} 0 ${pt(r, a0)}Z`;
    /* the part that is seen steps out when it is picked; the part that is felt stays where it was, so a thin neighbour can still be reached */
    const path = svg('path', { d, fill: p.direct ? hatch(defs, 'dh' + (++uid), p.c) : p.c, class: 'seg' }, ink), hit = svg('path', { d, fill: 'transparent' }, hits);
    segs[p.name] = { path, dx: Math.cos(mid) * 5, dy: Math.sin(mid) * 5, p };
    inspect(hit, e => { onHover(p.name); tip.show(e.clientX, e.clientY, { head: p.name, rows: [{ name: centre.sub, value: fmtCompact(p.v), c: p.c, direct: p.direct }, { name: 'Share', value: share(p.v / total) }], note: p.direct ? DIRECT_NOTE : null }); }, () => { onHover(null); tip.hide(); });
  });
  const big = svg('text', { x: C, y: C + 6, 'text-anchor': 'middle', class: 'dn-big' + (centre.total.length > 6 ? ' long' : '') }, s, centre.total), sub = svg('text', { x: C, y: C + 27, 'text-anchor': 'middle', class: 'dn-sub' }, s, centre.sub);
  return { hi(name) {
    const h = name && segs[name]; Object.values(segs).forEach(g => { const on = g === h; g.path.style.opacity = !h || on ? 1 : 0.32; g.path.style.transform = on ? `translate(${g.dx.toFixed(1)}px,${g.dy.toFixed(1)}px)` : ''; });
    big.textContent = h ? fmtCompact(h.p.v) : centre.total; sub.textContent = h ? name : centre.sub; sub.classList.toggle('long', !!h && name.length > 11); big.classList.toggle('long', big.textContent.length > 6);
  } };
}
/* the same parts as a list; a row answers the mouse, a tap and the keyboard the way its part of the ring does */
function partRows(list, parts, onHover, text) {
  list.replaceChildren(...parts.map(p => {
    const li = el('li' + (p.direct ? '.direct' : '') + (p.off ? '.off' : ''), { style: '--c:' + p.c, 'data-n': p.name, tabindex: p.off ? null : 0 }, el('i'), el('em', null, el('u', { text: p.name }), p.direct ? kind() : null), el('b', { text: p.off ? '—' : fmtCompact(p.v) }), el('span', { text: p.off ? '' : text(p) }));
    if (!p.off) { inspect(li, () => onHover(p.name), () => onHover(null)); li.addEventListener('focus', () => onHover(p.name)); li.addEventListener('blur', () => onHover(null)); }
    return li;
  }));
  return { hi(name) { list.classList.toggle('dim', !!name); $$('li', list).forEach(li => li.classList.toggle('hi', li.dataset.n === name)); } };
}

function plan(DATA) {
  const fig = $('#planChart'); if (!fig) return; const P = DATA.projection, tip = tipOf(fig), n = P.years.length;
  const series = CHANNELS.map(c => ({ ...c, values: P.channels.find(x => x.name === c.name).values }));
  const stack = [...series].sort((a, b) => (b.direct ? 1 : 0) - (a.direct ? 1 : 0));            // the two direct channels are the foot of every column
  const st = { mode: 'stacked', on: new Set(series.map(s => s.name)), year: 2030 };
  const yearTotal = i => series.reduce((a, s) => a + s.values[i], 0);
  $('#cagrChip').textContent = P.years[0] + ' → ' + P.years[n - 1] + ' CAGR ≈ ' + Math.round((Math.pow(yearTotal(n - 1) / yearTotal(0), 1 / (n - 1)) - 1) * 100) + '%';

  /* the chips: marketplaces on the first line, the two direct channels together on the second */
  const chips = $('#planChips');
  series.forEach((s, i) => {
    if (s.direct && i && !series[i - 1].direct) chips.append(el('span.brk'));
    chips.append(el('button' + (s.direct ? '.direct' : ''), { type: 'button', 'aria-pressed': 'true', style: '--c:' + s.c, title: s.direct ? DIRECT_NOTE : 'Online marketplace', onclick: e => {
      if (st.on.has(s.name)) { if (st.on.size === 1) return; st.on.delete(s.name); } else st.on.add(s.name);
      e.currentTarget.setAttribute('aria-pressed', String(st.on.has(s.name))); layout(true); detail(); } }, el('i'), s.name));
  });
  chips.append(el('span.key', { text: 'Hatched · direct, not a marketplace' }));
  $$('#planMode button').forEach(b => b.addEventListener('click', () => { if (st.mode === b.dataset.mode) return; st.mode = b.dataset.mode; $$('#planMode button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); layout(true); }));

  let W = 0, H = 0, G = null, cur = {}, capY = [], stop = null, entered = STILL;
  /* the parts that stay put at this size: a column for each year, its eight bars waiting to be placed */
  function build() {
    if (stop) stop(); stop = null; tip.hide(); $$('svg', fig).forEach(s => s.remove());
    const w = W, h = H, small = w < 520, L = small ? 40 : 54, R = 4, T = 40, B = 46, ih = h - T - B, band = (w - L - R) / n;
    const s = svg('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'presentation', class: small ? 'sm' : null }); fig.prepend(s); const defs = svg('defs', null, s);
    const fill = Object.fromEntries(series.map(a => [a.name, a.direct ? hatch(defs, 'ph' + (++uid), a.c) : a.c])), axis = svg('g', { class: 'axis' }, s);
    const cols = P.years.map((yr, i) => {
      const cx = L + band * i + band / 2, g = svg('g', { class: 'col', tabindex: 0, role: 'button', 'data-cursor': '' }, s);
      svg('rect', { x: L + band * i + 3, y: T - 30, width: band - 6, height: ih + 30 + B - 4, rx: 6, class: 'colbg' }, g);
      const bars = stack.map(a => svg('path', { fill: fill[a.name], class: 'bar' }, g)), cap = svg('text', { x: cx, 'text-anchor': 'middle', class: 'cap' }, g);
      svg('text', { x: cx, y: h - 20, 'text-anchor': 'middle', class: 'xl' }, g, yr); svg('rect', { x: cx - 14, y: h - 11, width: 28, height: 2, rx: 1, class: 'pick' }, g);
      const tell = e => {
        const j = e ? bars.indexOf(e.target) : -1, t = G.t, bx = fig.getBoundingClientRect(), x = e ? e.clientX : bx.left + cx, y = e ? e.clientY : bx.top + T + 30; bars.forEach((b, k) => b.classList.toggle('hot', k === j));
        if (j >= 0) { const a = stack[j]; tip.show(x, y, { head: a.name + ' · ' + yr, rows: [{ name: 'Projected', value: fmtCompact(a.values[i]), c: a.c, direct: a.direct }, { name: 'Share of ' + yr, value: share(a.values[i] / (t.tot[i] || 1)) }], note: a.direct ? DIRECT_NOTE : null }); }
        else tip.show(x, y, { head: yr + ' · ' + fmtCompact(t.tot[i]), rows: t.act.map(a => ({ name: a.name, value: fmtCompact(a.values[i]) + ' · ' + share(a.values[i] / (t.tot[i] || 1)), c: a.c, direct: a.direct, tag: a.direct })) });
      };
      const quiet = () => { bars.forEach(b => b.classList.remove('hot')); tip.hide(); };
      inspect(g, tell, quiet); g.addEventListener('focus', () => { if (g.matches(':focus-visible')) tell(); }); g.addEventListener('blur', quiet);
      g.addEventListener('click', () => pick(yr)); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(yr); } });
      return { g, cx, bars, cap, yr };
    });
    G = { w, h, L, R, T, ih, band, small, axis, cols, base: T + ih, t: null };
  }
  /* where every bar goes for the view and the channels switched on */
  function target() {
    const { L, T, ih, band, small, base } = G, act = series.filter(a => st.on.has(a.name)), tot = P.years.map((y, i) => act.reduce((a, c) => a + c.values[i], 0));
    const top = st.mode === 'share' ? 1 : st.mode === 'grouped' ? Math.max(1, ...act.flatMap(a => a.values)) : Math.max(1, ...tot);
    const step = st.mode === 'share' ? 0.25 : axisStep(top), nT = st.mode === 'share' ? 4 : Math.ceil(top / step - 1e-9), max = step * nT, Y = v => base - ih * v / max, geo = {}, caps = [];
    P.years.forEach((yr, i) => {
      const cx = L + band * i + band / 2;
      if (st.mode === 'grouped') {
        const gap = 2, bw = clamp((Math.min(band * 0.86, 170) - (act.length - 1) * gap) / act.length, 2, 34), gw = act.length * bw + (act.length - 1) * gap;
        series.forEach(a => { const k = act.indexOf(a), key = a.name + i; if (k < 0) { const c = cur[key]; geo[key] = { x: c ? c.x : cx, w: c ? c.w : 0, y: base, h: 0, r: 0, o: 0 }; return; }
          const hh = Math.max(1.5, ih * a.values[i] / max); geo[key] = { x: cx - gw / 2 + k * (bw + gap), w: bw, y: base - hh, h: hh, r: Math.min(3, bw / 2), o: 1 }; });
        caps[i] = { y: Y(Math.max(...act.map(a => a.values[i]))) - 9, o: 0, text: '' };
      } else {
        const bw = Math.min(band * 0.54, 96), div = st.mode === 'share' ? (tot[i] || 1) : 1; let acc = 0, topKey = null, first = true;
        stack.forEach(a => { const key = a.name + i; if (!st.on.has(a.name)) { geo[key] = { x: cx - bw / 2, w: bw, y: Y(acc), h: 0, r: 0, o: 0 }; return; }
          const v = a.values[i] / div, y1 = Y(acc), y0 = Y(acc + v), full = y1 - y0, inset = full >= 6 ? 1 : full >= 3 ? 0.5 : 0; acc += v;       // a 2px gap between parts; a sliver keeps all of its height
          geo[key] = { x: cx - bw / 2, w: bw, y: y0 + inset, h: Math.max(0.8, full - inset - (first ? 0 : inset)), r: 0, o: 1 }; topKey = key; first = false; });
        if (topKey) { const g = geo[topKey]; g.h += g.y - Y(acc); g.y = Y(acc); g.r = 4; }       // the top of the column: no gap above it, and rounded
        caps[i] = { y: (st.mode === 'share' ? T : Y(tot[i])) - 9, o: 1, text: small ? short(tot[i]) : fmtCompact(tot[i]) };
      }
    });
    return { geo, caps, max, step, nT, Y, tot, act };
  }
  /* place the bars: at once, or eased from where they are (or, the first time, growing from the floor one year after another) */
  function layout(animate, rise) {
    if (!G) return; const t = G.t = target(), from = rise ? null : { ...cur }, capFrom = capY.slice(), { L, w, R, base } = G;
    G.axis.replaceChildren(); for (let k = 0; k <= t.nT; k++) { const v = t.step * k, y = t.Y(v); svg('line', { x1: L, x2: w - R, y1: y, y2: y, class: k ? 'ax' : 'ax ax0' }, G.axis); svg('text', { x: L - 9, y: y + 4, 'text-anchor': 'end' }, G.axis, st.mode === 'share' ? Math.round(v * 100) + '%' : v ? short(v) : '£0'); }
    if (animate) { G.axis.style.animation = 'none'; G.axis.getBoundingClientRect(); G.axis.style.animation = ''; }
    G.cols.forEach((c, i) => { if (t.caps[i].text) c.cap.textContent = t.caps[i].text; c.g.classList.toggle('sel', c.yr === st.year); c.g.setAttribute('aria-pressed', String(c.yr === st.year));
      c.g.setAttribute('aria-label', c.yr + ': ' + fmtGBP(t.tot[i]) + (t.act.length === series.length ? ' across all eight channels. ' : ' across the ' + t.act.length + ' channels shown. ') + t.act.map(a => a.name + ' ' + fmtCompact(a.values[i])).join(', ') + '. Press to show this year in the breakdown.'); });
    if (stop) stop(); const lag = rise ? 0.09 : 0, dur = rise ? 900 : 520;
    stop = tween(animate ? dur * (1 + lag * (n - 1)) : 0, k => {
      G.cols.forEach((c, i) => {
        const e = rise ? easeOut(clamp(k * (1 + lag * (n - 1)) - lag * i)) : easeInOut(k), cp = t.caps[i], cy = lerp(rise || capFrom[i] === undefined ? cp.y : capFrom[i], cp.y, e);
        stack.forEach((a, j) => { const key = a.name + i, B = t.geo[key], A = rise ? { ...B, y: base, h: 0 } : (from[key] || B), g = { x: lerp(A.x, B.x, e), w: lerp(A.w, B.w, e), y: lerp(A.y, B.y, e), h: lerp(A.h, B.h, e), r: B.r, o: lerp(A.o, B.o, e) };
          cur[key] = g; c.bars[j].setAttribute('d', roundBar(g.x, g.y, g.w, g.h, g.r)); c.bars[j].style.opacity = g.o.toFixed(2); });
        capY[i] = cy; c.cap.setAttribute('y', cy.toFixed(1)); c.cap.style.opacity = rise ? (e * cp.o).toFixed(2) : cp.o;
      });
    }, () => { stop = null; });
  }
  function pick(yr) { st.year = yr; G.cols.forEach(c => { const on = c.yr === yr; c.g.classList.toggle('sel', on); c.g.setAttribute('aria-pressed', String(on)); }); detail(); }

  /* the year breakdown: marketplaces by value, then the two direct channels; a channel switched off keeps its row, dimmed */
  const ydTip = tipOf($('#ydDonut'));
  function detail() {
    const i = P.years.indexOf(st.year), all = st.on.size === series.length;
    const parts = series.map(s => ({ name: s.name, c: s.c, direct: s.direct, v: s.values[i], prev: i ? s.values[i - 1] : 0, off: !st.on.has(s.name) })).sort((a, b) => ((a.direct ? 1 : 0) - (b.direct ? 1 : 0)) || b.v - a.v);
    const live = parts.filter(p => !p.off), total = live.reduce((a, p) => a + p.v, 0); let dn = null, rw = null; const hov = nm => { dn.hi(nm); rw.hi(nm); };
    $('#ydYear').textContent = st.year; $('#ydTotal').textContent = fmtCompact(total) + (all ? ' target' : ' (selected channels)');
    dn = donut($('#ydDonut'), live, { total: fmtCompact(total), sub: String(st.year), label: st.year + ' channel mix, ' + fmtCompact(total) + ': ' + live.map(p => p.name + ' ' + fmtCompact(p.v) + ' (' + share(p.v / total) + ')').join(', ') }, hov, ydTip);
    rw = partRows($('#ydRows'), parts, hov, p => share(p.v / total) + (p.prev ? ' · ' + (p.v / p.prev).toFixed(1) + '×' : ''));
    $('#ydHint').textContent = i > 0 ? '×N shows growth vs ' + P.years[i - 1] + '. Click other year columns to compare.' : 'Click other year columns in the chart to compare mixes.';
  }
  sized(fig, (w, h) => { W = w; H = h; build(); layout(false); if (!entered) G.cols.forEach(c => { c.bars.forEach(b => b.setAttribute('d', '')); c.cap.style.opacity = 0; }); }, true);
  detail();
  if (!STILL) onSeen(fig, () => { entered = true; layout(true, true); });

  /* the table view of the same figures */
  $('#matrixTable').append(el('caption.vh', { text: 'Projected revenue by channel, 2026 to 2031' }), el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Channel' }), P.years.map(y => el('th', { scope: 'col', text: y })))),
    el('tbody', null, series.map(s => el('tr', null, el('th', { scope: 'row', style: '--c:' + s.c }, el('i' + (s.direct ? '.direct' : '')), s.name, s.direct ? kind() : null), s.values.map(v => el('td', { text: fmtGBP(v) }))))),
    el('tfoot', null, el('tr', null, el('th', { scope: 'row', text: 'Total' }), P.years.map((y, i) => el('td', { text: fmtGBP(yearTotal(i)) })))));
}

/* ───────── 07 · the line to 2036, the 2036 mix, how the mix shifts ───────── */
function trajectory(DATA) {
  const fig = $('#trajChart'); if (!fig) return; const D = DATA.trajectory, tip = tipOf(fig), n = D.length, iA = D.reduce((a, d, i) => d.kind === 'actual' ? i : a, 0);
  const peak = Math.max(...D.map(d => d.value)), LIN = peak * 1.045, LO = Math.log10(20000), HI = Math.log10(peak * 1.3), named = [D[iA].year, 2031, D[n - 1].year];
  let scale = 'linear', W = 0, G = null, ys = null, stop = null, entered = STILL;
  $('#trajScale').after(el('ul.legend', null, el('li.ln', { style: '--c:' + O_BLUE }, el('i'), 'Actual'), el('li.ln.dash', { style: '--c:' + O_MINT }, el('i'), 'Target')));
  $$('#trajScale button').forEach(b => b.addEventListener('click', () => { if (scale === b.dataset.scale) return; scale = b.dataset.scale; $$('#trajScale button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); morph(); }));
  const yOf = (v, g) => scale === 'log' ? g.base - g.ih * (Math.log10(Math.max(v, 20000)) - LO) / (HI - LO) : g.base - g.ih * v / LIN;
  function build() {
    if (stop) stop(); stop = null; tip.hide(); $$('svg', fig).forEach(s => s.remove());
    const w = W, small = w < 620, L = small ? 46 : 62, R = small ? 46 : 76, T = small ? 50 : 54, B = 38, H = Math.round(clamp(w * 0.42, 310, 480)), ih = H - T - B, base = T + ih, x0 = L + (small ? 10 : 20), x1 = w - R;
    const X = yr => x0 + (x1 - x0) * (yr - D[0].year) / (D[n - 1].year - D[0].year);
    const s = svg('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'presentation' }); fig.prepend(s); const id = 'tj' + (++uid), defs = svg('defs', null, s);
    const ag = svg('linearGradient', { id: id + 'a', x1: 0, x2: 0, y1: 0, y2: 1 }, defs); svg('stop', { offset: 0, 'stop-color': O_MINT, 'stop-opacity': 0.22 }, ag); svg('stop', { offset: 1, 'stop-color': O_MINT, 'stop-opacity': 0 }, ag);
    const veil = svg('rect', { x: 0, y: 0, width: w, height: H }, svg('clipPath', { id: id + 'c' }, defs));
    const grid = svg('g', { class: 'axis' }, s);
    D.forEach(d => { if (small && d.year % 2 === 0 && d.year !== D[n - 1].year) return; svg('text', { x: X(d.year), y: H - 12, 'text-anchor': 'middle', class: 'xl' }, s, d.year); });
    const inked = svg('g', { 'clip-path': `url(#${id}c)` }, s), area = svg('path', { fill: `url(#${id}a)` }, inked), dashed = svg('path', { class: 'tline dash' }, inked), solid = svg('path', { class: 'tline' }, inked), full = svg('path', { fill: 'none', stroke: 'none' }, s);
    const cross = svg('line', { y1: T - 12, y2: base, class: 'cross' }, s);
    const marks = D.map((d, i) => {
      const g = svg('g', { class: 'pt ' + d.kind, tabindex: 0, role: 'img', 'aria-label': d.year + ': ' + fmtCompact(d.value) + ' ' + d.kind + (d.note ? '. ' + d.note : '') }, s);
      svg('circle', { r: 16, fill: 'transparent' }, g); svg('circle', { r: i === n - 1 ? 7 : 5.5, class: 'dot' }, g);
      if (named.includes(d.year) && !(small && i === iA)) svg('text', { x: i === iA ? 0 : -12, y: i === iA ? -16 : -10, 'text-anchor': i === iA ? 'middle' : 'end', class: 'val' }, g, fmtCompact(d.value));
      g.addEventListener('focus', () => at(i)); g.addEventListener('blur', off); return g;
    });
    const rk = rocket(s);
    function at(i, e) {
      const d = D[i], p = G.pts[i], bx = fig.getBoundingClientRect(); cross.setAttribute('x1', p.x); cross.setAttribute('x2', p.x); cross.style.opacity = 1; marks.forEach((g, k) => g.classList.toggle('on', k === i));
      tip.show(e ? e.clientX : bx.left + p.x, e ? e.clientY : bx.top + p.y - 12, { head: String(d.year), sub: d.kind, rows: [{ name: 'Revenue', value: fmtCompact(d.value), c: d.kind === 'actual' ? O_BLUE : O_MINT }], note: d.note || null });
    }
    function off() { cross.style.opacity = 0; marks.forEach(g => g.classList.remove('on')); tip.hide(); }
    const hit = svg('rect', { x: L, y: T - 30, width: w - L, height: ih + 30 + B, fill: 'transparent' }, s);
    inspect(hit, e => { const bx = s.getBoundingClientRect(), mx = (e.clientX - bx.left) * (w / bx.width); let best = 0; G.pts.forEach((p, i) => { if (Math.abs(p.x - mx) < Math.abs(G.pts[best].x - mx)) best = i; }); at(best, e); }, off);
    G = { w, H, L, T, ih, base, x1, X, small, grid, veil, area, dashed, solid, full, marks, rk, size: small ? 1.45 : 1.9, pts: [], len: 0 };
  }
  function axes() {
    const g = G; g.grid.replaceChildren();
    const ticks = scale === 'log' ? [1e5, 1e6, 1e7, 1e8] : Array.from({ length: Math.floor(peak / 2e7) + 1 }, (_, i) => i * 2e7);
    ticks.forEach(v => { const y = yOf(v, g); svg('line', { x1: g.L, x2: g.x1, y1: y, y2: y, class: v ? 'ax' : 'ax ax0' }, g.grid); svg('text', { x: g.L - 10, y: y + 4, 'text-anchor': 'end' }, g.grid, v ? fmtCompact(v) : '£0'); });
    if (scale === 'log') { svg('line', { x1: g.L, x2: g.x1, y1: g.base, y2: g.base, class: 'ax ax0' }, g.grid); svg('text', { x: g.L + 2, y: g.T - 16, class: 'axn' }, g.grid, 'log scale'); }
  }
  /* the line through these heights; k of it shown, the rocket at its head (parked just past the last point at k = 1) */
  function paint(y, k) {
    const g = G, pts = D.map((d, i) => ({ x: g.X(d.year), y: y[i] })), t = slopes(pts), d = curve(pts, t); g.pts = pts;
    g.full.setAttribute('d', d); g.solid.setAttribute('d', curve(pts, t, 0, iA)); g.dashed.setAttribute('d', curve(pts, t, iA)); g.area.setAttribute('d', d + `L${pts[n - 1].x.toFixed(1)} ${g.base}L${pts[0].x.toFixed(1)} ${g.base}Z`);
    const len = g.full.getTotalLength(), a = along(g.full, len * k, len); g.rk.at(a.x, a.y, a.deg, g.size, k >= 1 ? 14 - 6.6 * g.size : 3); g.veil.setAttribute('width', k >= 1 ? g.w : Math.max(0, a.x).toFixed(1));
    g.marks.forEach((m, i) => { m.setAttribute('transform', `translate(${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)})`); m.classList.toggle('in', k >= 1 || a.x >= pts[i].x - 0.5); });
  }
  const heights = () => D.map(d => yOf(d.value, G));
  function morph() { const from = ys.slice(), to = heights(); axes(); if (stop) stop(); G.rk.burn(false); stop = tween(520, k => { const e = easeInOut(k); ys = from.map((f, i) => lerp(f, to[i], e)); paint(ys, 1); }, () => { stop = null; }); }
  function fly() { ys = heights(); G.rk.burn(true); stop = tween(2600, k => paint(ys, easeInOut(k)), () => { G.rk.burn(false); stop = null; }); }
  sized(fig, w => { W = w; build(); axes(); ys = heights(); paint(ys, entered ? 1 : 0); });
  if (!STILL) onSeen(fig, () => { entered = true; if (stop) stop(); fly(); });
}

function mix2036(DATA) {
  const fig = $('#mixDonut'); if (!fig) return; const P = DATA.projection, P36 = DATA.projection2036;
  const parts = P36.channels.map(c => ({ name: c.name, c: chan(c.name).c, direct: chan(c.name).direct, v: c.value })), total = parts.reduce((a, p) => a + p.v, 0);
  let dn = null, rw = null; const hov = nm => { dn.hi(nm); rw.hi(nm); };
  dn = donut(fig, parts, { total: fmtCompact(total), sub: '2036 target', label: '2036 revenue mix, ' + fmtCompact(total) + ' total: ' + parts.map(p => p.name + ' ' + fmtCompact(p.v) + ' (' + share(p.v / total) + ')').join(', ') }, hov, tipOf(fig));
  rw = partRows($('#mixLegend'), parts, hov, p => share(p.v / total));

  /* how the mix shifts: the same eight channels as shares of 2026, 2030 and 2036, in one fixed order */
  const box = $('#shiftRows'), panel = box.closest('.panel'), tip = tipOf(panel), segs = [];
  [2026, 2030, 2036].forEach(yr => {
    const ps = CHANNELS.map(c => ({ ...c, v: yr === 2036 ? P36.channels.find(x => x.name === c.name).value : P.channels.find(x => x.name === c.name).values[P.years.indexOf(yr)] })), tot = ps.reduce((a, p) => a + p.v, 0);
    const bar = el('div.bar', { role: 'img', 'aria-label': yr + ' channel share: ' + ps.map(p => p.name + ' ' + share(p.v / tot)).join(', ') }, ps.map(p => {
      const f = p.v / tot, seg = el('i' + (p.direct ? '.direct' : ''), { style: '--c:' + p.c + ';flex-grow:' + (f * 1000).toFixed(2) }, p.direct ? null : el('span', { text: Math.round(f * 100) + '%' }));
      inspect(seg, e => tip.show(e.clientX, e.clientY, { head: p.name + ' · ' + yr, rows: [{ name: 'Revenue', value: fmtCompact(p.v), c: p.c, direct: p.direct }, { name: 'Share', value: share(f) }], note: p.direct ? DIRECT_NOTE : null }), tip.hide); segs.push(seg); return seg; }));
    box.append(el('div.row', null, el('b', { text: yr }), bar, el('span', { text: fmtCompact(tot) })));
  });
  box.after(legend(CHANNELS));
  /* a share is printed inside its part only where the part is wide enough to hold it */
  sized(box, () => segs.forEach(s => s.classList.toggle('fit', s.clientWidth >= 34)));
}

/* ───────── 10 · the flywheel ───────── */
function flywheel() {
  const fig = $('#flyWheel'), steps = $$('#flySteps li'); if (!fig || !steps.length) return; const n = steps.length;
  const s = svg('svg', { viewBox: '0 0 400 400' }, fig); const R = 150, C = 200;
  svg('circle', { cx: C, cy: C, r: R, class: 'fw-ring' }, s);
  const arc = svg('circle', { cx: C, cy: C, r: R, class: 'fw-arc', 'stroke-dasharray': (2 * Math.PI * R / n).toFixed(1) + ' ' + (2 * Math.PI * R).toFixed(1), transform: `rotate(-90 ${C} ${C})` }, s);
  const big = svg('text', { x: C, y: C + 8, 'text-anchor': 'middle', class: 'fw-big' }, s, '01'); svg('text', { x: C, y: C + 44, 'text-anchor': 'middle', class: 'fw-sub' }, s, 'EACH TURN FUNDS THE NEXT');
  const nodes = steps.map((li, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2, g = svg('g', { class: 'fw-node', transform: `translate(${(C + R * Math.cos(a)).toFixed(1)} ${(C + R * Math.sin(a)).toFixed(1)})` }, s);
    svg('circle', { r: 21 }, g); svg('text', { y: 5, 'text-anchor': 'middle' }, g, String(i + 1).padStart(2, '0')); g.addEventListener('pointerenter', () => { set(i); hold = performance.now(); }); return g; });
  let cur = -1, hold = 0, timer = 0;
  function set(i) { cur = i; steps.forEach((li, k) => li.classList.toggle('on', k === i)); nodes.forEach((g, k) => g.classList.toggle('on', k === i)); big.textContent = String(i + 1).padStart(2, '0'); arc.style.transform = `rotate(${-90 + (i - 0.5) * 360 / n}deg)`; }
  arc.removeAttribute('transform'); arc.style.transformOrigin = `${C}px ${C}px`; arc.style.transition = STILL ? 'none' : 'transform .9s cubic-bezier(.65,0,.35,1)';
  steps.forEach((li, i) => li.addEventListener('pointerenter', () => { set(i); hold = performance.now(); }));
  set(0);
  if (STILL) { steps.forEach(li => li.classList.add('on')); return; }
  const tick = () => { if (performance.now() - hold > 5000) set((cur + 1) % n); };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { clearInterval(timer); if (e.isIntersecting) timer = setInterval(tick, 1900); }), { threshold: 0.3 }).observe(fig); else timer = setInterval(tick, 1900);
}

export function initCharts(DATA) {
  const run = f => { try { f(DATA); } catch (e) { console.error('chart', e); } };
  [revenue, market, plan, trajectory, mix2036, flywheel].forEach(run);
  $$('#traction .mult').forEach(x => x.classList.add('rv'));      // the three multiples arrive the way the panels do
}

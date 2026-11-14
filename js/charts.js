/* The figures, drawn as SVG at the size they are shown (so the type never shrinks with the chart): revenue by year,
   the three nested markets, the eight channel plan with its year breakdown and data table, the line to 2036, the 2036
   mix, how the mix shifts, and the flywheel. Colour follows the channel everywhere; the two direct channels are hatched.
   The channel colours were checked for colour-blind separation between neighbours on each surface before use. */
import { $, $$, el, svg, clamp, fmtCompact, fmtGBP, onSeen, tipFor, STILL } from './kit.js';

/* fixed order and colour for every channel: six marketplaces, then the two direct channels */
export const CHANNELS = [
  { name: 'eBay', c: '#3987e5' }, { name: 'Amazon', c: '#d95926' }, { name: 'TikTok Shop', c: '#199e70' }, { name: 'OnBuy', c: '#9085e9' },
  { name: 'Temu', c: '#e66767' }, { name: 'Shopify', c: '#0ca30c' }, { name: 'On Site Servicing', c: '#d55181', direct: true }, { name: 'B2B', c: '#c98500', direct: true }
];
const chan = n => CHANNELS.find(c => c.name === n);
const PAPER = { 'On Site Servicing': '#d55181', eBay: '#2a78d6', Temu: '#e34948' };   // the same three, stepped for the light sheet
const DARK_SURFACE = '#141413', LIGHT_SURFACE = '#FBF9F5', PINK = '#FF2D8D';
let uid = 0;

/* a round step for an axis that has to reach v: three to six intervals */
function axisStep(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [10, 5, 2.5, 2, 1, 0.5, 0.25, 0.2, 0.1]) { const n = Math.ceil(v / (m * p)); if (n >= 3 && n <= 6) return m * p; } return p; }
const short = n => n >= 1e6 ? '£' + (n / 1e6 >= 10 ? Math.round(n / 1e6) : +(n / 1e6).toFixed(1)) + 'm' : n >= 1e3 ? '£' + Math.round(n / 1e3) + 'k' : '£' + n;
const share = v => v < 0.001 ? '<0.1%' : (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%';

/* redraw when the figure's width really changes */
function responsive(fig, draw) {
  let w = 0; const run = () => { const nw = Math.round(fig.clientWidth); if (nw < 40 || Math.abs(nw - w) < 6) return; w = nw; draw(nw); };
  run(); if ('ResizeObserver' in window) new ResizeObserver(run).observe(fig); else addEventListener('resize', run);
  return () => { w = 0; run(); };
}
function hatch(defs, id, colour, surface) {
  const p = svg('pattern', { id, patternUnits: 'userSpaceOnUse', width: 6, height: 6, patternTransform: 'rotate(45)' }, defs);
  svg('rect', { width: 6, height: 6, fill: colour }, p); svg('rect', { width: 2.4, height: 6, fill: surface }, p); return 'url(#' + id + ')';
}
/* a column or bar segment with its data end rounded: dir 'up' or 'right' */
function roundBar(x, y, w, h, r, dir) {
  r = Math.min(r, w / 2, h / 2); if (r <= 0.2) return `M${x} ${y}h${w}v${h}h${-w}Z`;
  return dir === 'up' ? `M${x} ${y + h}V${y + r}a${r} ${r} 0 0 1 ${r} ${-r}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h}Z`
    : `M${x} ${y}h${w - r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}H${x}Z`;
}
function legend(items) { return el('ul.legend', null, items.map(i => el('li' + (i.direct ? '.direct' : '') + (i.cls ? '.' + i.cls : ''), { style: '--c:' + i.c }, el('i'), i.name))); }
function grow(node, axis, delay = 0) {
  if (STILL) return; node.style.transformBox = 'fill-box'; node.style.transformOrigin = axis === 'x' ? 'left center' : 'center bottom';
  node.style.transform = axis === 'x' ? 'scaleX(0)' : 'scaleY(0)';
  requestAnimationFrame(() => requestAnimationFrame(() => { node.style.transition = 'transform 1s cubic-bezier(.22,.61,.36,1) ' + delay + 's'; node.style.transform = 'none'; }));
}

/* ───────── 03 · revenue by year ───────── */
function revenue(DATA) {
  const fig = $('#revChart'); if (!fig) return; const tip = tipFor(fig); let seen = false, redraw;
  const order = ['On Site Servicing', 'eBay', 'Temu'];
  fig.before(legend(order.slice().sort((a, b) => ['eBay', 'Temu', 'On Site Servicing'].indexOf(a) - ['eBay', 'Temu', 'On Site Servicing'].indexOf(b)).map(n => ({ name: n, c: PAPER[n] }))));
  redraw = responsive(fig, w => {
    $$('svg', fig).forEach(s => s.remove());
    const small = w < 520, L = small ? 50 : 76, R = small ? 74 : 112, T = 8, rowH = small ? 54 : 66, bar = 26, B = 30, H = T + rowH * 3 + B;
    const max = 1250000, x = v => L + (w - L - R) * v / max;
    const s = svg('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'presentation' }); fig.prepend(s);
    (small ? [0, 500000, 1000000] : [0, 250000, 500000, 750000, 1000000]).forEach(v => {
      svg('line', { x1: x(v), x2: x(v), y1: T, y2: H - B, class: v ? 'ax' : 'ax ax0' }, s);
      svg('text', { x: x(v), y: H - 9, 'text-anchor': 'middle' }, s, v ? short(v) : '£0');
    });
    DATA.revenue.forEach((r, i) => {
      const y = T + rowH * i + (rowH - bar) / 2; const g = svg('g', { tabindex: 0, role: 'img', class: 'row', 'aria-label': r.year + ': total ' + fmtGBP(r.value) + '. ' + r.breakdown.map(b => b[0] + ' ' + fmtGBP(b[1])).join(', ') + '.' }, s);
      svg('text', { x: 0, y: y + bar / 2 + 8, class: 'yr' }, g, r.year);
      const bars = svg('g', null, g); let acc = 0; const parts = order.map(n => r.breakdown.find(b => b[0] === n)).filter(Boolean);
      parts.forEach((b, k) => { const x0 = x(acc), x1 = x(acc + b[1]); acc += b[1]; const last = k === parts.length - 1; const wd = Math.max(1, x1 - x0 - (last ? 0 : 2));
        svg('path', { d: roundBar(x0, y, wd, bar, last ? 4 : 0, 'right'), fill: PAPER[b[0]] }, bars); });
      const val = svg('text', { x: x(r.value) + 10, y: y + bar / 2 + 8, class: 'val' }, g, fmtCompact(r.value));
      svg('rect', { x: L, y: T + rowH * i, width: w - L, height: rowH, fill: 'transparent' }, g);
      const rows = r.breakdown.map(b => [b[0], fmtGBP(b[1]) + ' · ' + share(b[1] / r.value), PAPER[b[0]]]);
      const show = e => { const bx = fig.getBoundingClientRect(); tip.show(e.clientX || bx.left + x(r.value / 2), e.clientY || bx.top + y, r.year + ' · ' + fmtGBP(r.value), rows); };
      g.addEventListener('pointermove', show); g.addEventListener('pointerleave', tip.hide); g.addEventListener('focus', show); g.addEventListener('blur', tip.hide);
      if (!seen) { grow(bars, 'x', i * 0.16); if (!STILL) { val.style.opacity = 0; val.style.transition = 'opacity .5s ' + (0.8 + i * 0.16) + 's'; requestAnimationFrame(() => requestAnimationFrame(() => { val.style.opacity = 1; })); } }
    });
    seen = true;
  });
  /* hold the entrance until the chart is on screen */
  if (!STILL) { seen = true; onSeen(fig, () => { seen = false; redraw(); }); }
}

/* ───────── 04 · three nested markets, one year at a time ───────── */
function market(DATA) {
  const box = $('#mkRows'), yearsBox = $('#mkYears'); if (!box) return; const M = DATA.market;
  const MK = [
    { name: 'Overall ecommerce', sub: 'All UK online retail of physical goods, £132bn in 2026', label: 'UK online retail (est.)', barMax: 0.05, maxYear: 2031, size: y => 132e9 * Math.pow(1.07, y - 2026),
      note: 'ONS internet retail sales: about £132bn of physical products bought online in 2026, nearly 29% of all UK retail spending. Fire safety ecommerce (£380m) is around 0.3% of that, roughly £1 in every £347 spent online.' },
    { name: 'Fire safety market', sub: 'Products and services, every channel, £6bn in 2026', label: 'UK market size (est.)', barMax: 1.2, suffix: y => y >= 2030 ? ' (2030 est.)' : '',
      size: y => y <= M.nowYear ? M.now : y >= 2030 ? M.y2030 : M.now + (M.y2030 - M.now) * ((y - M.nowYear) / (2030 - M.nowYear)),
      note: 'Market size interpolated to the deck’s £6bn → £8.5bn (2030) projection; beyond 2030 we hold the 2030 estimate, the real number will be bigger.' },
    { name: 'Fire & safety ecommerce', sub: 'The slice of that market already bought online, £380m in 2026', label: 'Online market size (est.)', barMax: 6, maxYear: 2031, size: y => 380e6 * Math.pow(1.08, y - 2026),
      note: 'Management estimate: the £1.81bn equipment market at manufacturer prices, uplifted to end customer value, at a 16% online share. Grown 8% a year, ahead of the 5% market but below general retail.' }
  ];
  const rows = MK.map(m => {
    const size = el('b'), sh = el('b'), fill = el('i'), bar = el('div.mk-bar', { role: 'img' }, fill);
    const row = el('div.mk-row', null, el('div', null, el('h3', { text: m.name }), el('p', { text: m.sub })), el('p.v', null, m.label, size), el('p.v.share', null, 'Our share of the market', sh), bar,
      el('p.scale', { 'aria-hidden': 'true' }, el('span', { text: '0%' }), el('span', { text: 'bar ends at ' + m.barMax + '%' })), el('p.fine', { text: m.note }));
    box.append(row); return { m, size, sh, fill, bar };
  });
  const T = DATA.trajectory; let cur = T.findIndex(t => t.year === 2025);
  const btns = T.map((t, i) => { const b = el('button', { type: 'button', 'aria-pressed': 'false', text: t.year, onclick: () => set(i) }); yearsBox.append(b); return b; });
  function set(i) {
    cur = i; const d = T[i]; btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    $('#mkKind').textContent = d.kind === 'actual' ? '(actual)' : '(target)'; $('#mkRev').textContent = fmtCompact(d.value) + (d.year === 2025 ? '+' : '');
    rows.forEach(r => {
      if (r.m.maxYear && d.year > r.m.maxYear) { r.size.textContent = '—'; r.sh.textContent = '—'; r.fill.style.setProperty('--w', 0); r.bar.setAttribute('aria-label', r.m.name + ': this forecast stops at ' + r.m.maxYear); r.size.title = r.sh.title = 'This forecast stops at ' + r.m.maxYear; return; }
      const mk = r.m.size(d.year), p = d.value / mk * 100; r.size.title = r.sh.title = '';
      r.size.textContent = fmtCompact(mk) + (r.m.suffix ? r.m.suffix(d.year) : ''); r.sh.textContent = p < 0.1 ? p.toFixed(3) + '%' : p.toFixed(2) + '%';
      r.fill.style.setProperty('--w', Math.min(100, p / r.m.barMax * 100).toFixed(2)); r.bar.setAttribute('aria-label', r.m.name + ' in ' + d.year + ': share ' + r.sh.textContent);
    });
  }
  set(cur);
  /* the first time it is seen, run the years forward once so the climb is plain to see */
  if (!STILL) onSeen($('#mk'), () => { let i = 0; set(0); const step = () => { if (i >= cur0) return; i++; set(i); setTimeout(step, 420); }; const cur0 = T.findIndex(t => t.year === 2025); setTimeout(step, 500); });
}

/* ───────── 06 · the channel plan ───────── */
function donut(fig, parts, centre, sub, onHover) {
  fig.replaceChildren(); const s = svg('svg', { viewBox: '0 0 200 200', role: 'presentation' }, fig); const defs = svg('defs', null, s);
  const total = parts.reduce((a, p) => a + p.v, 0), R = 94, r = 64, gap = 0.014; let a = -Math.PI / 2; const segs = [];
  parts.forEach(p => {
    const sw = p.v / total * Math.PI * 2; if (sw <= 0) { segs.push(null); return; }
    const a0 = a + Math.min(gap, sw / 4), a1 = a + sw - Math.min(gap, sw / 4); a += sw; const large = a1 - a0 > Math.PI ? 1 : 0;
    const pt = (rad, ang) => (100 + rad * Math.cos(ang)).toFixed(2) + ' ' + (100 + rad * Math.sin(ang)).toFixed(2);
    const d = `M${pt(R, a0)}A${R} ${R} 0 ${large} 1 ${pt(R, a1)}L${pt(r, a1)}A${r} ${r} 0 ${large} 0 ${pt(r, a0)}Z`;
    const fill = p.direct ? hatch(defs, 'dh' + (++uid), p.c, DARK_SURFACE) : p.c;
    const path = svg('path', { d, fill, class: 'seg' }, s); segs.push(path);
    path.addEventListener('pointerenter', () => onHover && onHover(p.name)); path.addEventListener('pointerleave', () => onHover && onHover(null));
  });
  svg('text', { x: 100, y: 102, 'text-anchor': 'middle', class: 'dn-big' }, s, centre); svg('text', { x: 100, y: 122, 'text-anchor': 'middle', class: 'dn-sub' }, s, sub);
  return { hi(name) { segs.forEach((g, i) => { if (g) g.style.opacity = !name || parts[i].name === name ? 1 : 0.25; }); } };
}
function partRows(list, parts, total, onHover) {
  list.replaceChildren(...parts.map(p => { const li = el('li' + (p.direct ? '.direct' : ''), { style: '--c:' + p.c, 'data-n': p.name }, el('i'), el('em', { text: p.name }), el('b', { text: fmtCompact(p.v) }), el('span', { text: share(p.v / total) }));
    li.addEventListener('pointerenter', () => onHover(p.name)); li.addEventListener('pointerleave', () => onHover(null)); return li; }));
  return { hi(name) { list.classList.toggle('dim', !!name); $$('li', list).forEach(li => li.classList.toggle('hi', li.dataset.n === name)); } };
}

function plan(DATA) {
  const fig = $('#planChart'); if (!fig) return; const P = DATA.projection, tip = tipFor(fig);
  const series = CHANNELS.map(c => ({ ...c, values: P.channels.find(x => x.name === c.name).values }));
  const st = { mode: 'stacked', on: new Set(series.map(s => s.name)), year: 2030 }; let first = true;
  const totals = P.years.map((y, i) => series.reduce((a, s) => a + s.values[i], 0));
  const cagr = Math.pow(totals[totals.length - 1] / totals[0], 1 / (P.years.length - 1)) - 1;
  $('#cagrChip').textContent = P.years[0] + ' → ' + P.years[P.years.length - 1] + ' CAGR ≈ ' + Math.round(cagr * 100) + '%';

  const chips = $('#planChips');
  series.forEach(s => chips.append(el('button' + (s.direct ? '.direct' : ''), { type: 'button', 'aria-pressed': 'true', style: '--c:' + s.c, onclick: e => {
    const b = e.currentTarget; if (st.on.has(s.name)) { if (st.on.size === 1) return; st.on.delete(s.name); } else st.on.add(s.name);
    b.setAttribute('aria-pressed', String(st.on.has(s.name))); draw(); detail(); } }, el('i'), s.name)));
  $$('#planMode button').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; $$('#planMode button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); first = true; draw(); }));

  let W = 0;
  function draw() {
    const w = W; if (!w) return; $$('svg', fig).forEach(s => s.remove());
    const small = w < 520, L = 46, R = 6, T = 26, B = 34, H = Math.round(clamp(w * 0.56, 290, 440)), ih = H - T - B, band = (w - L - R) / P.years.length;
    const act = series.filter(s => st.on.has(s.name));
    const s = svg('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'presentation' }); fig.prepend(s); const defs = svg('defs', null, s);
    const fills = Object.fromEntries(act.map(a => [a.name, a.direct ? hatch(defs, 'ph' + (++uid), a.c, DARK_SURFACE) : a.c]));
    const tot = P.years.map((y, i) => act.reduce((a, c) => a + c.values[i], 0));
    const top = st.mode === 'stacked' ? Math.max(...tot) : Math.max(...act.flatMap(a => a.values)), step = st.mode === 'share' ? 0.25 : axisStep(top), nT = st.mode === 'share' ? 4 : Math.ceil(top / step), max = step * nT;
    const y = v => T + ih - ih * v / max;
    for (let k = 0; k <= nT; k++) { const v = step * k; svg('line', { x1: L, x2: w - R, y1: y(v), y2: y(v), class: k ? 'ax' : 'ax ax0' }, s); svg('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, s, st.mode === 'share' ? Math.round(v * 100) + '%' : v ? short(v) : '£0'); }
    P.years.forEach((yr, i) => {
      const cx = L + band * i + band / 2; const g = svg('g', { class: 'col' + (yr === st.year ? ' sel' : ''), tabindex: 0, role: 'button', 'aria-pressed': String(yr === st.year), 'aria-label': yr + ': ' + fmtGBP(tot[i]) + ' across the channels shown. Show the breakdown.' }, s);
      svg('rect', { x: L + band * i + 2, y: T - 14, width: band - 4, height: ih + 14 + B - 4, rx: 5, class: 'colbg' }, g);
      const bars = svg('g', null, g);
      if (st.mode === 'grouped') {
        const bw = clamp((band * 0.84 - (act.length - 1) * 2) / act.length, 2, 12), gw = act.length * bw + (act.length - 1) * 2;
        act.forEach((a, k) => { const v = a.values[i], h = Math.max(1, ih * v / max); svg('path', { d: roundBar(cx - gw / 2 + k * (bw + 2), y(v), bw, h, Math.min(4, bw / 2), 'up'), fill: fills[a.name] }, bars); });
      } else {
        const bw = Math.min(28, band * 0.5); let acc = 0; const div = st.mode === 'share' ? tot[i] : 1;
        act.forEach((a, k) => { const v = a.values[i] / div, y1 = y(acc), y0 = y(acc + v); acc += v; const last = k === act.length - 1; const h = Math.max(0.6, y1 - y0 - (last ? 0 : 2));
          svg('path', { d: roundBar(cx - bw / 2, y1 - h - (last ? 0 : 0), bw, h, last ? 4 : 0, 'up'), fill: fills[a.name] }, bars); });
        if (st.mode === 'stacked') svg('text', { x: cx, y: y(tot[i]) - 8, 'text-anchor': 'middle', class: 'cap' }, g, small ? short(tot[i]) : fmtCompact(tot[i]));
      }
      svg('text', { x: cx, y: H - 12, 'text-anchor': 'middle', class: 'xl' }, g, yr);
      if (first) grow(bars, 'y', i * 0.07);
      const rows = () => act.map(a => [a.name, fmtCompact(a.values[i]) + ' · ' + share(a.values[i] / tot[i]), a.c]).reverse();
      const show = e => { const bx = fig.getBoundingClientRect(); tip.show(e.clientX || bx.left + cx, e.clientY || bx.top + T + 40, yr + ' · ' + fmtCompact(tot[i]), rows()); };
      g.addEventListener('pointermove', show); g.addEventListener('pointerleave', tip.hide); g.addEventListener('focus', show); g.addEventListener('blur', tip.hide);
      const pick = () => { st.year = yr; $$('.col', s).forEach(c => { const on = c === g; c.classList.toggle('sel', on); c.setAttribute('aria-pressed', String(on)); }); detail(); };
      g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    first = false;
  }
  let dn = null, rw = null;
  function detail() {
    const i = P.years.indexOf(st.year), parts = series.filter(s => st.on.has(s.name)).map(s => ({ name: s.name, c: s.c, direct: s.direct, v: s.values[i] })), total = parts.reduce((a, p) => a + p.v, 0);
    $('#ydYear').textContent = st.year; $('#ydTotal').textContent = fmtCompact(total) + ' target';
    const hov = n => { dn.hi(n); rw.hi(n); };
    dn = donut($('#ydDonut'), parts, fmtCompact(total), String(st.year), hov); rw = partRows($('#ydRows'), parts, total, hov);
  }
  responsive(fig, w => { W = w; draw(); }); detail();
  if (!STILL) onSeen(fig, () => { first = true; draw(); });

  /* the table view of the same figures */
  const tb = $('#matrixTable');
  tb.append(el('caption.vh', { text: 'Projected revenue by channel, 2026 to 2031' }), el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Channel' }), P.years.map(y => el('th', { scope: 'col', text: y })))),
    el('tbody', null, series.map(s => el('tr', null, el('th', { scope: 'row', style: '--c:' + s.c }, el('i' + (s.direct ? '.direct' : '')), s.name + (s.direct ? ' (direct)' : '')), s.values.map(v => el('td', { text: fmtGBP(v) }))))),
    el('tfoot', null, el('tr', null, el('th', { scope: 'row', text: 'Total' }), totals.map(v => el('td', { text: fmtGBP(v) })))));
}

/* ───────── 07 · the line to 2036, the 2036 mix, how the mix shifts ───────── */
function trajectory(DATA) {
  const fig = $('#trajChart'); if (!fig) return; const T = DATA.trajectory, tip = tipFor(fig); let scale = 'linear', W = 0, first = true;
  fig.before(el('ul.legend', null, el('li.ln', null, el('i'), 'Actual'), el('li.ln.dash', null, el('i'), 'Target')));
  $$('#trajScale button').forEach(b => b.addEventListener('click', () => { scale = b.dataset.scale; $$('#trajScale button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); first = true; draw(); }));
  function draw() {
    const w = W; if (!w) return; $$('svg', fig).forEach(s => s.remove());
    const small = w < 620, L = 54, R = small ? 16 : 30, Tm = 34, B = 36, H = Math.round(clamp(w * 0.5, 300, 470)), ih = H - Tm - B, iw = w - L - R;
    const x = yr => L + iw * (yr - 2023) / 13;
    const log = scale === 'log', lo = Math.log10(20000), hi = Math.log10(200e6);
    const y = v => log ? Tm + ih - ih * (Math.log10(v) - lo) / (hi - lo) : Tm + ih - ih * v / 110e6;
    const s = svg('svg', { viewBox: `0 0 ${w} ${H}`, width: w, height: H, role: 'presentation' }); fig.prepend(s);
    (log ? [100e3, 1e6, 10e6, 100e6] : [0, 25e6, 50e6, 75e6, 100e6]).forEach(v => { const yy = log || v ? y(v) : Tm + ih; svg('line', { x1: L, x2: w - R, y1: yy, y2: yy, class: v ? 'ax' : 'ax ax0' }, s); svg('text', { x: L - 8, y: yy + 4, 'text-anchor': 'end' }, s, v ? short(v) : '£0'); });
    if (log) svg('line', { x1: L, x2: w - R, y1: Tm + ih, y2: Tm + ih, class: 'ax ax0' }, s);
    (small ? [2023, 2026, 2031, 2036] : [2023, 2025, 2027, 2029, 2031, 2036]).forEach(yr => svg('text', { x: x(yr), y: H - 12, 'text-anchor': 'middle', class: 'xl' }, s, yr));
    const pts = T.map(t => ({ ...t, px: x(t.year), py: y(t.value) }));
    const act = pts.filter(p => p.kind === 'actual'), tar = [act[act.length - 1], ...pts.filter(p => p.kind === 'target')];
    const path = a => a.map((p, i) => (i ? 'L' : 'M') + p.px.toFixed(1) + ' ' + p.py.toFixed(1)).join('');
    svg('path', { d: path(pts) + `L${pts[pts.length - 1].px} ${Tm + ih}L${pts[0].px} ${Tm + ih}Z`, class: 'wash' }, s);
    const l2 = svg('path', { d: path(tar), class: 'ln dash' }, s), l1 = svg('path', { d: path(act), class: 'ln' }, s);
    if (first && !STILL) [l1, l2].forEach((l, i) => { const len = l.getTotalLength(); if (i === 0) { l.style.strokeDasharray = len; l.style.strokeDashoffset = len; requestAnimationFrame(() => requestAnimationFrame(() => { l.style.transition = 'stroke-dashoffset .7s ease-out'; l.style.strokeDashoffset = 0; })); }
      else { l.style.clipPath = 'inset(0 100% 0 0)'; requestAnimationFrame(() => requestAnimationFrame(() => { l.style.transition = 'clip-path 1.5s cubic-bezier(.22,.61,.36,1) .5s'; l.style.clipPath = 'inset(-20px -20px -20px -20px)'; })); } });
    first = false;
    const cross = svg('line', { y1: Tm, y2: Tm + ih, class: 'cross' }, s);
    /* labels: the value for the points that carry the story, placed so none sits on another */
    const want = small ? [2025, 2031, 2036] : [2023, 2024, 2025, 2030, 2031, 2036]; const placed = [];
    pts.filter(p => want.includes(p.year)).sort((a, b) => b.year - a.year).forEach(p => {
      const txt = fmtCompact(p.value) + (!small && p.note && !/^£/.test(p.note) ? '  ' + p.note : !small && /·/.test(p.note) ? '  ' + p.note.split('·')[1].trim() : '');
      const tw = txt.length * 6.4 + 8; let lx = clamp(p.px - tw / 2, L + 2, w - R - tw + 16), ly = p.py - 16;
      for (let k = 0; k < 12 && placed.some(q => lx < q.x + q.w && lx + tw > q.x && Math.abs(ly - q.y) < 16); k++) ly -= 17;
      placed.push({ x: lx, y: ly, w: tw });
      if (p.py - ly > 22) svg('line', { x1: p.px, x2: p.px, y1: p.py - 8, y2: ly + 5, class: 'lead' }, s);
      svg('text', { x: lx, y: ly, class: 'note' }, s, txt);
    });
    pts.forEach(p => {
      const g = svg('g', { tabindex: 0, role: 'img', 'aria-label': p.year + ': ' + fmtGBP(p.value) + ' ' + p.kind + (p.note ? '. ' + p.note : '') }, s);
      svg('circle', { cx: p.px, cy: p.py, r: 5, class: 'pt ' + p.kind }, g); svg('circle', { cx: p.px, cy: p.py, r: 16, fill: 'transparent' }, g);
      g.addEventListener('focus', () => at(p)); g.addEventListener('blur', off);
    });
    const hit = svg('rect', { x: L - 10, y: Tm - 10, width: iw + 20, height: ih + 20, fill: 'transparent' }, s);
    function at(p, e) { cross.setAttribute('x1', p.px); cross.setAttribute('x2', p.px); cross.style.opacity = 1; const bx = fig.getBoundingClientRect();
      tip.show(e ? e.clientX : bx.left + p.px, e ? e.clientY : bx.top + p.py, p.year + ' · ' + fmtCompact(p.value), [[p.kind === 'actual' ? 'Actual' : 'Target', fmtGBP(p.value), PINK], ...(p.note ? [[p.note, '']] : [])]); }
    function off() { cross.style.opacity = 0; tip.hide(); }
    hit.addEventListener('pointermove', e => { const bx = s.getBoundingClientRect(), mx = (e.clientX - bx.left) * (w / bx.width); let best = pts[0]; pts.forEach(p => { if (Math.abs(p.px - mx) < Math.abs(best.px - mx)) best = p; }); at(best, e); });
    hit.addEventListener('pointerleave', off);
  }
  responsive(fig, w => { W = w; draw(); });
  if (!STILL) onSeen(fig, () => { first = true; draw(); });
}

function mix2036(DATA) {
  const fig = $('#mixDonut'); if (!fig) return;
  const parts = CHANNELS.map(c => ({ name: c.name, c: c.c, direct: c.direct, v: DATA.projection2036.channels.find(x => x.name === c.name).value })), total = parts.reduce((a, p) => a + p.v, 0);
  let dn, rw; const hov = n => { dn.hi(n); rw.hi(n); };
  dn = donut(fig, parts, fmtCompact(total), '2036', hov); rw = partRows($('#mixLegend'), parts, total, hov);

  const box = $('#shiftRows'), panel = box.closest('.panel'); panel.style.position = 'relative'; const tip = tipFor(panel), P = DATA.projection;
  const yearParts = yr => yr === 2036 ? parts : CHANNELS.map(c => ({ name: c.name, c: c.c, direct: c.direct, v: P.channels.find(x => x.name === c.name).values[P.years.indexOf(yr)] }));
  [2026, 2030, 2036].forEach(yr => {
    const ps = yearParts(yr), tot = ps.reduce((a, p) => a + p.v, 0);
    const bar = el('div.bar', { role: 'img', 'aria-label': yr + ' share of revenue: ' + ps.map(p => p.name + ' ' + share(p.v / tot)).join(', ') },
      ps.map(p => { const f = p.v / tot; const seg = el('i' + (p.direct ? '.direct' : ''), { style: '--c:' + p.c + ';width:' + (f * 100).toFixed(3) + '%' }, f >= 0.085 && !p.direct ? el('span', { text: Math.round(f * 100) + '%' }) : null);
        seg.addEventListener('pointermove', e => tip.show(e.clientX, e.clientY, yr + ' · ' + p.name, [['Revenue', fmtCompact(p.v), p.c], ['Share', share(f), p.c]])); seg.addEventListener('pointerleave', tip.hide); return seg; }));
    box.append(el('div.row', null, el('b', { text: yr }), bar));
  });
  box.after(legend(CHANNELS));
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
}

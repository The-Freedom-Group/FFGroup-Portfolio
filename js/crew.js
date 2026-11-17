/* The team: the staff chart. Three ways to look at it (a spider diagram with the founder at the hub and a spoke for
   every division, a matrix by division, and by employment type), a filter by division, anyone in full on a press, and
   the roles the group is opening next. On a phone the spider cannot fit, so the same people are laid out the way the
   earlier portfolio laid them out there: a hub of divisions over a list that opens. Portraits are the team's own;
   a partner shows its logo where the page holds one; anyone else gets their initials in a ring. */
import { $, $$, el, svg, clamp, counters, onSeen, STILL } from './kit.js';

/* portraits in assets/people: file, how far down the picture the face sits (%), and how far to close in for a round one */
const FACES = {
  'Tom Letcher': ['tom', 43], 'Jojo Williams': ['jojo', 42], 'Dylan Griffiths': ['dylan', 40], 'Harrison Duckworth': ['harrison', 38],
  'Billy Kelly': ['billy', 36, 1.5], 'Elliot Saxon': ['elliot', 40], 'Josh Okolanji': ['josh', 33], 'Bill Nebo': ['bill', 36], 'Gabriel Mroczek': ['gabriel', 40]
};
/* a partner's own logo, shown in place of initials: file in assets/people and the ground it was drawn for */
const LOGOS = { 'Ecommerce Intelligence': ['ecommerce-intelligence.webp', 'light'], 'Pivotal Design Agency': ['pivotal.png', 'dark'] };

/* employment types, in the order the "By employment type" view lists them, each with its colour */
const TYPES = ['Full time', 'Part time', 'T Level Students', 'Subcontractor', 'Partner'];
const TYPE_COLOURS = { 'Full time': '#ff3d9a', 'Part time': '#38a9ff', 'T Level Students': '#2fe0a0', 'Subcontractor': '#94a3b8', 'Partner': '#fbbf24' };
/* each type as a small mark that rides on a person's role line, so the type needs no line of its own: round for the
   team (filled full time, half part time, open for T Level students), square for those outside it (filled
   subcontractor, open partner). Shapes, not colours, since the colours on the chart already mean the divisions. */
const RING_LINE = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4 };
const TYPE_MARK = {
  'Full time': [{ cx: 5, cy: 5, r: 4, fill: 'currentColor' }],
  'Part time': [{ cx: 5, cy: 5, r: 3.5, ...RING_LINE }, { d: 'M5 1.5a3.5 3.5 0 0 0 0 7z', fill: 'currentColor' }],
  'T Level Students': [{ cx: 5, cy: 5, r: 3.5, ...RING_LINE }],
  'Subcontractor': [{ x: 1.3, y: 1.3, width: 7.4, height: 7.4, rx: 1, fill: 'currentColor' }],
  'Partner': [{ x: 1.8, y: 1.8, width: 6.4, height: 6.4, rx: .8, ...RING_LINE }]
};
/* the divisions in order round the hub, from the top left down and back up the right. The split between the two sides
   is wherever it leaves them most nearly level, so the chart stays balanced as people join. */
const RING = ['finance', 'core', 'web', 'ecom', 'it', 'partners'];

const initials = name => name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const glyph = (box, shapes, cls) => { const s = svg('svg', { viewBox: '0 0 ' + box + ' ' + box, 'aria-hidden': 'true', class: cls || null }); shapes.forEach(a => svg(a.d ? 'path' : a.r ? 'circle' : 'rect', a, s)); return s; };
const LINE = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const ICON = {
  people: () => glyph(20, [{ cx: 6.2, cy: 6.8, r: 2.5, fill: 'currentColor' }, { cx: 13.8, cy: 6.8, r: 2.5, fill: 'currentColor' }, { d: 'M1.8 15.2c0-2.4 2-4.3 4.4-4.3s4.4 1.9 4.4 4.3zM9.4 15.2c0-2.4 2-4.3 4.4-4.3s4.4 1.9 4.4 4.3z', fill: 'currentColor' }]),
  exec: () => glyph(24, [{ d: 'M3 8l4 3 5-6 5 6 4-3-2 11H5z', ...LINE }]),
  admin: () => glyph(24, [{ x: 4, y: 5, width: 16, height: 15, rx: 2.5, ...LINE }, { d: 'M8 3v4M16 3v4M8 12h8M8 16h5', ...LINE }]),
  logistics: () => glyph(24, [{ d: 'M2 6h12v11H2zM14 10h4l4 4v3h-8z', ...LINE }, { cx: 6.5, cy: 18.5, r: 1.8, ...LINE }, { cx: 17.5, cy: 18.5, r: 1.8, ...LINE }])
};
const mark = type => TYPE_MARK[type] ? glyph(10, TYPE_MARK[type], 'em-mark') : null;

export function initCrew(DATA) {
  const body = $('#crewBody'); if (!body) return; const T = DATA.team, sec = $('#crew');
  /* everyone in one list; each keeps their division's key, name and colour, and their place in the list */
  const flat = []; T.divisions.forEach(d => d.people.forEach(p => flat.push({ ...p, div: d.key, divLabel: d.label, c: d.color, pi: flat.length })));
  const root = flat.find(p => p.root) || flat[0];
  const st = { view: 'spider', filter: 'all' };
  const touch = matchMedia('(hover: none)').matches, act = touch ? 'Tap' : 'Click';
  const plain = document.documentElement.classList.contains('no-gl');   // no pointer of the page's own, so no label beside it

  /* ───────── headcount, the pipeline count, the filter chips ───────── */
  const openRoles = T.pipeline.flatMap(g => g.roles).reduce((s, r) => s + (parseInt(r.tag, 10) || 1), 0);
  const count = t => flat.filter(p => p.type === t).length;
  $('#heads').append(...[[flat.length, 'people & partners in the group'], [count('Full time'), 'full time employees'], [count('T Level Students'), 'T Level students on the team'], [openRoles, 'roles opening in the pipeline']]
    .map(([n, l]) => el('li', null, el('b', { 'data-count': n, text: n }), el('span', { text: l }))));
  counters($('#heads'));
  $('#pipeCount').textContent = openRoles + ' open';

  const chips = $('#crewChips');
  chips.append(...[{ key: 'all', label: 'All divisions', c: 'var(--fg)', n: flat.length }, ...T.divisions.map(d => ({ key: d.key, label: d.label, c: d.color, n: d.people.length }))]
    .map(c => el('button', { type: 'button', 'data-f': c.key, 'aria-pressed': String(c.key === 'all'), style: '--c:' + c.c, onclick: () => setFilter(c.key) }, el('i'), c.label, el('em', { text: c.n }))));
  /* a chip chooses its division; a coloured node (or a phone's division circle) pressed twice gives everyone back */
  function setFilter(key) { st.filter = key; $$('button', chips).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === key))); applyFilter(); }
  const toggleFilter = key => setFilter(st.filter === key ? 'all' : key);

  /* ───────── faces ───────── */
  /* a round face, a logo or initials, in a ring of the division's colour */
  function face(p) {
    const f = FACES[p.name], l = LOGOS[p.name], a = el('span.face' + (l ? '.logo.' + l[1] : ''), { 'aria-hidden': 'true' });
    if (f) a.append(el('img', { src: 'assets/people/' + f[0] + '.jpg', alt: '', loading: 'lazy', decoding: 'async', style: `width:${(f[2] || 2.25) * 100}%;transform:translate(-50%,-${f[1]}%)` }));
    else if (l) a.append(el('img', { src: 'assets/people/' + l[0], alt: '', loading: 'lazy', decoding: 'async' }));
    else a.textContent = initials(p.name);
    return a;
  }
  /* the same person at full length, for the detail */
  function portrait(p) {
    const f = FACES[p.name], l = LOGOS[p.name];
    return el('span.av' + (l ? '.logo.' + l[1] : f ? '' : '.none'), { 'aria-hidden': 'true' }, f ? el('img', { src: 'assets/people/' + f[0] + '.jpg', alt: '', width: 525, height: 700, decoding: 'async' }) : l ? el('img', { src: 'assets/people/' + l[0], alt: '', decoding: 'async' }) : initials(p.name));
  }
  const tagPill = p => p.tag ? el('span.pill' + (p.tagKind === 'win' ? '.win' : ''), { text: p.tag }) : null;
  const typePill = p => el('span.pill.acc', null, mark(p.type), p.type);
  /* the chart shows a name and a role; whoever cannot see it hears the type and the note as well */
  const label = p => `${p.name}, ${p.role}, ${p.type}` + (p.tag ? `, ${p.tag}` : '');
  /* the key to the marks: the types on the team, and a job secured (its words are the first part of that note) */
  const winTag = (flat.find(p => p.tagKind === 'win') || {}).tag;
  const keyItems = () => [...TYPES.filter(t => flat.some(p => p.type === t)).map(t => el('span.k', null, mark(t), t)),
    winTag ? el('span.k.k-win', null, el('i', { 'aria-hidden': 'true', text: '✓' }), winTag.split(' · ')[0]) : null];
  const winMark = p => p.tagKind === 'win' ? el('i.ok', { 'aria-hidden': 'true', text: '✓' }) : null;

  /* ───────── spider diagram ─────────
     The founder at the hub, one coloured node on its rim for each division. Each node throws a straight spoke out to its
     division's rail, and the rail a short stub to each person: the bracket of the original slide. Down each side the
     divisions stand one under another, each under its own label (its colour, its name, how many) with clear air
     between them, so every bracket reads on its own; and since every spoke runs straight out from the middle of the
     hub to the middle of its rail, no two can cross. A person is two lines, name and role: the employment type is the
     small mark on the role line (the key is above the chart), and the rest is in their detail. The earlier portfolio
     drew this in a 1300 by 900 box and stretched it to fit; here the geometry is worked out in real pixels for the
     width on screen, so every line is a crisp hairline and the type keeps its own size. Where the screen is tall
     enough the whole chart fits its height; on a short one the rows keep their spacing and the chart runs taller than
     the screen (this part is not pinned). */
  function sides() {
    const ring = RING.filter(k => T.divisions.some(d => d.key === k)).concat(T.divisions.map(d => d.key).filter(k => !RING.includes(k) && k !== root.div));
    /* a division weighs its people and one more for its label and the air above it; the split between the two sides is
       wherever it leaves them most nearly level, so the chart stays balanced as people join */
    const n = k => flat.filter(p => p.div === k && !p.root).length + 1, tot = ring.reduce((s, k) => s + n(k), 0);
    let best = 1, gap = Infinity, run = 0;
    ring.forEach((k, i) => { run += n(k); const g = Math.abs(tot - 2 * run); if (i < ring.length - 1 && g < gap) { gap = g; best = i + 1; } });
    return { left: ring.slice(0, best), right: ring.slice(best).reverse() };
  }
  const SS = ['left', 'right'], per = key => flat.filter(p => p.div === key && !p.root);
  const many = (SIDES, s) => SIDES[s].reduce((a, key) => a + per(key).length, 0);
  /* k is how much bigger than the old 1300 box the diagram is drawn: on a wide screen the faces, the type, the hub and
     the spacing all grow with it, so the chart fills the screen it is given, but never so far that a chart which would
     fit the screen's height at the old size no longer does */
  function spiderScale(W, room) {
    const SIDES = sides(), n = s => SIDES[s].length;
    const tightH = Math.max(...SS.map(s => 32 + n(s) * 22 + Math.max(0, n(s) - 1) * 26 + many(SIDES, s) * 54)) + 6;
    return clamp(Math.min(W / 1300, room / tightH), 1, 1.45);
  }
  /* lw: the widest label on each side at this size (measured by layoutSpider; a fair guess before then) */
  function spiderGeometry(W, room, lw = {}) {
    const SIDES = sides(), groups = s => SIDES[s].length, n = s => many(SIDES, s);
    const k = spiderScale(W, room), avR = Math.round(19 * k), gap = Math.round(12 * k);
    const headH = Math.round(22 * k), airG = Math.round(26 * k), padY = Math.round(16 * k);
    const labels = s => groups(s) * headH + Math.max(0, groups(s) - 1) * airG;
    /* the rows are spaced to fill the screen's height where that leaves them room enough, so the whole chart is seen at
       once; where it cannot, they take a comfortable spacing and the chart runs on down the page */
    const fit = Math.min(...SS.map(s => n(s) ? (room - 2 * padY - labels(s)) / n(s) : Infinity));
    const pitch = Math.round(fit >= 54 * k ? Math.min(fit, 68 * k) : 58 * k), tall = s => labels(s) + n(s) * pitch;
    const H = Math.round(2 * padY + Math.max(...SS.map(tall)));
    const hubR = clamp(Math.min(W * 0.0892, H * 0.15), 96, 132 * k);
    /* the faces stand in a column just inside the widest label on their side; the rail runs between them and the hub */
    const inset = s => Math.round(Math.max(lw[s] || 0, 170 * k) + gap + avR + 2);
    const colX = { left: inset('left'), right: W - inset('right') };
    const railX = { left: Math.round(Math.max(W * 0.29, colX.left + avR + 48 * k)), right: Math.round(Math.min(W * 0.71, colX.right - avR - 48 * k)) };
    const S = { W, H, k, cx: W / 2, cy: H / 2, hubR, vennR: hubR * 1.293, vennOffset: hubR * 0.7586, avR, gap, colX, railX };
    const spokes = [];
    SS.forEach(side => {
      let y = Math.round((H - tall(side)) / 2);                 // each side stands level about the hub
      SIDES[side].forEach(key => {
        const ppl = per(key), headY = y + Math.round(8 * k);
        const leaves = ppl.map(p => ({ p, y: Math.round(y + headH + pitch * (ppl.indexOf(p) + 0.5)), x: colX[side] }));
        y += headH + ppl.length * pitch + airG;
        if (!leaves.length) return;
        const railX = S.railX[side], yA = leaves[0].y, yB = leaves[leaves.length - 1].y, railMid = (yA + yB) / 2;
        /* the node on the rim points from the middle of the hub toward the middle of the rail */
        const dx = railX - S.cx, dy = railMid - S.cy, len = Math.hypot(dx, dy) || 1;
        spokes.push({ key, side, headY, leaves, railX, yA, yB, railMid, hubPt: { x: S.cx + dx / len * hubR, y: S.cy + dy / len * hubR }, vennPt: { x: S.cx + dx / len * S.vennOffset, y: S.cy + dy / len * S.vennOffset } });
      });
    });
    return { S, spokes };
  }

  let spiderParts = null, ro = null, lastW = 0, lastRoom = 0;
  function buildSpider() {
    const g0 = spiderGeometry(1300, 800);          // who hangs off which side; the real measurements come in layout()
    const svgEl = svg('svg', { class: 'sp-svg', 'aria-hidden': 'true' });
    const venn = svg('g', { class: 'venn' }, svgEl), disc = svg('circle', { class: 'hub-disc' }, svgEl);
    const parts = g0.spokes.map(s => {
      const d = T.divisions.find(x => x.key === s.key), g = svg('g', { class: 'spoke', 'data-div': s.key, stroke: d.color }, svgEl);
      return { key: s.key, side: s.side, c: d.color, label: d.label, bloom: svg('circle', { fill: d.color }, venn), g, diag: svg('path', { class: 'diag', pathLength: 1 }, g), rail: svg('path', { class: 'rail', pathLength: 1 }, g),
        stubs: s.leaves.map(() => svg('path', { class: 'stub', pathLength: 1 }, g)), trace: svg('path', { class: 'trace', pathLength: 1 }, g),
        node: el('button.sp-node', { type: 'button', 'data-div': s.key, 'aria-pressed': 'false', 'aria-label': d.label + ', filter this division', 'data-cursor': d.label, title: plain ? d.label + ', ' + act.toLowerCase() + ' to filter' : null, style: '--c:' + d.color, onclick: () => toggleFilter(s.key) }, el('i')),
        /* the division's label over its people: its colour, its name, how many */
        head: el('p.sp-head.a-' + s.side, { 'data-div': s.key, style: '--c:' + d.color }, el('i', { 'aria-hidden': 'true' }), el('span', null, el('b', { text: d.label }), el('em', { text: s.leaves.length }))),
        leaves: s.leaves.map((l, i) => { const p = l.p;
          return el('button.leaf.a-' + s.side + (p.tagKind === 'win' ? '.win' : ''), { type: 'button', 'data-pi': p.pi, 'data-div': p.div, 'data-type': p.type, 'aria-label': label(p), style: `--c:${p.c};--i:${i}`, onclick: e => openPerson(p, e.currentTarget) },
            face(p), el('span.lf', null,
              el('span.lf-name', null, el('span', { text: p.name }), p.pillar ? el('i.star', { 'aria-hidden': 'true', text: '★' }) : null, winMark(p)),
              el('span.lf-role', null, mark(p.type), el('span', { text: p.role + (p.lead ? ' · lead' : '') })))); }) };
    });
    const hub = el('button.sp-hub', { type: 'button', 'data-pi': root.pi, 'data-div': root.div, 'data-type': root.type, 'aria-label': 'Group Leadership, Founder and Managing Director, ' + root.name, style: '--c:var(--pink)', onclick: e => openPerson(root, e.currentTarget) },
      face(root), el('span.hub-name', { text: 'Group Leadership' }), el('span.hub-role', { text: 'Founder & Managing Director' }), el('span.hub-who', { text: root.name }));
    /* each division's label goes just before its people, so it is read (and tabbed past) in that order */
    const spider = el('div.spider', { id: 'spider' }, svgEl, hub, parts.map(p => p.node), parts.flatMap(p => [p.head, ...p.leaves]));
    const scroll = el('div.sp-scroll', null, spider);
    /* one quiet line over the chart: the key to the marks, and how to use it */
    const top = el('div.sp-top', null,
      el('p.sp-key', null, el('span.k-lead', { text: 'Employment type' }), keyItems()),
      el('p.sp-guide', null, touch ? null : [el('b', { text: 'Hover' }), ' a name to trace its spoke', el('i', { 'aria-hidden': 'true', text: '·' })],
        el('b', { text: act }), ' anyone for their full detail', el('i', { 'aria-hidden': 'true', text: '·' }), el('b', { text: act }), ' a coloured node to filter its division'),
      /* where the chart is wider than the screen (it scrolls sideways in its own frame), say so before it starts */
      el('p.sp-hint', { text: 'Swipe the diagram sideways to reach every division' }));
    spiderParts = { spider, scroll, svgEl, venn, disc, hub, parts };
    /* the diagram draws itself once it comes on screen (at once where motion is not wanted): as its top comes in, not
       its hub, since on a short screen the hub is a long way down */
    if (STILL) spider.classList.add('go'); else onSeen(spider, () => spider.classList.add('go'));

    /* over (or on) a name: its division's spoke lights, its own route from the hub is drawn over the top, the rest fade */
    parts.forEach(part => part.leaves.forEach((leaf, i) => {
      const on = () => { spider.classList.add('focused'); [part.g, part.node, part.head, ...part.leaves].forEach(n => n.classList.add('hot')); leaf.classList.add('me');
        const t = part.trace; t.setAttribute('d', part.routes[i]); t.classList.remove('on'); void t.getBoundingClientRect(); t.classList.add('on'); };
      const off = () => { part.trace.classList.remove('on'); leaf.classList.remove('me'); applyFilter(); };
      leaf.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') on(); }); leaf.addEventListener('pointerleave', off);
      /* by keyboard too; a press with the mouse leaves focus behind it, and that is not asking for the trace */
      leaf.addEventListener('focus', () => { if (leaf.matches(':focus-visible')) on(); }); leaf.addEventListener('blur', off);
    }));
    lastW = lastRoom = 0;
    if (ro) ro.disconnect();
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => layoutSpider()); ro.observe(scroll); }
    return el('div.sp', null, top, scroll);
  }
  /* every measurement of the diagram, for the width it has now */
  function layoutSpider() {
    const P = spiderParts; if (!P || !P.spider.isConnected) return;
    const W = P.spider.clientWidth, room = innerHeight - 104; if (!W || (W === lastW && room === lastRoom)) return; lastW = W; lastRoom = room;
    const k = spiderScale(W, room), avR = Math.round(19 * k);
    P.spider.style.setProperty('--k', k.toFixed(3)); P.spider.style.setProperty('--av', avR * 2 + 'px');
    /* the widest label on each side, at this size: the faces stand just inside it */
    const lw = { left: 0, right: 0 };
    P.parts.forEach(part => [$('span', part.head), ...part.leaves.map(l => $('.lf', l))].forEach(n => { lw[part.side] = Math.max(lw[part.side], n.offsetWidth); }));
    const { S, spokes } = spiderGeometry(W, room, lw), px = n => Math.round(n * 10) / 10;
    P.spider.style.height = S.H + 'px'; P.spider.style.setProperty('--hub', Math.round(S.hubR * 2) + 'px');
    P.svgEl.setAttribute('width', W); P.svgEl.setAttribute('height', S.H); P.svgEl.setAttribute('viewBox', `0 0 ${W} ${S.H}`);
    P.disc.setAttribute('cx', S.cx); P.disc.setAttribute('cy', S.cy); P.disc.setAttribute('r', px(S.hubR));
    P.hub.style.left = Math.round(S.cx - P.hub.offsetWidth / 2) + 'px'; P.hub.style.top = Math.round(S.cy - P.hub.offsetHeight / 2) + 'px';
    /* a box's inner edge on the face column (on the left side its right edge is placed, on the right its left) */
    const put = (n, side, x, y) => { if (side === 'left') { n.style.right = Math.round(W - x) + 'px'; n.style.left = 'auto'; } else { n.style.left = Math.round(x) + 'px'; n.style.right = 'auto'; } n.style.top = Math.round(y - n.offsetHeight / 2) + 'px'; };
    spokes.forEach((s, k) => {
      const part = P.parts[k], hx = px(s.hubPt.x), hy = px(s.hubPt.y), rx = s.railX + 0.5, dir = s.side === 'left' ? -1 : 1, col = S.colX[s.side];
      part.bloom.setAttribute('cx', px(s.vennPt.x)); part.bloom.setAttribute('cy', px(s.vennPt.y)); part.bloom.setAttribute('r', px(S.vennR));
      part.diag.setAttribute('d', `M${hx} ${hy}L${rx} ${px(s.railMid)}`);
      part.rail.setAttribute('d', s.leaves.length > 1 ? `M${rx} ${s.yA + 0.5}L${rx} ${s.yB + 0.5}` : '');
      part.node.style.left = Math.round(s.hubPt.x) + 'px'; part.node.style.top = Math.round(s.hubPt.y) + 'px';
      put(part.head, s.side, col - dir * 4, s.headY);            // the label's dot sits over the faces
      part.routes = s.leaves.map((l, i) => {
        const end = col - dir * (S.avR + 2), y = l.y + 0.5;
        part.stubs[i].setAttribute('d', `M${rx} ${y}L${end} ${y}`);
        put(part.leaves[i], s.side, col - dir * S.avR, l.y);
        return `M${hx} ${hy}L${rx} ${px(s.railMid)}L${rx} ${y}L${end} ${y}`;
      });
    });
    P.spider.classList.add('laid');
  }

  /* ───────── matrix: by division, or by employment type ─────────
     A card is a face, a name and a role, then what the group heading does not already say: by division, the type and
     the note; by employment type, the division and the note. */
  function card(p, view) {
    return el('button.mb' + (p.pillar ? '.star' : '') + (p.org ? '.org' : ''), { type: 'button', 'data-pi': p.pi, 'data-div': p.div, 'data-type': p.type, 'aria-label': label(p), 'data-cursor': 'Open', style: '--c:' + p.c, onclick: e => openPerson(p, e.currentTarget) },
      el('span.top', null, face(p), el('span.tx', null, el('b', null, p.name, p.nickname ? el('i', { text: ' ' + p.nickname }) : null), el('span.role', { text: p.role }))),
      el('span.pills', null, view === 'employment' ? el('span.pill.acc', null, el('i', { 'aria-hidden': 'true' }), p.divLabel) : typePill(p), tagPill(p)),
      p.pillar ? [el('span.badge', { text: p.badge }), el('span.note', { text: p.note })] : null);
  }
  function buildMatrix(view) {
    const groups = view === 'division' ? T.divisions.map(d => ({ key: d.key, label: d.label, c: d.color, people: flat.filter(p => p.div === d.key) }))
      : TYPES.map(t => ({ key: 'type-' + t, label: t, c: TYPE_COLOURS[t], people: flat.filter(p => p.type === t) })).filter(g => g.people.length);
    return el('div.mx', null, groups.map(g => el('section.dv', { 'data-group': g.key, style: '--c:' + g.c },
      el('header.dv-head', null, el('i', { 'aria-hidden': 'true' }), view === 'employment' ? mark(g.label) : null, el('h3', { text: g.label }), el('span.n', { text: g.people.length + (g.people.length === 1 ? ' person' : ' people') })),
      el('div.dv-ppl', null, g.people.map(p => card(p, view))))));
  }

  /* ───────── which view, which division ───────── */
  const stage = el('div.cv'); body.append(stage);
  function renderView() {
    spiderParts = null; body.dataset.view = st.view;
    stage.replaceChildren(st.view === 'spider' ? buildSpider() : buildMatrix(st.view));
    if (st.view === 'spider') layoutSpider();
    applyFilter();
  }
  /* the filter brings one division forward and lets the rest fall back, in whichever view is up */
  function applyFilter() {
    const key = st.filter;
    applyPhone(key);
    if (spiderParts) {
      const P = spiderParts, me = $('.leaf.me', P.spider);
      P.spider.classList.toggle('focused', key !== 'all' || !!me);
      P.parts.forEach(part => { const hot = part.key === key || (me && part.leaves.includes(me)); [part.g, part.node, part.head, ...part.leaves].forEach(n => n.classList.toggle('hot', hot)); part.node.setAttribute('aria-pressed', String(part.key === key)); });
      return;
    }
    $$('[data-pi]', body).forEach(m => m.classList.toggle('dim', key !== 'all' && m.dataset.div !== key));
    $$('.dv', body).forEach(d => d.classList.toggle('hide', !$$('[data-pi]', d).some(m => !m.classList.contains('dim'))));
  }
  const views = $$('#crewView button');
  views.forEach(b => b.addEventListener('click', () => {
    if (b.getAttribute('aria-pressed') === 'true') return;
    st.view = b.dataset.view; views.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    /* the chart steps back, changes, and comes forward again */
    if (STILL || document.hidden) { renderView(); return; }
    stage.classList.add('swap'); setTimeout(() => { renderView(); void stage.offsetWidth; stage.classList.remove('swap'); }, 220);
  }));

  /* ───────── anyone, in full ───────── */
  const dlg = $('#person'), ps = $('#psBody'); let opener = null;
  function openPerson(p, from) {
    ps.style.setProperty('--c', p.c);
    ps.replaceChildren(portrait(p), el('div', null,
      el('h3', { id: 'psName', text: p.name }), p.nickname ? el('p.nick', { text: p.nickname }) : null,
      el('p.role', null, el('i', { 'aria-hidden': 'true' }), p.role + (p.lead ? ' · division lead' : '') + ' · ' + p.divLabel),
      el('p.bio', { text: p.bio || '' }),
      el('p.pills', null, typePill(p), tagPill(p), p.pillar ? el('span.pill', { text: p.badge }) : null),
      p.note ? el('p.note', { text: p.note }) : null));
    if (opener) opener.classList.remove('sel'); opener = from || null; if (opener) opener.classList.add('sel');
    dlg.showModal();
  }
  dlg.addEventListener('close', () => { if (opener) opener.classList.remove('sel'); opener = null; });
  /* Tab stays inside an open dialog: round from its last control to its first, and back the other way */
  const keepFocus = d => d.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return; const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', d).filter(x => x.getClientRects().length); if (!f.length) return;
    const first = f[0], last = f[f.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || !d.contains(at))) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && (at === last || !d.contains(at))) { e.preventDefault(); first.focus(); }
  });
  keepFocus(dlg);

  /* ───────── the roles opening next ───────── */
  const pipe = $('#pipeline'), pipeBtn = $('#pipeBtn');
  $('#pipeBody').append(...T.pipeline.map(g => el('div.vac-group', { style: '--c:' + g.color }, el('h4', { text: g.label }),
    el('ul', null, g.roles.map(r => el('li.vac', null, el('span.v-ico', { 'aria-hidden': 'true' }, ICON[g.icon] ? ICON[g.icon]() : null), el('span.v-name', { text: r.title }), el('span.v-tag', { text: r.tag })))))));
  /* the drawer slides away before the dialog shuts (the close button, Escape and a press outside all come through here) */
  function shut() {
    if (!pipe.open || pipe.classList.contains('closing')) return;
    if (STILL) { pipe.close(); return; }
    pipe.classList.add('closing'); setTimeout(() => { pipe.classList.remove('closing'); if (pipe.open) pipe.close(); }, 300);
  }
  pipeBtn.setAttribute('aria-expanded', 'false');
  pipeBtn.addEventListener('click', () => { pipe.showModal(); pipeBtn.setAttribute('aria-expanded', 'true'); });
  $('#pipeClose').addEventListener('click', shut);
  pipe.addEventListener('cancel', e => { if (STILL) return; e.preventDefault(); shut(); });
  pipe.addEventListener('close', () => { pipe.classList.remove('closing'); pipeBtn.setAttribute('aria-expanded', 'false'); });
  keepFocus(pipe);

  /* ───────── a phone: the staff matrix ─────────
     The same divisions, people and colours, recomposed for a thumb as the earlier portfolio had them: the founder as a
     hub ringed by one circle for each division, then each division as a list that opens, each person opening in place.
     A person's row is their name over their role (the type is the mark beside it, as on the wide chart); the note and
     the rest open with them. Filtering rides the same chips as the wide views: the circles just press them. */
  const phone = $('#crewPhone'); let applyPhone = () => {};
  if (phone) {
    const divs = T.divisions.filter(d => d.key !== root.div);
    /* six circles round the hub: centre (195,170), orbit 140, in a 390 by 340 box */
    const SAT = [['finance', -120], ['core', -60], ['it', 180], ['web', 0], ['ecom', 120], ['partners', 60]].filter(([k]) => divs.some(d => d.key === k));
    const ring = svg('svg', { viewBox: '0 0 390 340', 'aria-hidden': 'true' }); svg('circle', { cx: 195, cy: 170, r: 140, class: 'tm-orbit' }, ring);
    const sats = SAT.map(([key, a]) => { const d = divs.find(x => x.key === key), r = a * Math.PI / 180, ux = Math.cos(r), uy = Math.sin(r);
      svg('line', { x1: (195 + 87 * ux).toFixed(1), y1: (170 + 87 * uy).toFixed(1), x2: (195 + 96 * ux).toFixed(1), y2: (170 + 96 * uy).toFixed(1), stroke: d.color, class: 'tm-tick' }, ring);
      return el('button.tm-sat', { type: 'button', 'data-f': key, 'aria-pressed': 'false', 'aria-label': d.label + ', filter this division', style: `--c:${d.color};left:${((195 + 140 * ux) / 390 * 100).toFixed(2)}%;top:${((170 + 140 * uy) / 340 * 100).toFixed(2)}%`, onclick: () => toggleFilter(key) }, ICON.people(), el('span', { text: d.label })); });
    const hubc = el('button.tm-hubc', { type: 'button', 'data-f': root.div, 'aria-pressed': 'false', 'aria-label': 'Group Leadership, Founder, ' + root.name, onclick: () => toggleFilter(root.div) }, el('b', { text: 'Group Leadership' }), el('span', { text: 'Founder' }), el('span.who', { text: root.name }));
    const hub = el('div.tm-hub', { 'aria-label': 'Division hub around ' + root.name }, ring, hubc, sats);
    const lists = divs.map((d, i) => {
      const rows = flat.filter(p => p.div === d.key).flatMap(p => {
        const bio = el('div.tm-bio', { 'data-pi': p.pi }, FACES[p.name] || LOGOS[p.name] ? portrait(p) : null, el('p', { text: p.bio || '' }), p.note ? el('p.note', { text: p.note }) : null,
          el('span.pills', null, typePill(p), tagPill(p), p.badge ? el('span.pill', { text: p.badge }) : null, p.lead ? el('span.pill', { text: 'Division lead' }) : null));
        const row = el('button.tm-person' + (p.tagKind === 'win' ? '.win' : ''), { type: 'button', 'data-pi': p.pi, 'aria-expanded': 'false', 'aria-label': `${label(p)}, full detail` }, face(p),
          el('span.tx', null, el('b', null, p.name, p.pillar ? el('i.star', { 'aria-hidden': 'true', text: '★' }) : null, winMark(p)), el('span.r', null, mark(p.type), el('span', { text: p.role + (p.lead ? ' · lead' : '') }))),
          el('span.chev', { 'aria-hidden': 'true' }));
        row.addEventListener('click', () => { const show = !bio.classList.contains('show'); $$('.tm-bio.show', row.parentNode).forEach(b => b.classList.remove('show')); $$('.tm-person', row.parentNode).forEach(b => b.setAttribute('aria-expanded', 'false')); bio.classList.toggle('show', show); row.setAttribute('aria-expanded', String(show)); });
        return [row, bio];
      });
      const head = el('button.tm-dhead', { type: 'button', 'aria-expanded': String(i < 2) }, el('i', { 'aria-hidden': 'true' }), el('b', { text: d.label }), el('span.n', { text: d.people.length }), el('span.chev', { 'aria-hidden': 'true' }));
      const box = el('section.tm-div' + (i < 2 ? '.open' : ''), { 'data-div': d.key, style: '--c:' + d.color }, head, el('div.tm-dbody', null, rows));
      head.addEventListener('click', () => { const open = !box.classList.contains('open'); box.classList.toggle('open', open); head.setAttribute('aria-expanded', String(open)); });
      return box;
    });
    const dir = el('div.tm-dir', { style: '--c:' + root.c }, el('div.hd', null, face(root), el('span', null, el('b', { text: root.name }), el('span.rl', { text: root.role }))), el('p', { text: root.bio || '' }));
    phone.append(
      el('p.tm-guide', null, el('b', { text: 'Tap' }), ' a division to filter the view', el('i', { 'aria-hidden': 'true', text: '·' }), el('b', { text: 'Tap' }), ' a person for full detail'),
      hub, el('p.sp-key.tm-key', null, el('span.k-lead', { text: 'Employment type' }), keyItems()), el('div.tm-divs', null, lists), dir);
    /* the chosen circle stands out, only that division's list stays (opened), and the founder's own card comes up for Director */
    applyPhone = key => {
      const isDir = key === root.div;
      hub.classList.toggle('filtered', key !== 'all'); hubc.setAttribute('aria-pressed', String(isDir));
      sats.forEach(s => { const hot = s.dataset.f === key; s.classList.toggle('hot', hot); s.setAttribute('aria-pressed', String(hot)); });
      lists.forEach(d => { const mine = d.dataset.div === key; d.classList.toggle('away', isDir || (key !== 'all' && !mine)); if (mine) { d.classList.add('open'); $('.tm-dhead', d).setAttribute('aria-expanded', 'true'); } });
      dir.classList.toggle('show', isDir);
    };
  }

  /* ───────── start ───────── */
  renderView();
  /* fonts change every label's size, and the window's height changes the pitch of the rows */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lastW = 0; layoutSpider(); });
  addEventListener('resize', () => layoutSpider());
  /* the heading rises and its label decodes, as on the other sheets (those are marked by the page; this sheet is its own) */
  const sh = $('.sh', sec); if (sh) sh.classList.add('rv'); if (phone) phone.classList.add('rv');
  if (!STILL && sh) import('./type.js').then(m => onSeen($('.kick', sh), k => m.scramble(k, { dur: 800 }))).catch(() => {});
}

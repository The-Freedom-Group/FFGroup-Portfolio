/* The journey: twenty-one chapters, each with its own photographs. On a wide screen a chapter's photographs hold still
   beside its words and change as the words go by; on a phone they sit above. Any photograph opens full size. The line
   down the left edge fills as the years pass. The company's recognitions close the part. */
import { $, $$, el, icon, clamp, onSeen, STILL } from './kit.js';

const two = n => String(n).padStart(2, '0');
/* "March 2019" is written "March · 2019", as the chapters always wrote it */
const dated = d => d.replace(/^(.+?)\s+(\d{4})$/, '$1 · $2');

export function initJourney(DATA) {
  const list = $('#chapters'); if (!list) return null;
  const decks = [];

  DATA.chapters.forEach(c => {
    const n = c.photos.length; const deck = el('div.deck' + (n === 1 ? '.one' : ''));
    const shots = c.photos.map((src, i) => {
      const alt = n > 1 ? c.alt + ' (photo ' + (i + 1) + ' of ' + n + ')' : c.alt;
      const b = el('button.ph' + (i === 0 ? '.on' : ''), { type: 'button', 'aria-label': 'Open the photo: ' + alt, 'data-cursor': 'Open' },
        el('img', { src, alt, width: 860, height: 1000, loading: c.n <= 1 ? 'eager' : 'lazy', decoding: 'async' }));
      deck.append(b); return b;
    });
    const count = el('span', { text: '1 / ' + n });
    const state = { i: 0, n, shots, count, manual: 0, chapter: c };
    const go = (i, manual) => { i = (i + n) % n; if (i === state.i) return; shots[state.i].classList.remove('on'); shots[i].classList.add('on'); state.i = i; count.textContent = (i + 1) + ' / ' + n; if (manual) state.manual = performance.now(); };
    state.go = go;
    shots.forEach((b, i) => b.addEventListener('click', () => openLightbox(c, state.i)));
    const nav = n > 1 ? el('div.fig-nav', null,
      el('button', { type: 'button', 'aria-label': 'Previous photo', onclick: () => go(state.i - 1, true) }, icon('left')), count,
      el('button', { type: 'button', 'aria-label': 'Next photo', onclick: () => go(state.i + 1, true) }, icon('right'))) : null;
    /* reaching for the arrows stops the photos changing by themselves */
    if (nav) ['pointerenter', 'focusin', 'touchstart'].forEach(ev => nav.addEventListener(ev, () => { state.manual = performance.now(); }, { passive: true }));
    /* under the photograph: the arrows, then what it shows, on one line */
    const fig = el('figure.ch-fig', null, el('div.shot', null, deck, el('i.veil', { 'aria-hidden': 'true' })), el('div.fig-bar', null, nav, el('figcaption.fig-cap', { text: c.alt })));

    const date = el('span.ch-date', { text: dated(c.date) });
    const more = el('details.ch-more', null, el('summary', { text: 'Read the chapter' }), el('div.body', null, c.body.map(p => el('p', { text: p }))));
    const text = el('div.ch-text', null,
      el('p.ch-meta', null, el('b', { text: 'Chapter ' + two(c.n) }), date, el('span', { text: c.kick })),
      el('p.ch-q', { text: c.q }),
      el('h3', { text: c.title }),
      el('p.ch-sub', { text: c.sub }),
      el('ul.ch-stats', null, c.stats.map(s => el('li', null, el('b', { text: s.v }), el('span', { text: s.l })))),
      el('blockquote', { text: c.quote }),
      more,
      c.next ? el('p.ch-next', null, 'Next chapter', el('em', { text: c.next })) : null);

    const li = el('li.ch', { id: 'ch-' + c.n, 'data-year': c.date.slice(-4) }, fig, el('span.ch-no', { 'aria-hidden': 'true', text: two(c.n) }), text);
    /* an open chapter is taller than its photograph: the line under the photograph folds to stay clear of the words */
    more.addEventListener('toggle', () => { li.classList.toggle('open', more.open); layout(); });
    list.append(li); state.li = li; state.date = date; decks.push(state);
    onSeen(li, x => x.classList.add('in'));
  });
  if (STILL) $$('.ch', list).forEach(x => x.classList.add('in'));

  /* The line geometry of a chapter: the question on one line, the title on two, the sub on two, three figures in one
     row, the quote on two and the question that leads on, on two. A text short enough for one line, or one that would
     leave a word alone on its last, is given the tightest measure that holds it in two even lines. The measure is
     kept in em so it holds at every size; it is taken again when the faces arrive and when the window changes. */
  const pairs = $$('.ch h3, .ch-sub, .ch blockquote, .ch-next em', list);
  function twoLines() {
    pairs.forEach(e => { e.style.maxWidth = 'none'; e.style.whiteSpace = 'nowrap'; });
    const fit = pairs.map(e => {
      const node = e.firstChild; if (!node || node.nodeType !== 3) return 0;
      const t = node.nodeValue, cs = getComputedStyle(e), size = parseFloat(cs.fontSize) || 16, r = document.createRange();
      const w = (a, b) => { r.setStart(node, a); r.setEnd(node, b); return r.getBoundingClientRect().width; };
      let best = Infinity;
      for (let i = t.indexOf(' '); i > 0; i = t.indexOf(' ', i + 1)) best = Math.min(best, Math.max(w(0, i), w(i + 1, t.length)));
      if (!isFinite(best) || !best) return 0;
      const edge = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      return (best + edge + 2) / size;
    });
    pairs.forEach((e, i) => { e.style.whiteSpace = ''; e.style.maxWidth = fit[i] ? fit[i].toFixed(3) + 'em' : ''; });
  }

  /* the years down the line: each year's mark sits level with the date of the first chapter of that year */
  const line = $('#jrLine'), years = $('#jrYears'), jr = $('#jr'); const ticks = []; let prev = '';
  decks.forEach(d => { const y = d.li.dataset.year; if (y === prev) return; prev = y; const t = el('li', { text: y }); years.append(t); ticks.push({ t, date: d.date, top: 0 }); });
  function layout() {
    const j = jr.getBoundingClientRect();
    ticks.forEach(x => { const d = x.date.getBoundingClientRect(); x.top = d.top + d.height / 2 - j.top; });
    ticks.forEach(x => { x.t.style.top = x.top.toFixed(2) + 'px'; });
  }
  let wait = 0; const settle = () => { twoLines(); layout(); };
  settle(); addEventListener('resize', () => { layout(); clearTimeout(wait); wait = setTimeout(settle, 140); });
  if (document.fonts) { if (document.fonts.ready) document.fonts.ready.then(settle); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', settle); }
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(list);

  /* called every frame while the journey is on screen: the line is filled down to the middle of the screen, so it
     reaches a year's mark as that chapter's date crosses the middle */
  function frame(vh) {
    const r = jr.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
    const mid = vh * 0.5 - r.top; const k = clamp(mid / Math.max(1, r.height)); line.style.setProperty('--k', k.toFixed(5));
    ticks.forEach(x => x.t.classList.toggle('past', mid >= x.top));
    if (innerWidth < 900) return;
    const now = performance.now();
    decks.forEach(d => { if (d.n < 2 || now - d.manual < 6000) return; const b = d.li.getBoundingClientRect(); if (b.bottom < 0 || b.top > vh) return;
      const p = clamp((vh * 0.5 - b.top) / Math.max(1, b.height)); d.go(Math.min(d.n - 1, Math.floor(p * d.n)), false); });
  }

  /* full size */
  const lb = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap'), cnt = $('#lbCount'), nav = $('.lb-nav', lb); let cur = null, at = 0;
  function show(i) { const c = cur; at = (i + c.photos.length) % c.photos.length; img.src = c.photos[at]; img.alt = c.alt; cap.textContent = two(c.n) + ' · ' + c.date + ' · ' + c.alt; cnt.textContent = (at + 1) + ' / ' + c.photos.length; nav.classList.toggle('one', c.photos.length < 2); }
  function openLightbox(c, i) { cur = c; show(i); if (!lb.open) lb.showModal(); }
  $('#lbPrev').addEventListener('click', () => show(at - 1)); $('#lbNext').addEventListener('click', () => show(at + 1));
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(at - 1); else if (e.key === 'ArrowRight') show(at + 1); });
  img.addEventListener('click', () => { if (cur && cur.photos.length > 1) show(at + 1); });

  /* what the company has been recognised for: one ruled grid, a mark (a real badge, or the fact in display type) over
     who gave it and what it says */
  const rec = $('#recList');
  if (rec && DATA.recognition) DATA.recognition.forEach(r => rec.append(el('li', null,
    el('div.rec-mark', null, r.img ? el('img', { src: r.img.src, alt: r.img.alt, width: r.img.w, height: r.img.h, loading: 'lazy', decoding: 'async' }) : el('b', { text: r.mark })),
    el('h4', { text: r.name }), el('p', { text: r.fact }), r.note ? el('p.rec-note', { text: r.note }) : null)));

  return { frame, layout };
}

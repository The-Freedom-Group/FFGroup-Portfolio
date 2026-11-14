/* The journey: twenty-one chapters, each with its own photographs. On a wide screen a chapter's photographs hold still
   beside its words and change as the words go by; on a phone they sit above. Any photograph opens full size. The line
   down the left edge fills as the years pass. */
import { $, $$, el, icon, clamp, onSeen, STILL } from './kit.js';

const two = n => String(n).padStart(2, '0');

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
    const fig = el('figure.ch-fig', null, deck, el('i.veil', { 'aria-hidden': 'true' }), el('div.fig-bar', null, el('figcaption.fig-cap', { text: c.alt }), nav));

    const text = el('div.ch-text', null,
      el('p.ch-meta', null, el('b', { text: two(c.n) }), el('span', { text: c.date }), el('span', { text: c.kick })),
      el('p.ch-q', { text: c.q }),
      el('h3', { text: c.title }),
      el('p.ch-sub', { text: c.sub }),
      el('ul.ch-stats', null, c.stats.map(s => el('li', null, el('b', { text: s.v }), el('span', { text: s.l })))),
      el('blockquote', { text: c.quote }),
      el('details.ch-more', null, el('summary', { text: 'Read the chapter' }), el('div.body', null, c.body.map(p => el('p', { text: p })))),
      c.next ? el('p.ch-next', null, 'Next', el('em', { text: c.next })) : null);

    const li = el('li.ch', { id: 'ch-' + c.n, 'data-year': c.date.slice(-4) }, fig, el('span.ch-no', { 'aria-hidden': 'true', text: two(c.n) }), text);
    list.append(li); state.li = li; decks.push(state);
    onSeen(li, x => x.classList.add('in'));
  });
  if (STILL) $$('.ch', list).forEach(x => x.classList.add('in'));

  /* the years down the line: a tick where each year's first chapter starts */
  const line = $('#jrLine'), years = $('#jrYears'), jr = $('#jr'); let ticks = [];
  function layout() {
    years.replaceChildren(); ticks = []; let prev = '';
    decks.forEach(d => { const y = d.li.dataset.year; if (y === prev) return; prev = y; const t = el('li', { text: y }); t.style.top = (d.li.offsetTop + 60) + 'px'; years.append(t); ticks.push({ t, top: d.li.offsetTop + 60 }); });
  }
  layout(); addEventListener('resize', layout); if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(list);

  /* called every frame while the journey is on screen */
  function frame(vh) {
    const r = jr.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
    const mid = vh * 0.5 - r.top; const k = clamp(mid / Math.max(1, r.height)); line.style.setProperty('--k', k.toFixed(4));
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

  return { frame, layout };
}

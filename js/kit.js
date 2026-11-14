/* Small things every part of the page uses: money as the page writes it, element builders, "when this comes into view",
   counters that run up to their figure, and the tooltip the charts share. */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
/* 0 below a, 1 above b, eased between: the workhorse of every scroll-driven move */
export const span = (v, a, b) => smooth((v - a) / (b - a));
export const STILL = document.documentElement.classList.contains('still');

export const fmtInt = n => Math.round(n).toLocaleString('en-GB');
export const fmtGBP = n => '£' + fmtInt(n);
export function fmtCompact(n) {
  const trim = v => (Math.round(v * 100) / 100).toString();
  if (n >= 1e9) return '£' + trim(n / 1e9) + 'bn';
  if (n >= 1e6) return '£' + trim(n / 1e6) + 'm';
  if (n >= 1e3) return '£' + trim(n / 1e3) + 'k';
  return '£' + fmtInt(n);
}
export const pct = (v, d = 0) => (v * 100).toFixed(d) + '%';

/* el('p.kick', { id }, 'text', child) : children may be strings, nodes or arrays; null is skipped */
export function el(sel, attrs, ...kids) {
  const [tag, ...cls] = sel.split('.'); const n = document.createElement(tag || 'div'); if (cls.length) n.className = cls.join(' ');
  if (attrs) for (const k in attrs) { const v = attrs[k]; if (v === null || v === undefined || v === false) continue; if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v); }
  for (const k of kids.flat()) { if (k === null || k === undefined || k === false) continue; n.append(k.nodeType ? k : document.createTextNode(k)); }
  return n;
}
const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs, parent, text) {
  const n = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
  if (text !== undefined) n.textContent = text; if (parent) parent.append(n); return n;
}

/* the few line icons the page draws itself */
const ICONS = { left: 'M9 2 4 7l5 5', right: 'M5 2l5 5-5 5', x: 'M2 2l10 10M12 2 2 12', down: 'M7 1v12M2 8l5 5 5-5' };
export function icon(name) { const s = svg('svg', { viewBox: '0 0 14 14', 'aria-hidden': 'true' }); svg('path', { d: ICONS[name] }, s); return s; }

/* run cb once when the element is first seen (straight away where there is no observer) */
const seenIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { seenIO.unobserve(e.target); const f = e.target.__seen; e.target.__seen = null; if (f) f(e.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }) : null;
export function onSeen(node, cb) { if (!node) return; if (!seenIO) { cb(node); return; } node.__seen = cb; seenIO.observe(node); }

/* everything marked .rv eases up into place when it is first seen */
export function reveals(root = document) { $$('.rv', root).forEach(n => onSeen(n, x => x.classList.add('in'))); }

/* <b data-count="27" data-suffix="×" data-prefix="£" data-decimals="1">: runs up from zero when first seen (or at once,
   with now). The finished figure is in place from the start, so it is never blank if the run never happens. */
export function counters(root = document, now = false) {
  $$('[data-count]', root).forEach(n => {
    const to = parseFloat(n.dataset.count), dec = +(n.dataset.decimals || 0), pre = n.dataset.prefix || '', suf = n.dataset.suffix || '';
    /* the times sign is set small and light: the display face draws it as a heavy cross */
    const num = document.createTextNode(''), tail = suf === '×' ? el('span.times', { text: '×' }) : document.createTextNode(suf); n.replaceChildren(num, tail);
    const show = v => { num.nodeValue = pre + (dec ? v.toFixed(dec) : fmtInt(v)); };
    show(to); if (STILL) return;
    (now ? f => f() : f => onSeen(n, f))(() => { const t0 = performance.now(), dur = 1500; const tick = now => { const k = clamp((now - t0) / dur); show(to * easeOut(k)); if (k < 1) requestAnimationFrame(tick); else show(to); }; requestAnimationFrame(tick); });
  });
}

/* one tooltip per figure; rows are [name, value, colour] */
export function tipFor(fig) {
  const t = el('div.tip', { role: 'status' }); fig.append(t);
  return {
    show(x, y, head, rows) {
      t.replaceChildren(el('b', { text: head }), ...rows.map(r => { const s = el('span', null, el('i', { text: r[0] }), r[1]); if (r[2]) s.style.setProperty('--c', r[2]); else s.firstChild.classList.add('plain'); return s; }));
      const box = fig.getBoundingClientRect(); t.classList.add('on');
      const w = t.offsetWidth, h = t.offsetHeight; let lx = x - box.left + 14, ly = y - box.top - h - 12;
      if (lx + w > box.width) lx = x - box.left - w - 14; if (lx < 0) lx = 0; if (ly < 0) ly = y - box.top + 18;
      t.style.left = lx + 'px'; t.style.top = ly + 'px';
    },
    hide() { t.classList.remove('on'); }
  };
}

/* click outside closes a dialog where the browser has no closedby yet (Safari) */
export function lightDismiss() {
  if ('closedBy' in HTMLDialogElement.prototype) return;
  const outside = (e, d) => { const r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
  for (const d of $$('dialog[closedby="any"]')) { let out = false; d.addEventListener('pointerdown', e => { out = outside(e, d); }); d.addEventListener('pointerup', e => { if (out && outside(e, d)) d.close(); }); }
}

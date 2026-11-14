/* Type that decodes into place: each letter cycles through a few random glyphs before it settles, left to right with a
   little scatter, the way a signal locks on. Works inside mixed markup (the italic word in a title keeps its <i>);
   spaces stay put so the line never reflows. The finished text is always the original, and with reduced motion it is
   simply shown. */
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', LOWER = 'abcdefghijklmnopqrstuvwxyz';
const running = new WeakMap();

function textNodes(el) { const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.trim()) out.push(n); return out; }

export function scramble(el, { dur = 900, delay = 0, reduce = false } = {}) {
  if (!el) return; const prev = running.get(el); if (prev) { prev.cancel(); }
  const nodes = textNodes(el); if (!nodes.length) return;
  const orig = nodes.map(n => n.__orig || (n.__orig = n.nodeValue));
  if (reduce) { nodes.forEach((n, i) => { n.nodeValue = orig[i]; }); return; }
  const total = orig.reduce((a, s) => a + s.length, 0); let k = 0;
  const plan = orig.map(s => [...s].map(ch => { const at = delay + (k++ / Math.max(1, total)) * dur * 0.65 + Math.random() * dur * 0.35; return { ch, at, set: /[a-z]/.test(ch) ? LOWER : UPPER }; }));
  let raf = 0, t0 = performance.now(), cancelled = false;
  function tick(now) {
    if (cancelled) return; const t = now - t0; let done = true;
    nodes.forEach((n, i) => { let s = ''; for (const c of plan[i]) { if (c.ch === ' ' || c.ch === ' ' || t >= c.at) s += c.ch; else { done = false; s += t < c.at - dur * 0.5 ? ' ' : c.set[(Math.random() * c.set.length) | 0]; } } n.nodeValue = s; });
    if (!done) raf = requestAnimationFrame(tick); else running.delete(el);
  }
  const ctl = { cancel() { cancelled = true; cancelAnimationFrame(raf); nodes.forEach((n, i) => { n.nodeValue = orig[i]; }); running.delete(el); } };
  running.set(el, ctl); raf = requestAnimationFrame(tick); return ctl;
}

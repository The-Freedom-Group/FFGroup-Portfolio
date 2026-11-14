/* The pointer, on a mouse: a small dot that follows exactly and a thin ring that trails it. Over anything that can be
   pressed the ring opens out and the dot goes; over the 3D view it says what a drag or a press does there (set by the
   page through `hint`). Buttons with `data-magnet` lean toward the pointer. Nothing changes on touch screens. */
export function createCursor({ coarse, reduce }) {
  const el = document.getElementById('cursor'); if (!el || coarse || document.documentElement.classList.contains('no-gl')) { if (el) el.remove(); return { hint() {}, set reduce(v) {} }; }
  document.documentElement.classList.add('has-cursor');
  const ring = el.querySelector('.ring'), dot = el.querySelector('.dot'), label = el.querySelector('.cl');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, seen = false, hover = null, sceneHint = '', red = reduce, down = false;
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; x = e.clientX; y = e.clientY; if (!seen) { seen = true; rx = x; ry = y; el.classList.add('on'); } }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.remove('on'));
  document.addEventListener('pointerenter', () => { if (seen) el.classList.add('on'); });
  addEventListener('pointerdown', () => { down = true; el.classList.add('down'); }); addEventListener('pointerup', () => { down = false; el.classList.remove('down'); });
  document.addEventListener('pointerover', e => { const t = e.target.closest && e.target.closest('a, button, select, label, input, [data-cursor]'); hover = t; el.classList.toggle('hov', !!t); });
  let last = '';
  function frame() {
    const k = red ? 1 : 0.2; rx += (x - rx) * k; ry += (y - ry) * k;
    dot.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    let tx = rx, ty = ry;
    if (hover && hover.hasAttribute('data-magnet')) { const r = hover.getBoundingClientRect(); tx = r.left + r.width / 2 + (x - (r.left + r.width / 2)) * 0.25; ty = r.top + r.height / 2 + (y - (r.top + r.height / 2)) * 0.25; }
    ring.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
    const text = hover ? (hover.getAttribute('data-cursor') || '') : sceneHint;
    if (text !== last) { label.textContent = text; last = text; el.classList.toggle('lbl', !!text); }
    label.style.transform = 'translate(' + (x + 18).toFixed(1) + 'px,' + (y + 16).toFixed(1) + 'px)';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { hint(t) { sceneHint = t || ''; }, set reduce(v) { red = v; } };
}

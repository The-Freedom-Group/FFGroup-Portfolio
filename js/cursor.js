/* The pointer, on a mouse: a small dot that follows exactly and a thin ring that trails it. Over anything that can be
   pressed the ring opens out and the dot goes; over the 3D view it says what a drag or a press does there (set by the
   page through `hint`). Buttons with `data-magnet` lean toward the pointer. Nothing changes on touch screens.
   The system pointer is hidden everywhere, so this one must never be lost. A dialog opens in the browser's top layer,
   above the whole page, which used to leave the pointer underneath it; so the pointer rides in the top layer too (as a
   popover) and is moved back to the very top each time a dialog, or anything else, opens there. A browser without
   popovers keeps it in the page and gives dialogs the system pointer back. */
const PRESS = 'a, button, select, label, input, textarea, summary, [role="button"], [role="slider"], [role="tab"], [role="link"], [tabindex]:not([tabindex="-1"]), [data-cursor]';
export function createCursor({ coarse, reduce }) {
  const html = document.documentElement;
  const el = document.getElementById('cursor'); if (!el || coarse || html.classList.contains('no-gl')) { if (el) el.remove(); return { hint() {}, set reduce(v) {} }; }
  html.classList.add('has-cursor');
  const ring = el.querySelector('.ring'), dot = el.querySelector('.dot'), label = el.querySelector('.cl');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, seen = false, hover = null, sceneHint = '', red = reduce, lw = 0, lh = 0;

  /* ── above every dialog ── */
  let lifts = typeof el.showPopover === 'function';
  function lift() {                                              // to the top of the top layer: out, then in again as the newest thing there
    if (!lifts) return;
    try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } catch (e) { lifts = false; el.removeAttribute('popover'); html.classList.add('no-lift'); }
  }
  if (lifts) { el.setAttribute('popover', 'manual'); lift(); } else html.classList.add('no-lift');
  const modalUp = () => { let m = false; try { m = !!document.querySelector('dialog:modal'); } catch (e) { m = !!document.querySelector('dialog[open]'); } html.classList.toggle('modal-up', m); };
  /* a dialog opening, however it is opened: showModal itself, and the events a dialog or a popover sends as it opens */
  const show = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function () { const r = show.apply(this, arguments); lift(); modalUp(); return r; };
  const opened = e => { if (e.target === el || e.newState !== 'open') return; queueMicrotask(lift); };
  document.addEventListener('beforetoggle', opened, true); document.addEventListener('toggle', opened, true);
  document.addEventListener('fullscreenchange', lift);
  /* a dialog closing: whatever is now under the pointer is what it is over */
  document.addEventListener('close', () => { modalUp(); requestAnimationFrame(() => over(document.elementFromPoint(x, y))); }, true);

  function over(t) { hover = t && t.closest ? t.closest(PRESS) : null; el.classList.toggle('hov', !!hover); }
  const on = () => { if (seen) el.classList.add('on'); }, off = () => el.classList.remove('on');
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return; x = e.clientX; y = e.clientY;
    if (!seen) { seen = true; rx = x; ry = y; } el.classList.add('on');
    if (!e.buttons) el.classList.remove('down');                 // a press let go outside the window
  }, { passive: true });
  /* off when the mouse leaves the window, back the moment it returns */
  document.addEventListener('pointerleave', off); document.addEventListener('pointerenter', on);
  html.addEventListener('mouseleave', off); html.addEventListener('mouseenter', on);
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') el.classList.add('down'); else off(); }, true);   // a finger on a screen that also has a mouse: the ring steps aside
  addEventListener('pointerup', () => el.classList.remove('down'), true); addEventListener('pointercancel', () => el.classList.remove('down'), true);
  document.addEventListener('pointerover', e => over(e.target));
  let last = '';
  function frame() {
    const k = red ? 1 : 0.2; rx += (x - rx) * k; ry += (y - ry) * k;
    dot.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    let tx = rx, ty = ry;
    if (hover && !hover.isConnected) over(null);
    if (hover && hover.hasAttribute('data-magnet')) { const r = hover.getBoundingClientRect(); tx = r.left + r.width / 2 + (x - (r.left + r.width / 2)) * 0.25; ty = r.top + r.height / 2 + (y - (r.top + r.height / 2)) * 0.25; }
    ring.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
    const text = hover ? (hover.getAttribute('data-cursor') || '') : sceneHint;
    if (text !== last) { label.textContent = text; last = text; el.classList.toggle('lbl', !!text); lw = label.offsetWidth; lh = label.offsetHeight; }
    /* the label sits below and to the right of the pointer, and swaps sides at the right and bottom edges of the window */
    const lx = x + 18 + lw > innerWidth - 6 ? x - 18 - lw : x + 18, ly = y + 16 + lh > innerHeight - 6 ? y - 16 - lh : y + 16;
    label.style.transform = 'translate(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px)';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { hint(t) { sceneHint = t || ''; }, set reduce(v) { red = v; } };
}

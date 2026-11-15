/* The page: content first (chapters, charts, team: none of it needs WebGL), then the world behind it, then one loop that
   reads the scroll and tells every pinned scene, the world and the chrome where the story is. */
import { DATA } from './data.js';
import { $, $$, el, svg, clamp, lerp, span, smooth, reveals, counters, lightDismiss, onSeen, STILL } from './kit.js';
import { initJourney } from './journey.js';
import { initCharts } from './charts.js';
import { initCrew } from './crew.js';
import { initSystem } from './sysmap.js';

const html = document.documentElement, body = document.body;
let GL = html.classList.contains('gl');
const coarse = matchMedia('(pointer: coarse)').matches;
const safe = (name, f) => { try { return f(); } catch (e) { console.error(name, e); return null; } };
const two = n => String(n).padStart(2, '0');

/* ───────── content ───────── */
const journey = safe('journey', () => initJourney(DATA));
safe('charts', () => initCharts(DATA));
safe('crew', () => initCrew(DATA));
safe('dialogs', lightDismiss);
safe('reveals', () => {
  $$('.paper .sh, .night .sh, .panel, .pillars, .brand-list, .bigs, .plain, .becomes, .heads, .crew-bar, #crewChips, .crew, .crew-photo, .scen').forEach(n => n.classList.add('rv'));
  reveals(); counters($('#traction')); counters($('#market'));
  /* each part's label decodes into place as its heading arrives */
  if (!STILL) import('./type.js').then(m => $$('.paper .sh .kick, .night .sh .kick').forEach(k => onSeen(k, () => m.scramble(k, { dur: 800 })))).catch(() => {});
});

/* ───────── sections, the index, the rail ───────── */
const sections = $$('main > section').map(sec => ({ sec, id: sec.id, no: sec.dataset.no, name: sec.dataset.name, theme: sec.dataset.theme, world: sec.dataset.world || (sec.classList.contains('night') ? 'sky' : null), top: 0, h: 0, p: 0 }));
const byId = Object.fromEntries(sections.map(s => [s.id, s]));
const parts = sections.filter(s => s.id !== 'focus');           // what the index and the rail list
let vh = innerHeight, vw = innerWidth;
function measure() { vh = innerHeight; vw = innerWidth; const sy = scrollY; sections.forEach(s => { const r = s.sec.getBoundingClientRect(); s.top = r.top + sy; s.h = r.height; }); }

const partLink = s => el('li', null, el('a', { href: '#' + s.id }, el('i', { text: s.no }), s.name));
const menu = $('#menu'), menuList = $('#menuList');
menuList.append(...parts.map(partLink));
$('#menuBtn').addEventListener('click', () => menu.showModal());
{ const fl = $('#footList'); if (fl) fl.replaceChildren(...parts.map(partLink)); }   // the footer lists the same parts under the same names and numbers
/* the bar's links: a part lights its own link, or the nearest link before it */
const navLinks = $$('.nv-links a, .nv-cta'), navOf = {}; { let cur = null; parts.forEach(s => { cur = navLinks.find(a => a.getAttribute('href') === '#' + s.id) || cur; navOf[s.id] = cur; }); }

/* the rail: a tick where each part starts, the ground at the end, and the rocket, which is a handle */
const rail = $('#rail'), railOl = el('ol');
const rkNo = el('b'), rkName = el('span');
const rocket = el('div.rk', { role: 'slider', tabindex: '0', 'aria-label': 'Place in the story', 'aria-orientation': 'vertical', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'data-cursor': 'Drag' }, el('span.rk-tag', { 'aria-hidden': 'true' }, rkNo, rkName));
{ const s = svg('svg', { viewBox: '0 0 13 26', 'aria-hidden': 'true' }, rocket); svg('path', { d: 'M6.5 0C9.6 3.4 10.6 7.4 10.6 12v6.2H2.4V12C2.4 7.4 3.4 3.4 6.5 0Z', fill: 'currentColor' }, s); svg('path', { d: 'M2.4 13.5 0 19.5h2.4ZM10.6 13.5l2.4 6h-2.4Z', fill: 'currentColor', opacity: '.7' }, s); svg('path', { d: 'M4.4 19.4h4.2L6.5 26Z', fill: '#F4F1EB' }, s); svg('circle', { cx: 6.5, cy: 8.4, r: 1.7, fill: '#101010' }, s); }
const railItems = parts.map(s => { const li = el('li', null, el('a', { href: '#' + s.id, 'aria-label': s.no + ' ' + s.name }, el('span', { text: s.name }), el('i'))); railOl.append(li); return li; });
rail.append(railOl, rocket);

/* where a move to a part lands: its top, or, where the part says so (data-land), that far through its pinned scene, so a
   link to the investment focus arrives on the screen itself and not in the cloud before it */
const landAt = s => Math.round(s.top + (+s.sec.dataset.land || 0) * Math.max(0, s.h - vh) + landIn(s));   /* the system says for itself where it lands: on the finished map */
/* Two matching lists: how far down the page each part starts (the last entry is the end of the page), and how far down
   the rail its tick sits (the last entry is the ground). Between two ticks the rail and the page move in step, so each
   is the exact inverse of the other: the rocket on a tick is the page at that part's start. Every stretch of rail has
   a least length, and the rest is shared out by how long each part is, so the long journey gets a long stretch. */
const RL = { ys: [0, 1], rs: [0, 1], max: 1 };
const seg = (list, v) => { let i = 0; while (i < list.length - 2 && v >= list[i + 1]) i++; return i; };
const across = (from, to, v) => { const i = seg(from, v), d = from[i + 1] - from[i]; return lerp(to[i], to[i + 1], d > 0 ? clamp((v - from[i]) / d) : 0); };
const railAt = y => across(RL.ys, RL.rs, y), pageAt = r => across(RL.rs, RL.ys, r);
function railLayout() {
  measure(); const n = parts.length, max = Math.max(1, Math.round(document.documentElement.scrollHeight - vh));
  const ys = parts.map(s => clamp(Math.round(s.top), 0, max)); ys.push(max); for (let i = 1; i <= n; i++) ys[i] = Math.max(ys[i], ys[i - 1]);
  const H = clamp(vh * 0.62, 250, 620), least = 14, at = [16]; for (let i = 0; i < n; i++) at.push(at[i] + least + (H - least * n) * (ys[i + 1] - ys[i]) / max);
  const rs = at.map(v => Math.round(v) + 0.5);                    // each tick on a whole pixel row, so its line is drawn sharp
  RL.ys = ys; RL.rs = rs; RL.max = max;
  railItems.forEach((li, i) => { const hit = clamp(Math.min(i ? rs[i] - rs[i - 1] : 30, rs[i + 1] - rs[i]), 14, 30), odd = hit % 2 ? hit : hit - 1; li.style.top = (rs[i] - odd / 2) + 'px'; li.style.height = odd + 'px'; });
  const tall = Math.round(rs[n]) + 16; railOl.style.height = tall + 'px'; railOl.style.setProperty('--r0', rs[0] + 'px'); railOl.style.setProperty('--rn', rs[n] + 'px');
  rail.style.setProperty('--rt', Math.round((vh + 38 - tall) / 2) + 'px'); rail.classList.add('laid');   // centred in the room under the bar, on a whole pixel
}
railLayout(); addEventListener('resize', railLayout); if (document.fonts && document.fonts.ready) document.fonts.ready.then(railLayout);
if ('ResizeObserver' in window) { const ro = new ResizeObserver(railLayout); ro.observe($('#main')); ro.observe($('#foot')); }

/* each frame: the rocket sits where the page is (or under the hand that holds it), and says which part it is over */
let pull = null, railR = -1, rkPart = -1, rkNow = -1;
function railFrame(sy) {
  const r = pull ? pull.r : railAt(sy);
  if (r !== railR) { railR = r; rocket.style.transform = `translateY(${r.toFixed(2)}px)`; }
  const i = Math.min(parts.length - 1, seg(RL.rs, r + 0.05)), now = Math.round(clamp((pull ? pageAt(r) : sy) / RL.max) * 100);
  if (i !== rkPart) { rkPart = i; const s = parts[i]; rkNo.textContent = s.no; rkName.textContent = s.name; rocket.setAttribute('aria-valuetext', s.no + ' ' + s.name);
    railItems.forEach((li, k) => { li.classList.toggle('on', k === i); if (k === i) li.firstChild.setAttribute('aria-current', 'true'); else li.firstChild.removeAttribute('aria-current'); }); }
  if (now !== rkNow) { rkNow = now; rocket.setAttribute('aria-valuenow', now); }
}
/* pulling it: the page is scrolled to wherever the rocket is held, at once, so the story scrubs under the hand */
function pullTo(clientY) {
  if (Math.abs(clientY - pull.y0) > 2) pull.moved = true; if (!pull.moved) return;
  let r = clamp(clientY - pull.top - pull.grab, RL.rs[0], RL.rs[RL.rs.length - 1]);
  for (const t of RL.rs) if (Math.abs(r - t) < 0.8) r = t;       // a mouse moves a whole pixel at a time: on a tick's row it is on the tick, so a pull to a tick is that part's exact start
  const y = Math.round(pageAt(r)); pull.r = r;
  scrollTo({ top: y, behavior: 'instant' });
  /* the scenes ease toward the scroll; on a long pull they are kept within a screen and a half of it, so they stay with the hand */
  const lag = y - syS, most = vh * 1.5; if (Math.abs(lag) > most) syS = y - Math.sign(lag) * most;
}
function pullEnd(e) {
  if (!pull || (e && e.pointerId !== undefined && e.pointerId !== pull.id)) return;
  const id = pull.id, pressed = !pull.moved && e && e.type === 'pointerup'; pull = null; rocket.classList.remove('held'); html.classList.remove('pulling'); rocket.setAttribute('data-cursor', 'Drag');
  try { if (rocket.hasPointerCapture(id)) rocket.releasePointerCapture(id); } catch (err) {}
  /* a press that never moved was not a pull: if a tick lies under the rocket there, it was a press on that tick */
  if (pressed) { const a = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.matches && n.matches('#rail li a')); if (a) a.click(); }
}
rocket.addEventListener('pointerdown', e => {
  if (pull || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); rocket.focus({ preventScroll: true });       // no text selection, no page drag; the keys work from here on
  try { rocket.setPointerCapture(e.pointerId); } catch (err) {}   // so a pull that leaves the rail, or the window, is still followed and still ends
  const top = railOl.getBoundingClientRect().top;
  pull = { id: e.pointerId, top, grab: e.clientY - top - railR, r: railR, y0: e.clientY, moved: false };   // grab: where on the rocket it was caught, so it does not jump under the pointer
  rocket.classList.add('held'); html.classList.add('pulling'); rocket.removeAttribute('data-cursor');
});
rocket.addEventListener('pointermove', e => { if (pull && e.pointerId === pull.id) pullTo(e.clientY); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => rocket.addEventListener(t, pullEnd));
addEventListener('blur', () => pullEnd());
rocket.addEventListener('dragstart', e => e.preventDefault());
/* the ring and the name show for the keyboard only (a browser's own guess at that is thrown by a press handled here) */
let byKeys = false; addEventListener('keydown', () => { byKeys = true; }, true); addEventListener('pointerdown', () => { byKeys = false; }, true);
rocket.addEventListener('focus', () => rocket.classList.toggle('keys', byKeys)); rocket.addEventListener('blur', () => rocket.classList.remove('keys'));
/* by keyboard: up and down a step, page up and page down a part, home and end the two ends */
let keyY = 0, keyT = -1e9;
rocket.addEventListener('keydown', e => {
  const k = e.key; if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(k) || e.altKey || e.ctrlKey || e.metaKey) return;
  e.preventDefault(); rocket.classList.add('keys'); const now = performance.now(), from = now - keyT < 700 ? keyY : scrollY, i = seg(RL.ys, from + 2); let y;   // from: where the last key was heading, if it is still on its way
  if (k === 'ArrowDown') y = from + vh * 0.5; else if (k === 'ArrowUp') y = from - vh * 0.5;
  else if (k === 'PageDown') y = RL.ys[i + 1]; else if (k === 'PageUp') y = from > RL.ys[i] + 4 ? RL.ys[i] : RL.ys[Math.max(0, i - 1)];
  else y = k === 'Home' ? 0 : RL.max;
  keyY = clamp(Math.round(y), 0, RL.max); keyT = now;
  if (k.startsWith('Arrow')) scrollTo({ top: keyY, behavior: STILL ? 'auto' : 'smooth' }); else goY(keyY);
});

/* a move to another part: glide when it is near, cut through black when it is far */
const flash = $('#flash');
function goY(y) {
  const far = Math.abs(y - scrollY) > vh * 2.5;
  if (!far || STILL) { scrollTo({ top: y, behavior: STILL ? 'auto' : 'smooth' }); return; }
  flash.style.background = '#101010'; flash.style.transition = 'opacity .22s'; flash.style.opacity = 1;
  setTimeout(() => { scrollTo({ top: y, behavior: 'instant' }); syS = y; setTimeout(() => { flash.style.transition = 'opacity .5s'; flash.style.opacity = 0; }, 90); }, 230);
}
function goTo(id) { const s = byId[id]; if (!s) return; measure(); goY(landAt(s)); }
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href').slice(1); if (!byId[id]) return;
  e.preventDefault(); if (menu.open) menu.close(); goTo(id); history.replaceState(null, '', '#' + id);
  const sec = byId[id].sec; sec.setAttribute('tabindex', '-1'); sec.focus({ preventScroll: true });   // the keyboard goes with the jump: the next Tab carries on from the part just reached
});

/* ───────── the scenes' own furniture ───────── */
/* 00 and 01, the opening and the system: their timeline, their places and what is written on them are in sysmap.js */
const sys = GL ? safe('system', () => initSystem({ byId, onStep: i => { if (sound) sound.step(i); } })) : null;
/* a jump to the system lands on the finished map, not on its first pixel */
function landIn(s) { return s.id === 'system' && sys && GL ? sys.land() * Math.max(0, s.h - vh) : 0; }

/* 05 the map: nine territories, nearest Bury first. Each is a card joined to its pin on the globe by a fine line; the same
   list is what a keyboard walks, and where there is no room beside the globe it is stepped through one card at a time */
const mpItems = $$('#mpList li'), mpList = $('#mpList'), mpN = mpItems.length; let mpPin = -1;
const MAP_A = 0.44, MAP_B = 0.895;                              // the stretch of the map scene the nine stops share (before it: the rise, the turn by day, nightfall)
const mpDeck = matchMedia('(max-width: 1199px), (max-height: 599px)');
/* pressing a territory (its card, its pin, or the steps) takes the story to it, and the globe comes round */
function mapTo(i) { if (!GL) return; const s = byId.map; measure(); scrollTo({ top: s.top + (MAP_A + (clamp(i, 0, mpN - 1) + 0.5) / mpN * (MAP_B - MAP_A)) * (s.h - vh), behavior: STILL ? 'auto' : 'smooth' }); }
const mpLines = mpItems.map(li => svg('line', { class: li.classList.contains('primary') ? 'primary' : null }, $('#mpLines')));
const mpPins = mpItems.map((li, i) => { const b = el('button.xm-pin' + (li.classList.contains('primary') ? '.primary' : ''), { type: 'button', tabindex: -1, onclick: () => mapTo(i) }); const s = svg('svg', { viewBox: '0 0 18 24' }, b); svg('path', { d: 'M9 23.2 3.6 11.4A6.6 6.6 0 1 1 14.4 11.4Z' }, s); svg('circle', { cx: 9, cy: 7.6, r: 2.3 }, s); $('#mpPins').append(b); return b; });
mpItems.forEach((li, i) => { const b = $('button', li); b.addEventListener('click', () => mapTo(i)); b.addEventListener('focus', () => { if (GL && i !== mpPin && b.matches(':focus-visible')) mapTo(i); }); });
const mpStep = $('#mpStep'), mpCount = el('b', { text: '1' });
{ const arrow = (d, label, by) => { const b = el('button', { type: 'button', 'aria-label': label, onclick: () => mapTo(Math.max(0, mpPin) + by) }); svg('path', { d }, svg('svg', { viewBox: '0 0 14 14', 'aria-hidden': 'true' }, b)); return b; };
  mpStep.append(arrow('M9 2 4 7l5 5', 'The territory before', -1), el('p', null, mpCount, ' / ' + mpN), arrow('M5 2l5 5-5 5', 'The next territory', 1));
  let x0 = 0, y0 = 0; mpList.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });    // a swipe across the card steps too
  mpList.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (mpDeck.matches && Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) mapTo(Math.max(0, mpPin) + (dx < 0 ? 1 : -1)); }, { passive: true }); }
function setPin(i) { if (i === mpPin) return; mpPin = i; [mpItems, mpPins, mpLines].forEach(set => set.forEach((n, k) => n.classList.toggle('on', k === i))); if (i >= 0) { mpCount.textContent = i + 1; if (sound) sound.tick(); } }

const focusBox = $('#focusBox'), mp = $('#mp'), rs = $('#rs'), rsHead = $('#rs .sh'), rsList = $('#rsCards'), rsCards = $$('#rsCards li'), rsMech = $('#rsMech'), loBox = $('#lo'), loHead = $('#loHead'), loClose = $('#loClose'), loCtl = $('#loCtl');
let rsAt = -1;
const setOT = (n, o, y = 0, x = 0) => { n.style.opacity = o.toFixed(3); n.style.transform = (x || y) ? `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)` : 'none'; n.style.pointerEvents = o < 0.4 ? 'none' : ''; n.style.visibility = o < 0.004 ? 'hidden' : 'visible'; };

function drive() {
  const F = byId.focus.p, M = byId.map.p, R = byId.raise.p, L = byId.liftoff.p; let k;
  /* the way down: cloud clears to Freedom Global's light sheet (w-clouds.js keeps the same times), the words arrive, the screen holds, then it rides up into the next cloud */
  { const m = drive.fo || (drive.fo = {}), put = (n, v) => { if (m[n] !== v) byId.focus.sec.style.setProperty('--' + n, m[n] = v); };
    k = span(F, 0.255, 0.345); const up = smooth((F - 0.6) / 0.16), o = k * (1 - span(F, 0.665, 0.755));
    put('sheet', (span(F, 0.2, 0.275) * (1 - span(F, 0.69, 0.77))).toFixed(3)); put('orbk', (span(F, 0.23, 0.31) * (1 - span(F, 0.585, 0.675))).toFixed(3)); put('wash', o.toFixed(2));
    put('zoom', (lerp(0.86, 1.16, clamp((F - 0.19) / 0.4)) + span(F, 0.575, 0.69) * 0.4).toFixed(4)); put('rise', (-up * vh * 0.18).toFixed(1) + 'px');   /* the planet draws near through the hold, then swells and thins as the screen leaves */
    const over = byId.focus.on ? Math.max(0, focusBox.offsetHeight - (vh - 88)) : 0;      /* on a screen too short for the whole box it pans through its hold, as a page would */
    focusBox.style.opacity = o.toFixed(3); focusBox.style.visibility = o < 0.004 ? 'hidden' : 'visible'; focusBox.style.pointerEvents = o < 0.4 ? 'none' : ''; focusBox.classList.toggle('on', k > 0.6);
    focusBox.style.transform = `translate3d(-50%,calc(-50% + ${(58 * (1 - k) + over * (0.5 - span(F, 0.37, 0.58)) - up * vh * 0.6).toFixed(1)}px),0) scale(${(0.985 + 0.015 * k).toFixed(4)})`; }
  /* 05: the map: which territory the story is on (the cards, pins and ink follow the globe, in placeMap) */
  setPin(!byId.map.on || M < MAP_A - 0.012 || M > MAP_B + 0.06 ? -1 : clamp(Math.floor((M - MAP_A) / (MAP_B - MAP_A) * mpN), 0, mpN - 1));
  /* 09: the raise: once the climb is through the first cloud the heading comes up, then the five cards one by one, then
     the mechanism; it holds complete, and leaves as the sky settles to night */
  const rOn = byId.raise.on ? 1 - span(R, 0.84, 0.91) : 0; { const a = span(R, 0.05, 0.115); setOT(rsHead, a * rOn, 18 * (1 - a)); }
  rsCards.forEach((c, i) => { const a = span(R, 0.15 + i * 0.095, 0.22 + i * 0.095); setOT(c, a * rOn, 26 * (1 - a)); });
  setOT(rsMech, span(R, 0.63, 0.7) * rOn, 0);
  { const at = clamp(Math.floor((R - 0.15) / 0.095), 0, rsCards.length - 1); if (at !== rsAt) { rsAt = at; rsCards.forEach((c, i) => c.classList.toggle('on', i === at)); } rs.classList.toggle('deep', R > 0.13); if (byId.raise.on && vw < 900) { padRooms.sky = rsList.offsetTop; padRooms.skyTop = rsHead.offsetTop + rsHead.offsetHeight; } }   /* on a phone: the card being read is open, the lede has made room, and the moon sits just above the cards (never behind the words) */
  /* 11: mission control and the closing words ride in with the scene; the console comes up once the rocket is standing.
     On a phone the closing words then give the rocket their room */
  { const lo = byId.liftoff, a = lo.on ? span(lo.x, -0.6, -0.22) : 0, b = lo.on ? span(lo.x, -0.42, -0.02) * (vw < 900 ? 1 - span(L, 0.6, 0.7) : 1) : 0, c = lo.on ? span(L, 0.64, 0.76) : 0;
    /* past the end of the scene (the footer coming up under it) the words hold their place on the screen for as long as the console leaves them room */
    let hold = 0; if (lo.pe > 1) { const low = vw < 900 ? loHead : loClose; hold = Math.min((lo.x - lo.len) * vh, Math.max(0, loCtl.offsetTop - low.offsetTop - low.offsetHeight - 24)); }
    setOT(loHead, a, 22 * (1 - a) + hold); setOT(loClose, b, 22 * (1 - span(lo.x, -0.42, -0.02)) + hold); setOT(loCtl, c, 26 * (1 - c)); loBox.classList.toggle('land', L > 0.06); }
}

/* ───────── sound (made in the browser) ─────────
   A browser plays nothing until the visitor has pressed or typed something, so the galaxy starts by itself, quietly, on
   the first press or key. The speaker in the bar turns it off and on again, and the choice is kept for the next visit. */
let sound = null, soundOn = true; const soundBtn = $('#soundBtn');
try { soundOn = localStorage.getItem('fg-sound') !== 'off'; } catch (e) {}
const showSound = () => { soundBtn.setAttribute('aria-pressed', String(soundOn)); soundBtn.setAttribute('aria-label', soundOn ? 'Sound, on' : 'Sound, off'); };
showSound();
const soundKit = import('./sound.js').then(m => { sound = m.createSound(); sound.act(curPart ? curPart.id : 'top'); return sound; }).catch(e => { console.error('sound', e); return null; });
const FIRST = ['pointerdown', 'keydown', 'touchend'];             // what a browser accepts as the visitor asking (a wheel scroll is not one)
function wake() {
  if (sound && sound.running) { FIRST.forEach(t => removeEventListener(t, wake, true)); return; }   // it is playing: stop listening
  if (!soundOn) return;
  if (sound) sound.setOn(true); else soundKit.then(s => { if (s && soundOn) s.setOn(true); });
}
FIRST.forEach(t => addEventListener(t, wake, true));
soundBtn.addEventListener('click', async () => {
  soundOn = !soundOn; showSound(); try { localStorage.setItem('fg-sound', soundOn ? 'on' : 'off'); } catch (e) {}
  const s = sound || await soundKit; if (s) s.setOn(soundOn);
});

/* ───────── the loop ───────── */
let world = null, syS = scrollY, last = performance.now(), curPart = null, navTheme = '', lastMode; const veilPaper = $('#veilPaper');
function pickWorld(mid) {
  /* the world behind whatever fills the middle of the screen; behind paper, whichever world is still in view at an edge */
  let at = sections.find(s => mid >= s.top && mid < s.top + s.h) || sections[sections.length - 1];
  if (at.world) return at; const near = sections.filter(s => s.world && s.top < syS + vh && s.top + s.h > syS);
  return near.length ? near.sort((a, b) => Math.abs(a.top + (a.top < at.top ? a.h : 0) - mid) - Math.abs(b.top + (b.top < at.top ? b.h : 0) - mid))[0] : null;
}
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const sy = scrollY; syS += (sy - syS) * (STILL ? 1 : 1 - Math.exp(-dt * 10)); if (Math.abs(sy - syS) < 0.4) syS = sy;
  sections.forEach(s => { s.x = (syS - s.top) / vh; s.len = Math.max(0.001, (s.h - vh) / vh); s.pe = s.x / s.len; s.p = clamp(s.pe); s.on = syS + vh > s.top && syS < s.top + s.h; });
  /* chrome: which part, which colours */
  const mid = syS + vh * 0.5; let part = parts[0]; for (const s of parts) if (mid >= s.top) part = s;
  if (part !== curPart) { curPart = part; $('#nvNo').textContent = part.no; $('#nvName').textContent = part.name; navLinks.forEach(a => { const on = a === navOf[part.id]; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); if (sound) sound.act(part.id); }
  const under = sections.find(s => syS + 32 >= s.top && syS + 32 < s.top + s.h) || sections[0];
  let theme = under.sec.classList.contains('night') ? 'night' : under.theme; if (under.id === 'focus' && GL) theme = under.p > 0.028 ? 'light' : 'dark'; if (!GL && theme === 'dark') theme = 'night';
  { const end = sections[sections.length - 1]; if (syS + vh > end.top + end.h + 2) theme = 'night'; }   // past the last scene its stage slides up under the bar as the footer comes in: the bar goes solid
  if (theme !== navTheme) { navTheme = theme; body.dataset.nav = theme; }
  railFrame(sy);
  if (GL) drive();
  if (journey) journey.frame(vh);
  if (world) {
    const w = pickWorld(mid); const mode = w ? w.world : null; if (mode !== lastMode) { lastMode = mode; world.setMode(mode); }
    if (byId.map.on) mapRoom(); if (byId.liftoff.on) padRoom();
    world.update({ top: byId.top, system: byId.system, focus: byId.focus, map: byId.map, raise: byId.raise, liftoff: byId.liftoff, sys: sys.frame(), pin: mpPin, globeRoom, pad: padRooms, skyTurn: syS / Math.max(1, vh) * 0.04 }, dt, now / 1000);
    veilPaper.style.setProperty('--v', world.veil.toFixed(3));   /* how far the paper has risen over the last of the cloud */
    sys.after(world.out); placeTags();
  }
  requestAnimationFrame(frame);
}
const mapStage = $('#map .stage');
/* and at the map: where the globe stands on the stage (under the words, as large as the room allows) and where each card
   goes: Europe's five down the left of it and Asia's four down the right, or all nine in one place below it */
const globeRoom = { cx: 0, cy: 0, r: 100, cols: true, a: MAP_A, b: MAP_B }, mpHead = $('.xm .sh'), mpSlots = mpItems.map(() => ({ x: 0, y: 0, w: 0, h: 0 })); let mpKey = '';
function mapRoom() {
  const st = mapStage.getBoundingClientRect(), H = st.height, hb = mpHead.getBoundingClientRect().bottom - st.top, g = globeRoom, cols = g.cols = !mpDeck.matches, ch = Math.max(...mpItems.map(li => li.offsetHeight)), pe = byId.map.pe;
  const deckK = cols ? 0 : span(pe, MAP_A - 0.07, MAP_A - 0.012) * (1 - span(pe, MAP_B + 0.02, MAP_B + 0.07));          // below the globe, the card takes its room only while there are cards
  const y0 = hb + (cols ? 14 : 10), y1 = cols ? H - 20 : lerp(H - 18, mpList.offsetTop - 16, deckK), gut = mpHead.offsetLeft;
  g.cx = vw / 2; g.cy = (y0 + y1) / 2; g.r = Math.max(60, Math.min((y1 - y0) / 2.16, cols ? (vw - 2 * gut - 2 * 264 - 2 * 60) / 2 : vw / 2 - Math.max(22, vw * 0.06)));
  mpStep.style.opacity = deckK.toFixed(3); mpStep.style.pointerEvents = deckK < 0.5 ? 'none' : '';
  const key = [vw, Math.round(H), Math.round(hb), cols, ch].join(); if (key === mpKey) return; mpKey = key;
  const gap = clamp(g.r * 0.2, 48, 96), cw = clamp(vw / 2 - g.r - gap - gut, 264, 340), gapY = Math.max(6, Math.min(g.r * 0.34, (y1 - y0 - ch) / 4) - ch);   // spaced in step with the globe, so the lines fan the same way at every size (and never cross)
  g.top = y0 - 4;
  let nL = 0, nR = 0; mpItems.forEach((li, i) => { const s = mpSlots[i], left = s.left = li.classList.contains('eu'), n = left ? 5 : 4, k = left ? nL++ : nR++;
    if (cols) { s.w = cw; s.h = ch; s.x = left ? vw / 2 - g.r - gap - cw : vw / 2 + g.r + gap; s.y = clamp(g.cy - (n * ch + (n - 1) * gapY) / 2, y0, Math.max(y0, H - 12 - n * ch - (n - 1) * gapY)) + k * (ch + gapY); li.style.width = cw + 'px'; li.style.left = s.x.toFixed(1) + 'px'; li.style.top = s.y.toFixed(1) + 'px'; }
    else { li.style.width = li.style.left = li.style.top = ''; s.x = mpList.offsetLeft + li.offsetLeft; s.y = mpList.offsetTop + li.offsetTop; s.w = li.offsetWidth; s.h = li.offsetHeight; } });
}
/* and where the rocket may stand on a phone: under the closing words while it lands, then between the heading and the console */
const padRooms = { a0: 0, a1: 1, b0: 0, b1: 1, sky: 0, skyTop: 0 };
function padRoom() { padRooms.a0 = loClose.offsetTop + loClose.offsetHeight + 14; padRooms.a1 = vh - 20; padRooms.b0 = loHead.offsetTop + loHead.offsetHeight + 12; padRooms.b1 = loCtl.offsetTop - 12; }
/* the map says where its globe and pins are on screen; its cards, pins and lines follow */
function placeTags() { placeMap(); }
/* the map's furniture follows its globe: the ink of the words (dark on the white sheet, light once its night has fallen),
   the bar across the top with it, and each territory's pin, card and the line between them while the globe shows it */
const MP_INK = [['--fg', [16, 16, 16], [244, 241, 235]], ['--fg2', [74, 74, 70], [180, 177, 170]], ['--fg3', [110, 108, 102], [138, 135, 129]], ['--hot-t', [198, 15, 110], [255, 45, 141]]]; let mpInk = -1;
function placeMap() {
  /* live: the globe is being drawn. Until it is (the world follows a fast scroll a moment behind) the top of the scene is
     plain white with its words in ink, which is exactly what the globe's first frame shows, so nothing jumps when it takes over */
  const M = byId.map, o = world.map, live = world.mode === 'globe' && o && o.live, n = live ? o.night : 0, lit = n < 0.5 ? 0 : 1;
  M.sec.classList.toggle('live', !!live);
  setOT(mp, live ? 1 - span(M.pe, MAP_B + 0.005, MAP_B + 0.06) : M.pe < 0.5 ? 1 : 0);
  /* the words go out with the light and come back with the night, changing ink while they are away (halfway down, the sheet is the grey of either ink) */
  if (lit !== mpInk) { mpInk = lit; MP_INK.forEach(([k, a, b]) => mp.style.setProperty(k, 'rgb(' + (lit ? b : a).join() + ')')); }
  mpHead.style.opacity = Math.max(1 - span(n, 0.04, 0.42), span(n, 0.6, 0.98)).toFixed(3); if (!live) return;
  if (syS + 32 >= M.top && syS + 32 < M.top + M.h) { const want = lit ? 'dark' : 'light'; if (body.dataset.nav !== want) body.dataset.nav = want; }
  /* beside the globe, a column of cards moves up to stay level with the pins of the cards it is still showing (as far as
     the words above allow), so when its upper cards have gone the ones left sit by their own pins; the order never changes */
  const cols = globeRoom.cols, ride = [0, 0];
  if (cols) for (const left of [true, false]) { let sa = 0, sy = 0, lo = -1e9;
    mpSlots.forEach((s, i) => { if (s.left !== left) return; const a = o.pins[i].a; sa += a; sy += a * (o.pins[i].y - 15.6 - s.y - s.h / 2); lo = Math.max(lo, globeRoom.top - s.y - (1 - Math.min(1, a * 24)) * 3000); });
    if (sa > 0.0005) ride[left ? 0 : 1] = Math.max(lo, Math.min(0, sy / sa)); }
  mpItems.forEach((li, i) => {
    const p = o.pins[i], s = mpSlots[i], on = i === mpPin, a = cols ? p.a : on ? p.k : 0, pa = cols || on ? p.a : 0, pin = mpPins[i], ln = mpLines[i];
    const dx = cols ? (1 - a) * (s.left ? -14 : 14) : 0, dy = cols ? ride[s.left ? 0 : 1] : (1 - a) * 14;      // a card comes in from the edge it stands by (from below, where there is one at a time)
    li.style.opacity = a.toFixed(3); li.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0)`; li.style.pointerEvents = a < 0.4 ? 'none' : '';
    pin.style.opacity = pa.toFixed(3); pin.style.visibility = pa < 0.01 ? 'hidden' : 'visible'; if (pa >= 0.01) pin.style.transform = `translate3d(${(p.x - 12).toFixed(1)}px,${(p.y - 30).toFixed(1)}px,0)`;
    const la = Math.min(a, pa); ln.style.opacity = la.toFixed(3); if (la < 0.01) return;
    /* from the card's edge nearest the globe to the pin: to its head beside the globe, to its foot from below it */
    let x1, y1, x2, y2; if (cols) { x1 = (s.left ? s.x + s.w : s.x) + dx; y1 = s.y + s.h / 2 + dy; x2 = p.x; y2 = p.y - 15.6; const d = Math.hypot(x2 - x1, y2 - y1) || 1, cut = on ? 9.6 : 7.8; x2 -= (x2 - x1) / d * cut; y2 -= (y2 - y1) / d * cut; }
    else { x1 = clamp(p.x, s.x + 18, s.x + s.w - 18); y1 = s.y + dy; x2 = p.x; y2 = p.y + 4; }
    ln.setAttribute('x1', x1.toFixed(1)); ln.setAttribute('y1', y1.toFixed(1)); ln.setAttribute('x2', x2.toFixed(1)); ln.setAttribute('y2', y2.toFixed(1));
  });
}

/* ───────── liftoff ───────── */
const loBtn = $('#liftoffBtn'), loCount = $('#loCount b'), loT = loCount.previousSibling || document.createTextNode(''); let launching = false;   // loT: the "T-" in front of the clock
loBtn.addEventListener('click', async () => {
  if (launching) return; launching = true;
  if (!GL || !world) { scrollTo({ top: 0, behavior: STILL ? 'auto' : 'smooth' }); launching = false; return; }
  body.classList.add('launching'); if (sound) sound.countdown();
  for (let s = 3; s >= 1; s--) { loCount.textContent = '00:0' + s; await new Promise(r => setTimeout(r, 1000)); }
  loT.nodeValue = ''; loCount.textContent = 'LIFTOFF'; if (sound) sound.launch();
  await world.launch();                                        // the burn: resolves when the rocket is through the cloud
  flash.style.background = '#F4F1EB'; flash.style.transition = 'opacity .5s'; flash.style.opacity = 1;
  await new Promise(r => setTimeout(r, 520));
  scrollTo({ top: 0, behavior: 'instant' }); syS = 0; world.arrive(); body.classList.remove('launching'); loT.nodeValue = 'T-'; loCount.textContent = '00:03';
  await new Promise(r => setTimeout(r, 160)); flash.style.transition = 'opacity 1.4s'; flash.style.opacity = 0; launching = false;
});

/* ───────── start ───────── */
const ldPct = $('#ldPct'), ldText = $('#ldText');
function loaded() { html.classList.remove('booting'); counters($('#kpis'), true); if (location.hash && byId[location.hash.slice(1)] && location.hash !== '#top') { measure(); scrollTo({ top: landAt(byId[location.hash.slice(1)]), behavior: 'instant' }); syS = scrollY; } }
async function start() {
  measure(); addEventListener('resize', measure); if ('ResizeObserver' in window) new ResizeObserver(measure).observe($('#main'));
  /* a phone turned on its side (or back): the page is laid out differently, so start it again where the reader was */
  const wasShort = html.classList.contains('short'); addEventListener('resize', () => { const short = innerHeight < 480 && innerWidth > innerHeight; if (short !== wasShort && !launching) { if (curPart && curPart.id !== 'top') history.replaceState(null, '', '#' + curPart.id); location.reload(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if (!coarse && !STILL) import('./cursor.js').then(m => m.createCursor({ coarse, reduce: STILL })).catch(() => {});
  if (GL) {
    try {
      const { createWorld } = await import('./world.js');
      world = createWorld({ canvas: $('#world'), onProgress: (k, text) => { ldPct.textContent = two(Math.round(k * 100)); if (text) ldText.textContent = text; } });
      window.freedom = { world, goTo, sections };
    } catch (e) { console.error('world', e); world = null; GL = false; html.classList.remove('gl'); html.classList.add('no-gl'); measure(); }
  }
  requestAnimationFrame(now => { last = now; frame(now); });
  if (world) { await world.ready; await world.intro(); }
  loaded();
}
if (!GL) history.scrollRestoration = 'auto'; else { history.scrollRestoration = 'manual'; }
start();

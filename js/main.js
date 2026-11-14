/* The page: content first (chapters, charts, team: none of it needs WebGL), then the world behind it, then one loop that
   reads the scroll and tells every pinned scene, the world and the chrome where the story is. */
import { DATA } from './data.js';
import { $, $$, el, svg, clamp, lerp, span, smooth, reveals, counters, lightDismiss, onSeen, STILL } from './kit.js';
import { initJourney } from './journey.js';
import { initCharts } from './charts.js';
import { initCrew } from './crew.js';

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

const menu = $('#menu'), menuList = $('#menuList');
parts.forEach(s => menuList.append(el('li', null, el('a', { href: '#' + s.id }, el('i', { text: s.no }), s.name))));
$('#menuBtn').addEventListener('click', () => menu.showModal());

const rail = $('#rail'), railOl = el('ol');
const rocket = el('span.rk', { 'aria-hidden': 'true' }); { const s = svg('svg', { viewBox: '0 0 13 26' }, rocket); svg('path', { d: 'M6.5 0C9.6 3.4 10.6 7.4 10.6 12v6.2H2.4V12C2.4 7.4 3.4 3.4 6.5 0Z', fill: 'currentColor' }, s); svg('path', { d: 'M2.4 13.5 0 19.5h2.4ZM10.6 13.5l2.4 6h-2.4Z', fill: 'currentColor', opacity: '.7' }, s); svg('path', { d: 'M4.4 19.4h4.2L6.5 26Z', fill: '#F4F1EB' }, s); svg('circle', { cx: 6.5, cy: 8.4, r: 1.7, fill: '#101010' }, s); }
const railItems = parts.map(s => { const li = el('li', null, el('a', { href: '#' + s.id, 'aria-label': s.no + ' ' + s.name }, el('span', { text: s.name }), el('i'))); railOl.append(li); return li; });
rail.append(railOl, rocket);

/* a move to another part: glide when it is near, cut through black when it is far */
const flash = $('#flash');
function goTo(id) {
  const s = byId[id]; if (!s) return; measure(); const y = Math.round(s.top); const far = Math.abs(y - scrollY) > vh * 2.5;
  if (!far || STILL) { scrollTo({ top: y, behavior: STILL ? 'auto' : 'smooth' }); return; }
  flash.style.background = '#101010'; flash.style.transition = 'opacity .22s'; flash.style.opacity = 1;
  setTimeout(() => { scrollTo({ top: y, behavior: 'instant' }); syS = y; setTimeout(() => { flash.style.transition = 'opacity .5s'; flash.style.opacity = 0; }, 90); }, 230);
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href').slice(1); if (!byId[id]) return;
  e.preventDefault(); if (menu.open) menu.close(); goTo(id); history.replaceState(null, '', '#' + id);
});

/* ───────── the scenes' own furniture ───────── */
/* 01 the system: six stops */
const SYS = [
  { co: 'enterprise', label: 'Enterprise', c: '#FF2D8D', worlds: ['enterprise'] }, { co: 'global', label: 'Global', c: '#6fb6ff', worlds: ['global'] },
  { co: 'facilities', label: 'Facilities', c: '#2fe2a0', worlds: ['facilities'] }, { co: 'distribution', label: 'Distribution', c: '#ff7a3d', worlds: ['distribution'] },
  { co: 'future29', label: 'Form & Freight', c: '#f2c94c', worlds: ['form', 'freight'] }, { co: 'future30', label: 'Fly & Fuel', c: '#b48cff', worlds: ['fly', 'fuel'] }
];
const SYS_A = 0.07, SYS_B = 0.84;                                // the stretch of the system scene the six stops share
const sysEl = $('#sys'), sysCards = $$('#sysCards .card'), sysSteps = $('#sysSteps'); let sysStep = -1;
const sysBtns = SYS.map((s, i) => { const b = el('button', { type: 'button', 'aria-pressed': 'false', style: '--c:' + s.c, text: s.label, onclick: () => stepTo(i) }); sysSteps.append(b); return b; });
function stepTo(i) { const s = byId.system; measure(); const p = SYS_A + (i + 0.5) / SYS.length * (SYS_B - SYS_A); scrollTo({ top: s.top + p * (s.h - vh), behavior: STILL ? 'auto' : 'smooth' }); }
function setSysStep(i) { if (i === sysStep) return; sysStep = i; sysCards.forEach((c, k) => c.classList.toggle('on', k === i)); sysBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); sysEl.classList.toggle('deep', i > 0); labels.forEach(l => l.n.classList.toggle('on', i >= 0 && SYS[i].worlds.includes(l.id))); if (i >= 0 && sound) sound.step(i); }
/* the names that ride beside the worlds */
const LABELS = [['enterprise', 'Enterprise', 'Holding', '#FF2D8D', 0], ['global', 'Global', 'Active', '#6fb6ff', 1], ['facilities', 'Facilities', 'Planned', '#2fe2a0', 2], ['distribution', 'Distribution', 'Planned', '#ff7a3d', 3],
  ['form', 'Form', '2029', '#f2c94c', 4], ['freight', 'Freight', '2029', '#e9b86a', 4], ['fly', 'Fly', '2030+', '#b48cff', 5], ['fuel', 'Fuel', '2030+', '#7d8cff', 5]];
const labels = LABELS.map(([id, name, tag, c, step]) => { const n = el('button.lb', { type: 'button', tabindex: -1, style: '--c:' + c, onclick: () => stepTo(step) }, name, el('em', { text: tag })); $('#sysLabels').append(n); return { id, n, step }; });

/* 05 the map: nine territories */
const mpItems = $$('#mpList li'), mpList = $('#mpList'); let mpPin = -1, mpHold = 0;
const MAP_A = 0.1, MAP_B = 0.92;
const mpTags = mpItems.map((li, i) => { const t = el('span.tg' + (li.classList.contains('primary') ? '.primary' : ''), { text: $('b', li).textContent }); $('#mpTags').append(t); return t; });
function setPin(i, scrollList) { if (i === mpPin) return; mpPin = i; mpItems.forEach((li, k) => li.classList.toggle('on', k === i)); mpTags.forEach((t, k) => t.classList.toggle('on', k === i));
  if (scrollList && i >= 0 && vw < 900) { const li = mpItems[i]; mpList.scrollTo({ left: li.offsetLeft - (mpList.clientWidth - li.clientWidth) / 2, behavior: 'smooth' }); } if (i >= 0 && sound) sound.tick(); }
mpItems.forEach((li, i) => $('button', li).addEventListener('click', () => { const s = byId.map; measure(); if (!GL) return; const p = MAP_A + (i + 0.5) / mpItems.length * (MAP_B - MAP_A); scrollTo({ top: s.top + p * (s.h - vh), behavior: STILL ? 'auto' : 'smooth' }); }));

const heroCopy = $('.hero-copy'), kpis = $('#kpis'), mark = $('#mark'), cue = $('.cue'), markO = $('#markO');
const focusBox = $('#focusBox'), mp = $('#mp'), rsHead = $('#rs .sh'), rsCards = $$('#rsCards li'), rsMech = $('#rsMech'), loClose = $('.lo-close'), loCtl = $('#loCtl');
const setOT = (n, o, y = 0, x = 0) => { n.style.opacity = o.toFixed(3); n.style.transform = (x || y) ? `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)` : 'none'; n.style.pointerEvents = o < 0.4 ? 'none' : ''; n.style.visibility = o < 0.004 ? 'hidden' : 'visible'; };

function drive() {
  const T = byId.top.p, S = byId.system.p, F = byId.focus.p, M = byId.map.p, R = byId.raise.p, L = byId.liftoff.p;
  /* 00: the words leave, the mark opens */
  let k = span(T, 0.16, 0.5); setOT(heroCopy, 1 - k, -50 * k); setOT(kpis, 1 - span(T, 0.1, 0.4), 30 * span(T, 0.1, 0.4)); cue.style.opacity = (1 - span(T, 0.02, 0.12)).toFixed(3);
  k = span(T, 0.16, 0.4); mark.style.opacity = (1 - k).toFixed(3); mark.style.visibility = k > 0.995 ? 'hidden' : 'visible';      /* the letters go before the globe leaves its place among them */
  /* 01: the system comes up, six stops, then the dive */
  const sysIn = byId.system.on ? span(byId.system.pe, -0.02, 0.035) * (1 - span(S, 0.875, 0.93)) : 0; setOT(sysEl, sysIn, 0); sysEl.style.visibility = sysIn < 0.004 ? 'hidden' : 'visible';
  setSysStep(S <= 0 || S > 0.9 ? (S > 0.9 ? -1 : 0) : clamp(Math.floor((S - SYS_A) / (SYS_B - SYS_A) * SYS.length), 0, SYS.length - 1));
  /* the way down: the investment focus rides the clouds */
  k = span(F, 0.06, 0.2); const out = span(F, 0.6, 0.76); setOT(focusBox, k * (1 - out), 0); focusBox.style.transform = `translate(-50%,calc(-50% + ${(70 * (1 - k) - 120 * out).toFixed(1)}px))`;
  /* 05: the map */
  setOT(mp, byId.map.on ? span(byId.map.pe, -0.03, 0.04) * (1 - span(M, 0.955, 1.0)) : 0, 0);
  if (performance.now() - mpHold > 900) setPin(M < 0.04 || !byId.map.on ? -1 : clamp(Math.floor((M - MAP_A) / (MAP_B - MAP_A) * mpItems.length), 0, mpItems.length - 1), true);
  /* 09: the raise */
  const rOn = byId.raise.on ? 1 - span(R, 0.93, 0.995) : 0, rIn = span(byId.raise.pe, -0.03, 0.05); setOT(rsHead, rIn * rOn, 24 * (1 - rIn));
  rsCards.forEach((c, i) => { const a = span(R, 0.1 + i * 0.115, 0.17 + i * 0.115); setOT(c, a * rOn, 0, 60 * (1 - a)); });
  { const a = span(R, 0.7, 0.78); setOT(rsMech, a * rOn, 30 * (1 - a)); }
  /* 11: the closing words, then mission control */
  { const a = span(L, 0.02, 0.12) * (1 - span(L, 0.4, 0.52)); setOT(loClose, byId.liftoff.on ? a : 0, -30 * span(L, 0.4, 0.52)); const b = span(L, 0.54, 0.68); setOT(loCtl, byId.liftoff.on ? b : 0, 30 * (1 - b)); }
}

/* ───────── sound (made in the browser, off until asked for) ───────── */
let sound = null; const soundBtn = $('#soundBtn');
soundBtn.addEventListener('click', async () => {
  if (!sound) { try { sound = (await import('./sound.js')).createSound(); } catch (e) { console.error('sound', e); return; } }
  const on = !sound.on; sound.setOn(on); soundBtn.setAttribute('aria-pressed', String(on)); $('.sl', soundBtn).textContent = on ? 'Sound on' : 'Sound off'; if (on) sound.act(curPart ? curPart.id : 'top');
});

/* ───────── the loop ───────── */
let world = null, syS = scrollY, last = performance.now(), curPart = null, navTheme = '', lastMode, markW = 0; const slot = { x: 0, y: 0, r: 0 }, markMain = $('.mk-main'), veilPaper = $('#veilPaper');
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
  if (part !== curPart) { curPart = part; $('#nvNo').textContent = part.no; $('#nvName').textContent = part.name; railItems.forEach((li, i) => li.classList.toggle('on', parts[i] === part)); $$('.nv-links a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + part.id)); if (sound) sound.act(part.id); }
  const under = sections.find(s => syS + 32 >= s.top && syS + 32 < s.top + s.h) || sections[0];
  let theme = under.sec.classList.contains('night') ? 'night' : under.theme; if (under.id === 'focus' && GL) theme = under.p > 0.86 ? 'light' : 'dark'; if (!GL && theme === 'dark') theme = 'night';
  if (theme !== navTheme) { navTheme = theme; body.dataset.nav = theme; }
  { const i = parts.indexOf(part), nx = parts[i + 1]; const f = nx ? clamp((mid - part.top) / Math.max(1, nx.top - part.top)) : clamp((mid - part.top) / Math.max(1, part.h)); const a = railItems[i], b = railItems[i + 1] || a;
    rocket.style.transform = `translateY(${(lerp(a.offsetTop, b.offsetTop, f) + a.offsetHeight / 2).toFixed(1)}px)`; }
  if (GL) drive();
  if (journey) journey.frame(vh);
  if (world) {
    const w = pickWorld(mid); const mode = w ? w.world : null; if (mode !== lastMode) { lastMode = mode; world.setMode(mode); }
    if (byId.top.p < 0.14 || !slot.r) { const o = markO.getBoundingClientRect(); slot.x = o.left + o.width / 2; slot.y = o.top + o.height / 2; slot.r = o.width / 2; markW = markMain.getBoundingClientRect().width; }
    if (byId.system.on || byId.top.on) sysRoom(); if (byId.map.on) mapRoom(); if (byId.liftoff.on) padRoom();
    world.update({ top: byId.top, system: byId.system, focus: byId.focus, map: byId.map, raise: byId.raise, liftoff: byId.liftoff, sysStep, sysWorlds: sysStep >= 0 ? SYS[sysStep].worlds : [], pin: mpPin, slot, markW, room, globeRoom, pad: padRooms, skyTurn: syS / Math.max(1, vh) * 0.04 }, dt, now / 1000);
    veilPaper.style.opacity = world.veil.toFixed(3);
    placeTags();
  }
  requestAnimationFrame(frame);
}
/* the part of the screen the system may fill: beside the words on a wide screen, between the words and the card on a phone */
const room = { x0: 0, y0: 0, x1: 1, y1: 1 }, sysHead = $('.sys .sh'), sysStats = $('.sys-stats'), sysStage = $('#system .stage'), mapStage = $('#map .stage');
function sysRoom() {   /* measured inside the stage, as if it were already pinned, so the system never rides in from off screen */
  const o = sysStage.getBoundingClientRect().top;
  if (vw < 900) { const h = sysHead.getBoundingClientRect(), st = sysStats.getBoundingClientRect(), c = sysCards[Math.max(0, sysStep)].getBoundingClientRect(), top = Math.max(h.bottom, sysEl.classList.contains('deep') ? 0 : st.bottom) - o;
    room.x0 = 4; room.x1 = vw - 4; room.y0 = top + 44; room.y1 = Math.max(top + 170, c.top - o - 6); }
  else { const h = sysHead.getBoundingClientRect(); room.x0 = Math.min(vw * 0.44, h.left + 480); room.x1 = vw - 58; room.y0 = h.top - o - 20; room.y1 = h.top - o + vh - 150; }
}
/* and the part the globe may fill at the map: between the words and the list, whichever way they are laid out */
const globeRoom = { x0: 0, y0: 0, x1: 1, y1: 1 }, mpHead = $('.mp .sh'), mpLegend = $('.mp-legend');
function mapRoom() {
  const o = mapStage.getBoundingClientRect().top, h = mpHead.getBoundingClientRect(), l = mpList.getBoundingClientRect(), g = globeRoom, ht = h.top - o, hb = h.bottom - o;
  if (vw < 900) { g.x0 = 0; g.x1 = vw; g.y0 = hb + 6; g.y1 = Math.max(hb + 150, l.top - o - 8); }
  else if (l.left > h.right + 80) { g.x0 = h.right + 10; g.x1 = l.left - 34; g.y0 = ht; g.y1 = ht + vh - 130; }
  else { g.x0 = Math.max(h.right, l.right) + 44; g.x1 = vw - 60; g.y0 = ht - 10; g.y1 = ht + vh - 120; }
}
/* and where the rocket may stand on a phone: under the closing words, then above mission control */
const padRooms = { a0: 0, a1: 1, b0: 0, b1: 1 };
function padRoom() { padRooms.a0 = loClose.offsetTop + loClose.offsetHeight + 14; padRooms.a1 = vh - 20; padRooms.b0 = 70; padRooms.b1 = loCtl.offsetTop - 12; }
/* the world says where its worlds and pins are on screen; the names follow */
function placeTags() {
  const out = world.out; if (!out) return;
  labels.forEach(l => { const o = out.labels[l.id]; if (!o || o.a < 0.02) { l.n.style.opacity = 0; l.n.style.visibility = 'hidden'; return; } l.n.style.visibility = 'visible'; l.n.style.opacity = o.a.toFixed(2); l.n.style.transform = `translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0) translate(-50%,-100%)`; });
  mpTags.forEach((t, i) => { const o = out.pins[i]; if (!o || o.a < 0.02) { t.style.opacity = 0; t.style.visibility = 'hidden'; return; } t.style.visibility = 'visible'; t.style.opacity = o.a.toFixed(2); t.style.transform = `translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0) translate(${o.left ? '-100%' : '0'},-50%)`; });
}

/* ───────── liftoff ───────── */
const loBtn = $('#liftoffBtn'), loCount = $('#loCount b'); let launching = false;
loBtn.addEventListener('click', async () => {
  if (launching) return; launching = true;
  if (!GL || !world) { scrollTo({ top: 0, behavior: STILL ? 'auto' : 'smooth' }); launching = false; return; }
  body.classList.add('launching'); if (sound) sound.countdown();
  for (let s = 3; s >= 1; s--) { loCount.textContent = '00:0' + s; await new Promise(r => setTimeout(r, 1000)); }
  loCount.textContent = '00:00'; if (sound) sound.launch();
  await world.launch();                                        // the burn: resolves when the rocket is through the cloud
  flash.style.background = '#F4F1EB'; flash.style.transition = 'opacity .5s'; flash.style.opacity = 1;
  await new Promise(r => setTimeout(r, 520));
  scrollTo({ top: 0, behavior: 'instant' }); syS = 0; world.arrive(); body.classList.remove('launching'); loCount.textContent = '00:03';
  await new Promise(r => setTimeout(r, 160)); flash.style.transition = 'opacity 1.4s'; flash.style.opacity = 0; launching = false;
});

/* ───────── start ───────── */
const ldPct = $('#ldPct'), ldText = $('#ldText');
function loaded() { html.classList.remove('booting'); counters($('#kpis'), true); if (location.hash && byId[location.hash.slice(1)] && location.hash !== '#top') { measure(); scrollTo({ top: byId[location.hash.slice(1)].top, behavior: 'instant' }); syS = scrollY; } }
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

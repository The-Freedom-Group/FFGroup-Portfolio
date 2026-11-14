/* The team: headcount, three ways to look at it (an org chart, by division, by employment type), a filter by division,
   anyone in full on a press, and the roles the group is opening next. Portraits are the team's own; partners and
   anyone without a portrait get their initials. */
import { $, $$, el, counters } from './kit.js';

const PORTRAITS = { 'Tom Letcher': 'tom', 'Jojo Williams': 'jojo', 'Dylan Griffiths': 'dylan', 'Harrison Duckworth': 'harrison', 'Billy Kelly': 'billy', 'Elliot Saxon': 'elliot', 'Josh Okolanji': 'josh', 'Bill Nebo': 'bill', 'Gabriel Mroczek': 'gabriel' };
const TYPES = ['Full time', 'Part time', 'T Level Students', 'Subcontractor', 'Partner'];
const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function initCrew(DATA) {
  const body = $('#crewBody'); if (!body) return; const T = DATA.team;
  const flat = T.divisions.flatMap(d => d.people.map(p => ({ ...p, div: d.key, divLabel: d.label })));
  const st = { view: 'division', filter: 'all' };

  const openRoles = T.pipeline.flatMap(g => g.roles).reduce((s, r) => s + (parseInt(r.tag, 10) || 1), 0);
  const count = t => flat.filter(p => p.type === t).length;
  $('#heads').append(...[[flat.length, 'people & partners in the group'], [count('Full time'), 'full time employees'], [count('T Level Students'), 'T Level students on the team'], [openRoles, 'roles opening in the pipeline']]
    .map(([n, l]) => el('li', null, el('b', { 'data-count': n, text: n }), el('span', { text: l }))));
  counters($('#heads'));
  $('#pipeCount').textContent = openRoles + ' open';

  const avatar = (p, big) => { const f = PORTRAITS[p.name]; return el('span.av' + (p.org ? '.org' : ''), { 'aria-hidden': 'true' }, f ? el('img', { src: 'assets/people/' + f + '.jpg', alt: '', width: big ? 525 : 128, height: big ? 700 : 170, loading: 'lazy', decoding: 'async' }) : initials(p.name)); };
  const card = p => el('button.pp', { type: 'button', 'data-div': p.div, 'data-cursor': 'Open', onclick: () => openPerson(p) }, avatar(p), el('span.tx', null, el('b', { text: p.name }), el('span', { text: p.role }), p.tag ? el('em', { text: p.tag }) : p.badge ? el('em', { text: p.badge }) : null));

  function render() {
    body.replaceChildren();
    if (st.view === 'orbit') {
      const root = flat.find(p => p.root), cols = T.divisions.filter(d => d.people.some(p => !p.root));
      body.append(el('div.org', null, el('div.org-root', null, card(root), el('p', { text: 'Group leadership' })),
        el('div.org-cols', null, cols.map(d => el('div.org-col', { 'data-div': d.key }, el('h3', { text: d.label }), flat.filter(p => p.div === d.key && !p.root).map(card))))));
    } else {
      const groups = st.view === 'division' ? T.divisions.map(d => ({ key: d.key, label: d.label, people: flat.filter(p => p.div === d.key) }))
        : TYPES.map(t => ({ key: t, label: t, people: flat.filter(p => p.type === t) })).filter(g => g.people.length);
      body.append(...groups.map(g => el('section.grp', { 'data-grp': g.key }, el('h3', null, g.label, el('i', { text: String(g.people.length).padStart(2, '0') })), el('div.ppl', null, g.people.map(card)))));
    }
    applyFilter();
  }
  function applyFilter() {
    $$('.pp', body).forEach(b => b.classList.toggle('dim', st.filter !== 'all' && b.dataset.div !== st.filter));
    $$('#crewChips button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === st.filter)));
  }
  $('#crewChips').append(...[{ key: 'all', label: 'All divisions', n: flat.length }, ...T.divisions.map(d => ({ key: d.key, label: d.label, n: d.people.length }))]
    .map(c => el('button', { type: 'button', 'data-f': c.key, 'aria-pressed': String(c.key === 'all'), onclick: () => { st.filter = st.filter === c.key ? 'all' : c.key; applyFilter(); } }, c.label, el('em', { text: c.n }))));
  $$('#crewView button').forEach(b => b.addEventListener('click', () => { st.view = b.dataset.view; $$('#crewView button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); }));
  render();

  /* anyone, in full */
  const dlg = $('#person'), ps = $('#psBody');
  function openPerson(p) {
    ps.replaceChildren(avatar(p, true), el('div', null,
      el('h3', { id: 'psName', text: p.name }), p.nickname ? el('p.nick', { text: p.nickname }) : null,
      el('p.role', { text: p.role + ' · ' + p.divLabel }),
      el('p.pills', null, el('span', { text: p.type }), p.tag ? el('span' + (p.tagKind === 'win' ? '.win' : ''), { text: p.tag }) : null),
      p.badge ? el('p.badge', { text: p.badge }) : null, el('p.bio', { text: p.bio }), p.note ? el('p.note', { text: p.note }) : null));
    dlg.showModal();
  }

  /* the roles opening next */
  $('#pipeBody').append(...T.pipeline.flatMap(g => [el('h4', { text: g.label }), el('ul', null, g.roles.map(r => el('li', null, r.title, el('span', { text: r.tag }))))]));
  $('#pipeBtn').addEventListener('click', () => $('#pipeline').showModal());
}

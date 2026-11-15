# The Freedom Group · Interactive Portfolio & Growth Story

Live at **https://freedomgroup.uk** (GitHub Pages from `main`, the domain in `CNAME`, Cloudflare in front).
The group's own system site is separate: https://thefreedomgroup.global.

One page that tells the investment story from top to bottom:

| | Part | What is on it |
|---|---|---|
| 00 | Start | The group's mark, alive: the pink globe on its orbit. The headline and three proof figures. |
| 01 | The system | The companies as a solar system, six stops, then a dive at Freedom Global through cloud to the investment focus. |
| 02 | The journey | Twenty-one chapters, March 2019 to August 2026, each with its own photographs and the full text behind "Read the chapter". |
| 03 | Traction | Revenue by year with the channel split, the growth multiples, four evidence pillars. |
| 04 | The market | Three nested markets, one year at a time. |
| 05 | The expansion map | The globe, nine territories and their routes home to Bury. |
| 06 | The growth plan | Eight channels, 2026 to 2031: stacked, grouped or share; a year breakdown; the data table. |
| 07 | The 2036 horizon | The line to £100.59m, the 2036 mix, how the mix shifts, what the ambition assumes. |
| 08 | The team | Headcount, org chart, by division, by employment type; anyone in full; the roles opening next. |
| 09 | The raise | What capital unlocks, climbing through cloud at dusk. |
| 10 | Beyond | What Freedom Global creates, the flywheel, the three scenarios. |
| 11 | Liftoff | The launch pad at night: the rocket comes down and stands. Press for liftoff and the page burns back to the top. |

## Changing a figure, a chapter or a person

Everything the page says in numbers, chapters and people is in **`js/data.js`**: the chapters (date, title, photos,
figures, full text), revenue, the channel plan, the 2036 mix, the trajectory, the team and the hiring pipeline. Change
it there and every chart, counter and table follows. The rest of the words (headings, the system cards, the market
notes, the raise, the scenarios) are plain HTML in `index.html`.

Journey photographs live in `journey-photos/` (every one is 0.86 wide to 1 tall); team portraits in `assets/people/`,
matched to names in `js/crew.js`.

## How it is built

No build step and no dependencies to install: plain HTML, CSS and JavaScript modules, with three.js vendored in
`vendor/`.

- `index.html` · all the fixed content, readable with scripts or WebGL switched off.
- `css/site.css` · the brand (porcelain, carbon, one pink; Anton, Instrument Serif, IBM Plex Mono, Inter; Michroma for
  the wordmark) and every layout.
- `js/main.js` · content first, then the world, then one loop that reads the scroll and tells each pinned scene, the
  world and the chrome where the story is.
- `js/journey.js`, `js/charts.js`, `js/crew.js` · the chapters, the figures (SVG drawn at the size shown), the team.
- `js/world.js` · the renderer and the film finish; `js/w-orbit.js` (mark, system, map, night sky), `js/w-clouds.js`
  (the cloud on the way down and the way up), `js/w-pad.js` (the evening sky behind the last three parts, the launch
  pad, the rocket's arrival and the burn).
- `js/planets.js`, `js/space.js`, `js/post.js`, `js/quality.js`, `js/util.js`, `js/cursor.js`, `js/type.js`,
  `js/worlds.js` · shared with the group system site.
- `js/sound.js` · the galaxy sound, made in the browser with no audio files. It starts quietly on the visitor's first
  press or key (a browser allows nothing sooner); the speaker in the bar turns it off and on, and the choice is kept.

Pinned scenes are tall sections with a stage that stays put; the page hands the world the room each scene has free
(beside the words on a wide screen, between them on a phone) and the world fits itself to it. Where WebGL is missing,
reduced motion is asked for, or a phone is held sideways, the same content is laid out flat (`html.no-gl`).
`?nogl` and `?still` on the address show those versions.

## Running it

Any static server from this folder, for example `python -m http.server 8151`, then http://localhost:8151.

## Publishing

1. `python stamp.py` · stamps every script and the stylesheet with a version, so no browser runs a new page against
   old files.
2. Commit and push to `main`. GitHub Pages publishes within a minute or two.

## Credits

Planet maps: Solar System Scope, CC BY 4.0. three.js: MIT (see `vendor/THREE-LICENSE.txt`). Fonts: Anton, Inter,
Instrument Serif, IBM Plex Mono and Michroma, all under the SIL Open Font Licence.

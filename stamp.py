"""Stamp the page before a push: every script and the stylesheet get ?v=<stamp> (through the import map, so a module's
own imports are covered too), and the modules are listed for preloading side by side. GitHub Pages lets a browser keep a
file for ten minutes and Cloudflare in front of it for longer, so without a stamp a returning visitor can run a new page
against old scripts. Run `python stamp.py`, then commit and push."""
import json, pathlib, re, time

root = pathlib.Path(__file__).parent
stamp = time.strftime('%Y%m%d%H%M', time.gmtime())
mods = sorted(p.relative_to(root).as_posix() for p in (root / 'js').glob('*.js'))
imports = {'three': f'./vendor/three.module.min.js?v={stamp}'}
for m in mods:
    imports['./' + m] = f'./{m}?v={stamp}'

html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'\n?<!--mp-->.*?<!--/mp-->', '', html, count=1, flags=re.S)
first = ['./js/main.js', './js/data.js', './js/kit.js', './js/journey.js', './js/charts.js', './js/crew.js', './js/world.js', 'three']
order = first + [k for k in imports if k not in first and k != './js/sound.js']        # sound is fetched only if asked for
mp = '<!--mp-->' + ''.join(f'<link rel="modulepreload" href="{imports[k]}">' for k in order) + '<!--/mp-->'
html, n1 = re.subn(r'<script type="importmap">.*?</script>', lambda _: '<script type="importmap">' + json.dumps({'imports': imports}) + '</script>\n' + mp, html, count=1, flags=re.S)
html, n2 = re.subn(r'<link rel="stylesheet" href="css/site\.css[^"]*">', f'<link rel="stylesheet" href="css/site.css?v={stamp}">', html, count=1)
html, n3 = re.subn(r'<script type="module" src="js/main\.js[^"]*"></script>', f'<script type="module" src="js/main.js?v={stamp}"></script>', html, count=1)
assert n1 == n2 == n3 == 1, (n1, n2, n3)
(root / 'index.html').write_text(html, encoding='utf-8', newline='\n')

nf = (root / '404.html').read_text(encoding='utf-8')
nf = re.sub(r'href="/css/site\.css[^"]*"', f'href="/css/site.css?v={stamp}"', nf, count=1)
(root / '404.html').write_text(nf, encoding='utf-8', newline='\n')
print('stamped', stamp, 'modules', len(mods))

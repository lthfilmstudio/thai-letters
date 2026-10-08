// Node-only data and player lifecycle checks. Geometry/rendering needs browser QA.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
async function data(file) {
  return import('data:text/javascript;base64,' + Buffer.from(await readFile(new URL(file, root), 'utf8')).toString('base64'));
}
const { FITTED_GUIDES } = await data('data/stroke-guides-fitted.js');
const { GLYPHS } = await data('data/stroke-glyphs.js');
const { CONSONANTS } = await data('data/consonants.js');
const { VOWELS } = await data('data/vowels.js');
const { TONES } = await data('data/tones.js');
// Stroke counts checked against Thai Script Display; every other glyph is one stroke.
const STROKE_COUNTS = {'ญ':2,'ฐ':2,'ศ':2,'ษ':2,'ส':2,'ะ':2,'ี':2,'ื':3,'แ':2,'๋':2};
const strokeCount = c => STROKE_COUNTS[c] || 1;
let reduced = false, nextFrame = 0, panel;
const frames = new Map();
class Element {
  style = {}; attrs = {}; dataset = {}; hidden = false; textContent = '';
  classList = { toggle: (name, value) => { this.attrs[name] = value; } };
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  after(element) { panel = element; }
  getTotalLength() { return 100; }
  getPointAtLength(n) { return { x: n, y: n }; }
  set innerHTML(html) {
    this.html = html;
    this.inks = [...html.matchAll(/class="stroke-ink" data-stroke="(\d+)" style="stroke-width:([\d.]+)"/g)].map(m => {
      const e = new Element(); e.dataset.stroke = m[1]; e.style.strokeWidth = m[2]; return e;
    });
    this.written = [...html.matchAll(/class="[^"]*\bstroke-written\b[^"]*"/g)].map(() => new Element());
    this.nodes = Object.fromEntries(['tip', 'status', 'count', 'replay', 'speed'].map(n => ['.stroke-' + n, new Element()]));
  }
  querySelector(s) { return this.nodes[s]; }
  querySelectorAll(s) { return s === '.stroke-ink' ? this.inks : s === '.stroke-written' ? this.written : []; }
}
const letter = new Element(), modal = new Element();
const context = {
  guides: FITTED_GUIDES, GLYPHS,
  document: { getElementById: id => id === 'm-char' ? letter : modal, createElement: () => new Element() },
  matchMedia: () => ({ matches: reduced }),
  requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
  cancelAnimationFrame: id => frames.delete(id),
};
let source = await readFile(new URL('js/stroke-sample.js', root), 'utf8');
source = source.replace(/^import .*;\s*$/gm, '').replace(/export function /g, 'function ');
vm.runInNewContext(source + '\nthis.api={placeGuide,layoutStrokes,showStrokeSample,stopStrokeSample};', context);
const { placeGuide, layoutStrokes, showStrokeSample, stopStrokeSample } = context.api;
assert.equal(placeGuide('M10 20 H30 V40 Q50 60 70 80 C10 20 30 40 50 60',{x:5,y:10,w:200,h:300}), 'M25 70H65V130Q105 190 145 250C25 70 65 130 105 190');
function tick(t) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(t)); }
function complete() { tick(0); tick(100000); assert.equal(frames.size, 0); }
const items = [...CONSONANTS, ...VOWELS, ...TONES];
assert.equal(items.length, 75);
assert.equal(new Set(items.map(i => i.c)).size, 75);
for (const { c } of items) {
  const parts = layoutStrokes(c);
  assert.ok(parts.length, c + ' missing layout');
  for (const p of parts) {
    assert.ok([p.x, p.y, p.w, p.h].every(Number.isFinite), c + ' finite geometry');
    assert.ok(p.w > 0 && p.h > 0 && p.x >= 0 && p.y >= 0 && p.x+p.w <= 280 && p.y+p.h <= 250, c + ' canvas bounds');
    if (p.c === '◌') continue;
    assert.equal(GLYPHS[p.c].bounds.length, 4);
    assert.equal(FITTED_GUIDES[p.c].length, strokeCount(p.c), p.c + ' stroke count');
    for (const segs of FITTED_GUIDES[p.c]) {
      assert.ok(segs.length > 0, p.c + ' stroke has segments');
      for (const [guide, width] of segs) {
        assert.match(guide, /^M/);
        assert.equal(guide.replace(/[MLHVCSQTAZmlhvcsqtaz\d\s.,+eE-]/g, ''), '', p.c + ' SVG tokens');
        assert.ok(width > 0 && width < GLYPHS[p.c].bounds[3]-GLYPHS[p.c].bounds[1], p.c + ' segment width');
      }
    }
  }
  showStrokeSample(c);
  assert.equal(panel.hidden, false);
  assert.equal(letter.hidden, true);
  const expected = parts.filter(p => p.c !== '◌').reduce((n,p) => n+strokeCount(p.c),0);
  assert.equal(new Set(panel.inks.map(p => p.dataset.stroke)).size, expected, c + ' ordered strokes');
  assert.equal(panel.written.length, parts.filter(p => p.c !== '◌').length, c + ' completed-outline groups exist');
  assert.ok(panel.inks.every(p => p.style.visibility === 'hidden'), c + ' hidden before start');
  assert.ok(!panel.html.includes('mask'), c+' strokes are drawn, not revealed through masks');
  assert.equal((panel.html.match(/<clipPath id="stroke-clip-\d+"><path transform="translate\([^)]*\) scale\([^)]*\)" d="M/g) || []).length, panel.written.length, c+' one Mali outline clip per glyph');
  assert.equal((panel.html.match(/clip-path="url\(#stroke-clip-\d+\)"/g) || []).length, panel.written.length, c+' lines clipped to the outline');
  assert.ok(!panel.html.includes('non-scaling-stroke'), c+' dash and pen share canvas coordinates');
  complete();
  assert.ok(panel.inks.every(p => p.style.visibility === 'visible'), c + ' every segment drawn at completion');
  assert.ok(panel.written.every(p => p.attrs['data-complete'] === 'true'), c + ' exact completed glyph');
}
// One stroke is a chain of segments; the loop wall is thinner than the main stem.
showStrokeSample('ข');
const segs = panel.inks.filter(p => p.dataset.stroke === '0');
assert.ok(segs.length > 1, 'loop head uses its own width segment');
assert.ok(new Set(segs.map(p => p.style.strokeWidth)).size > 1, 'loop wall thinner than main stem');
stopStrokeSample();
for (const [char, expected] of [['เ◌ีย','เ◌ีย'], ['เ◌ือ','เ◌ือ'], ['◌ำ','◌ํา'], ['◌ัว','◌ัว'], ['เ◌าะ','เ◌าะ']]) {
  assert.equal(layoutStrokes(char).map(p => p.c).join(''), expected, char + ' compound component order');
}
showStrokeSample('ก'); tick(0); tick(350); tick(850);
const drawn = () => parseFloat(panel.inks[0].style.strokeDasharray);
const normalDrawn = drawn(), lineLength = 100*panel.inks.length;
assert.ok(Math.abs(normalDrawn - Math.min(100, lineLength*0.14644660940672624)) < 1e-6, 'normal sine easing at 25% of 2 seconds');
panel.nodes['.stroke-replay'].onclick();
assert.equal(frames.size,1); assert.equal(panel.inks[0].style.visibility,'hidden');
const speed = panel.nodes['.stroke-speed'];
speed.onclick({currentTarget:speed});
assert.equal(speed.attrs['aria-pressed'],'true');
tick(0); tick(850);
assert.ok(drawn() < normalDrawn, 'slow advances less at same time');
stopStrokeSample(); assert.equal(frames.size,0, 'close cancels animation');
reduced = true;
showStrokeSample('ญ');
assert.equal(frames.size,0,'reduced motion never schedules automatic animation');
assert.ok(panel.written.every(p => p.attrs['data-complete']==='true'));
panel.nodes['.stroke-replay'].onclick();
assert.equal(frames.size,1,'explicit replay allowed in reduced motion');
showStrokeSample('ก'); assert.equal(frames.size,0,'switch cancels previous manual replay');
reduced = false;
showStrokeSample('ก'); showStrokeSample('missing');
assert.equal(frames.size,0); assert.equal(panel.hidden,true); assert.equal(letter.hidden,false);
assert.equal(modal.attrs['has-stroke-sample'],false);
console.log('PASS: 75 entries; finite canvas bounds; guide tokens; stroke counts; segment widths; segment chaining; outline clip; compound component order; completion; 2-second sine easing; replay; slow; reduced motion; close/switch cancellation.');
console.log('LIMIT: stubbed SVG lengths do not validate rendered path alignment, visual glow, or linguistic stroke-order correctness.');

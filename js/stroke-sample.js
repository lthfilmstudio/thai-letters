import { FITTED_GUIDES as guides } from '../data/stroke-guides-fitted.js';
import { GLYPHS } from '../data/stroke-glyphs.js';
let frame = 0, panel, slow = false, strokes = [];
export function stopStrokeSample() { cancelAnimationFrame(frame); frame = 0; }

// Bake absolute guide coordinates into the canvas so dash lengths, line width
// and the pen share units.
export function placeGuide(d, box) {
  return d.replace(/([MLHVQC])([^MLHVQC]*)/g, (_, command, values) => {
    const numbers = values.trim().split(/[\s,]+/).map(Number);
    return command + numbers.map((n, i) => {
      const x = command === 'H' || (command !== 'V' && i % 2 === 0);
      return +(x ? box.x+n*box.w/100 : box.y+n*box.h/100).toFixed(5);
    }).join(' ');
  });
}

// Original font proportions and baseline; dotted circle is a static placeholder.
export function layoutStrokes(char) {
  const parts = [];
  let cursor = 0, anchor = 0;
  for (const c of char.replace('ำ', 'ํา')) {
    if (c === '◌') {
      anchor = cursor;
      parts.push({ c, x: cursor + 55, y: -520, w: 450, h: 450 });
      cursor += 580;
      continue;
    }
    const glyph = GLYPHS[c];
    if (!glyph || !guides[c]) return [];
    const [x0, y0, x1, y1] = glyph.bounds;
    parts.push({ c, x: (glyph.advance ? cursor : anchor + 580) + x0, y: -y1, w: x1-x0, h: y1-y0 });
    cursor += glyph.advance;
  }
  const left = Math.min(...parts.map(c => c.x)), right = Math.max(...parts.map(c => c.x+c.w));
  const top = Math.min(...parts.map(c => c.y)), bottom = Math.max(...parts.map(c => c.y+c.h));
  const scale = Math.min(.28, 228/(right-left), 194/(bottom-top));
  return parts.map(c => ({ ...c, x: 140+(c.x-(left+right)/2)*scale, y: 126+(c.y-(top+bottom)/2)*scale, w: c.w*scale, h: c.h*scale }));
}

// Each stroke is drawn as round-capped lines growing along its route and stays as
// the finished letter (no swap to the font, so nothing jumps at the end). A stroke is
// a chain of segments with Mali's local width; the pen runs through them without a
// lift. Lines are a little wider than the ink and clipped to Mali's outline, so the
// finished letter is exactly Mali, loops and joins included.
function setProgress(s, eased) {
  let left = s.length*eased;
  for (const seg of s.segs) {
    const drawn = Math.max(0, Math.min(seg.length, left));
    seg.path.style.strokeDasharray = drawn+' '+seg.length;
    seg.path.style.visibility = drawn > 0 ? 'visible' : 'hidden';
    left -= seg.length;
  }
}

function pointAt(s, eased) {
  let left = s.length*eased;
  for (const seg of s.segs) {
    if (left <= seg.length || seg === s.segs.at(-1)) return seg.path.getPointAtLength(Math.min(left, seg.length));
    left -= seg.length;
  }
}

function play(manual = false) {
  stopStrokeSample();
  const tip = panel.querySelector('.stroke-tip'), status = panel.querySelector('.stroke-status');
  const counter = panel.querySelector('.stroke-count'), written = [...panel.querySelectorAll('.stroke-written')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !manual;
  strokes.forEach(s => setProgress(s, reduced ? 1 : 0));
  written.forEach(g => reduced ? g.setAttribute('data-complete','true') : g.removeAttribute('data-complete'));
  tip.style.opacity = 0;
  const total = strokes.length;
  const count = n => String(n).padStart(2,'0')+' / '+String(total).padStart(2,'0');
  const announce = text => { if (status.textContent !== text) status.textContent = text; };
  counter.textContent = count(reduced ? total : 1);
  status.textContent = reduced ? '點重播，觀看筆順' : '跟著光點，依序描寫';
  if (reduced) return;
  const totalLength = strokes.reduce((sum,s) => sum+s.length,0);
  // Approved speed, with extra time for complex forms and visible pen lifts.
  const duration = (slow ? 3400 : 2000)*Math.max(1,total/3);
  let elapsed = 350;
  strokes.forEach(s => {
    s.start = elapsed;
    s.duration = Math.max(220,duration*s.length/totalLength);
    elapsed += s.duration+(slow ? 330 : 190);
  });
  let start;
  function draw(time) {
    start ??= time;
    const t = time-start;
    let active = null, done = 0;
    for (const s of strokes) {
      if (t < s.start) break;
      const p = Math.min(1,(t-s.start)/s.duration);
      const eased = (1-Math.cos(Math.PI*p))/2;
      setProgress(s, eased);
      if (p < 1) { active = {s,eased}; break; }
      done++;
    }
    counter.textContent = count(Math.min(total,done+1));
    tip.style.opacity = active ? 1 : 0;
    if (active) {
      const {s,eased} = active, point = pointAt(s, eased);
      tip.setAttribute('transform','translate('+point.x+' '+point.y+')');
      announce('第 '+(done+1)+' 筆，共 '+total+' 筆');
    } else if (done && done < total) announce('提筆，再接下一筆');
    if (done < total) frame = requestAnimationFrame(draw);
    else {
      frame = 0;
      written.forEach(g => g.setAttribute('data-complete','true'));
      status.textContent = (total === 1 ? '一筆' : total+' 筆')+'完成 · 再看一次也可以';
    }
  }
  frame = requestAnimationFrame(draw);
}

export function showStrokeSample(char) {
  stopStrokeSample();
  const letter = document.getElementById('m-char');
  if (!panel) { panel = document.createElement('div'); panel.className = 'stroke-sample'; letter.after(panel); }
  const parts = layoutStrokes(char), active = parts.length > 0;
  panel.hidden = !active; letter.hidden = active;
  document.getElementById('modal').classList.toggle('has-stroke-sample',active);
  if (!active) return;
  let body = '', strokeIndex = 0, clip = 0;
  for (const c of parts) {
    if (c.c === '◌') {
      body += '<ellipse class="stroke-placeholder" cx="'+(c.x+c.w/2)+'" cy="'+(c.y+c.h/2)+'" rx="'+c.w/2+'" ry="'+c.h/2+'"/>';
      continue;
    }
    const bounds = GLYPHS[c.c].bounds, fontScale = c.h/(bounds[3]-bounds[1]), id = 'stroke-clip-'+clip++;
    body += '<clipPath id="'+id+'"><path transform="translate('+c.x+' '+c.y+') scale('+c.w/100+' '+c.h/100+')" d="'+GLYPHS[c.c].d+'"/></clipPath>'+
      '<g class="stroke-glow stroke-written"><g clip-path="url(#'+id+')">'+guides[c.c].map(segs => {
      const stroke = strokeIndex++;
      return segs.map(([d, w]) => '<path class="stroke-ink" data-stroke="'+stroke+'" style="stroke-width:'+w*fontScale+'" d="'+placeGuide(d,c)+'"/>').join('');
    }).join('')+'</g></g>';
  }
  panel.innerHTML = '<div class="stroke-heading"><span>筆順</span><span class="stroke-count"></span></div>'+
    '<svg class="stroke-canvas" viewBox="0 0 280 250" role="img" aria-label="'+char+' 筆順動畫"><defs><filter id="stroke-tip-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="7"/></filter></defs>'+
    '<path class="stroke-guide" d="M25 218H255 M140 15V235"/>'+body+
    '<g class="stroke-tip"><circle r="19" class="stroke-halo" filter="url(#stroke-tip-glow)"/><circle r="6" class="stroke-point"/></g></svg>'+
    '<p class="stroke-status" aria-live="polite"></p><div class="stroke-controls"><button type="button" class="stroke-replay">↺ 重播</button><button type="button" class="stroke-speed" aria-pressed="'+slow+'">慢速</button></div>'+
    (char.includes('◌') ? '<p class="stroke-note">虛線圓圈是子音位置，不用描寫</p>' : '');
  strokes = [];
  for (const path of panel.querySelectorAll('.stroke-ink')) {
    const i = Number(path.dataset.stroke);
    const length = path.getTotalLength();
    (strokes[i] ??= {segs:[]}).segs.push({path,length});
  }
  for (const s of strokes) s.length = s.segs.reduce((sum, seg) => sum+seg.length, 0);
  panel.querySelector('.stroke-replay').onclick = () => play(true);
  panel.querySelector('.stroke-speed').onclick = event => {
    slow = !slow;
    event.currentTarget.setAttribute('aria-pressed',String(slow)); play(true);
  };
  play();
}

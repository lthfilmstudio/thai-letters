# /// script
# dependencies = ["svgpathtools", "numpy"]
# ///
"""Build data/stroke-mono.js: one smooth single-line route per stroke for the stroke player.

Input is data/stroke-guides-fitted.js (stroke order, direction and lifts) and data/stroke-glyphs.js
(Mali outlines). Work happens in font units so circles stay round:
  1. join a stroke's segments and resample every STEP font units;
  2. loop heads: the run at a stroke end that goes round one of Mali's holes is pulled onto a true
     circle (radius = hole radius + half the line width, so the hole matches Mali) for a full turn,
     then handed back to the route over FADE samples;
  3. moving-average smoothing (SMOOTH*4 samples each side, ends pinned), then point thinning.
Output paths are in the same 0..100 glyph box as the guides. Usage: uv run scripts/build-stroke-mono.py
"""
import json, math, re, subprocess
from pathlib import Path
import numpy as np
from svgpathtools import parse_path

ROOT = Path(__file__).resolve().parent.parent
WIDTH = 50      # line width, font units (Nalin picked 50 in the comparison page)
SMOOTH = 3      # comparison-page smoothing value Nalin approved
STEP = 2.4      # resample spacing, font units (about 0.6 px on the card)
FADE = 20
LOOP_DEV = 0.3  # a loop head stays within this share of the circle radius (real heads <= 0.18, ึ 0.43)


def load(module, name):
    out = subprocess.run(['node', '--input-type=module', '-e',
                          f'const m = await import("./{module}"); console.log(JSON.stringify(m.{name}))'],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def sample(d, sx, sy):
    """Points every STEP font units along path d (given in the 0..100 box)."""
    dense = []
    for seg in parse_path(d):
        for t in np.linspace(0, 1, 64):
            q = seg.point(t)
            dense.append((q.real * sx, q.imag * sy))
    dense = np.array(dense)
    gap = np.r_[0, np.cumsum(np.linalg.norm(np.diff(dense, axis=0), axis=1))]
    s = np.linspace(0, gap[-1], max(2, math.ceil(gap[-1] / STEP) + 1))
    return list(zip(np.interp(s, gap, dense[:, 0]), np.interp(s, gap, dense[:, 1])))


def holes(d, sx, sy):
    subs = []
    for sub in re.findall(r'M[^M]*', d):
        pts = np.array(sample(sub, sx, sy)[:-1])
        subs.append((pts, (*pts.min(0), *pts.max(0))))
    out = []
    for pts, b in subs:
        if any(o is not b and o[0] < b[0] and o[1] < b[1] and o[2] > b[2] and o[3] > b[3] for _, o in subs):
            c = pts.mean(0)
            out.append((c[0], c[1], float(np.linalg.norm(pts - c, axis=1).mean())))
    return out


def round_loops(pts, hs):
    half = WIDTH / 2
    for cx, cy, r in hs:
        rc = r + half
        for from_end in (False, True):
            idx = (lambda i: len(pts) - 1 - i) if from_end else (lambda i: i)
            near = lambda i: math.hypot(pts[idx(i)][0] - cx, pts[idx(i)][1] - cy) < rc * 1.6
            if not near(0):
                continue
            n, turn, full = 0, 0.0, -1
            prev = math.atan2(pts[idx(0)][1] - cy, pts[idx(0)][0] - cx)
            while n < len(pts) - 1 and (near(n + 1) or full < 0):
                n += 1
                a = math.atan2(pts[idx(n)][1] - cy, pts[idx(n)][0] - cx)
                da = (a - prev + math.pi) % (2 * math.pi) - math.pi
                turn += da; prev = a
                if full < 0 and abs(turn) >= 2 * math.pi:
                    full = n
                if abs(turn) > 2.6 * math.pi:
                    break
            if abs(turn) < math.pi:
                continue  # not a loop head
            if full < 0:
                full = n
            run = [pts[idx(i)] for i in range(full + 1)]
            if sum(abs(math.hypot(x - cx, y - cy) - rc) for x, y in run) / len(run) > LOOP_DEV * rc:
                continue  # route goes round a bigger shape (ึ's dome), not this circle
            end = min(len(pts) - 1, full + FADE)
            for i in range(end + 1):
                x, y = pts[idx(i)]
                a = math.atan2(y - cy, x - cx)
                k = 1 if i <= full else (end - i) / FADE
                t = k * k * (3 - 2 * k)
                pts[idx(i)] = (x + (cx + rc * math.cos(a) - x) * t, y + (cy + rc * math.sin(a) - y) * t)


def smooth(pts):
    k, out = SMOOTH * 4, []
    for i in range(len(pts)):
        w = min(k, i, len(pts) - 1 - i)
        win = pts[i - w:i + w + 1]
        out.append((sum(p[0] for p in win) / len(win), sum(p[1] for p in win) / len(win)))
    return out


def simplify(pts, tol=0.4):
    """Ramer-Douglas-Peucker in font units (0.4 units is about 0.1 px on the card)."""
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0]), np.array(pts[-1])
    ab = b - a
    n = np.linalg.norm(ab)
    arr = np.array(pts[1:-1])
    dist = (np.abs(ab[0] * (arr[:, 1] - a[1]) - ab[1] * (arr[:, 0] - a[0])) / n) if n else np.linalg.norm(arr - a, axis=1)
    i = int(dist.argmax())
    if dist[i] <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[:i + 2], tol)[:-1] + simplify(pts[i + 1:], tol)


def main():
    guides = load('data/stroke-guides-fitted.js', 'FITTED_GUIDES')
    glyphs = load('data/stroke-glyphs.js', 'GLYPHS')
    result = {}
    for c, strokes in guides.items():
        x0, y0, x1, y1 = glyphs[c]['bounds']
        sx, sy = (x1 - x0) / 100, (y1 - y0) / 100   # 0..100 box -> font units
        hs = holes(glyphs[c]['d'], sx, sy)
        routes = []
        for segs in strokes:
            pts = []
            for d, _ in segs:
                for p in sample(d, sx, sy):
                    if not pts or math.hypot(p[0] - pts[-1][0], p[1] - pts[-1][1]) > 0.2:
                        pts.append(p)
            round_loops(pts, hs)
            pts = simplify(smooth(pts))
            routes.append('M' + 'L'.join(f'{x / sx:.2f} {y / sy:.2f}' for x, y in pts))
        result[c] = routes
    body = ',\n'.join(f'  {json.dumps(c, ensure_ascii=False)}: {json.dumps(r)}' for c, r in result.items())
    (ROOT / 'data' / 'stroke-mono.js').write_text(
        '// Generated by scripts/build-stroke-mono.py from stroke-guides-fitted.js + stroke-glyphs.js; do not edit.\n'
        '// One smooth single-line route per stroke (0..100 glyph box), drawn at MONO_WIDTH font units;\n'
        '// loop heads are true circles round Mali\'s holes. The player dissolves into Mali when done.\n'
        f'export const MONO_WIDTH = {WIDTH};\nexport const MONO_GUIDES = {{\n{body}\n}};\n', encoding='utf-8')
    print(f'{len(result)} glyphs, {sum(len(r) for r in result.values())} strokes')


if __name__ == '__main__':
    main()

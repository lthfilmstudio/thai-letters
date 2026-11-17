#!/usr/bin/env python3
"""Cut audio/book/tone/*.mp3 (mid consonant + tone mark) from the textbook CD 拼音練習 tracks.

2026-11-17 class (聲調): the tone tables of Lessons 1-5 read every row as five clips in tone
order 平 ่ ้ ๊ ๋. Only the four marked clips are kept; the plain board keeps its Aom clips.
The segment numbers below were matched against the textbook pages by pitch contour
(mid, low, falling, high, rising in each run of five). Not in git (copyright).
Usage: python3 scripts/cut-book-tones.py
"""
import re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'audio' / '課本音檔', ROOT / 'audio' / 'book' / 'tone'
MARKS = '่้๊๋'  # ่ ้ ๊ ๋
# track: (expected segment count, [(first segment of the row, consonant, vowel template)])
ROWS = {
    '004': (33, [(3, 'ก', 'ไ◌'), (10, 'ก', '◌า')]),
    '006': (25, [(4, 'ต', 'เ◌า'), (9, 'ต', 'ไ◌'), (14, 'ก', 'เ◌า'), (20, 'ต', '◌า')]),
    '011': (85, [(27, 'จ', 'ไ◌'), (32, 'จ', 'เ◌า'), (40, 'จ', '◌า'), (45, 'จ', '◌ี'), (50, 'ต', '◌ี'), (55, 'ก', '◌ี')]),
    '014': (81, [(5, 'ป', '◌ำ'), (10, 'ป', 'ไ◌'), (15, 'ป', 'เ◌า'), (23, 'ป', '◌า'), (28, 'ป', '◌ี'),
                 (36, 'ก', '◌ำ'), (41, 'จ', '◌ำ'), (46, 'ต', '◌ำ')]),
    '018': (90, [(5, 'อ', 'ไ◌'), (10, 'อ', 'เ◌า'), (15, 'อ', '◌ำ'), (27, 'อ', '◌า'), (32, 'อ', '◌ี'),
                 (37, 'อ', '◌อ'), (42, 'จ', '◌อ'), (47, 'ก', '◌อ'), (52, 'ต', '◌อ'), (57, 'ป', '◌อ')]),
}


def toned(c, v, mark):
    """Same rule as data/combos.js toned(): the mark sits after the consonant and any vowel above/below it."""
    syl = v.replace('◌', c)
    i = syl.index(c) + 1
    while i < len(syl) and ('ั' == syl[i] or 'ิ' <= syl[i] <= 'ฺ'):
        i += 1
    return syl[:i] + mark + syl[i:]


def segments(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'silencedetect=noise=-35dB:d=0.3',
                          '-f', 'null', '-'], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', err).groups()
    dur = int(h) * 3600 + int(m) * 60 + float(s)
    return [(a, b) for a, b in zip([0.0] + ends, starts + [dur]) if b - a > 0.12]


def cut(path, a, b, out):
    a, b = max(0, a - 0.06), b + 0.12
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', str(path),
                    '-af', f'afade=t=in:d=0.01,afade=t=out:st={b - a - 0.03:.3f}:d=0.03', '-ac', '1', '-b:a', '96k', str(out)], check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    done = set()
    for track, (count, rows) in ROWS.items():
        segs = segments(SRC / f'{track}.mp3')
        assert len(segs) == count, f'{track}: {len(segs)} segments, expected {count}'
        for first, c, v in rows:
            for k, mark in enumerate(MARKS, start=1):
                a, b = segs[first + k]
                cut(SRC / f'{track}.mp3', a, b, OUT / f'{toned(c, v, mark)}.mp3')
                done.add(toned(c, v, mark))
    print(f'{len(done)} toned clips -> {OUT}')


if __name__ == '__main__':
    main()

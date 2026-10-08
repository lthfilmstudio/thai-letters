#!/usr/bin/env python3
"""Cut audio/book/*.mp3 from the textbook CD (泰語字母 聽、說、寫) in audio/課本音檔/.

000A.mp3 reads the 44 consonants as pairs (ก ไก่ ...); 000B.mp3 reads vowels short-long
(อะ-อา ...). Clips are split on silences. The CD and the clips are not in git (copyright);
the site is deployed behind Cloudflare Access. Usage: python3 scripts/cut-book-audio.py
"""
import re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'audio' / '課本音檔', ROOT / 'audio' / 'book'
CONSONANTS = 'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ'
# 000B order; None = read on the CD but not a card in the app
VOWELS = ['อะ', 'อา', 'อิ', 'อี', 'อึ', 'อือ', 'อุ', 'อู', 'เอะ', 'เอ', 'แอะ', 'แอ', 'เอาะ', 'ออ', 'โอะ', 'โอ',
          None, 'เอีย', None, 'เอือ', 'เออะ', 'เออ', None, 'อัว', 'ใอ', 'ไอ', 'เอา', 'อำ']


def speech(path, after):
    """Non-silent stretches (start, end) after `after` seconds."""
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'silencedetect=noise=-40dB:d=0.25',
                          '-f', 'null', '-'], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    dur = float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', err).group(3)) + 60 * float(re.search(r'Duration: (\d+):(\d+)', err).group(2))
    return [(e, s) for e, s in zip(ends, starts[1:] + [dur]) if e >= after - 0.01 and s - e > 0.15]


def cut(path, a, b, out):
    a, b = max(0, a - 0.06), b + 0.12
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', str(path),
                    '-af', f'afade=t=in:d=0.01,afade=t=out:st={b - a - 0.03:.3f}:d=0.03', '-ac', '1', '-b:a', '96k', str(out)], check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pairs = speech(SRC / '000A.mp3', 18.8)  # after the title and table heading
    assert len(pairs) == len(CONSONANTS), f'000A: {len(pairs)} pairs'
    for c, (a, b) in zip(CONSONANTS, pairs):
        cut(SRC / '000A.mp3', a, b, OUT / f'{c}.mp3')
    sounds = [s for s in speech(SRC / '000B.mp3', 5.3) if s[1] - s[0] > 0.1][:len(VOWELS)]
    assert len(sounds) == len(VOWELS), f'000B: {len(sounds)} sounds'
    for v, (a, b) in zip(VOWELS, sounds):
        if v:
            cut(SRC / '000B.mp3', a, b, OUT / f'{v}.mp3')
    print(f'{len(CONSONANTS)} consonant pairs, {sum(1 for v in VOWELS if v)} vowels -> {OUT}')


if __name__ == '__main__':
    main()

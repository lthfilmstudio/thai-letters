#!/usr/bin/env python3
"""Make every audio/aom/<text>.mp3 that data/speech.js and data/combos.js use, with ElevenLabs Aom.

Same voice and model as thai-review (Aom, eleven_v4). Only missing files are made, so
rerunning after editing data/speech.js costs only the new texts. Key: ~/.secrets/elevenlabs.env.
Usage: python3 scripts/gen-aom-audio.py [--dry-run] [--force TEXT ...]
"""
import json, os, re, subprocess, sys, time
from pathlib import Path
from urllib import request, error

VOICE, MODEL = 'nealpwJT5tCyJFKDzEq8', 'eleven_v4'  # Aom - Gentle, Confident, Smooth
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'aom'


def texts():
    src = (ROOT / 'data' / 'speech.js').read_text(encoding='utf-8')
    seen = []
    for pair in re.findall(r'^\s*"[^"]+":\s*(\[.*\])', src, re.M):
        for path in json.loads(pair):
            t = path[len('aom/'):-len('.mp3')].replace('_', ' ')
            if path.startswith('aom/') and t not in seen:
                seen.append(t)
    combos = subprocess.run(['node', '--input-type=module', '-e',
                             'const m = await import("./data/combos.js");'
                             'console.log(JSON.stringify(m.allCombos().map(x => x.audio.slice(4, -4))))'],
                            cwd=ROOT, capture_output=True, text=True, check=True).stdout
    seen += [t for t in json.loads(combos) if t not in seen]
    return seen


# Aom misreads some lone syllables (as abbreviations, or with a tone the syllable does not have).
# SPOKEN: send a spelling that sounds the same. TRIPLE: say it three times, keep the middle one.
SPOKEN = {'อำ': 'อัม', 'ตำ': 'ตัม'}
TRIPLE = {'อา', 'เก', 'เป'}


def middle_take(path):
    """Cut the middle of three takes out of path, in place (ffmpeg silencedetect)."""
    ff = os.path.expanduser('~/.local/bin/ffmpeg')
    log = subprocess.run([ff, '-hide_banner', '-i', path, '-af', 'silencedetect=n=-40dB:d=0.12', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
    gaps = [(a, b) for a, b in zip(starts, ends) if a > 0.05]  # silences between takes
    if len(gaps) < 2:
        sys.exit(f'FAILED {path}: expected 3 takes, found {len(gaps) + 1}')
    a, b = gaps[0][1] - 0.05, gaps[1][0] + 0.08
    tmp = str(path) + '.tmp.mp3'
    subprocess.run([ff, '-y', '-v', 'error', '-i', path, '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-c:a', 'libmp3lame', '-b:a', '128k', tmp], check=True)
    os.replace(tmp, path)


def path_for(text):
    return OUT / (text.replace(' ', '_') + '.mp3')


def main():
    args = sys.argv[1:]
    dry = '--dry-run' in args
    force = set(args[args.index('--force') + 1:]) if '--force' in args else set()
    todo = [t for t in texts() if t in force or not path_for(t).exists()]
    print(f'{len(todo)} to make, {sum(len(t) for t in todo)} chars')
    if dry or not todo:
        return
    key = next(l.split('=', 1)[1].strip().strip('"\'') for l in open(os.path.expanduser('~/.secrets/elevenlabs.env'))
               if l.startswith('ELEVENLABS_API_KEY='))
    OUT.mkdir(parents=True, exist_ok=True)
    for i, text in enumerate(todo, 1):
        spoken = ' '.join([text] * 3) if text in TRIPLE else SPOKEN.get(text, text)
        body = json.dumps({'text': spoken, 'model_id': MODEL, 'language_code': 'th'}, ensure_ascii=False).encode()
        req = request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128',
                              data=body, method='POST', headers={'xi-api-key': key, 'Content-Type': 'application/json'})
        for attempt in range(4):
            try:
                with request.urlopen(req, timeout=60) as r:
                    path_for(text).write_bytes(r.read())
                break
            except error.HTTPError as e:
                msg = e.read().decode('utf-8', 'replace')[:200]
                if e.code in (429, 500, 502, 503) and attempt < 3:
                    time.sleep(2 ** attempt * 2)
                    continue
                sys.exit(f'FAILED {text}: HTTP {e.code} {msg}')
        if text in TRIPLE:
            middle_take(path_for(text))
        print(f'{i}/{len(todo)} {text}', flush=True)


if __name__ == '__main__':
    main()

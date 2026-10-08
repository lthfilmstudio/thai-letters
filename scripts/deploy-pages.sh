#!/bin/bash
# Deploy to Cloudflare Pages (project thai-letters, behind Cloudflare Access).
# Copies only what the site serves into dist/; functions/ (the Access check) is picked up
# from the repo root by wrangler. audio/book comes from scripts/cut-book-audio.py (not in git).
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/test-speech.mjs
node scripts/test-strokes.mjs > /dev/null
node --test tests/*.test.js > /dev/null
rm -rf dist && mkdir -p dist/assets dist/audio
cp index.html manifest.json sw.js dist/
cp -R css js data dist/
cp -R assets/icons dist/assets/
cp -R audio/book audio/aom dist/audio/
npx -y wrangler@4 pages deploy dist --project-name thai-letters --branch main --commit-dirty=true

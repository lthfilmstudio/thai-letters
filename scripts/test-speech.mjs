// Every letter, vowel and tone mark has audio for both play buttons, and nothing extra ships.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const load = async file => import('data:text/javascript;base64,' + Buffer.from(await readFile(new URL(file, root), 'utf8')).toString('base64'));
const { SPEECH } = await load('data/speech.js');
const items = [...(await load('data/consonants.js')).CONSONANTS, ...(await load('data/vowels.js')).VOWELS, ...(await load('data/tones.js')).TONES];
const needed = new Set();
for (const { c } of items) {
  assert.equal(SPEECH[c]?.length, 2, c + ' has letter and name audio');
  for (const src of SPEECH[c]) { assert.match(src, /^(book|aom)\/[฀-๿_]+\.mp3$/, c + ' audio path'); needed.add(src); }
}
assert.equal(Object.keys(SPEECH).length, items.length, 'no audio for unknown items');
for (const dir of ['book', 'aom']) {
  const files = new Set((await readdir(new URL(`audio/${dir}/`, root))).map(f => `${dir}/${f}`));
  for (const f of needed) if (f.startsWith(dir)) assert.ok(files.has(f), 'missing audio/' + f);
  for (const f of files) assert.ok(needed.has(f), 'unused audio/' + f);
}
console.log(`PASS: ${items.length} entries; ${needed.size} clips present (book + Aom), none unused.`);

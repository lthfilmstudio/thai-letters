// 從清心安神（thai-review）的會話課字卡挑出「只用拼字盤上的字母就拼得出來」的詞，寫成 data/class-words.js。
// 這些是 Nalin 已經會講、知道意思的字，拿來當「今天」每一輪最後的閱讀題。
// 老師教了新字母、combos.js 擴充後重跑一次：
//   node scripts/build-class-words.mjs <thai-review 的資料夾>
// 資料夾裡要有 data.json 與 out/site-preview/audio-manifest.json（Aom 念的整詞音檔，跟這裡同一個聲音）。
// 多音節的詞音檔複製成 audio/aom/<詞>.mp3；單音節直接用拼字盤那一格的音檔。找不到音檔的詞不收。
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { allCombos } from '../data/combos.js';

const src = process.argv[2];
if (!src) { console.error('用法：node scripts/build-class-words.mjs <thai-review 的資料夾>'); process.exit(1); }
const root = new URL('../', import.meta.url);
const exists = p => access(p).then(() => true, () => false);

const board = new Map(allCombos().map(x => [x.syl, x]));
const clean = t => (t || '').split('/')[0].replace(/[\s?!.,]/g, '');   // 男女變體取第一個，去空白標點

// 把整個詞切成拼字盤上的音節；切不出來回 null
function split(text) {
  const best = Array(text.length + 1).fill(null);
  best[0] = [];
  for (let i = 0; i < text.length; i++) {
    if (!best[i]) continue;
    for (let j = i + 1; j <= text.length; j++) {
      const syl = text.slice(i, j);
      if (board.has(syl) && !best[j]) best[j] = [...best[i], syl];
    }
  }
  return best[text.length];
}

// ห 帶頭（ห นำ）：เหงา 是一個音節，不是 เห＋งา。這條規則還沒教，切出這種形狀的詞先不收。
const leadingHo = syllables => syllables.some((syl, i) =>
  /^[เแโไใ]ห$/.test(syl) && /^[เแโไใ]?[งนมยว]/.test(syllables[i + 1] || ''));

const data = JSON.parse(await readFile(join(src, 'data.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(src, 'out/site-preview/audio-manifest.json'), 'utf8'));
const clips = new Map(Object.values(manifest.items).map(x => [clean(x.thai), join(src, 'out/site-preview', x.path)]));

const words = [], seen = new Set(), noAudio = [];
let copied = 0;
for (const lesson of data.lessons) {
  if (lesson.title.startsWith('R')) continue;   // 字母班的分頁不是會話課
  for (const card of lesson.cards) {
    const th = clean(card.thai);
    if (!th || seen.has(th)) continue;
    const syllables = split(th);
    if (!syllables || leadingHo(syllables)) continue;
    seen.add(th);
    if (syllables.length === 1) {
      if (!board.get(th).audio || board.get(th).carrier) { noAudio.push(th); continue; }
    } else {
      const target = new URL(`audio/aom/${th}.mp3`, root);
      if (!(await exists(target))) {
        if (!clips.has(th) || !(await exists(clips.get(th)))) { noAudio.push(th); continue; }
        await copyFile(clips.get(th), target);
        copied++;
      }
    }
    words.push({ th, syllables, zh: card.zh, lesson: lesson.title });
  }
}

const body = words.map(w => '  ' + JSON.stringify(w)).join(',\n');
await writeFile(new URL('data/class-words.js', root),
  `// 會話課（清心安神）裡，只用拼字盤上的字母就拼得出來的詞。\n// 由 scripts/build-class-words.mjs 產生，不要手改；老師教了新字母後重跑。\nexport const CLASS_WORDS = [\n${body}\n];\n`);
console.log(`會話課讀得出來的詞：${words.length} 個（新複製音檔 ${copied} 個）`);
if (noAudio.length) console.log(`沒有音檔、先不收：${noAudio.join(' ')}`);

// 「今天」一輪的出題與字母紀錄（純函式，不碰畫面與 localStorage）。
// 紀錄記在字母上（24 子音＋28 母音），不記在拼字盤 672 格上：
// 每個字母存「答對過的日期」與「最近一次認錯的日期」，在不同天答對兩次就算亮；認錯就熄掉重來。
// 出題：認錯過的字母先出，再來是還沒亮的，最後混幾個已經亮的；每題的子音都不一樣。
import { COMBO_CONSONANTS, COMBO_VOWELS, comboRow } from "../data/combos.js";

export const ROUND_SIZE = 12;
const MIX_LIT = 3;          // 每輪混進幾個已經亮的字母
const LIT_DAYS = 2;         // 在幾個不同的日子答對才算亮

export const CONSONANT_LETTERS = COMBO_CONSONANTS.map(x => x.c);
export const VOWEL_LETTERS = COMBO_VOWELS.map(x => x.v);
export const LETTERS = [...CONSONANT_LETTERS, ...VOWEL_LETTERS];
const isConsonant = letter => CONSONANT_LETTERS.includes(letter);

// 長得像、容易看錯的字母，聽音選字時優先拿來當另外幾個選項（同音的會自動排除）
export const LOOKALIKE = [
  ["ด", "ต"], ["บ", "ป"], ["ผ", "ฝ"], ["ก", "ถ"], ["ฎ", "ฏ"],
  ["◌ะ", "◌า"], ["◌ิ", "◌ี"], ["◌ึ", "◌ือ"], ["เ◌ะ", "เ◌"], ["แ◌ะ", "แ◌"], ["เ◌", "แ◌"],
  ["เ◌าะ", "◌อ"], ["เ◌า", "เ◌าะ"], ["◌ุ", "◌ู"], ["โ◌ะ", "โ◌"], ["เ◌อะ", "เ◌อ"],
  ["เ◌ือะ", "เ◌ือ"], ["เ◌ียะ", "เ◌ีย"], ["◌ัวะ", "◌ัว"]
];
const lookalikes = letter => LOOKALIKE.filter(p => p.includes(letter)).map(p => p[0] === letter ? p[1] : p[0]);

const BOARD = new Map();   // "子音|母音" → 拼字盤那一格
for (const c of CONSONANT_LETTERS) for (const item of comboRow(c)) BOARD.set(c + "|" + item.v, item);
const cell = (c, v) => BOARD.get(c + "|" + v);
const playable = item => item.audio && !item.carrier;

export const emptyState = () => ({ letters: {}, days: {}, confuse: {} });

export const isLit = rec => !!rec && rec.ok.length >= LIT_DAYS;
export const litCount = state => LETTERS.filter(l => isLit(state.letters[l])).length;

// 數字越大越先出：3 認錯過還沒答對回來、2 沒練過或隔天待確認、1 今天剛答對一次、0 已經亮
function priority(rec, date) {
  if (!rec) return 2;
  if (isLit(rec)) return 0;
  if (!rec.ok.length) return rec.miss ? 3 : 2;
  return rec.ok[rec.ok.length - 1] < date ? 2 : 1;
}

function record(state, letter, correct, date) {
  const rec = state.letters[letter] ||= { ok: [], miss: null };
  if (!correct) { rec.ok = []; rec.miss = date; return; }
  if (!rec.ok.includes(date)) rec.ok = [...rec.ok, date].slice(-LIT_DAYS);
}

function shuffle(list, rnd) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildRound(state, date, rnd = Math.random) {
  const rank = l => priority(state.letters[l], date);
  const byRank = list => shuffle(list, rnd).sort((a, b) => rank(b) - rank(a));
  const all = byRank(LETTERS);
  const lit = all.filter(l => rank(l) === 0).slice(0, MIX_LIT);
  const focus = all.filter(l => rank(l) > 0).slice(0, ROUND_SIZE - lit.length);
  // 還沒亮的不夠一輪就拿亮的補滿；亮的平均插在中間，不要全擠在最後
  for (const l of all) if (focus.length + lit.length < ROUND_SIZE && !focus.includes(l) && !lit.includes(l)) lit.push(l);
  lit.forEach((l, i) => focus.splice(Math.min(focus.length, 3 + i * 4), 0, l));

  const usedSyl = new Set(), usedLetter = new Set(focus);
  const round = [];
  for (const letter of focus) {
    const kind = isConsonant(letter) ? "c" : "v";
    const make = partner => kind === "c" ? cell(letter, partner) : cell(partner, letter);
    const partners = byRank(kind === "c" ? VOWEL_LETTERS : CONSONANT_LETTERS)
      .filter(p => playable(make(p)) && !usedSyl.has(make(p).syl));
    // 搭配的另一半盡量挑這輪還沒出現過的字母，同一個子音才不會連著出
    const partner = partners.find(p => !usedLetter.has(p)) || partners[0];
    if (!partner) continue;
    const item = make(partner);
    usedSyl.add(item.syl);
    usedLetter.add(partner);
    const q = { type: round.length % 2 ? "pick" : "read", focus: letter, kind, item };
    if (q.type === "pick") q.options = pickOptions(q, l => kind === "c" ? cell(l, partner) : cell(partner, l), rnd);
    round.push(q);
  }
  return round;
}

// 聽音選字的選項：只換這題要認的那個字母，另一半不變；讀音相同的（ส ศ ษ、ไ ใ…）不放在一起
function pickOptions(q, withLetter, rnd) {
  const same = q.kind === "c" ? CONSONANT_LETTERS : VOWEL_LETTERS;
  const near = lookalikes(q.focus);
  const others = [...shuffle(near, rnd), ...shuffle(same.filter(l => l !== q.focus && !near.includes(l)), rnd)];
  const options = [q.item];
  for (const l of others) {
    if (options.length === 4) break;
    const item = withLetter(l);
    if (!options.some(o => o.roma === item.roma)) options.push(item);
  }
  return shuffle(options, rnd);
}

// answer：看字念音是 fluent／slow／miss；聽音選字是選到的音節。回傳答對沒有（slow 回 null，不記）。
export function applyAnswer(state, q, answer, date) {
  if (q.type === "read") {
    if (answer === "slow") return null;
    const correct = answer === "fluent";
    record(state, q.item.c, correct, date);
    record(state, q.item.v, correct, date);
    return correct;
  }
  const correct = answer === q.item.syl;
  record(state, q.focus, correct, date);
  if (!correct) {
    const picked = q.options.find(o => o.syl === answer);
    const wrong = q.kind === "c" ? picked.c : picked.v;
    record(state, wrong, false, date);
    const key = [q.focus, wrong].sort().join("|");
    state.confuse[key] = (state.confuse[key] || 0) + 1;
  }
  return correct;
}

export function finishRound(state, date) {
  state.days[date] = (state.days[date] || 0) + 1;
}

// 到 date 為止最近 n 天，每天有沒有做完一輪（舊的在前）
export function lastDays(state, date, n = 7) {
  const out = [];
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const key = d.toLocaleDateString("sv");
    out.push({ date: key, done: !!state.days[key] });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

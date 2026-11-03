// 看字快讀：只看組好的泰文音節，自己先念，再按「聽答案」核對、自評。
// 題庫是拼字盤上有自己音檔的音節；改念整個單字（carrier）與不出聲的格子不出題。
// 卡住的（想了一下／還不會）在整輪結束後一起再練。
// 單字分頁也能快讀：只看整個單字，聽答案後才顯示拼音與中文。
// 跨日續練：卡住的音節／單字記在這台裝置（localStorage），下次可以先練「上次卡住的」；
// 要隔天以後答「直接念出」才從清單拿掉，當天答對不算記住。
import { COMBO_CONSONANTS, COMBO_VOWELS, comboRow, allCombos } from "../data/combos.js";
import { WORDS } from "../data/words.js";
import { playFile, stopSpeaking } from "./audio.js";

const MIX_SIZE = 12;
const RATINGS = [
  { id: "fluent", label: "直接念出" },
  { id: "slow", label: "想了一下" },
  { id: "miss", label: "還不會" }
];
const playable = x => x.audio && !x.carrier;

let panel, host, back, title, items, index, counts, stuck, revealed, failed, playing;
const HOSTS = { combo: ["quick", "combo-board", "回拼字盤"], word: ["quick-words", "words-board", "回單字"] };
const BOARD = new Map(allCombos().map(x => [x.syl, x]));
const wordItem = w => ({ syl: w.th, audio: "aom/" + w.th + ".mp3", word: w });

const STORE = "thai-letters-stuck-v1";
const today = () => new Date().toLocaleDateString("sv");   // 本機日期 YYYY-MM-DD
function loadStuck() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function remember(syl, rate) {
  const data = loadStuck();
  const list = data[host] ||= {};
  if (rate !== "fluent") list[syl] = today();
  else if (list[syl] && list[syl] < today()) delete list[syl];
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
}
function savedStuck(kind) {
  const keys = Object.keys(loadStuck()[kind] || {});
  if (kind === "word") return WORDS.filter(w => keys.includes(w.th)).map(wordItem);
  return keys.map(k => BOARD.get(k)).filter(x => x && playable(x));
}
export const stuckCount = kind => savedStuck(kind).length;
const mixCons = new Set(COMBO_CONSONANTS.map(x => x.c));
const mixVows = new Set(COMBO_VOWELS.map(x => x.v));

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function show(which) {
  for (const [k, [p, b]] of Object.entries(HOSTS)) {
    document.getElementById(p).hidden = k !== which;
    document.getElementById(b).hidden = k === which;
  }
  if (which) { host = which; panel = document.getElementById(HOSTS[which][0]); }
}

export function stopQuick() {
  playing = null;
  stopSpeaking();
  show(null);
}

// kind：row／row-shuffle／mix／stuck（拼字盤）、words／words-stuck（單字；consonant 是單字頁的篩選）
export function startQuick(kind, consonant, onExit) {
  back = onExit;
  show(kind.startsWith("words") ? "word" : "combo");
  if (kind === "mix") return renderSetup();
  if (kind === "stuck" || kind === "words-stuck") return beginRound(shuffle(savedStuck(host)).slice(0, MIX_SIZE), "上次卡住的");
  if (kind === "words") {
    const pool = WORDS.filter(w => consonant === "all" || w.syllables.some(s => BOARD.get(s).c === consonant));
    return beginRound(shuffle(pool).slice(0, MIX_SIZE).map(wordItem), "單字快讀");
  }
  const row = comboRow(consonant).filter(playable);
  beginRound(kind === "row" ? row : shuffle(row), consonant + " 這排・" + (kind === "row" ? "照順序" : "打亂"));
}

function renderSetup() {
  const pool = allCombos().filter(x => playable(x) && mixCons.has(x.c) && mixVows.has(x.v));
  const chip = (group, value, label) =>
    `<button class="quick-chip${group === "v" ? " quick-chip-v" : ""}${(group === "c" ? mixCons : mixVows).has(value) ? " active" : ""}" data-group="${group}" data-value="${value}">${label}</button>`;
  panel.innerHTML = `
    <div class="quick-head"><span class="quick-title">混合快讀・選範圍</span><button class="quick-exit">${HOSTS[host][2]}</button></div>
    <p class="quick-label">子音</p>
    <div class="quick-chips">${COMBO_CONSONANTS.map(({ c }) => chip("c", c, c)).join("")}</div>
    <p class="quick-label">母音</p>
    <div class="quick-chips">${COMBO_VOWELS.map(({ v }) => chip("v", v, v)).join("")}</div>
    <p class="quick-note">${pool.length
      ? `範圍內有 ${pool.length} 個音節，這輪隨機出 ${Math.min(MIX_SIZE, pool.length)} 題`
      : "這個範圍沒有可以練的音節（不出聲或改念單字的格子不出題），請多選幾個"}</p>
    <button class="quick-main" ${pool.length ? "" : "disabled"}>開始</button>`;
  panel.querySelectorAll(".quick-chip").forEach(btn => {
    btn.onclick = () => {
      const set = btn.dataset.group === "c" ? mixCons : mixVows;
      set.has(btn.dataset.value) ? set.delete(btn.dataset.value) : set.add(btn.dataset.value);
      renderSetup();
    };
  });
  panel.querySelector(".quick-exit").onclick = back;
  panel.querySelector(".quick-main").onclick = () => beginRound(shuffle(pool).slice(0, MIX_SIZE), "混合快讀");
}

function beginRound(list, name) {
  title = name;
  items = list;
  index = 0;
  counts = { fluent: 0, slow: 0, miss: 0 };
  stuck = [];
  renderQuestion();
}

function renderQuestion() {
  playing = null;
  stopSpeaking();
  revealed = false;
  failed = false;
  const item = items[index];
  panel.innerHTML = `
    <div class="quick-head"><span class="quick-title">${title}</span><span class="quick-count">${index + 1} / ${items.length}</span><button class="quick-exit">結束</button></div>
    <div class="quick-card">
      <div class="quick-syl${item.word ? " quick-word" : ""}">${item.syl}</div>
      <div class="quick-answer"></div>
    </div>
    <div class="quick-actions"></div>`;
  panel.querySelector(".quick-exit").onclick = back;
  renderActions();
}

function renderActions() {
  const item = items[index];
  const answer = panel.querySelector(".quick-answer"), actions = panel.querySelector(".quick-actions");
  if (!revealed) {
    answer.innerHTML = `<span class="quick-hint">先自己念，再聽答案</span>`;
    actions.innerHTML = `<button class="quick-main">聽答案</button>`;
    actions.querySelector(".quick-main").onclick = () => { revealed = true; play(); };
    return;
  }
  answer.innerHTML = item.word
    ? `<span class="quick-roma">${item.word.syllables.map(s => BOARD.get(s).roma).join(" ")}</span><span class="quick-parts">${item.word.syllables.join(" ・ ")}</span><span class="quick-zh">${item.word.zh}</span>`
    : `<span class="quick-roma">${item.roma}</span><span class="quick-parts">${item.c} ＋ ${item.v}</span>`;
  if (failed) {
    actions.innerHTML = `<p class="quick-error">音檔播不出來（可能是網路斷了或登入過期）</p>
      <div class="quick-row"><button class="quick-sub" data-act="retry">重試</button><button class="quick-sub" data-act="skip">跳過</button></div>`;
    actions.querySelector('[data-act="retry"]').onclick = play;
    actions.querySelector('[data-act="skip"]').onclick = next;   // 跳過不算自評
    return;
  }
  actions.innerHTML = `<button class="quick-sub quick-replay">↺ 再聽一次</button>
    <div class="quick-row">${RATINGS.map(r => `<button class="quick-rate" data-rate="${r.id}">${r.label}</button>`).join("")}</div>`;
  actions.querySelector(".quick-replay").onclick = play;
  actions.querySelectorAll(".quick-rate").forEach(btn => {
    btn.onclick = () => {
      counts[btn.dataset.rate]++;
      remember(item.syl, btn.dataset.rate);
      if (btn.dataset.rate !== "fluent" && !stuck.includes(item)) stuck.push(item);
      next();
    };
  });
}

function play() {
  failed = false;
  renderActions();
  const audio = playing = playFile(items[index].audio);
  // a late error from an earlier question's clip must not mark this one
  audio.onerror = () => { if (audio === playing) { failed = true; renderActions(); } };
}

function next() {
  index++;
  if (index < items.length) renderQuestion();
  else renderSummary();
}

function renderSummary() {
  playing = null;
  stopSpeaking();
  const rated = counts.fluent + counts.slow + counts.miss;
  panel.innerHTML = `
    <div class="quick-head"><span class="quick-title">${title}・完成</span></div>
    <div class="quick-summary">
      ${RATINGS.map(r => `<div class="quick-stat"><span class="quick-stat-num">${counts[r.id]}</span><span class="quick-stat-label">${r.label}</span></div>`).join("")}
    </div>
    ${rated < items.length ? `<p class="quick-note">跳過 ${items.length - rated} 題（沒有算進統計）</p>` : ""}
    ${stuck.length ? `<p class="quick-note">卡住的：<span class="quick-stuck">${stuck.map(x => x.syl).join("　")}</span></p>` : ""}
    <div class="quick-row">
      ${stuck.length ? `<button class="quick-main" data-act="again">再練卡住的（${stuck.length}）</button>` : ""}
      <button class="quick-sub" data-act="exit">${HOSTS[host][2]}</button>
    </div>`;
  const again = panel.querySelector('[data-act="again"]');
  if (again) again.onclick = () => beginRound(shuffle(stuck), "再練卡住的");
  panel.querySelector('[data-act="exit"]').onclick = back;
}

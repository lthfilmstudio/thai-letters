// 「今天」分頁：一顆按鈕開始一輪 12 題，看字念音與聽音選字交錯；出題與紀錄規則在 today-logic.js。
// 沒有欠題、沒有分數；做完一輪記一天，字母地圖顯示哪些字母已經在不同天答對兩次。
import {
  ROUND_SIZE, CONSONANT_LETTERS, VOWEL_LETTERS, LETTERS, emptyState, buildRound, applyAnswer,
  finishRound, isLit, litCount, lastDays, streakDays, pickClassWords
} from "./today-logic.js";
import { CLASS_WORDS } from "../data/class-words.js";
import { playFile, stopSpeaking } from "./audio.js";
import { signedIn, login, logout, syncDays } from "./cloud.js";

const STORE = "thai-letters-today-v1";
const RATINGS = [
  { id: "fluent", label: "直接念出" },
  { id: "slow", label: "想了一下" },
  { id: "miss", label: "還不會" }
];
const WEEKDAYS = "日一二三四五六";
const today = () => new Date().toLocaleDateString("sv");   // 本機日期 YYYY-MM-DD

let panel, state, round, index, missed, litBefore, playing;

function load() {
  try { return { ...emptyState(), ...JSON.parse(localStorage.getItem(STORE)) }; } catch { return emptyState(); }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
}

export function renderToday() {
  playing = null;
  stopSpeaking();
  panel = document.getElementById("today");
  state = load();
  const rounds = state.days[today()] || 0;
  // 老師教了新字母、詞表變多時提一次
  const newWords = state.classWords ? CLASS_WORDS.length - state.classWords : 0;
  if (state.classWords !== CLASS_WORDS.length) { state.classWords = CLASS_WORDS.length; save(); }
  const tile = l => `<span class="today-tile${VOWEL_LETTERS.includes(l) ? " today-tile-v" : ""}${isLit(state.letters[l]) ? " lit" : ""}">${l}</span>`;
  panel.innerHTML = `
    <div class="today-card">
      <p class="today-status">${rounds ? `今天完成 ${rounds} 輪` : "今天還沒練"}</p>
      <button class="quick-main today-start">${rounds ? "再來一輪" : "開始這一輪"}</button>
      <p class="quick-note">${ROUND_SIZE} 題認字母，最後念 2 個會話課的字</p>
      <div class="today-dots">${dots()}</div>
      <div class="today-streak"></div>
    </div>
    <div class="quick-head"><span class="quick-title">字母地圖</span><span class="quick-count">亮了 ${litCount(state)} / ${LETTERS.length}</span></div>
    <p class="quick-note">在不同天答對兩次就會亮起來，認錯了會先熄掉。</p>
    <div class="today-map">${CONSONANT_LETTERS.map(tile).join("")}</div>
    <div class="today-map">${VOWEL_LETTERS.map(tile).join("")}</div>
    <div class="quick-head today-class"><span class="quick-title">會話課的字</span><span class="quick-count">讀得出 ${CLASS_WORDS.length} 個</span></div>
    ${newWords > 0 ? `<p class="quick-note">比上次多了 ${newWords} 個</p>` : ""}`;
  panel.querySelector(".today-start").onclick = () => {
    round = [...buildRound(state, today()), ...pickClassWords(CLASS_WORDS)];
    index = 0;
    missed = new Set();
    litBefore = litCount(state);
    renderQuestion();
    panel.scrollIntoView();   // 手機上頁首很高，題目和選項要在同一個畫面裡
  };
  renderStreak();
}

function dots(came) {
  return lastDays(state, today(), 7, came).map(d =>
    `<span class="today-dot${d.done ? " done" : ""}"><i></i>${WEEKDAYS[new Date(d.date + "T12:00:00").getDay()]}</span>`).join("");
}

// 連續天數跟清心安神共用：登入後把做完一輪的日子寫上雲端，再讀回所有裝置有來的日子
async function renderStreak() {
  const box = panel.querySelector(".today-streak");
  const button = (label, run) => {
    box.insertAdjacentHTML("beforeend", `<button class="quick-sub">${label}</button>`);
    box.lastElementChild.onclick = run;
  };
  if (!signedIn()) {
    button("登入，跟清心安神共用連續天數", () => login().catch(() => { box.innerHTML = `<span class="quick-error">登入沒有成功，請再試一次</span>`; }));
    return;
  }
  box.innerHTML = `<span class="quick-hint">連續天數同步中…</span>`;
  let came;
  try { came = await syncDays(Object.keys(state.days)); } catch {}
  if (!box.isConnected) return;          // 等的時候已經開始練了
  if (!came) {
    box.innerHTML = `<span class="quick-hint">連續天數待同步</span>`;
    if (!signedIn()) renderStreak();     // 登入其實已經失效，換回登入按鈕
    return;
  }
  const set = new Set([...came, ...Object.keys(state.days)]);
  panel.querySelector(".today-dots").innerHTML = dots(set);
  box.innerHTML = `<span class="today-streak-num">連續 ${streakDays(set, today())} 天</span><span class="quick-hint">跟清心安神共用</span>`;
  button("登出", async () => { await logout(); renderToday(); });
}

function head() {
  return `<div class="quick-head"><span class="quick-title">${{ read: "看字念音", pick: "聽音選字", word: "會話課的字" }[round[index].type]}</span><span class="quick-count">${index + 1} / ${round.length}</span><button class="quick-exit">結束</button></div>`;
}

function renderQuestion() {
  playing = null;
  stopSpeaking();
  const q = round[index];
  if (q.type === "word") {
    panel.innerHTML = `${head()}
      <div class="quick-card"><div class="quick-syl quick-word">${q.word.th}</div><div class="quick-answer"><span class="quick-hint">這個字你會講，念念看</span></div></div>
      <div class="quick-actions"><button class="quick-main">聽答案</button></div>`;
    panel.querySelector(".quick-main").onclick = () => revealWord(q);
  } else if (q.type === "read") {
    panel.innerHTML = `${head()}
      <div class="quick-card"><div class="quick-syl">${q.item.syl}</div><div class="quick-answer"><span class="quick-hint">先自己念，再聽答案</span></div></div>
      <div class="quick-actions"><button class="quick-main">聽答案</button></div>`;
    panel.querySelector(".quick-main").onclick = () => revealRead(q);
  } else {
    panel.innerHTML = `${head()}
      <div class="quick-card"><button class="today-listen" aria-label="再聽一次"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 2l11 6-11 6V2z"/></svg></button><div class="quick-answer"><span class="quick-hint">聽到的是哪一個？</span></div></div>
      <div class="today-options">${q.options.map(o => `<button class="today-option" data-syl="${o.syl}">${o.syl}</button>`).join("")}</div>
      <div class="quick-actions"></div>`;
    panel.querySelector(".today-listen").onclick = () => play(q.item);
    panel.querySelectorAll(".today-option").forEach(btn => { btn.onclick = () => answerPick(q, btn.dataset.syl); });
    play(q.item);
  }
  panel.querySelector(".quick-exit").onclick = renderToday;
}

// 音檔播不出來（斷網或登入過期）：這題不記，讓她重試或跳過
function play(item) {
  const audio = playing = playFile(item.audio);
  audio.onerror = () => {
    if (audio !== playing) return;
    panel.querySelector(".quick-actions").innerHTML = `<p class="quick-error">音檔播不出來（可能是網路斷了或登入過期）</p>
      <div class="quick-row"><button class="quick-sub" data-act="retry">重試</button><button class="quick-sub" data-act="skip">跳過</button></div>`;
    panel.querySelector('[data-act="retry"]').onclick = () => { const q = round[index]; renderQuestion(); if (q.type === "read") revealRead(q); if (q.type === "word") revealWord(q); };
    panel.querySelector('[data-act="skip"]').onclick = next;
  };
}

function revealWord(q) {
  panel.querySelector(".quick-answer").innerHTML =
    `<span class="quick-roma">${q.roma}</span><span class="quick-parts">${q.word.syllables.join(" ・ ")}</span><span class="quick-zh">${q.word.zh}</span>`;
  panel.querySelector(".quick-actions").innerHTML = `<button class="quick-sub quick-replay">↺ 再聽一次</button><button class="quick-main">${index + 1 < round.length ? "下一題" : "完成"}</button>`;
  panel.querySelector(".quick-replay").onclick = () => play(q);
  panel.querySelector(".quick-main").onclick = next;
  play(q);
}

function revealRead(q) {
  panel.querySelector(".quick-answer").innerHTML =
    `<span class="quick-roma">${q.item.roma}</span><span class="quick-parts">${q.item.c} ＋ ${q.item.v}</span>`;
  panel.querySelector(".quick-actions").innerHTML = `<button class="quick-sub quick-replay">↺ 再聽一次</button>
    <div class="quick-row">${RATINGS.map(r => `<button class="quick-rate" data-rate="${r.id}">${r.label}</button>`).join("")}</div>`;
  panel.querySelector(".quick-replay").onclick = () => play(q.item);
  panel.querySelectorAll(".quick-rate").forEach(btn => {
    btn.onclick = () => {
      if (applyAnswer(state, q, btn.dataset.rate, today()) === false) { missed.add(q.item.c); missed.add(q.item.v); }
      save();
      next();
    };
  });
  play(q.item);
}

function answerPick(q, syl) {
  const correct = applyAnswer(state, q, syl, today());
  save();
  panel.querySelectorAll(".today-option").forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.syl === q.item.syl) btn.classList.add("right");
    else if (btn.dataset.syl === syl) btn.classList.add("wrong");
  });
  if (correct) {
    panel.querySelector(".quick-answer").innerHTML = `<span class="quick-roma">${q.item.roma}</span>`;
    const at = index;
    setTimeout(() => { if (round && index === at && panel.querySelector(".today-option.right")) next(); }, 700);
    return;
  }
  // 選錯：兩個並排，只標出不一樣的那個字母，各自可以點來聽
  const picked = q.options.find(o => o.syl === syl);
  const part = o => q.kind === "c" ? o.c : o.v;
  missed.add(part(q.item));
  missed.add(part(picked));
  const side = (o, label) => `<button class="today-side" data-audio="${o.audio || ""}">
      <span class="today-side-label">${label}</span><span class="today-side-syl">${o.syl}</span>
      <span class="today-side-part${q.kind === "v" ? " today-tile-v" : ""}">${part(o)}</span><span class="quick-roma">${o.roma}</span></button>`;
  panel.querySelector(".today-options").outerHTML =
    `<div class="today-compare">${side(q.item, "答案")}${side(picked, "你選的")}</div>`;
  panel.querySelector(".quick-card").outerHTML = `<p class="quick-note today-compare-hint">點兩邊聽聽看差在哪</p>`;
  panel.querySelectorAll(".today-side").forEach(btn => { if (btn.dataset.audio) btn.onclick = () => playFile(btn.dataset.audio); });
  panel.querySelector(".quick-actions").innerHTML = `<button class="quick-main">下一題</button>`;
  panel.querySelector(".quick-main").onclick = next;
}

function next() {
  index++;
  if (index < round.length) return renderQuestion();
  playing = null;
  stopSpeaking();
  finishRound(state, today());
  save();
  syncDays(Object.keys(state.days)).catch(() => {});   // 做完當下就寫上雲端，不等回到「今天」頁
  const gained = litCount(state) - litBefore;
  const stillDark = [...missed].filter(l => !isLit(state.letters[l]));
  panel.innerHTML = `
    <div class="quick-head"><span class="quick-title">這一輪完成</span></div>
    <div class="today-card">
      <p class="today-status">今天完成 ${state.days[today()]} 輪</p>
      ${gained > 0 ? `<p class="quick-note">新亮了 ${gained} 個字母</p>` : ""}
      ${stillDark.length ? `<p class="quick-note">下次會先出這幾個：<span class="quick-stuck today-tile-v">${stillDark.join("　")}</span></p>` : ""}
      <button class="quick-main">回今天</button>
    </div>`;
  panel.querySelector(".quick-main").onclick = renderToday;
}

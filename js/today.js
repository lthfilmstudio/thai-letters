// 「今天」分頁：一顆按鈕開始一輪 12 題，看字念音與聽音選字交錯；出題與紀錄規則在 today-logic.js。
// 沒有欠題、沒有分數；做完一輪記一天，字母地圖顯示哪些字母已經在不同天答對兩次。
import {
  ROUND_SIZE, CONSONANT_LETTERS, VOWEL_LETTERS, LETTERS, emptyState, buildRound, applyAnswer,
  finishRound, isLit, litCount, lastDays
} from "./today-logic.js";
import { playFile, stopSpeaking } from "./audio.js";

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
  const tile = l => `<span class="today-tile${VOWEL_LETTERS.includes(l) ? " today-tile-v" : ""}${isLit(state.letters[l]) ? " lit" : ""}">${l}</span>`;
  panel.innerHTML = `
    <div class="today-card">
      <p class="today-status">${rounds ? `今天完成 ${rounds} 輪` : "今天還沒練"}</p>
      <button class="quick-main today-start">${rounds ? "再來一輪" : "開始這一輪"}</button>
      <p class="quick-note">${ROUND_SIZE} 題，看字念音和聽音選字交錯</p>
      <div class="today-dots">${lastDays(state, today()).map(d =>
        `<span class="today-dot${d.done ? " done" : ""}"><i></i>${WEEKDAYS[new Date(d.date + "T12:00:00").getDay()]}</span>`).join("")}</div>
    </div>
    <div class="quick-head"><span class="quick-title">字母地圖</span><span class="quick-count">亮了 ${litCount(state)} / ${LETTERS.length}</span></div>
    <p class="quick-note">在不同天答對兩次就會亮起來，認錯了會先熄掉。</p>
    <div class="today-map">${CONSONANT_LETTERS.map(tile).join("")}</div>
    <div class="today-map">${VOWEL_LETTERS.map(tile).join("")}</div>`;
  panel.querySelector(".today-start").onclick = () => {
    round = buildRound(state, today());
    index = 0;
    missed = new Set();
    litBefore = litCount(state);
    renderQuestion();
    panel.scrollIntoView();   // 手機上頁首很高，題目和選項要在同一個畫面裡
  };
}

function head() {
  return `<div class="quick-head"><span class="quick-title">${round[index].type === "read" ? "看字念音" : "聽音選字"}</span><span class="quick-count">${index + 1} / ${round.length}</span><button class="quick-exit">結束</button></div>`;
}

function renderQuestion() {
  playing = null;
  stopSpeaking();
  const q = round[index];
  if (q.type === "read") {
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
    panel.querySelector('[data-act="retry"]').onclick = () => { renderQuestion(); if (round[index].type === "read") revealRead(round[index]); };
    panel.querySelector('[data-act="skip"]').onclick = next;
  };
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

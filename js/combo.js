import { COMBO_CONSONANTS, comboRow, TONE_MARKS, TONE_CONSONANTS, tonedRow } from "../data/combos.js";
import { playFile } from "./audio.js";
import { startQuick, stopQuick, stuckCount } from "./quick.js";

let current = COMBO_CONSONANTS[0].c;
let hideRoma = false;
let mark = "";   // "" = 不加聲調符號（原本的拼字盤）

export function renderCombo() {
  stopQuick();

  const picker = document.getElementById("combo-consonants");
  picker.innerHTML = "";
  COMBO_CONSONANTS.forEach(({ c }) => {
    const btn = document.createElement("button");
    btn.className = "combo-con" + (c === current ? " active" : "");
    btn.textContent = c;
    btn.onclick = () => { current = c; renderCombo(); };
    picker.appendChild(btn);
  });

  document.querySelectorAll(".roma-btn").forEach(btn => {
    btn.classList.toggle("active", (btn.dataset.roma === "hide") === hideRoma);
    btn.onclick = () => { hideRoma = btn.dataset.roma === "hide"; renderCombo(); };
  });
  document.querySelectorAll(".quick-btn").forEach(btn => {
    btn.onclick = () => startQuick(btn.dataset.quick, current, renderCombo);
    if (btn.dataset.quick === "stuck") {
      const n = stuckCount("combo");
      btn.hidden = !n;
      btn.textContent = `上次卡住的（${n}）`;
    }
  });

  // 聲調符號：課本練過的中字音（ก จ ต ป อ）才能切換，其他子音維持不加
  const toneOk = TONE_CONSONANTS.includes(current);
  if (!toneOk) mark = "";
  const tones = document.getElementById("combo-tones");
  tones.innerHTML = '<span class="words-hide-label">聲調</span>';
  [{ m: "", label: "不加" }, ...TONE_MARKS.map(t => ({ m: t.m, label: "◌" + t.m }))].forEach(({ m, label }) => {
    const btn = document.createElement("button");
    btn.className = "words-hide-btn tone-btn" + (m === mark ? " active" : "");
    btn.textContent = label;
    btn.disabled = !toneOk && m !== "";
    btn.onclick = () => { mark = m; renderCombo(); };
    tones.appendChild(btn);
  });
  const hint = document.createElement("span");
  hint.className = "tone-hint";
  hint.textContent = toneOk ? "" : "這個子音的聲調還沒練（課本練了 ก จ ต ป อ）";
  tones.appendChild(hint);
  document.querySelectorAll(".tone-ex").forEach(btn => { btn.onclick = () => playFile(btn.dataset.audio); });

  const word = document.getElementById("combo-word");
  word.classList.remove("show");

  const grid = document.getElementById("combo-grid");
  grid.classList.toggle("hide-roma", hideRoma);
  grid.innerHTML = "";
  (mark ? tonedRow(current, mark) : comboRow(current)).forEach(item => {
    const cell = document.createElement("button");
    cell.className = "combo-cell";
    cell.innerHTML = `<span class="combo-syl">${item.syl}</span><span class="combo-roma">${item.roma}</span>`;
    cell.onclick = () => {
      grid.querySelectorAll(".combo-cell").forEach(b => b.classList.remove("playing"));
      if (item.audio) {
        cell.classList.add("playing");
        const audio = playFile(item.audio);
        audio.onended = audio.onerror = () => cell.classList.remove("playing");
      }
      if (item.carrier) {
        word.innerHTML = `<span class="combo-word-thai">${item.carrier.word}</span><span class="combo-word-zh">${item.carrier.zh}</span>`;
        word.classList.add("show");
      } else if (item.zh) {
        word.innerHTML = `<span class="combo-word-thai">${item.syl}</span><span class="combo-word-zh">${item.zh}</span>`;
        word.classList.add("show");
      } else {
        word.classList.remove("show");
      }
    };
    grid.appendChild(cell);
  });
}

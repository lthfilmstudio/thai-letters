import { COMBO_CONSONANTS, allCombos } from "../data/combos.js";
import { WORDS } from "../data/words.js";
import { playFile } from "./audio.js";

const BOARD = new Map(allCombos().map(x => [x.syl, x]));
let current = "all";
let hide = "none"; // none | zh | th

export function renderWords() {
  const picker = document.getElementById("words-consonants");
  picker.innerHTML = "";
  [{ c: "all", label: "全部" }, ...COMBO_CONSONANTS.map(({ c }) => ({ c, label: c }))]
    .filter(({ c }) => c === "all" || WORDS.some(w => w.syllables.some(s => BOARD.get(s).c === c)))
    .forEach(({ c, label }) => {
      const btn = document.createElement("button");
      btn.className = "combo-con" + (c === "all" ? " words-all" : "") + (c === current ? " active" : "");
      btn.textContent = label;
      btn.onclick = () => { current = c; renderWords(); };
      picker.appendChild(btn);
    });

  document.querySelectorAll(".words-hide-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.hide === hide);
    btn.onclick = () => { hide = btn.dataset.hide; renderWords(); };
  });

  const list = document.getElementById("words-list");
  list.innerHTML = "";
  WORDS.filter(w => current === "all" || w.syllables.some(s => BOARD.get(s).c === current))
    .forEach(w => list.appendChild(card(w)));
}

function card(w) {
  const el = document.createElement("div");
  el.className = "word-card";

  const th = document.createElement("button");
  th.className = "word-th" + (hide === "th" ? " covered" : "");
  th.textContent = w.th;
  th.onclick = () => {
    if (th.classList.contains("covered")) { th.classList.remove("covered"); return; }
    const audio = playFile("aom/" + w.th + ".mp3");
    el.classList.add("playing");
    audio.onended = audio.onerror = () => el.classList.remove("playing");
  };

  const zh = document.createElement("button");
  zh.className = "word-zh" + (hide === "zh" ? " covered" : "");
  zh.textContent = w.zh;
  zh.onclick = () => zh.classList.remove("covered");

  const head = document.createElement("div");
  head.className = "word-head";
  head.append(th);
  if (w.teacher) {
    const tag = document.createElement("span");
    tag.className = "word-tag";
    tag.textContent = "老師教過";
    head.append(tag);
  }

  // 拆字：每個音節 = 子音 + 母音，點了念拼字盤那一格
  const parts = document.createElement("div");
  parts.className = "word-parts";
  w.syllables.forEach(s => {
    const b = BOARD.get(s);
    const chip = document.createElement("button");
    chip.className = "word-part";
    chip.innerHTML = `<span class="wp-c">${b.c}</span><span class="wp-plus">+</span><span class="wp-v">${b.v}</span><span class="wp-roma">${b.roma}</span>`;
    if (b.audio) chip.onclick = () => playFile(b.audio);
    else chip.disabled = true;
    parts.appendChild(chip);
  });

  el.append(head, zh, parts);
  return el;
}

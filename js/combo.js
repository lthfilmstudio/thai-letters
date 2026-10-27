import { COMBO_CONSONANTS, comboRow } from "../data/combos.js";
import { playFile } from "./audio.js";
import { startQuick, stopQuick } from "./quick.js";

let current = COMBO_CONSONANTS[0].c;
let hideRoma = false;

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
  });

  const word = document.getElementById("combo-word");
  word.classList.remove("show");

  const grid = document.getElementById("combo-grid");
  grid.classList.toggle("hide-roma", hideRoma);
  grid.innerHTML = "";
  comboRow(current).forEach(item => {
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

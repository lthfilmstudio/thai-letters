import { speak } from "./audio.js";
import { renderCatTabs } from "./browse.js";

const TIPS = {
  consonant: "提示：泰文書寫從圓圈（หัว）開始，順時針或逆時針依字母而定，最後寫主體線條。",
  vowel:     "提示：母音可寫在子音的前、後、上、下，書寫順序仍以子音為先。",
  tone:      "提示：聲調符號永遠寫在字的最上方，於母音之上。"
};

const CAT_LABEL = {
  consonant: "CONSONANT",
  vowel:     "VOWEL",
  tone:      "TONE MARK"
};

export function renderWrite(categories, state) {
  renderCatTabs("write-cat-tabs", categories, state, () => {
    state.writeIndex = 0;
    renderWrite(categories, state);
  });

  const data = categories.find(c => c.id === state.category).data;
  const list = document.getElementById("write-list");
  list.innerHTML = "";
  data.forEach((item, i) => {
    const cell = document.createElement("button");
    cell.className = "write-letter-item" + (i === state.writeIndex ? " active" : "");
    cell.textContent = item.c;
    cell.onclick = () => { state.writeIndex = i; renderWrite(categories, state); };
    list.appendChild(cell);
  });

  const cur = data[state.writeIndex];
  document.getElementById("write-display").textContent = cur.c;
  document.getElementById("write-cat-label").textContent = CAT_LABEL[state.category];
  document.getElementById("wi-name").textContent = cur.name;
  document.getElementById("wi-roma").textContent = cur.roma;
  document.getElementById("wi-zh").textContent = cur.zh;
  document.getElementById("write-tip").textContent = TIPS[state.category];
}

export function initWrite(categories, state) {
  document.getElementById("write-prev").onclick = () => {
    const data = categories.find(c => c.id === state.category).data;
    state.writeIndex = (state.writeIndex - 1 + data.length) % data.length;
    renderWrite(categories, state);
  };
  document.getElementById("write-next").onclick = () => {
    const data = categories.find(c => c.id === state.category).data;
    state.writeIndex = (state.writeIndex + 1) % data.length;
    renderWrite(categories, state);
  };
  document.getElementById("write-play").onclick = () => {
    const data = categories.find(c => c.id === state.category).data;
    speak(data[state.writeIndex].c);
  };
}

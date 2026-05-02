import { speak } from "./audio.js";

function toneLabel(t) {
  return ({ mid: "中音", high: "高音", low: "低音", none: "—" })[t] || "—";
}

export function openModal(item) {
  document.getElementById("m-char").textContent = item.c;
  document.getElementById("m-name").textContent = item.name;
  document.getElementById("m-roma").textContent = item.roma;
  document.getElementById("m-zh").textContent = item.zh;

  const toneTag = document.getElementById("m-tone");
  toneTag.dataset.tone = item.tone;
  toneTag.textContent = toneLabel(item.tone);
  toneTag.style.display = item.tone === "none" ? "none" : "inline-block";

  const repRow = document.getElementById("m-rep-row");
  if (item.rep) {
    repRow.style.display = "";
    document.getElementById("m-rep-icon").textContent = item.repIcon || "•";
    document.getElementById("m-rep-thai").textContent = item.rep;
    document.getElementById("m-rep-zh").textContent = "";
  } else {
    repRow.style.display = "none";
  }

  const classRow = document.getElementById("m-class-row");
  if (item.tone && item.tone !== "none") {
    classRow.style.display = "";
    document.getElementById("m-class").textContent = toneLabel(item.tone) + " (" + item.tone + ")";
  } else {
    classRow.style.display = "none";
  }

  const playBtn = document.getElementById("m-play");
  playBtn.onclick = () => {
    playBtn.classList.add("playing");
    const utter = speak(item.c);
    if (utter) {
      utter.onend = () => playBtn.classList.remove("playing");
    } else {
      setTimeout(() => playBtn.classList.remove("playing"), 600);
    }
  };

  document.getElementById("modal-backdrop").classList.add("open");
}

export function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("open");
  speechSynthesis.cancel();
}

export function initModal() {
  document.getElementById("modal-close").onclick = closeModal;
  document.getElementById("modal-backdrop").onclick = (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

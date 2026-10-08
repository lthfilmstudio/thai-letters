import { speak, stopSpeaking } from "./audio.js";
import { showStrokeSample, stopStrokeSample } from "./stroke-sample.js";

function toneLabel(t) {
  return ({ mid: "中音", high: "高音", low: "低音", none: "—" })[t] || "—";
}

function wireInlinePlay(id, c, kind) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.onclick = () => {
    btn.classList.add("playing");
    const audio = speak(c, kind);
    if (audio) {
      audio.onended = audio.onerror = () => btn.classList.remove("playing");
    } else {
      setTimeout(() => btn.classList.remove("playing"), 600);
    }
  };
}

export function openModal(item) {
  document.getElementById("m-char").textContent = item.c;
  const nameThai = item.rep ? item.rep.replace(/\s*[（(][^）)]*[）)]/, "").trim() : item.c;
  document.getElementById("m-name").textContent = nameThai;
  document.getElementById("m-roma").textContent = item.roma;

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

  document.getElementById("m-font-noto").textContent = item.c;

  // Play buttons
  wireInlinePlay("m-play-name", item.c, 1);
  wireInlinePlay("m-play-rep", item.c, 1);

  const playBtn = document.getElementById("m-play");
  playBtn.onclick = () => {
    playBtn.classList.add("playing");
    const audio = speak(item.c);
    if (audio) {
      audio.onended = audio.onerror = () => playBtn.classList.remove("playing");
    } else {
      setTimeout(() => playBtn.classList.remove("playing"), 600);
    }
  };

  document.getElementById("modal-backdrop").classList.add("open");
  showStrokeSample(item.c);
}

export function closeModal() {
  stopStrokeSample();
  document.getElementById("modal-backdrop").classList.remove("open");
  stopSpeaking();
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

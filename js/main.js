import { CONSONANTS } from "../data/consonants.js";
import { VOWELS }     from "../data/vowels.js";
import { TONES }      from "../data/tones.js";
import { renderBrowse } from "./browse.js";
import { initModal }    from "./modal.js";
import { initQuiz }     from "./quiz.js";
import { renderWrite, initWrite } from "./write.js";

const CATEGORIES = [
  { id: "consonant", label: "子音",   count: CONSONANTS.length, data: CONSONANTS },
  { id: "vowel",     label: "母音",   count: VOWELS.length,     data: VOWELS     },
  { id: "tone",      label: "聲調符號", count: TONES.length,    data: TONES      }
];

const state = {
  mode: "browse",
  category: "consonant",
  toneFilter: "all",
  quizDir: "char-to-roma",
  quizTotal: 0,
  quizCorrect: 0,
  quizWrong: 0,
  quizCurrent: null,
  writeIndex: 0
};

initModal();
const quiz = initQuiz(CONSONANTS, VOWELS, state);
initWrite(CATEGORIES, state);

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.mode = btn.dataset.mode;
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById("view-" + state.mode).classList.add("active");

    if (state.mode === "browse") renderBrowse(CATEGORIES, state);
    if (state.mode === "quiz" && state.quizTotal === 0) quiz.newQuestion();
    if (state.mode === "write") renderWrite(CATEGORIES, state);
  };
});

renderBrowse(CATEGORIES, state);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

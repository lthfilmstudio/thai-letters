import { CONSONANTS as RAW_CONSONANTS } from "../data/consonants.js";
import { VOWELS     as RAW_VOWELS     } from "../data/vowels.js";
import { TONES      as RAW_TONES      } from "../data/tones.js";
import { renderBrowse } from "./browse.js";
import { initModal }    from "./modal.js";
import { initQuiz }     from "./quiz.js";
import { renderWrite, initWrite } from "./write.js";
import { loadState }    from "./state.js";
import { initSrsMode }  from "./srs-mode.js";

// 給每個 letter 帶上 _type，SRS 用 `${type}:${c}` 當 progress key 區分跨類別同字
const CONSONANTS = RAW_CONSONANTS.map(l => ({ ...l, _type: "consonant" }));
const VOWELS     = RAW_VOWELS.map(l => ({ ...l, _type: "vowel" }));
const TONES      = RAW_TONES.map(l => ({ ...l, _type: "tone" }));

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

loadState();
initModal();
const quiz = initQuiz(CONSONANTS, VOWELS, state);
initWrite(CATEGORIES, state);
const srs = initSrsMode(CONSONANTS, VOWELS);

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
    if (state.mode === "srs") srs.enter();
  };
});

renderBrowse(CATEGORIES, state);
srs.refreshBadge();   // 初始即顯示「今日複習 (N)」徽章

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

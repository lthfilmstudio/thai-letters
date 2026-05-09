/* SRS 「今日複習」mode：只從 due 字母出題，答對自動 good、答錯自動 bad，自動跳下一張。
   問答 UI 沿用 quiz 的 markup，但有自己的 state 不會跟 freestyle quiz 互相干擾。 */

import { speak } from "./audio.js";
import { lstate, setLetterGrade } from "./state.js";
import { getDueLetters, countDue, nextReviewAtMin, daysUntil, formatNextReview } from "./srs.js";

function pickDistractors(pool, n, exclude) {
  const candidates = pool.filter(x => x !== exclude);
  const out = [];
  while (out.length < n && candidates.length) {
    const idx = Math.floor(Math.random() * candidates.length);
    out.push(candidates.splice(idx, 1)[0]);
  }
  return out;
}

export function initSrsMode(consonants, vowels) {
  // pool 跟 quiz mode 對齊：consonants + vowels（tones 太少先略過）
  const pool = consonants.concat(vowels);

  const srsState = {
    dir: "char-to-roma",
    correct: 0,
    wrong: 0,
    queueAtStart: 0,
    current: null,
  };

  function $(id) { return document.getElementById(id); }

  function showResult(on) {
    // .quiz-result 預設 display:none，加 .show 才顯示（沿用 quiz.js 慣例）
    $("srs-result").classList.toggle("show", on);
  }

  function showDone(on) {
    $("srs-done").classList.toggle("show", on);
  }

  function refreshTabBadge() {
    const due = countDue(pool, lstate.progress);
    const el = $("srs-tab-count");
    if (el) el.textContent = due > 0 ? `(${due})` : "";
    return due;
  }

  function showDoneState() {
    showResult(false);
    $("srs-options").innerHTML = "";
    $("srs-prompt").textContent = "";
    $("srs-prompt").classList.remove("small");
    $("srs-label").textContent = "";
    $("srs-progress-text").textContent = "";
    $("srs-progress-fill").style.width = "0%";
    $("srs-due").textContent = "0";

    const min = nextReviewAtMin(lstate.progress);
    const sub = $("srs-done-sub");
    if (Object.keys(lstate.progress).length === 0) {
      $("srs-done").querySelector(".srs-done-title").textContent = "還沒開始";
      sub.textContent = "選個方向開始第一題";
    } else if (min) {
      $("srs-done").querySelector(".srs-done-title").textContent = "今日複習完成";
      sub.textContent = `下次複習：${formatNextReview(daysUntil(min))}`;
    } else {
      $("srs-done").querySelector(".srs-done-title").textContent = "今日複習完成";
      sub.textContent = "明天再來吧";
    }
    showDone(true);
  }

  function newQuestion() {
    showDone(false);
    showResult(false);

    const due = getDueLetters(pool, lstate.progress);
    refreshTabBadge();

    if (!due.length) {
      showDoneState();
      return;
    }

    // queueAtStart 是這輪一開始的 due 數，用來算進度條
    if (srsState.queueAtStart === 0 || due.length > srsState.queueAtStart) {
      srsState.queueAtStart = due.length;
    }

    const ans = due[0];
    const distractors = pickDistractors(pool, 3, ans);
    const options = [ans, ...distractors].sort(() => Math.random() - 0.5);
    srsState.current = { ans, options };

    const promptEl = $("srs-prompt");
    const labelEl = $("srs-label");
    const optsEl = $("srs-options");
    optsEl.innerHTML = "";

    if (srsState.dir === "char-to-roma") {
      promptEl.textContent = ans.c;
      promptEl.classList.remove("small");
      labelEl.textContent = "這個字母的讀音是？";
      options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.innerHTML = `<div class="opt-roma">${opt.roma}</div>`;
        btn.onclick = () => answer(opt, btn, options, ans);
        optsEl.appendChild(btn);
      });
    } else {
      promptEl.textContent = ans.roma;
      promptEl.classList.add("small");
      labelEl.textContent = "對應的字母是？";
      options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.innerHTML = `<div class="opt-thai">${opt.c}</div>`;
        btn.onclick = () => answer(opt, btn, options, ans);
        optsEl.appendChild(btn);
      });
    }

    // 進度：done = queueAtStart - dueRemain
    const remain = due.length;
    $("srs-due").textContent = remain;
    const done = Math.max(0, srsState.queueAtStart - remain);
    $("srs-progress-text").textContent = `${done + 1} / ${srsState.queueAtStart}`;
    const pct = Math.round(((done) / srsState.queueAtStart) * 100);
    $("srs-progress-fill").style.width = pct + "%";
  }

  function answer(picked, btn, options, ans) {
    const correct = picked === ans;
    const allBtns = document.querySelectorAll("#srs-options .quiz-option");
    allBtns.forEach((b, i) => {
      b.disabled = true;
      if (options[i] === ans) b.classList.add("correct");
      if (b === btn && !correct) b.classList.add("wrong");
    });

    if (correct) {
      srsState.correct++;
      $("srs-correct").textContent = srsState.correct;
      $("srs-feedback").textContent = "✓  正確";
      $("srs-feedback").className = "quiz-result-feedback correct";
      setLetterGrade(ans, "good");
    } else {
      srsState.wrong++;
      $("srs-wrong").textContent = srsState.wrong;
      $("srs-feedback").textContent = "✗  再試一次";
      $("srs-feedback").className = "quiz-result-feedback wrong";
      setLetterGrade(ans, "bad");
    }

    $("srs-detail").innerHTML =
      `<strong>${ans.c}</strong> · ${ans.name} · <span style="color:var(--gold);font-family:'JetBrains Mono',monospace;">${ans.roma}</span> · ${ans.zh}`;

    showResult(true);
    speak(ans.c);
    refreshTabBadge();
  }

  $("srs-next").onclick = newQuestion;

  document.querySelectorAll("[data-srs-dir]").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll("[data-srs-dir]").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      srsState.dir = b.dataset.srsDir;
      newQuestion();
    };
  });

  return {
    enter() {
      // 進 mode 時重置本輪計分（不影響 SRS 持久進度）
      srsState.correct = 0;
      srsState.wrong = 0;
      srsState.queueAtStart = 0;
      $("srs-correct").textContent = "0";
      $("srs-wrong").textContent = "0";
      newQuestion();
    },
    refreshBadge: refreshTabBadge,
  };
}

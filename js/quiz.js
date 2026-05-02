import { speak } from "./audio.js";

function pickRandom(arr, n, exclude) {
  const pool = arr.filter(x => x !== exclude);
  const out = [];
  while (out.length < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function initQuiz(consonants, vowels, state) {
  const pool = consonants.concat(vowels);

  function newQuestion() {
    const ans = pool[Math.floor(Math.random() * pool.length)];
    const distractors = pickRandom(pool, 3, ans);
    const options = [ans, ...distractors].sort(() => Math.random() - 0.5);
    state.quizCurrent = { ans, options };

    document.getElementById("quiz-result").classList.remove("show");

    const promptEl = document.getElementById("quiz-prompt");
    const labelEl  = document.getElementById("quiz-label");
    const optsEl   = document.getElementById("quiz-options");
    optsEl.innerHTML = "";

    if (state.quizDir === "char-to-roma") {
      promptEl.textContent = ans.c;
      promptEl.classList.remove("small");
      labelEl.textContent = "這個字母的讀音是？";
      options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.innerHTML = `<div class="opt-roma">${opt.roma}</div>`;
        btn.onclick = () => answerQuiz(opt, btn, options, ans);
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
        btn.onclick = () => answerQuiz(opt, btn, options, ans);
        optsEl.appendChild(btn);
      });
    }

    state.quizTotal++;
    document.getElementById("qp-num").textContent = "Q" + state.quizTotal;
    document.getElementById("qs-total").textContent = state.quizTotal;
  }

  function answerQuiz(picked, btn, options, ans) {
    const correct = picked === ans;
    const allBtns = document.querySelectorAll("#quiz-options .quiz-option");
    allBtns.forEach((b, i) => {
      b.disabled = true;
      if (options[i] === ans) b.classList.add("correct");
      if (b === btn && !correct) b.classList.add("wrong");
    });

    if (correct) {
      state.quizCorrect++;
      document.getElementById("qs-correct").textContent = state.quizCorrect;
      document.getElementById("qr-feedback").textContent = "✓  正確";
      document.getElementById("qr-feedback").className = "quiz-result-feedback correct";
    } else {
      state.quizWrong++;
      document.getElementById("qs-wrong").textContent = state.quizWrong;
      document.getElementById("qr-feedback").textContent = "✗  再試一次";
      document.getElementById("qr-feedback").className = "quiz-result-feedback wrong";
    }

    document.getElementById("qr-detail").innerHTML =
      `<strong>${ans.c}</strong> · ${ans.name} · <span style="color:var(--gold);font-family:'JetBrains Mono',monospace;">${ans.roma}</span> · ${ans.zh}`;

    const pct = Math.min(100, Math.round(state.quizCorrect / 20 * 100));
    document.getElementById("qp-fill").style.width = pct + "%";
    document.getElementById("qp-pct").textContent = pct + "%";

    document.getElementById("quiz-result").classList.add("show");
    speak(ans.c);
  }

  document.getElementById("qr-next").onclick = newQuestion;

  document.querySelectorAll(".quiz-dir-btn").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll(".quiz-dir-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      state.quizDir = b.dataset.dir;
      newQuestion();
    };
  });

  return { newQuestion };
}

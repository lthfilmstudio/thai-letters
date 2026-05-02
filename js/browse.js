import { openModal } from "./modal.js";

export function renderCatTabs(containerId, categories, state, onChange) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "cat-tab" + (cat.id === state.category ? " active" : "");
    btn.innerHTML = `${cat.label}<span class="count">${cat.count}</span>`;
    btn.onclick = () => { state.category = cat.id; onChange(); };
    el.appendChild(btn);
  });
}

export function renderBrowse(categories, state) {
  renderCatTabs("cat-tabs", categories, state, () => {
    state.toneFilter = "all";
    renderBrowse(categories, state);
  });

  const tf = document.getElementById("tone-filter");
  tf.classList.toggle("visible", state.category === "consonant");
  tf.querySelectorAll(".tone-pill").forEach(pill => {
    pill.classList.toggle("active", pill.dataset.tone === state.toneFilter);
    pill.onclick = () => {
      state.toneFilter = pill.dataset.tone;
      renderBrowse(categories, state);
    };
  });

  const catData = categories.find(c => c.id === state.category).data;
  let data = catData;
  if (state.category === "consonant" && state.toneFilter !== "all") {
    data = data.filter(d => d.tone === state.toneFilter);
  }

  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  if (data.length === 0) {
    grid.innerHTML = '<div class="empty-state">這個分類下沒有項目</div>';
  } else {
    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "letter-card";
      card.dataset.tone = item.tone;
      card.innerHTML = `
        <div class="letter-char">${item.c}</div>
        <div class="letter-meta">
          <div class="letter-romanization">${item.roma}</div>
          <div class="letter-rep">${item.zh}</div>
        </div>
      `;
      card.onclick = () => openModal(item);
      grid.appendChild(card);
    });
  }

  document.getElementById("stat-total").textContent = catData.length;
  document.getElementById("stat-current").textContent = data.length;
}

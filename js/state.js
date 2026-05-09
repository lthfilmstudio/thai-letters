/* 狀態與 localStorage 持久化（thai-letters）。
   key 設計沿用 progKey = `${type}:${c}`，type ∈ consonant / vowel / tone。 */

import { nextReview, countDue } from "./srs.js";

const STORAGE_KEY = "thai-letters-v1";

export const lstate = {
  progress: {},   // { 'consonant:ก': { grade, nextReviewAt, interval, ... } }
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    lstate.progress = s.progress || {};
  } catch (e) {
    // 損毀的 localStorage 忽略
  }
}

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      progress: lstate.progress,
    }));
  } catch (e) {
    console.warn("state save failed:", e.message);
  }
}

export function setLetterGrade(letter, gradeStr) {
  const k = `${letter._type}:${letter.c}`;
  if (!gradeStr) {
    delete lstate.progress[k];
  } else {
    const prev = lstate.progress[k];
    const prevObj = (prev && typeof prev === "object") ? prev : {};
    lstate.progress[k] = nextReview(gradeStr, prevObj);
  }
  saveState();
}

/* 整數 due 計數（含未評過的新卡） */
export function getLettersDueCount(allLetters) {
  return countDue(allLetters, lstate.progress);
}

/* SRS 排程：SM-2 簡化版（同 thai-review）。
   2 檔評分（quiz 多選題答對=good、答錯=bad），但保留 ok 之後可能用得到。
   key 格式：`${type}:${c}` 例如 'consonant:ก'。 */

const DAY_MS = 86400000;
const GRADE_Q = { bad: 2, ok: 3, good: 5 };

export function nextReview(gradeStr, prev = {}, now = Date.now()) {
  const q = GRADE_Q[gradeStr] ?? 3;
  let { interval = 0, easeFactor = 2.5, reps = 0 } = prev;

  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * easeFactor);
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }

  return {
    grade: gradeStr,
    reviewedAt: now,
    nextReviewAt: now + interval * DAY_MS,
    interval,
    easeFactor,
    reps,
    updatedAt: now,
  };
}

/* due 的兩種定義：
   - 嚴格 (isDue)：「曾評過 + 已到期」— 給 thai-review 用避免初始爆量
   - 寬鬆 (isDueOrNew)：「未評過 OR 已到期」— letters 用，初始全 75 入隊 */
export function isDueOrNew(progressEntry, now = Date.now()) {
  if (!progressEntry || typeof progressEntry !== 'object') return true;
  return (progressEntry.nextReviewAt ?? 0) <= now;
}

export function getDueLetters(allLetters, progress, now = Date.now()) {
  return allLetters
    .filter(l => isDueOrNew(progress[`${l._type}:${l.c}`], now))
    .sort((a, b) => {
      const ka = `${a._type}:${a.c}`, kb = `${b._type}:${b.c}`;
      const na = progress[ka]?.nextReviewAt ?? 0;
      const nb = progress[kb]?.nextReviewAt ?? 0;
      return na - nb;
    });
}

export function countDue(allLetters, progress, now = Date.now()) {
  let n = 0;
  for (const l of allLetters) {
    if (isDueOrNew(progress[`${l._type}:${l.c}`], now)) n++;
  }
  return n;
}

export function nextReviewAtMin(progress, now = Date.now()) {
  let min = Infinity;
  for (const k in progress) {
    const e = progress[k];
    if (!e || typeof e !== 'object') continue;
    if (typeof e.nextReviewAt !== 'number') continue;
    if (e.nextReviewAt <= now) continue;
    if (e.nextReviewAt < min) min = e.nextReviewAt;
  }
  return min === Infinity ? null : min;
}

export function formatNextReview(intervalDays) {
  if (intervalDays < 1) return '< 1 天';
  if (intervalDays === 1) return '明天';
  if (intervalDays < 7) return `${intervalDays} 天後`;
  if (intervalDays < 30) return `${Math.round(intervalDays / 7)} 週後`;
  if (intervalDays < 365) return `${Math.round(intervalDays / 30)} 個月後`;
  return '> 1 年';
}

export function daysUntil(targetMs, now = Date.now()) {
  if (typeof targetMs !== 'number') return 0;
  const ms = targetMs - now;
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / DAY_MS));
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUND_SIZE, LETTERS, LOOKALIKE, emptyState, buildRound, applyAnswer, finishRound,
  isLit, litCount, lastDays
} from '../js/today-logic.js';

// deterministic rng so a failure reproduces
const rng = (seed = 1) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

test('52 letters, lookalike table only names letters on the board', () => {
  assert.equal(LETTERS.length, 52);
  for (const pair of LOOKALIKE) for (const l of pair) assert.ok(LETTERS.includes(l), l);
});

test('a round is 12 playable questions, alternating types, no repeated syllable or consonant', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const round = buildRound(emptyState(), '2026-11-13', rng(seed));
    assert.equal(round.length, ROUND_SIZE);
    assert.equal(new Set(round.map(q => q.item.syl)).size, ROUND_SIZE);
    assert.equal(new Set(round.map(q => q.item.c)).size, ROUND_SIZE, 'every question has a different consonant');
    round.forEach((q, i) => {
      assert.ok(q.item.audio && !q.item.carrier, q.item.syl + ' has its own clip');
      assert.equal(q.type, i % 2 ? 'pick' : 'read');
      assert.ok(q.focus === q.item.c || q.focus === q.item.v);
    });
  }
});

test('pick options: four choices, the answer among them, none sound alike, only the focus letter varies', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const q of buildRound(emptyState(), '2026-11-13', rng(seed)).filter(q => q.type === 'pick')) {
      assert.equal(q.options.length, 4);
      assert.ok(q.options.includes(q.item));
      assert.equal(new Set(q.options.map(o => o.roma)).size, 4, q.options.map(o => o.syl).join(' ') + ' all sound different');
      const fixed = q.kind === 'c' ? 'v' : 'c';
      for (const o of q.options) assert.equal(o[fixed], q.item[fixed]);
    }
  }
});

test('homophones are never offered against each other', () => {
  const groups = [['ส', 'ศ', 'ษ'], ['ถ', 'ฐ'], ['ด', 'ฎ'], ['ต', 'ฏ'], ['ไ◌', 'ใ◌']];
  for (let seed = 1; seed <= 300; seed++) {
    for (const q of buildRound(emptyState(), '2026-11-13', rng(seed)).filter(q => q.type === 'pick')) {
      const varied = q.options.map(o => q.kind === 'c' ? o.c : o.v);
      for (const g of groups) assert.ok(varied.filter(l => g.includes(l)).length <= 1, varied.join(' '));
    }
  }
});

test('a letter lights up after correct answers on two different days, and goes dark on a miss', () => {
  const s = emptyState();
  const q = { type: 'pick', focus: 'ก', kind: 'c', item: { syl: 'กา', c: 'ก', v: '◌า' }, options: [{ syl: 'กา', c: 'ก', v: '◌า' }, { syl: 'ถา', c: 'ถ', v: '◌า' }] };
  applyAnswer(s, q, 'กา', '2026-11-13');
  applyAnswer(s, q, 'กา', '2026-11-13');
  assert.equal(isLit(s.letters['ก']), false, 'same day twice is not enough');
  applyAnswer(s, q, 'กา', '2026-11-14');
  assert.equal(isLit(s.letters['ก']), true);
  assert.equal(litCount(s), 1);
  assert.equal(s.letters['◌า'], undefined, 'pick only judges the letter that varied');
  applyAnswer(s, q, 'ถา', '2026-11-15');
  assert.equal(isLit(s.letters['ก']), false);
  assert.equal(s.letters['ถ'].miss, '2026-11-15', 'the letter picked by mistake is marked too');
  assert.deepEqual(s.confuse, { 'ก|ถ': 1 });
});

test('read: fluent counts for both letters, slow changes nothing, miss darkens both', () => {
  const s = emptyState();
  const q = { type: 'read', focus: 'ก', kind: 'c', item: { syl: 'กา', c: 'ก', v: '◌า' } };
  assert.equal(applyAnswer(s, q, 'slow', '2026-11-13'), null);
  assert.deepEqual(s.letters, {});
  applyAnswer(s, q, 'fluent', '2026-11-13');
  assert.deepEqual(s.letters['ก'].ok, ['2026-11-13']);
  assert.deepEqual(s.letters['◌า'].ok, ['2026-11-13']);
  applyAnswer(s, q, 'miss', '2026-11-14');
  assert.deepEqual(s.letters['◌า'], { ok: [], miss: '2026-11-14' });
});

test('letters missed yesterday open the next round', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const s = emptyState();
    for (const l of ['ต', 'เ◌ือ', 'ฝ']) s.letters[l] = { ok: [], miss: '2026-11-12' };
    const round = buildRound(s, '2026-11-13', rng(seed));
    assert.deepEqual(round.slice(0, 3).map(q => q.focus).sort(), ['ต', 'เ◌ือ', 'ฝ'].sort());
  }
});

test('lit letters are mixed in but never crowd out the unlit ones; all lit still gives a full round', () => {
  const s = emptyState();
  for (const l of LETTERS.slice(0, 45)) s.letters[l] = { ok: ['2026-11-01', '2026-11-02'], miss: null };
  for (let seed = 1; seed <= 100; seed++) {
    const round = buildRound(s, '2026-11-13', rng(seed));
    assert.equal(round.length, ROUND_SIZE);
    const unlit = LETTERS.slice(45);
    for (const l of unlit) assert.ok(round.some(q => q.focus === l), l + ' is asked');
  }
  for (const l of LETTERS) s.letters[l] = { ok: ['2026-11-01', '2026-11-02'], miss: null };
  assert.equal(buildRound(s, '2026-11-13', rng(7)).length, ROUND_SIZE);
});

test('lastDays lists seven days ending today', () => {
  const s = emptyState();
  finishRound(s, '2026-11-13');
  finishRound(s, '2026-11-13');
  finishRound(s, '2026-11-11');
  const days = lastDays(s, '2026-11-13');
  assert.deepEqual(days.map(d => d.date), ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
  assert.deepEqual(days.map(d => d.done), [false, false, false, false, true, false, true]);
  assert.equal(s.days['2026-11-13'], 2);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { achievementValues } from './dist/src/achievements.js';
import { REWARDS } from './dist/src/themes.js';

test('40 unique badges preserve the original six thresholds and add long-term goals', () => {
  assert.equal(REWARDS.length, 40);
  assert.equal(new Set(REWARDS.map(r => r.id)).size, 40);
  for (const [id, kind, need] of [['first','words',1],['ten','words',10],['fifty','xp',50],['streak','streak',3],['master','mastered',10],['hundred','words',100]]) {
    const reward = REWARDS.find(r => r.id === id);
    assert.equal(reward.kind, kind);
    assert.equal(reward.need, need);
  }
  for (const [kind, need] of [['words',1000],['xp',10000],['streak',180],['corrections',100]]) {
    assert.ok(REWARDS.some(r => r.kind === kind && r.need === need));
  }
});

test('historical streak badges survive a gap, month boundaries and leap day', () => {
  const daily = {};
  const start = Date.UTC(2024, 1, 25);
  for (let i = 0; i < 180; i++) daily[new Date(start + i * 86400000).toISOString().slice(0, 10)] = { totalN: 1 };
  daily['2024-12-01'] = { totalN: 1 };
  const values = achievementValues({ daily }, { streak: 1 });
  assert.equal(values.streak, 180);
  assert.equal(values.activeDays, 181);
  assert.equal(values.answers, 181);
  assert.ok(values.streak >= REWARDS.find(r => r.id === 'streak-180').need);
});

test('metrics include disabled-library progress and completed correction records', () => {
  const state = {
    xp: 123,
    prog: { apple: { stage: 4 }, pear: { stage: 2 }, cat: { stage: 5 } },
    daily: { '2026-01-01': { totalN: 12 }, '2026-01-02': { totalN: 0 }, '2026-01-03': { totalN: 8 } },
    mistakes: { apple: { active: false, cleared: 2 }, pear: { active: true, cleared: 1 }, cat: { cleared: 0 } },
  };
  assert.deepEqual(achievementValues(state), { words: 3, xp: 123, mastered: 2, streak: 1, activeDays: 2, answers: 20, corrections: 3 });
  const copy = structuredClone(state);
  achievementValues(state);
  assert.deepEqual(state, copy);
});

test('empty and malformed counters do not light badges or create NaN progress', () => {
  assert.deepEqual(achievementValues(), { words: 0, xp: 0, mastered: 0, streak: 0, activeDays: 0, answers: 0, corrections: 0 });
  const values = achievementValues({ xp: -5, daily: { bad: { totalN: 50 }, '2026-02-30': { totalN: 5 }, '2026-01-01': { totalN: -2 } }, mistakes: { a: { cleared: -3 }, b: { cleared: Infinity } } });
  assert.equal(values.answers, 0);
  assert.equal(values.streak, 0);
  assert.equal(values.corrections, 0);
  for (const badge of REWARDS) assert.ok(Number.isFinite(values[badge.kind]));
});

import { MASTER_STAGE } from './core.js';

const count = value => Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

// Compare calendar dates in UTC so daylight-saving clock changes cannot break a run.
function dateNumber(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = new Date(`${key}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== key) return null;
  return date.getTime() / 86400000;
}

export function achievementValues(state = {}, summary = {}) {
  const days = Object.entries(state.daily || {})
    .filter(([, day]) => count(day?.totalN) > 0)
    .map(([key, day]) => ({ number: dateNumber(key), answers: count(day.totalN) }))
    .filter(day => day.number !== null)
    .sort((a, b) => a.number - b.number);
  let longest = 0, run = 0, previous = null;
  for (const day of days) {
    run = previous !== null && day.number === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day.number;
  }
  const progress = Object.values(state.prog || {});
  return {
    words: progress.length,
    xp: count(state.xp),
    mastered: progress.filter(p => count(p?.stage) >= MASTER_STAGE).length,
    // Historical runs keep earned streak badges lit even after a missed day.
    streak: Math.max(longest, count(summary.streak)),
    activeDays: days.length,
    answers: days.reduce((sum, day) => sum + day.answers, 0),
    corrections: Object.values(state.mistakes || {}).reduce((sum, record) => sum + count(record?.cleared), 0),
  };
}

import {wordKey} from './core.js';

// Keep completed records internally so importing an older backup cannot restore
// an already corrected word. Only active entries appear in the notebook.
export function recordMistake(records, word, correct, correction = false, now = Date.now()) {
  const key = wordKey(word.word), previous = records[key];
  if (correct && (!correction || !previous?.active)) return records;
  const next = {...previous, word: word.word, meaning: word.meaning,
    correct: correct ? previous.correct + 1 : 0,
    wrongCount: (previous?.wrongCount || 0) + (correct ? 0 : 1),
    cleared: previous?.cleared || 0,
    lastAt: Math.max(now, (previous?.lastAt || 0) + 1), active: true};
  if (next.correct >= 3) { next.active = false; next.cleared++; }
  return {...records, [key]: next};
}

export function mergeMistakes(base = {}, incoming = {}) {
  const out = {...base};
  for (const [key, entry] of Object.entries(incoming)) {
    const old = out[key];
    // Do not add counts: merging the same backup must be idempotent.
    if (!old || entry.lastAt > old.lastAt ||
      (entry.lastAt === old.lastAt && (Number(entry.active) > Number(old.active) ||
      (entry.active === old.active && entry.correct < old.correct)))) out[key] = {...entry};
  }
  return out;
}

// Backup validation stays independent of browser APIs so imports can be checked before writing.
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const optional = (obj, key, check) => obj[key] === undefined || check(obj[key]);
const safeKeys = obj => Object.keys(obj).every(key => !['__proto__', 'constructor', 'prototype'].includes(key));
const numbers = (obj, keys) => keys.every(key => optional(obj, key, count));

export function validBackup(p) {
  if (!record(p) || !Array.isArray(p.books) || !Array.isArray(p.words)) return false;
  const ids = new Set();
  for (const b of p.books) {
    if (!record(b) || typeof b.id !== 'string' || !/^[\w-]+$/.test(b.id) || ids.has(b.id) || typeof b.name !== 'string') return false;
    if (!optional(b, 'on', v => typeof v === 'boolean')) return false;
    if (!optional(b, 'color', v => ['purple','peach','mint','pink','blue','yellow'].includes(v))) return false;
    if (!optional(b, 'icon', v => typeof v === 'string' && /^[a-z-]+$/.test(v))) return false;
    ids.add(b.id);
  }
  for (const w of p.words) {
    if (!record(w) || typeof w.word !== 'string' || !w.word.trim() || typeof w.meaning !== 'string' || typeof w.bookId !== 'string' || !ids.has(w.bookId)) return false;
    if (!['pos', 'phonetic', 'example'].every(key => optional(w, key, v => typeof v === 'string'))) return false;
  }
  if (!optional(p, 'xp', count) || !optional(p, 'lastExport', count)) return false;
  if (!optional(p, 'theme', value => value === null || typeof value === 'string')) return false;
  if (!optional(p, 'settings', value => record(value) && numbers(value, ['newPerDay', 'reviewPerDay']) && optional(value, 'mode', v => ['auto', 'card', 'choice', 'spell'].includes(v)) && optional(value, 'soundEffects', v => typeof v === 'boolean') && optional(value, 'soundVolume', v => Number.isFinite(v) && v >= 0 && v <= 1))) return false;
  for (const key of ['prog', 'daily', 'awards']) {
    if (!optional(p, key, value => record(value) && safeKeys(value))) return false;
  }
  for (const progress of Object.values(p.prog || {})) {
    if (!record(progress) || !numbers(progress, ['stage', 'interval', 'due', 'reps', 'lapses', 'lastAt', 'firstAt'])) return false;
    if (!optional(progress, 'ease', v => Number.isFinite(v) && v >= 1 && v <= 10)) return false;
    if (!optional(progress, 'last', v => ['know', 'fuzzy', 'forgot'].includes(v))) return false;
    if (!optional(progress, 'hist', v => Array.isArray(v) && v.every(h => Array.isArray(h) && h.length === 2 && count(h[0]) && ['know', 'fuzzy', 'forgot'].includes(h[1])))) return false;
  }
  for (const day of Object.values(p.daily || {})) {
    if (!record(day) || !numbers(day, ['newN', 'revN', 'okN', 'totalN'])) return false;
  }
  return Object.values(p.awards || {}).every(count);
}

export function mergeRewards(base, incoming) {
  const awards = { ...(base.awards || {}) };
  for (const [key, value] of Object.entries(incoming.awards || {})) awards[key] = Math.max(awards[key] || 0, value);
  const sum = ledger => Object.values(ledger || {}).reduce((total, value) => total + value, 0);
  // Legacy backups may have XP without a ledger. Preserve that balance once.
  const legacy = Math.max(0, (base.xp || 0) - sum(base.awards), (incoming.xp || 0) - sum(incoming.awards));
  return { awards, xp: legacy + sum(awards) };
}

export function storageChanged(lastRead, currentValue) {
  return lastRead !== currentValue;
}

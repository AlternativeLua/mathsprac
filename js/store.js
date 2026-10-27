// All progress lives in localStorage. Every access is guarded, because private
// windows and cleared site data can make it throw or come back empty.

import { TOPIC_IDS } from './questions.js';
import { todayKey } from './rng.js';

const KEY = 'lcmaths.v1';

const DEFAULTS = {
  v: 1,
  settings: {
    topics: [...TOPIC_IDS],
    count: 15,
    animate: true,
    showTimer: true,
  },
  streak: { current: 0, best: 0, lastDate: null },
  history: {},
  totals: { answered: 0, correct: 0, seconds: 0, sessions: 0 },
  byTopic: {},
  inProgress: null,
};

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(DEFAULTS);
    const parsed = JSON.parse(raw);
    const merged = clone(DEFAULTS);
    Object.assign(merged, parsed);
    merged.settings = { ...DEFAULTS.settings, ...(parsed.settings || {}) };
    merged.streak = { ...DEFAULTS.streak, ...(parsed.streak || {}) };
    merged.totals = { ...DEFAULTS.totals, ...(parsed.totals || {}) };
    merged.history = parsed.history || {};
    merged.byTopic = parsed.byTopic || {};
    const valid = merged.settings.topics.filter((t) => TOPIC_IDS.includes(t));
    merged.settings.topics = valid.length ? valid : [...TOPIC_IDS];
    return merged;
  } catch {
    return clone(DEFAULTS);
  }
}

let state = read();

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Out of quota or blocked — the session still works, it just won't persist.
  }
}

export function getState() {
  return state;
}

export function getSettings() {
  return state.settings;
}

export function setSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  if (!state.settings.topics.length) state.settings.topics = [...TOPIC_IDS];
  write();
  return state.settings;
}

function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(aKey, bKey) {
  const a = dateFromKey(aKey);
  const b = dateFromKey(bKey);
  return Math.round((b - a) / 86400000);
}

export function isDoneToday(key = todayKey()) {
  return Boolean(state.history[key]);
}

// The streak as it stands right now: a run that was last extended before
// yesterday has already been broken.
export function liveStreak(key = todayKey()) {
  const { current, lastDate } = state.streak;
  if (!lastDate || !current) return 0;
  const gap = daysBetween(lastDate, key);
  return gap <= 1 ? current : 0;
}

export function recordSession({ dateKey = todayKey(), results, seconds, counted = true }) {
  const total = results.length;
  const score = results.filter((x) => x.correct).length;

  for (const row of results) {
    const t = state.byTopic[row.topicId] || { answered: 0, correct: 0 };
    t.answered++;
    if (row.correct) t.correct++;
    state.byTopic[row.topicId] = t;
  }
  state.totals.answered += total;
  state.totals.correct += score;
  state.totals.seconds += Math.round(seconds);
  state.totals.sessions += 1;

  let streakChange = 'none';
  if (counted) {
    const prev = state.history[dateKey];
    state.history[dateKey] = {
      score: prev ? Math.max(prev.score, score) : score,
      total,
      seconds: Math.round(seconds),
    };
    const { lastDate } = state.streak;
    if (lastDate === dateKey) {
      streakChange = 'already';
    } else if (lastDate && daysBetween(lastDate, dateKey) === 1) {
      state.streak.current += 1;
      streakChange = 'extended';
    } else {
      state.streak.current = 1;
      streakChange = lastDate ? 'restarted' : 'started';
    }
    state.streak.lastDate = dateKey;
    state.streak.best = Math.max(state.streak.best, state.streak.current);
  }

  state.inProgress = null;
  write();
  return { score, total, streak: state.streak.current, streakChange };
}

export function saveProgress(progress) {
  state.inProgress = progress;
  write();
}

export function loadProgress(dateKey = todayKey()) {
  const p = state.inProgress;
  if (!p || p.dateKey !== dateKey) return null;
  return p;
}

export function clearProgress() {
  state.inProgress = null;
  write();
}

export function lastDays(n = 7, key = todayKey()) {
  const today = dateFromKey(key);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      key: k,
      label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
      done: Boolean(state.history[k]),
      entry: state.history[k] || null,
      isToday: k === key,
    });
  }
  return out;
}

export function topicStats() {
  return TOPIC_IDS.map((id) => {
    const t = state.byTopic[id] || { answered: 0, correct: 0 };
    return {
      id,
      answered: t.answered,
      correct: t.correct,
      accuracy: t.answered ? t.correct / t.answered : null,
    };
  });
}

export function overallAccuracy() {
  return state.totals.answered ? state.totals.correct / state.totals.answered : null;
}

export function resetAll() {
  state = clone(DEFAULTS);
  try {
    localStorage.removeItem(KEY);
  } catch { /* nothing to do */ }
  write();
}

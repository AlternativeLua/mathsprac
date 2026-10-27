import { makeRng, hashString } from './rng.js';
import { algebra } from './topics/algebra.js';
import { functions } from './topics/functions.js';
import { calculus } from './topics/calculus.js';
import { trigonometry } from './topics/trig.js';
import { geometry } from './topics/geometry.js';
import { stats } from './topics/stats.js';

export const TOPICS = [
  { id: 'algebra', label: 'Algebra', short: 'Algebra', glyph: 'x²', gens: algebra },
  { id: 'functions', label: 'Functions, logs & indices', short: 'Functions', glyph: 'log', gens: functions },
  { id: 'calculus', label: 'Calculus', short: 'Calculus', glyph: '∫', gens: calculus },
  { id: 'trigonometry', label: 'Trigonometry', short: 'Trig', glyph: 'sin', gens: trigonometry },
  { id: 'geometry', label: 'Coordinate geometry', short: 'Geometry', glyph: '△', gens: geometry },
  { id: 'stats', label: 'Probability & statistics', short: 'Stats', glyph: 'σ', gens: stats },
];

export const TOPIC_IDS = TOPICS.map((t) => t.id);

const BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

export function topicLabel(id) {
  return BY_ID.get(id)?.short ?? id;
}

export function topicGlyph(id) {
  return BY_ID.get(id)?.glyph ?? '?';
}

function validate(q) {
  if (!q || !q.prompt || !q.answer) return false;
  const a = q.answer;
  if (a.type === 'number') return Number.isFinite(a.value);
  if (a.type === 'set') return a.values?.length > 0 && a.values.every(Number.isFinite);
  if (a.type === 'point') return a.value?.length > 0 && a.value.every(Number.isFinite);
  if (a.type === 'mc') return a.choices?.length > 1 && a.correct >= 0;
  if (a.type === 'expr') return typeof a.ref === 'string' && a.ref.length > 0;
  return false;
}

// How many questions each enabled topic contributes, as evenly as possible.
function share(count, topics, r) {
  const base = Math.floor(count / topics.length);
  const out = new Map(topics.map((t) => [t, base]));
  let left = count - base * topics.length;
  for (const t of r.shuffle(topics)) {
    if (left <= 0) break;
    out.set(t, out.get(t) + 1);
    left--;
  }
  return out;
}

export function buildSet({ seed, count = 15, topics = TOPIC_IDS } = {}) {
  const enabled = topics.filter((t) => BY_ID.has(t));
  const list = enabled.length ? enabled : TOPIC_IDS;
  const r = makeRng(seed);
  const quota = share(count, list, r);

  const picked = [];
  for (const topicId of list) {
    const topic = BY_ID.get(topicId);
    const want = quota.get(topicId);
    let pool = r.shuffle(topic.gens);
    for (let i = 0; i < want; i++) {
      if (i > 0 && i % pool.length === 0) pool = r.shuffle(topic.gens);
      picked.push({ topicId, gen: pool[i % pool.length] });
    }
  }

  // Ease in: level 1 first, shuffled within each band.
  const banded = [[], [], []];
  for (const p of picked) banded[Math.min(2, (p.gen.level || 1) - 1)].push(p);
  const ordered = banded.flatMap((band) => r.shuffle(band));

  const questions = [];
  ordered.forEach((p, index) => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const qr = makeRng(hashString(`${seed}|${p.gen.id}|${index}|${attempt}`));
      let built;
      try {
        built = p.gen.gen(qr);
      } catch {
        continue;
      }
      if (!validate(built)) continue;
      questions.push({
        ...built,
        index: questions.length,
        genId: p.gen.id,
        topicId: p.topicId,
        name: p.gen.name,
        level: p.gen.level || 1,
      });
      return;
    }
  });

  return questions;
}

export function allGenerators() {
  return TOPICS.flatMap((t) => t.gens.map((g) => ({ ...g, topicId: t.id })));
}

export function dailySeed(dateKey, salt = '') {
  return hashString(`lcmaths|${dateKey}|${salt}`);
}

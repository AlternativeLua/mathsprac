// Exercises every question generator: builds many instances, checks the stated
// answer is actually accepted by the marker, and checks every piece of notation
// used in the prompt and solution is one the renderer knows.
//
//   node tools/selftest.mjs [iterations]

import { allGenerators, buildSet, TOPIC_IDS } from '../js/questions.js';
import { checkAnswer } from '../js/mathexpr.js';
import { mathHTML, proseHTML, SUPPORTED_COMMANDS } from '../js/mathrender.js';
import { makeRng, hashString } from '../js/rng.js';

const ITERATIONS = Number(process.argv[2] || 120);

const failures = [];
const unknownCommands = new Map();

function canonicalInput(answer) {
  switch (answer.type) {
    case 'number': return String(answer.value);
    case 'set': return answer.values.map((v) => String(v)).join(', ');
    case 'point': return answer.value.map((v) => String(v)).join(', ');
    case 'mc': return String(answer.correct);
    case 'expr': return answer.ref;
    default: return '';
  }
}

function scanCommands(text, where, genId) {
  for (const m of String(text).matchAll(/\\([a-zA-Z]+|.)/g)) {
    const cmd = m[1];
    if (!SUPPORTED_COMMANDS.has(cmd)) {
      const key = `\\${cmd}`;
      if (!unknownCommands.has(key)) unknownCommands.set(key, new Set());
      unknownCommands.get(key).add(`${genId} (${where})`);
    }
  }
}

function fail(genId, msg, extra) {
  failures.push({ genId, msg, extra });
}

for (const gen of allGenerators()) {
  let produced = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const r = makeRng(hashString(`selftest|${gen.id}|${i}`));
    let q;
    try {
      q = gen.gen(r);
    } catch (err) {
      fail(gen.id, `threw while generating (seed ${i})`, err.message);
      continue;
    }
    if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) {
      fail(gen.id, `empty prompt (seed ${i})`);
      continue;
    }
    if (!Array.isArray(q.solution) || q.solution.length === 0) {
      fail(gen.id, `no worked solution (seed ${i})`);
    }
    if (!q.answer || !q.answer.type) {
      fail(gen.id, `no answer (seed ${i})`);
      continue;
    }

    // The stated answer must mark as correct.
    const input = canonicalInput(q.answer);
    let res;
    try {
      res = checkAnswer(q.answer, input);
    } catch (err) {
      fail(gen.id, `marker threw (seed ${i})`, `${err.message} on "${input}"`);
      continue;
    }
    if (!res.ok) {
      fail(gen.id, `own answer rejected (seed ${i})`, `input "${input}" / ${JSON.stringify(q.answer).slice(0, 180)}`);
    }

    // A clearly wrong answer must be rejected (guards against a marker that
    // accepts everything).
    if (q.answer.type === 'number') {
      const wrong = checkAnswer(q.answer, String(q.answer.value + 7.77));
      if (wrong.ok) fail(gen.id, `marker accepted a wrong number (seed ${i})`);
    }
    if (q.answer.type === 'mc') {
      const other = (q.answer.correct + 1) % q.answer.choices.length;
      if (checkAnswer(q.answer, String(other)).ok) {
        fail(gen.id, `marker accepted a wrong choice (seed ${i})`);
      }
    }

    // Notation and rendering.
    scanCommands(q.prompt, 'prompt', gen.id);
    for (const line of q.solution || []) scanCommands(line, 'solution', gen.id);
    if (q.hint) scanCommands(q.hint, 'hint', gen.id);
    if (q.answerLabel) scanCommands(q.answerLabel, 'answerLabel', gen.id);
    if (q.answer.type === 'mc') for (const ch of q.answer.choices) scanCommands(ch, 'choice', gen.id);

    try {
      proseHTML(q.prompt);
      (q.solution || []).forEach(proseHTML);
      if (q.answer.type === 'mc') q.answer.choices.forEach(proseHTML);
      mathHTML(q.prompt);
    } catch (err) {
      fail(gen.id, `render threw (seed ${i})`, err.message);
    }

    // Prompts should not leak raw "undefined"/"NaN" into the text.
    if (/undefined|NaN|\[object/.test(q.prompt + (q.solution || []).join(' '))) {
      fail(gen.id, `prompt or solution contains a broken value (seed ${i})`, q.prompt.slice(0, 160));
    }
    produced++;
  }
  if (produced === 0) fail(gen.id, 'produced nothing at all');
}

// Daily-set assembly.
for (let day = 0; day < 40; day++) {
  const set = buildSet({ seed: hashString(`day${day}`), count: 15, topics: TOPIC_IDS });
  if (set.length !== 15) fail('buildSet', `day ${day} produced ${set.length} questions, expected 15`);
  const topics = new Set(set.map((q) => q.topicId));
  if (topics.size < 5) fail('buildSet', `day ${day} only covered ${topics.size} topics`);
  const levels = set.map((q) => q.level);
  if (levels[0] > levels[levels.length - 1]) {
    fail('buildSet', `day ${day} does not ease in (starts at level ${levels[0]})`);
  }
}

// Single-topic sets must still fill up.
for (const t of TOPIC_IDS) {
  const set = buildSet({ seed: hashString(`solo-${t}`), count: 15, topics: [t] });
  if (set.length !== 15) fail('buildSet', `topic ${t} alone produced ${set.length}, expected 15`);
}

// A couple of marker behaviours worth pinning down.
const markerCases = [
  [{ type: 'number', value: 0.75 }, '3/4', true],
  [{ type: 'number', value: Math.PI * 3 / 4 }, '3pi/4', true],
  [{ type: 'number', value: Math.sqrt(3) / 2 }, 'sqrt(3)/2', true],
  [{ type: 'number', value: Math.sqrt(3) / 2 }, '-sqrt3/2', false],
  [{ type: 'number', value: 1 / 27 }, '1/27', true],
  [{ type: 'set', values: [2, -5] }, '-5, 2', true],
  [{ type: 'set', values: [2, -5] }, '2', false],
  [{ type: 'point', value: [3, -2] }, '(3, -2)', true],
  [{ type: 'expr', ref: '6*x^2-4*x+5' }, '6x^2 - 4x + 5', true],
  [{ type: 'expr', ref: '6*x^2-4*x+5' }, '6x^2 + 4x + 5', false],
  [{ type: 'expr', ref: '(x-3)/2' }, '0.5x - 1.5', true],
  [{ type: 'expr', ref: 'e^((2)*x)*(1+(2)*x)' }, 'e^(2x)(1+2x)', true],
  [{ type: 'expr', ref: '(2)*cos((3)*x)' }, '2cos3x', true],
  [{ type: 'number', value: 5 }, 'five', false],
  [{ type: 'number', value: 5 }, '', false],
];
for (const [answer, input, want] of markerCases) {
  const got = checkAnswer(answer, input).ok;
  if (got !== want) fail('marker', `"${input}" against ${JSON.stringify(answer)} gave ${got}, expected ${want}`);
}

const genCount = allGenerators().length;
console.log(`${genCount} generators x ${ITERATIONS} instances`);

if (unknownCommands.size) {
  console.log('\nNotation the renderer does not know:');
  for (const [cmd, where] of unknownCommands) {
    console.log(`  ${cmd}  <-  ${[...where].slice(0, 4).join(', ')}`);
  }
}

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  const shown = failures.slice(0, 40);
  for (const f of shown) {
    console.log(`  [${f.genId}] ${f.msg}${f.extra ? `\n        ${f.extra}` : ''}`);
  }
  if (failures.length > shown.length) console.log(`  ...and ${failures.length - shown.length} more`);
  process.exit(1);
}

if (unknownCommands.size) process.exit(1);

console.log('all good');

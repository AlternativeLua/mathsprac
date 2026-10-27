import { buildSet, dailySeed, TOPICS, topicLabel, topicGlyph } from './questions.js';
import { checkAnswer } from './mathexpr.js';
import { proseHTML, mathHTML } from './mathrender.js';
import { startBackground } from './ascii-bg.js';
import { todayKey } from './rng.js';
import {
  getSettings, setSettings, recordSession, saveProgress, loadProgress, clearProgress,
  isDoneToday, liveStreak, getState, lastDays, topicStats, overallAccuracy, resetAll,
} from './store.js';

const app = document.getElementById('app');
const bg = startBackground(document.getElementById('bg'), { enabled: getSettings().animate });

let view = 'home';
let session = null;
let lastResult = null;
let openReview = -1;
let timerId = 0;

/* ─────────────────────────── small helpers ─────────────────────── */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function longDate(key = todayKey()) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// Shown when an answer was wrong. The tolerance tells us how precise the
// question asked for, so the answer is quoted to the same precision.
function formatNumber(v, tol) {
  if (Number.isInteger(v)) return String(v);
  if (tol != null && tol > 1e-6) return v.toFixed(tol >= 0.002 ? 2 : 4);
  for (let d = 2; d <= 64; d++) {
    const n = v * d;
    if (Math.abs(n - Math.round(n)) < 1e-9) {
      const num = Math.round(n);
      if (Math.abs(num) < 10000) return `${num}/${d}`;
    }
  }
  return String(Number(v.toFixed(4)));
}

function answerText(answer) {
  switch (answer.type) {
    case 'number': return formatNumber(answer.value, answer.tol);
    case 'set': return answer.values.map((v) => formatNumber(v, answer.tol)).join(',  ');
    case 'point': return answer.value.map((v) => formatNumber(v, answer.tol)).join(',  ');
    case 'mc': return answer.choices[answer.correct];
    default: return '';
  }
}

function buzz(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch { /* not supported */ }
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning warm-up';
  if (h < 18) return 'afternoon warm-up';
  return 'evening warm-up';
}

/* ───────────────────────────── routing ─────────────────────────── */

function go(next) {
  view = next;
  render();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function render() {
  clearInterval(timerId);
  timerId = 0;
  if (view === 'home') app.innerHTML = homeView();
  else if (view === 'quiz') app.innerHTML = quizView();
  else if (view === 'results') app.innerHTML = resultsView();
  else if (view === 'settings') app.innerHTML = settingsView();

  if (view === 'quiz') {
    const field = app.querySelector('.field');
    const q = session.questions[session.index];
    if (field && !session.answers[session.index]) {
      // Autofocus is deliberately skipped on touch so the keyboard does not
      // cover the question before it has been read.
      if (!matchMedia('(hover: none)').matches) field.focus();
    }
    if (getSettings().showTimer) startTimer();
    void q;
  }
}

function startTimer() {
  const el = app.querySelector('.quiz-timer');
  if (!el || !session) return;
  const tick = () => {
    el.textContent = fmtTime((Date.now() - session.startedAt) / 1000);
  };
  tick();
  timerId = setInterval(tick, 1000);
}

/* ───────────────────────────── home ───────────────────────────── */

function homeView() {
  const s = getState();
  const streak = liveStreak();
  const done = isDoneToday();
  const resume = loadProgress();
  const days = lastDays(7);
  const acc = overallAccuracy();
  const todayEntry = s.history[todayKey()];
  const count = getSettings().count;

  const topics = topicStats().filter((t) => t.answered > 0);

  return `
<div class="view">
  <div class="head">
    <div>
      <h1>${greeting()}</h1>
      <p class="date">${esc(longDate())}</p>
    </div>
    <button class="icon-btn" data-act="settings" aria-label="Settings">&#9881;</button>
  </div>

  <section class="glass streak-card">
    <div class="streak-top">
      <div class="flame ${streak > 0 ? 'lit' : 'cold'}">${streak > 0 ? '▲' : '△'}</div>
      <div>
        <div class="streak-n">${streak}</div>
        <div class="streak-label">${streak === 1 ? 'day streak' : 'day streak'}</div>
        <div class="streak-sub">${
          done
            ? 'done today — come back tomorrow to keep it'
            : streak > 0
              ? 'finish today’s set to keep it alive'
              : 'finish a set today to start one'
        }</div>
      </div>
    </div>
    <div class="week">
      ${days.map((d) => `
        <div class="day">
          <div class="dot ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}">${d.done ? '✓' : ''}</div>
          ${d.label}
        </div>`).join('')}
    </div>
  </section>

  ${done ? `
  <section class="glass done-banner">
    <div class="d1">today’s set is done ✓</div>
    <div class="d2">${todayEntry.score} out of ${todayEntry.total} in ${fmtTime(todayEntry.seconds)}</div>
  </section>` : ''}

  ${resume && !done ? `
  <button class="btn btn-primary" data-act="resume">
    resume today’s set &middot; ${resume.index + 1}/${resume.total}
  </button>
  <button class="btn" data-act="start-fresh">start today’s set again</button>
  ` : `
  <button class="btn btn-primary" data-act="${done ? 'practice' : 'start'}">
    ${done ? 'extra practice set' : `start today’s ${count} questions`}
  </button>
  ${done ? '' : '<button class="btn" data-act="practice">extra practice (not counted)</button>'}
  `}

  <div class="tiles">
    <div class="glass tile">
      <div class="v">${s.streak.best}</div>
      <div class="k">best streak</div>
    </div>
    <div class="glass tile">
      <div class="v">${acc == null ? '–' : `${Math.round(acc * 100)}%`}</div>
      <div class="k">accuracy</div>
    </div>
    <div class="glass tile">
      <div class="v">${s.totals.answered}</div>
      <div class="k">answered</div>
    </div>
  </div>

  ${topics.length ? `
  <div class="section-title">by topic</div>
  <section class="glass pad">
    ${topics.map((t) => `
      <div class="topic-block">
        <div class="topic-row">
          <div class="topic-glyph">${topicGlyph(t.id)}</div>
          <div class="topic-name">${esc(topicLabel(t.id))}</div>
          <div class="topic-pct">${Math.round(t.accuracy * 100)}%</div>
        </div>
        <div class="bar"><i style="width:${Math.round(t.accuracy * 100)}%"></i></div>
      </div>`).join('')}
  </section>` : `
  <section class="glass empty">
    fifteen questions, mixed across the higher level course.<br>
    your topic accuracy shows up here once you have answered a few.
  </section>`}

  <p class="note">
    today’s set is generated from today’s date, so it is the same every time you
    open it. tomorrow brings a new one.
  </p>
</div>`;
}

/* ───────────────────────────── quiz ───────────────────────────── */

function quizView() {
  const q = session.questions[session.index];
  const given = session.answers[session.index];
  const total = session.questions.length;
  const isLast = session.index === total - 1;
  const mc = q.answer.type === 'mc';

  const segs = session.questions.map((_, i) => {
    const a = session.answers[i];
    if (a) return a.correct ? 'ok' : 'no';
    return i === session.index ? 'now' : '';
  });

  return `
<div class="view">
  <div class="quiz-bar">
    <button class="icon-btn" data-act="leave" aria-label="Back">&#8249;</button>
    <div class="quiz-count">${session.index + 1} <span style="color:var(--ink-faint)">of ${total}</span></div>
    ${session.counted ? '' : '<div class="chip">practice</div>'}
    ${getSettings().showTimer ? '<div class="quiz-timer">0:00</div>' : ''}
  </div>
  <div class="segs">${segs.map((c) => `<i class="${c}"></i>`).join('')}</div>

  <section class="glass q-card" id="qcard">
    <div class="q-meta">
      <span class="chip"><span class="g">${topicGlyph(q.topicId)}</span> ${esc(topicLabel(q.topicId))}</span>
      <span class="q-level">${'•'.repeat(q.level)}</span>
    </div>

    <div class="q-prompt">${proseHTML(q.prompt)}</div>

    ${mc ? `
    <div class="choices" style="margin-top:18px">
      ${q.answer.choices.map((c, i) => {
        const state = given
          ? i === q.answer.correct ? 'ok' : (String(given.input) === String(i) ? 'no' : '')
          : '';
        const selected = !given && String(session.draft) === String(i);
        return `<button class="choice ${state}" data-choice="${i}" role="radio"
          aria-checked="${selected}" ${given ? 'disabled' : ''}>
          <span class="letter">${'ABCD'[i]}</span>
          <span>${proseHTML(c)}</span>
        </button>`;
      }).join('')}
    </div>` : `
    <div class="answer-label">${q.answerLabel ? proseHTML(q.answerLabel) : 'your answer'}</div>
    <div class="keys">
      ${['π', '√', '^', '/', '(', ')', '−', ',', 'e'].map((k) =>
        `<button class="key" data-key="${k}">${k}</button>`).join('')}
    </div>
    <input class="field ${given ? (given.correct ? 'ok' : 'no') : ''}" type="text"
      inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false"
      enterkeyhint="${given ? 'next' : 'done'}"
      placeholder="${esc(q.placeholder || 'Type your answer')}"
      value="${esc(given ? given.input : (session.draft ?? ''))}" ${given ? 'disabled' : ''}>
    `}

    ${given ? '' : `
      <button class="hint-btn" data-act="hint">${session.hintShown ? '−' : '+'} hint</button>
      ${session.hintShown && q.hint ? `<div class="hint">${proseHTML(q.hint)}</div>` : ''}
    `}

    ${given ? verdictBlock(q, given) : ''}
  </section>

  <div class="sticky-action">
    ${given
      ? `<button class="btn ${given.correct ? 'btn-good' : 'btn-primary'}" data-act="next">
           ${isLast ? 'see results' : 'next question'} &rarr;
         </button>`
      : `<button class="btn btn-primary" data-act="check">check answer</button>`}
  </div>
</div>`;
}

function verdictBlock(q, given) {
  const correctStr = answerText(q.answer);
  return `
  <div class="verdict ${given.correct ? 'ok' : 'no'}">
    <span class="mark">${given.correct ? '✓' : '✕'}</span>
    <span>
      ${given.correct ? 'correct' : 'not quite'}
      ${!given.correct && correctStr
        ? `<span class="correct-value"> — the answer is ${q.answer.type === 'mc' ? proseHTML(correctStr) : esc(correctStr)}</span>`
        : ''}
    </span>
  </div>
  <div class="solution">
    <h4>worked solution</h4>
    <ol>${(q.solution || []).map((line) => `<li>${proseHTML(line)}</li>`).join('')}</ol>
  </div>`;
}

/* ───────────────────────────── results ────────────────────────── */

function resultsView() {
  const { questions, answers, seconds, result } = lastResult;
  const total = questions.length;
  const score = result.score;
  const pct = total ? score / total : 0;

  const byTopic = new Map();
  questions.forEach((q, i) => {
    const row = byTopic.get(q.topicId) || { n: 0, ok: 0 };
    row.n++;
    if (answers[i]?.correct) row.ok++;
    byTopic.set(q.topicId, row);
  });

  const headline = pct === 1 ? 'full marks.'
    : pct >= 0.8 ? 'strong start to the day.'
    : pct >= 0.55 ? 'decent work.'
    : 'worth another look.';

  const streakLine = {
    extended: `▲ streak extended to ${result.streak}`,
    started: '▲ streak started',
    restarted: `▲ new streak — day ${result.streak}`,
    already: `▲ streak holding at ${result.streak}`,
    none: '',
  }[result.streakChange];

  return `
<div class="view">
  <div class="head">
    <div><h1>${esc(headline)}</h1><p class="date">${esc(longDate())}</p></div>
  </div>

  <section class="glass ring-wrap">
    <div class="ring" style="--p:${pct.toFixed(3)}">
      <div>
        <div class="score">${score}<span style="font-size:.5em;color:var(--ink-faint)">/${total}</span></div>
        <div class="of">${fmtTime(seconds)} &middot; ${Math.round(pct * 100)}%</div>
      </div>
    </div>
    ${streakLine ? `<div class="streak-pop">${streakLine}</div>` : ''}
  </section>

  <div class="section-title">this set, by topic</div>
  <section class="glass pad">
    ${[...byTopic.entries()].map(([id, row]) => `
      <div class="topic-block">
        <div class="topic-row">
          <div class="topic-glyph">${topicGlyph(id)}</div>
          <div class="topic-name">${esc(topicLabel(id))}</div>
          <div class="topic-pct">${row.ok}/${row.n}</div>
        </div>
        <div class="bar"><i style="width:${Math.round((row.ok / row.n) * 100)}%"></i></div>
      </div>`).join('')}
  </section>

  <div class="section-title">review</div>
  <section class="glass pad">
    ${questions.map((q, i) => {
      const a = answers[i];
      const open = openReview === i;
      return `
      <button class="review-row" data-review="${i}">
        <span class="mark ${a?.correct ? 'ok' : 'no'}">${a?.correct ? '✓' : '✕'}</span>
        <span class="t">${esc(q.name)}<small>${esc(topicLabel(q.topicId))}${a && !a.correct && a.input ? ` — you said ${esc(a.input)}` : ''}</small></span>
        <span class="caret">${open ? '−' : '+'}</span>
      </button>
      ${open ? `
      <div class="solution" style="margin-bottom:12px">
        <div class="q-prompt" style="font-size:.98rem">${proseHTML(q.prompt)}</div>
        <h4 style="margin-top:16px">worked solution</h4>
        <ol>${(q.solution || []).map((line) => `<li>${proseHTML(line)}</li>`).join('')}</ol>
      </div>` : ''}`;
    }).join('')}
  </section>

  <button class="btn btn-primary" data-act="home">done</button>
  <button class="btn" data-act="practice">another practice set</button>
</div>`;
}

/* ───────────────────────────── settings ───────────────────────── */

function settingsView() {
  const s = getSettings();
  return `
<div class="view">
  <div class="head">
    <div><h1>settings</h1><p class="date">tune the daily set</p></div>
    <button class="icon-btn" data-act="home" aria-label="Back">&#8249;</button>
  </div>

  <div class="section-title">topics in the mix</div>
  <section class="glass pad" style="display:grid;gap:9px">
    ${TOPICS.map((t) => {
      const on = s.topics.includes(t.id);
      return `<button class="topic-pick" data-topic="${t.id}" role="checkbox" aria-checked="${on}">
        <span class="box">✓</span>
        <span class="n">${esc(t.label)}</span>
        <span class="c">${t.gens.length} types</span>
      </button>`;
    }).join('')}
  </section>

  <section class="glass pad">
    <div class="row">
      <div class="label">questions per set<small>fifteen is about ten minutes</small></div>
      <div class="count-val">${s.count}</div>
    </div>
    <input type="range" min="5" max="25" step="1" value="${s.count}" data-range="count">

    <div class="row">
      <div class="label">animated background<small>maths glyphs drifting behind the glass</small></div>
      <button class="switch" data-toggle="animate" role="switch" aria-checked="${s.animate}"></button>
    </div>
    <div class="row">
      <div class="label">show the timer<small>counts up while you work</small></div>
      <button class="switch" data-toggle="showTimer" role="switch" aria-checked="${s.showTimer}"></button>
    </div>
  </section>

  <section class="glass pad">
    <div class="row">
      <div class="label danger">reset everything<small>streak, history and topic stats</small></div>
      <button class="btn" style="width:auto;padding:12px 20px" data-act="reset">reset</button>
    </div>
  </section>

  <p class="note">
    everything is stored on this device only. nothing is sent anywhere, and the app
    works with no connection at all.
  </p>
</div>`;
}

/* ───────────────────────── session handling ───────────────────── */

function newSession({ counted }) {
  const s = getSettings();
  const key = todayKey();
  const seed = counted
    ? dailySeed(key)
    : dailySeed(key, `practice-${Date.now()}-${Math.random()}`);
  const questions = buildSet({ seed, count: s.count, topics: s.topics });
  session = {
    questions,
    answers: new Array(questions.length).fill(null),
    index: 0,
    draft: '',
    hintShown: false,
    startedAt: Date.now(),
    elapsedBefore: 0,
    counted,
    dateKey: key,
  };
  if (counted) persist();
  go('quiz');
}

function persist() {
  if (!session || !session.counted) return;
  saveProgress({
    dateKey: session.dateKey,
    index: session.index,
    total: session.questions.length,
    inputs: session.answers.map((a) => (a ? { input: a.input, correct: a.correct } : null)),
    elapsed: session.elapsedBefore + (Date.now() - session.startedAt) / 1000,
  });
}

function resumeSession() {
  const saved = loadProgress();
  if (!saved) {
    newSession({ counted: true });
    return;
  }
  const s = getSettings();
  const questions = buildSet({ seed: dailySeed(saved.dateKey), count: saved.total || s.count, topics: s.topics });
  session = {
    questions,
    answers: questions.map((_, i) => saved.inputs?.[i] ?? null),
    index: Math.min(saved.index ?? 0, questions.length - 1),
    draft: '',
    hintShown: false,
    startedAt: Date.now(),
    elapsedBefore: saved.elapsed || 0,
    counted: true,
    dateKey: saved.dateKey,
  };
  go('quiz');
}

function submit() {
  const q = session.questions[session.index];
  let input;
  if (q.answer.type === 'mc') {
    input = session.draft;
    if (input === '' || input == null) return;
  } else {
    const field = app.querySelector('.field');
    input = (field?.value ?? '').trim();
    if (!input) {
      field?.classList.add('shake');
      setTimeout(() => field?.classList.remove('shake'), 460);
      field?.focus();
      return;
    }
  }

  const res = checkAnswer(q.answer, input);
  session.answers[session.index] = { input: String(input), correct: Boolean(res.ok) };
  session.draft = '';
  buzz(res.ok ? 12 : [0, 24, 50, 24]);
  persist();
  render();
  if (!res.ok) {
    const card = app.querySelector('#qcard');
    card?.classList.add('shake');
    setTimeout(() => card?.classList.remove('shake'), 460);
  }
}

function next() {
  if (session.index >= session.questions.length - 1) {
    finish();
    return;
  }
  session.index++;
  session.draft = '';
  session.hintShown = false;
  persist();
  render();
}

function finish() {
  const seconds = session.elapsedBefore + (Date.now() - session.startedAt) / 1000;
  const results = session.questions.map((q, i) => ({
    topicId: q.topicId,
    correct: Boolean(session.answers[i]?.correct),
  }));
  const result = recordSession({
    dateKey: session.dateKey,
    results,
    seconds,
    counted: session.counted,
  });
  lastResult = { questions: session.questions, answers: session.answers, seconds, result };
  openReview = -1;
  session = null;
  go('results');
}

function leave() {
  if (session?.counted) persist();
  else clearProgress();
  session = null;
  go('home');
}

/* ───────────────────────────── events ─────────────────────────── */

app.addEventListener('click', (ev) => {
  const target = ev.target.closest('[data-act],[data-choice],[data-key],[data-topic],[data-toggle],[data-review]');
  if (!target) return;

  if (target.dataset.key != null) {
    const field = app.querySelector('.field');
    if (!field || field.disabled) return;
    const k = target.dataset.key === '−' ? '-' : target.dataset.key;
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? field.value.length;
    field.value = field.value.slice(0, start) + k + field.value.slice(end);
    const caret = start + k.length;
    field.focus();
    field.setSelectionRange(caret, caret);
    session.draft = field.value;
    return;
  }

  if (target.dataset.choice != null) {
    session.draft = target.dataset.choice;
    app.querySelectorAll('.choice').forEach((el) => {
      el.setAttribute('aria-checked', String(el === target));
    });
    return;
  }

  if (target.dataset.topic) {
    const s = getSettings();
    const id = target.dataset.topic;
    const topics = s.topics.includes(id) ? s.topics.filter((t) => t !== id) : [...s.topics, id];
    if (!topics.length) return;
    setSettings({ topics });
    render();
    return;
  }

  if (target.dataset.toggle) {
    const key = target.dataset.toggle;
    const value = !getSettings()[key];
    setSettings({ [key]: value });
    if (key === 'animate') bg.setEnabled(value);
    render();
    return;
  }

  if (target.dataset.review != null) {
    const i = Number(target.dataset.review);
    openReview = openReview === i ? -1 : i;
    render();
    return;
  }

  switch (target.dataset.act) {
    case 'settings': go('settings'); break;
    case 'home': go('home'); break;
    case 'start': newSession({ counted: true }); break;
    case 'start-fresh': clearProgress(); newSession({ counted: true }); break;
    case 'practice': newSession({ counted: false }); break;
    case 'resume': resumeSession(); break;
    case 'check': submit(); break;
    case 'next': next(); break;
    case 'hint': session.hintShown = !session.hintShown; render(); break;
    case 'leave': leave(); break;
    case 'reset':
      if (confirm('Reset your streak, history and all topic stats?')) {
        resetAll();
        bg.setEnabled(getSettings().animate);
        go('home');
      }
      break;
    default: break;
  }
});

app.addEventListener('input', (ev) => {
  if (ev.target.classList.contains('field') && session) session.draft = ev.target.value;
  if (ev.target.dataset.range === 'count') {
    const value = Number(ev.target.value);
    const label = app.querySelector('.count-val');
    if (label) label.textContent = String(value);
    setSettings({ count: value });
  }
});

app.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' || view !== 'quiz' || !session) return;
  ev.preventDefault();
  if (session.answers[session.index]) next();
  else submit();
});

window.addEventListener('pagehide', () => { if (session?.counted) persist(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && session?.counted) persist();
});

/* ───────────────────────── offline shell ──────────────────────── */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  });
}

render();

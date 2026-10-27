// Small expression parser/evaluator used to mark answers.
//
// It accepts what a student would actually type: 3/4, 2pi, -5.2, sqrt(3)/2,
// 3x^2 - 4x, ln(5), (1+sqrt5)/2. Expression answers are marked by sampling
// both the student's expression and the reference at several points, so any
// algebraically equivalent form is accepted.

const FUNCS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  ln: Math.log,
  log: (x) => Math.log10(x),
  log10: (x) => Math.log10(x),
  exp: Math.exp,
  sqrt: Math.sqrt,
  abs: Math.abs,
  cbrt: Math.cbrt,
};

const CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

function normalise(src) {
  return String(src)
    .replace(/ /g, ' ')
    .replace(/[−–—]/g, '-')
    .replace(/[×⋅·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
    .replace(/θ/g, 'theta')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\*\*/g, '^')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function tokenize(src) {
  const s = normalise(src);
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      let text = s.slice(i, j);
      if ((text.match(/\./g) || []).length > 1) throw new Error('bad number');
      // Scientific notation, but only when an exponent clearly follows, so that
      // "3e" still means 3 times e.
      const exp = /^e[+-]?\d+/.exec(s.slice(j));
      if (exp) {
        text += exp[0];
        j += exp[0].length;
      }
      out.push({ t: 'num', v: parseFloat(text) });
      i = j;
      continue;
    }
    if (/[a-z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-z0-9_]/.test(s[j])) j++;
      let word = s.slice(i, j);
      // Greedy word match, then peel known names off a run of letters so that
      // "2xy" and "sinx" both work.
      while (word.length) {
        if (FUNCS[word] || CONSTS[word] || word.length === 1) {
          out.push({ t: 'name', v: word });
          i += word.length;
          break;
        }
        word = word.slice(0, -1);
      }
      continue;
    }
    if ('+-*/^(),'.includes(c)) {
      out.push({ t: c });
      i++;
      continue;
    }
    if (c === '[' || c === '{') {
      out.push({ t: '(' });
      i++;
      continue;
    }
    if (c === ']' || c === '}') {
      out.push({ t: ')' });
      i++;
      continue;
    }
    if (c === '=' || c === ':') { i++; continue; }
    throw new Error(`unexpected character "${c}"`);
  }
  return out;
}

// Recursive descent with implicit multiplication.
function parse(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  const eat = (t) => {
    if (!tokens[p] || tokens[p].t !== t) throw new Error(`expected ${t}`);
    return tokens[p++];
  };

  function expr() {
    let node = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = tokens[p++].t;
      node = { k: op, a: node, b: term() };
    }
    return node;
  }

  function term() {
    let node = unary();
    for (;;) {
      const t = peek();
      if (!t) break;
      if (t.t === '*' || t.t === '/') {
        const op = tokens[p++].t;
        node = { k: op, a: node, b: unary() };
        continue;
      }
      // Implicit multiplication: 2x, 3(x+1), x sin(x), (x+1)(x-1)
      if (t.t === 'num' || t.t === 'name' || t.t === '(') {
        node = { k: '*', a: node, b: unary() };
        continue;
      }
      break;
    }
    return node;
  }

  function unary() {
    const t = peek();
    if (t && t.t === '-') { p++; return { k: 'neg', a: unary() }; }
    if (t && t.t === '+') { p++; return unary(); }
    return power();
  }

  function power() {
    const base = atom();
    if (peek() && peek().t === '^') {
      p++;
      return { k: '^', a: base, b: unary() };
    }
    return base;
  }

  function atom() {
    const t = peek();
    if (!t) throw new Error('unexpected end');
    if (t.t === 'num') { p++; return { k: 'num', v: t.v }; }
    if (t.t === '(') {
      p++;
      const inner = expr();
      eat(')');
      return inner;
    }
    if (t.t === 'name') {
      p++;
      if (FUNCS[t.v]) {
        if (peek() && peek().t === '(') {
          p++;
          const inner = expr();
          eat(')');
          return { k: 'call', f: t.v, a: inner };
        }
        // Without brackets, take the run of numbers and plain variables that
        // follows, so "sin2x" means sin(2x) the way it is written by hand —
        // but stop at another function, so "sinxcosx" is sin(x)cos(x).
        let arg = power();
        while (peek() && (peek().t === 'num' || (peek().t === 'name' && !FUNCS[peek().v]))) {
          arg = { k: '*', a: arg, b: power() };
        }
        return { k: 'call', f: t.v, a: arg };
      }
      return { k: 'var', v: t.v };
    }
    throw new Error(`unexpected token ${t.t}`);
  }

  const node = expr();
  if (p !== tokens.length) throw new Error('trailing input');
  return node;
}

function evalNode(n, vars) {
  switch (n.k) {
    case 'num': return n.v;
    case 'var': {
      if (n.v in CONSTS) return CONSTS[n.v];
      if (vars && n.v in vars) return vars[n.v];
      throw new Error(`unknown symbol "${n.v}"`);
    }
    case 'call': return FUNCS[n.f](evalNode(n.a, vars));
    case 'neg': return -evalNode(n.a, vars);
    case '+': return evalNode(n.a, vars) + evalNode(n.b, vars);
    case '-': return evalNode(n.a, vars) - evalNode(n.b, vars);
    case '*': return evalNode(n.a, vars) * evalNode(n.b, vars);
    case '/': return evalNode(n.a, vars) / evalNode(n.b, vars);
    case '^': return Math.pow(evalNode(n.a, vars), evalNode(n.b, vars));
    default: throw new Error('bad node');
  }
}

export function compile(src) {
  const node = parse(tokenize(src));
  return (vars) => evalNode(node, vars);
}

export function evaluate(src, vars = {}) {
  return compile(src)(vars);
}

// A single number, or null if it isn't one.
export function toNumber(src) {
  if (src == null || String(src).trim() === '') return null;
  try {
    const v = evaluate(src);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function close(a, b, tol) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const scale = Math.max(1, Math.abs(b));
  return Math.abs(a - b) <= (tol ?? 1e-6) * scale;
}

function splitList(src) {
  return String(src)
    .split(/[,;]|\bor\b|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// `answer` shapes:
//   { type:'number', value, tol?, unit? }
//   { type:'expr', ref:'3x^2-4', vars:['x'], domain?:[lo,hi] }
//   { type:'set', values:[...], tol? }          order-insensitive list
//   { type:'point', value:[x,y] }
//   { type:'mc', choices:[...], correct:index }
//   { type:'frac', value }                      number, but reject decimals? no — same as number
export function checkAnswer(answer, input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: false, reason: 'empty' };

  switch (answer.type) {
    case 'mc':
      return { ok: Number(raw) === answer.correct };

    case 'number': {
      const v = toNumber(raw.replace(/[^\d.+\-*/^()a-zπ√\s]/gi, ''));
      if (v == null) return { ok: false, reason: 'parse' };
      return { ok: close(v, answer.value, answer.tol) };
    }

    case 'set': {
      const parts = splitList(raw).map(toNumber);
      if (parts.some((v) => v == null)) return { ok: false, reason: 'parse' };
      if (parts.length !== answer.values.length) return { ok: false, reason: 'count' };
      const pool = answer.values.slice();
      for (const got of parts) {
        const idx = pool.findIndex((want) => close(got, want, answer.tol));
        if (idx === -1) return { ok: false };
        pool.splice(idx, 1);
      }
      return { ok: true };
    }

    case 'point': {
      const parts = splitList(raw.replace(/^[([]|[)\]]$/g, '')).map(toNumber);
      if (parts.length !== answer.value.length || parts.some((v) => v == null)) {
        return { ok: false, reason: 'parse' };
      }
      return { ok: parts.every((v, i) => close(v, answer.value[i], answer.tol)) };
    }

    case 'expr': {
      const vars = answer.vars || ['x'];
      let userFn;
      try {
        userFn = compile(raw);
      } catch {
        return { ok: false, reason: 'parse' };
      }
      const refFn = compile(answer.ref);
      const [lo, hi] = answer.domain || [0.37, 2.11];
      let compared = 0;
      for (let i = 0; i < 12; i++) {
        const env = {};
        const t = lo + ((hi - lo) * i) / 11;
        for (const v of vars) env[v] = t + vars.indexOf(v) * 0.31;
        let want, got;
        try {
          want = refFn(env);
        } catch {
          continue;
        }
        if (!Number.isFinite(want)) continue;
        try {
          got = userFn(env);
        } catch {
          return { ok: false, reason: 'parse' };
        }
        if (!Number.isFinite(got)) return { ok: false };
        if (!close(got, want, answer.tol ?? 1e-6)) return { ok: false };
        compared++;
      }
      return { ok: compared >= 3 };
    }

    default:
      return { ok: false, reason: 'unsupported' };
  }
}

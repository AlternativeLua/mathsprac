// A LaTeX-subset renderer. Enough for Leaving Cert maths notation, with no
// external dependency so the whole app still works offline.

const SYMBOLS = {
  pi: 'π', theta: 'θ', alpha: 'α', beta: 'β', gamma: 'γ',
  lambda: 'λ', mu: 'μ', sigma: 'σ', phi: 'φ', omega: 'ω',
  Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω',
  infty: '∞', pm: '±', mp: '∓', times: '×', div: '÷',
  cdot: '·', le: '≤', leq: '≤', ge: '≥', geq: '≥',
  ne: '≠', neq: '≠', approx: '≈', equiv: '≡',
  to: '→', rightarrow: '→', Rightarrow: '⇒', implies: '⇒',
  in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩',
  emptyset: '∅', forall: '∀', exists: '∃', therefore: '∴',
  partial: '∂', nabla: '∇', prime: '′', degree: '°',
  circ: '∘', ldots: '…', dots: '…', cdots: '⋯',
  angle: '∠', perp: '⊥', parallel: '∥', propto: '∝',
  sim: '∼', cong: '≅', mid: '|', ast: '*', ':': ':', '%': '%',
  R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ',
};

// Spacing commands, kept out of SYMBOLS so they get no operator padding.
const GAPS = { ',': 0.17, ';': 0.28, ':': 0.22, quad: 1, qquad: 2, '!': -0.12 };

// Symbols that behave like a value rather than an operator, which is what
// decides whether a following "-" is unary.
const VALUE_SYMBOLS = new Set([
  'π', 'θ', 'α', 'β', 'γ', 'λ', 'μ', 'σ',
  'φ', 'ω', 'Δ', 'Σ', 'Ω', '∞', '∅',
  'ℝ', 'ℕ', 'ℤ', 'ℚ', '°', '′', '…', '⋯',
]);

const FUNC_NAMES = [
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'sinh', 'cosh', 'tanh',
  'ln', 'log', 'exp', 'lim', 'max', 'min', 'det', 'arg', 'mod',
  'arcsin', 'arccos', 'arctan',
];

const BINARY_OPS = new Set(['+', '-', '=', '<', '>']);

const TIGHT_SYMBOLS = new Set(['∘', '°', '′', '…', '⋯']);

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(src.slice(i));
      out.push({ t: 'cmd', v: m[1] });
      i += m[0].length;
      continue;
    }
    if (c === '{') { out.push({ t: '{' }); i++; continue; }
    if (c === '}') { out.push({ t: '}' }); i++; continue; }
    if (c === '^' || c === '_') { out.push({ t: c }); i++; continue; }
    if (c === '[') { out.push({ t: '[' }); i++; continue; }
    if (c === ']') { out.push({ t: ']' }); i++; continue; }
    if (/\s/.test(c)) { out.push({ t: 'space' }); i++; continue; }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: 'num', v: src.slice(i, j) });
      i = j;
      continue;
    }
    out.push({ t: 'char', v: c });
    i++;
  }
  return out;
}

function parse(tokens) {
  let p = 0;

  function parseGroup(stop) {
    const items = [];
    while (p < tokens.length) {
      const tk = tokens[p];
      if (stop && tk.t === stop) { p++; break; }
      items.push(parseOne());
    }
    return { k: 'row', items };
  }

  // One "nucleus", before scripts are attached.
  function parseAtom() {
    const tk = tokens[p++];
    if (!tk) return { k: 'text', v: '' };
    switch (tk.t) {
      case '{': return parseGroup('}');
      case 'num': return { k: 'num', v: tk.v };
      case 'space': return { k: 'space' };
      case 'char': return { k: 'char', v: tk.v };
      case 'cmd': return parseCmd(tk.v);
      case '[': return { k: 'char', v: '[' };
      case ']': return { k: 'char', v: ']' };
      case '}': return { k: 'text', v: '' };
      default: return { k: 'text', v: '' };
    }
  }

  function parseArg() {
    while (tokens[p] && tokens[p].t === 'space') p++;
    return parseAtom();
  }

  function parseCmd(name) {
    if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
      return { k: 'frac', a: parseArg(), b: parseArg() };
    }
    if (name === 'sqrt') {
      let index = null;
      while (tokens[p] && tokens[p].t === 'space') p++;
      if (tokens[p] && tokens[p].t === '[') {
        p++;
        index = parseGroup(']');
      }
      return { k: 'sqrt', index, a: parseArg() };
    }
    if (name === 'text' || name === 'mathrm' || name === 'operatorname') {
      return { k: 'textarg', a: parseArg() };
    }
    if (name === 'binom') return { k: 'binom', a: parseArg(), b: parseArg() };
    if (name === 'hat') return { k: 'hat', a: parseArg() };
    if (name === 'overline' || name === 'bar') return { k: 'overline', a: parseArg() };
    if (name === 'vec') return { k: 'vec', a: parseArg() };
    if (name === 'left' || name === 'right') {
      const next = tokens[p];
      if (next && (next.t === 'char' || next.t === '[' || next.t === ']')) {
        p++;
        const ch = next.v || next.t;
        return ch === '.' ? { k: 'text', v: '' } : { k: 'fence', v: ch };
      }
      return { k: 'text', v: '' };
    }
    if (name === 'int' || name === 'iint' || name === 'oint') {
      return { k: 'bigop', v: name === 'int' ? '∫' : name === 'iint' ? '∬' : '∮', side: true };
    }
    if (name === 'sum') return { k: 'bigop', v: '∑', side: false };
    if (name === 'prod') return { k: 'bigop', v: '∏', side: false };
    if (name === 'lim') return { k: 'bigop', v: 'lim', side: false, op: true };
    if (FUNC_NAMES.includes(name)) return { k: 'func', v: name };
    if (GAPS[name] != null) return { k: 'gap', w: GAPS[name] };
    if (SYMBOLS[name] != null) return { k: 'sym', v: SYMBOLS[name] };
    return { k: 'text', v: name };
  }

  function parseOne() {
    let node = parseAtom();
    for (;;) {
      while (tokens[p] && tokens[p].t === 'space' && node.k === 'bigop') p++;
      const tk = tokens[p];
      if (tk && (tk.t === '^' || tk.t === '_')) {
        p++;
        const which = tk.t === '^' ? 'sup' : 'sub';
        const value = parseArg();
        // A second script joins the existing one rather than wrapping it,
        // so "\int_{a}^{b}" keeps a single base with both limits.
        node = node.k === 'script'
          ? { ...node, [which]: value }
          : { k: 'script', base: node, [which]: value };
        continue;
      }
      break;
    }
    return node;
  }

  const root = parseGroup(null);
  return root;
}

function kindOf(node) {
  switch (node.k) {
    case 'char':
      if (BINARY_OPS.has(node.v) || node.v === '*' || node.v === '/') return 'op';
      if (node.v === ',') return 'punct';
      if ('([{'.includes(node.v)) return 'open';
      return 'value';
    case 'sym': return VALUE_SYMBOLS.has(node.v) ? 'value' : 'op';
    case 'fence': return '([{'.includes(node.v) ? 'open' : 'value';
    case 'gap': return 'op';
    case 'bigop': return 'op';
    default: return 'value';
  }
}

function render(node) {
  switch (node.k) {
    case 'row': {
      let html = '';
      const items = node.items;
      // Null until something has been emitted that a sign could attach to.
      let prev = null;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.k === 'space') {
          if (html && i < items.length - 1) html += '<span class="msp"></span>';
          continue;
        }
        // A "+" or "-" with no value in front of it is a sign, not an
        // operation, so it hugs what follows.
        if (it.k === 'char' && (it.v === '-' || it.v === '+')
            && (prev === null || prev === 'op' || prev === 'open' || prev === 'punct')) {
          html += `<span class="mo msign">${it.v === '-' ? '−' : '+'}</span>`;
          prev = 'op';
          continue;
        }
        html += render(it);
        prev = kindOf(it);
      }
      return html;
    }
    case 'gap': return `<span class="mgap" style="width:${node.w}em"></span>`;
    case 'num': return `<span class="mn">${esc(node.v)}</span>`;
    case 'space': return '<span class="msp"></span>';
    case 'char': {
      const c = node.v;
      if (BINARY_OPS.has(c)) return `<span class="mo">${esc(c === '-' ? '−' : c)}</span>`;
      if (c === '*') return '<span class="mo">×</span>';
      if (/[a-zA-Z]/.test(c)) return `<span class="mi">${esc(c)}</span>`;
      if (c === ',') return '<span class="mpunct">,</span>';
      return `<span class="mo tight">${esc(c)}</span>`;
    }
    case 'sym':
      // Degree, prime and the like sit tight against the value they modify.
      return `<span class="mo${TIGHT_SYMBOLS.has(node.v) ? ' tight' : ''}">${esc(node.v)}</span>`;
    case 'fence': return `<span class="mfence">${esc(node.v)}</span>`;
    case 'func': return `<span class="mfunc">${esc(node.v)}</span>`;
    case 'text': return esc(node.v);
    case 'textarg': return `<span class="mtext">${plain(node.a)}</span>`;
    case 'frac':
      return `<span class="mfrac"><span class="mnum">${render(node.a)}</span><span class="mden">${render(node.b)}</span></span>`;
    case 'sqrt': {
      const idx = node.index ? `<span class="mroot-i">${render(node.index)}</span>` : '';
      return `${idx}<span class="msqrt"><span class="mradic">√</span><span class="mrad">${render(node.a)}</span></span>`;
    }
    case 'binom':
      return `<span class="mfence mfence-tall">(</span><span class="mbinom"><span>${render(node.a)}</span><span>${render(node.b)}</span></span><span class="mfence mfence-tall">)</span>`;
    case 'hat': return `<span class="mhat">${render(node.a)}</span>`;
    case 'overline': return `<span class="mover">${render(node.a)}</span>`;
    case 'vec': return `<span class="mvec">${render(node.a)}</span>`;
    case 'bigop':
      return `<span class="mbigop${node.op ? ' mbigop-word' : ''}">${esc(node.v)}</span>`;
    case 'script': {
      const base = render(node.base);
      const sup = node.sup ? `<span class="msup">${render(node.sup)}</span>` : '';
      const sub = node.sub ? `<span class="msub">${render(node.sub)}</span>` : '';
      const stacked = node.base.k === 'bigop' && node.base.side === false;
      if (stacked) {
        return `<span class="mlimits">${sup ? `<span class="mlim-top">${render(node.sup)}</span>` : ''}` +
          `<span class="mlim-base">${base}</span>` +
          `${sub ? `<span class="mlim-bot">${render(node.sub)}</span>` : ''}</span>`;
      }
      return `<span class="mscript">${base}<span class="mscripts">${sup}${sub}</span></span>`;
    }
    default: return '';
  }
}

function plain(node) {
  switch (node.k) {
    case 'row': return node.items.map(plain).join('');
    case 'space': return ' ';
    case 'num': case 'char': case 'text': case 'sym': case 'func': return esc(node.v ?? '');
    default: return render(node);
  }
}

// Used by the self-test to catch notation the renderer would silently drop.
export const SUPPORTED_COMMANDS = new Set([
  ...Object.keys(SYMBOLS), ...Object.keys(GAPS), ...FUNC_NAMES,
  'frac', 'dfrac', 'tfrac', 'sqrt', 'text', 'mathrm', 'operatorname',
  'overline', 'bar', 'vec', 'hat', 'binom', 'left', 'right',
  'int', 'iint', 'oint', 'sum', 'prod',
]);

const cache = new Map();

export function mathHTML(src) {
  if (src == null) return '';
  const key = String(src);
  if (cache.has(key)) return cache.get(key);
  let html;
  try {
    html = `<span class="math">${render(parse(tokenize(key)))}</span>`;
  } catch {
    html = `<span class="math">${esc(key)}</span>`;
  }
  if (cache.size > 800) cache.clear();
  cache.set(key, html);
  return html;
}

// Inline maths inside prose, delimited by $...$.
export function proseHTML(src) {
  const parts = String(src ?? '').split('$');
  return parts
    .map((part, i) => (i % 2 ? mathHTML(part) : esc(part)))
    .join('');
}

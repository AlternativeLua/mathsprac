import { polyTex, signed, num, fracTex, fx, evalPoly } from '../fmt.js';

function divisorPair(r, m) {
  const divs = [];
  for (let d = 1; d * d <= m; d++) if (m % d === 0) divs.push(d);
  const v = r.pick(divs);
  return [m / v, v];
}

export const functions = [
  {
    id: 'fn-log-solve',
    name: 'Logarithmic equations',
    level: 1,
    gen(r) {
      const b = r.int(2, 5);
      const k = r.int(1, 3);
      const m = r.nz(-8, 8);
      const x = Math.pow(b, k) - m;
      return {
        prompt: `Solve for $x$:  $\\log_{${b}}(x${signed(m)}) = ${k}$`,
        answerLabel: 'A number',
        answer: { type: 'number', value: x, tol: 1e-9 },
        hint: `$\\log_{${b}} A = ${k}$ means $A = ${b}^{${k}}$.`,
        solution: [
          `$x${signed(m)} = ${b}^{${k}} = ${Math.pow(b, k)}$`,
          `$x = ${num(x)}$.`,
        ],
      };
    },
  },

  {
    id: 'fn-log-quadratic',
    name: 'Log laws into a quadratic',
    level: 3,
    gen(r) {
      const b = r.pick([2, 2, 3, 5]);
      const k = r.int(2, 4);
      const M = Math.pow(b, k);
      const [u, v] = divisorPair(r, M);
      const d = u - v;
      if (d === 0 || u === v) {
        return this.gen(r);
      }
      return {
        prompt: `Solve for $x$, $x > 0$:\n$\\log_{${b}}(x) + \\log_{${b}}(x - ${d}) = ${k}$`,
        answerLabel: 'A number',
        answer: { type: 'number', value: u, tol: 1e-9 },
        hint: 'Add the logs into one log, then write the equation without logs.',
        solution: [
          `$\\log_{${b}}\\left(x(x - ${d})\\right) = ${k}$`,
          `$x(x - ${d}) = ${b}^{${k}} = ${M}$`,
          `$${polyTex([1, -d, -M])} = 0 \\Rightarrow (x - ${u})(x + ${v}) = 0$`,
          `$x = ${u}$ (the negative root is rejected, since $\\log$ needs a positive argument).`,
        ],
      };
    },
  },

  {
    id: 'fn-index-eq',
    name: 'Index equations',
    level: 1,
    gen(r) {
      const b = r.int(2, 5);
      const m = r.nz(-4, 4);
      const c = r.int(-3, 3);
      const t = r.int(1, 4);
      const x = (t - c) / m;
      return {
        prompt: `Solve for $x$:  $${b}^{${polyTex([m, c])}} = ${Math.pow(b, t)}$`,
        answerLabel: 'A number (a fraction is fine)',
        answer: { type: 'number', value: x, tol: 1e-9 },
        hint: `Write $${Math.pow(b, t)}$ as a power of $${b}$, then equate the indices.`,
        solution: [
          `$${Math.pow(b, t)} = ${b}^{${t}}$, so $${polyTex([m, c])} = ${t}$.`,
          `$x = ${fx(x)}$.`,
        ],
      };
    },
  },

  {
    id: 'fn-exp-quadratic',
    name: 'Exponential quadratic',
    level: 3,
    gen(r) {
      const b = r.pick([2, 3]);
      const i = r.int(0, 3);
      let j = r.int(0, 3);
      while (j === i) j = r.int(0, 3);
      const s = Math.pow(b, i) + Math.pow(b, j);
      const p = Math.pow(b, i + j);
      return {
        prompt: `Solve for $x$:  $${b}^{2x} - ${s}\\left(${b}^{x}\\right) + ${p} = 0$`,
        answerLabel: 'Both values of $x$, separated by a comma',
        placeholder: 'e.g. 0, 2',
        answer: { type: 'set', values: [i, j], tol: 1e-9 },
        hint: `Let $y = ${b}^{x}$. The equation becomes a quadratic in $y$.`,
        solution: [
          `Let $y = ${b}^{x}$: $${polyTex([1, -s, p], 'y')} = 0$`,
          `$(y - ${Math.pow(b, i)})(y - ${Math.pow(b, j)}) = 0$`,
          `$${b}^{x} = ${Math.pow(b, i)} \\Rightarrow x = ${i}$;  $${b}^{x} = ${Math.pow(b, j)} \\Rightarrow x = ${j}$.`,
        ],
      };
    },
  },

  {
    id: 'fn-composite',
    name: 'Composite functions',
    level: 1,
    gen(r) {
      const a = r.nz(-4, 4);
      const b = r.int(-6, 6);
      const c = r.nz(-4, 4);
      const d = r.int(-6, 6);
      const k = r.nz(-4, 4);
      const inner = evalPoly([1, c, d], k);
      const value = a * inner + b;
      return {
        prompt: `$f(x) = ${polyTex([a, b])}$ and $g(x) = ${polyTex([1, c, d])}$.\nFind $f(g(${num(k)}))$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 1e-9 },
        hint: 'Work from the inside out: find $g$ of the number first.',
        solution: [
          `$g(${num(k)}) = ${num(inner)}$`,
          `$f(${num(inner)}) = ${num(a)}(${num(inner)})${signed(b)} = ${num(value)}$.`,
        ],
      };
    },
  },

  {
    id: 'fn-inverse',
    name: 'Inverse functions',
    level: 2,
    gen(r) {
      if (r.bool()) {
        const a = r.nz(-5, 5);
        const b = r.nz(-8, 8);
        return {
          prompt: `$f(x) = ${polyTex([a, b])}$. Find $f^{-1}(x)$.`,
          answerLabel: 'An expression in $x$',
          placeholder: 'e.g. (x-3)/2',
          answer: { type: 'expr', ref: `(x-(${b}))/(${a})`, vars: ['x'], domain: [1.3, 6.7] },
          hint: 'Write $y = f(x)$, swap $x$ and $y$, then solve for $y$.',
          solution: [
            `Let $y = ${polyTex([a, b])}$, so $x = ${num(a)}y${signed(b)}$ after swapping.`,
            `$f^{-1}(x) = \\frac{x${signed(-b)}}{${num(a)}}$.`,
          ],
        };
      }
      const a = r.nz(-4, 4);
      const b = r.nz(-6, 6);
      const c = r.nz(-6, 6);
      return {
        prompt: `$f(x) = \\frac{${polyTex([a, b])}}{x${signed(c)}}$,  $x \\ne ${num(-c)}$. Find $f^{-1}(x)$.`,
        answerLabel: 'An expression in $x$',
        placeholder: 'e.g. (3-2x)/(x-5)',
        answer: { type: 'expr', ref: `((${b})-(${c})*x)/(x-(${a}))`, vars: ['x'], domain: [9.1, 15.3] },
        hint: 'Cross-multiply to clear the fraction, then collect the $y$ terms on one side.',
        solution: [
          `$y(x${signed(c)}) = ${polyTex([a, b])}$ gives $x(y - ${num(a)}) = ${num(b)} - ${num(c)}y$.`,
          `$f^{-1}(x) = \\frac{${num(b)}${signed(-c)}x}{x${signed(-a)}}$.`,
        ],
      };
    },
  },

  {
    id: 'fn-domain',
    name: 'Domain of a function',
    level: 1,
    gen(r) {
      const k = r.nz(-6, 6);
      const kind = r.pick(['sqrt', 'log', 'rational']);
      let prompt;
      let correct;
      let distractors;
      if (kind === 'sqrt') {
        prompt = `$f(x) = \\frac{1}{\\sqrt{x${signed(-k)}}}$`;
        correct = `$x > ${num(k)}$`;
        distractors = [`$x \\ge ${num(k)}$`, `$x < ${num(k)}$`, `$x \\ne ${num(k)}$`];
      } else if (kind === 'log') {
        prompt = `$f(x) = \\ln(x${signed(-k)})$`;
        correct = `$x > ${num(k)}$`;
        distractors = [`$x \\ge ${num(k)}$`, `$x > ${num(-k)}$`, `$x \\in \\R$`];
      } else {
        const j = k + r.int(1, 5);
        prompt = `$f(x) = \\frac{x}{(x${signed(-k)})(x${signed(-j)})}$`;
        correct = `$x \\in \\R$, $x \\ne ${num(k)}$, $x \\ne ${num(j)}$`;
        distractors = [`$x \\in \\R$, $x \\ne 0$`, `$${num(k)} < x < ${num(j)}$`, `$x > ${num(j)}$`];
      }
      const all = [correct, ...distractors];
      const order = r.shuffle([0, 1, 2, 3]);
      return {
        prompt: `State the largest possible domain of\n${prompt}\nwhere $f$ is a real-valued function.`,
        answer: { type: 'mc', choices: order.map((i) => all[i]), correct: order.indexOf(0) },
        hint: kind === 'rational'
          ? 'The only problem is dividing by zero.'
          : 'You cannot take a square root or a log of a negative number — and you cannot divide by zero.',
        solution: [
          kind === 'sqrt'
            ? `The root needs $x${signed(-k)} \\ge 0$, and the denominator cannot be $0$, so $x${signed(-k)} > 0$.`
            : kind === 'log'
              ? `$\\ln$ needs a strictly positive argument: $x${signed(-k)} > 0$.`
              : 'Exclude the values that make the denominator zero.',
          `Domain: ${correct}.`,
        ],
      };
    },
  },

  {
    id: 'fn-exp-growth',
    name: 'Exponential growth and decay',
    level: 2,
    gen(r) {
      const p0 = r.int(2, 9) * 1000;
      const years = r.int(3, 10);
      const growth = r.bool();
      const factor = growth ? 1 + r.int(15, 80) / 100 : 1 - r.int(15, 60) / 100;
      const pt = Math.round(p0 * factor);
      const k = Math.log(pt / p0) / years;
      return {
        prompt: `A quantity is modelled by $P = P_0 e^{kt}$, where $t$ is in years.\nWhen $t = 0$, $P = ${p0}$. When $t = ${years}$, $P = ${pt}$.\nFind $k$, correct to four decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: k, tol: 0.0002 },
        hint: 'Divide to isolate $e^{kt}$, then take natural logs of both sides.',
        solution: [
          `$${pt} = ${p0}e^{${years}k}$, so $e^{${years}k} = ${num(pt / p0, 5)}$.`,
          `$${years}k = \\ln(${num(pt / p0, 5)}) = ${num(Math.log(pt / p0), 5)}$`,
          `$k = ${k.toFixed(4)}$.`,
        ],
      };
    },
  },

  {
    id: 'fn-log-change',
    name: 'Evaluating a logarithm',
    level: 1,
    gen(r) {
      const b = r.int(2, 9);
      let a = r.int(3, 400);
      while (Number.isInteger(Math.log(a) / Math.log(b))) a = r.int(3, 400);
      const value = Math.log(a) / Math.log(b);
      return {
        prompt: `Evaluate $\\log_{${b}}(${a})$, correct to three decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 0.0015 },
        hint: 'Change of base: $\\log_b a = \\frac{\\ln a}{\\ln b}$.',
        solution: [
          `$\\log_{${b}}(${a}) = \\frac{\\ln ${a}}{\\ln ${b}} = \\frac{${num(Math.log(a), 4)}}{${num(Math.log(b), 4)}}$`,
          `$= ${value.toFixed(3)}$.`,
        ],
      };
    },
  },

  {
    id: 'fn-min-value',
    name: 'Minimum of a quadratic',
    level: 2,
    gen(r) {
      const a = r.int(1, 3);
      const b = 2 * a * r.nz(-4, 4);
      const c = r.int(-8, 8);
      const xMin = -b / (2 * a);
      const yMin = evalPoly([a, b, c], xMin);
      return {
        prompt: `$f(x) = ${polyTex([a, b, c])}$, $x \\in \\R$.\nFind the minimum value of $f(x)$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: yMin, tol: 1e-9 },
        hint: 'The vertex is at $x = -\\frac{b}{2a}$ — or complete the square.',
        solution: [
          `$x = -\\frac{${b}}{${2 * a}} = ${fx(xMin)}$`,
          `$f(${fx(xMin)}) = ${num(yMin)}$, which is the minimum since $a > 0$.`,
        ],
      };
    },
  },

  {
    id: 'fn-transform',
    name: 'Graph transformations',
    level: 2,
    gen(r) {
      const h = r.nz(1, 5);
      const k = r.nz(1, 5);
      const correct = `${h > 0 ? `${h} to the right` : `${-h} to the left`}, then ${k > 0 ? `${k} up` : `${-k} down`}`;
      const wrong = [
        `${h > 0 ? `${h} to the left` : `${-h} to the right`}, then ${k > 0 ? `${k} up` : `${-k} down`}`,
        `${h > 0 ? `${h} to the right` : `${-h} to the left`}, then ${k > 0 ? `${k} down` : `${-k} up`}`,
        `${k > 0 ? `${k} to the right` : `${-k} to the left`}, then ${h > 0 ? `${h} up` : `${-h} down`}`,
      ];
      const all = [correct, ...wrong];
      const order = r.shuffle([0, 1, 2, 3]);
      return {
        prompt: `The graph of $y = f(x${signed(-h)})${signed(k)}$ is the graph of $y = f(x)$ translated how?`,
        answer: { type: 'mc', choices: order.map((i) => all[i]), correct: order.indexOf(0) },
        hint: 'Changes inside the bracket move the graph horizontally, and in the opposite direction to the sign.',
        solution: [
          `Replacing $x$ by $x${signed(-h)}$ shifts the graph ${h > 0 ? `${h} to the right` : `${-h} to the left`}.`,
          `Adding $${num(k)}$ shifts it ${k > 0 ? `${k} up` : `${-k} down`}.`,
        ],
      };
    },
  },
];

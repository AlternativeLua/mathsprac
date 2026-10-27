import {
  polyTex, polyExpr, diffPoly, intPoly, evalPoly, fromRoots, mulPoly,
  signed, num, fracTex, fx, factorTex,
} from '../fmt.js';

export const calculus = [
  {
    id: 'calc-diff-eval',
    name: 'Differentiation',
    level: 1,
    gen(r) {
      const coeffs = [r.nz(1, 4), r.int(-6, 6), r.int(-8, 8), r.int(-9, 9)];
      const d = diffPoly(coeffs);
      const k = r.nz(-3, 4);
      const value = evalPoly(d, k);
      return {
        prompt: `$f(x) = ${polyTex(coeffs)}$.\nFind $f'(${num(k)})$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 1e-9 },
        hint: 'Differentiate term by term, then substitute.',
        solution: [
          `$f'(x) = ${polyTex(d)}$`,
          `$f'(${num(k)}) = ${num(value)}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-product-rule',
    name: 'Product rule',
    level: 2,
    gen(r) {
      const a = r.nz(-4, 4);
      const b = r.nz(-6, 6);
      const c = r.nz(-3, 3);
      const d = r.int(-5, 5);
      const e = r.int(-6, 6);
      const expanded = mulPoly([a, b], [c, d, e]);
      const deriv = diffPoly(expanded);
      return {
        prompt: `Differentiate with respect to $x$:\n$y = (${polyTex([a, b])})(${polyTex([c, d, e])})$`,
        answerLabel: 'An expression in $x$',
        placeholder: 'e.g. 6x^2-4x+5',
        answer: { type: 'expr', ref: polyExpr(deriv), vars: ['x'], domain: [0.4, 2.3] },
        hint: 'Product rule: $\\frac{dy}{dx} = u\\frac{dv}{dx} + v\\frac{du}{dx}$.',
        solution: [
          `$u = ${polyTex([a, b])}$, $v = ${polyTex([c, d, e])}$`,
          `$\\frac{dy}{dx} = (${polyTex([a, b])})(${polyTex(diffPoly([c, d, e]))}) + (${polyTex([c, d, e])})(${num(a)})$`,
          `$= ${polyTex(deriv)}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-quotient-rule',
    name: 'Quotient rule',
    level: 2,
    gen(r) {
      const a = r.nz(-5, 5);
      const b = r.nz(-7, 7);
      const c = r.nz(-4, 4);
      let d = r.nz(-6, 6);
      while (a * d - b * c === 0) d = r.nz(-6, 6);
      const topConst = a * d - b * c;
      const ref = `(${topConst})/((${c})*x+(${d}))^2`;
      return {
        prompt: `Differentiate with respect to $x$:\n$y = \\frac{${polyTex([a, b])}}{${polyTex([c, d])}}$`,
        answerLabel: 'An expression in $x$',
        placeholder: 'e.g. 7/(2x+1)^2',
        answer: { type: 'expr', ref, vars: ['x'], domain: [8.1, 14.7] },
        hint: 'Quotient rule: $\\frac{dy}{dx} = \\frac{v\\frac{du}{dx} - u\\frac{dv}{dx}}{v^2}$.',
        solution: [
          `$\\frac{dy}{dx} = \\frac{(${polyTex([c, d])})(${num(a)}) - (${polyTex([a, b])})(${num(c)})}{(${polyTex([c, d])})^2}$`,
          `The $x$ terms cancel in the numerator:`,
          `$= \\frac{${num(topConst)}}{(${polyTex([c, d])})^2}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-chain-rule',
    name: 'Chain rule',
    level: 2,
    gen(r) {
      const a = r.nz(-4, 4);
      const b = r.nz(-8, 8);
      const n = r.int(3, 6);
      const ref = `(${n})*((${a})*x^2+(${b}))^(${n - 1})*((${2 * a})*x)`;
      return {
        prompt: `Differentiate with respect to $x$:\n$y = \\left(${polyTex([a, 0, b]).replace(' + 0x', '')}\\right)^{${n}}$`,
        answerLabel: 'An expression in $x$',
        placeholder: 'e.g. 8x(x^2+3)^3',
        answer: { type: 'expr', ref, vars: ['x'], domain: [0.4, 1.7] },
        hint: 'Chain rule: differentiate the outside, keep the inside, times the derivative of the inside.',
        solution: [
          `Let $u = ${polyTex([a, 0, b]).replace(' + 0x', '')}$, so $y = u^{${n}}$ and $\\frac{du}{dx} = ${num(2 * a)}x$.`,
          `$\\frac{dy}{dx} = ${n}u^{${n - 1}} \\cdot ${num(2 * a)}x$`,
          `$= ${num(2 * a * n)}x\\left(${polyTex([a, 0, b]).replace(' + 0x', '')}\\right)^{${n - 1}}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-trig-diff',
    name: 'Differentiating trig',
    level: 2,
    gen(r) {
      const a = r.nz(-5, 5);
      const b = r.int(2, 5);
      const c = r.nz(-5, 5);
      const d = r.int(2, 5);
      const ref = `(${a * b})*cos((${b})*x)+(${-c * d})*sin((${d})*x)`;
      return {
        prompt: `Differentiate with respect to $x$:\n$y = ${num(a)}\\sin(${b}x) + ${num(c)}\\cos(${d}x)$`,
        answerLabel: 'An expression in $x$',
        placeholder: 'e.g. 6cos(3x)-10sin(2x)',
        answer: { type: 'expr', ref, vars: ['x'], domain: [0.2, 1.4] },
        hint: '$\\frac{d}{dx}\\sin(kx) = k\\cos(kx)$ and $\\frac{d}{dx}\\cos(kx) = -k\\sin(kx)$.',
        solution: [
          `$\\frac{dy}{dx} = ${num(a * b)}\\cos(${b}x)${signed(-c * d)}\\sin(${d}x)$`,
        ],
      };
    },
  },

  {
    id: 'calc-exp-log-diff',
    name: 'Differentiating $e^x$ and $\\ln x$',
    level: 2,
    gen(r) {
      if (r.bool()) {
        const a = r.nz(-4, 4);
        return {
          prompt: `Differentiate with respect to $x$:\n$y = xe^{${num(a)}x}$`,
          answerLabel: 'An expression in $x$',
          placeholder: 'e.g. e^(3x)(1+3x)',
          answer: { type: 'expr', ref: `e^((${a})*x)*(1+(${a})*x)`, vars: ['x'], domain: [0.2, 1.3] },
          hint: 'Product rule, with $\\frac{d}{dx}e^{kx} = ke^{kx}$.',
          solution: [
            `$\\frac{dy}{dx} = x \\cdot ${num(a)}e^{${num(a)}x} + e^{${num(a)}x} \\cdot 1$`,
            `$= e^{${num(a)}x}(1${signed(a)}x)$.`,
          ],
        };
      }
      const a = r.int(1, 5);
      const b = r.int(1, 9);
      return {
        prompt: `Differentiate with respect to $x$:\n$y = \\ln(${polyTex([a, 0, b]).replace(' + 0x', '')})$`,
        answerLabel: 'An expression in $x$',
        placeholder: 'e.g. 4x/(2x^2+5)',
        answer: { type: 'expr', ref: `((${2 * a})*x)/((${a})*x^2+(${b}))`, vars: ['x'], domain: [0.3, 2.2] },
        hint: '$\\frac{d}{dx}\\ln(u) = \\frac{1}{u}\\cdot\\frac{du}{dx}$.',
        solution: [
          `$u = ${polyTex([a, 0, b]).replace(' + 0x', '')}$, $\\frac{du}{dx} = ${num(2 * a)}x$`,
          `$\\frac{dy}{dx} = \\frac{${num(2 * a)}x}{${polyTex([a, 0, b]).replace(' + 0x', '')}}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-tangent',
    name: 'Equation of a tangent',
    level: 2,
    gen(r) {
      const coeffs = [r.nz(1, 3), r.int(-5, 5), r.int(-6, 6)];
      const k = r.nz(-3, 3);
      const d = diffPoly(coeffs);
      const m = evalPoly(d, k);
      const y0 = evalPoly(coeffs, k);
      const c = y0 - m * k;
      return {
        prompt: `Find the equation of the tangent to the curve $y = ${polyTex(coeffs)}$ at the point where $x = ${num(k)}$.\nGive your answer in the form $y = mx + c$.`,
        answerLabel: 'Give $m$ and $c$, separated by a comma',
        placeholder: 'e.g. 4, -7',
        answer: { type: 'point', value: [m, c], tol: 1e-9 },
        hint: 'The slope of the tangent is $\\frac{dy}{dx}$ at that point; you also need the point itself.',
        solution: [
          `At $x = ${num(k)}$: $y = ${num(y0)}$, so the point is $(${num(k)},\\, ${num(y0)})$.`,
          `$\\frac{dy}{dx} = ${polyTex(d)}$, so $m = ${num(m)}$.`,
          `$y - ${num(y0)} = ${num(m)}(x - ${num(k)})$, giving $y = ${num(m)}x${signed(c)}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-turning-points',
    name: 'Turning points',
    level: 2,
    gen(r) {
      // Build f with f'(x) = 3(x - p)(x - q); p + q even keeps the coefficients whole.
      let p = r.int(-4, 4);
      let q = r.int(-4, 4);
      while (q === p || (p + q) % 2 !== 0) {
        p = r.int(-4, 4);
        q = r.int(-4, 4);
      }
      const coeffs = [1, (-3 * (p + q)) / 2, 3 * p * q, r.int(-6, 6)];
      return {
        prompt: `$f(x) = ${polyTex(coeffs)}$.\nFind the $x$-coordinates of the two turning points.`,
        answerLabel: 'Both $x$ values, separated by a comma',
        placeholder: 'e.g. -1, 3',
        answer: { type: 'set', values: [p, q], tol: 1e-9 },
        hint: 'Turning points occur where $f\'(x) = 0$.',
        solution: [
          `$f'(x) = ${polyTex(diffPoly(coeffs))}$`,
          `$= 3${factorTex(p)}${factorTex(q)} = 0$`,
          `$x = ${num(p)}$ or $x = ${num(q)}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-second-deriv',
    name: 'Second derivative',
    level: 1,
    gen(r) {
      const coeffs = [r.nz(1, 4), r.nz(-5, 5), r.int(-7, 7), r.int(-5, 5)];
      const d2 = diffPoly(diffPoly(coeffs));
      const k = r.nz(-3, 3);
      const value = evalPoly(d2, k);
      return {
        prompt: `$f(x) = ${polyTex(coeffs)}$.\nFind $f''(${num(k)})$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 1e-9 },
        hint: 'Differentiate twice.',
        solution: [
          `$f'(x) = ${polyTex(diffPoly(coeffs))}$`,
          `$f''(x) = ${polyTex(d2)}$`,
          `$f''(${num(k)}) = ${num(value)}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-definite-int',
    name: 'Definite integral',
    level: 1,
    gen(r) {
      const coeffs = [r.nz(1, 4), r.int(-5, 5), r.int(-6, 6)];
      const a = r.int(-2, 1);
      const b = a + r.int(1, 4);
      const F = intPoly(coeffs);
      const raw = evalPoly(F, b) - evalPoly(F, a);
      const value = Math.abs(raw) < 1e-9 ? 0 : raw;
      return {
        prompt: `Evaluate  $\\int_{${num(a)}}^{${num(b)}} \\left(${polyTex(coeffs)}\\right)\\,dx$`,
        answerLabel: 'A number (a fraction is fine)',
        answer: { type: 'number', value, tol: 1e-7 },
        hint: 'Integrate, then evaluate at the top limit minus the bottom limit.',
        solution: [
          `Antiderivative: $${polyTex(F.slice(0, -1).map((c) => Number(c.toFixed(6))))}$`,
          `At $x = ${num(b)}$: $${num(evalPoly(F, b), 4)}$;  at $x = ${num(a)}$: $${num(evalPoly(F, a), 4)}$`,
          `Difference $= ${num(value, 6)}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-area-axis',
    name: 'Area under a curve',
    level: 2,
    gen(r) {
      const p = r.int(-3, 2);
      const q = p + r.int(2, 5);
      // y = -(x-p)(x-q) is positive between the roots.
      const coeffs = fromRoots([p, q], -1);
      const F = intPoly(coeffs);
      const value = evalPoly(F, q) - evalPoly(F, p);
      return {
        prompt: `The curve $y = ${polyTex(coeffs)}$ cuts the $x$-axis at $x = ${num(p)}$ and $x = ${num(q)}$.\nFind the area enclosed between the curve and the $x$-axis.`,
        answerLabel: 'A number (a fraction is fine)',
        answer: { type: 'number', value, tol: 1e-7 },
        hint: 'Integrate between the two roots — the curve is above the axis there.',
        solution: [
          `Area $= \\int_{${num(p)}}^{${num(q)}}\\left(${polyTex(coeffs)}\\right)dx$`,
          `$= ${num(value, 6)}$ square units.`,
          `(Shortcut: for $-(x-p)(x-q)$ the area is $\\frac{(q-p)^3}{6} = \\frac{${q - p}^3}{6}$.)`,
        ],
      };
    },
  },

  {
    id: 'calc-area-between',
    name: 'Area between curves',
    level: 3,
    gen(r) {
      const p = r.int(-3, 1);
      const q = p + r.int(2, 4);
      const b = r.int(-4, 4);
      const d = r.int(-5, 5);
      const m = b + p + q;
      const c = d - p * q;
      const value = Math.pow(q - p, 3) / 6;
      return {
        prompt: `Find the area enclosed between the line $y = ${polyTex([m, c])}$ and the curve $y = ${polyTex([1, b, d])}$.`,
        answerLabel: 'A number (a fraction is fine)',
        answer: { type: 'number', value, tol: 1e-6 },
        hint: 'Find where they meet, then integrate (upper curve $-$ lower curve) between those values.',
        solution: [
          `They meet where $${polyTex([1, b, d])} = ${polyTex([m, c])}$, i.e. $${factorTex(p)}${factorTex(q)} = 0$, so $x = ${num(p)}$ and $x = ${num(q)}$.`,
          `Between these the line is above the curve, so`,
          `Area $= \\int_{${num(p)}}^{${num(q)}}\\left(\\text{line} - \\text{curve}\\right)dx = \\frac{(${q} - (${p}))^3}{6} = ${num(value, 6)}$ square units.`,
        ],
      };
    },
  },

  {
    id: 'calc-int-trig',
    name: 'Integrating trig',
    level: 2,
    gen(r) {
      const a = r.int(1, 4);
      const k = r.pick([2, 3, 4, 6]);
      const useSin = r.bool();
      const upper = Math.PI / k;
      const raw = useSin ? (1 - Math.cos(a * upper)) / a : Math.sin(a * upper) / a;
      const exact = Math.abs(raw) < 1e-9 ? 0 : raw;
      return {
        prompt: `Evaluate, correct to three decimal places:\n$\\int_{0}^{\\frac{\\pi}{${k}}} ${useSin ? '\\sin' : '\\cos'}(${a}x)\\,dx$`,
        answerLabel: 'A number',
        answer: { type: 'number', value: exact, tol: 0.0015 },
        hint: useSin
          ? '$\\int \\sin(ax)\\,dx = -\\frac{1}{a}\\cos(ax)$'
          : '$\\int \\cos(ax)\\,dx = \\frac{1}{a}\\sin(ax)$',
        solution: [
          useSin
            ? `$= \\left[-\\frac{1}{${a}}\\cos(${a}x)\\right]_{0}^{\\frac{\\pi}{${k}}} = \\frac{1 - \\cos\\left(\\frac{${a}\\pi}{${k}}\\right)}{${a}}$`
            : `$= \\left[\\frac{1}{${a}}\\sin(${a}x)\\right]_{0}^{\\frac{\\pi}{${k}}} = \\frac{\\sin\\left(\\frac{${a}\\pi}{${k}}\\right)}{${a}}$`,
          `$= ${exact.toFixed(3)}$ (radians throughout).`,
        ],
      };
    },
  },

  {
    id: 'calc-rates',
    name: 'Rates of change',
    level: 3,
    gen(r) {
      const rad = r.int(3, 12);
      const drdt = r.int(1, 6) / 10;
      const value = 4 * Math.PI * rad * rad * drdt;
      return {
        prompt: `A spherical balloon is inflated so that its radius increases at $${num(drdt)}\\text{ cm/s}$.\nFind the rate at which its volume is increasing when the radius is $${rad}\\text{ cm}$.\nGive your answer in $\\text{cm}^3\\text{/s}$, correct to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 0.002 },
        hint: '$V = \\frac{4}{3}\\pi r^3$, so $\\frac{dV}{dt} = \\frac{dV}{dr}\\cdot\\frac{dr}{dt}$.',
        solution: [
          `$V = \\frac{4}{3}\\pi r^3 \\Rightarrow \\frac{dV}{dr} = 4\\pi r^2$`,
          `$\\frac{dV}{dt} = 4\\pi(${rad})^2 \\times ${num(drdt)}$`,
          `$= ${value.toFixed(2)}\\text{ cm}^3\\text{/s}$.`,
        ],
      };
    },
  },

  {
    id: 'calc-optimise',
    name: 'Optimisation',
    level: 3,
    gen(r) {
      const L = r.pick([12, 18, 24, 30, 36]);
      const x = L / 6;
      const value = x * Math.pow(L - 2 * x, 2);
      return {
        prompt: `An open box is made from a square sheet of card of side $${L}\\text{ cm}$ by cutting a square of side $x\\text{ cm}$ from each corner and folding up the sides.\nFind the maximum possible volume of the box, in $\\text{cm}^3$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 1e-6 },
        hint: `$V = x(${L} - 2x)^2$. Differentiate and set $\\frac{dV}{dx} = 0$.`,
        solution: [
          `$V = x(${L} - 2x)^2 = 4x^3 - ${4 * L}x^2 + ${L * L}x$`,
          `$\\frac{dV}{dx} = 12x^2 - ${8 * L}x + ${L * L} = 0 \\Rightarrow x = ${num(x)}$ or $x = ${num(L / 2)}$`,
          `$x = ${num(L / 2)}$ gives no box, so $x = ${num(x)}$ and $V = ${num(value)}\\text{ cm}^3$.`,
        ],
      };
    },
  },

  {
    id: 'calc-motion',
    name: 'Motion along a line',
    level: 2,
    gen(r) {
      const a = r.nz(1, 2);
      const b = r.nz(-6, 6);
      const c = r.int(-8, 8);
      const coeffs = [a, b, c, 0];
      const v = diffPoly(coeffs);
      const t = r.int(1, 5);
      const value = evalPoly(v, t);
      return {
        prompt: `A particle moves in a straight line so that its displacement after $t$ seconds is\n$s = ${polyTex(coeffs).replace(/ \+ 0$/, '')}$ metres.\nFind its velocity when $t = ${t}$.`,
        answerLabel: 'A number (m/s)',
        answer: { type: 'number', value, tol: 1e-9 },
        hint: 'Velocity is $\\frac{ds}{dt}$.',
        solution: [
          `$v = \\frac{ds}{dt} = ${polyTex(v, 't')}$`,
          `$v(${t}) = ${num(value)}\\text{ m/s}$.`,
        ],
      };
    },
  },
];

import {
  polyTex, polyExpr, fromRoots, evalPoly, signed, num, fracTex, factorTex, fx, surdTex,
} from '../fmt.js';

export const algebra = [
  {
    id: 'alg-quad-roots',
    name: 'Quadratic by factors',
    level: 1,
    gen(r) {
      const a = r.pick([1, 1, 1, 2]);
      const p = r.int(-6, 6);
      let q = r.int(-6, 6);
      while (q === p) q = r.int(-6, 6);
      const poly = fromRoots([p, q], a);
      return {
        prompt: `Solve for $x$:  $${polyTex(poly)} = 0$`,
        answerLabel: 'Both roots, separated by a comma',
        placeholder: 'e.g. 2, -5',
        answer: { type: 'set', values: [p, q] },
        hint: 'Look for two numbers that multiply to give the constant term and add to give the middle coefficient.',
        solution: [
          `Factorise: $${a === 1 ? '' : a}${factorTex(p)}${factorTex(q)} = 0$`,
          `So $x = ${num(p)}$ or $x = ${num(q)}$.`,
        ],
      };
    },
  },

  {
    id: 'alg-quad-formula',
    name: 'Quadratic formula',
    level: 2,
    gen(r) {
      let a, b, c, disc;
      do {
        a = r.int(1, 3);
        b = r.nz(-9, 9);
        c = r.nz(-8, 8);
        disc = b * b - 4 * a * c;
      } while (disc <= 0 || Number.isInteger(Math.sqrt(disc)));
      const root1 = (-b + Math.sqrt(disc)) / (2 * a);
      const root2 = (-b - Math.sqrt(disc)) / (2 * a);
      return {
        prompt: `Solve $${polyTex([a, b, c])} = 0$, giving each root correct to two decimal places.`,
        answerLabel: 'Both roots, separated by a comma',
        placeholder: 'e.g. 1.52, -0.19',
        answer: { type: 'set', values: [root1, root2], tol: 0.01 },
        hint: 'The discriminant is not a perfect square, so use $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.',
        solution: [
          `$a = ${a}$, $b = ${b}$, $c = ${c}$, so $b^2 - 4ac = ${disc}$.`,
          `$x = \\frac{${-b} \\pm \\sqrt{${disc}}}{${2 * a}}$`,
          `Exactly: $x = ${surdTex(-b, 1, 2 * a).replace('\\sqrt{1}', '')} \\pm ${surdTex(1, disc, 2 * a)}$`,
          `$x \\approx ${root1.toFixed(2)}$ or $x \\approx ${root2.toFixed(2)}$.`,
        ],
      };
    },
  },

  {
    id: 'alg-simul-linear',
    name: 'Simultaneous equations',
    level: 1,
    gen(r) {
      const x = r.int(-7, 7);
      const y = r.int(-7, 7);
      let a1, b1, a2, b2;
      do {
        a1 = r.nz(-5, 5);
        b1 = r.nz(-5, 5);
        a2 = r.nz(-5, 5);
        b2 = r.nz(-5, 5);
      } while (a1 * b2 - a2 * b1 === 0);
      const c1 = a1 * x + b1 * y;
      const c2 = a2 * x + b2 * y;
      const eq = (a, b, c) => `${a === 1 ? '' : a === -1 ? '-' : a}x${signed(b)}y = ${c}`;
      return {
        prompt: `Solve the simultaneous equations:\n$${eq(a1, b1, c1)}$\n$${eq(a2, b2, c2)}$`,
        answerLabel: 'Give $x$ and $y$',
        placeholder: 'e.g. 3, -2',
        answer: { type: 'point', value: [x, y] },
        hint: 'Scale one or both equations so that a variable eliminates when you add or subtract.',
        solution: [
          `Eliminating $y$: multiply the first by $${b2}$ and the second by $${-b1}$ and add.`,
          `$x = ${num(x)}$, and substituting back gives $y = ${num(y)}$.`,
        ],
      };
    },
  },

  {
    id: 'alg-simul-nonlinear',
    name: 'Line meets curve',
    level: 2,
    gen(r) {
      const p = r.int(-4, 4);
      let q = r.int(-4, 4);
      while (q === p) q = r.int(-4, 4);
      const b = 1 - (p + q);
      const c = r.int(-6, 6);
      const k = c - p * q;
      return {
        prompt: `The line $y = x${signed(k)}$ meets the curve $y = ${polyTex([1, b, c])}$. Find the two values of $x$ where they meet.`,
        answerLabel: 'Both $x$ values, separated by a comma',
        placeholder: 'e.g. -1, 4',
        answer: { type: 'set', values: [p, q] },
        hint: 'Set the two expressions for $y$ equal to each other and solve the quadratic.',
        solution: [
          `$${polyTex([1, b, c])} = x${signed(k)}$`,
          `$${polyTex([1, b - 1, c - k])} = 0$`,
          `$${factorTex(p)}${factorTex(q)} = 0$, so $x = ${num(p)}$ or $x = ${num(q)}$.`,
        ],
      };
    },
  },

  {
    id: 'alg-cubic-factor',
    name: 'Cubic equations',
    level: 2,
    gen(r) {
      const roots = r.distinct(3, -5, 5);
      while (roots.length < 3) roots.push(r.int(-5, 5));
      const poly = fromRoots(roots);
      const known = roots[0];
      return {
        prompt: `$${factorTex(known)}$ is a factor of $f(x) = ${polyTex(poly)}$. Find the other two roots of $f(x) = 0$.`,
        answerLabel: 'The other two roots, separated by a comma',
        placeholder: 'e.g. 2, -3',
        answer: { type: 'set', values: [roots[1], roots[2]] },
        hint: 'Divide $f(x)$ by the known factor to get a quadratic, then factorise that.',
        solution: [
          `Dividing gives $f(x) = ${factorTex(known)}\\left(${polyTex(fromRoots([roots[1], roots[2]]))}\\right)$.`,
          `The quadratic factorises as $${factorTex(roots[1])}${factorTex(roots[2])}$.`,
          `So the other roots are $x = ${num(roots[1])}$ and $x = ${num(roots[2])}$.`,
        ],
      };
    },
  },

  {
    id: 'alg-inequality',
    name: 'Quadratic inequality',
    level: 2,
    gen(r) {
      const p = r.int(-5, 3);
      const q = p + r.int(1, 5);
      const poly = fromRoots([p, q]);
      const strict = r.bool();
      const le = strict ? '<' : '\\le';
      const choices = [
        `$${num(p)} ${le} x ${le} ${num(q)}$`,
        `$x ${le} ${num(p)}$ or $x \\ge ${num(q)}$`,
        `$${num(-q)} ${le} x ${le} ${num(-p)}$`,
        `$x ${le} ${num(q)}$`,
      ];
      const order = r.shuffle([0, 1, 2, 3]);
      return {
        prompt: `Solve the inequality  $${polyTex(poly)} ${le} 0$,  where $x \\in \\R$.`,
        answer: { type: 'mc', choices: order.map((i) => choices[i]), correct: order.indexOf(0) },
        hint: 'Find the roots, then test whether the parabola is below or above the axis between them.',
        solution: [
          `The roots are $x = ${num(p)}$ and $x = ${num(q)}$.`,
          'The parabola opens upwards, so it is below the axis *between* the roots.',
          `Solution: $${num(p)} ${le} x ${le} ${num(q)}$.`,
        ],
      };
    },
  },

  {
    id: 'alg-indices',
    name: 'Indices',
    level: 1,
    gen(r) {
      const k = r.int(2, 5);
      const n = r.int(2, 4);
      const m = r.int(1, 3);
      const sgn = r.sign();
      const base = Math.pow(k, n);
      const value = Math.pow(k, sgn * m);
      return {
        prompt: `Evaluate  $${base}^{${fracTex(sgn * m, n)}}$,  giving your answer as a fraction or integer.`,
        answerLabel: 'A number (fractions such as 3/8 are fine)',
        placeholder: 'e.g. 1/27',
        answer: { type: 'number', value, tol: 1e-9 },
        hint: `Write the base as a power of ${k} first.`,
        solution: [
          `$${base} = ${k}^{${n}}$, so $${base}^{${fracTex(sgn * m, n)}} = ${k}^{${n}\\times${fracTex(sgn * m, n)}} = ${k}^{${sgn * m}}$`,
          `$= ${fracTex(sgn > 0 ? value : 1, sgn > 0 ? 1 : Math.pow(k, m))}$`,
        ],
      };
    },
  },

  {
    id: 'alg-single-fraction',
    name: 'Algebraic fractions',
    level: 2,
    gen(r) {
      const A = r.nz(-5, 5);
      const B = r.nz(-5, 5);
      const a = r.nz(-5, 5);
      let b = r.nz(-5, 5);
      while (b === a) b = r.nz(-5, 5);
      const ref = `((${A})*(x${b >= 0 ? '+' : '-'}${Math.abs(b)})+(${B})*(x${a >= 0 ? '+' : '-'}${Math.abs(a)}))/((x${a >= 0 ? '+' : '-'}${Math.abs(a)})*(x${b >= 0 ? '+' : '-'}${Math.abs(b)}))`;
      const sum = A + B;
      const constTerm = A * b + B * a;
      return {
        prompt: `Write as a single fraction in its simplest form:\n$\\frac{${A}}{x${signed(a)}} + \\frac{${B}}{x${signed(b)}}$`,
        answerLabel: 'An expression in $x$',
        placeholder: 'e.g. (2x+3)/((x+1)(x-4))',
        answer: { type: 'expr', ref, vars: ['x'], domain: [7.3, 12.9] },
        hint: `The common denominator is $(x${signed(a)})(x${signed(b)})$.`,
        solution: [
          `Common denominator $(x${signed(a)})(x${signed(b)})$:`,
          `$\\frac{${A}(x${signed(b)}) + ${B}(x${signed(a)})}{(x${signed(a)})(x${signed(b)})}$`,
          `$= \\frac{${polyTex([sum, constTerm])}}{(x${signed(a)})(x${signed(b)})}$`,
        ],
      };
    },
  },

  {
    id: 'alg-remainder',
    name: 'Remainder theorem',
    level: 1,
    gen(r) {
      const coeffs = [r.nz(1, 3), r.int(-5, 5), r.int(-6, 6), r.int(-8, 8)];
      const k = r.nz(-3, 3);
      const rem = evalPoly(coeffs, k);
      return {
        prompt: `Find the remainder when $${polyTex(coeffs)}$ is divided by $${factorTex(k)}$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: rem, tol: 1e-9 },
        hint: 'The remainder theorem: the remainder on dividing by $(x - k)$ is $f(k)$.',
        solution: [
          `By the remainder theorem the remainder is $f(${num(k)})$.`,
          `$f(${num(k)}) = ${num(rem)}$.`,
        ],
      };
    },
  },

  {
    id: 'alg-complete-square',
    name: 'Completing the square',
    level: 2,
    gen(r) {
      const b = r.bool(0.75) ? 2 * r.nz(-5, 5) : r.nz(-9, 9);
      const c = r.int(-9, 9);
      const p = b / 2;
      const q = c - (b * b) / 4;
      return {
        prompt: `Write $${polyTex([1, b, c])}$ in the form $(x + p)^2 + q$. Give $p$ and $q$.`,
        answerLabel: 'Give $p$ and $q$, separated by a comma',
        placeholder: 'e.g. -3, 5',
        answer: { type: 'point', value: [p, q], tol: 1e-9 },
        hint: 'Halve the coefficient of $x$ to get $p$, then correct the constant.',
        solution: [
          `Half of $${num(b)}$ is $${fx(p)}$, so $(x${signed(p)})^2 = ${polyTex([1, b, (b * b) / 4])}$.`,
          `Therefore $${polyTex([1, b, c])} = (x${signed(p)})^2${signed(q)}$.`,
          `$p = ${fx(p)}$, $q = ${fx(q)}$.`,
        ],
      };
    },
  },

  {
    id: 'alg-discriminant',
    name: 'Equal roots',
    level: 2,
    gen(r) {
      const a = r.int(1, 4);
      const b = 2 * a * r.nz(-4, 4);
      const k = (b * b) / (4 * a);
      return {
        prompt: `The equation $${polyTex([a, b, 0]).replace(/ \+ 0$/, '')} + k = 0$ has equal roots. Find the value of $k$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: k, tol: 1e-9 },
        hint: 'Equal roots means the discriminant $b^2 - 4ac$ is zero.',
        solution: [
          `Equal roots $\\Rightarrow b^2 - 4ac = 0$, with $a = ${a}$, $b = ${b}$, $c = k$.`,
          `$${b * b} - ${4 * a}k = 0$`,
          `$k = ${fx(k)}$.`,
        ],
      };
    },
  },

  {
    id: 'alg-roots-symmetric',
    name: 'Sum and product of roots',
    level: 3,
    gen(r) {
      const a = r.int(1, 4);
      const b = r.nz(-9, 9);
      const c = r.nz(-9, 9);
      const sum = -b / a;
      const prod = c / a;
      const mode = r.pick(['squares', 'reciprocals']);
      const value = mode === 'squares' ? sum * sum - 2 * prod : sum / prod;
      const target = mode === 'squares'
        ? '\\alpha^2 + \\beta^2'
        : '\\frac{1}{\\alpha} + \\frac{1}{\\beta}';
      const work = mode === 'squares'
        ? '(\\alpha + \\beta)^2 - 2\\alpha\\beta'
        : '\\frac{\\alpha + \\beta}{\\alpha\\beta}';
      return {
        prompt: `$\\alpha$ and $\\beta$ are the roots of $${polyTex([a, b, c])} = 0$. Find the value of $${target}$, correct to two decimal places if not exact.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 0.005 },
        hint: 'You do not need the roots themselves: $\\alpha + \\beta = -\\frac{b}{a}$ and $\\alpha\\beta = \\frac{c}{a}$.',
        solution: [
          `$\\alpha + \\beta = ${fracTex(-b, a)}$ and $\\alpha\\beta = ${fracTex(c, a)}$.`,
          `$${target} = ${work}$`,
          `$= ${num(value, 4)}$.`,
        ],
      };
    },
  },
];

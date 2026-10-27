import { num, fracTex, signed, degTex, fx } from '../fmt.js';

const rad = (d) => (d * Math.PI) / 180;

const EXACT = {
  sin: { 0: '0', 30: '\\frac{1}{2}', 45: '\\frac{\\sqrt{2}}{2}', 60: '\\frac{\\sqrt{3}}{2}', 90: '1' },
  cos: { 0: '1', 30: '\\frac{\\sqrt{3}}{2}', 45: '\\frac{\\sqrt{2}}{2}', 60: '\\frac{1}{2}', 90: '0' },
  tan: { 0: '0', 30: '\\frac{1}{\\sqrt{3}}', 45: '1', 60: '\\sqrt{3}' },
};

const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];

const RADIAN_NAMES = {
  30: '\\frac{\\pi}{6}', 45: '\\frac{\\pi}{4}', 60: '\\frac{\\pi}{3}', 90: '\\frac{\\pi}{2}',
  120: '\\frac{2\\pi}{3}', 135: '\\frac{3\\pi}{4}', 150: '\\frac{5\\pi}{6}', 180: '\\pi',
  210: '\\frac{7\\pi}{6}', 225: '\\frac{5\\pi}{4}', 240: '\\frac{4\\pi}{3}', 270: '\\frac{3\\pi}{2}',
  300: '\\frac{5\\pi}{3}', 315: '\\frac{7\\pi}{4}', 330: '\\frac{11\\pi}{6}', 360: '2\\pi',
};

export const trigonometry = [
  {
    id: 'trig-exact',
    name: 'Exact trig values',
    level: 1,
    gen(r) {
      const fn = r.pick(['sin', 'cos', 'tan']);
      const base = r.pick([30, 45, 60]);
      const quad = r.int(1, 4);
      const angle = [base, 180 - base, 180 + base, 360 - base][quad - 1];
      const fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
      const value = Number(fns[fn](rad(angle)).toFixed(10));
      const useRad = r.bool(0.4) && RADIAN_NAMES[angle];
      const shown = useRad ? RADIAN_NAMES[angle] : degTex(angle);
      return {
        prompt: `Find the exact value of  $\\${fn}\\left(${shown}\\right)$`,
        answerLabel: 'A number — surds and fractions are fine',
        placeholder: 'e.g. -sqrt(3)/2',
        answer: { type: 'number', value, tol: 1e-6 },
        hint: `Sketch the quadrant: decide the sign first, then use the reference angle $${degTex(base)}$.`,
        solution: [
          `$${shown}$ is in quadrant ${quad}, where $\\${fn}$ is ${value < 0 ? 'negative' : 'positive'}.`,
          `Reference angle $${degTex(base)}$, so $\\${fn}\\left(${shown}\\right) = ${value < 0 ? '-' : ''}${EXACT[fn][base]} = ${num(value, 4)}$.`,
        ],
      };
    },
  },

  {
    id: 'trig-solve-deg',
    name: 'Trig equations',
    level: 2,
    gen(r) {
      const fn = r.pick(['sin', 'cos', 'tan']);
      const base = r.pick([30, 45, 60]);
      const positive = r.bool();
      const fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
      const value = (positive ? 1 : -1) * fns[fn](rad(base));
      let sols;
      if (fn === 'sin') sols = positive ? [base, 180 - base] : [180 + base, 360 - base];
      else if (fn === 'cos') sols = positive ? [base, 360 - base] : [180 - base, 180 + base];
      else sols = positive ? [base, 180 + base] : [180 - base, 360 - base];
      const valueTex = `${positive ? '' : '-'}${EXACT[fn][base]}`;
      return {
        prompt: `Solve  $\\${fn}(x) = ${valueTex}$  for $0^{\\circ} \\le x \\le 360^{\\circ}$.`,
        answerLabel: 'Both angles in degrees, separated by a comma',
        placeholder: 'e.g. 30, 150',
        answer: { type: 'set', values: sols, tol: 1e-6 },
        hint: `The reference angle is $${degTex(base)}$. Which quadrants make $\\${fn}$ ${positive ? 'positive' : 'negative'}?`,
        solution: [
          `Reference angle: $${degTex(base)}$.`,
          `$\\${fn}$ is ${positive ? 'positive' : 'negative'} in quadrants ${fn === 'sin' ? (positive ? '1 and 2' : '3 and 4') : fn === 'cos' ? (positive ? '1 and 4' : '2 and 3') : (positive ? '1 and 3' : '2 and 4')}.`,
          `$x = ${degTex(sols[0])}$ or $x = ${degTex(sols[1])}$.`,
        ],
      };
    },
  },

  {
    id: 'trig-solve-multiple',
    name: 'Trig equations with a multiple angle',
    level: 3,
    gen(r) {
      const base = r.pick([30, 45, 60]);
      const positive = r.bool();
      const value = (positive ? 1 : -1) * Math.cos(rad(base));
      // cos(2x) = v, with 0 <= x <= 180 so 2x covers 0..360.
      const twoX = positive ? [base, 360 - base] : [180 - base, 180 + base];
      const sols = twoX.map((a) => a / 2);
      const valueTex = `${positive ? '' : '-'}${EXACT.cos[base]}`;
      return {
        prompt: `Solve  $\\cos(2x) = ${valueTex}$  for $0^{\\circ} \\le x \\le 180^{\\circ}$.`,
        answerLabel: 'Both angles in degrees, separated by a comma',
        placeholder: 'e.g. 15, 165',
        answer: { type: 'set', values: sols, tol: 1e-6 },
        hint: 'If $0^{\\circ} \\le x \\le 180^{\\circ}$ then $2x$ runs from $0^{\\circ}$ to $360^{\\circ}$ — solve for $2x$ first.',
        solution: [
          `Let $u = 2x$, so $0^{\\circ} \\le u \\le 360^{\\circ}$ and $\\cos u = ${valueTex}$.`,
          `$u = ${degTex(twoX[0])}$ or $u = ${degTex(twoX[1])}$.`,
          `$x = ${degTex(sols[0])}$ or $x = ${degTex(sols[1])}$.`,
        ],
      };
    },
  },

  {
    id: 'trig-sine-rule',
    name: 'Sine rule',
    level: 1,
    gen(r) {
      const A = r.int(35, 80);
      const B = r.int(35, 80);
      const a = r.int(5, 20);
      const b = (a * Math.sin(rad(B))) / Math.sin(rad(A));
      return {
        prompt: `In triangle $ABC$, $|\\angle A| = ${degTex(A)}$, $|\\angle B| = ${degTex(B)}$ and $|BC| = ${a}$.\nFind $|AC|$, correct to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: b, tol: 0.002 },
        hint: 'Sine rule: $\\frac{a}{\\sin A} = \\frac{b}{\\sin B}$, where side $a$ is opposite angle $A$.',
        solution: [
          `$|BC| = a$ is opposite $A$; $|AC| = b$ is opposite $B$.`,
          `$\\frac{b}{\\sin ${degTex(B)}} = \\frac{${a}}{\\sin ${degTex(A)}}$`,
          `$b = \\frac{${a}\\sin ${degTex(B)}}{\\sin ${degTex(A)}} = ${b.toFixed(2)}$.`,
        ],
      };
    },
  },

  {
    id: 'trig-cosine-rule',
    name: 'Cosine rule',
    level: 2,
    gen(r) {
      const b = r.int(5, 18);
      const c = r.int(5, 18);
      const A = r.int(25, 140);
      const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad(A)));
      return {
        prompt: `In triangle $ABC$, $|AB| = ${c}$, $|AC| = ${b}$ and $|\\angle A| = ${degTex(A)}$.\nFind $|BC|$, correct to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: a, tol: 0.002 },
        hint: 'Cosine rule: $a^2 = b^2 + c^2 - 2bc\\cos A$.',
        solution: [
          `$a^2 = ${b}^2 + ${c}^2 - 2(${b})(${c})\\cos ${degTex(A)}$`,
          `$a^2 = ${num(b * b + c * c - 2 * b * c * Math.cos(rad(A)), 4)}$`,
          `$a = ${a.toFixed(2)}$.`,
        ],
      };
    },
  },

  {
    id: 'trig-cosine-rule-angle',
    name: 'Finding an angle',
    level: 2,
    gen(r) {
      let a, b, c;
      do {
        a = r.int(5, 16);
        b = r.int(5, 16);
        c = r.int(5, 16);
      } while (a + b <= c || a + c <= b || b + c <= a || (a === b && b === c));
      const A = (Math.acos((b * b + c * c - a * a) / (2 * b * c)) * 180) / Math.PI;
      return {
        prompt: `A triangle has sides $a = ${a}$, $b = ${b}$ and $c = ${c}$.\nFind the angle $A$ (opposite side $a$) in degrees, correct to two decimal places.`,
        answerLabel: 'A number of degrees',
        answer: { type: 'number', value: A, tol: 0.002 },
        hint: 'Rearrange the cosine rule: $\\cos A = \\frac{b^2 + c^2 - a^2}{2bc}$.',
        solution: [
          `$\\cos A = \\frac{${b}^2 + ${c}^2 - ${a}^2}{2(${b})(${c})} = ${num((b * b + c * c - a * a) / (2 * b * c), 5)}$`,
          `$A = ${A.toFixed(2)}^{\\circ}$.`,
        ],
      };
    },
  },

  {
    id: 'trig-area',
    name: 'Area of a triangle',
    level: 1,
    gen(r) {
      const a = r.int(4, 18);
      const b = r.int(4, 18);
      const C = r.int(20, 150);
      const area = 0.5 * a * b * Math.sin(rad(C));
      return {
        prompt: `A triangle has two sides of length $${a}$ and $${b}$ with an angle of $${degTex(C)}$ between them.\nFind its area, correct to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: area, tol: 0.002 },
        hint: 'Area $= \\frac{1}{2}ab\\sin C$.',
        solution: [
          `Area $= \\frac{1}{2}(${a})(${b})\\sin ${degTex(C)}$`,
          `$= ${area.toFixed(2)}$ square units.`,
        ],
      };
    },
  },

  {
    id: 'trig-sector',
    name: 'Arcs and sectors',
    level: 1,
    gen(r) {
      const radius = r.int(4, 20);
      const k = r.pick([3, 4, 5, 6, 8]);
      const theta = Math.PI / k;
      const wantArea = r.bool();
      const value = wantArea ? 0.5 * radius * radius * theta : radius * theta;
      return {
        prompt: `A sector of a circle of radius $${radius}\\text{ cm}$ has an angle of $\\frac{\\pi}{${k}}$ radians at the centre.\nFind its ${wantArea ? 'area in $\\text{cm}^2$' : 'arc length in cm'}, correct to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 0.002 },
        hint: wantArea
          ? 'Sector area $= \\frac{1}{2}r^2\\theta$ with $\\theta$ in radians.'
          : 'Arc length $= r\\theta$ with $\\theta$ in radians.',
        solution: [
          wantArea
            ? `Area $= \\frac{1}{2}(${radius})^2\\left(\\frac{\\pi}{${k}}\\right) = ${value.toFixed(2)}\\text{ cm}^2$.`
            : `Arc $= ${radius} \\times \\frac{\\pi}{${k}} = ${value.toFixed(2)}\\text{ cm}$.`,
        ],
      };
    },
  },

  {
    id: 'trig-quadrant',
    name: 'Using a right-angled triangle',
    level: 2,
    gen(r) {
      const [p, q, h] = r.pick(TRIPLES);
      const quad = r.pick([2, 3, 4]);
      const sinSign = quad === 2 ? 1 : -1;
      const cosSign = quad === 4 ? 1 : -1;
      const given = r.bool() ? 'sin' : 'cos';
      const wanted = given === 'sin' ? 'tan' : 'tan';
      const sinV = (sinSign * p) / h;
      const cosV = (cosSign * q) / h;
      const tanV = sinV / cosV;
      const givenTex = given === 'sin'
        ? `\\sin\\theta = ${fracTex(sinSign * p, h)}`
        : `\\cos\\theta = ${fracTex(cosSign * q, h)}`;
      return {
        prompt: `$\\theta$ is an angle in quadrant ${quad} and $${givenTex}$.\nFind the exact value of $\\${wanted}\\theta$.`,
        answerLabel: 'A number — a fraction is fine',
        placeholder: 'e.g. -3/4',
        answer: { type: 'number', value: tanV, tol: 1e-7 },
        hint: 'Use $\\sin^2\\theta + \\cos^2\\theta = 1$ to get the other ratio, then watch the signs for that quadrant.',
        solution: [
          `The reference triangle has sides $${p}$, $${q}$, $${h}$.`,
          `In quadrant ${quad}: $\\sin\\theta = ${fracTex(sinSign * p, h)}$ and $\\cos\\theta = ${fracTex(cosSign * q, h)}$.`,
          `$\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta} = ${fracTex(sinSign * p, cosSign * q)}$.`,
        ],
      };
    },
  },

  {
    id: 'trig-double-angle',
    name: 'Double angle',
    level: 3,
    gen(r) {
      const [p, q, h] = r.pick(TRIPLES);
      const which = r.pick(['cos2', 'sin2']);
      const sinV = p / h;
      const cosV = q / h;
      const value = which === 'cos2' ? 1 - 2 * sinV * sinV : 2 * sinV * cosV;
      return {
        prompt: `$\\theta$ is an acute angle with $\\sin\\theta = ${fracTex(p, h)}$.\nFind the exact value of $\\${which === 'cos2' ? 'cos' : 'sin'}(2\\theta)$.`,
        answerLabel: 'A number — a fraction is fine',
        placeholder: 'e.g. 7/25',
        answer: { type: 'number', value, tol: 1e-7 },
        hint: which === 'cos2'
          ? '$\\cos 2\\theta = 1 - 2\\sin^2\\theta$'
          : '$\\sin 2\\theta = 2\\sin\\theta\\cos\\theta$',
        solution: [
          `$\\theta$ is acute, so $\\cos\\theta = ${fracTex(q, h)}$ (from the $${p}$–$${q}$–$${h}$ triangle).`,
          which === 'cos2'
            ? `$\\cos 2\\theta = 1 - 2\\left(${fracTex(p, h)}\\right)^2 = ${fracTex(h * h - 2 * p * p, h * h)}$`
            : `$\\sin 2\\theta = 2\\left(${fracTex(p, h)}\\right)\\left(${fracTex(q, h)}\\right) = ${fracTex(2 * p * q, h * h)}$`,
        ],
      };
    },
  },

  {
    id: 'trig-identity',
    name: 'Trig identities',
    level: 2,
    gen(r) {
      const items = [
        { q: '\\frac{1 - \\cos^2\\theta}{\\sin\\theta}', a: '\\sin\\theta', w: ['\\cos\\theta', '\\tan\\theta', '\\frac{1}{\\sin\\theta}'] },
        { q: '\\frac{\\sin\\theta}{\\cos\\theta} \\cdot \\cos^2\\theta', a: '\\sin\\theta\\cos\\theta', w: ['\\sin\\theta', '\\tan\\theta', '\\cos^2\\theta'] },
        { q: '(\\sin\\theta + \\cos\\theta)^2 - 1', a: '2\\sin\\theta\\cos\\theta', w: ['1', '\\sin 2\\theta + 1', '0'] },
        { q: '\\frac{\\sin 2\\theta}{2\\cos\\theta}', a: '\\sin\\theta', w: ['\\cos\\theta', '\\tan\\theta', '2\\sin\\theta'] },
        { q: '1 + \\tan^2\\theta', a: '\\frac{1}{\\cos^2\\theta}', w: ['\\frac{1}{\\sin^2\\theta}', '\\sec\\theta', '\\cos^2\\theta'] },
        { q: '\\cos^2\\theta - \\sin^2\\theta', a: '\\cos 2\\theta', w: ['\\sin 2\\theta', '1', '2\\cos^2\\theta'] },
      ];
      const item = r.pick(items);
      const all = [`$${item.a}$`, ...item.w.map((w) => `$${w}$`)];
      const order = r.shuffle([0, 1, 2, 3]);
      return {
        prompt: `Simplify  $${item.q}$`,
        answer: { type: 'mc', choices: order.map((i) => all[i]), correct: order.indexOf(0) },
        hint: 'Work from the identities $\\sin^2\\theta + \\cos^2\\theta = 1$, $\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$ and $\\sin 2\\theta = 2\\sin\\theta\\cos\\theta$.',
        solution: [`$${item.q} = ${item.a}$`],
      };
    },
  },

  {
    id: 'trig-graph',
    name: 'Period and range',
    level: 1,
    gen(r) {
      const a = r.int(2, 6);
      const b = r.int(2, 6);
      const c = r.int(-4, 4);
      const askPeriod = r.bool();
      const period = 360 / b;
      return {
        prompt: askPeriod
          ? `Find the period, in degrees, of $y = ${a}\\sin(${b}x)${c ? signed(c) : ''}$.`
          : `$y = ${a}\\sin(${b}x)${c ? signed(c) : ''}$. Write down the maximum and minimum values of $y$.`,
        answerLabel: askPeriod ? 'A number of degrees' : 'Maximum then minimum, separated by a comma',
        placeholder: askPeriod ? 'e.g. 120' : 'e.g. 7, -1',
        answer: askPeriod
          ? { type: 'number', value: period, tol: 1e-9 }
          : { type: 'point', value: [a + c, -a + c], tol: 1e-9 },
        hint: askPeriod
          ? 'For $\\sin(bx)$ the period is $\\frac{360^{\\circ}}{b}$.'
          : '$\\sin$ runs between $-1$ and $1$.',
        solution: askPeriod
          ? [`Period $= \\frac{360^{\\circ}}{${b}} = ${degTex(period)}$.`]
          : [
            `$\\sin(${b}x)$ ranges from $-1$ to $1$, so $${a}\\sin(${b}x)$ ranges from $${-a}$ to $${a}$.`,
            `Maximum $= ${num(a + c)}$, minimum $= ${num(-a + c)}$.`,
          ],
      };
    },
  },

  {
    id: 'trig-radians',
    name: 'Radians',
    level: 1,
    gen(r) {
      const deg = r.pick([30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330]);
      const value = rad(deg);
      return {
        prompt: `Write $${degTex(deg)}$ in radians, as a multiple of $\\pi$.`,
        answerLabel: 'An exact value — you can type it like 5pi/6',
        placeholder: 'e.g. 5pi/6',
        answer: { type: 'number', value, tol: 1e-7 },
        hint: '$180^{\\circ} = \\pi$ radians.',
        solution: [
          `$${deg}^{\\circ} \\times \\frac{\\pi}{180} = ${RADIAN_NAMES[deg]}$`,
          `$\\approx ${num(value, 4)}$ radians.`,
        ],
      };
    },
  },
];

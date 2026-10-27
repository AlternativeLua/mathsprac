import { num, signed, fracTex, fx, coordTex, polyTex, degTex, simplifySurd, surdTex } from '../fmt.js';

const CIRCLE_POINTS = {
  5: [[3, 4], [4, 3], [0, 5], [5, 0]],
  13: [[5, 12], [12, 5], [0, 13], [13, 0]],
  25: [[7, 24], [24, 7], [15, 20], [20, 15], [0, 25], [25, 0]],
  10: [[6, 8], [8, 6], [0, 10], [10, 0]],
};

function withSigns(r, [x, y]) {
  return [x * (r.bool() ? 1 : -1), y * (r.bool() ? 1 : -1)];
}

function lineTexGeneral(a, b, c) {
  return `${a === 1 ? '' : a === -1 ? '-' : a}x${signed(b)}y${signed(c)} = 0`;
}

export const geometry = [
  {
    id: 'geo-line-two-points',
    name: 'Equation of a line',
    level: 1,
    gen(r) {
      const x1 = r.int(-7, 7);
      let x2 = r.int(-7, 7);
      while (x2 === x1) x2 = r.int(-7, 7);
      const y1 = r.int(-7, 7);
      const y2 = r.int(-7, 7);
      const m = (y2 - y1) / (x2 - x1);
      const c = y1 - m * x1;
      return {
        prompt: `Find the equation of the line through $A${coordTex(x1, y1)}$ and $B${coordTex(x2, y2)}$,\nin the form $y = mx + c$.`,
        answerLabel: 'Give $m$ and $c$, separated by a comma',
        placeholder: 'e.g. -0.5, 3',
        answer: { type: 'point', value: [m, c], tol: 1e-7 },
        hint: '$m = \\frac{y_2 - y_1}{x_2 - x_1}$, then substitute one point to find $c$.',
        solution: [
          `$m = \\frac{${num(y2)} - (${num(y1)})}{${num(x2)} - (${num(x1)})} = ${fx(m)}$`,
          `$y${signed(-y1)} = ${fx(m)}(x${signed(-x1)})$`,
          `$y = ${fx(m)}x${signed(c)}$.`,
        ],
      };
    },
  },

  {
    id: 'geo-perpendicular',
    name: 'Perpendicular lines',
    level: 2,
    gen(r) {
      const a = r.nz(-5, 5);
      const b = r.nz(-5, 5);
      const cc = r.int(-8, 8);
      const px = r.int(-6, 6);
      const py = r.int(-6, 6);
      const mLine = -a / b;
      const mPerp = -1 / mLine;
      const c = py - mPerp * px;
      return {
        prompt: `Find the equation of the line through $P${coordTex(px, py)}$ perpendicular to $${lineTexGeneral(a, b, cc)}$.\nGive your answer in the form $y = mx + c$.`,
        answerLabel: 'Give $m$ and $c$, separated by a comma',
        placeholder: 'e.g. 2, -5',
        answer: { type: 'point', value: [mPerp, c], tol: 1e-7 },
        hint: 'Perpendicular slopes multiply to give $-1$.',
        solution: [
          `The given line has slope $${fracTex(-a, b)}$.`,
          `So the perpendicular slope is $${fx(mPerp)}$.`,
          `$y${signed(-py)} = ${fx(mPerp)}(x${signed(-px)})$, giving $y = ${fx(mPerp)}x${signed(c)}$.`,
        ],
      };
    },
  },

  {
    id: 'geo-distance',
    name: 'Distance between points',
    level: 1,
    gen(r) {
      const x1 = r.int(-8, 8);
      const y1 = r.int(-8, 8);
      const x2 = r.int(-8, 8);
      const y2 = r.int(-8, 8);
      if (x1 === x2 && y1 === y2) return this.gen(r);
      const d2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      const d = Math.sqrt(d2);
      return {
        prompt: `Find $|AB|$ where $A${coordTex(x1, y1)}$ and $B${coordTex(x2, y2)}$, correct to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: d, tol: 0.002 },
        hint: '$|AB| = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$',
        solution: [
          `$|AB| = \\sqrt{(${num(x2 - x1)})^2 + (${num(y2 - y1)})^2} = \\sqrt{${d2}}$`,
          `$= ${surdTex(1, d2)} \\approx ${d.toFixed(2)}$.`,
        ],
      };
    },
  },

  {
    id: 'geo-midpoint',
    name: 'Midpoint',
    level: 1,
    gen(r) {
      const x1 = r.int(-9, 9);
      const y1 = r.int(-9, 9);
      const x2 = r.int(-9, 9);
      const y2 = r.int(-9, 9);
      return {
        prompt: `Find the midpoint of $A${coordTex(x1, y1)}$ and $B${coordTex(x2, y2)}$.`,
        answerLabel: 'Give the $x$ and $y$ coordinates, separated by a comma',
        placeholder: 'e.g. 1.5, -2',
        answer: { type: 'point', value: [(x1 + x2) / 2, (y1 + y2) / 2], tol: 1e-9 },
        hint: 'Average the $x$ values, and average the $y$ values.',
        solution: [
          `$\\left(\\frac{${num(x1)}${signed(x2)}}{2},\\, \\frac{${num(y1)}${signed(y2)}}{2}\\right) = ${coordTex((x1 + x2) / 2, (y1 + y2) / 2)}$`,
        ],
      };
    },
  },

  {
    id: 'geo-point-line-distance',
    name: 'Point to line distance',
    level: 2,
    gen(r) {
      const a = r.nz(-5, 5);
      const b = r.nz(-5, 5);
      const c = r.int(-9, 9);
      const px = r.int(-7, 7);
      const py = r.int(-7, 7);
      const top = Math.abs(a * px + b * py + c);
      const d = top / Math.sqrt(a * a + b * b);
      return {
        prompt: `Find the perpendicular distance from $P${coordTex(px, py)}$ to the line $${lineTexGeneral(a, b, c)}$,\ncorrect to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: d, tol: 0.002 },
        hint: '$d = \\frac{|ax_1 + by_1 + c|}{\\sqrt{a^2 + b^2}}$',
        solution: [
          `$d = \\frac{|${num(a)}(${num(px)})${signed(b)}(${num(py)})${signed(c)}|}{\\sqrt{${a}^2 + ${b}^2}} = \\frac{${num(top)}}{\\sqrt{${a * a + b * b}}}$`,
          `$= ${d.toFixed(2)}$.`,
        ],
      };
    },
  },

  {
    id: 'geo-circle-centre-radius',
    name: 'Centre and radius of a circle',
    level: 2,
    gen(r) {
      const h = r.int(-6, 6);
      const k = r.int(-6, 6);
      const radius = r.int(2, 9);
      const g = -h;
      const f = -k;
      const c = g * g + f * f - radius * radius;
      return {
        prompt: `Find the centre and radius of the circle\n$x^2 + y^2${signed(2 * g)}x${signed(2 * f)}y${signed(c)} = 0$`,
        answerLabel: 'Centre $x$, centre $y$, then radius — separated by commas',
        placeholder: 'e.g. 3, -2, 5',
        answer: { type: 'point', value: [h, k, radius], tol: 1e-7 },
        hint: 'For $x^2 + y^2 + 2gx + 2fy + c = 0$ the centre is $(-g, -f)$ and $r = \\sqrt{g^2 + f^2 - c}$.',
        solution: [
          `$2g = ${num(2 * g)} \\Rightarrow g = ${num(g)}$;  $2f = ${num(2 * f)} \\Rightarrow f = ${num(f)}$.`,
          `Centre $= (-g, -f) = ${coordTex(h, k)}$.`,
          `$r = \\sqrt{${g * g} + ${f * f} - (${c})} = \\sqrt{${radius * radius}} = ${radius}$.`,
        ],
      };
    },
  },

  {
    id: 'geo-circle-equation',
    name: 'Equation of a circle',
    level: 1,
    gen(r) {
      const h = r.int(-6, 6);
      const k = r.int(-6, 6);
      const radius = r.int(2, 9);
      const c = h * h + k * k - radius * radius;
      return {
        prompt: `A circle has centre ${coordTex(h, k)} and radius $${radius}$.\nIts equation is written as $x^2 + y^2 + 2gx + 2fy + c = 0$. Find $c$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: c, tol: 1e-9 },
        hint: 'Expand $(x - h)^2 + (y - k)^2 = r^2$ and read off the constant term.',
        solution: [
          `$(x${signed(-h)})^2 + (y${signed(-k)})^2 = ${radius * radius}$`,
          `Constant term: $${h}^2 + ${k}^2 - ${radius}^2 = ${num(c)}$.`,
        ],
      };
    },
  },

  {
    id: 'geo-line-circle',
    name: 'Line meets circle',
    level: 3,
    gen(r) {
      const radius = Number(r.pick(Object.keys(CIRCLE_POINTS)));
      const pts = CIRCLE_POINTS[radius];
      let p = withSigns(r, r.pick(pts));
      let q = withSigns(r, r.pick(pts));
      let guard = 0;
      while ((p[0] === q[0] || (p[0] === q[0] && p[1] === q[1])) && guard++ < 50) {
        q = withSigns(r, r.pick(pts));
      }
      if (p[0] === q[0]) return this.gen(r);
      const m = (q[1] - p[1]) / (q[0] - p[0]);
      const c = p[1] - m * p[0];
      const mTex = fx(m);
      return {
        prompt: `The line $y = ${m === 1 ? '' : m === -1 ? '-' : `${mTex}`}x${c ? signed(c) : ''}$ intersects the circle $x^2 + y^2 = ${radius * radius}$.\nFind the two $x$-coordinates of the points of intersection.`,
        answerLabel: 'Both $x$ values, separated by a comma',
        placeholder: 'e.g. -4, 3',
        answer: { type: 'set', values: [p[0], q[0]], tol: 1e-6 },
        hint: 'Substitute the expression for $y$ into the circle equation and solve the quadratic in $x$.',
        solution: [
          `Substituting: $x^2 + \\left(${mTex}x${c ? signed(c) : ''}\\right)^2 = ${radius * radius}$`,
          `This simplifies to a quadratic whose roots are $x = ${num(p[0])}$ and $x = ${num(q[0])}$.`,
          `The intersection points are ${coordTex(p[0], p[1])} and ${coordTex(q[0], q[1])}.`,
        ],
      };
    },
  },

  {
    id: 'geo-tangent-length',
    name: 'Tangent from a point',
    level: 2,
    gen(r) {
      const h = r.int(-5, 5);
      const k = r.int(-5, 5);
      const radius = r.int(2, 6);
      let px, py, dist2;
      do {
        px = r.int(-12, 12);
        py = r.int(-12, 12);
        dist2 = (px - h) ** 2 + (py - k) ** 2;
      } while (dist2 <= radius * radius + 1);
      const t = Math.sqrt(dist2 - radius * radius);
      return {
        prompt: `A circle has centre $C${coordTex(h, k)}$ and radius $${radius}$.\nFind the length of a tangent drawn from $P${coordTex(px, py)}$ to the circle, correct to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: t, tol: 0.002 },
        hint: 'The radius to the point of contact is perpendicular to the tangent, so use Pythagoras on triangle $CPT$.',
        solution: [
          `$|CP|^2 = (${num(px - h)})^2 + (${num(py - k)})^2 = ${dist2}$`,
          `Tangent length $= \\sqrt{|CP|^2 - r^2} = \\sqrt{${dist2} - ${radius * radius}} = \\sqrt{${dist2 - radius * radius}}$`,
          `$= ${t.toFixed(2)}$.`,
        ],
      };
    },
  },

  {
    id: 'geo-tangent-at-point',
    name: 'Tangent to a circle',
    level: 3,
    gen(r) {
      const radius = Number(r.pick(Object.keys(CIRCLE_POINTS)));
      const base = r.pick(CIRCLE_POINTS[radius].filter(([x, y]) => x !== 0 && y !== 0));
      const [a, b] = withSigns(r, base);
      const m = -a / b;
      const c = (radius * radius) / b;
      return {
        prompt: `Find the equation of the tangent to the circle $x^2 + y^2 = ${radius * radius}$ at the point ${coordTex(a, b)}.\nGive your answer in the form $y = mx + c$.`,
        answerLabel: 'Give $m$ and $c$, separated by a comma',
        placeholder: 'e.g. -0.75, 6.25',
        answer: { type: 'point', value: [m, c], tol: 1e-7 },
        hint: 'The tangent is perpendicular to the radius drawn to that point.',
        solution: [
          `Slope of the radius from the origin: $${fracTex(b, a)}$, so the tangent slope is $${fx(m)}$.`,
          `$y${signed(-b)} = ${fx(m)}(x${signed(-a)})$`,
          `$y = ${fx(m)}x${signed(c)}$  (equivalently $${num(a)}x${signed(b)}y = ${radius * radius}$).`,
        ],
      };
    },
  },

  {
    id: 'geo-triangle-area',
    name: 'Area of a triangle from coordinates',
    level: 2,
    gen(r) {
      const x1 = r.int(-7, 7);
      const y1 = r.int(-7, 7);
      const x2 = r.int(-7, 7);
      const y2 = r.int(-7, 7);
      const x3 = r.int(-7, 7);
      const y3 = r.int(-7, 7);
      const area = Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2;
      if (area === 0) return this.gen(r);
      return {
        prompt: `Find the area of the triangle with vertices $A${coordTex(x1, y1)}$, $B${coordTex(x2, y2)}$ and $C${coordTex(x3, y3)}$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: area, tol: 1e-9 },
        hint: 'Translate $A$ to the origin, then area $= \\frac{1}{2}|x_1y_2 - x_2y_1|$ with the translated points.',
        solution: [
          `Translate by $(${num(-x1)}, ${num(-y1)})$: $B' = ${coordTex(x2 - x1, y2 - y1)}$, $C' = ${coordTex(x3 - x1, y3 - y1)}$.`,
          `Area $= \\frac{1}{2}\\left|(${num(x2 - x1)})(${num(y3 - y1)}) - (${num(x3 - x1)})(${num(y2 - y1)})\\right|$`,
          `$= ${num(area)}$ square units.`,
        ],
      };
    },
  },

  {
    id: 'geo-angle-between-lines',
    name: 'Angle between two lines',
    level: 3,
    gen(r) {
      let m1, m2;
      do {
        m1 = r.nz(-4, 4);
        m2 = r.nz(-4, 4);
      } while (m1 === m2 || 1 + m1 * m2 === 0);
      const tanTheta = Math.abs((m1 - m2) / (1 + m1 * m2));
      const angle = (Math.atan(tanTheta) * 180) / Math.PI;
      return {
        prompt: `Find the acute angle between the lines $y = ${num(m1)}x$ and $y = ${num(m2)}x$,\nin degrees correct to two decimal places.`,
        answerLabel: 'A number of degrees',
        answer: { type: 'number', value: angle, tol: 0.002 },
        hint: '$\\tan\\theta = \\left|\\frac{m_1 - m_2}{1 + m_1m_2}\\right|$',
        solution: [
          `$\\tan\\theta = \\left|\\frac{${num(m1)} - (${num(m2)})}{1 + (${num(m1)})(${num(m2)})}\\right| = ${num(tanTheta, 5)}$`,
          `$\\theta = ${angle.toFixed(2)}^{\\circ}$.`,
        ],
      };
    },
  },

  {
    id: 'geo-collinear',
    name: 'Collinear points',
    level: 2,
    gen(r) {
      const x1 = r.int(-6, 6);
      const y1 = r.int(-6, 6);
      let x2 = r.int(-6, 6);
      while (x2 === x1) x2 = r.int(-6, 6);
      const y2 = r.int(-6, 6);
      let x3 = r.int(-8, 8);
      while (x3 === x1) x3 = r.int(-8, 8);
      const m = (y2 - y1) / (x2 - x1);
      const k = y1 + m * (x3 - x1);
      return {
        prompt: `The points $A${coordTex(x1, y1)}$, $B${coordTex(x2, y2)}$ and $C(${num(x3)},\\, k)$ are collinear.\nFind the value of $k$.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: k, tol: 1e-7 },
        hint: 'Collinear points share a slope: slope of $AB$ equals slope of $AC$.',
        solution: [
          `Slope of $AB = ${fx(m)}$.`,
          `$\\frac{k${signed(-y1)}}{${num(x3)}${signed(-x1)}} = ${fx(m)}$`,
          `$k = ${fx(k)}$.`,
        ],
      };
    },
  },
];

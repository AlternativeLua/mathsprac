import { num, nCr, nPr, factorial, normCdf, normInv, fracTex } from '../fmt.js';

const P_VALUES = [
  [1, 5, '0.2'], [1, 4, '0.25'], [3, 10, '0.3'], [2, 5, '0.4'],
  [1, 2, '0.5'], [3, 5, '0.6'], [3, 4, '0.75'], [4, 5, '0.8'],
];

const WORDS = ['BANANA', 'STATISTICS', 'PARALLEL', 'MISSISSIPPI', 'CALCULUS', 'TRIANGLE', 'GEOMETRY', 'ALGEBRA'];

function binom(n, k, p) {
  return nCr(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

export const stats = [
  {
    id: 'prob-binomial-exact',
    name: 'Binomial probability',
    level: 1,
    gen(r) {
      const n = r.int(5, 12);
      const [pn, pd, pTex] = r.pick(P_VALUES);
      const p = pn / pd;
      const k = r.int(1, n - 1);
      const value = binom(n, k, p);
      return {
        prompt: `A trial is repeated ${n} times. Each trial succeeds with probability $${pTex}$, independently of the others.\nFind the probability of exactly ${k} successes, correct to four decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 0.0006 },
        hint: '$P(X = k) = \\binom{n}{k}p^k(1-p)^{n-k}$',
        solution: [
          `$P(X = ${k}) = \\binom{${n}}{${k}}(${pTex})^{${k}}(${num(1 - p)})^{${n - k}}$`,
          `$\\binom{${n}}{${k}} = ${nCr(n, k)}$`,
          `$P(X = ${k}) = ${value.toFixed(4)}$.`,
        ],
      };
    },
  },

  {
    id: 'prob-binomial-atleast',
    name: 'At least one success',
    level: 2,
    gen(r) {
      const n = r.int(5, 10);
      const [pn, pd, pTex] = r.pick(P_VALUES.slice(0, 5));
      const p = pn / pd;
      const k = r.int(1, 2);
      let value = 1;
      for (let i = 0; i < k; i++) value -= binom(n, i, p);
      return {
        prompt: `$X \\sim B(${n}, ${pTex})$.\nFind $P(X \\ge ${k})$, correct to four decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 0.0006 },
        hint: `Use the complement: $P(X \\ge ${k}) = 1 - P(X ${k === 1 ? '= 0' : '\\le 1'})$.`,
        solution: [
          k === 1
            ? `$P(X = 0) = (${num(1 - p)})^{${n}} = ${num(binom(n, 0, p), 5)}$`
            : `$P(X = 0) = ${num(binom(n, 0, p), 5)}$ and $P(X = 1) = ${num(binom(n, 1, p), 5)}$`,
          `$P(X \\ge ${k}) = 1 - ${num(1 - value, 5)} = ${value.toFixed(4)}$.`,
        ],
      };
    },
  },

  {
    id: 'prob-combinations',
    name: 'Combinations',
    level: 1,
    gen(r) {
      const n = r.int(7, 14);
      const k = r.int(2, 5);
      const value = nCr(n, k);
      return {
        prompt: `A committee of ${k} people is to be chosen from ${n} people.\nIn how many different ways can this be done?`,
        answerLabel: 'A whole number',
        answer: { type: 'number', value, tol: 1e-9 },
        hint: 'Order does not matter, so this is $\\binom{n}{k}$.',
        solution: [
          `$\\binom{${n}}{${k}} = \\frac{${n}!}{${k}!\\,(${n - k})!} = ${value}$`,
        ],
      };
    },
  },

  {
    id: 'prob-arrangements-word',
    name: 'Arrangements with repeats',
    level: 2,
    gen(r) {
      const word = r.pick(WORDS);
      const counts = {};
      for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
      let value = factorial(word.length);
      const repeats = [];
      for (const [ch, n] of Object.entries(counts)) {
        if (n > 1) {
          value /= factorial(n);
          repeats.push(`${n} \\times \\text{${ch}}`);
        }
      }
      return {
        prompt: `How many distinguishable arrangements are there of all the letters of the word ${word}?`,
        answerLabel: 'A whole number',
        answer: { type: 'number', value, tol: 1e-9 },
        hint: 'Divide $n!$ by a factorial for each repeated letter.',
        solution: [
          `${word} has ${word.length} letters, with ${repeats.join(', ')}.`,
          `Arrangements $= \\frac{${word.length}!}{${Object.values(counts).filter((n) => n > 1).map((n) => `${n}!`).join(' \\cdot ')}} = ${value}$`,
        ],
      };
    },
  },

  {
    id: 'prob-arrangements-restriction',
    name: 'Arrangements with a restriction',
    level: 2,
    gen(r) {
      const n = r.int(5, 8);
      const together = r.bool();
      const value = together ? 2 * factorial(n - 1) : factorial(n) - 2 * factorial(n - 1);
      return {
        prompt: `${n} people stand in a row for a photograph.\nIn how many ways can they be arranged if two particular people must ${together ? 'stand next to each other' : 'not stand next to each other'}?`,
        answerLabel: 'A whole number',
        answer: { type: 'number', value, tol: 1e-9 },
        hint: together
          ? 'Treat the pair as a single block, then arrange the block internally.'
          : 'Count all arrangements, then subtract the ones where they are together.',
        solution: [
          `Together: treat the pair as one block, giving $${n - 1}! = ${factorial(n - 1)}$ arrangements, times $2!$ for the pair itself $= ${2 * factorial(n - 1)}$.`,
          together
            ? `Answer: $${value}$.`
            : `Total arrangements $= ${n}! = ${factorial(n)}$, so not together $= ${factorial(n)} - ${2 * factorial(n - 1)} = ${value}$.`,
        ],
      };
    },
  },

  {
    id: 'prob-conditional',
    name: 'Conditional probability',
    level: 2,
    gen(r) {
      const both = r.int(4, 10);
      const onlyA = r.int(3, 12);
      const onlyB = r.int(3, 12);
      const neither = r.int(2, 10);
      const total = both + onlyA + onlyB + neither;
      const a = both + onlyA;
      const b = both + onlyB;
      const value = both / b;
      return {
        prompt: `In a group of ${total} students, ${a} study Physics, ${b} study Chemistry and ${both} study both.\nA student is chosen at random from those who study Chemistry.\nFind the probability that this student also studies Physics.`,
        answerLabel: 'A number — a fraction is fine',
        placeholder: 'e.g. 7/18',
        answer: { type: 'number', value, tol: 1e-7 },
        hint: '$P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}$ — here you can just count within the Chemistry group.',
        solution: [
          `Of the ${b} Chemistry students, ${both} also study Physics.`,
          `$P(\\text{Physics} \\mid \\text{Chemistry}) = ${fracTex(both, b)} = ${num(value, 4)}$.`,
        ],
      };
    },
  },

  {
    id: 'prob-without-replacement',
    name: 'Without replacement',
    level: 2,
    gen(r) {
      const red = r.int(3, 9);
      const blue = r.int(3, 9);
      const total = red + blue;
      const bothRed = r.bool();
      const value = bothRed
        ? (red / total) * ((red - 1) / (total - 1))
        : 2 * (red / total) * (blue / (total - 1));
      return {
        prompt: `A bag contains ${red} red discs and ${blue} blue discs.\nTwo discs are drawn at random without replacement.\nFind the probability that ${bothRed ? 'both are red' : 'one is red and one is blue'}.\nGive your answer as a fraction or correct to four decimal places.`,
        answerLabel: 'A number — a fraction is fine',
        answer: { type: 'number', value, tol: 0.0006 },
        hint: bothRed
          ? 'Multiply the two probabilities, remembering the bag has one fewer disc for the second draw.'
          : 'There are two orders: red then blue, or blue then red.',
        solution: [
          bothRed
            ? `$P = ${fracTex(red, total)} \\times ${fracTex(red - 1, total - 1)} = ${num(value, 5)}$`
            : `$P = 2 \\times ${fracTex(red, total)} \\times ${fracTex(blue, total - 1)} = ${num(value, 5)}$`,
        ],
      };
    },
  },

  {
    id: 'prob-expected-value',
    name: 'Expected value',
    level: 1,
    gen(r) {
      const values = [0, 1, 2, 3];
      let probs = [r.int(1, 4), r.int(1, 4), r.int(1, 4), r.int(1, 4)];
      const sum = probs.reduce((a, b) => a + b, 0);
      const ev = values.reduce((acc, v, i) => acc + (v * probs[i]) / sum, 0);
      const list = values.map((v, i) => `$P(X = ${v}) = ${fracTex(probs[i], sum)}$`).join(',  ');
      return {
        prompt: `A random variable $X$ has this distribution:\n${list}.\nFind $E(X)$, correct to three decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: ev, tol: 0.0015 },
        hint: '$E(X) = \\sum x\\,P(X = x)$',
        solution: [
          `$E(X) = ${values.map((v, i) => `${v}\\left(${fracTex(probs[i], sum)}\\right)`).join(' + ')}$`,
          `$= ${num(ev, 5)}$.`,
        ],
      };
    },
  },

  {
    id: 'prob-normal-less',
    name: 'Normal distribution',
    level: 2,
    gen(r) {
      const mu = r.int(40, 90);
      const sigma = r.int(4, 15);
      const z = r.pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2]);
      const a = mu + z * sigma;
      const value = normCdf(z);
      return {
        prompt: `$X \\sim N(${mu}, ${sigma}^2)$.\nFind $P(X < ${num(a)})$, correct to four decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 0.0015 },
        hint: `Standardise: $z = \\frac{x - \\mu}{\\sigma}$.`,
        solution: [
          `$z = \\frac{${num(a)} - ${mu}}{${sigma}} = ${num(z)}$`,
          `$P(Z < ${num(z)}) = ${value.toFixed(4)}$.`,
        ],
      };
    },
  },

  {
    id: 'prob-normal-between',
    name: 'Normal distribution between limits',
    level: 3,
    gen(r) {
      const mu = r.int(40, 90);
      const sigma = r.int(4, 15);
      const z1 = r.pick([-2, -1.5, -1, -0.5]);
      const z2 = r.pick([0.5, 1, 1.5, 2]);
      const a = mu + z1 * sigma;
      const b = mu + z2 * sigma;
      const value = normCdf(z2) - normCdf(z1);
      return {
        prompt: `$X \\sim N(${mu}, ${sigma}^2)$.\nFind $P(${num(a)} < X < ${num(b)})$, correct to four decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 0.0015 },
        hint: 'Standardise both limits, then subtract the two cumulative probabilities.',
        solution: [
          `$z_1 = ${num(z1)}$ and $z_2 = ${num(z2)}$.`,
          `$P = P(Z < ${num(z2)}) - P(Z < ${num(z1)}) = ${num(normCdf(z2), 4)} - ${num(normCdf(z1), 4)}$`,
          `$= ${value.toFixed(4)}$.`,
        ],
      };
    },
  },

  {
    id: 'prob-normal-inverse',
    name: 'Working back from a probability',
    level: 3,
    gen(r) {
      const mu = r.int(40, 90);
      const sigma = r.int(4, 15);
      const p = r.pick([0.05, 0.1, 0.9, 0.95, 0.975]);
      const z = normInv(p);
      const value = mu + z * sigma;
      return {
        prompt: `$X \\sim N(${mu}, ${sigma}^2)$.\nFind the value of $k$ for which $P(X < k) = ${p}$, correct to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value, tol: 0.004 },
        hint: 'Find the $z$ value with that cumulative probability, then unstandardise: $x = \\mu + z\\sigma$.',
        solution: [
          `$P(Z < z) = ${p} \\Rightarrow z = ${num(z, 4)}$`,
          `$k = ${mu} + (${num(z, 4)})(${sigma}) = ${value.toFixed(2)}$.`,
        ],
      };
    },
  },

  {
    id: 'prob-confidence-interval',
    name: 'Margin of error',
    level: 2,
    gen(r) {
      const n = r.pick([100, 196, 225, 400, 625, 900, 1000]);
      const phat = r.int(30, 70) / 100;
      const value = 1.96 * Math.sqrt((phat * (1 - phat)) / n);
      return {
        prompt: `In a random sample of ${n} people, ${num(phat * 100)}% said they would vote Yes.\nFind the margin of error for a 95% confidence interval for the population proportion,\ncorrect to four decimal places.`,
        answerLabel: 'A number (as a proportion, not a percentage)',
        answer: { type: 'number', value, tol: 0.0015 },
        hint: 'Margin of error $= 1.96\\sqrt{\\frac{\\hat{p}(1 - \\hat{p})}{n}}$.',
        solution: [
          `$\\hat{p} = ${num(phat)}$, $n = ${n}$`,
          `$1.96\\sqrt{\\frac{(${num(phat)})(${num(1 - phat)})}{${n}}} = ${value.toFixed(4)}$`,
          `(The quick exam estimate $\\frac{1}{\\sqrt{n}} = ${num(1 / Math.sqrt(n), 4)}$ is the conservative version.)`,
        ],
      };
    },
  },

  {
    id: 'prob-hypothesis',
    name: 'Hypothesis test conclusion',
    level: 2,
    gen(r) {
      const pVal = r.int(1, 99) / 100;
      const reject = pVal < 0.05;
      const correct = reject
        ? 'Reject the null hypothesis — there is evidence at the 5% level.'
        : 'Fail to reject the null hypothesis — there is not enough evidence at the 5% level.';
      const wrong = reject
        ? [
          'Fail to reject the null hypothesis — there is not enough evidence at the 5% level.',
          'Accept the null hypothesis as proved.',
          'The result is inconclusive; no decision can be made.',
        ]
        : [
          'Reject the null hypothesis — there is evidence at the 5% level.',
          'Accept the null hypothesis as proved.',
          'Reject the alternative hypothesis as impossible.',
        ];
      const all = [correct, ...wrong];
      const order = r.shuffle([0, 1, 2, 3]);
      return {
        prompt: `A two-tailed hypothesis test at the 5% level of significance gives a $p$-value of $${pVal}$.\nWhat is the correct conclusion?`,
        answer: { type: 'mc', choices: order.map((i) => all[i]), correct: order.indexOf(0) },
        hint: 'Compare the $p$-value with the significance level $0.05$.',
        solution: [
          `$p = ${pVal}$ is ${reject ? 'less' : 'greater'} than $0.05$.`,
          correct,
        ],
      };
    },
  },

  {
    id: 'prob-mean-sd',
    name: 'Mean and standard deviation',
    level: 1,
    gen(r) {
      const n = r.int(5, 7);
      const data = Array.from({ length: n }, () => r.int(2, 30));
      const mean = data.reduce((a, b) => a + b, 0) / n;
      const variance = data.reduce((acc, x) => acc + (x - mean) ** 2, 0) / n;
      const sd = Math.sqrt(variance);
      const askSd = r.bool();
      return {
        prompt: `A data set is: $${data.join(',\\; ')}$.\nFind the ${askSd ? 'standard deviation' : 'mean'}, correct to two decimal places.`,
        answerLabel: 'A number',
        answer: { type: 'number', value: askSd ? sd : mean, tol: 0.004 },
        hint: askSd
          ? '$\\sigma = \\sqrt{\\frac{\\sum(x - \\bar{x})^2}{n}}$ — find the mean first.'
          : 'Add the values and divide by how many there are.',
        solution: askSd
          ? [
            `Mean $= \\frac{${data.reduce((a, b) => a + b, 0)}}{${n}} = ${num(mean, 4)}$`,
            `$\\sigma = \\sqrt{${num(variance, 4)}} = ${sd.toFixed(2)}$.`,
          ]
          : [
            `$\\bar{x} = \\frac{${data.join(' + ')}}{${n}} = \\frac{${data.reduce((a, b) => a + b, 0)}}{${n}}$`,
            `$= ${mean.toFixed(2)}$.`,
          ],
      };
    },
  },
];

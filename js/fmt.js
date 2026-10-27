// Formatting helpers shared by the question generators.

import { gcd } from './rng.js';

export function num(n, dp = 6) {
  if (!Number.isFinite(n)) return String(n);
  const r = Number(n.toFixed(dp));
  if (Object.is(r, -0)) return '0';
  return String(r);
}

export function round(n, dp = 2) {
  return Number(n.toFixed(dp));
}

// "+ 3" / "- 3", for stitching terms together.
export function signed(n, { space = true } = {}) {
  const s = n < 0 ? '-' : '+';
  const gap = space ? ' ' : '';
  return `${gap}${s}${gap}${num(Math.abs(n))}`;
}

export function fracTex(n, d) {
  if (d === 0) return '\\text{undefined}';
  let s = (d < 0 ? -1 : 1) * (n < 0 ? -1 : 1);
  let a = Math.abs(n);
  let b = Math.abs(d);
  const g = gcd(a, b);
  a /= g;
  b /= g;
  if (b === 1) return `${s < 0 ? '-' : ''}${a}`;
  return `${s < 0 ? '-' : ''}\\frac{${a}}{${b}}`;
}

export function fracValue(n, d) {
  return n / d;
}

// Largest square factor pulled out: 12 -> [2, 3] meaning 2*sqrt(3).
export function simplifySurd(n) {
  let outside = 1;
  let inside = n;
  for (let k = 2; k * k <= inside; k++) {
    while (inside % (k * k) === 0) {
      inside /= k * k;
      outside *= k;
    }
  }
  return [outside, inside];
}

export function surdTex(coefNum, surdN, coefDen = 1) {
  const [out, inside] = simplifySurd(surdN);
  let n = coefNum * out;
  let d = coefDen;
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d < 0) { n = -n; d = -d; }
  const sign = n < 0 ? '-' : '';
  const absn = Math.abs(n);
  const root = inside === 1 ? '' : `\\sqrt{${inside}}`;
  const head = absn === 1 && root ? '' : String(absn);
  const body = `${head}${root}` || '1';
  return d === 1 ? `${sign}${body}` : `${sign}\\frac{${body}}{${d}}`;
}

// coeffs highest power first, e.g. [3,0,-4,5] -> 3x^{3} - 4x + 5
export function polyTex(coeffs, v = 'x') {
  const deg = coeffs.length - 1;
  let out = '';
  coeffs.forEach((c, i) => {
    if (c === 0) return;
    const power = deg - i;
    const abs = Math.abs(c);
    let term = '';
    if (power === 0) term = num(abs);
    else {
      const coefPart = abs === 1 ? '' : num(abs);
      const varPart = power === 1 ? v : `${v}^{${power}}`;
      term = `${coefPart}${varPart}`;
    }
    if (!out) out = (c < 0 ? '-' : '') + term;
    else out += `${c < 0 ? ' - ' : ' + '}${term}`;
  });
  return out || '0';
}

export function evalPoly(coeffs, x) {
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

export function diffPoly(coeffs) {
  const deg = coeffs.length - 1;
  if (deg === 0) return [0];
  return coeffs.slice(0, -1).map((c, i) => c * (deg - i));
}

// Antiderivative with constant 0; returns coeffs of degree+1.
export function intPoly(coeffs) {
  const deg = coeffs.length - 1;
  return [...coeffs.map((c, i) => c / (deg - i + 1)), 0];
}

// Polynomial as an expression string the answer checker can evaluate.
export function polyExpr(coeffs, v = 'x') {
  const deg = coeffs.length - 1;
  const parts = [];
  coeffs.forEach((c, i) => {
    if (c === 0) return;
    const power = deg - i;
    parts.push(power === 0 ? `(${c})` : `(${c})*${v}^${power}`);
  });
  return parts.length ? parts.join('+') : '0';
}

export function mulPoly(a, b) {
  const out = new Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] += x * y; }));
  return out;
}

// (x - r1)(x - r2)... scaled by lead
export function fromRoots(roots, lead = 1) {
  let poly = [lead];
  for (const r of roots) poly = mulPoly(poly, [1, -r]);
  return poly;
}

export function coordTex(x, y) {
  return `(${num(x)},\\, ${num(y)})`;
}

// y = mx + c in a tidy form.
export function lineTex(m, c, { yEquals = true } = {}) {
  const mPart = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '-x' : `${fracTexIfNeeded(m)}x`;
  let rhs;
  if (m === 0) rhs = num(c);
  else if (c === 0) rhs = mPart;
  else rhs = `${mPart}${signed(c)}`;
  return yEquals ? `y = ${rhs}` : rhs;
}

function fracTexIfNeeded(v) {
  if (Number.isInteger(v)) return num(v);
  for (let d = 2; d <= 12; d++) {
    if (Math.abs(v * d - Math.round(v * d)) < 1e-9) return fracTex(Math.round(v * d), d);
  }
  return num(v, 3);
}

export const fx = fracTexIfNeeded;

export function degTex(d) {
  return `${num(d)}^{\\circ}`;
}

export function pct(p) {
  return `${num(p * 100, 2)}\\%`;
}

export function factorTex(root) {
  if (root === 0) return 'x';
  return root > 0 ? `(x - ${num(root)})` : `(x + ${num(-root)})`;
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function nCr(n, r) {
  if (r < 0 || r > n) return 0;
  let out = 1;
  for (let i = 1; i <= r; i++) out = (out * (n - r + i)) / i;
  return Math.round(out);
}

export function nPr(n, r) {
  let out = 1;
  for (let i = 0; i < r; i++) out *= n - i;
  return out;
}

export function factorial(n) {
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

// Standard normal CDF (Abramowitz & Stegun 7.1.26 style erf approximation).
export function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  let p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  p = 1 - p;
  return z >= 0 ? p : 1 - p;
}

export function normInv(p) {
  // Bisection is plenty here and avoids another approximation table.
  let lo = -8;
  let hi = 8;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (normCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

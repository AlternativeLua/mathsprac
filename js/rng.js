// Deterministic RNG so a given day always produces the same question set.

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed) {
  let a = typeof seed === 'string' ? hashString(seed) : seed >>> 0;

  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const r = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    bool: (p = 0.5) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
    // Non-zero integer in [min,max], excluding any values in `skip`.
    nz: (min, max, skip = []) => {
      for (let i = 0; i < 200; i++) {
        const v = r.int(min, max);
        if (v !== 0 && !skip.includes(v)) return v;
      }
      return min || max || 1;
    },
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    // Distinct integers, length n.
    distinct: (n, min, max) => {
      const seen = new Set();
      let guard = 0;
      while (seen.size < n && guard++ < 500) seen.add(r.int(min, max));
      return [...seen];
    },
  };
  return r;
}

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

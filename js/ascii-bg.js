// Animated maths-symbol background. A fixed grid of glyphs, each with a stable
// character, lit by slow interfering waves — plus a few formulae drifting
// across it.

const GLYPHS = [
  '·', '+', '−', '=', '×', '÷', '√', 'π', '∫',
  '∑', '∞', '∂', 'θ', '≈', '≤', '≥', '±',
  'Δ', '∴', '∠', 'x', 'y', 'n', 'i', 'e', '0', '1', '2', '3', '7',
  'd', 'f', '(', ')', '^', '′',
];

const FORMULAE = [
  '∫ x² dx = x³/3 + C',
  'sin²θ + cos²θ = 1',
  'e^(iπ) + 1 = 0',
  'x = (-b ± √(b²-4ac)) / 2a',
  'dy/dx = lim h→0 (f(x+h)-f(x))/h',
  '∑ 1/n² = π²/6',
  'a² + b² = c²',
  '∫₀^π sin x dx = 2',
  'logₐ(xy) = logₐx + logₐy',
  'P(X=k) = ⁿCₖ pᵏ qⁿ⁻ᵏ',
  '(x-h)² + (y-k)² = r²',
  'cos 2θ = 1 - 2sin²θ',
  'd/dx (uv) = u′v + uv′',
  'σ = √(∑(x-μ)²/n)',
];

const CELL = 15;
const FRAME_MS = 1000 / 24;

export function startBackground(canvas, { enabled = true } = {}) {
  const ctx = canvas.getContext('2d', { alpha: true });
  let cols = 0;
  let rows = 0;
  let cells = [];
  let accents = new Uint8Array(0);
  let ribbons = [];
  let dpr = 1;
  let raf = 0;
  let last = 0;
  let t = 0;
  let running = false;
  let on = enabled;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function hash(x, y) {
    let h = (x * 73856093) ^ (y * 19349663);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    cols = Math.ceil(w / CELL) + 1;
    rows = Math.ceil(h / CELL) + 1;
    cells = new Array(cols * rows);
    accents = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = hash(x, y);
        cells[y * cols + x] = GLYPHS[Math.floor(n * GLYPHS.length)];
        // A scattering of warm accents, the way the reference art has a few
        // orange scales among the grey.
        accents[y * cols + x] = hash(x + 31, y + 17) < 0.075 ? 1 : 0;
      }
    }
    ribbons = FORMULAE.slice(0, Math.max(3, Math.min(6, Math.floor(rows / 7)))).map((text, i) => ({
      text,
      row: 2 + Math.floor(((i + 0.5) * rows) / 6),
      x: -text.length * CELL * (0.3 + hash(i, 99)),
      speed: 7 + hash(i, 7) * 12,
    }));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${CELL - 2}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textBaseline = 'top';
  }

  function draw(dt) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    t += dt / 1000;

    for (let y = 0; y < rows; y++) {
      const py = y * CELL;
      for (let x = 0; x < cols; x++) {
        const wave =
          Math.sin(x * 0.17 + t * 0.45) +
          Math.sin(y * 0.21 - t * 0.33) +
          Math.sin((x + y) * 0.09 + t * 0.19) +
          Math.sin(Math.hypot(x - cols / 2, (y - rows / 2) * 1.6) * 0.12 - t * 0.6);
        const v = (wave + 4) / 8; // 0..1
        // Texture, not a focal point: it has to stay readable *behind* the
        // glass panels, which are only a few percent opaque.
        if (v < 0.38) continue;
        const a = Math.pow((v - 0.38) / 0.62, 2) * 0.21;
        if (a < 0.01) continue;
        const i = y * cols + x;
        ctx.fillStyle = accents[i]
          ? `rgba(201,92,42,${(a * 1.25).toFixed(3)})`
          : `rgba(150,144,138,${a.toFixed(3)})`;
        ctx.fillText(cells[i], x * CELL, py);
      }
    }

    for (const rib of ribbons) {
      rib.x += (rib.speed * dt) / 1000;
      const width = rib.text.length * (CELL * 0.62);
      if (rib.x > w + 40) rib.x = -width - 40;
      const py = rib.row * CELL;
      const fade = 0.07 + 0.03 * Math.sin(t * 0.5 + rib.row);
      ctx.fillStyle = `rgba(255,247,240,${fade.toFixed(3)})`;
      ctx.fillText(rib.text, rib.x, py);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    const dt = now - last;
    if (dt < FRAME_MS) return;
    last = now;
    draw(Math.min(dt, 80));
  }

  function still() {
    // One static pass, for reduced motion or when the animation is switched off.
    t = 12.5;
    draw(0);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function apply() {
    stop();
    layout();
    if (on && !reduceMotion.matches && !document.hidden) start();
    else still();
  }

  const onResize = () => apply();
  const onVisibility = () => {
    if (document.hidden) stop();
    else if (on && !reduceMotion.matches) start();
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  reduceMotion.addEventListener?.('change', apply);

  apply();

  return {
    setEnabled(value) {
      on = value;
      apply();
    },
    destroy() {
      stop();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

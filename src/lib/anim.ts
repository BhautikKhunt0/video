// Tiny deterministic animation toolkit: every frame is a pure function of time.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const E = {
  lin: (t: number) => t,
  in: (t: number) => t * t * t,
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  elastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

/** progress of t between a and b (0..1), eased */
export const seg = (t: number, a: number, b: number, e: (x: number) => number = E.out) =>
  e(clamp((t - a) / (b - a)));

/** props for a stroke "draw-on" effect (works on path/rect/circle/line) */
export const draw = (p: number) => {
  const q = clamp(p);
  return {
    pathLength: 1,
    strokeDasharray: q >= 0.999 ? undefined : '1 1',
    strokeDashoffset: 1 - q,
    style: { visibility: q > 0.001 ? ('visible' as const) : ('hidden' as const) },
  };
};

/** triangle wave 0..1..0 */
export const tri = (x: number) => Math.abs((((x % 2) + 2) % 2) - 1);

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (c1: string, c2: string, t: number) => {
  const a = hex(c1);
  const b = hex(c2);
  const q = clamp(t);
  const r = a.map((v, i) => Math.round(lerp(v, b[i], q)));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
};

export const C = {
  bg: '#04050a',
  cyan: '#22e5ff',
  mag: '#ff3df2',
  yel: '#ffe14a',
  org: '#ff8a3d',
  grn: '#5dff9a',
  pur: '#9a7bff',
  red: '#ff4d6d',
  dim: '#34406a',
  white: '#f4f8ff',
};

export const FONT = "Outfit, 'Poppins', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, monospace";

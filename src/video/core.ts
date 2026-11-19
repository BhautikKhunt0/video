import * as THREE from 'three';
import { VO } from '../assets/voData';

export const W = 1920;
export const H = 1080;
export const DUR = 120;

// Scene boundaries (seconds)
export const B = [0, 20.8, 45, 58.8, 80.4, 107.6, 120];

export const COL = {
  ink: '#04060b',
  ivory: '#f3ede2',
  ember: '#ff9a3c',
  fire: '#ff5a2a',
  ice: '#78d6ff',
  violet: '#9b8cff',
  gold: '#ffe27a',
  dim: 'rgba(243,237,226,0.55)',
};

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const eOut3 = (x: number) => 1 - Math.pow(1 - x, 3);
export const eOut5 = (x: number) => 1 - Math.pow(1 - x, 5);
export const eIn3 = (x: number) => x * x * x;
export const eIO3 = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const eIO2 = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const eOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const eOutBack = (x: number) => {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Absolute time (s) at which a given word is spoken in voice line `line`. */
export function wordT(line: number, match: string | number, nth = 0): number {
  const L = VO[line];
  if (typeof match === 'number') return L.start + (L.words[match]?.t ?? 0);
  const m = clean(match);
  let c = 0;
  for (const w of L.words) {
    if (clean(w.w) === m) {
      if (c === nth) return L.start + w.t;
      c++;
    }
  }
  console.warn('wordT: not found', line, match);
  return L.start;
}
export const lineStart = (i: number) => VO[i].start;
export const lineEnd = (i: number) => VO[i].start + VO[i].dur;

export interface FX {
  flash: number;
  flashColor: [number, number, number];
  zoom: number;
  zoomCx: number;
  zoomCy: number;
  chroma: number;
  glitch: number;
  fade: number;
  bloom: number;
  shake: number;
  grade: number; // 0 neutral, >0 warm, <0 cool
}
export const defaultFX = (): FX => ({
  flash: 0,
  flashColor: [1, 0.92, 0.8],
  zoom: 0,
  zoomCx: 0.5,
  zoomCy: 0.5,
  chroma: 0.0008,
  glitch: 0,
  fade: 0,
  bloom: 0.85,
  shake: 0,
  grade: 0,
});

export interface Ctx {
  cam: THREE.PerspectiveCamera;
  fx: FX;
  project: (v: THREE.Vector3) => [number, number, boolean];
  /** shared 3D ambient dust layer tint */
  dustTint: THREE.Color;
  env: { intensity: number };
}

export interface VScene {
  start: number;
  end: number;
  group: THREE.Group;
  /** update 3D + camera (pure function of T except particle sim) */
  update(T: number, c: Ctx): void;
  /** 2D overlay */
  draw(T: number, g: CanvasRenderingContext2D, c: Ctx): void;
}

// ---------- 2D drawing helpers ----------
export const F_SERIF = '"Instrument Serif", Georgia, serif';
export const F_MONO = '"JetBrains Mono", ui-monospace, monospace';
export const F_SANS = '"Inter", system-ui, sans-serif';

export function glowText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  alpha = 1,
  glow = 0,
  align: CanvasTextAlign = 'left',
  spacing = 0
) {
  g.save();
  g.font = font;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  g.globalAlpha = alpha;
  if (spacing) (g as any).letterSpacing = spacing + 'px';
  if (glow > 0) {
    g.shadowColor = color;
    g.shadowBlur = glow;
  }
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.restore();
}

/** Kinetic word reveal: each word rises/fades in staggered. Returns nothing. */
export function kineticWords(
  g: CanvasRenderingContext2D,
  words: string[],
  x: number,
  y: number,
  t: number, // seconds since reveal start
  font: string,
  color: string,
  opts: { stagger?: number; align?: CanvasTextAlign; gap?: number; rise?: number; alpha?: number; colors?: (string | undefined)[]; size?: number } = {}
) {
  const stagger = opts.stagger ?? 0.09;
  const gap = opts.gap ?? 0.28;
  const size = opts.size ?? 80;
  g.save();
  g.font = font;
  const widths = words.map((w) => g.measureText(w).width);
  const space = size * gap;
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let cx = opts.align === 'center' ? x - total / 2 : opts.align === 'right' ? x - total : x;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  words.forEach((w, i) => {
    const p = eOut5(clamp((t - i * stagger) / 0.7));
    if (p > 0) {
      g.save();
      g.globalAlpha = p * (opts.alpha ?? 1);
      const c = opts.colors?.[i] ?? color;
      g.fillStyle = c;
      g.shadowColor = c;
      g.shadowBlur = 18 * p;
      g.translate(cx, y + (1 - p) * (opts.rise ?? 40));
      g.fillText(w, 0, 0);
      g.restore();
    }
    cx += widths[i] + space;
  });
  g.restore();
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Consistent HUD chapter tag (top-left) */
export function chapterTag(g: CanvasRenderingContext2D, num: string, label: string, p: number, color = COL.ember) {
  if (p <= 0) return;
  const a = eOut3(p);
  g.save();
  g.globalAlpha = a;
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = 12;
  g.fillRect(96, 92, 44 * a, 2);
  g.restore();
  glowText(g, num, 96, 78, `500 15px ${F_MONO}`, color, a, 8, 'left', 3);
  glowText(g, label.toUpperCase(), 156, 78, `500 15px ${F_MONO}`, COL.ivory, a * 0.8, 0, 'left', 3);
}

export function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
export const hex = (h: string): [number, number, number] => {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
};

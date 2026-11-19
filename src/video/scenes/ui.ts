import { VO } from '../../assets/voData';
import { clamp, eOut5, F_MONO, COL, glowText } from '../core';

/**
 * Draw a run of words from a voice line; each word appears exactly when spoken.
 * `hideAt`/`hideDur` fade the whole run out.
 */
export function spokenLine(
  g: CanvasRenderingContext2D,
  T: number,
  line: number,
  from: number,
  to: number,
  x: number,
  y: number,
  font: string,
  color: string,
  opts: { align?: CanvasTextAlign; hideAt?: number; hideDur?: number; colors?: Record<string, string>; gap?: number; lead?: number; rise?: number; alpha?: number } = {}
) {
  const L = VO[line];
  const words = L.words.slice(from, to + 1);
  if (!words.length) return;
  const fade = opts.hideAt !== undefined ? 1 - clamp((T - opts.hideAt) / (opts.hideDur ?? 0.5)) : 1;
  if (fade <= 0) return;
  g.save();
  g.font = font;
  const gap = g.measureText(' ').width * (opts.gap ?? 1);
  const widths = words.map((w) => g.measureText(w.w).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let cx = opts.align === 'center' ? x - total / 2 : opts.align === 'right' ? x - total : x;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  words.forEach((w, i) => {
    const wt = L.start + w.t - (opts.lead ?? 0.05);
    const p = eOut5(clamp((T - wt) / 0.6));
    if (p > 0) {
      const c = opts.colors?.[w.w.toLowerCase().replace(/[^a-z]/g, '')] ?? color;
      g.save();
      g.globalAlpha = p * fade * (opts.alpha ?? 1);
      g.fillStyle = c;
      g.shadowColor = c;
      g.shadowBlur = 20 * p;
      g.translate(cx, y + (1 - p) * (opts.rise ?? 34));
      g.fillText(w.w, 0, 0);
      g.restore();
    }
    cx += widths[i] + gap;
  });
  g.restore();
}

/** Mono annotation with a leader line */
export function annotate(
  g: CanvasRenderingContext2D,
  T: number,
  t0: number,
  t1: number,
  x: number,
  y: number,
  text: string,
  color = COL.ivory,
  align: CanvasTextAlign = 'center',
  sub?: string
) {
  const a = clamp((T - t0) / 0.5) * (1 - clamp((T - t1) / 0.5));
  if (a <= 0) return;
  const e = eOut5(clamp((T - t0) / 0.7));
  g.save();
  g.globalAlpha = a;
  g.strokeStyle = color;
  g.lineWidth = 1.5;
  g.shadowColor = color;
  g.shadowBlur = 8;
  const w = 90 * e;
  const sx = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w;
  g.beginPath();
  g.moveTo(sx, y - 34);
  g.lineTo(sx + w, y - 34);
  g.stroke();
  g.restore();
  glowText(g, text, x, y - 8, `500 17px ${F_MONO}`, color, a, 6, align, 4);
  if (sub) glowText(g, sub, x, y + 22, `400 14px ${F_MONO}`, COL.ivory, a * 0.6, 0, align, 2);
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

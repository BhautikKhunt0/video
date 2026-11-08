import type { ReactNode } from 'react';
import { C, FONT, MONO, clamp, draw, lerp } from '../lib/anim';

export interface SceneProps {
  t: number; // local time in seconds since the scene started
  d: number; // scene duration
}

export const Defs = () => (
  <defs>
    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="3.5" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="glowSoft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
    <linearGradient id="gradEntropy" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={C.cyan} />
      <stop offset="0.5" stopColor={C.pur} />
      <stop offset="1" stopColor={C.mag} />
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stopColor="#000" stopOpacity="0" />
      <stop offset="100%" stopColor="#000" stopOpacity="0.75" />
    </radialGradient>
    <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="1.2" fill="#1a2240" />
    </pattern>
  </defs>
);

interface GProps {
  x?: number;
  y?: number;
  s?: number;
  o?: number;
  r?: number;
  children?: ReactNode;
}
export const G = ({ x = 0, y = 0, s = 1, o = 1, r = 0, children }: GProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={clamp(o)}>
    {children}
  </g>
);

interface TProps {
  x: number;
  y: number;
  size?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
  o?: number;
  mono?: boolean;
  spacing?: number;
  children: ReactNode;
  fill?: string;
  italic?: boolean;
}
export const T = ({ x, y, size = 40, color = C.white, anchor = 'middle', weight = 700, o = 1, mono, spacing = 0, children, fill, italic }: TProps) =>
  children === '' || o <= 0.001 ? null : (
  <text
    x={x}
    y={y}
    fontSize={size}
    fill={fill ?? color}
    textAnchor={anchor}
    fontWeight={weight}
    fontFamily={mono ? MONO : FONT}
    opacity={clamp(o)}
    letterSpacing={spacing}
    fontStyle={italic ? 'italic' : 'normal'}
  >
    {children}
  </text>
);

/** typewriter reveal of a string, p in 0..1 */
export const typed = (s: string, p: number) => s.slice(0, Math.round(s.length * clamp(p)));

interface PanelProps {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  p?: number;
  r?: number;
  sw?: number;
  o?: number;
}
export const Panel = ({ x, y, w, h, color = C.cyan, p = 1, r = 16, sw = 3, o = 1 }: PanelProps) => (
  <g opacity={clamp(o)}>
    <rect x={x} y={y} width={w} height={h} rx={r} fill="rgba(8,12,28,0.65)" fillOpacity={clamp(p)} stroke="none" />
    <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={color} strokeWidth={sw} {...draw(p)} />
  </g>
);

export const XMark = ({ x, y, p, size = 26, color = C.red, sw = 8 }: { x: number; y: number; p: number; size?: number; color?: string; sw?: number }) => {
  const s = lerp(0.2, 1, clamp(p));
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={clamp(p * 3)} stroke={color} strokeWidth={sw} strokeLinecap="round">
      <line x1={-size} y1={-size} x2={size} y2={size} />
      <line x1={size} y1={-size} x2={-size} y2={size} />
    </g>
  );
};

export const Check = ({ x, y, p, size = 26, color = C.grn }: { x: number; y: number; p: number; size?: number; color?: string }) => (
  <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d={`M${-size} 0 L${-size * 0.3} ${size * 0.8} L${size} ${-size * 0.8}`} {...draw(p)} />
  </g>
);

export const Person = ({ x, y, c, p, s = 1 }: { x: number; y: number; c: string; p: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={0} cy={-62} r={22} {...draw(p)} />
    <path d="M0 -38 V22 M-32 -8 L0 -26 L32 -8 M0 22 L-22 66 M0 22 L22 66" {...draw(p)} />
  </g>
);

/** Little neon label pill */
export const Tag = ({ x, y, text, color = C.cyan, o = 1, size = 26 }: { x: number; y: number; text: string; color?: string; o?: number; size?: number }) => {
  const w = text.length * size * 0.56 + 36;
  return (
    <g opacity={clamp(o)}>
      <rect x={x - w / 2} y={y - size * 0.95} width={w} height={size * 1.6} rx={size * 0.8} fill="rgba(6,10,22,.8)" stroke={color} strokeWidth={2.5} />
      <T x={x} y={y + size * 0.15} size={size} color={color} weight={500}>
        {text}
      </T>
    </g>
  );
};

export const SceneTitle = ({ text, o = 1, y = 110, color = C.white, size = 62, p = 1 }: { text: string; o?: number; y?: number; color?: string; size?: number; p?: number }) => (
  <g opacity={clamp(o)}>
    <T x={800} y={y} size={size} color={color} weight={700}>
      {typed(text, p)}
    </T>
  </g>
);

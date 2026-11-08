import { useMemo } from 'react';
import { C, clamp, lerp, rng } from '../lib/anim';
import { Defs } from './kit';
import { SCENES } from './timeline';

/** Renders one video frame (1600×900 SVG) as a pure function of time `t`. */
export function Stage({ t }: { t: number }) {
  const dust = useMemo(() => {
    const r = rng(1234);
    return Array.from({ length: 46 }, () => ({ x: r() * 1600, y: r() * 900, s: 0.8 + r() * 2.2, v: 6 + r() * 18, a: 0.08 + r() * 0.25, col: [C.cyan, C.mag, C.pur][Math.floor(r() * 3)] }));
  }, []);
  return (
    <svg viewBox="0 0 1600 900" className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
      <Defs />
      <rect width={1600} height={900} fill={C.bg} />
      <rect width={1600} height={900} fill="url(#dots)" opacity={0.7} />
      {dust.map((d, i) => (
        <circle key={i} cx={(d.x + t * d.v) % 1600} cy={(d.y - t * d.v * 0.4 + 900 * 4) % 900} r={d.s} fill={d.col} opacity={d.a} />
      ))}
      {SCENES.map((s) => {
        if (t < s.start - 0.001 || t > s.end + 0.001) return null;
        const lt = t - s.start;
        const d = s.end - s.start;
        const fi = s.start === 0 ? 1 : clamp(lt / 0.25);
        const fo = s.end >= 127.9 ? 1 : clamp((s.end - t) / 0.25);
        const sc = lerp(1.035, 1, fi);
        return (
          <g key={s.id} opacity={Math.min(fi, fo)} transform={`translate(800 450) scale(${sc}) translate(-800 -450)`}>
            <g filter="url(#glow)">
              <s.Comp t={lt} d={d} />
            </g>
          </g>
        );
      })}
      <rect width={1600} height={900} fill="url(#vignette)" pointerEvents="none" />
    </svg>
  );
}

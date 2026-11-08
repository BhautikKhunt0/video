import { useMemo } from 'react';
import { C, E, draw, lerp, mix, rng, seg } from '../lib/anim';
import { G, Panel, SceneTitle, T, Tag, XMark, typed, type SceneProps } from './kit';

/* ───────────────────────── N · 1:11 steam engine ───────────────────────── */
export const SceneEngine = ({ t }: SceneProps) => {
  const p = seg(t, 0.3, 1.4);
  const ang = t * 1.6;
  const pinX = 1260 + Math.cos(ang) * 60;
  const pinY = 480 + Math.sin(ang) * 60;
  const L = 250;
  const headX = pinX - Math.sqrt(L * L - (pinY - 480) * (pinY - 480));
  const flame = 1 + 0.14 * Math.sin(t * 14) + 0.06 * Math.sin(t * 23);
  const lost = seg(t, 3.8, 5.6, E.lin);
  return (
    <g>
      <SceneTitle text="Rudolf Clausius studied steam engines" p={seg(t, 0, 1.2, E.lin)} y={105} size={50} />
      {/* furnace */}
      <Panel x={200} y={430} w={190} h={180} color={C.org} p={p} r={10} />
      <g transform={`translate(295 596) scale(1.2 ${1.2 * flame})`} opacity={p}>
        <path d="M0 0 C-44 -20 -34 -72 0 -116 C12 -72 46 -52 34 -10 C28 10 -28 10 0 0 Z" fill={C.org} fillOpacity={0.35} stroke={C.org} strokeWidth={4} strokeLinejoin="round" />
        <path d="M0 -6 C-18 -14 -14 -40 0 -58 C6 -38 20 -30 14 -10 Z" fill={C.yel} fillOpacity={0.6} stroke={C.yel} strokeWidth={3} />
      </g>
      {/* boiler */}
      <Panel x={440} y={400} w={260} h={210} color={C.cyan} p={p} r={34} />
      <path d={`M455 ${505 + Math.sin(t * 3) * 4} Q 505 ${495} 570 ${505} T 685 ${505}`} fill="none" stroke={C.cyan} strokeWidth={3.5} opacity={0.7 * p} />
      <path d="M700 480 H780" stroke={C.cyan} strokeWidth={8} strokeLinecap="round" {...draw(seg(t, 0.8, 1.4))} />
      {/* cylinder + piston */}
      <Panel x={780} y={430} w={300} h={100} color={C.cyan} p={seg(t, 0.7, 1.5)} r={8} />
      <g opacity={seg(t, 1.0, 1.6)}>
        <rect x={headX} y={436} width={20} height={88} rx={4} fill={C.cyan} fillOpacity={0.4} stroke={C.cyan} strokeWidth={4} />
        <path d={`M${headX + 20} 480 L${pinX} ${pinY}`} stroke={C.white} strokeWidth={7} strokeLinecap="round" />
      </g>
      {/* flywheel */}
      <g transform={`translate(1260 480)`} opacity={seg(t, 0.9, 1.6)}>
        <circle r={125} fill="none" stroke={C.mag} strokeWidth={6} />
        <g transform={`rotate(${(ang * 180) / Math.PI})`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={0} y1={0} x2={Math.cos((i * Math.PI) / 3) * 122} y2={Math.sin((i * Math.PI) / 3) * 122} stroke={C.mag} strokeWidth={4} opacity={0.8} />
          ))}
        </g>
        <circle r={9} fill={C.mag} />
      </g>
      <circle cx={pinX} cy={pinY} r={9} fill={C.white} opacity={seg(t, 1.0, 1.6)} />
      {/* heat dots flowing in */}
      {Array.from({ length: 8 }, (_, i) => {
        const u = (t * 0.5 + i / 8) % 1;
        const x = u < 0.5 ? lerp(330, 560, u * 2) : lerp(700, 790, (u - 0.5) * 2);
        const y = u < 0.5 ? lerp(520, 480, u * 2) : 480;
        return <circle key={i} cx={x} cy={y} r={7} fill={C.org} opacity={seg(t, 1.2, 1.8) * 0.9} />;
      })}
      {/* lost heat */}
      {Array.from({ length: 12 }, (_, i) => {
        const u = (t * 0.45 + i / 12) % 1;
        const x = 470 + ((i * 53) % 220) + Math.sin(u * 9 + i) * 20;
        const y = 400 - u * 240;
        return <circle key={i} cx={x} cy={y} r={7 * (1 - u * 0.6)} fill={C.red} opacity={lost * (1 - u)} />;
      })}
      <Tag x={570} y={190} text="lost heat" color={C.red} o={seg(t, 4.2, 4.8)} size={28} />
      <T x={295} y={670} size={30} color={C.org} weight={500} o={p} spacing={4}>
        HEAT IN
      </T>
      <T x={1260} y={670} size={30} color={C.mag} weight={500} o={p} spacing={4}>
        MOTION OUT
      </T>
      <g opacity={seg(t, 1.9, 2.5)}>
        <T x={800} y={770} size={46} color={C.white} weight={500}>
          100% of the heat → 100% motion?
        </T>
        <XMark x={1290} y={758} p={seg(t, 3.2, 3.7, E.back)} size={22} sw={8} />
      </g>
      <T x={800} y={835} size={44} color={C.red} weight={700} o={seg(t, 4.6, 5.3)}>
        some heat always slips away
      </T>
    </g>
  );
};

/* ───────────────────────── O · 1:19 magnifier / clue ───────────────────────── */
export const SceneClue = ({ t }: SceneProps) => {
  const mx = lerp(240, 800, seg(t, 0.2, 1.4, E.inOut));
  const pulse = 1 + Math.sin(t * 9) * 0.2;
  const ring = seg(t, 2.2, 3.4, E.out);
  const bits = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 70 }, () => ({ a: r() * Math.PI * 2, d: 150 + r() * 650, s: 1.5 + r() * 3.5 }));
  }, []);
  return (
    <g>
      <defs>
        <clipPath id="lensClip">
          <circle cx={mx} cy={430} r={122} />
        </clipPath>
      </defs>
      {bits.map((b, i) => (
        <circle key={i} cx={800 + Math.cos(b.a) * b.d * ring} cy={430 + Math.sin(b.a) * b.d * ring * 0.65} r={b.s} fill={mix(C.org, C.pur, i / 70)} opacity={ring * (1 - ring * 0.35)} />
      ))}
      <circle cx={800} cy={430} r={7 * pulse} fill={C.org} />
      <circle cx={800} cy={430} r={26 * pulse} fill={C.org} opacity={0.15} />
      <g clipPath="url(#lensClip)">
        <circle cx={mx} cy={430} r={122} fill="rgba(34,229,255,.08)" />
        <g transform={`translate(${mx} 430) scale(5) translate(${-800} ${-430})`}>
          <circle cx={800} cy={430} r={7 * pulse} fill={C.org} />
        </g>
      </g>
      <circle cx={mx} cy={430} r={126} fill="none" stroke={C.cyan} strokeWidth={9} />
      <path d={`M${mx + 89} ${430 + 89} L${mx + 190} ${430 + 190}`} stroke={C.cyan} strokeWidth={18} strokeLinecap="round" />
      <T x={800} y={760} size={130} color={C.yel} weight={900} o={seg(t, 1.2, 1.8)} spacing={8}>
        A CLUE
      </T>
      <T x={800} y={840} size={44} color={C.white} weight={300} o={seg(t, 2.3, 2.8)} spacing={2}>
        {typed('to something much bigger…', seg(t, 2.3, 3.3, E.lin))}
      </T>
    </g>
  );
};

/* ───────────────────────── P · 1:22 four consequences ───────────────────────── */
export const SceneConsequences = ({ t }: SceneProps) => {
  const at = [0.7, 3.5, 5.2, 7.3];
  const xs = [100, 480, 860, 1240];
  const cols = [C.cyan, C.org, C.yel, C.pur];
  const labels = ['Engines can never be perfect', 'Your phone gets warm', 'Stars burn out', 'The universe will end'];
  const pp = (i: number) => seg(t, at[i], at[i] + 0.7);
  const starK = seg(t, at[2] + 0.6, at[2] + 2.0, E.inOut);
  const uniK = seg(t, at[3] + 0.5, at[3] + 1.7, E.inOut);
  return (
    <g>
      <G x={800} y={140} s={lerp(0.5, 1, seg(t, 0, 0.6, E.back))} o={seg(t, 0, 0.4)}>
        <T x={0} y={0} size={100} color={C.yel} weight={900} mono>
          ΔS ≥ 0
        </T>
      </G>
      {xs.map((x, i) => (
        <path key={i} d={`M800 190 L${x + 160} 300`} stroke={cols[i]} strokeWidth={3} opacity={0.7} {...draw(seg(t, at[i] - 0.3, at[i] + 0.3))} />
      ))}
      {xs.map((x, i) => (
        <g key={i}>
          <Panel x={x} y={300} w={320} h={380} color={cols[i]} p={pp(i)} />
          <T x={x + 160} y={735} size={30} color={cols[i]} weight={500} o={pp(i)}>
            {labels[i]}
          </T>
        </g>
      ))}
      {/* engine */}
      <g transform="translate(1 0)" opacity={pp(0)}>
        <g transform={`translate(${xs[0] + 160} 440) rotate(${t * 60})`}>
          <circle r={50} fill="none" stroke={C.cyan} strokeWidth={14} strokeDasharray="14 14" />
          <circle r={40} fill="none" stroke={C.cyan} strokeWidth={5} />
          <circle r={12} fill={C.cyan} />
        </g>
        <rect x={xs[0] + 40} y={560} width={240} height={22} rx={11} fill="none" stroke={C.dim} strokeWidth={3} />
        <rect x={xs[0] + 40} y={560} width={Math.max(0.01, 240 * 0.72 * seg(t, at[0] + 0.5, at[0] + 1.8))} height={22} rx={11} fill={C.cyan} />
        <path d={`M${xs[0] + 280} 548 V594`} stroke={C.red} strokeWidth={5} />
        <T x={xs[0] + 160} y={625} size={26} color={C.red} weight={500} o={seg(t, at[0] + 1.3, at[0] + 1.9)}>
          never 100%
        </T>
      </g>
      {/* phone */}
      <g opacity={pp(1)}>
        <rect x={xs[1] + 105} y={360} width={110} height={220} rx={20} fill={mix('#0a0f22', C.org, 0.22 * seg(t, at[1] + 0.6, at[1] + 2))} stroke={C.org} strokeWidth={5} />
        <rect x={xs[1] + 118} y={378} width={84} height={170} rx={8} fill="none" stroke={C.org} strokeWidth={2} opacity={0.6} />
        <circle cx={xs[1] + 160} cy={565} r={6} fill={C.org} />
        {[-50, 0, 50].map((dx, i) => (
          <path key={i} d={`M${xs[1] + 160 + dx} 345 q 14 -22 0 -44 t 0 -44`} fill="none" stroke={C.org} strokeWidth={4} strokeLinecap="round" strokeDasharray="14 12" strokeDashoffset={-t * 40 - i * 7} opacity={seg(t, at[1] + 0.6, at[1] + 1.4)} />
        ))}
      </g>
      {/* star */}
      <g opacity={pp(2)} transform={`translate(${xs[2] + 160} 470)`}>
        <circle r={lerp(95, 28, starK)} fill={mix(C.yel, '#552222', starK)} opacity={0.18 + Math.sin(t * 6) * 0.03} />
        <circle r={lerp(52, 16, starK)} fill="none" stroke={mix(C.yel, '#775555', starK)} strokeWidth={6} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + t * 0.2;
          const r1 = lerp(66, 28, starK);
          const r2 = lerp(120, 40, starK) * (i % 2 ? 0.8 : 1);
          return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke={mix(C.yel, '#775555', starK)} strokeWidth={4} strokeLinecap="round" opacity={1 - starK * 0.7} />;
        })}
      </g>
      {/* universe */}
      <g opacity={pp(3)} transform={`translate(${xs[3] + 160} 470)`}>
        {[40, 80, 120].map((r, i) => (
          <circle key={i} r={r * (1 + uniK * 0.3)} fill="none" stroke={C.pur} strokeWidth={3.5} opacity={(1 - uniK * 0.85) * (1 - i * 0.2)} strokeDasharray={i === 1 ? '6 10' : undefined} />
        ))}
        {Array.from({ length: 26 }, (_, i) => {
          const a = i * 2.399;
          const d = 18 + (i % 9) * 11 + uniK * 40 * ((i % 5) + 1);
          return <circle key={i} cx={Math.cos(a) * d} cy={Math.sin(a) * d * 0.9} r={3 * (1 - uniK * 0.4)} fill={C.pur} opacity={1 - uniK * 0.85} />;
        })}
        <circle r={7} fill={C.white} opacity={1 - uniK} />
      </g>
    </g>
  );
};

/* ───────────────────────── Q · 1:31 ENTROPY wordmark ───────────────────────── */
export const SceneWordmark = ({ t }: SceneProps) => {
  const word = 'ENTROPY';
  const dis = 'disorder'.split('');
  const grid = (t * 60) % 60;
  return (
    <g>
      <g opacity={0.35 * seg(t, 0, 1)} stroke={C.pur} strokeWidth={1.5}>
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={`h${i}`} x={0} y={560 + (i * 60 + grid) * 0.62 + i * 10} width={1600} height={1.5} fill={C.pur} stroke="none" opacity={0.4} />
        ))}
        {Array.from({ length: 21 }, (_, i) => (
          <line key={`v${i}`} x1={800 + (i - 10) * 40} y1={560} x2={800 + (i - 10) * 260} y2={900} />
        ))}
      </g>
      {word.split('').map((ch, i) => {
        const p = seg(t, 0.1 + i * 0.09, 0.7 + i * 0.09, E.back);
        return (
          <T key={i} x={800 + (i - 3) * 150} y={lerp(420, 340, p)} size={200} color={mix(C.cyan, C.mag, i / 6)} weight={900} o={p}>
            {ch}
          </T>
        );
      })}
      <T x={800} y={445} size={46} color={C.white} weight={300} o={seg(t, 1.6, 2.2)} spacing={3}>
        {typed('to understand the universe…', seg(t, 1.6, 2.6, E.lin))}
      </T>
      <T x={800} y={510} size={56} color={C.cyan} weight={700} o={seg(t, 2.6, 3.2)}>
        we need to understand entropy.
      </T>
      <T x={800} y={720} size={36} color={C.white} weight={300} o={seg(t, 3.7, 4.2)} spacing={3}>
        FIRST, UNLEARN THE IDEA WE WERE TAUGHT
      </T>
      <g>
        {dis.map((ch, i) => {
          const k = seg(t, 4.6 + i * 0.05, 5.6 + i * 0.05, E.in);
          const x = 800 + (i - 3.5) * 52;
          return (
            <g key={i} transform={`translate(${x + (i - 3.5) * 14 * k} ${810 + 260 * k}) rotate(${(i % 2 ? 1 : -1) * 60 * k})`} opacity={seg(t, 3.9, 4.3) * (1 - k * 0.6)}>
              <T x={0} y={0} size={72} color={C.org} weight={700}>
                {ch}
              </T>
            </g>
          );
        })}
        <path d="M580 785 H1020" stroke={C.red} strokeWidth={8} strokeLinecap="round" {...draw(seg(t, 4.2, 4.7))} opacity={1 - seg(t, 4.8, 5.4)} />
      </g>
      <circle cx={800} cy={450} r={lerp(0, 900, seg(t, 0, 1.2, E.out))} fill="none" stroke={C.cyan} strokeWidth={3} opacity={(1 - seg(t, 0, 1.2)) * 0.6} />
    </g>
  );
};

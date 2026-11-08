import { useMemo } from 'react';
import { C, E, draw, lerp, rng, seg, tri } from '../lib/anim';
import { G, Panel, SceneTitle, T, Tag, XMark, typed, type SceneProps } from './kit';

/* ───────────────────────── H · 0:36 S = k log W + bars ───────────────────────── */
export const SceneFormula = ({ t }: SceneProps) => {
  const eq = seg(t, 2.0, 3.0, E.back);
  const most = seg(t, 3.0, 4.6, E.out) * 0.62;
  const you = seg(t, 3.8, 5.8, E.inOut);
  const bars = [
    { y: 590, label: 'most people who studied it in school', v: most, c: C.yel },
    { y: 700, label: 'you, at the end of this video', v: you, c: C.cyan },
  ];
  return (
    <g>
      <SceneTitle text="By the end of this video…" p={seg(t, 0, 1.2, E.lin)} y={120} size={58} />
      <G x={800} y={380} s={lerp(0.5, 1, eq)} o={eq}>
        <text textAnchor="middle" fontSize={170} fontWeight={900} fontFamily="Outfit, sans-serif">
          <tspan fill={C.cyan}>S</tspan>
          <tspan fill={C.white}> = </tspan>
          <tspan fill={C.yel}>k</tspan>
          <tspan fill={C.white}> log </tspan>
          <tspan fill={C.mag}>W</tspan>
        </text>
      </G>
      <T x={800} y={455} size={30} color={C.white} weight={300} o={seg(t, 2.6, 3.2)} spacing={4}>
        ENTROPY, IN ONE LINE
      </T>
      {bars.map((b, i) => (
        <g key={i} opacity={seg(t, 2.8 + i * 0.5, 3.4 + i * 0.5)}>
          <T x={300} y={b.y - 20} size={30} color={b.c} anchor="start" weight={500}>
            {b.label}
          </T>
          <rect x={300} y={b.y} width={1000} height={28} rx={14} fill="none" stroke={C.dim} strokeWidth={3} />
          <rect x={300} y={b.y} width={Math.max(0.01, 1000 * b.v)} height={28} rx={14} fill={b.c} />
          <T x={1335} y={b.y + 24} size={32} color={b.c} anchor="start" weight={700} mono>
            {Math.round(b.v * 100)}%
          </T>
        </g>
      ))}
      <G x={800} y={800} s={lerp(0.4, 1, seg(t, 5.7, 6.3, E.back))} o={seg(t, 5.7, 6.1)}>
        <T x={0} y={0} size={72} fill="url(#gradEntropy)" weight={900} spacing={3}>
          Let's start.
        </T>
      </G>
    </g>
  );
};

/* ───────────────────────── I · 0:43 textbook ───────────────────────── */
export const SceneTextbook = ({ t }: SceneProps) => {
  const books = useMemo(() => {
    const r = rng(33);
    let x = 260;
    return Array.from({ length: 12 }, (_, i) => {
      const w = 44 + r() * 34;
      const h = 170 + r() * 90;
      const b = { x, w, h, c: [C.cyan, C.mag, C.yel, C.grn, C.pur, C.org][i % 6] };
      x += w + 8;
      return b;
    });
  }, []);
  const shelf = 1 - seg(t, 1.5, 2.1);
  const book = seg(t, 1.9, 2.6);
  const burst = seg(t, 3.5, 4.4, E.inOut);
  return (
    <g>
      <SceneTitle text="Why this matters" p={seg(t, 0, 0.7, E.lin)} y={115} />
      <g opacity={shelf}>
        <path d="M230 600 H1370" stroke={C.dim} strokeWidth={5} strokeLinecap="round" {...draw(seg(t, 0.2, 1))} />
        {books.map((b, i) => {
          const p = seg(t, 0.4 + i * 0.07, 0.9 + i * 0.07);
          const hot = i === 5;
          return (
            <g key={i}>
              <rect x={b.x} y={600 - b.h * p} width={b.w} height={b.h * p} rx={4} fill={hot ? C.cyan : 'none'} fillOpacity={0.15} stroke={hot ? C.cyan : b.c} strokeWidth={hot ? 5 : 3} opacity={hot ? 1 : 0.65} />
            </g>
          );
        })}
        <T x={books[5].x + books[5].w / 2} y={470} size={24} color={C.cyan} weight={700} spacing={3} o={seg(t, 1, 1.5)}>
          PHYSICS
        </T>
      </g>
      <g opacity={book * (1 - burst * 0.85)}>
        <Panel x={480} y={230} w={310} h={430} color={C.cyan} p={book} r={10} />
        <Panel x={810} y={230} w={310} h={430} color={C.cyan} p={book} r={10} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <g key={i}>
            <path d={`M515 ${280 + i * 36} H${i % 3 === 2 ? 650 : 755}`} stroke={C.dim} strokeWidth={5} strokeLinecap="round" />
            <path d={`M845 ${280 + i * 36} H${i % 4 === 3 ? 990 : 1085}`} stroke={C.dim} strokeWidth={5} strokeLinecap="round" opacity={i > 5 ? 0 : 1} />
          </g>
        ))}
      </g>
      <T x={lerp(960, 800, burst)} y={lerp(625, 450, burst)} size={lerp(30, 220, burst)} color={C.yel} weight={900} o={seg(t, 2.4, 2.9)} mono>
        ΔS ≥ 0
      </T>
      <Tag x={960} y={700} text="tucked away in a textbook" color={C.org} o={seg(t, 2.8, 3.3) * (1 - burst)} size={26} />
      <T x={800} y={760} size={64} color={C.white} weight={700} o={seg(t, 4.3, 4.9)}>
        not a <tspan fill={C.yel}>small</tspan> rule.
      </T>
    </g>
  );
};

/* ───────────────────────── J · 0:48 almost unbreakable ───────────────────────── */
export const SceneUnbreakable = ({ t }: SceneProps) => {
  const laws = ['F = ma', 'E = mc²', 'PV = nRT', 'V = IR', 'p = mv', 'F = kx'];
  const lockP = seg(t, 1.9, 2.8);
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${i === 0 ? 'M' : 'L'}${Math.cos(a) * 210} ${Math.sin(a) * 210}`;
  }).join(' ') + ' Z';
  return (
    <g>
      <SceneTitle text="One of the few laws…" p={seg(t, 0, 0.7, E.lin)} y={110} size={56} />
      {laws.map((l, i) => {
        const a = (i / laws.length) * Math.PI * 2 + t * 0.35;
        const p = seg(t, 0.3 + i * 0.12, 0.9 + i * 0.12, E.back);
        const dim = lerp(1, 0.35, seg(t, 1.9, 2.6));
        const x = 800 + Math.cos(a) * 520;
        const y = 470 + Math.sin(a) * 250;
        return (
          <g key={i} opacity={p * dim}>
            <rect x={x - 90} y={y - 30} width={180} height={60} rx={14} fill="rgba(8,12,28,.8)" stroke={[C.cyan, C.mag, C.grn, C.pur, C.org, C.yel][i]} strokeWidth={3} />
            <T x={x} y={y + 11} size={30} color={C.white} weight={500} mono>
              {l}
            </T>
          </g>
        );
      })}
      <G x={800} y={470} s={lerp(0.3, 1, seg(t, 0.9, 1.6, E.back))} o={seg(t, 0.9, 1.4)}>
        <circle r={150 + Math.sin(t * 4) * 5} fill={C.yel} opacity={0.08} />
        <T x={0} y={35} size={120} color={C.yel} weight={900} mono>
          ΔS ≥ 0
        </T>
        <path d={hex} fill="none" stroke={C.yel} strokeWidth={6} strokeLinejoin="round" {...draw(lockP)} />
      </G>
      <g transform="translate(800 190)" opacity={lockP}>
        <path d="M-26 -8 V-30 A26 26 0 0 1 26 -30 V-8" fill="none" stroke={C.yel} strokeWidth={7} strokeLinecap="round" />
        <rect x={-38} y={-8} width={76} height={58} rx={10} fill="rgba(255,225,74,.15)" stroke={C.yel} strokeWidth={6} />
        <circle cx={0} cy={20} r={7} fill={C.yel} />
      </g>
      <T x={800} y={810} size={64} color={C.white} weight={700} o={seg(t, 2.9, 3.6)}>
        almost <tspan fill={C.yel}>unbreakable</tspan>
      </T>
    </g>
  );
};

/* ───────────────────────── K · 0:52 Eddington ───────────────────────── */
export const SceneEddington = ({ t }: SceneProps) => {
  const stars = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 80 }, () => ({ x: r() * 1600, y: r() * 900, s: 1 + r() * 2.4, ph: r() * 6, sp: 1 + r() * 3 }));
  }, []);
  const lines = ['“If your theory goes', 'against this law,', 'there is no hope for it.”'];
  const total = lines.join('').length;
  let shown = Math.round(total * seg(t, 2.3, 5.2, E.lin));
  const tp = seg(t, 0, 1.5);
  const aim = seg(t, 0.2, 2, E.inOut);
  return (
    <g>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill={C.white} opacity={0.2 + 0.6 * tri(t * s.sp * 0.3 + s.ph)} />
      ))}
      <g transform="translate(330 600)">
        <path d="M70 0 L-20 250 M70 0 L70 250 M70 0 L160 250" fill="none" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" {...draw(tp)} />
        <g transform={`translate(70 0) rotate(${lerp(-5, -32, aim)})`}>
          <rect x={-60} y={-36} width={330} height={72} rx={12} fill="rgba(34,229,255,.12)" stroke={C.cyan} strokeWidth={5} {...draw(tp)} />
          <rect x={270} y={-46} width={44} height={92} rx={8} fill="none" stroke={C.cyan} strokeWidth={5} {...draw(tp)} />
          <rect x={-100} y={-16} width={40} height={32} rx={6} fill="none" stroke={C.cyan} strokeWidth={5} {...draw(tp)} />
        </g>
        <circle cx={70} cy={0} r={14} fill={C.cyan} opacity={tp} />
      </g>
      <T x={1000} y={200} size={80} color={C.cyan} weight={700} o={seg(t, 0.8, 1.2)}>
        {typed('Arthur Eddington', seg(t, 0.8, 1.9, E.lin))}
      </T>
      <T x={1000} y={252} size={30} color={C.white} weight={300} o={seg(t, 1.6, 2.2)} spacing={3}>
        ASTRONOMER · 1882–1944
      </T>
      <Panel x={720} y={320} w={740} h={290} color={C.mag} p={seg(t, 1.8, 2.6)} />
      {lines.map((ln, i) => {
        const take = Math.max(0, Math.min(ln.length, shown));
        shown -= ln.length;
        return (
          <T key={i} x={760} y={420 + i * 76} size={50} anchor="start" italic weight={500} color={C.white}>
            {ln.slice(0, take)}
          </T>
        );
      })}
      <g opacity={seg(t, 4.9, 5.5)}>
        <rect x={870} y={690} width={260} height={74} rx={14} fill="none" stroke={C.red} strokeWidth={4} />
        <T x={1000} y={738} size={34} color={C.red} weight={500} spacing={2}>
          YOUR THEORY
        </T>
        <XMark x={1130} y={690} p={seg(t, 5.2, 5.8, E.back)} size={22} sw={8} />
      </g>
    </g>
  );
};

/* ───────────────────────── L · 0:59 closed system ───────────────────────── */
export const SceneClosedSystem = ({ t }: SceneProps) => {
  const dots = [
    { c: C.cyan, a: 0.9, b: 0.7, p: 0 },
    { c: C.mag, a: 0.7, b: 1.1, p: 1 },
    { c: C.yel, a: 1.3, b: 0.8, p: 2 },
    { c: C.grn, a: 0.6, b: 0.5, p: 3 },
    { c: C.org, a: 1.1, b: 1.3, p: 4 },
    { c: C.pur, a: 0.8, b: 0.9, p: 5 },
  ];
  const bp = seg(t, 0.5, 1.2);
  const axes = seg(t, 1.2, 2);
  const mix1 = seg(t, 3.7, 5.4, E.inOut);
  return (
    <g>
      <SceneTitle text="In a closed system, total entropy never decreases." p={seg(t, 0.2, 3.8, E.lin)} y={110} size={44} />
      <Panel x={150} y={260} w={500} h={400} color={C.cyan} p={bp} />
      <rect x={162} y={272} width={476} height={376} rx={10} fill="none" stroke={C.cyan} strokeWidth={1.5} opacity={0.4 * bp} />
      {dots.map((d, i) => (
        <circle key={i} cx={185 + tri(t * d.a + d.p * 0.37) * 430} cy={295 + tri(t * d.b + d.p * 0.53) * 330} r={12} fill={d.c} opacity={bp} />
      ))}
      <Tag x={400} y={245} text="CLOSED SYSTEM — nothing gets in or out" color={C.cyan} o={seg(t, 0.9, 1.5)} size={24} />
      <g opacity={axes}>
        <path d="M850 280 V660 H1470" fill="none" stroke={C.white} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <g transform="rotate(-90 805 470)">
          <T x={805} y={470} size={28} color={C.white} weight={500}>
            ENTROPY
          </T>
        </g>
        <T x={1470} y={705} size={28} color={C.white} weight={500} anchor="end">
          TIME
        </T>
      </g>
      {/* forbidden: going down */}
      <path d="M870 400 L1440 600" fill="none" stroke={C.red} strokeWidth={6} strokeDasharray="14 12" strokeLinecap="round" opacity={seg(t, 2.8, 3.2) * (1 - seg(t, 3.6, 4.0) * 0.55)} />
      <XMark x={1150} y={500} p={seg(t, 3.0, 3.5, E.back)} size={30} sw={9} />
      <T x={1150} y={565} size={30} color={C.red} weight={500} o={seg(t, 3.2, 3.7)} anchor="middle">
        never goes down
      </T>
      {/* allowed: same or up */}
      <path d="M870 560 H1090 C1200 560 1260 470 1440 320" fill="none" stroke={C.grn} strokeWidth={7} strokeLinecap="round" {...draw(mix1)} />
      <T x={980} y={600} size={28} color={C.grn} weight={500} o={seg(t, 4.0, 4.4)}>
        stays the same…
      </T>
      <T x={1330} y={290} size={28} color={C.grn} weight={500} o={seg(t, 4.8, 5.2)}>
        …or goes up
      </T>
      <G x={800} y={805} s={lerp(0.5, 1, seg(t, 5.4, 6.0, E.back))} o={seg(t, 5.4, 5.8)}>
        <T x={0} y={0} size={110} color={C.yel} weight={900} mono>
          ΔS ≥ 0
        </T>
      </G>
      <T x={800} y={860} size={30} color={C.white} weight={300} spacing={5} o={seg(t, 6.3, 6.9)}>
        ONE SIMPLE SENTENCE
      </T>
    </g>
  );
};

/* ───────────────────────── M · 1:06 Clausius 1865 ───────────────────────── */
export const SceneClausius = ({ t }: SceneProps) => {
  const year = Math.round(lerp(1800, 1865, seg(t, 0.8, 2.6, E.out)));
  const mk = lerp(200, 200 + 0.65 * 1200, seg(t, 0.8, 2.6, E.out));
  return (
    <g>
      <G x={800} y={230} s={lerp(0.6, 1, seg(t, 0, 0.7, E.back))} o={seg(t, 0, 0.5)}>
        <T x={0} y={0} size={170} color={C.cyan} weight={900}>
          entropy
        </T>
      </G>
      <T x={800} y={310} size={34} color={C.white} weight={300} spacing={5} o={seg(t, 0.4, 1)}>
        THE WORD WAS INVENTED IN
      </T>
      <path d="M200 640 H1400" stroke={C.dim} strokeWidth={4} strokeLinecap="round" {...draw(seg(t, 0.3, 1))} />
      {Array.from({ length: 13 }, (_, i) => (
        <path key={i} d={`M${200 + i * 100} 628 V652`} stroke={C.dim} strokeWidth={3} opacity={seg(t, 0.4 + i * 0.03, 0.9)} />
      ))}
      <circle cx={mk} cy={640} r={14} fill={C.yel} />
      <T x={800} y={520} size={200} color={C.yel} weight={900} mono o={seg(t, 0.6, 1.1)}>
        {year}
      </T>
      <T x={800} y={745} size={84} color={C.white} weight={700} o={seg(t, 2.4, 2.9)}>
        {typed('Rudolf Clausius', seg(t, 2.4, 3.4, E.lin))}
      </T>
      <T x={800} y={800} size={30} color={C.mag} weight={500} spacing={5} o={seg(t, 3.4, 4)}>
        GERMAN PHYSICIST
      </T>
      <circle cx={800} cy={520} r={lerp(180, 520, seg(t, 2.6, 4.6))} fill="none" stroke={C.yel} strokeWidth={3} opacity={(1 - seg(t, 2.6, 4.6)) * 0.5 * seg(t, 2.6, 2.7)} />
    </g>
  );
};

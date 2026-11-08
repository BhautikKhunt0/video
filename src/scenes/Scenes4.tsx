import { useMemo } from 'react';
import { C, E, clamp, draw, lerp, mix, rng, seg } from '../lib/anim';
import { Check, G, Panel, Person, T, Tag, XMark, typed, type SceneProps } from './kit';

const SHIRT = 'M-30 -20 L-14 -32 Q0 -20 14 -32 L30 -20 L44 2 L24 12 L24 42 H-24 V12 L-44 2 Z';
const PANTS = 'M-22 -34 H22 L30 44 H10 L0 -2 L-10 44 H-30 Z';
const SOCK = 'M-10 -34 H12 V8 L32 28 Q26 46 10 38 L-10 18 Z';
const CLOTH = [SHIRT, PANTS, SOCK];

/* ───────────────────────── R · 1:37 bedroom — Day 1 → Day 7 ───────────────────────── */
export const SceneBedroom = ({ t }: SceneProps) => {
  const shelfBooks = useMemo(() => {
    const out: { x: number; y: number; h: number; c: string; i: number }[] = [];
    const r = rng(41);
    let id = 0;
    [330, 440, 550].forEach((base) => {
      let x = 198;
      for (let k = 0; k < 7; k++) {
        const h = 56 + r() * 26;
        out.push({ x, y: base - h, h, c: [C.cyan, C.mag, C.yel, C.grn, C.pur, C.org][(k + id) % 6], i: id++ });
        x += 25;
      }
    });
    return out;
  }, []);
  const clothes = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 9 }, (_, i) => ({ x: 220 + r() * 1000, rot: (r() - 0.5) * 140, c: [C.cyan, C.mag, C.yel, C.grn, C.org][i % 5], shape: CLOTH[i % 3], onBed: i === 2 || i === 6 }));
  }, []);
  const rm = (a: number) => seg(t, a, a + 0.7);
  const dayF = seg(t, 4.4, 10.6, (x) => x) * 6;
  const day = 1 + Math.min(6, Math.floor(dayF));
  const pulse = 1 + 0.25 * (1 - (dayF % 1)) * (day > 1 ? 1 : 0);
  const level = seg(t, 5.8, 12.4, E.inOut);
  const mess = seg(t, 6.8, 9.2);
  const fall = (i: number) => seg(t, 6.9 + i * 0.22, 7.8 + i * 0.22, E.bounce);
  return (
    <g>
      {/* room */}
      <Panel x={140} y={190} w={1120} h={530} color={C.dim} p={rm(0.1)} sw={3} r={10} />
      <path d="M140 700 H1260" stroke={C.cyan} strokeWidth={4} {...draw(rm(0.3))} />
      {/* window */}
      <g opacity={rm(0.8)}>
        <rect x={960} y={250} width={200} height={190} rx={6} fill="none" stroke={C.pur} strokeWidth={4} />
        <path d="M1060 250 V440 M960 345 H1160" stroke={C.pur} strokeWidth={3} />
        <circle cx={1100} cy={300} r={22} fill="none" stroke={C.yel} strokeWidth={4} />
      </g>
      {/* shelf */}
      <g opacity={rm(0.5)}>
        <rect x={180} y={240} width={220} height={460} rx={4} fill="none" stroke={C.cyan} strokeWidth={4} />
        {[330, 440, 550].map((y) => (
          <path key={y} d={`M180 ${y} H400`} stroke={C.cyan} strokeWidth={3} />
        ))}
        {shelfBooks.map((b) => {
          const fallIdx = [3, 5, 9, 12, 16, 19].indexOf(b.i);
          const k = fallIdx >= 0 ? seg(t, 8.9 + fallIdx * 0.22, 9.7 + fallIdx * 0.22, E.bounce) : 0;
          const tx = 430 + fallIdx * 30;
          const ty = 700 - 22 - (fallIdx % 3) * 20;
          const x = lerp(b.x, tx, k);
          const y = lerp(b.y, ty - b.h * 0.3, k);
          return <rect key={b.i} x={0} y={0} width={20} height={b.h} rx={2} fill="none" stroke={b.c} strokeWidth={3} transform={`translate(${x} ${y}) rotate(${k * (fallIdx % 2 ? 78 : -86)} 10 ${b.h / 2})`} />;
        })}
      </g>
      {/* bed */}
      <g opacity={rm(0.9)} fill="none" stroke={C.mag} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
        <rect x={500} y={440} width={26} height={200} rx={4} />
        <rect x={500} y={560} width={400} height={50} rx={6} />
        <path d="M520 610 V700 M880 610 V700" />
        <rect x={535} y={520} width={110} height={36} rx={16} stroke={C.cyan} />
        <path d={`M655 530 H700 Q 760 ${530 - 28 * mess} 810 ${540 + 8 * mess} T 890 ${528 - 8 * mess} V ${562 + 52 * mess} H655 Z`} fill="rgba(255,61,242,.12)" />
      </g>
      {/* nightstand + lamp */}
      <g opacity={rm(1.2)} fill="none" stroke={C.yel} strokeWidth={4} strokeLinejoin="round">
        <rect x={960} y={600} width={120} height={100} rx={4} />
        <path d="M960 650 H1080" />
        <path d="M1020 600 V560 M990 560 L1000 520 H1040 L1050 560 Z" />
        <circle cx={1020} cy={545} r={55} fill={C.yel} fillOpacity={0.06} stroke="none" />
      </g>
      {/* clothes falling */}
      {clothes.map((c, i) => {
        const k = fall(i);
        const floorY = c.onBed ? 520 : 678;
        const x = c.onBed ? 700 + (i === 2 ? 0 : 120) : c.x;
        const y = lerp(130, floorY, k);
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${c.rot * k}) scale(0.9)`} opacity={k > 0.001 ? 1 : 0}>
            <path d={c.shape} fill={c.c} fillOpacity={0.18} stroke={c.c} strokeWidth={4} strokeLinejoin="round" />
          </g>
        );
      })}
      {/* HUD */}
      <G x={160} y={140} s={pulse} o={seg(t, 3.0, 3.6)}>
        <T x={0} y={0} size={60} color={C.yel} weight={700} anchor="start" mono>
          Day {day}
        </T>
      </G>
      <Tag x={760} y={150} text="freshly cleaned" color={C.grn} o={seg(t, 3.2, 3.7) * (1 - seg(t, 5.3, 5.8))} size={26} />
      <g opacity={seg(t, 3.4, 3.9) * (1 - seg(t, 5.3, 5.8))}>
        <Check x={940} y={150} p={seg(t, 3.5, 4.0)} size={18} />
      </g>
      <g opacity={rm(2.2)}>
        <rect x={1360} y={220} width={50} height={480} rx={25} fill="none" stroke={C.white} strokeWidth={4} />
        <rect x={1370} y={690 - 460 * level} width={30} height={Math.max(2, 460 * level)} rx={15} fill={mix(C.cyan, C.mag, level)} />
        <T x={1385} y={190} size={26} color={C.white} weight={500} spacing={2}>
          ENTROPY
        </T>
      </g>
      <T x={800} y={800} size={54} color={C.white} weight={700} o={seg(t, 10.7, 11.4)}>
        Nobody tried. <tspan fill={C.org}>It just happens.</tspan>
      </T>
    </g>
  );
};

/* ───────────────────────── S · 1:50 textbook says… ───────────────────────── */
export const SceneOrderDisorder = ({ t }: SceneProps) => {
  const dots = useMemo(() => {
    const r = rng(19);
    return Array.from({ length: 25 }, (_, i) => ({
      ox: 470 + (i % 5) * 62,
      oy: 330 + Math.floor(i / 5) * 56,
      dx: 860 + r() * 290,
      dy: 250 + r() * 330,
      ph: r() * 6,
    }));
  }, []);
  const bp = seg(t, 0.2, 1.0);
  const k = seg(t, 2.2, 4.0, E.inOut);
  return (
    <g>
      <T x={800} y={115} size={58} color={C.white} weight={700} o={seg(t, 0.2, 0.8)}>
        {typed('“That’s entropy.”', seg(t, 0.2, 1.3, E.lin))}
      </T>
      <Panel x={420} y={180} w={370} h={470} color={C.cyan} p={bp} r={10} />
      <Panel x={810} y={180} w={370} h={470} color={C.org} p={bp} r={10} />
      <T x={605} y={235} size={30} color={C.cyan} weight={700} spacing={5} o={bp}>
        ENTROPY
      </T>
      <T x={605} y={620} size={32} color={C.cyan} weight={500} o={seg(t, 1.2, 1.8)} spacing={3}>
        ORDER
      </T>
      <T x={995} y={620} size={32} color={C.org} weight={500} o={seg(t, 2.8, 3.4)} spacing={3}>
        DISORDER
      </T>
      {dots.map((d, i) => (
        <circle key={i} cx={lerp(d.ox, d.dx, k) + Math.sin(t * 4 + d.ph) * 3 * k} cy={lerp(d.oy, d.dy, k) + Math.cos(t * 3 + d.ph) * 3 * k} r={13} fill={mix(C.cyan, C.org, k)} opacity={seg(t, 0.8 + i * 0.01, 1.4)} />
      ))}
      <path d="M440 720 H1150" stroke={C.yel} strokeWidth={6} strokeLinecap="round" {...draw(seg(t, 2.0, 3.6, E.inOut))} />
      <path d="M1120 696 L1156 720 L1120 744" fill="none" stroke={C.yel} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" {...draw(seg(t, 3.4, 3.9))} />
      <T x={800} y={810} size={48} color={C.white} weight={500} o={seg(t, 3.3, 3.9)}>
        order <tspan fill={C.yel}>→</tspan> disorder
      </T>
    </g>
  );
};

/* ───────────────────────── T · 1:55 "messy is a human idea" ───────────────────────── */
export const SceneHumanIdea = ({ t }: SceneProps) => {
  const hp = seg(t, 0.3, 1.5);
  const bub = seg(t, 2.1, 2.8, E.back);
  return (
    <g>
      <G x={800} y={120} s={lerp(0.5, 1, seg(t, 0, 0.6, E.back))} o={seg(t, 0, 0.4)}>
        <text textAnchor="middle" fontSize={78} fontWeight={700} fontFamily="Outfit, sans-serif">
          <tspan fill={C.cyan}>entropy </tspan>
          <tspan fill={C.red}>≠ </tspan>
          <tspan fill={C.org}>disorder</tspan>
        </text>
      </G>
      <g stroke={C.cyan} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={1050} cy={470} r={150} {...draw(hp)} />
        <path d="M915 455 L880 505 L915 515" {...draw(hp)} />
        <path d="M1000 615 V720 M1115 610 V720 M900 800 Q1000 730 1000 720 M1115 720 Q1115 735 1200 800" {...draw(hp)} />
        <circle cx={985} cy={440} r={8} fill={C.cyan} />
      </g>
      {/* thought bubble */}
      <g opacity={seg(t, 1.9, 2.2)}>
        <circle cx={890} cy={350} r={10} fill="none" stroke={C.org} strokeWidth={4} />
        <circle cx={850} cy={310} r={16} fill="none" stroke={C.org} strokeWidth={4} />
        <circle cx={800} cy={265} r={22} fill="none" stroke={C.org} strokeWidth={4} />
      </g>
      <g transform={`translate(520 290) scale(${bub})`} opacity={bub}>
        <ellipse rx={270} ry={115} fill="rgba(255,138,61,.1)" stroke={C.org} strokeWidth={5} />
        <T x={0} y={34} size={100} color={C.org} weight={700} italic>
          “messy”
        </T>
      </g>
      <T x={560} y={640} size={40} color={C.grn} weight={500} o={seg(t, 0.4, 0.9) * (1 - seg(t, 1.5, 1.9))}>
        not completely wrong…
      </T>
      <T x={560} y={640} size={40} color={C.red} weight={500} o={seg(t, 1.6, 2.1) * (1 - seg(t, 2.8, 3.1))}>
        …but it creates a big problem
      </T>
      <T x={560} y={640} size={60} color={C.white} weight={700} o={seg(t, 3.0, 3.6)}>
        messy is a <tspan fill={C.mag}>human</tspan> idea.
      </T>
    </g>
  );
};

/* ───────────────────────── U · 1:59 chair + three viewpoints ───────────────────────── */
export const SceneChair = ({ t }: SceneProps) => {
  const cp = seg(t, 0.1, 0.9);
  const pile = [
    { x: 560, y: 505, rot: -10, c: C.cyan, s: CLOTH[0], at: 0.6 },
    { x: 620, y: 495, rot: 30, c: C.mag, s: CLOTH[1], at: 0.8 },
    { x: 520, y: 480, rot: 70, c: C.yel, s: CLOTH[0], at: 1.0 },
    { x: 470, y: 400, rot: 190, c: C.org, s: CLOTH[1], at: 1.2 },
    { x: 760, y: 676, rot: 80, c: C.grn, s: CLOTH[2], at: 1.4 },
  ];
  const cards = [
    { y: 300, who: 'You', ans: 'maybe…', c: C.cyan, at: 2.0, shake: 0 },
    { y: 450, who: 'Your mom', ans: 'DEFINITELY!', c: C.red, at: 3.4, shake: 1 },
    { y: 600, who: 'The clothes', ans: '∅  nothing', c: C.pur, at: 5.6, shake: 0 },
  ];
  return (
    <g>
      <g stroke={C.cyan} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={cp}>
        <rect x={420} y={530} width={300} height={28} rx={6} {...draw(cp)} />
        <path d="M434 530 V250 M706 530 V250 M434 250 H706 M434 300 H706 M434 350 H706" {...draw(cp)} />
        <path d="M440 558 V700 M700 558 V700 M470 558 V700" {...draw(cp)} />
        <path d="M380 700 H800" stroke={C.dim} {...draw(cp)} />
      </g>
      {pile.map((c, i) => {
        const k = seg(t, c.at, c.at + 0.8, E.bounce);
        return (
          <g key={i} transform={`translate(${c.x} ${lerp(80, c.y, k)}) rotate(${c.rot * k}) scale(1.35)`} opacity={k > 0.001 ? 1 : 0}>
            <path d={c.s} fill={c.c} fillOpacity={0.2} stroke={c.c} strokeWidth={3.5} strokeLinejoin="round" />
          </g>
        );
      })}
      <G x={560} y={160} s={lerp(0.4, 1, seg(t, 1.3, 2.0, E.elastic))} o={seg(t, 1.3, 1.7)}>
        <T x={0} y={0} size={120} color={C.yel} weight={900}>
          messy?
        </T>
      </G>
      {cards.map((c, i) => {
        const p = seg(t, c.at, c.at + 0.6, E.back);
        const sh = c.shake * Math.sin(t * 50) * 3 * seg(t, c.at + 0.6, c.at + 0.7) * (1 - seg(t, c.at + 1.6, c.at + 2));
        return (
          <g key={i} transform={`translate(${sh} 0)`} opacity={clamp(p)}>
            <Panel x={900} y={c.y - 55} w={580} h={115} color={c.c} p={p} />
            <T x={935} y={c.y - 2} size={34} color={C.white} weight={300} anchor="start">
              {c.who}:
            </T>
            <T x={935} y={c.y + 42} size={46} color={c.c} weight={700} anchor="start" italic={i === 0}>
              {c.ans}
            </T>
            {i < 2 && <Person x={1410} y={c.y + 6} c={c.c} p={p} s={0.5} />}
            {i === 2 && <XMark x={1410} y={c.y + 4} p={seg(t, c.at + 0.5, c.at + 1.1, E.back)} size={20} sw={7} color={C.pur} />}
          </g>
        );
      })}
      <rect x={0} y={0} width={1600} height={900} fill="#000" opacity={seg(t, 7.7, 8.4, E.lin)} />
    </g>
  );
};

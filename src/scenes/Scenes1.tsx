import { useMemo } from 'react';
import { C, E, clamp, draw, lerp, mix, rng, seg, tri } from '../lib/anim';
import { sampleText } from '../lib/particles';
import { G, Panel, Person, SceneTitle, T, Tag, XMark, typed, type SceneProps } from './kit';

/* ───────────────────────── A · 0:00 "everyone gets it wrong" ───────────────────────── */
export const SceneWrong = ({ t }: SceneProps) => {
  const up = seg(t, 2.8, 3.7, E.inOut);
  const pop = seg(t, 0, 0.9, E.back);
  const groups = [
    { x: 300, at: 3.3, label: 'Students' },
    { x: 800, at: 5.0, label: 'Teachers' },
    { x: 1300, at: 6.7, label: 'Scientists' },
  ];
  const years = Math.round(100 * seg(t, 6.9, 9, E.out));
  return (
    <g>
      <G x={800} y={lerp(430, 120, up)} s={lerp(1, 0.4, up) * lerp(0.6, 1, pop)} o={pop}>
        <T x={0} y={0} size={170} fill="url(#gradEntropy)" weight={900} spacing={6}>
          ONE IDEA
        </T>
      </G>
      <T x={800} y={lerp(530, 190, up)} size={lerp(54, 34, up)} color={C.white} weight={300} o={seg(t, 0.6, 1.4)} spacing={2}>
        that almost everyone gets wrong
      </T>

      {groups.map((g, i) => {
        const p = seg(t, g.at, g.at + 0.9);
        const xp = seg(t, g.at + 0.5 + 0.15, g.at + 1.3, E.back);
        return (
          <g key={i}>
            {i === 0 &&
              [-95, 0, 95].map((dx, k) => {
                const xk = seg(t, g.at + 0.6 + k * 0.18, g.at + 1.3 + k * 0.18, E.back);
                return (
                  <g key={k}>
                    <Person x={g.x + dx} y={470} c={C.cyan} p={p} s={0.95} />
                    <path d={`M${g.x + dx - 38} 505 H${g.x + dx + 38}`} stroke={C.cyan} strokeWidth={4} strokeLinecap="round" {...draw(p)} />
                    <XMark x={g.x + dx} y={355} p={xk} size={16} sw={6} />
                  </g>
                );
              })}
            {i === 1 && (
              <g>
                <Panel x={g.x - 190} y={300} w={380} h={200} color={C.grn} p={p} />
                <T x={g.x} y={380} size={44} color={C.grn} weight={500} o={p} mono>
                  {typed('Entropy = ???', seg(t, g.at + 0.3, g.at + 1.1, E.lin))}
                </T>
                <path d={`M${g.x - 160} 440 H${g.x + 20} M${g.x - 160} 470 H${g.x - 40}`} stroke={C.grn} strokeWidth={4} strokeLinecap="round" opacity={0.6} {...draw(p)} />
                <Person x={g.x - 250} y={470} c={C.yel} p={p} s={0.85} />
                <XMark x={g.x + 150} y={320} p={xp} size={20} sw={7} />
              </g>
            )}
            {i === 2 && (
              <g>
                <path
                  d="M-28 -90 V-30 L-82 56 Q-92 82 -64 82 H64 Q92 82 82 56 L28 -30 V-90 M-40 -90 H40"
                  transform={`translate(${g.x} 430) scale(1.15)`}
                  fill="none"
                  stroke={C.pur}
                  strokeWidth={5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  {...draw(p)}
                />
                <path d="M-60 50 Q0 30 60 50 L70 74 H-70 Z" transform={`translate(${g.x} 430) scale(1.15)`} fill={C.pur} opacity={0.35 * p} />
                {[0, 1, 2, 3].map((k) => (
                  <circle key={k} cx={g.x - 20 + k * 14} cy={420 - ((t * 60 + k * 30) % 110)} r={5 + (k % 2) * 3} fill="none" stroke={C.pur} strokeWidth={2.5} opacity={p * 0.8 * (1 - ((t * 60 + k * 30) % 110) / 110)} />
                ))}
                <T x={g.x} y={610} size={42} color={C.yel} weight={700} o={seg(t, g.at + 0.5, g.at + 1.2)}>
                  {years}+ years of debate
                </T>
                <XMark x={g.x + 100} y={330} p={xp} size={18} sw={7} />
              </g>
            )}
            <T x={g.x} y={690} size={34} color={C.white} weight={500} o={p} spacing={3}>
              {g.label.toUpperCase()}
            </T>
          </g>
        );
      })}
    </g>
  );
};

/* ───────────────────────── B · 0:10 particle "ENTROPY" ───────────────────────── */
export const SceneParticleWord = ({ t }: SceneProps) => {
  const parts = useMemo(() => {
    const pts = sampleText('ENTROPY', 1300, 300, '900 230px Outfit, Arial Black, sans-serif', 11);
    const r = rng(7);
    return pts.map(([x, y], i) => {
      const a = r() * Math.PI * 2;
      const rad = 450 + r() * 700;
      return {
        tx: x,
        ty: y,
        sx: Math.cos(a) * rad,
        sy: Math.sin(a) * rad * 0.6,
        delay: r() * 0.9,
        dx: (r() - 0.5) * 900,
        dy: (r() - 0.5) * 600,
        sz: 2.5 + r() * 3.2,
        k: x / 1300 + 0.5,
        sw: (r() - 0.5) * 2,
        i,
      };
    });
  }, []);
  const gone = seg(t, 1.9, 2.7, E.in);
  return (
    <g>
      <g transform="translate(800 450)">
        {parts.map((p) => {
          const f = seg(t, p.delay * 0.8, p.delay * 0.8 + 1.0, E.out);
          const swirl = (1 - f) * Math.sin(t * 6 + p.i) * 60 * p.sw;
          const x = lerp(p.sx, p.tx, f) + swirl + p.dx * gone;
          const y = lerp(p.sy, p.ty, f) + swirl * 0.5 + p.dy * gone + Math.sin(t * 9 + p.i) * 1.2 * f;
          return <circle key={p.i} cx={x} cy={y} r={p.sz * (1 - gone * 0.6)} fill={mix(C.cyan, C.mag, p.k)} opacity={clamp(f * 1.2) * (1 - gone)} />;
        })}
      </g>
      <T x={800} y={640} size={34} color={C.white} weight={300} spacing={14} o={seg(t, 1.2, 1.7) * (1 - gone)}>
        IT'S CALLED
      </T>
    </g>
  );
};

/* ───────────────────────── C · 0:12 entropy = disorder ───────────────────────── */
const ROOM_COL = [C.cyan, C.mag, C.yel, C.org, C.grn, C.pur];

export const SceneDisorder = ({ t }: SceneProps) => {
  const full = 'entropy = disorder';
  const n = Math.round(full.length * seg(t, 1.2, 2.6, E.lin));
  const a = full.slice(0, Math.min(n, 7));
  const b = n > 7 ? full.slice(7, Math.min(n, 10)) : '';
  const c = n > 10 ? full.slice(10, n) : '';
  const dim = lerp(1, 0.28, seg(t, 5.9, 6.6)) * lerp(1, 0.25, seg(t, 8.5, 9.1));
  const strike = seg(t, 5.9, 6.6, E.inOut);
  const items = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 10 }, (_, i) => ({ x: 30 + r() * 320, w: 28 + r() * 40, h: 14 + r() * 22, rot: (r() - 0.5) * 120, col: ROOM_COL[i % 6], d: i * 0.1 }));
  }, []);
  const shards = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 9 }, (_, i) => ({ vx: (i - 4) * 48 + (r() - 0.5) * 20, vy: -140 - r() * 120, sp: (r() - 0.5) * 900, sz: 0.8 + r() * 1.2 }));
  }, []);
  const blocks = useMemo(() => {
    const r = rng(3);
    return Array.from({ length: 9 }, (_, i) => ({ row: Math.floor(i / 3), col: i % 3, fx: (r() - 0.5) * 300, rot: (r() - 0.5) * 140, d: r() * 0.5 }));
  }, []);
  const panelAt = [2.2, 3.4, 4.7];
  const px = [120, 600, 1080];
  const pp = (i: number) => seg(t, panelAt[i], panelAt[i] + 0.6);
  const gb = t - (panelAt[1] + 1.4);
  const bb = panelAt[2] + 1.0;
  return (
    <g>
      <text x={800} y={120} fontSize={76} fontWeight={700} fontFamily="Outfit, sans-serif" textAnchor="middle" opacity={seg(t, 1, 1.3)}>
        <tspan fill={C.cyan}>{a}</tspan>
        <tspan fill={C.white}>{b}</tspan>
        <tspan fill={C.org}>{c}</tspan>
      </text>
      <path d="M752 98 H1160" stroke={C.red} strokeWidth={9} strokeLinecap="round" {...draw(strike)} />
      <T x={800} y={185} size={36} color={C.red} weight={500} o={seg(t, 6.2, 6.8)} spacing={8}>
        INCOMPLETE
      </T>

      <g opacity={dim}>
        {/* messy room */}
        <Panel x={px[0]} y={250} w={400} h={400} color={C.cyan} p={pp(0)} />
        <g transform={`translate(${px[0]} 250)`} opacity={pp(0)}>
          <path d="M20 340 H380" stroke={C.cyan} strokeWidth={3} opacity={0.6} />
          <rect x={30} y={270} width={170} height={50} rx={6} fill="none" stroke={C.cyan} strokeWidth={3} />
          <rect x={36} y={252} width={50} height={20} rx={8} fill="none" stroke={C.cyan} strokeWidth={3} />
          {items.map((it, i) => {
            const k = seg(t, panelAt[0] + 0.5 + it.d, panelAt[0] + 1.4 + it.d, E.bounce);
            const y = lerp(-30, 334 - it.h, k);
            return <rect key={i} x={it.x} y={y} width={it.w} height={it.h} rx={4} fill="none" stroke={it.col} strokeWidth={3} transform={`rotate(${it.rot * k} ${it.x + it.w / 2} ${y + it.h / 2})`} opacity={k > 0 ? 1 : 0} />;
          })}
        </g>
        <T x={px[0] + 200} y={715} size={34} color={C.cyan} weight={500} o={pp(0)}>
          Messy room
        </T>

        {/* broken glass */}
        <Panel x={px[1]} y={250} w={400} h={400} color={C.mag} p={pp(1)} />
        <g transform={`translate(${px[1]} 250)`} opacity={pp(1)}>
          <path d="M20 340 H380" stroke={C.mag} strokeWidth={3} opacity={0.6} />
          <g opacity={gb > 0 ? 0 : 1}>
            <path d="M140 80 Q138 220 200 228 Q262 220 260 80 Z M200 228 V318 M150 322 H250" fill="none" stroke={C.mag} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" {...draw(pp(1))} />
          </g>
          {gb > 0 &&
            shards.map((s, i) => {
              const u = Math.max(0, gb);
              const x = 200 + s.vx * Math.min(u, 1.1) * 0.9;
              const yy = 150 + s.vy * u + 700 * u * u;
              const y = Math.min(yy, 328 - (i % 3) * 3);
              const hit = yy >= 328;
              return (
                <path key={i} d="M0 -22 L18 14 L-16 12 Z" transform={`translate(${x} ${y}) rotate(${hit ? i * 37 : s.sp * u}) scale(${s.sz})`} fill="none" stroke={C.mag} strokeWidth={3} strokeLinejoin="round" />
              );
            })}
        </g>
        <T x={px[1] + 200} y={715} size={34} color={C.mag} weight={500} o={pp(1)}>
          Broken glass
        </T>

        {/* falling apart */}
        <Panel x={px[2]} y={250} w={400} h={400} color={C.yel} p={pp(2)} />
        <g transform={`translate(${px[2]} 250)`} opacity={pp(2)}>
          <path d="M20 340 H380" stroke={C.yel} strokeWidth={3} opacity={0.6} />
          {blocks.map((b, i) => {
            const k = seg(t, bb + b.d, bb + b.d + 1.1, E.in);
            const sx = 90 + b.col * 72;
            const sy = 340 - 62 - (2 - b.row) * 0 - (2 - b.row) * 64 + 0;
            const y = lerp(sy, 340 - 56, k * (b.row === 2 ? 1 : k));
            const x = lerp(sx, sx + b.fx, k);
            return <rect key={i} x={x} y={y} width={60} height={56} rx={5} fill="none" stroke={C.yel} strokeWidth={3.5} transform={`rotate(${b.rot * k} ${x + 30} ${y + 28})`} />;
          })}
        </g>
        <T x={px[2] + 200} y={715} size={34} color={C.yel} weight={500} o={pp(2)}>
          Falling apart
        </T>
      </g>

      {/* "the most amazing part" spotlight */}
      {t > 8.5 && (
        <g>
          <circle cx={800} cy={450} r={lerp(0, 330, seg(t, 8.5, 9.6))} fill="none" stroke={C.yel} strokeWidth={6} opacity={0.9} />
          <circle cx={800} cy={450} r={lerp(0, 330, seg(t, 8.5, 9.6)) * 0.8} fill={C.yel} opacity={0.08} />
          <T x={800} y={540} size={380} color={C.yel} weight={900} o={seg(t, 8.9, 9.6)}>
            ?
          </T>
          <T x={800} y={850} size={46} color={C.yel} weight={500} o={seg(t, 9.3, 9.9)} spacing={4}>
            the most amazing part is hidden
          </T>
        </g>
      )}
    </g>
  );
};

/* ───────────────────────── D · 0:22 entropy is counting ───────────────────────── */
export const SceneCounting = ({ t }: SceneProps) => {
  const ways = [1, 4, 10, 4, 1];
  const dots = [
    { c: C.cyan, sx: 0.31, sy: 0.23, px: 0, py: 0.4 },
    { c: C.mag, sx: 0.23, sy: 0.37, px: 0.7, py: 0.1 },
    { c: C.yel, sx: 0.41, sy: 0.29, px: 0.3, py: 0.9 },
    { c: C.grn, sx: 0.27, sy: 0.19, px: 1.1, py: 0.6 },
  ];
  const bp = seg(t, 0.4, 1.0);
  return (
    <g>
      <text x={800} y={120} fontSize={64} fontWeight={700} fontFamily="Outfit, sans-serif" textAnchor="middle" fill={C.white}>
        <tspan>{typed('Entropy is ', seg(t, 0.1, 0.7, E.lin))}</tspan>
        <tspan fill={C.cyan}>{typed('counting', seg(t, 0.7, 1.4, E.lin))}</tspan>
      </text>
      <Panel x={140} y={250} w={420} h={330} color={C.cyan} p={bp} />
      {dots.map((d, i) => (
        <circle key={i} cx={165 + tri(t * d.sx * 3 + d.px) * 370} cy={275 + tri(t * d.sy * 3 + d.py) * 280} r={14} fill={d.c} opacity={bp} />
      ))}
      <T x={350} y={640} size={28} color={C.white} weight={300} o={bp} spacing={2}>
        one arrangement of particles
      </T>
      <path d="M600 410 H690" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" {...draw(seg(t, 1.2, 1.8))} />
      <path d="M672 392 L698 410 L672 428" fill="none" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" {...draw(seg(t, 1.6, 2))} />
      <path d="M730 580 H1470" stroke={C.dim} strokeWidth={3} {...draw(seg(t, 1.6, 2.3))} />
      {ways.map((w, i) => {
        const p = seg(t, 2.0 + i * 0.18, 2.9 + i * 0.18, E.back);
        const h = w * 27 * p;
        const x = 760 + i * 145;
        const hl = i === 2 ? seg(t, 3.7, 4.2) : 0;
        const col = i === 2 ? mix(C.cyan, C.yel, hl) : C.cyan;
        return (
          <g key={i}>
            <rect x={x} y={580 - h} width={100} height={h} rx={8} fill={col} fillOpacity={0.18 + hl * 0.2} stroke={col} strokeWidth={4} />
            <T x={x + 50} y={580 - h - 16} size={36} color={col} weight={700} o={p} mono>
              {w}
            </T>
          </g>
        );
      })}
      <T x={1100} y={650} size={28} color={C.white} weight={300} o={seg(t, 2.6, 3.2)} spacing={2}>
        ways to get each outcome
      </T>
      <Tag x={1105} y={225} text="most likely = highest entropy" color={C.yel} o={seg(t, 3.9, 4.5)} size={26} />
      <T x={800} y={790} size={54} color={C.yel} weight={700} o={seg(t, 3.8, 4.5)}>
        It's about <tspan fill={C.cyan}>chance</tspan>.
      </T>
    </g>
  );
};

/* ───────────────────────── E · 0:27 coffee ───────────────────────── */
export const SceneCoffee = ({ t }: SceneProps) => {
  const k = seg(t, 0.8, 3.2, E.inOut);
  const temp = Math.round(lerp(90, 25, k));
  const col = mix(C.org, C.cyan, k);
  const p = seg(t, 0, 0.9);
  return (
    <g>
      <SceneTitle text="Why your coffee cools" p={seg(t, 0, 0.6, E.lin)} />
      <g opacity={p}>
        <path d="M680 380 V520 Q680 590 750 590 H850 Q920 590 920 520 V380 Z" fill={col} fillOpacity={0.14} stroke={col} strokeWidth={5} strokeLinejoin="round" {...draw(p)} />
        <path d="M920 420 Q1000 420 1000 485 Q1000 550 912 550" fill="none" stroke={col} strokeWidth={5} strokeLinecap="round" {...draw(p)} />
        <path d="M630 610 Q800 650 970 610" fill="none" stroke={C.white} strokeWidth={4} strokeLinecap="round" opacity={0.7} {...draw(p)} />
        <path d="M684 415 H916" stroke={col} strokeWidth={4} opacity={0.8} />
        {[740, 800, 860].map((x, i) => (
          <path key={i} d={`M${x} 360 q 18 -28 0 -56 t 0 -56 t 0 -56`} fill="none" stroke={col} strokeWidth={4} strokeLinecap="round" strokeDasharray="22 16" strokeDashoffset={-t * 46 - i * 9} opacity={(1 - k) * 0.85 * seg(t, 0.2, 0.9)} />
        ))}
        {Array.from({ length: 10 }, (_, i) => {
          const u = (t * 0.55 + i / 10) % 1;
          const ang = (i / 10) * Math.PI * 2;
          const x = 800 + Math.cos(ang) * (190 + u * 230);
          const y = 480 + Math.sin(ang) * (130 + u * 160);
          return <circle key={i} cx={x} cy={y} r={7 * (1 - u * 0.5)} fill={C.org} opacity={(1 - u) * (1 - k * 0.65) * seg(t, 1.0, 1.6)} />;
        })}
      </g>
      {/* thermometer */}
      <g opacity={seg(t, 0.4, 1.1)}>
        <rect x={1180} y={300} width={40} height={310} rx={20} fill="none" stroke={C.white} strokeWidth={4} />
        <circle cx={1200} cy={645} r={42} fill={col} fillOpacity={0.35} stroke={C.white} strokeWidth={4} />
        <rect x={1190} y={610 - lerp(250, 40, k)} width={20} height={lerp(250, 40, k) + 20} rx={10} fill={col} />
        <T x={1200} y={265} size={54} color={col} weight={700} mono>
          {temp}°C
        </T>
      </g>
      <T x={470} y={500} size={34} color={C.org} weight={500} o={seg(t, 1.2, 1.8) * (1 - k * 0.5)} anchor="middle">
        heat flows
      </T>
      <T x={470} y={545} size={34} color={C.cyan} weight={500} o={seg(t, 1.5, 2.1)} anchor="middle">
        hot → cold
      </T>
      <T x={800} y={790} size={44} color={C.white} weight={300} o={seg(t, 2.4, 3)} spacing={3}>
        never the other way around
      </T>
    </g>
  );
};

/* ───────────────────────── F · 0:31 egg ───────────────────────── */
export const SceneEgg = ({ t }: SceneProps) => {
  const spiral = useMemo(() => {
    let s = '';
    for (let i = 0; i <= 120; i++) {
      const a = i * 0.28;
      const r = 6 + a * 7 + Math.sin(i * 1.7) * 6;
      s += `${i === 0 ? 'M' : 'L'}${Math.cos(a) * r} ${Math.sin(a) * r * 0.75} `;
    }
    return s;
  }, []);
  const e1 = seg(t, 0, 0.5);
  const e2 = seg(t, 0.5, 1.0, E.back);
  const e3 = seg(t, 1.0, 1.6);
  const rv = seg(t, 1.5, 2.1);
  return (
    <g>
      <SceneTitle text="You can't unscramble an egg" p={seg(t, 0, 0.7, E.lin)} />
      <g transform="translate(400 470)" opacity={1 - e2 * 0.0}>
        <path d="M0 -110 C70 -110 90 -10 90 30 C90 100 45 125 0 125 C-45 125 -90 100 -90 30 C-90 -10 -70 -110 0 -110 Z" fill="none" stroke={C.white} strokeWidth={5} {...draw(e1)} />
        <path d="M-82 10 L-45 -15 L-18 18 L18 -14 L48 20 L84 0" fill="none" stroke={C.yel} strokeWidth={4} strokeLinejoin="round" {...draw(e2)} />
      </g>
      <path d="M520 470 H600" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" {...draw(e2)} />
      <g transform="translate(800 480)" opacity={e2}>
        <path d="M-130 20 Q-150 -40 -80 -50 Q-30 -90 30 -60 Q110 -70 130 -10 Q150 50 80 70 Q10 100 -60 80 Q-120 80 -130 20 Z" fill="none" stroke={C.white} strokeWidth={4} />
        <circle cx={0} cy={5} r={42 * e2} fill={C.yel} fillOpacity={0.3} stroke={C.yel} strokeWidth={5} />
      </g>
      <path d="M960 470 H1040" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" {...draw(e3)} />
      <g transform="translate(1210 480)" opacity={e3}>
        <path d="M-130 20 Q-150 -40 -80 -50 Q-30 -90 30 -60 Q110 -70 130 -10 Q150 50 80 70 Q10 100 -60 80 Q-120 80 -130 20 Z" fill="none" stroke={C.white} strokeWidth={4} opacity={0.5} />
        <path d={spiral} fill="none" stroke={C.yel} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" {...draw(e3)} />
      </g>
      <path d="M1210 660 Q800 800 400 660" fill="none" stroke={C.red} strokeWidth={5} strokeDasharray="14 12" strokeLinecap="round" opacity={rv} />
      <path d="M430 628 L398 660 L440 676" fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" {...draw(seg(t, 1.9, 2.2))} />
      <XMark x={800} y={730} p={seg(t, 1.9, 2.3, E.back)} size={34} sw={10} />
    </g>
  );
};

/* ───────────────────────── G · 0:33 arrow of time ───────────────────────── */
export const SceneTimeArrow = ({ t }: SceneProps) => {
  const kk = [0, 0.28, 0.62, 1];
  const pts = useMemo(() => {
    const r = rng(21);
    return Array.from({ length: 4 }, () =>
      Array.from({ length: 16 }, (_, i) => ({
        cx: 34 + (i % 4) * 22,
        cy: 40 + Math.floor(i / 4) * 22,
        rx: 20 + r() * 240,
        ry: 20 + r() * 190,
        c: [C.cyan, C.mag, C.yel, C.grn][i % 4],
        ph: r() * 6,
      })),
    );
  }, []);
  const axis = seg(t, 0.2, 1.9, E.inOut);
  return (
    <g>
      <SceneTitle text="The arrow of time" p={seg(t, 0, 0.6, E.lin)} y={115} />
      {kk.map((k, bi) => {
        const x = 150 + bi * 340;
        const p = seg(t, 0.2 + bi * 0.3, 0.8 + bi * 0.3);
        return (
          <g key={bi}>
            <Panel x={x} y={260} w={290} h={240} color={mix(C.cyan, C.org, k)} p={p} r={12} />
            <g transform={`translate(${x} 260)`} opacity={p}>
              {pts[bi].map((q, i) => (
                <circle key={i} cx={lerp(q.cx, q.rx, k) + Math.sin(t * 5 + q.ph) * (2 + k * 4)} cy={lerp(q.cy, q.ry, k) + Math.cos(t * 4 + q.ph) * (2 + k * 4)} r={7} fill={q.c} />
              ))}
            </g>
          </g>
        );
      })}
      <path d="M150 620 H1450" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" {...draw(axis)} />
      <path d="M1415 595 L1455 620 L1415 645" fill="none" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" {...draw(seg(t, 1.7, 2.1))} />
      <T x={150} y={690} size={30} color={C.cyan} weight={500} anchor="start" o={axis}>
        past · low entropy
      </T>
      <T x={1450} y={690} size={30} color={C.org} weight={500} anchor="end" o={axis}>
        future · high entropy
      </T>
      <T x={800} y={780} size={46} color={C.white} weight={500} o={seg(t, 1.5, 2.1)} spacing={3}>
        time only flows <tspan fill={C.yel}>one way</tspan>
      </T>
    </g>
  );
};

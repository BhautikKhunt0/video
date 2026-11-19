import { ParticleField, sampleText, genPoints, gauss } from '../particles';
import { clamp, hex, lerpColor, seg, wordT, F_SERIF, smooth } from '../core';

type Col = [number, number, number];
interface Key {
  t: number;
  pts: () => Float32Array;
  color: (i: number, x: number, y: number, z: number) => Col;
  turb: number;
  stiff: number;
  swirl?: number;
  jitter?: number;
}
interface Segment {
  a: number;
  b: number;
  init: (i: number, p: Float32Array, o: number, r: () => number) => void;
  keys: Key[];
  params: (T: number, f: ParticleField) => void;
}

const EMBER = hex('#ff9a3c');
const FIRE = hex('#ff5a2a');
const ICE = hex('#78d6ff');
const VIO = hex('#9b8cff');
const IVORY = hex('#f3ede2');
const GOLD = hex('#ffe27a');

const memo = <T>(fn: () => T) => {
  let v: T | undefined;
  return () => (v ??= fn());
};

const textKey = (str: string, w: number, font?: string, weight?: string) => memo(() => sampleText(str, w, { font, weight }));

export class FieldScript {
  segs: Segment[];
  cur = -1;
  keyIdx = -2;
  lastT = -1;
  constructor(public field: ParticleField) {
    const ascii = (c: Col, gradient: Col, span: number) => (_i: number, x: number): Col => lerpColor(c, gradient, clamp((x / span) * 0.5 + 0.5));

    const vortex = memo(() =>
      genPoints(14000, (_i, r, o) => {
        const arm = Math.floor(r() * 3);
        const rad = Math.pow(r(), 0.65) * 11;
        const ang = rad * 0.55 + arm * 2.094 + gauss(r) * 0.18;
        o[0] = Math.cos(ang) * rad;
        o[2] = Math.sin(ang) * rad * 0.8;
        o[1] = gauss(r) * 0.35 * (1.2 - rad / 14);
      })
    );
    const arrowPts = memo(() =>
      genPoints(9000, (i, r, o) => {
        const head = i % 5 === 0;
        if (!head) {
          o[0] = -12 + r() * 22.5;
          o[1] = gauss(r) * 0.07;
          o[2] = gauss(r) * 0.07;
        } else {
          const s = r() * 3.2;
          const side = r() < 0.5 ? 1 : -1;
          o[0] = 10.5 + 1.5 - s * 0.9 + (r() - 0.5) * 0.1;
          o[1] = side * s * 0.75 + gauss(r) * 0.06;
          o[2] = gauss(r) * 0.07;
        }
      })
    );
    const heatDeath = memo(() =>
      genPoints(9000, (_i, r, o) => {
        const rad = Math.pow(r(), 0.5) * 17;
        const a = r() * Math.PI * 2;
        const b = Math.acos(2 * r() - 1);
        o[0] = Math.cos(a) * Math.sin(b) * rad * 1.5;
        o[1] = Math.cos(b) * rad * 0.8;
        o[2] = Math.sin(a) * Math.sin(b) * rad - 4;
      })
    );
    const origin = memo(() =>
      genPoints(400, (_i, r, o) => {
        o[0] = gauss(r) * 0.15;
        o[1] = gauss(r) * 0.15;
        o[2] = gauss(r) * 0.15;
      })
    );
    const gasPts = memo(() =>
      genPoints(12000, (_i, r, o) => {
        o[0] = (r() - 0.5) * 30;
        o[1] = (r() - 0.5) * 15;
        o[2] = -8 + r() * 12;
      }, 31)
    );
    const timeArrow = memo(() =>
      genPoints(12000, (_i, r, o) => {
        const u = r();
        const x = -13 + u * 26;
        const spread = 0.06 + Math.pow(u, 1.6) * 4.2;
        o[0] = x;
        o[1] = gauss(r) * spread * (0.6 + r() * 0.6);
        o[2] = gauss(r) * spread * 0.9;
      }, 17)
    );
    const ENTROPY = textKey('ENTROPY', 19);
    const DISORDER = textKey('DISORDER', 16);
    const QMARK = textKey('?', 7.5);
    const FORMULA = textKey('S = k ln W', 17, F_SERIF);
    const PROB = textKey('PROBABILITY', 17.5);

    const tDisorder = wordT(2, 'disorder');
    const tTime = wordT(2, 'time');
    const tUniverse = wordT(2, 'universe');
    const tYet = wordT(3, 'Yet');
    const tNotLess = wordT(3, 'not');
    const tProb = wordT(17, 'Probability');
    const tEntropy = wordT(15, 'entropy');

    this.segs = [
      {
        a: 0,
        b: 20.8,
        init: (_i, p, o, r) => {
          const a = r() * 6.283,
            b = Math.acos(2 * r() - 1),
            rad = 0.15 + r() * 0.5;
          p[o] = Math.cos(a) * Math.sin(b) * rad;
          p[o + 1] = Math.cos(b) * rad;
          p[o + 2] = Math.sin(a) * Math.sin(b) * rad;
        },
        keys: [
          {
            t: 0,
            pts: vortex,
            color: (_i, x, _y, z) => {
              const rr = Math.min(1, Math.hypot(x, z) / 11);
              return lerpColor(lerpColor(GOLD, EMBER, rr * 1.4), lerpColor(EMBER, ICE, rr), rr * rr);
            },
            turb: 0.25,
            stiff: 0.1,
            swirl: 0.9,
          },
          { t: 0.95, pts: ENTROPY, color: (_i, x) => lerpColor(IVORY, EMBER, smooth(clamp((x + 9) / 18)) * 0.8), turb: 0.1, stiff: 3.4, swirl: 0, jitter: 0.015 },
          { t: tDisorder - 0.15, pts: DISORDER, color: (_i, x) => lerpColor(FIRE, VIO, clamp((x + 8) / 16)), turb: 1.5, stiff: 1.1, jitter: 0.05 },
          { t: tTime - 0.2, pts: arrowPts, color: ascii(ICE, EMBER, 12), turb: 0.15, stiff: 1.6, jitter: 0.02 },
          { t: tUniverse - 0.1, pts: heatDeath, color: (_i, _x, y) => lerpColor(hex('#1f3b8f'), VIO, clamp(y / 14 + 0.5)), turb: 0.7, stiff: 0.22, jitter: 0.3 },
          { t: tYet - 0.1, pts: QMARK, color: (_i, _x, y) => lerpColor(VIO, ICE, clamp(y / 8 + 0.5)), turb: 0.5, stiff: 1.6, jitter: 0.03 },
          { t: tNotLess + 0.25, pts: origin, color: () => EMBER, turb: 0, stiff: 1.1, jitter: 0 },
        ],
        params: (T, f) => {
          f.sizeMul = 1;
          const a = 1 - 0.55 * seg(T, 12.4, 14.6) + 0.55 * seg(T, 15.2, 15.8);
          f.mat.uniforms.uGlobal.value = a * smooth(seg(T, 0, 0.4)) * (1 - seg(T, 20.4, 20.8));
        },
      },
      {
        a: 95,
        b: 120,
        init: (_i, p, o, r) => {
          p[o] = (r() - 0.5) * 30;
          p[o + 1] = (r() - 0.5) * 15;
          p[o + 2] = -8 + r() * 12;
        },
        keys: [
          { t: 95, pts: gasPts, color: () => lerpColor(VIO, IVORY, 0.35), turb: 0.9, stiff: 0.35, jitter: 0 },
          { t: wordT(14, 'improbable') + 0.7, pts: origin, color: () => lerpColor(EMBER, GOLD, 0.5), turb: 0, stiff: 2.2, jitter: 0 },
          { t: tEntropy - 0.05, pts: FORMULA, color: (_i, x) => lerpColor(IVORY, EMBER, smooth(clamp((x + 8) / 16)) * 0.7), turb: 0.1, stiff: 3.2, jitter: 0.015 },
          { t: wordT(16, 'And') - 0.05, pts: timeArrow, color: (_i, x) => lerpColor(lerpColor(IVORY, ICE, 0.5), VIO, clamp((x + 13) / 26)), turb: 0.25, stiff: 1.4, jitter: 0.03 },
          { t: wordT(17, 'Not') - 0.1, pts: DISORDER, color: () => hex('#9aa3c4'), turb: 0.2, stiff: 2.4, jitter: 0.03 },
          { t: tProb - 0.05, pts: PROB, color: (_i, x) => lerpColor(VIO, EMBER, smooth(clamp((x + 8.75) / 17.5))), turb: 0.08, stiff: 2.6, jitter: 0.012 },
        ],
        params: (T, f) => {
          f.mat.uniforms.uGlobal.value = 0.42 * smooth(seg(T, 95.3, 97.5)) + (1 - 0.42 * 1) * 0 + 0.58 * smooth(seg(T, 106.8, 107.9));
        },
      },
    ];
  }

  visible(T: number) {
    return this.segs.some((s) => T >= s.a - 0.01 && T < s.b + 0.2);
  }

  /** advance the particle simulation deterministically to time T */
  sync(T: number) {
    const f = this.field;
    const si = this.segs.findIndex((s) => T >= s.a - 0.01 && T < s.b + 0.2);
    if (si < 0) {
      this.cur = -1;
      return;
    }
    const s = this.segs[si];
    const dtFixed = 1 / 60;
    const restart = si !== this.cur || T < this.lastT - 0.001 || T - this.lastT > 0.6;
    if (restart) {
      f.reset(s.init, 11 + si);
      for (let i = 0; i < f.n * 3; i++) f.col[i] = 0;
      this.cur = si;
      this.keyIdx = -2;
      f.simT = s.a;
    }
    let steps = Math.round((T - f.simT) / dtFixed);
    if (steps < 0) steps = 0;
    while (steps-- > 0) {
      const tn = f.simT;
      let ki = -1;
      for (let k = 0; k < s.keys.length; k++) if (tn >= s.keys[k].t) ki = k;
      if (ki !== this.keyIdx && ki >= 0) {
        const k = s.keys[ki];
        f.assign(k.pts(), k.color, k.jitter ?? 0.02);
        f.turb = k.turb;
        f.stiffMul = k.stiff;
        f.swirl = k.swirl ?? 0;
        this.keyIdx = ki;
      }
      f.step(dtFixed, tn);
    }
    s.params(T, f);
    f.upload();
    this.lastT = T;
  }
}

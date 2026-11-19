import * as THREE from 'three';
import { VScene, Ctx, COL, F_SERIF, F_MONO, chapterTag, seg, lerp, eIO2, eOut3, eOut5, smooth, wordT, glowText, clamp } from '../core';
import { spokenLine, annotate } from './ui';

export const PAY_T0 = 107.6;

export function createPayoff(): VScene {
  const group = new THREE.Group();
  const tEntropy = wordT(15, 'entropy');
  const tCount = wordT(15, 'count');
  const tArranged = wordT(15, 'arranged');
  const tArrow = wordT(16, 'arrow');
  const tNotDis = wordT(17, 'disorder');
  const tProb = wordT(17, 'Probability');

  return {
    start: PAY_T0,
    end: 120,
    group,
    update(T, c: Ctx) {
      c.env.intensity = 0;
      c.dustTint.set('#ffc08a');
      const p = eIO2(seg(T, PAY_T0, 120));
      c.cam.position.set(Math.sin((T - 108) * 0.22) * 1.6 + lerp(0, 0.8, seg(T, 112, 116)), Math.cos((T - 108) * 0.19) * 0.6, lerp(25, 20.5, p));
      c.cam.lookAt(0, 0, 0);
      c.cam.fov = 35;
      c.fx.flash += (1 - seg(T, PAY_T0, PAY_T0 + 0.9)) * 0.9;
      c.fx.zoom += (1 - smooth(seg(T, PAY_T0, PAY_T0 + 0.7))) * 0.2;
      // landing pulses
      const pulse = (t0: number, k: number) => Math.exp(-Math.max(0, T - t0) * 5) * (T >= t0 ? 1 : 0) * k;
      const pu = pulse(tEntropy - 0.05, 0.5) + pulse(tArrow - 0.9, 0.2) + pulse(tProb - 0.05, 0.7);
      c.fx.bloom = 0.9 + pu * 1.4;
      c.fx.flash += pu * 0.22;
      c.fx.chroma = 0.0008 + pu * 0.008;
      c.fx.glitch += pulse(tNotDis, 0.35);
      c.fx.grade += 0.5;
      c.fx.fade += smooth(seg(T, 119.0, 119.95));
    },
    draw(T, g, c: Ctx) {
      const P = (x: number, y: number, z = 0) => c.project(new THREE.Vector3(x, y, z));
      chapterTag(g, '05', 'Entropy, defined', seg(T, 108.3, 109.0), COL.ember);

      // ---- formula annotations
      const o = P(0, 0), u = P(1, 0);
      const ppu = u[0] - o[0];
      const fa = 1 - smooth(seg(T, 112.3, 112.9));
      if (fa > 0 && T > tEntropy) {
        g.save();
        g.font = `400 100px ${F_SERIF}`;
        const full = 'S = k ln W';
        const wFull = g.measureText(full).width;
        const startX = o[0] - (17 * ppu) / 2;
        const scale = (17 * ppu) / wFull;
        const at = (s: string) => startX + g.measureText(s).width * scale;
        const mid = (a: string, b: string) => (at(a) + at(b)) / 2;
        const yL = o[1] + 17 * ppu * 0.17 + 40;
        const sx = mid('', 'S');
        const kx = mid('S = ', 'S = k');
        const wx = mid('S = k ln ', full);
        g.restore();
        const a1 = smooth(seg(T, tEntropy + 0.2, tEntropy + 0.8)) * fa;
        const a2 = smooth(seg(T, tCount - 0.1, tCount + 0.5)) * fa;
        const a3 = smooth(seg(T, tCount + 0.2, tCount + 0.9)) * fa;
        annotate(g, T, tEntropy + 0.2, 112.3, sx, yL, 'S  ·  ENTROPY', COL.ember, 'center');
        annotate(g, T, tCount + 0.9, 112.3, kx, yL, 'k  ·  A CONSTANT', COL.ivory, 'center', 'converts to joules per kelvin');
        annotate(g, T, tCount - 0.1, 112.3, wx, yL, 'W  ·  NUMBER OF WAYS', COL.violet, 'center', 'to arrange the system');
        void a1; void a2; void a3;
      }
      spokenLine(g, T, 15, 3, 13, 960, 960, `italic 400 62px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 112.2, hideDur: 0.4, colors: { count: COL.violet, ways: COL.violet, arranged: COL.violet } });
      void tArranged;

      // ---- time arrow
      const arrA = smooth(seg(T, 113.0, 113.5)) * (1 - smooth(seg(T, 115.5, 115.95)));
      if (arrA > 0) {
        const y = 850, xA = 240, xB = 1680;
        const prog = eOut5(seg(T, 113.0, 114.4));
        const xe = lerp(xA, xB, prog);
        g.save();
        g.globalAlpha = arrA;
        const gr = g.createLinearGradient(xA, 0, xB, 0);
        gr.addColorStop(0, COL.ice); gr.addColorStop(1, COL.violet);
        g.strokeStyle = gr; g.lineWidth = 4; g.lineCap = 'round';
        g.shadowColor = COL.violet; g.shadowBlur = 18;
        g.beginPath(); g.moveTo(xA, y); g.lineTo(xe, y); g.stroke();
        // moving chevrons
        for (let i = 0; i < 9; i++) {
          const cx = xA + ((i / 9 + T * 0.18) % 1) * (xe - xA);
          g.globalAlpha = arrA * 0.55;
          g.beginPath(); g.moveTo(cx - 8, y - 12); g.lineTo(cx + 4, y); g.lineTo(cx - 8, y + 12); g.stroke();
        }
        g.globalAlpha = arrA;
        if (prog > 0.95) {
          g.beginPath(); g.moveTo(xB - 26, y - 20); g.lineTo(xB, y); g.lineTo(xB - 26, y + 20); g.stroke();
        }
        g.restore();
        glowText(g, 'PAST', xA, y + 52, `500 17px ${F_MONO}`, COL.ice, arrA, 8, 'left', 6);
        glowText(g, 'FEW ARRANGEMENTS · LOW ENTROPY', xA, y + 82, `400 13px ${F_MONO}`, COL.ivory, arrA * 0.65, 0, 'left', 3);
        const fut = smooth(seg(T, 114.0, 114.6)) * arrA;
        glowText(g, 'FUTURE', xB, y + 52, `500 17px ${F_MONO}`, COL.violet, fut, 8, 'right', 6);
        glowText(g, 'MANY ARRANGEMENTS · HIGH ENTROPY', xB, y + 82, `400 13px ${F_MONO}`, COL.ivory, fut * 0.65, 0, 'right', 3);
        glowText(g, 'THE ARROW OF TIME', 960, y - 30, `500 15px ${F_MONO}`, COL.ivory, arrA * smooth(seg(T, tArrow - 0.3, tArrow + 0.3)), 6, 'center', 7);
      }
      spokenLine(g, T, 16, 0, 7, 960, 300, `italic 400 74px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 115.5, hideDur: 0.4, colors: { time: COL.violet, arrow: COL.violet } });

      // ---- strike-through "DISORDER"
      const st = eOut5(seg(T, tNotDis + 0.25, tNotDis + 0.8));
      if (st > 0 && T < tProb + 0.35) {
        const x0 = 960 - 16 * ppu * 0.5 - 20, x1 = 960 + 16 * ppu * 0.5 + 20;
        g.save();
        g.globalAlpha = 1 - smooth(seg(T, tProb - 0.1, tProb + 0.35));
        g.strokeStyle = COL.fire; g.lineWidth = 9; g.lineCap = 'round';
        g.shadowColor = COL.fire; g.shadowBlur = 26;
        const y = P(0, 0)[1];
        g.beginPath(); g.moveTo(x0, y); g.lineTo(lerp(x0, x1, st), y); g.stroke();
        g.restore();
      }
      if (T > tProb) {
        const a = smooth(seg(T, tProb + 0.9, tProb + 1.6));
        glowText(g, 'ENTROPY  =  A COUNT OF POSSIBILITIES', 960, 800, `500 17px ${F_MONO}`, COL.ivory, a * 0.85, 10, 'center', 7);
        const ln = eOut3(seg(T, tProb + 0.9, tProb + 1.8));
        g.save();
        g.globalAlpha = a; g.strokeStyle = COL.violet; g.lineWidth = 2; g.shadowColor = COL.violet; g.shadowBlur = 12;
        g.beginPath(); g.moveTo(960 - 120 * ln, 770); g.lineTo(960 + 120 * ln, 770); g.stroke();
        g.restore();
      }
      void clamp;
    },
  };
}

import * as THREE from 'three';
import { VScene, Ctx, B, COL, F_SERIF, chapterTag, seg, eOut3, eOut5, wordT, lerp } from '../core';
import { spokenLine, annotate } from './ui';

export function createHook(): VScene {
  const group = new THREE.Group();
  const tDis = wordT(2, 'disorder');
  const tTime = wordT(2, 'time');
  const tUni = wordT(2, 'universe');

  return {
    start: B[0],
    end: B[1],
    group,
    update(T, c: Ctx) {
      const e = eOut5(seg(T, 0, 1.6));
      const z = lerp(32, 22.5, eOut3(seg(T, 0, 20.5)));
      c.cam.position.set(lerp(9, Math.sin(T * 0.22) * 2.2, e), lerp(7, Math.cos(T * 0.17) * 0.8, e), z);
      c.cam.lookAt(0, 0, 0);
      c.cam.fov = 35;
      c.dustTint.set('#ffb070');
      c.env.intensity = 0;
      // fx: ignition flash when "Entropy" lands, exit implosion
      const f = Math.exp(-Math.max(0, T - 1.05) * 6) * (T > 1.05 ? 1 : 0);
      c.fx.flash += f * 0.55;
      c.fx.bloom = 0.85 + f * 1.2;
      c.fx.chroma = 0.0008 + f * 0.01;
      // glitch + shock on "disorder"
      const gd = Math.exp(-Math.max(0, T - tDis) * 5) * (T > tDis - 0.1 ? 1 : 0);
      c.fx.glitch += gd * 0.6;
      // exit: implode to a point and flash
      const imp = seg(T, 19.2, 20.6);
      c.fx.zoom += imp * 0.25 * (1 - seg(T, 20.4, 20.8));
      c.fx.flash += seg(T, 20.2, 20.75) * 1.0;
      c.fx.fade += 0;
    },
    draw(T, g) {
      chapterTag(g, '00', 'The question', seg(T, 0.6, 1.4));
      // headline typographic support
      spokenLine(g, T, 1, 0, 7, 960, 872, `italic 400 74px ${F_SERIF}`, COL.ivory, {
        align: 'center',
        hideAt: 6.2,
        hideDur: 0.5,
        colors: { confusing: COL.ember, physics: COL.ember },
      });
      // 'disorder' annotation
      annotate(g, T, tDis + 0.2, tDis + 1.5, 960, 930, 'THE USUAL ANSWER', COL.fire, 'center', '“disorder”');
      annotate(g, T, tTime + 0.4, tTime + 2.2, 960, 790, 'THE ARROW OF TIME', COL.ice, 'center');
      annotate(g, T, tUni + 0.7, tUni + 3.0, 960, 930, 'THE HEAT DEATH OF THE UNIVERSE', COL.violet, 'center');
      // "more confused, not less"
      spokenLine(g, T, 3, 5, 9, 960, 928, `italic 400 78px ${F_SERIF}`, COL.ivory, {
        align: 'center',
        hideAt: 19.3,
        hideDur: 0.5,
        colors: { confused: COL.violet, not: COL.ivory, less: COL.ivory },
      });
    },
  };
}

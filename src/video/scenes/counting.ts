import * as THREE from 'three';
import {
  VScene, Ctx, COL, F_SERIF, F_MONO, chapterTag, seg, clamp, lerp, eIO2, eIO3, eOut3, eOut5, eOutBack, smooth, wordT, glowText, roundRect, mulberry32,
} from '../core';
import { spokenLine, annotate } from './ui';

export const COUNT_T0 = 85.0;
export const COUNT_T1 = 107.6;
const PCOL = ['#ff9a3c', '#78d6ff', '#9b8cff', '#ffe27a'];
const LET = ['A', 'B', 'C', 'D'];
const pop = (m: number) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

function cardTexture(mask: number) {
  const cv = document.createElement('canvas');
  cv.width = 320; cv.height = 220;
  const g = cv.getContext('2d')!;
  roundRect(g, 4, 4, 312, 212, 26);
  const gr = g.createLinearGradient(0, 0, 0, 220);
  gr.addColorStop(0, '#142038'); gr.addColorStop(1, '#0a1020');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(160,200,255,0.5)'; g.lineWidth = 3; g.stroke();
  const left = 4 - pop(mask);
  g.font = `500 22px ${F_MONO}`;
  g.fillStyle = 'rgba(243,237,226,0.75)';
  g.textAlign = 'center';
  g.fillText(`${left}  |  ${4 - left}`, 160, 40);
  const boxes = [[26, 62], [172, 62]];
  boxes.forEach(([bx, by]) => {
    roundRect(g, bx, by, 122, 130, 12);
    g.strokeStyle = 'rgba(243,237,226,0.35)'; g.lineWidth = 2; g.stroke();
  });
  const cnt = [0, 0];
  for (let k = 0; k < 4; k++) {
    const side = (mask >> k) & 1;
    const n = cnt[side]++;
    const [bx, by] = boxes[side];
    const px = bx + 36 + (n % 2) * 50, py = by + 38 + Math.floor(n / 2) * 52;
    const gg = g.createRadialGradient(px, py, 2, px, py, 24);
    gg.addColorStop(0, '#fff'); gg.addColorStop(0.35, PCOL[k]); gg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gg;
    g.beginPath(); g.arc(px, py, 24, 0, 6.283); g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function radial(color: string) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}

// log-gamma for binomial pmf
function lgamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
const lchoose = (n: number, k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

const CARD_W = 1.5, CARD_H = 1.02;

export function createCounting(): VScene {
  const group = new THREE.Group();
  const rnd = mulberry32(88);

  // stage objects
  const boxMat = new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.7 });
  const mkBox = (x: number) => {
    const g = new THREE.Group();
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.7, 2.4, 1.2)), boxMat));
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.4), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false })));
    g.position.set(x, 2.9, 0);
    group.add(g);
    return g;
  };
  const boxL = mkBox(-2.35), boxR = mkBox(2.35);

  const grid = new THREE.GridHelper(50, 50, 0x3b4f7a, 0x1a2540);
  grid.position.y = -4.6;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.3;
  group.add(grid);

  // 4 particles
  const haloTex = radial('rgba(255,255,255,1)');
  const parts = PCOL.map((c) => {
    const grp = new THREE.Group();
    const sph = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).lerp(new THREE.Color(1, 1, 1), 0.25), toneMapped: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    halo.scale.setScalar(2.0);
    grp.add(sph, halo);
    group.add(grp);
    return grp;
  });

  // 16 cards
  interface Card { mesh: THREE.Group; face: THREE.Mesh; glow: THREE.Mesh; mask: number; stack: number; gx: number; gy: number; hx: number; hy: number }
  const cards: Card[] = [];
  const stackCount = [0, 0, 0, 0, 0];
  for (let k = 0; k < 16; k++) {
    const p = pop(k);
    const mesh = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), new THREE.MeshBasicMaterial({ map: cardTexture(k), transparent: true, toneMapped: false, depthWrite: false }));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 1.28, CARD_H * 1.4), new THREE.MeshBasicMaterial({ map: radial('rgba(255,255,255,0.9)'), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    glow.position.z = -0.02;
    mesh.add(glow, face);
    group.add(mesh);
    const c = k % 8, r = Math.floor(k / 8);
    cards.push({ mesh, face, glow, mask: k, stack: stackCount[p]++, gx: (c - 3.5) * 1.95, gy: -0.45 - r * 1.42, hx: (p - 2) * 3.4, hy: -2.55 + (stackCount[p] - 1) * 0.0, });
  }
  cards.forEach((c) => (c.hy = -2.55 + c.stack * 0.62));

  const tPop = (k: number) => 87.45 + k * 0.135;
  const tSort = 92.95;
  const sixSet = [3, 5, 6, 9, 10, 12];
  const sched: { t: number; mask: number }[] = [];
  for (let k = 0; k < 16; k++) sched.push({ t: tPop(k), mask: k });
  sched.push({ t: 89.75, mask: 10 }, { t: 90.1, mask: 5 }, { t: 90.45, mask: 0 });
  sixSet.forEach((m, i) => sched.push({ t: 92.65 + i * 0.4, mask: m }));
  const maskAt = (T: number) => {
    let i = -1;
    for (let k = 0; k < sched.length; k++) if (T >= sched[k].t) i = k;
    if (i < 0) return { cur: -1, prev: -1, since: 0 };
    return { cur: sched[i].mask, prev: i > 0 ? sched[i - 1].mask : -1, since: T - sched[i].t };
  };
  const slotPos = (mask: number, k: number) => {
    const side = (mask >> k) & 1;
    let n = 0;
    for (let j = 0; j < k; j++) if (((mask >> j) & 1) === side) n++;
    const cx = side ? 2.35 : -2.35;
    return new THREE.Vector3(cx + (n % 2 ? 0.75 : -0.75), 2.9 + (n < 2 ? 0.5 : -0.5), 0);
  };

  const cardWorld: THREE.Vector3[] = cards.map(() => new THREE.Vector3());
  const partWorld: THREE.Vector3[] = parts.map(() => new THREE.Vector3());
  let partsA = 0;

  // ---- phase C helpers
  const logN = (T: number) => {
    const u = eIO3(seg(T, 95.25, 98.0));
    return lerp(Math.log10(4), 23, u);
  };

  return {
    start: COUNT_T0,
    end: COUNT_T1,
    group,
    update(T, c: Ctx) {
      c.env.intensity = 0;
      c.dustTint.set('#a99bff');
      const stageA = smooth(seg(T, 85.2, 86.2)) * (1 - smooth(seg(T, 94.9, 95.6)));
      boxL.visible = boxR.visible = stageA > 0.01;
      boxMat.opacity = 0.7 * stageA;
      grid.visible = T < 107;
      (grid.material as THREE.Material).opacity = 0.3 * (1 - smooth(seg(T, 95.0, 96.0)));

      // particles hopping
      const { cur, prev, since } = maskAt(T);
      partsA = cur >= 0 ? stageA : 0;
      parts.forEach((p, k) => {
        p.visible = cur >= 0 && stageA > 0.01;
        if (!p.visible) return;
        const to = slotPos(cur, k);
        const from = prev >= 0 && prev !== cur ? slotPos(prev, k) : to;
        const hopT = (cur < 16 ? 0.1 : 0.28);
        const u = clamp(since / hopT);
        const e = eIO2(u);
        const pos = new THREE.Vector3().lerpVectors(from, to, e);
        const moved = (((prev ^ cur) >> k) & 1) === 1 && prev >= 0;
        pos.y += moved ? Math.sin(Math.PI * u) * 0.9 : 0;
        pos.z = Math.sin(T * 1.7 + k * 1.9) * 0.15;
        pos.x += Math.sin(T * 3.1 + k * 2.2) * 0.06;
        pos.y += Math.cos(T * 2.7 + k) * 0.05;
        const pop0 = eOutBack(clamp((T - 86.7 - k * 0.07) / 0.5));
        p.position.copy(pos);
        p.scale.setScalar(Math.max(0.001, pop0) * (0.9 + 0.1 * stageA));
        partWorld[k].copy(pos);
      });

      // cards
      cards.forEach((cd, k) => {
        const appear = eOutBack(clamp((T - tPop(k)) / 0.45));
        const sortU = eIO3(seg(T, tSort + (k % 8) * 0.025 + Math.floor(k / 8) * 0.05, tSort + 0.95 + (k % 8) * 0.025));
        const dis = smooth(seg(T, 95.0 + (k % 5) * 0.06, 95.9 + (k % 5) * 0.06));
        const x = lerp(cd.gx, cd.hx, sortU);
        const y = lerp(cd.gy, cd.hy, sortU) + (1 - appear) * -0.6;
        const z = Math.sin(Math.PI * sortU) * 1.6 + cd.stack * 0.03 * sortU - dis * 9;
        cd.mesh.position.set(x, y, z);
        const bob = Math.sin(T * 0.9 + k * 0.7) * 0.04 * (1 - sortU);
        cd.mesh.position.y += bob;
        // highlight logic
        let hl = 1, gcol = 0xffffff, gop = 0;
        if (T > 89.9 && T < 92.6) {
          const on = k === 0;
          hl = on ? 1.0 : 0.22; gcol = 0xffe27a; gop = on ? 0.9 : 0;
        } else if (T >= 92.6 && T < 97) {
          const on = pop(k) === 2;
          hl = on ? 1.0 : 0.22; gcol = 0x9b8cff; gop = on ? 0.8 : 0;
        }
        const hlSm = lerp(1, hl, smooth(seg(T, 89.9, 90.4))) * (T > 92.6 ? 1 : 1);
        const sc = Math.max(0.001, appear) * (gop > 0 ? 1.12 : 0.98) * (1 - dis * 0.5) * lerp(1, 0.92, sortU);
        cd.mesh.scale.setScalar(sc);
        cd.mesh.rotation.set(Math.sin(T * 0.6 + k) * 0.05 * (1 - sortU), Math.cos(T * 0.5 + k) * 0.07 * (1 - sortU), 0);
        const mat = cd.face.material as THREE.MeshBasicMaterial;
        mat.color.setScalar(T > 89.9 ? hlSm : 1);
        mat.opacity = 1 - dis;
        const gm = cd.glow.material as THREE.MeshBasicMaterial;
        gm.color.set(gcol);
        gm.opacity = gop * (0.55 + 0.25 * Math.sin(T * 5 + k)) * (1 - dis);
        cd.mesh.visible = appear > 0.01 && dis < 0.99;
        cardWorld[k].set(x, y, z);
      });

      // camera
      const sway = Math.sin((T - 85) * 0.35);
      const zc = lerp(17.5, 15.2, eOut3(seg(T, 85, 90))) + lerp(0, 2, smooth(seg(T, 94.5, 107)));
      c.cam.position.set(sway * 1.5, 0.2 + Math.cos((T - 85) * 0.3) * 0.35, zc);
      c.cam.lookAt(0, -0.35, 0);
      c.cam.fov = 35;
      c.fx.flash += (1 - seg(T, COUNT_T0, COUNT_T0 + 0.6)) * 0.9;
      c.fx.zoom += (1 - smooth(seg(T, COUNT_T0, COUNT_T0 + 0.8))) * 0.25;
      c.fx.bloom = 0.8;
      // exit into payoff
      c.fx.flash += smooth(seg(T, 107.0, 107.6)) * 0.85;
    },
    draw(T, g, c: Ctx) {
      const P = (v: THREE.Vector3) => c.project(v);
      chapterTag(g, '04', 'Counting possibilities', seg(T, 85.4, 86.2), COL.violet);
      const Y = 985;
      spokenLine(g, T, 13, 0, 5, 960, Y, `italic 400 66px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 89.3, hideDur: 0.3, colors: { four: COL.ember, two: COL.ice } });
      spokenLine(g, T, 13, 6, 17, 960, Y, `italic 400 66px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 92.3, hideDur: 0.3, colors: { one: COL.gold, left: COL.gold } });
      spokenLine(g, T, 13, 18, 24, 960, Y, `italic 400 66px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 94.9, hideDur: 0.4, colors: { six: COL.violet, evenly: COL.violet } });

      const sp = (a: number, b: number, hide: number, size: number, colors: Record<string, string>) =>
        spokenLine(g, T, 14, a, b, 960, Y, `italic 400 ${size}px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: hide, hideDur: 0.3, colors });
      sp(0, 8, 98.3, 56, { trillions: COL.violet });
      sp(9, 14, 100.9, 62, { spread: COL.violet, gathered: COL.ember });
      sp(15, 16, 102.2, 96, { overwhelmingly: COL.violet });
      sp(17, 21, 104.3, 66, { forbidden: COL.ember });
      sp(22, 25, 107.3, 76, { improbable: COL.fire, absurdly: COL.fire });

      // letters on particles + box labels
      if (partsA > 0.01) {
        parts.forEach((p, k) => {
          if (!p.visible) return;
          const s = P(p.position);
          glowText(g, LET[k], s[0], s[1] + 8, `500 24px ${F_MONO}`, '#04060b', partsA * clamp((T - 86.9 - k * 0.07) / 0.3), 0, 'center');
        });
        const l = P(new THREE.Vector3(-2.35, 1.5, 0)), r = P(new THREE.Vector3(2.35, 1.5, 0));
        glowText(g, 'LEFT BOX', l[0], l[1] + 6, `500 14px ${F_MONO}`, COL.ivory, partsA * 0.6, 0, 'center', 4);
        glowText(g, 'RIGHT BOX', r[0], r[1] + 6, `500 14px ${F_MONO}`, COL.ivory, partsA * 0.6, 0, 'center', 4);
      }
      annotate(g, T, 88.6, 90.0, 960, 560 - 120, 'EVERY CARD IS ONE ARRANGEMENT', COL.violet, 'center', 'called a microstate');
      // "1 way" tag next to card 0
      const w1 = smooth(seg(T, wordT(13, 'one'), wordT(13, 'one') + 0.5)) * (1 - smooth(seg(T, 92.4, 92.9)));
      if (w1 > 0) {
        const s = P(cardWorld[0]);
        glowText(g, '1 WAY', s[0] + 80, s[1] - 100, `400 64px ${F_SERIF}`, COL.gold, w1, 20, 'left');
      }
      // histogram labels
      const hist = smooth(seg(T, tSort + 0.7, tSort + 1.4)) * (1 - smooth(seg(T, 94.9, 95.4)));
      if (hist > 0) {
        const nums = [1, 4, 6, 4, 1];
        for (let col = 0; col < 5; col++) {
          const base = P(new THREE.Vector3((col - 2) * 3.4, -2.55 - 0.75, 0));
          const topY = -2.55 + (nums[col] - 1) * 0.62;
          const top = P(new THREE.Vector3((col - 2) * 3.4, topY + 0.9, 0));
          const hot = col === 2;
          glowText(g, String(nums[col]), base[0], top[1] - 6, `400 ${hot ? 76 : 54}px ${F_SERIF}`, hot ? COL.violet : COL.ivory, hist, hot ? 24 : 0, 'center');
          glowText(g, `${4 - col} | ${col}`, base[0], base[1] + 26, `500 15px ${F_MONO}`, hot ? COL.violet : COL.ivory, hist * 0.75, 0, 'center', 3);
        }
        glowText(g, 'ARRANGEMENTS FOR EACH SPLIT', 960, 905 - 42, `500 13px ${F_MONO}`, COL.ivory, hist * 0.0, 0, 'center', 4);
        glowText(g, 'WAYS', 262, 650, `500 14px ${F_MONO}`, COL.ivory, hist * 0.55, 0, 'left', 5);
      }
      glowText(g, '', 0, 0, F_MONO, '#000', 0);
      void eOut5; void rnd;

      // ================= PHASE C: the distribution sharpens =================
      const pa = smooth(seg(T, 95.0, 95.8)) * (1 - smooth(seg(T, 107.0, 107.5)));
      if (pa <= 0) return;
      const lN = logN(T);
      const N = Math.pow(10, lN);
      const x0 = 300, x1 = 1620, base = 790, hgt = 380;
      g.save();
      g.globalAlpha = pa;

      // axes
      g.strokeStyle = 'rgba(243,237,226,0.25)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x0 - 20, base); g.lineTo(x1 + 20, base); g.stroke();
      for (const [f, lab] of [[0, 'ALL ON ONE SIDE'], [0.5, 'EVENLY SPREAD'], [1, 'ALL ON THE OTHER']] as [number, string][]) {
        const px = lerp(x0, x1, f);
        g.beginPath(); g.moveTo(px, base); g.lineTo(px, base + 10); g.stroke();
        glowText(g, lab, px, base + 36, `500 13px ${F_MONO}`, COL.ivory, 0.6, 0, f === 0 ? 'left' : f === 1 ? 'right' : 'center', 4);
      }
      glowText(g, 'HOW THE PARTICLES ARE SPLIT BETWEEN THE TWO BOXES', 960, base + 76, `400 13px ${F_MONO}`, COL.ivory, 0.4, 0, 'center', 3);

      const n = Math.round(N);
      const exact = N < 60;
      const sig = 0.5 / Math.sqrt(N);
      const barAlpha = 1 - smooth(seg(N, 8, 60));
      // probability density (normalised to peak)
      const pdf = (f: number) => Math.exp(-((f - 0.5) * (f - 0.5)) / (2 * sig * sig));
      if (exact || barAlpha > 0.01) {
        const nn = Math.min(n, 60);
        let maxL = -1e9;
        for (let k = 0; k <= nn; k++) maxL = Math.max(maxL, lchoose(nn, k));
        const bw = ((x1 - x0) / nn) * 0.78;
        g.save();
        g.globalAlpha = pa * barAlpha;
        for (let k = 0; k <= nn; k++) {
          const hh = Math.exp(lchoose(nn, k) - maxL) * hgt;
          const px = lerp(x0, x1, k / nn);
          const mid = Math.abs(k / nn - 0.5) < 0.01;
          const gr = g.createLinearGradient(0, base - hh, 0, base);
          gr.addColorStop(0, mid ? '#c9bfff' : '#9b8cff'); gr.addColorStop(1, 'rgba(155,140,255,0.15)');
          g.fillStyle = gr;
          g.shadowColor = '#9b8cff'; g.shadowBlur = 16;
          roundRect(g, px - bw / 2, base - Math.max(3, hh), bw, Math.max(3, hh), Math.min(8, bw / 2));
          g.fill();
        }
        g.restore();
      }
      if (N >= 8) {
        // curve / needle
        const ca = smooth(seg(N, 8, 80));
        const steps = 400;
        g.save();
        g.globalAlpha = pa * ca;
        const wpx = sig * (x1 - x0);
        if (wpx > 2.2) {
          g.beginPath();
          for (let i = 0; i <= steps; i++) {
            const f = i / steps;
            const px = lerp(x0, x1, f), py = base - pdf(f) * hgt;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.strokeStyle = '#d8d0ff'; g.lineWidth = 4; g.shadowColor = '#9b8cff'; g.shadowBlur = 24; g.stroke();
          g.lineTo(x1, base); g.lineTo(x0, base); g.closePath();
          const fg = g.createLinearGradient(0, base - hgt, 0, base);
          fg.addColorStop(0, 'rgba(155,140,255,0.45)'); fg.addColorStop(1, 'rgba(155,140,255,0.02)');
          g.fillStyle = fg; g.shadowBlur = 0; g.fill();
        } else {
          // needle: sub-pixel wide
          const px = lerp(x0, x1, 0.5);
          const grad = g.createLinearGradient(0, base - hgt, 0, base);
          grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, 'rgba(155,140,255,0.4)');
          g.strokeStyle = grad; g.lineWidth = 3.5; g.shadowColor = '#b9acff'; g.shadowBlur = 30;
          g.beginPath(); g.moveTo(px, base); g.lineTo(px, base - hgt - 10 * Math.sin(T * 6) * 0); g.stroke();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(px, base - hgt, 7, 0, 6.283); g.fill();
        }
        g.restore();
      }

      // the "gathered" end marker
      const em = smooth(seg(T, wordT(14, 'gathered') - 0.2, wordT(14, 'gathered') + 0.5));
      if (em > 0) {
        const pulse = 0.6 + 0.4 * Math.sin(T * 6);
        g.save();
        g.globalAlpha = em * pa;
        g.fillStyle = COL.ember; g.shadowColor = COL.ember; g.shadowBlur = 24 * pulse;
        g.beginPath(); g.arc(x0, base - 6, 9 + 3 * pulse, 0, 6.283); g.fill();
        g.restore();
        glowText(g, 'GATHERED', x0, base - 38, `500 15px ${F_MONO}`, COL.ember, em * pa, 8, 'left', 5);
      }
      const sm2 = smooth(seg(T, wordT(14, 'Spread') - 0.1, wordT(14, 'Spread') + 0.6)) * (1 - smooth(seg(T, 102.2, 102.8)));
      if (sm2 > 0) glowText(g, 'SPREAD OUT', 960, base - hgt - 28, `500 15px ${F_MONO}`, COL.violet, sm2 * pa, 8, 'center', 5);

      // forbidden? no.  improbable.
      const tf = wordT(14, 'forbidden');
      const fa = smooth(seg(T, tf, tf + 0.5)) * (1 - smooth(seg(T, 104.3, 104.8)));
      if (fa > 0) {
        g.save();
        g.globalAlpha = fa * pa;
        g.setLineDash([10, 10]);
        g.strokeStyle = COL.ember; g.lineWidth = 2.5; g.shadowColor = COL.ember; g.shadowBlur = 12;
        g.beginPath();
        g.moveTo(960, base - hgt + 20);
        g.bezierCurveTo(800, base - hgt - 20, 480, base - hgt - 10, x0 + 14, base - 40);
        g.stroke();
        g.restore();
        glowText(g, 'ALLOWED BY THE LAWS OF PHYSICS', 900, base - hgt - 40, `500 14px ${F_MONO}`, COL.ember, fa * pa, 6, 'center', 4);
      }

      // N readout
      glowText(g, 'PARTICLES', 96, 160, `500 14px ${F_MONO}`, COL.ivory, 0.6, 0, 'left', 5);
      drawNumber(g, N, 96, 236, 84, COL.ivory);
      glowText(g, 'WAYS TO ARRANGE THEM', 96, 300, `500 14px ${F_MONO}`, COL.ivory, 0.6, 0, 'left', 5);
      const lw = lN * 0.30103; // wait: this is log10(2^N) computed below with real N
      void lw;
      drawPow2(g, N, 96, 366, 60, COL.violet);
      // chance of "all gathered"
      const pb = smooth(seg(T, 102.0, 103.2));
      if (pb > 0) {
        glowText(g, 'CHANCE OF GOING BACK', 1824, 160, `500 14px ${F_MONO}`, COL.ivory, 0.6 * pb, 0, 'right', 5);
        drawChance(g, N, 1824, 236, 54, COL.ember, pb);
      }
      g.restore();
    },
  };
}

// ---------- number formatting ----------
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (s: string) => s.replace(/[0-9]/g, (d) => SUP[+d]);

function fmtBig(v: number): string {
  // v can be < 1e21 as a number
  if (v < 1e4) return Math.round(v).toLocaleString('en-US');
  const e = Math.floor(Math.log10(v));
  if (e < 7) return Math.round(v).toLocaleString('en-US');
  const m = v / Math.pow(10, e);
  return `${m.toFixed(1)} × 10${sup(String(e))}`;
}
function drawNumber(g: CanvasRenderingContext2D, N: number, x: number, y: number, size: number, color: string) {
  glowText(g, fmtBig(N), x, y, `400 ${size}px ${F_SERIF}`, color, 1, 0, 'left');
}
/** 2^N where N may be astronomically large: show as 10^(0.301 N) */
function drawPow2(g: CanvasRenderingContext2D, N: number, x: number, y: number, size: number, color: string) {
  if (N < 24) {
    glowText(g, Math.round(Math.pow(2, Math.round(N))).toLocaleString('en-US'), x, y, `400 ${size}px ${F_SERIF}`, color, 1, 14, 'left');
    return;
  }
  const e = N * 0.30103;
  g.save();
  g.font = `400 ${size}px ${F_SERIF}`;
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 14;
  g.fillText('10', x, y);
  const w = g.measureText('10').width;
  g.font = `400 ${size * 0.55}px ${F_SERIF}`;
  g.fillText(e < 1e6 ? Math.round(e).toLocaleString('en-US') : fmtBig(e), x + w + 4, y - size * 0.48);
  g.restore();
}
function drawChance(g: CanvasRenderingContext2D, N: number, x: number, y: number, size: number, color: string, a: number) {
  const e = N * 0.30103;
  g.save();
  g.globalAlpha = a;
  g.textAlign = 'right';
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 16;
  const expStr = e < 1e6 ? Math.round(e).toLocaleString('en-US') : fmtBig(e);
  g.font = `400 ${size * 0.55}px ${F_SERIF}`;
  const ew = g.measureText(expStr).width;
  g.fillText(expStr, x, y - size * 0.45);
  g.font = `400 ${size}px ${F_SERIF}`;
  const tw = g.measureText('1 in 10').width;
  g.fillText('1 in 10', x - ew - 4, y);
  void tw;
  g.restore();
}

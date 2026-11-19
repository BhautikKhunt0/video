import * as THREE from 'three';
import {
  VScene, Ctx, COL, F_SERIF, F_MONO, chapterTag, seg, clamp, lerp, eIO2, eOut3, eOut5, smooth, wordT, glowText, mulberry32, hex, lerpColor, roundRect,
} from '../core';
import { spokenLine, annotate } from './ui';
import { makePointsMaterial } from '../particles';
import { runSim, SIM } from './atomsSim';

export const ATOMS_T0 = 58.8;
export const ATOMS_T1 = 85.0;

type C3 = [number, number, number];
const STOPS: [number, C3][] = [
  [0.0, hex('#2a52ff')],
  [0.3, hex('#4cc9ff')],
  [1.0, hex('#fff1dc')],
  [1.7, hex('#ffa23a')],
  [2.8, hex('#ff4a1c')],
];
export function ramp(x: number): C3 {
  if (x <= 0) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    if (x <= STOPS[i][0]) {
      const t = (x - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0]);
      return lerpColor(STOPS[i - 1][1], STOPS[i][1], t);
    }
  }
  return STOPS[STOPS.length - 1][1];
}

const LAYERS = 4;
const LAG = [0, 3, 6, 10];
const L_ALPHA = [1.0, 0.5, 0.28, 0.12];
const NCOL = 28;

export function createAtoms(): VScene {
  const group = new THREE.Group();
  const tOpen = wordT(10, 'collide') - 0.45;
  const sim = runSim(ATOMS_T1 - ATOMS_T0 + 0.5, tOpen - ATOMS_T0);
  const N = SIM.N;
  const rnd = mulberry32(5);
  const zs = new Float32Array(N);
  for (let i = 0; i < N; i++) zs[i] = (rnd() - 0.5) * 2.4;

  // particles with trails
  const NV = N * LAYERS;
  const pos = new Float32Array(NV * 3), col = new Float32Array(NV * 3), size = new Float32Array(NV), alp = new Float32Array(NV);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
  const pts = new THREE.Points(geo, makePointsMaterial(true));
  pts.frustumCulled = false;
  group.add(pts);

  // box frame
  const hw = SIM.BW / 2, hh = SIM.BH / 2, hd = 1.6;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(SIM.BW, SIM.BH, hd * 2)), new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.5 }));
  group.add(edges);
  // translucent glass panels
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(SIM.BW, SIM.BH), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.02, blending: THREE.AdditiveBlending, depthWrite: false }));
  panel.position.z = hd;
  group.add(panel);

  // thermal back wall (vertex-coloured columns)
  const wallGeo = new THREE.PlaneGeometry(SIM.BW, SIM.BH, NCOL, 1);
  const wallCol = new Float32Array((NCOL + 1) * 2 * 3);
  wallGeo.setAttribute('color', new THREE.BufferAttribute(wallCol, 3));
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  wall.position.z = -hd;
  group.add(wall);

  // floor grid for depth / parallax
  const grid = new THREE.GridHelper(40, 40, 0x3b4f7a, 0x1a2540);
  grid.position.y = -hh - 0.01;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.35;
  group.add(grid);

  // divider
  const divider = new THREE.Group();
  const divPlane = new THREE.Mesh(new THREE.PlaneGeometry(hd * 2, SIM.BH), new THREE.MeshBasicMaterial({ color: 0x78d6ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  divPlane.rotation.y = Math.PI / 2;
  const divLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.02, SIM.BH, hd * 2)), new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.9 }));
  divider.add(divPlane, divLine);
  group.add(divider);

  const colVals = new Float32Array(NCOL);
  let meanL = 0, meanR = 0, curF = 0;

  const tVel0 = wordT(9, 'Heat');
  const tCollide = wordT(10, 'collide');
  const tEnergyShow = wordT(11, 'Energy');
  const tBack = wordT(12, 'never');
  const tCounting = wordT(12, 'counting');

  const idx = (f: number) => clamp(Math.floor(f), 0, sim.frames - 1);

  return {
    start: ATOMS_T0,
    end: ATOMS_T1,
    group,
    update(T, c: Ctx) {
      c.env.intensity = 0;
      const f = idx((T - ATOMS_T0) * SIM.FPS);
      curF = f;
      // particles
      const E = sim.meanE;
      for (let l = 0; l < LAYERS; l++) {
        const ff = idx(f - LAG[l]);
        for (let i = 0; i < N; i++) {
          const v = l * N + i;
          const e = sim.en[ff * N + i];
          const x = sim.pos[(ff * N + i) * 2], y = sim.pos[(ff * N + i) * 2 + 1];
          pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = zs[i];
          const r = ramp(e / E);
          col[v * 3] = r[0]; col[v * 3 + 1] = r[1]; col[v * 3 + 2] = r[2];
          const sp = Math.sqrt(e / E);
          size[v] = (0.2 + 0.13 * Math.min(2.2, sp)) * (1 - l * 0.16);
          alp[v] = L_ALPHA[l] * (0.45 + 0.3 * Math.min(1.5, sp));
          if (l > 0 && sp < 0.6) alp[v] *= 0.4;
        }
      }
      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
      (geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (geo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;

      // column temperatures
      const sum = new Float32Array(NCOL), cnt = new Float32Array(NCOL);
      let sl = 0, nl = 0, sr = 0, nr = 0;
      for (let i = 0; i < N; i++) {
        const x = sim.pos[(f * N + i) * 2];
        const e = sim.en[f * N + i];
        const k = Math.min(NCOL - 1, Math.max(0, Math.floor(((x + hw) / SIM.BW) * NCOL)));
        sum[k] += e; cnt[k]++;
        if (x < 0) { sl += e; nl++; } else { sr += e; nr++; }
      }
      meanL = sl / Math.max(1, nl); meanR = sr / Math.max(1, nr);
      const raw = new Float32Array(NCOL);
      for (let k = 0; k < NCOL; k++) raw[k] = cnt[k] > 0 ? sum[k] / cnt[k] : -1;
      for (let k = 0; k < NCOL; k++) {
        let a = 0, w = 0;
        for (let d = -3; d <= 3; d++) {
          const j = k + d;
          if (j < 0 || j >= NCOL || raw[j] < 0) continue;
          const ww = (4 - Math.abs(d)) * Math.max(1, cnt[j]);
          a += raw[j] * ww; w += ww;
        }
        colVals[k] = w > 0 ? a / w : E;
      }
      for (let k = 0; k <= NCOL; k++) {
        const v = colVals[Math.min(NCOL - 1, k)] / E;
        const r = ramp(v);
        for (let row = 0; row < 2; row++) {
          const o = (row * (NCOL + 1) + k) * 3;
          wallCol[o] = r[0] * 0.5; wallCol[o + 1] = r[1] * 0.5; wallCol[o + 2] = r[2] * 0.5;
        }
      }
      (wallGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

      // divider opens
      const od = eIO2(seg(T, tOpen, tOpen + 1.0));
      divider.position.y = od * (SIM.BH + 1);
      divider.visible = od < 0.999;
      (divLine.material as THREE.LineBasicMaterial).opacity = 0.9 * (1 - od);

      // camera
      const arrive = eOut3(seg(T, ATOMS_T0, ATOMS_T0 + 2.4));
      const tail = eIO2(seg(T, 80.4, 85.0));
      const z = lerp(31, 24, arrive) + tail * 3;
      const x = Math.sin((T - 60) * 0.2) * 1.8;
      c.cam.position.set(x, 0.4 + Math.sin((T - 60) * 0.16) * 0.5, z);
      c.cam.lookAt(0, -0.75, 0);
      c.cam.fov = 35;
      c.dustTint.set('#8fb4ff');

      // fx: zoom-in arrival
      c.fx.zoom += (1 - smooth(seg(T, ATOMS_T0, ATOMS_T0 + 0.9))) * 0.55;
      c.fx.zoomCx = 0.5; c.fx.zoomCy = 0.5;
      c.fx.flash += (1 - seg(T, ATOMS_T0, ATOMS_T0 + 0.5)) * 0.6;
      c.fx.bloom = 0.8;
      // exit: whiteout into the counting world
      c.fx.flash += smooth(seg(T, 84.55, 85.0)) * 0.9;
      c.fx.zoom += smooth(seg(T, 84.4, 85.0)) * 0.3;
    },
    draw(T, g, c: Ctx) {
      const P = (x: number, y: number, z = 0) => c.project(new THREE.Vector3(x, y, z));
      chapterTag(g, '03', 'Heat is motion', seg(T, 59.4, 60.2), COL.ember);

      // --- kinetic headline run
      spokenLine(g, T, 9, 0, 4, 960, 960, `italic 400 70px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 60.5, hideDur: 0.4, colors: { zoom: COL.ember } });
      spokenLine(g, T, 9, 5, 8, 960, 960, `italic 400 70px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 62.2, hideDur: 0.4 });
      spokenLine(g, T, 9, 9, 10, 960, 960, `italic 400 96px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 63.7, hideDur: 0.4, colors: { motion: COL.ember } });
      spokenLine(g, T, 10, 0, 6, 960, 960, `italic 400 70px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 67.1, hideDur: 0.3, colors: { hot: COL.ember, violently: COL.fire } });
      spokenLine(g, T, 10, 7, 11, 960, 960, `italic 400 70px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 69.4, hideDur: 0.3, colors: { ice: COL.ice, tremble: COL.ice } });
      spokenLine(g, T, 10, 12, 17, 960, 960, `italic 400 70px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 71.9, hideDur: 0.3, colors: { collide: COL.gold, energy: COL.gold } });
      spokenLine(g, T, 10, 18, 21, 960, 960, `italic 400 70px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 73.4, hideDur: 0.3, colors: { fast: COL.ember } });
      spokenLine(g, T, 10, 22, 25, 960, 960, `italic 400 70px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 74.9, hideDur: 0.3, colors: { slow: COL.ice } });
      spokenLine(g, T, 11, 0, 2, 960, 960, `italic 400 76px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 76.5, hideDur: 0.3, colors: { lost: COL.fire } });
      spokenLine(g, T, 11, 3, 6, 960, 960, `italic 400 76px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 80.3, hideDur: 0.4, colors: { spreads: COL.gold, out: COL.gold } });
      spokenLine(g, T, 12, 0, 8, 960, 960, `italic 400 70px ${F_SERIF}`, COL.ivory, { align: 'center', hideAt: 83.5, hideDur: 0.35, colors: { never: COL.fire } });

      // --- velocity vectors: "heat is motion"
      const va = smooth(seg(T, tVel0 + 0.5, tVel0 + 1.1)) * (1 - smooth(seg(T, 63.4, 64.0)));
      if (va > 0) {
        const f = clamp(Math.floor((T - ATOMS_T0) * SIM.FPS), 0, sim.frames - 2);
        g.save();
        g.lineCap = 'round';
        for (let k = 0; k < 30; k++) {
          const i = k < 16 ? (k * 4 + 3) % SIM.N_HOT : SIM.N_HOT + ((k * 9) % (N - SIM.N_HOT));
          const x = sim.pos[(f * N + i) * 2], y = sim.pos[(f * N + i) * 2 + 1];
          const x2 = sim.pos[((f + 2) * N + i) * 2], y2 = sim.pos[((f + 2) * N + i) * 2 + 1];
          const vx = (x2 - x) * 10, vy = (y2 - y) * 10;
          const p0 = P(x, y, zs[i]), p1 = P(x + vx, y + vy, zs[i]);
          const rc = ramp(sim.en[f * N + i] / sim.meanE);
          const cs = `rgb(${rc[0] * 255 | 0},${rc[1] * 255 | 0},${rc[2] * 255 | 0})`;
          g.globalAlpha = va * 0.9;
          g.strokeStyle = cs;
          g.shadowColor = cs;
          g.shadowBlur = 10;
          g.lineWidth = 2.5;
          g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
          const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
          const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          if (L > 12) {
            g.beginPath();
            g.moveTo(p1[0], p1[1]);
            g.lineTo(p1[0] - Math.cos(ang - 0.45) * 11, p1[1] - Math.sin(ang - 0.45) * 11);
            g.moveTo(p1[0], p1[1]);
            g.lineTo(p1[0] - Math.cos(ang + 0.45) * 11, p1[1] - Math.sin(ang + 0.45) * 11);
            g.stroke();
          }
        }
        g.restore();
      }

      // --- side labels
      const lh = P(-3.5, hh + 0.5, 0), lc = P(3.5, hh + 0.5, 0);
      const ha = smooth(seg(T, 64.2, 64.9)) * (1 - smooth(seg(T, 74.6, 75.0)));
      if (ha > 0) {
        g.save(); g.globalAlpha = ha;
        glowText(g, 'HOT COFFEE', lh[0], lh[1] - 26, `500 18px ${F_MONO}`, COL.ember, 1, 10, 'center', 5);
        glowText(g, 'fast, violent molecules', lh[0], lh[1], `400 14px ${F_MONO}`, COL.ivory, 0.6, 0, 'center', 1);
        g.restore();
      }
      const ca = smooth(seg(T, 67.6, 68.3)) * (1 - smooth(seg(T, 74.6, 75.0)));
      if (ca > 0) {
        g.save(); g.globalAlpha = ca;
        glowText(g, 'ICE', lc[0], lc[1] - 26, `500 18px ${F_MONO}`, COL.ice, 1, 10, 'center', 5);
        glowText(g, 'slow, trembling molecules', lc[0], lc[1], `400 14px ${F_MONO}`, COL.ivory, 0.6, 0, 'center', 1);
        g.restore();
      }
      annotate(g, T, tCollide, tCollide + 2.0, P(0, -hh - 0.2)[0], 780, 'COLLISIONS SHARE ENERGY', COL.gold, 'center');

      // --- thermal strip
      const sa = smooth(seg(T, 64.6, 65.4)) * (1 - smooth(seg(T, 83.5, 84.1)));
      if (sa > 0) {
        const a = P(-hw, -hh, 0), b = P(hw, -hh, 0);
        const x0 = a[0], x1 = b[0], y0 = 826, h = 22;
        g.save();
        g.globalAlpha = sa;
        glowText(g, 'TEMPERATURE ACROSS THE BOX', x0, y0 - 18, `500 13px ${F_MONO}`, COL.ivory, 0.7, 0, 'left', 3);
        const gr = g.createLinearGradient(x0, 0, x1, 0);
        for (let k = 0; k < NCOL; k++) {
          const r = ramp(colVals[k] / sim.meanE);
          gr.addColorStop((k + 0.5) / NCOL, `rgb(${r[0] * 255 | 0},${r[1] * 255 | 0},${r[2] * 255 | 0})`);
        }
        roundRect(g, x0, y0, x1 - x0, h, 11);
        g.fillStyle = gr;
        g.shadowColor = 'rgba(255,200,150,0.5)';
        g.shadowBlur = 18;
        g.fill();
        g.shadowBlur = 0;
        // temperature curve above strip
        g.beginPath();
        const emax = 40;
        for (let k = 0; k < NCOL; k++) {
          const px = lerp(x0, x1, (k + 0.5) / NCOL);
          const py = y0 + h + 14 + 46 - (clamp(colVals[k] / emax) * 46);
          if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokeStyle = COL.ivory; g.lineWidth = 2.5; g.shadowColor = '#fff'; g.shadowBlur = 8; g.stroke();
        g.shadowBlur = 0;
        g.globalAlpha = sa * 0.25;
        g.strokeStyle = COL.ivory; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x0, y0 + h + 60); g.lineTo(x1, y0 + h + 60); g.stroke();
        g.restore();
        glowText(g, 'HOT', x1 + 0, y0 - 18, `500 13px ${F_MONO}`, COL.ember, sa * 0, 0, 'right', 3);
      }

      // --- energy-per-molecule gauge + conservation
      const ga = smooth(seg(T, tEnergyShow, tEnergyShow + 0.8)) * (1 - smooth(seg(T, 83.5, 84.1)));
      if (ga > 0) {
        const cx = 960, cy = 128;
        g.save();
        g.globalAlpha = ga;
        glowText(g, 'AVERAGE ENERGY PER MOLECULE', cx, cy - 46, `500 13px ${F_MONO}`, COL.ivory, 0.65, 0, 'center', 4);
        const bw = 420, bh = 14;
        const E = sim.meanE;
        const lv = clamp(meanL / (E * 1.7)), rv = clamp(meanR / (E * 1.7));
        // left bar (hot half)
        g.fillStyle = 'rgba(243,237,226,0.1)';
        roundRect(g, cx - bw - 170, cy - 8, bw, bh, 7); g.fill();
        roundRect(g, cx + 170, cy - 8, bw, bh, 7); g.fill();
        const lc2 = ramp(meanL / E), rc2 = ramp(meanR / E);
        g.fillStyle = `rgb(${lc2[0] * 255 | 0},${lc2[1] * 255 | 0},${lc2[2] * 255 | 0})`;
        g.shadowColor = g.fillStyle as string; g.shadowBlur = 14;
        roundRect(g, cx - 170 - bw * lv, cy - 8, bw * lv, bh, 7); g.fill();
        g.fillStyle = `rgb(${rc2[0] * 255 | 0},${rc2[1] * 255 | 0},${rc2[2] * 255 | 0})`;
        g.shadowColor = g.fillStyle as string;
        roundRect(g, cx + 170, cy - 8, bw * rv, bh, 7); g.fill();
        g.restore();
        glowText(g, 'LEFT HALF', cx - 180 - bw, cy + 40, `500 13px ${F_MONO}`, COL.ember, ga, 0, 'left', 3);
        glowText(g, 'RIGHT HALF', cx + 180 + bw, cy + 40, `500 13px ${F_MONO}`, COL.ice, ga, 0, 'right', 3);
        glowText(g, 'TOTAL ENERGY', cx, cy + 4, `500 12px ${F_MONO}`, COL.ivory, ga * 0.8, 0, 'center', 3);
        glowText(g, '100.0 %', cx, cy + 34, `400 28px ${F_SERIF}`, COL.ivory, ga, 0, 'center');
      }

      // --- "why not the reverse?"
      const ra = smooth(seg(T, 81.0, 81.7)) * (1 - smooth(seg(T, 83.7, 84.2)));
      if (ra > 0) {
        const a = P(-hw, hh, 0), b = P(0, -hh, 0);
        g.save();
        g.globalAlpha = ra;
        g.setLineDash([12, 10]);
        g.strokeStyle = COL.ember;
        g.lineWidth = 2.5;
        g.shadowColor = COL.ember; g.shadowBlur = 14;
        g.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
        g.restore();
        glowText(g, 'ALL THE ENERGY, BACK HERE?', (a[0] + b[0]) / 2, a[1] + 40, `500 17px ${F_MONO}`, COL.ember, ra, 8, 'center', 4);
        const xa = smooth(seg(T, tBack, tBack + 0.5));
        if (xa > 0) glowText(g, '✕', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 40, `300 150px ${F_SERIF}`, COL.fire, xa * ra, 30, 'center');
      }

      // --- COUNTING reveal
      const q = smooth(seg(T, tCounting - 0.9, tCounting - 0.3));
      if (q > 0 && T < 85.2) {
        g.save();
        g.globalAlpha = q * 0.62;
        g.fillStyle = '#04060b';
        g.fillRect(0, 0, 1920, 1080);
        g.restore();
        glowText(g, 'THE ANSWER IS', 960, 440, `500 20px ${F_MONO}`, COL.ivory, q * 0.8, 0, 'center', 8);
        const word = 'COUNTING';
        g.save();
        g.font = `400 230px ${F_SERIF}`;
        (g as any).letterSpacing = '10px';
        const tw = g.measureText(word).width;
        let cx = 960 - tw / 2;
        for (let i = 0; i < word.length; i++) {
          const w = g.measureText(word[i]).width + 10;
          const p = eOut5(clamp((T - tCounting - i * 0.045) / 0.6));
          g.globalAlpha = p;
          g.fillStyle = COL.ivory;
          g.shadowColor = COL.ember; g.shadowBlur = 40 * p;
          g.fillText(word[i], cx, 640 + (1 - p) * 70);
          cx += w;
        }
        g.restore();
        void F_MONO;
      }
      void curF;
    },
  };
}

import { mulberry32 } from '../core';

export const SIM = {
  N: 420,
  N_HOT: 72,
  BW: 14,
  BH: 8,
  R: 0.12,
  SIG_HOT: 6.0,
  SIG_COLD: 2.7,
  FPS: 60,
  TIME_LAPSE: 1.4,
  SUBSTEPS: 6,
};

export interface SimData {
  frames: number;
  pos: Float32Array; // frames*N*2
  en: Float32Array; // frames*N (kinetic energy, 0.5 v^2)
  meanE: number;
}

/** Deterministic hard-disc gas with a removable divider. */
export function runSim(totalSeconds: number, openAt: number): SimData {
  const { N, N_HOT, BW, BH, R, SIG_HOT, SIG_COLD, FPS, SUBSTEPS, TIME_LAPSE } = SIM;
  const rnd = mulberry32(777);
  const gauss = () => (rnd() + rnd() + rnd() + rnd() + rnd() + rnd() - 3) * 1.414;
  const x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  const hw = BW / 2, hh = BH / 2;
  // place on a jittered lattice, left half hot, right half cold
  const cols = 44, rows = 25;
  const slots: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push([-hw + R + ((c + 0.5) / cols) * (BW - 2 * R), -hh + R + ((r + 0.5) / rows) * (BH - 2 * R)]);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const left = slots.filter((s) => s[0] < -0.2), right = slots.filter((s) => s[0] > 0.2);
  for (let i = 0; i < N; i++) {
    const hot = i < N_HOT;
    const s = hot ? left[i % left.length] : right[(i - N_HOT) % right.length];
    x[i] = s[0] + (rnd() - 0.5) * 0.08;
    y[i] = s[1] + (rnd() - 0.5) * 0.08;
    const sg = hot ? SIG_HOT : SIG_COLD;
    vx[i] = gauss() * sg;
    vy[i] = gauss() * sg;
  }
  const side = new Int8Array(N);
  for (let i = 0; i < N; i++) side[i] = x[i] < 0 ? -1 : 1;
  const frames = Math.floor(totalSeconds * FPS);
  const pos = new Float32Array(frames * N * 2);
  const en = new Float32Array(frames * N);
  const dt = (TIME_LAPSE / FPS) / SUBSTEPS;
  const cell = 0.4;
  const gx = Math.ceil(BW / cell) + 2, gy = Math.ceil(BH / cell) + 2;
  const head = new Int32Array(gx * gy), next = new Int32Array(N);
  const d2 = 4 * R * R;
  let meanE = 0;
  for (let i = 0; i < N; i++) meanE += 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]);
  meanE /= N;
  for (let f = 0; f < frames; f++) {
    const open = f / FPS >= openAt;
    for (let s = 0; s < SUBSTEPS; s++) {
      for (let i = 0; i < N; i++) {
        const ox = x[i];
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
        if (x[i] < -hw + R) { x[i] = -hw + R; vx[i] = Math.abs(vx[i]); }
        if (x[i] > hw - R) { x[i] = hw - R; vx[i] = -Math.abs(vx[i]); }
        if (y[i] < -hh + R) { y[i] = -hh + R; vy[i] = Math.abs(vy[i]); }
        if (y[i] > hh - R) { y[i] = hh - R; vy[i] = -Math.abs(vy[i]); }
        if (!open) {
          if (side[i] < 0 && x[i] > -R) { x[i] = -R; vx[i] = -Math.abs(vx[i]); }
          if (side[i] > 0 && x[i] < R) { x[i] = R; vx[i] = Math.abs(vx[i]); }
        }
        void ox;
      }
      head.fill(-1);
      for (let i = 0; i < N; i++) {
        const cx = Math.floor((x[i] + hw) / cell) + 1, cy = Math.floor((y[i] + hh) / cell) + 1;
        const k = cy * gx + cx;
        next[i] = head[k];
        head[k] = i;
      }
      for (let i = 0; i < N; i++) {
        const cx = Math.floor((x[i] + hw) / cell) + 1, cy = Math.floor((y[i] + hh) / cell) + 1;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            let j = head[(cy + oy) * gx + cx + ox];
            while (j >= 0) {
              if (j > i) {
                const dx = x[j] - x[i], dy = y[j] - y[i];
                const dd = dx * dx + dy * dy;
                if (dd < d2 && dd > 1e-9 && (open || side[i] === side[j])) {
                  // block pair interaction through a closed divider
                  const rvx = vx[j] - vx[i], rvy = vy[j] - vy[i];
                  const dist = Math.sqrt(dd);
                  const nx = dx / dist, ny = dy / dist;
                  const vn = rvx * nx + rvy * ny;
                  if (vn < 0) {
                    vx[i] += vn * nx; vy[i] += vn * ny;
                    vx[j] -= vn * nx; vy[j] -= vn * ny;
                  }
                  const ov = (2 * R - dist) * 0.5;
                  x[i] -= nx * ov; y[i] -= ny * ov;
                  x[j] += nx * ov; y[j] += ny * ov;
                }
              }
              j = next[j];
            }
          }
        }
      }
    }
    if (!open) for (let i = 0; i < N; i++) { if (side[i] < 0 && x[i] > -R) x[i] = -R; if (side[i] > 0 && x[i] < R) x[i] = R; }
    const base = f * N;
    for (let i = 0; i < N; i++) {
      pos[(base + i) * 2] = x[i];
      pos[(base + i) * 2 + 1] = y[i];
      en[base + i] = 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]);
    }
  }
  return { frames, pos, en, meanE };
}

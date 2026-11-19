import * as THREE from 'three';
import { F_SERIF, mulberry32 } from './core';

const vert = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vC;
varying float vA;
uniform float uPx;
uniform float uGlobal;
void main(){
  vC = aColor; vA = aAlpha * uGlobal;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uPx / max(0.1,-mv.z), 1.0, 160.0);
}`;
const frag = /* glsl */ `
varying vec3 vC; varying float vA;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d)*2.0;
  if (r>1.0) discard;
  float a = pow(1.0-r, 2.0);
  float core = pow(1.0-r, 7.0)*0.9;
  gl_FragColor = vec4(vC*(a*0.8+core)*vA, 1.0);
}`;

export function makePointsMaterial(depthTest = true) {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    depthTest,
    blending: THREE.AdditiveBlending,
    uniforms: { uPx: { value: 1000 }, uGlobal: { value: 1 } },
  });
}

export class ParticleField {
  n: number;
  pos: Float32Array;
  vel: Float32Array;
  tgt: Float32Array;
  col: Float32Array;
  ctgt: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
  stiff: Float32Array;
  zeta: Float32Array;
  phase: Float32Array;
  perm: Uint32Array;
  geo: THREE.BufferGeometry;
  points: THREE.Points;
  mat: THREE.ShaderMaterial;
  turb = 0;
  swirl = 0;
  stiffMul = 1;
  sizeMul = 1;
  simT = 0;
  constructor(n = 12000) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.tgt = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.ctgt = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.stiff = new Float32Array(n);
    this.zeta = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.perm = new Uint32Array(n);
    const r = mulberry32(1234);
    for (let i = 0; i < n; i++) {
      this.perm[i] = i;
      this.size[i] = 0.035 + r() * 0.07;
      this.alpha[i] = 0.5 + r() * 0.5;
      this.stiff[i] = 5 + r() * 14;
      this.zeta[i] = 0.45 + r() * 0.5;
      this.phase[i] = r() * 6.283;
    }
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = this.perm[i];
      this.perm[i] = this.perm[j];
      this.perm[j] = t;
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = makePointsMaterial(true);
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }

  /** deterministic reset */
  reset(fn: (i: number, p: Float32Array, o: number, rnd: () => number) => void, seed = 7) {
    const r = mulberry32(seed);
    for (let i = 0; i < this.n; i++) {
      fn(i, this.pos, i * 3, r);
      this.vel[i * 3] = this.vel[i * 3 + 1] = this.vel[i * 3 + 2] = 0;
      this.tgt[i * 3] = this.pos[i * 3];
      this.tgt[i * 3 + 1] = this.pos[i * 3 + 1];
      this.tgt[i * 3 + 2] = this.pos[i * 3 + 2];
    }
    this.simT = 0;
  }

  /** assign targets from a point list (m points) */
  assign(pts: Float32Array, color: (i: number, x: number, y: number, z: number) => [number, number, number], jitter = 0.02) {
    const m = pts.length / 3;
    const n = this.n;
    for (let i = 0; i < n; i++) {
      const idx = Math.min(m - 1, Math.floor(((this.perm[i] + 0.5) / n) * m));
      const x = pts[idx * 3],
        y = pts[idx * 3 + 1],
        z = pts[idx * 3 + 2];
      const ph = this.phase[i];
      this.tgt[i * 3] = x + Math.sin(ph * 7.1) * jitter;
      this.tgt[i * 3 + 1] = y + Math.cos(ph * 5.3) * jitter;
      this.tgt[i * 3 + 2] = z + Math.sin(ph * 3.7) * jitter;
      const c = color(i, x, y, z);
      this.ctgt[i * 3] = c[0];
      this.ctgt[i * 3 + 1] = c[1];
      this.ctgt[i * 3 + 2] = c[2];
    }
  }

  step(dt: number, T: number) {
    const { pos, vel, tgt, stiff, zeta, phase, col, ctgt } = this;
    const turb = this.turb,
      sw = this.swirl,
      sm = this.stiffMul;
    const cr = Math.min(1, dt * 3.2);
    for (let i = 0; i < this.n; i++) {
      const ix = i * 3;
      const k = stiff[i] * sm;
      const c = 2 * Math.sqrt(k) * zeta[i];
      let ax = k * (tgt[ix] - pos[ix]) - c * vel[ix];
      let ay = k * (tgt[ix + 1] - pos[ix + 1]) - c * vel[ix + 1];
      let az = k * (tgt[ix + 2] - pos[ix + 2]) - c * vel[ix + 2];
      if (turb > 0) {
        const ph = phase[i];
        ax += turb * Math.sin(pos[ix + 1] * 0.5 + T * 0.8 + ph);
        ay += turb * Math.sin(pos[ix + 2] * 0.5 + T * 0.7 + ph * 1.3);
        az += turb * Math.sin(pos[ix] * 0.5 + T * 0.9 + ph * 0.7);
      }
      if (sw !== 0) {
        ax += -pos[ix + 2] * sw;
        az += pos[ix] * sw;
      }
      vel[ix] += ax * dt;
      vel[ix + 1] += ay * dt;
      vel[ix + 2] += az * dt;
      pos[ix] += vel[ix] * dt;
      pos[ix + 1] += vel[ix + 1] * dt;
      pos[ix + 2] += vel[ix + 2] * dt;
      col[ix] += (ctgt[ix] - col[ix]) * cr;
      col[ix + 1] += (ctgt[ix + 1] - col[ix + 1]) * cr;
      col[ix + 2] += (ctgt[ix + 2] - col[ix + 2]) * cr;
    }
    this.simT += dt;
  }

  upload() {
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
  }
}

// ---------- point-cloud generators ----------
const textCache = new Map<string, Float32Array>();

/** Sample particles from rendered text. Returns xyz triplets, world units, centred. */
export function sampleText(
  text: string,
  worldWidth: number,
  opts: { font?: string; weight?: string; max?: number; step?: number; seed?: number } = {}
): Float32Array {
  const key = text + '|' + worldWidth + '|' + (opts.font ?? '') + (opts.weight ?? '');
  const hit = textCache.get(key);
  if (hit) return hit;
  const lines = text.split('\n');
  const cw = 2000,
    px = 360;
  const ch = Math.ceil(lines.length * px * 1.05 + 40);
  const cv = document.createElement('canvas');
  cv.width = cw;
  cv.height = ch;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const fam = opts.font ?? F_SERIF;
  let size = px;
  g.font = `${opts.weight ?? ''} ${size}px ${fam}`;
  const maxW = Math.max(...lines.map((l) => g.measureText(l).width));
  if (maxW > cw - 60) size = Math.floor((px * (cw - 60)) / maxW);
  g.font = `${opts.weight ?? ''} ${size}px ${fam}`;
  const wmax = Math.max(...lines.map((l) => g.measureText(l).width));
  lines.forEach((l, i) => g.fillText(l, cw / 2, 20 + (i + 0.5) * px * 1.05));
  const data = g.getImageData(0, 0, cw, ch).data;
  const step = opts.step ?? 3;
  const out: number[] = [];
  const r = mulberry32(opts.seed ?? 99);
  const scale = worldWidth / wmax;
  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      if (data[(y * cw + x) * 4 + 3] > 128) {
        out.push((x - cw / 2 + (r() - 0.5) * step) * scale, -(y - ch / 2 + (r() - 0.5) * step) * scale, (r() - 0.5) * 0.25);
      }
    }
  }
  // shuffle triplets
  const m = out.length / 3;
  const arr = new Float32Array(out.length);
  const idx = Array.from({ length: m }, (_, i) => i);
  for (let i = m - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const cap = opts.max ?? m;
  const take = Math.min(m, cap);
  const res = new Float32Array(take * 3);
  for (let i = 0; i < take; i++) {
    res[i * 3] = out[idx[i] * 3];
    res[i * 3 + 1] = out[idx[i] * 3 + 1];
    res[i * 3 + 2] = out[idx[i] * 3 + 2];
  }
  void arr;
  textCache.set(key, res);
  return res;
}

export function genPoints(m: number, fn: (i: number, r: () => number, out: number[]) => void, seed = 5): Float32Array {
  const r = mulberry32(seed);
  const res = new Float32Array(m * 3);
  const o = [0, 0, 0];
  for (let i = 0; i < m; i++) {
    fn(i, r, o);
    res[i * 3] = o[0];
    res[i * 3 + 1] = o[1];
    res[i * 3 + 2] = o[2];
  }
  return res;
}

export function gauss(r: () => number) {
  return (r() + r() + r() + r() - 2) * 1.2;
}

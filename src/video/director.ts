import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VO } from '../assets/voData';
import { W, H, DUR, COL, Ctx, VScene, defaultFX, F_SANS, mulberry32, clamp, roundRect } from './core';
import { ParticleField, makePointsMaterial } from './particles';
import { Post } from './post';
import { FieldScript } from './scenes/fieldScript';
import { createHook } from './scenes/hook';
import { createCoffee } from './scenes/coffee';
import { createGlass } from './scenes/glass';
import { createAtoms } from './scenes/atoms';
import { createCounting } from './scenes/counting';
import { createPayoff } from './scenes/payoff';

export const CHAPTERS = [
  { t: 0, name: 'The question' },
  { t: 20.8, name: 'The everyday arrow' },
  { t: 45, name: 'Broken things' },
  { t: 58.8, name: 'Heat is motion' },
  { t: 85, name: 'Counting' },
  { t: 107.6, name: 'Entropy, defined' },
];

export class Director {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);
  post!: Post;
  gl: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  comp: HTMLCanvasElement;
  compG: CanvasRenderingContext2D;
  scenes: VScene[] = [];
  field!: ParticleField;
  fieldScript!: FieldScript;
  dust!: THREE.Points;
  dustBase!: Float32Array;
  dustMats: THREE.ShaderMaterial[] = [];
  ctx!: Ctx;
  captions = false;
  scale = 1;
  lastT = -1;
  frameTimes: number[] = [];

  constructor() {
    this.gl = document.createElement('canvas');
    this.gl.width = W;
    this.gl.height = H;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.gl, antialias: false, powerPreference: 'high-performance', alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.overlay = document.createElement('canvas');
    this.overlay.width = W;
    this.overlay.height = H;
    this.g = this.overlay.getContext('2d')!;
    this.comp = document.createElement('canvas');
    this.comp.width = W;
    this.comp.height = H;
    this.compG = this.comp.getContext('2d')!;
  }

  async init(progress: (p: number, label: string) => void) {
    // fonts
    progress(0.02, 'Loading typography');
    await Promise.all([
      document.fonts.load(`400 100px "Instrument Serif"`),
      document.fonts.load(`italic 400 100px "Instrument Serif"`),
      document.fonts.load(`500 20px "JetBrains Mono"`),
      document.fonts.load(`400 20px "JetBrains Mono"`),
      document.fonts.load(`500 20px "Inter"`),
    ]).catch(() => {});

    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.background = new THREE.Color(COL.ink);
    this.scene.environmentIntensity = 0.5;

    this.post = new Post(this.renderer, this.scene, this.cam, W, H);

    // ambient dust
    const nd = 1500;
    this.dustBase = new Float32Array(nd * 3);
    const dpos = new Float32Array(nd * 3), dcol = new Float32Array(nd * 3), dsz = new Float32Array(nd), dal = new Float32Array(nd);
    const r = mulberry32(321);
    for (let i = 0; i < nd; i++) {
      this.dustBase[i * 3] = (r() - 0.5) * 60;
      this.dustBase[i * 3 + 1] = (r() - 0.5) * 28 + 2;
      this.dustBase[i * 3 + 2] = -22 + r() * 36;
      dcol[i * 3] = dcol[i * 3 + 1] = dcol[i * 3 + 2] = 1;
      dsz[i] = 0.04 + r() * 0.11;
      dal[i] = 0.1 + r() * 0.3;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    dg.setAttribute('aColor', new THREE.BufferAttribute(dcol, 3));
    dg.setAttribute('aSize', new THREE.BufferAttribute(dsz, 1));
    dg.setAttribute('aAlpha', new THREE.BufferAttribute(dal, 1));
    this.dust = new THREE.Points(dg, makePointsMaterial(true));
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    // field
    this.field = new ParticleField(12000);
    this.scene.add(this.field.points);
    this.fieldScript = new FieldScript(this.field);

    progress(0.1, 'Building scenes');
    this.scenes = [createHook(), createCoffee(), createGlass(), createAtoms(), createCounting(), createPayoff()];
    progress(0.3, 'Scenes ready');
    this.scenes.forEach((s) => {
      s.group.visible = false;
      this.scene.add(s.group);
    });

    // matte props shouldn't mirror the bright studio environment at grazing angles
    const envTex = this.scene.environment;
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && m.type === 'MeshStandardMaterial' && envTex) {
        m.envMap = envTex;
        m.envMapIntensity = 0.05;
      }
    });

    this.ctx = {
      cam: this.cam,
      fx: defaultFX(),
      project: (v) => {
        const p = v.clone().project(this.cam);
        return [(p.x * 0.5 + 0.5) * W, (1 - (p.y * 0.5 + 0.5)) * H, p.z < 1];
      },
      dustTint: new THREE.Color('#ffffff'),
      env: { intensity: 0.5 },
    };

    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (m && m.uniforms && m.uniforms.uPx) this.dustMats.push(m);
    });
  }

  setScale(s: number) {
    this.scale = s;
    this.renderer.setSize(Math.round(W * s), Math.round(H * s), false);
    this.post.setSize(Math.round(W * s), Math.round(H * s));
  }

  render(T: number) {
    T = clamp(T, 0, DUR - 0.001);
    const t0 = performance.now();
    const c = this.ctx;
    c.fx = defaultFX();
    this.cam.up.set(0, 1, 0);
    this.cam.fov = 35;
    c.dustTint.set('#ffffff');
    c.env.intensity = 0.5;

    let active: VScene | undefined;
    for (const s of this.scenes) {
      const on = T >= s.start - 0.001 && T < s.end;
      s.group.visible = on;
      if (on) active = s;
    }
    if (active) active.update(T, c);
    this.cam.updateProjectionMatrix();
    this.cam.updateMatrixWorld();

    // field
    const fv = this.fieldScript.visible(T);
    this.field.points.visible = fv;
    if (fv) this.fieldScript.sync(T);
    else this.fieldScript.cur = -1;

    // dust
    const inCalm = !!active && active.start !== this.scenes[3].start && active.start !== this.scenes[4].start;
    this.dust.visible = inCalm;
    if (inCalm) {
      const pos = this.dust.geometry.attributes.position as THREE.BufferAttribute;
      const col = this.dust.geometry.attributes.aColor as THREE.BufferAttribute;
      const n = pos.count;
      for (let i = 0; i < n; i++) {
        const bx = this.dustBase[i * 3], by = this.dustBase[i * 3 + 1], bz = this.dustBase[i * 3 + 2];
        pos.setXYZ(i, bx + Math.sin(T * 0.1 + i) * 0.8, by + ((T * 0.15 + i * 0.37) % 1) * 0.6 + Math.sin(T * 0.2 + i * 1.3) * 0.4, bz);
        col.setXYZ(i, c.dustTint.r, c.dustTint.g, c.dustTint.b);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
    }

    const px = (H * this.scale) / (2 * Math.tan((this.cam.fov * Math.PI) / 360));
    for (const m of this.dustMats) m.uniforms.uPx.value = px;
    this.scene.environmentIntensity = c.env.intensity;

    this.post.render(c.fx, T);

    // ---- 2D overlay
    const g = this.g;
    g.clearRect(0, 0, W, H);
    g.save();
    g.globalAlpha = 1 - c.fx.fade;
    if (active) active.draw(T, g, c);
    if (this.captions) this.drawCaptions(g, T);
    g.restore();
    this.lastT = T;

    // adaptive quality
    const dt = performance.now() - t0;
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 45) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.frameTimes = [];
      if (avg > 26 && this.scale > 0.55) this.setScale(Math.max(0.55, this.scale - 0.15));
    }
  }

  drawCaptions(g: CanvasRenderingContext2D, T: number) {
    let li = -1;
    for (let i = 0; i < VO.length; i++) if (T >= VO[i].start - 0.05 && T < VO[i].start + VO[i].dur + 0.5) li = i;
    if (li < 0) return;
    const L = VO[li];
    const words = L.words;
    let cur = 0;
    for (let i = 0; i < words.length; i++) if (T >= L.start + words[i].t) cur = i;
    const per = 8;
    const chunk = Math.floor(cur / per);
    const ws = words.slice(chunk * per, chunk * per + per);
    g.save();
    g.font = `500 30px ${F_SANS}`;
    const sp = g.measureText(' ').width;
    const widths = ws.map((w) => g.measureText(w.w).width);
    const total = widths.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
    const x0 = 960 - total / 2;
    roundRect(g, x0 - 28, 1000 - 40, total + 56, 66, 33);
    g.fillStyle = 'rgba(4,6,11,0.62)';
    g.fill();
    let x = x0;
    ws.forEach((w, i) => {
      const gi = chunk * per + i;
      const spoken = T >= L.start + words[gi].t - 0.02;
      g.fillStyle = gi === cur ? COL.ember : spoken ? COL.ivory : 'rgba(243,237,226,0.4)';
      g.textBaseline = 'alphabetic';
      g.fillText(w.w, x, 1002);
      x += widths[i] + sp;
    });
    g.restore();
  }

  /** composite GL + overlay into one canvas (for export) */
  compose() {
    this.compG.drawImage(this.gl, 0, 0, W, H);
    this.compG.drawImage(this.overlay, 0, 0);
    return this.comp;
  }
}

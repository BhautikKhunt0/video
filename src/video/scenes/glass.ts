import * as THREE from 'three';
import {
  VScene, Ctx, B, COL, F_SERIF, F_MONO, chapterTag, seg, clamp, lerp, eIO2, eOut3, smooth, wordT, glowText, mulberry32,
} from '../core';
import { spokenLine, fmtInt } from './ui';
import { makePointsMaterial } from '../particles';

export const GLASS = { Ts: 45.55, Ti: 47.1, revStart: 52.95, revEnd: 57.3 };
const FLOOR = 0;
const TABLE_Y = 4.0;
const GRAV = 16;

/** glass-time: real-time fall → slow-mo shatter → hold → reversed */
export function glassTime(T: number) {
  const { Ti, revStart, revEnd } = GLASS;
  const fwdEnd = Ti + (revStart - Ti) * 0.5;
  if (T <= Ti) return T;
  if (T < revStart) return Ti + (T - Ti) * 0.5;
  if (T < revEnd) return lerp(fwdEnd, 45.0, eIO2(seg(T, revStart, revEnd)));
  return 45.0;
}

function glassPose(gT: number) {
  const { Ts, Ti } = GLASS;
  if (gT <= Ts) {
    const s = eIO2(seg(gT, 45.0, Ts - 0.05));
    return { x: lerp(-1.1, 0.28, s), y: TABLE_Y, rot: -0.07 * smooth(seg(gT, Ts - 0.25, Ts)) };
  }
  const u = clamp((gT - Ts) / (Ti - Ts));
  return { x: 0.28 + 1.5 * Math.pow(u, 1.2), y: TABLE_Y - (TABLE_Y - 0.62) * u * u, rot: -(0.07 + 1.52 * Math.pow(u, 1.7)) };
}

export function createGlass(): VScene {
  const group = new THREE.Group();
  const rnd = mulberry32(2024);

  // lights
  const key = new THREE.SpotLight(0xfff0dd, 450, 60, 0.6, 0.8, 1.6);
  key.position.set(-6, 10, 8);
  key.target.position.set(1.5, 1.5, 0);
  const rimL = new THREE.PointLight(0x78d6ff, 45, 40, 1.6);
  rimL.position.set(5, 2.5, -4);
  const backL = new THREE.PointLight(0xffb070, 14, 30, 1.6);
  backL.position.set(-3, 7, -7);
  const impactL = new THREE.PointLight(0xfff2d8, 0, 30, 1.6);
  impactL.position.set(1.9, 0.8, 1.5);
  group.add(key, key.target, rimL, backL, impactL);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.4, metalness: 0.0, envMapIntensity: 0.25 }));
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);
  // table slab
  const table = new THREE.Mesh(new THREE.BoxGeometry(18, 0.45, 9), new THREE.MeshStandardMaterial({ color: 0x15110f, roughness: 0.6, metalness: 0.0 }));
  table.position.set(0.5 - 9, TABLE_Y - 0.225, 0);
  group.add(table);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 9), new THREE.MeshBasicMaterial({ color: 0xffb070 }));
  edge.position.set(0.51, TABLE_Y, 0);
  group.add(edge);
  // table support (just a dark column hint)
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, TABLE_Y, 0.4), new THREE.MeshStandardMaterial({ color: 0x0d0b0a, roughness: 0.5, metalness: 0.4 }));
  leg.position.set(-1.5, TABLE_Y / 2 - 0.2, -1.8);
  group.add(leg);
  const backGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 28),
    new THREE.MeshBasicMaterial({ color: 0x1a2a4a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  backGlow.position.set(0, 5, -16);
  group.add(backGlow);

  // ---- whole glass (lathe)
  const H = 2.2;
  const prof = [[0, 0], [0.48, 0], [0.5, 0.05], [0.6, H], [0.565, H], [0.46, 0.22], [0, 0.22]].map(([x, y]) => new THREE.Vector2(x, y));
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf4ff, transmission: 1, thickness: 0.2, roughness: 0.02, ior: 1.5, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false });
  const wholeG = new THREE.LatheGeometry(prof, 64);
  wholeG.rotateY(Math.PI * 0.8);
  const whole = new THREE.Mesh(wholeG, glassMat);
  const wholeRim = new THREE.Mesh(new THREE.TorusGeometry(0.583, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  wholeRim.rotation.x = Math.PI / 2;
  wholeRim.position.y = H;
  whole.add(wholeRim);
  group.add(whole);

  // ---- shards
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(-0.5, 0.5);
  shape.closePath();
  const sGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
  sGeo.translate(0, 0, -0.025);
  const NA = 24, NR = 8;
  const NSH = NA * NR * 2 + 12;
  const shMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f3ff, transmission: 0.97, thickness: 0.12, roughness: 0.03, ior: 1.52, envMapIntensity: 1.6, side: THREE.DoubleSide, clearcoat: 1, specularIntensity: 1 });
  const shards = new THREE.InstancedMesh(sGeo, shMat, NSH);
  shards.frustumCulled = false;
  group.add(shards);

  interface Sh { pl: THREE.Vector3; ql: THREE.Quaternion; sl: THREE.Vector3; c0: THREE.Vector3; q0: THREE.Quaternion; v: THREE.Vector3; ax: THREE.Vector3; om: number; sj: THREE.Vector3 }
  const sh: Sh[] = [];
  const mk = (pl: THREE.Vector3, ql: THREE.Quaternion, sl: THREE.Vector3) =>
    sh.push({ pl, ql, sl, c0: new THREE.Vector3(), q0: new THREE.Quaternion(), v: new THREE.Vector3(), ax: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), om: (rnd() - 0.5) * 16, sj: new THREE.Vector3(0.6 + rnd() * 0.9, 0.6 + rnd() * 0.9, 1) });
  const qZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
  for (let j = 0; j < NR; j++) {
    for (let i = 0; i < NA; i++) {
      const a = ((i + 0.5) / NA) * Math.PI * 2;
      const y = ((j + 0.5) / NR) * (H - 0.22) + 0.22;
      const R = lerp(0.5, 0.6, y / H) - 0.02;
      const bw = ((Math.PI * 2 * R) / NA) * 1.0, bh = (H - 0.22) / NR;
      const X = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const m = new THREE.Matrix4().makeBasis(X, Y, Z);
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      const pos = new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R);
      mk(pos.clone(), q.clone(), new THREE.Vector3(bw, bh, 1));
      mk(pos.clone(), q.clone().multiply(qZ), new THREE.Vector3(bw, bh, 1));
    }
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const X = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), Z = new THREE.Vector3(0, 1, 0), Y = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    mk(new THREE.Vector3(Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2), q, new THREE.Vector3(0.5, 0.5, 1));
  }
  // precompute impact state
  const impactPose = glassPose(GLASS.Ti);
  const Pq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), impactPose.rot);
  const Pp = new THREE.Vector3(impactPose.x, impactPose.y, 0);
  const impactPt = new THREE.Vector3(impactPose.x + 0.05, 0.08, 0);
  sh.forEach((s) => {
    s.c0.copy(s.pl).applyQuaternion(Pq).add(Pp);
    s.q0.copy(Pq).multiply(s.ql);
    const d = s.c0.clone().sub(impactPt);
    const dist = d.length();
    d.normalize();
    const sp = (2.0 + rnd() * 3.2) * (1.2 / (0.5 + dist * 0.35));
    s.v.set(d.x * sp * 1.2 + 1.5 + rnd(), Math.abs(d.y) * sp * 0.5 + 1.5 + rnd() * 5, d.z * sp * 1.0 + (rnd() - 0.5) * 2);
  });

  // sparks
  const NSP = 320;
  const spg = new THREE.BufferGeometry();
  const spp = new Float32Array(NSP * 3), spc = new Float32Array(NSP * 3), sps = new Float32Array(NSP), spa = new Float32Array(NSP);
  const spd = Array.from({ length: NSP }, () => {
    const a = rnd() * 6.283, e = rnd() * 1.3, v = 1.5 + rnd() * 7;
    return new THREE.Vector3(Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v + 1, Math.sin(a) * Math.cos(e) * v * 0.6);
  });
  for (let i = 0; i < NSP; i++) { spc[i * 3] = 1; spc[i * 3 + 1] = 0.92; spc[i * 3 + 2] = 0.78; sps[i] = 0.05 + rnd() * 0.08; }
  spg.setAttribute('position', new THREE.BufferAttribute(spp, 3));
  spg.setAttribute('aColor', new THREE.BufferAttribute(spc, 3));
  spg.setAttribute('aSize', new THREE.BufferAttribute(sps, 1));
  spg.setAttribute('aAlpha', new THREE.BufferAttribute(spa, 1));
  const sparks = new THREE.Points(spg, makePointsMaterial(true));
  sparks.frustumCulled = false;
  group.add(sparks);

  const wave = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 128), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  wave.rotation.x = -Math.PI / 2;
  wave.position.set(impactPt.x, 0.02, 0);
  group.add(wave);

  const tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpM = new THREE.Matrix4(), qa = new THREE.Quaternion();
  const FLOOR_Y = FLOOR + 0.04;

  const tStrange = wordT(8, 'strange');
  void tStrange;

  return {
    start: B[2],
    end: B[3],
    group,
    update(T, c: Ctx) {
      const gT = glassTime(T);
      const { Ti } = GLASS;
      const t = gT - Ti;
      const pose = glassPose(Math.min(gT, Ti));
      c.env.intensity = 0.35;
      c.dustTint.set('#9cc4ff');

      // whole glass
      whole.visible = t <= 0;
      whole.position.set(pose.x, pose.y, 0);
      whole.rotation.set(0, 0, pose.rot);
      shards.visible = t > 0;
      if (t > 0) {
        for (let i = 0; i < NSH; i++) {
          const s = sh[i];
          let tt = t;
          const y0 = s.c0.y;
          const vy = s.v.y;
          const t1 = (vy + Math.sqrt(vy * vy + 2 * GRAV * Math.max(0, y0 - FLOOR_Y))) / GRAV;
          let angle: number;
          if (tt < t1) {
            tmpP.set(s.c0.x + s.v.x * tt, y0 + vy * tt - 0.5 * GRAV * tt * tt, s.c0.z + s.v.z * tt);
            angle = s.om * tt;
          } else {
            const sTime = tt - t1;
            const vy1 = vy - GRAV * t1;
            const vy2 = -vy1 * 0.32;
            let yy = FLOOR_Y + vy2 * sTime - 0.5 * GRAV * sTime * sTime;
            if (yy < FLOOR_Y) yy = FLOOR_Y;
            const k = (1 - Math.exp(-2.4 * sTime)) / 2.4;
            tmpP.set(s.c0.x + s.v.x * t1 + s.v.x * 0.45 * k, yy, s.c0.z + s.v.z * t1 + s.v.z * 0.45 * k);
            angle = s.om * t1 + s.om * 0.35 * (1 - Math.exp(-3 * sTime)) / 3;
          }
          qa.setFromAxisAngle(s.ax, angle);
          tmpQ.copy(qa).multiply(s.q0);
          tmpS.set(s.sl.x * s.sj.x, s.sl.y * s.sj.y, 1);
          tmpM.compose(tmpP, tmpQ, tmpS);
          shards.setMatrixAt(i, tmpM);
        }
        shards.instanceMatrix.needsUpdate = true;
      }

      // sparks & shockwave & impact light
      for (let i = 0; i < NSP; i++) {
        const d = spd[i];
        const life = 1.3;
        if (t > 0 && t < life) {
          spp[i * 3] = impactPt.x + d.x * t * 0.6;
          spp[i * 3 + 1] = impactPt.y + d.y * t * 0.7 - 0.5 * 11 * t * t;
          spp[i * 3 + 2] = d.z * t * 0.6;
          if (spp[i * 3 + 1] < FLOOR_Y) spp[i * 3 + 1] = FLOOR_Y;
          spa[i] = Math.pow(1 - t / life, 1.5) * 1.1;
        } else spa[i] = 0;
      }
      (spg.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (spg.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
      const ws = t > 0 ? t : 0;
      wave.scale.setScalar(0.2 + ws * 6.5);
      (wave.material as THREE.MeshBasicMaterial).opacity = t > 0 ? Math.max(0, 1 - ws / 0.9) * 0.7 : 0;
      impactL.intensity = t > 0 ? 90 * Math.exp(-t * 7) : 0;

      // camera (function of glass time → reverses coherently)
      let cx: number, cy: number, cz: number, lx: number, ly: number;
      if (gT < Ti) {
        const p = seg(gT, 45.0, Ti);
        cx = lerp(0.2, 1.2, p); cy = lerp(2.9, 2.1, eIO2(p)); cz = lerp(11.2, 9.8, p);
        lx = lerp(0.6, 1.3, p); ly = lerp(2.9, 1.5, eIO2(p));
      } else {
        const p = clamp(t / 3.0);
        cx = lerp(1.2, 3.4, eIO2(p)); cy = lerp(2.1, 1.35, eIO2(p)); cz = lerp(9.8, 8.0, eIO2(p));
        lx = lerp(1.3, 2.8, eIO2(p)); ly = lerp(1.5, 0.7, eIO2(p));
      }
      const shk = t > 0 ? 0.16 * Math.exp(-t * 5) : 0;
      c.cam.position.set(cx + Math.sin(gT * 70) * shk, cy + Math.cos(gT * 63) * shk, cz);
      c.cam.lookAt(lx, ly, 0);
      c.cam.fov = 32;

      // fx
      const imp = t > 0 ? Math.exp(-t * 9) : 0;
      c.fx.flash += imp * 0.5 + (1 - seg(T, 45.0, 45.4)) * 0.45;
      c.fx.chroma = 0.0008 + imp * 0.01;
      c.fx.bloom = 0.8 + imp * 0.9;
      const rev = T > GLASS.revStart && T < GLASS.revEnd + 0.3;
      c.fx.glitch += Math.exp(-Math.abs(T - GLASS.revStart) * 10) * 0.7 + (rev ? 0.05 : 0);
      c.fx.chroma += rev ? 0.002 : 0;
      c.fx.grade += rev ? -0.6 : 0.2;
      // zoom-dive out into the molecular world
      const z = smooth(seg(T, 57.7, 58.78));
      c.fx.zoom += z * 0.6;
      c.fx.zoomCx = 0.45;
      c.fx.zoomCy = 0.45;
      c.fx.flash += smooth(seg(T, 58.3, 58.8)) * 0.7;
    },
    draw(T, g) {
      const gT = glassTime(T);
      chapterTag(g, '02', 'Broken things stay broken', seg(T, 45.3, 46.1));
      const R = 1824;
      spokenLine(g, T, 7, 0, 5, R, 230, `italic 400 58px ${F_SERIF}`, 'rgba(243,237,226,0.85)', { align: 'right', hideAt: 49.9, hideDur: 0.5 });
      spokenLine(g, T, 7, 7, 8, R, 316, `italic 400 78px ${F_SERIF}`, COL.ivory, { align: 'right', hideAt: 49.9, hideDur: 0.5, colors: { shatters: COL.ember } });
      spokenLine(g, T, 7, 9, 11, R, 400, `italic 400 78px ${F_SERIF}`, COL.ivory, { align: 'right', hideAt: 49.9, hideDur: 0.5, colors: { pieces: COL.ember } });
      spokenLine(g, T, 8, 3, 6, R, 250, `italic 400 78px ${F_SERIF}`, COL.ivory, { align: 'right', hideAt: 52.95, hideDur: 0.4, colors: { never: COL.fire } });
      spokenLine(g, T, 8, 12, 17, R, 250, `italic 400 70px ${F_SERIF}`, COL.ivory, { align: 'right', hideAt: 57.0, hideDur: 0.4, colors: { forbids: COL.ice, law: COL.ice } });

      // piece counter
      const cnt = 1000 * eOut3(seg(gT, GLASS.Ti, GLASS.Ti + 1.5));
      const ca = smooth(seg(T, 47.5, 48.1)) * (1 - smooth(seg(T, 57.0, 57.6)));
      if (ca > 0) {
        glowText(g, fmtInt(cnt), 96, 960, `400 120px ${F_SERIF}`, COL.ivory, ca, 0, 'left');
        glowText(g, 'PIECES', 100, 910, `500 16px ${F_MONO}`, COL.ember, ca, 8, 'left', 5);
      }
      // verdicts
      const v1 = smooth(seg(T, 54.9, 55.6)) * (1 - smooth(seg(T, 58.0, 58.5)));
      const v2 = smooth(seg(T, 56.35, 57.0)) * (1 - smooth(seg(T, 58.0, 58.5)));
      if (v1 > 0) {
        glowText(g, '✓', R - 520, 400, `500 34px ${F_MONO}`, COL.ice, v1, 14, 'left');
        glowText(g, "NEWTON'S LAWS", R - 470, 390, `500 22px ${F_MONO}`, COL.ivory, v1, 0, 'left', 4);
        glowText(g, 'run equally well in reverse', R - 470, 420, `400 15px ${F_MONO}`, COL.ivory, v1 * 0.6, 0, 'left', 2);
      }
      if (v2 > 0) {
        glowText(g, '✕', R - 520, 500, `500 34px ${F_MONO}`, COL.fire, v2, 14, 'left');
        glowText(g, 'NATURE', R - 470, 490, `500 22px ${F_MONO}`, COL.ivory, v2, 0, 'left', 4);
        glowText(g, 'never does it', R - 470, 520, `400 15px ${F_MONO}`, COL.ivory, v2 * 0.6, 0, 'left', 2);
      }
      // reverse HUD
      if (T > GLASS.revStart && T < GLASS.revEnd + 0.4) {
        const a = smooth(seg(T, GLASS.revStart, GLASS.revStart + 0.4)) * (1 - smooth(seg(T, GLASS.revEnd - 0.2, GLASS.revEnd + 0.4)));
        g.save();
        g.globalAlpha = a * (0.65 + 0.35 * Math.sin(T * 9));
        glowText(g, '◀◀  REWIND', 96, 150, `500 20px ${F_MONO}`, COL.ice, 1, 12, 'left', 5);
        g.restore();
        g.save();
        g.globalAlpha = a * 0.05;
        g.fillStyle = '#fff';
        for (let y = 0; y < 1080; y += 4) g.fillRect(0, y, 1920, 1);
        g.restore();
      }
    },
  };
}

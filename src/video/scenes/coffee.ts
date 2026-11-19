import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  VScene, Ctx, B, COL, F_SERIF, F_MONO, F_SANS, chapterTag, seg, clamp, lerp, eOut3, eIO2, wordT, smooth, glowText, mulberry32, roundRect,
} from '../core';
import { spokenLine } from './ui';
import { makePointsMaterial } from '../particles';

export const COFFEE = {
  tImp: wordT(5, 'coffee'),
  meltStart: wordT(5, 'coffee') + 0.6,
  meltEnd: 31.8,
  revStart: 34.0,
  revEnd: 43.0,
  wHold: 33.4,
  wEnd: wordT(5, 'coffee') - 0.95,
};
const SY = 3.3; // liquid surface height
const LUKE = 54;

/** world time: forward → hold → reversed → hold */
export function worldTime(T: number) {
  const { revStart, revEnd, wHold, wEnd } = COFFEE;
  if (T <= wHold) return T;
  if (T < revStart) return wHold;
  if (T < revEnd) return wHold - (wHold - wEnd) * eIO2(seg(T, revStart, revEnd));
  return wEnd;
}
function temps(w: number) {
  const dt = w - COFFEE.tImp;
  if (dt <= 0) return { c: 88, i: -8 };
  const e = Math.exp(-dt / 1.8);
  return { c: LUKE + 34 * e, i: Math.min(LUKE, -8 + (LUKE + 8) * (1 - e)) };
}

function radialTex(color: string) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createCoffee(): VScene {
  const group = new THREE.Group();
  const rnd = mulberry32(42);

  // lights
  const key = new THREE.SpotLight(0xffd6a8, 700, 60, 0.55, 0.7, 1.6);
  key.position.set(-7, 11, 7);
  key.target.position.set(0, 2.5, 0);
  const rim = new THREE.PointLight(0x78d6ff, 260, 40, 1.6);
  rim.position.set(6, 4, -5);
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.6);
  fill.position.set(6, 5, 9);
  group.add(key, key.target, rim, fill);

  // floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(60, 64),
    new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.25 })
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // glow ring under cup
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.06, 128), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  group.add(ring);
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(4.5, 64),
    new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,150,60,0.5)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.012;
  group.add(halo);

  // backdrop glow
  const backGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 26),
    new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,140,50,0.55)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  backGlow.position.set(0, 5, -14);
  group.add(backGlow);

  // glass tumbler (lathe)
  const prof = [
    [0.0, 0.0], [1.38, 0.0], [1.47, 0.06], [1.67, 4.1], [1.6, 4.1], [1.42, 0.5], [0.0, 0.5],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const latheG = new THREE.LatheGeometry(prof, 96);
  latheG.rotateY(Math.PI * 0.8);
  const glass = new THREE.Mesh(
    latheG,
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transmission: 1, thickness: 0.25, roughness: 0.03, ior: 1.5, envMapIntensity: 1.6,
      side: THREE.DoubleSide, depthWrite: false, specularIntensity: 1,
    })
  );
  group.add(glass);
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(1.635, 0.025, 12, 96), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.08, roughness: 0.1 }));
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 4.1;
  group.add(rimMesh);

  // coffee body
  const coffeeMat = new THREE.MeshPhysicalMaterial({ color: 0x2a1308, roughness: 0.3, clearcoat: 0.6, emissive: 0x401505, emissiveIntensity: 0.6 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.545, 1.41, SY - 0.5, 64, 1, false), coffeeMat);
  body.position.y = 0.5 + (SY - 0.5) / 2;
  group.add(body);
  // rippling surface
  const surfGeo = new THREE.RingGeometry(0.03, 1.545, 72, 30);
  const surfMat = new THREE.MeshPhysicalMaterial({ color: 0x3a1b0b, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x501a05, emissiveIntensity: 0.5, envMapIntensity: 1.4 });
  const surf = new THREE.Mesh(surfGeo, surfMat);
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = SY;
  group.add(surf);
  const sp = surfGeo.attributes.position as THREE.BufferAttribute;
  const baseXY = new Float32Array(sp.count * 2);
  for (let i = 0; i < sp.count; i++) {
    baseXY[i * 2] = sp.getX(i);
    baseXY[i * 2 + 1] = sp.getY(i);
  }

  // ice cube
  const iceGeo = new RoundedBoxGeometry(1.0, 1.0, 1.0, 5, 0.1);
  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4f0ff, transparent: true, opacity: 0.6, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04,
    emissive: 0x2a78b0, emissiveIntensity: 0.22, envMapIntensity: 2.0, ior: 1.31, depthWrite: false,
  });
  const ice = new THREE.Group();
  const iceMesh = new THREE.Mesh(iceGeo, iceMat);
  ice.add(iceMesh);
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }));
  ice.add(core);
  const crackPts: number[] = [];
  for (let i = 0; i < 14; i++) {
    const a = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.8);
    const d = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.5);
    crackPts.push(a.x, a.y, a.z, a.x + d.x, a.y + d.y, a.z + d.z);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(crackPts, 3));
  ice.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })));
  const iceLight = new THREE.PointLight(0x78d6ff, 0, 8, 1.8);
  ice.add(iceLight);
  group.add(ice);

  // splash droplets
  const NS = 80;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0x5a2a10, roughness: 0.2, emissive: 0x602008, emissiveIntensity: 0.8 }), NS);
  const dp = Array.from({ length: NS }, () => ({ a: rnd() * 6.283, v: 0.6 + rnd() * 2.2, vy: 3 + rnd() * 4.5, r: 0.2 + rnd() * 0.5, s: 0.6 + rnd() * 1.2 }));
  group.add(drops);
  const dummy = new THREE.Object3D();

  // steam
  const NST = 340;
  const sg = new THREE.BufferGeometry();
  const spos = new Float32Array(NST * 3), scol = new Float32Array(NST * 3), ssz = new Float32Array(NST), sal = new Float32Array(NST);
  const sd = Array.from({ length: NST }, () => ({ ph: rnd(), per: 3 + rnd() * 2.5, r: Math.sqrt(rnd()) * 1.3, a: rnd() * 6.283, w: rnd() * 6.283 }));
  for (let i = 0; i < NST; i++) { scol[i * 3] = 1; scol[i * 3 + 1] = 0.82; scol[i * 3 + 2] = 0.66; }
  sg.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  sg.setAttribute('aColor', new THREE.BufferAttribute(scol, 3));
  sg.setAttribute('aSize', new THREE.BufferAttribute(ssz, 1));
  sg.setAttribute('aAlpha', new THREE.BufferAttribute(sal, 1));
  const steam = new THREE.Points(sg, makePointsMaterial(true));
  steam.frustumCulled = false;
  group.add(steam);
  (steam.material as THREE.ShaderMaterial).uniforms.uGlobal.value = 1;
  (window as any).__steamMat = steam.material;

  const pxUniforms = [steam.material as THREE.ShaderMaterial];
  (group as any).pxMats = pxUniforms;

  const tCube = wordT(5, 'cube');
  void tCube;

  return {
    start: B[1],
    end: B[2],
    group,
    update(T, c: Ctx) {
      const w = worldTime(T);
      const { tImp, meltStart, meltEnd } = COFFEE;
      const { c: Tc } = temps(w);
      const heat = clamp((Tc - LUKE) / 34); // 1 hot -> 0 lukewarm
      const reversing = T >= COFFEE.revStart - 0.05 && T < COFFEE.revEnd + 0.4;

      // lighting
      key.color.setRGB(1, lerp(0.88, 0.82, heat), lerp(0.78, 0.6, heat));
      key.intensity = 700;
      rim.intensity = 140;
      c.env.intensity = 0.3;
      coffeeMat.emissive.setRGB(0.25 * heat + 0.05, 0.08 * heat + 0.02, 0.01);
      surfMat.emissiveIntensity = 0.3 + heat * 0.5;
      ringMat.color.setRGB(1, lerp(0.75, 0.5, heat), lerp(0.55, 0.2, heat));
      ringMat.opacity = 0.25 + 0.3 * heat;
      (halo.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.5 * heat;
      (backGlow.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.5 * heat;
      c.dustTint.setRGB(1, lerp(0.8, 0.6, heat), lerp(0.7, 0.4, heat));

      // ice
      const m = seg(w, meltStart, meltEnd);
      const size = Math.pow(Math.max(0, 1 - m), 1 / 3) * 1.05;
      const dt = w - tImp;
      let y: number, rx: number, ry: number, rz: number, px = 0.12, pz = 0;
      if (dt < 0) {
        const u = -dt;
        y = SY + 0.5 + 0.5 * 26 * u * u;
        rx = 0.4 + u * 3.2;
        ry = 0.6 + u * 2.2;
        rz = 0.2 + u * 1.7;
        px = 0.12 - u * 0.15;
      } else {
        y = SY + 0.06 - 0.95 * Math.sin(dt * 4.4) * Math.exp(-dt * 2.0) - 0.12 * m;
        const k = Math.exp(-dt * 0.55);
        rx = 0.4 + 0.5 * Math.sin(dt * 2.7) * k;
        ry = 0.6 + dt * 0.09;
        rz = 0.2 + 0.4 * Math.sin(dt * 2.1 + 1) * k;
        px = 0.12 + Math.sin(dt * 0.7) * 0.2 * (1 - m);
        pz = Math.cos(dt * 0.6) * 0.15 * (1 - m);
      }
      const visible = size > 0.02 && y < SY + 14;
      ice.visible = visible;
      ice.position.set(px, y, pz);
      ice.rotation.set(rx, ry, rz);
      ice.scale.setScalar(Math.max(0.001, size));
      iceLight.intensity = 1.2 * size * size;
      iceMat.opacity = 0.5 + 0.12 * (1 - m);

      // ripples
      const pos = surfGeo.attributes.position as THREE.BufferAttribute;
      const bob = ice.visible && dt > 0 ? 1 : 0;
      for (let i = 0; i < pos.count; i++) {
        const x = baseXY[i * 2], yy = baseXY[i * 2 + 1];
        const r = Math.hypot(x - 0.12, yy);
        let h = 0;
        if (dt > 0) {
          const front = 3.6 * dt;
          const edge = smooth(clamp((front - r) / 0.8)) ;
          h += 0.075 * Math.sin(10 * r - 26 * dt) * edge * Math.exp(-dt * 0.75) / (1 + r * 1.4);
          // reflected wave off wall
          const dw = 3.0 - r + 3.0;
          void dw;
          h += 0.022 * Math.sin(9 * r + 15 * dt) * Math.exp(-dt * 0.5) * edge * clamp(r / 1.5);
          h += bob * 0.012 * size * Math.sin(8 * r - 9 * dt) * Math.exp(-r * 0.7);
        }
        pos.setZ(i, h);
      }
      pos.needsUpdate = true;
      surfGeo.computeVertexNormals();
      const nrm = surfGeo.attributes.normal as THREE.BufferAttribute;
      for (let i = 0; i < nrm.count; i++) if (!isFinite(nrm.getX(i) + nrm.getY(i) + nrm.getZ(i))) nrm.setXYZ(i, 0, 0, 1);

      // droplets
      for (let i = 0; i < NS; i++) {
        const d = dp[i];
        const tt = dt * 1.0;
        if (tt > 0 && tt < 1.4) {
          const hx = Math.cos(d.a) * d.v * tt * 0.5 + 0.12;
          const hz = Math.sin(d.a) * d.v * tt * 0.5;
          const hy = SY + d.vy * tt * 0.9 - 7.5 * tt * tt;
          const inside = Math.hypot(hx, hz) < 1.5;
          if (hy > SY && inside) {
            dummy.position.set(hx, hy, hz);
            dummy.scale.setScalar(d.s * (1 - tt / 1.5));
          } else dummy.scale.setScalar(0.0001);
        } else dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        drops.setMatrixAt(i, dummy.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;

      // steam
      const amt = Math.pow(clamp((Tc - 40) / 50), 1.1);
      for (let i = 0; i < NST; i++) {
        const s = sd[i];
        const age = (((w * 0.8) / s.per + s.ph) % 1 + 1) % 1;
        const swirl = Math.sin(age * 6 + s.w) * 0.35 * age;
        spos[i * 3] = Math.cos(s.a) * s.r * (0.6 + age * 0.3) + swirl;
        spos[i * 3 + 1] = SY + 0.05 + age * 3.4;
        spos[i * 3 + 2] = Math.sin(s.a) * s.r * (0.6 + age * 0.3) + Math.cos(age * 5 + s.w) * 0.25 * age;
        ssz[i] = 0.5 + age * 1.5;
        sal[i] = amt * Math.pow(Math.sin(Math.PI * age), 1.3) * 0.028;
      }
      (sg.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (sg.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (sg.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;

      // camera
      let cx: number, cy: number, cz: number, lx: number, ly: number;
      if (T < 25.4) {
        const p = eOut3(seg(T, 20.8, 25.4));
        cx = lerp(4.2, 1.9, p); cy = lerp(2.2, 3.3, p); cz = lerp(15.0, 12.0, p);
        lx = lerp(0.4, 1.0, p); ly = lerp(3.2, 3.0, p);
      } else {
        const p = eIO2(seg(T, 25.4, 33.4));
        cx = lerp(1.9, 1.4, p) + (reversing ? Math.sin((T - 34) * 0.5) * 1.3 : 0);
        cy = lerp(3.3, 3.5, p);
        cz = lerp(12.0, 13.2, p) - (T > 34 ? seg(T, 34, 45) * 1.4 : 0);
        lx = 1.0; ly = 3.0;
      }
      c.cam.position.set(cx, cy, cz);
      c.cam.lookAt(lx, ly, 0);
      c.cam.fov = 32;
      if (reversing) {
        const roll = 0.045 * Math.sin(seg(T, 34, 43) * Math.PI);
        c.cam.rotateZ(roll);
      }

      // fx
      c.fx.flash += (1 - seg(T, 20.8, 21.7)) * 0.9;
      c.fx.bloom = 0.65;
      const rw = seg(T, 33.55, 34.2);
      const rwOut = seg(T, 42.9, 43.4);
      c.fx.glitch += Math.exp(-Math.abs(T - 33.85) * 9) * 1.0 + (T > 34.1 && T < 43 ? 0.06 + 0.05 * Math.sin(T * 14) : 0) + Math.exp(-Math.abs(T - 43.1) * 8) * 0.6;
      c.fx.chroma = 0.0008 + (reversing ? 0.0022 : 0) + Math.exp(-Math.abs(T - 33.85) * 8) * 0.006;
      c.fx.grade += reversing ? -0.7 * (rw - rwOut * 0.0) : 0.4;
      // exit hard-cut flash into glass scene
      c.fx.flash += seg(T, 44.7, 45.0) * 0.5;
    },
    draw(T, g) {
      const w = worldTime(T);
      const { tImp, meltEnd } = COFFEE;
      chapterTag(g, '01', 'The everyday arrow', seg(T, 21.2, 22.0));

      // opening line
      spokenLine(g, T, 4, 3, 5, 1220, 250, `italic 400 72px ${F_SERIF}`, COL.ivory, { hideAt: 24.4, hideDur: 0.5, colors: { already: COL.ember } });
      spokenLine(g, T, 4, 6, 7, 1220, 330, `italic 400 72px ${F_SERIF}`, COL.ivory, { hideAt: 24.4, hideDur: 0.5, colors: { already: COL.ember, understand: COL.ember } });

      // --- thermal chart
      const pa = smooth(seg(T, 25.2, 26.4)) * (1 - smooth(seg(T, 40.9, 41.5)));
      if (pa > 0) {
        const x0 = 1210, y0 = 300, cw = 560, ch = 330;
        g.save();
        g.globalAlpha = pa;
        // panel
        roundRect(g, x0 - 36, y0 - 92, cw + 72, ch + 190, 18);
        g.fillStyle = 'rgba(8,12,22,0.55)';
        g.fill();
        g.strokeStyle = 'rgba(243,237,226,0.12)';
        g.lineWidth = 1;
        g.stroke();
        glowText(g, 'TEMPERATURE  ·  °C', x0, y0 - 52, `500 15px ${F_MONO}`, COL.ivory, 0.7, 0, 'left', 3);
        // axes
        const tMin = tImp - 1.2, tMax = meltEnd + 1.8;
        const X = (t: number) => x0 + ((t - tMin) / (tMax - tMin)) * cw;
        const Y = (v: number) => y0 + ch - ((v + 10) / 110) * ch;
        g.strokeStyle = 'rgba(243,237,226,0.12)';
        for (const v of [0, 25, 50, 75, 100]) {
          g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x0 + cw, Y(v)); g.stroke();
          glowText(g, String(v), x0 - 10, Y(v) + 5, `400 12px ${F_MONO}`, COL.ivory, 0.4, 0, 'right');
        }
        // lukewarm line
        g.save();
        g.setLineDash([6, 8]);
        g.strokeStyle = 'rgba(243,237,226,0.45)';
        g.beginPath(); g.moveTo(x0, Y(LUKE)); g.lineTo(x0 + cw, Y(LUKE)); g.stroke();
        g.restore();
        const eqA = smooth(seg(w, 29.5, 31.2));
        glowText(g, 'LUKEWARM', x0 + cw, Y(LUKE) - 10, `500 13px ${F_MONO}`, COL.ivory, 0.8 * eqA, 0, 'right', 3);
        // curves
        const drawCurve = (key: 'c' | 'i', color: string, t0: number) => {
          g.save();
          g.strokeStyle = color; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
          g.shadowColor = color; g.shadowBlur = 16;
          g.beginPath();
          const end = Math.min(w, tMax);
          let started = false;
          for (let t = t0; t <= end; t += 0.05) {
            const v = temps(t)[key];
            const px = X(t), py = Y(v);
            if (!started) { g.moveTo(px, py); started = true; } else g.lineTo(px, py);
          }
          g.stroke();
          const hv = temps(Math.min(w, tMax))[key];
          if (w > t0) {
            g.fillStyle = '#fff';
            g.beginPath(); g.arc(X(Math.min(w, tMax)), Y(hv), 6, 0, 6.283); g.fill();
          }
          g.restore();
        };
        drawCurve('c', COL.ember, tMin);
        drawCurve('i', COL.ice, tImp);
        // readouts
        const tt = temps(w);
        const melted = w > meltEnd;
        glowText(g, 'COFFEE', x0, y0 + ch + 44, `500 14px ${F_MONO}`, COL.ember, 1, 6, 'left', 3);
        glowText(g, tt.c.toFixed(1) + '°', x0, y0 + ch + 92, `400 54px ${F_SERIF}`, COL.ivory, 1, 0, 'left');
        glowText(g, melted ? 'MELTWATER' : 'ICE', x0 + cw, y0 + ch + 44, `500 14px ${F_MONO}`, COL.ice, 1, 6, 'right', 3);
        glowText(g, (w < tImp ? -8 : tt.i).toFixed(1) + '°', x0 + cw, y0 + ch + 92, `400 54px ${F_SERIF}`, COL.ivory, 1, 0, 'right');
        g.restore();
      }

      // --- rewind HUD
      if (T > 33.6 && T < 43.6) {
        const a = smooth(seg(T, 33.7, 34.2)) * (1 - smooth(seg(T, 43.0, 43.6)));
        const blink = 0.65 + 0.35 * Math.sin(T * 9);
        g.save();
        g.globalAlpha = a * blink;
        glowText(g, '◀◀  REWIND', 96, 150, `500 20px ${F_MONO}`, COL.ice, 1, 12, 'left', 5);
        g.restore();
        glowText(g, 'time runs backwards  ·  t → −t', 96, 182, `400 14px ${F_MONO}`, COL.ivory, a * 0.55, 0, 'left', 2);
        // scan lines
        g.save();
        g.globalAlpha = a * 0.05;
        g.fillStyle = '#fff';
        for (let y = 0; y < 1080; y += 4) g.fillRect(0, y, 1920, 1);
        g.restore();
      }

      // --- punch line
      spokenLine(g, T, 6, 17, 21, 1210, 400, `italic 400 76px ${F_SERIF}`, COL.ivory, { hideAt: 44.5, hideDur: 0.4, colors: { never: COL.fire, seen: COL.ivory } });
      spokenLine(g, T, 6, 22, 25, 1210, 510, `italic 400 76px ${F_SERIF}`, COL.ivory, { hideAt: 44.5, hideDur: 0.4, colors: { never: COL.fire, will: COL.fire } });
      void F_SANS;
    },
  };
}

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { FX } from './core';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Vector3(1, 0.92, 0.8) },
    uZoom: { value: 0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uChroma: { value: 0.001 },
    uGlitch: { value: 0 },
    uFade: { value: 0 },
    uGrade: { value: 0 },
    uAspect: { value: 16 / 9 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform float uTime, uFlash, uZoom, uChroma, uGlitch, uFade, uGrade, uAspect;
  uniform vec3 uFlashColor;
  uniform vec2 uCenter;
  float hash(float n){ return fract(sin(n*127.1)*43758.5453); }
  float hash2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
  vec3 samp(vec2 uv, vec2 dir){
    float ca = uChroma;
    return vec3(texture2D(tDiffuse, uv + dir*ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir*ca).b);
  }
  void main(){
    vec2 uv = vUv;
    if (uGlitch>0.0){
      float band = floor(uv.y*34.0 + floor(uTime*22.0)*7.0);
      float r = hash(band + floor(uTime*18.0));
      if (r > 1.0 - uGlitch*0.55) uv.x += (hash(band*3.1+uTime)-0.5)*0.14*uGlitch;
    }
    vec2 dir = uv - uCenter;
    vec3 col;
    if (uZoom > 0.001){
      col = vec3(0.0);
      const int N = 14;
      for (int i=0;i<N;i++){
        float f = float(i)/float(N);
        col += samp(uCenter + dir*(1.0 - uZoom*f), dir*(1.0+uZoom*3.0));
      }
      col /= float(N);
    } else {
      col = samp(uv, dir*(1.0+uGlitch*6.0));
    }
    // tone grade: subtle filmic contrast + split tone
    float l = dot(col, vec3(0.299,0.587,0.114));
    col = mix(col, col*col*(3.0-2.0*col), 0.25);
    col += vec3(0.010,0.014,0.03) * (1.0 - l);                 // cool shadows
    col += vec3(0.02,0.012,0.0) * l * max(0.0,uGrade);        // warm highlights
    col += vec3(0.0,0.012,0.025) * l * max(0.0,-uGrade);
    // vignette
    vec2 q = (vUv-0.5)*vec2(uAspect,1.0);
    float v = smoothstep(1.15, 0.25, length(q));
    col *= mix(0.45, 1.0, v);
    // grain
    float gr = hash2(vUv*vec2(1920.0,1080.0) + fract(uTime)*91.7) - 0.5;
    col += gr * 0.035;
    col += uFlash * uFlashColor;
    col *= (1.0 - uFade);
    gl_FragColor = vec4(col, 1.0);
  }`,
};

export class Post {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  constructor(public renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, w: number, h: number) {
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.85, 0.7, 0.72);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader as any);
    this.composer.addPass(this.grade);
  }
  setSize(w: number, h: number) {
    this.composer.setSize(w, h);
  }
  render(fx: FX, time: number) {
    const u = this.grade.uniforms;
    u.uTime.value = time;
    u.uFlash.value = fx.flash;
    u.uFlashColor.value.set(...fx.flashColor);
    u.uZoom.value = fx.zoom;
    u.uCenter.value.set(fx.zoomCx, fx.zoomCy);
    u.uChroma.value = fx.chroma;
    u.uGlitch.value = fx.glitch;
    u.uFade.value = fx.fade;
    u.uGrade.value = fx.grade;
    this.bloom.strength = fx.bloom;
    this.composer.render();
  }
}

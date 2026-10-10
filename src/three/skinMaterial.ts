import * as THREE from 'three';

/** Uniforms that drive the fine surface detail. All values are illustrative 0..1 controls. */
export interface SkinUniforms {
  uStri: { value: number };       // striation visibility
  uGrain: { value: number };      // grainy micro-texture
  uVeinTint: { value: number };   // subtle color over raised veins
  uHighlight: { value: number[] }; // per-region highlight 0..1
  uHighlightColor: { value: THREE.Color };
  uTime: { value: number };
  uTrunksColor: { value: THREE.Color };
  uAoStrength: { value: number };
  uMorph: { value: number[] };    // AO morph weights (mirrors morph influences)
}

export const REGION_COUNT = 21;

const NOISE = /* glsl */ `
vec3 bbHash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float bbHash1(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
// gradient noise, range about -1..1
float bbNoise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dot(bbHash3(i + vec3(0,0,0)), f - vec3(0,0,0)), dot(bbHash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                 mix(dot(bbHash3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(bbHash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
             mix(mix(dot(bbHash3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(bbHash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                 mix(dot(bbHash3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(bbHash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z) * 1.6;
}
`;

export function createSkinMaterial(): { material: THREE.MeshPhysicalMaterial; uniforms: SkinUniforms } {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#c99a7c'),
    roughness: 0.52,
    metalness: 0,
    sheen: 0.25,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#ffd9c4'),
    clearcoat: 0,
    clearcoatRoughness: 0.35,
    specularIntensity: 0.55,
  });
  const uniforms: SkinUniforms = {
    uStri: { value: 0 },
    uGrain: { value: 0 },
    uVeinTint: { value: 0 },
    uHighlight: { value: new Array(REGION_COUNT).fill(0) },
    uHighlightColor: { value: new THREE.Color('#38bdf8') },
    uTime: { value: 0 },
    uTrunksColor: { value: new THREE.Color('#1d2a44') },
    uAoStrength: { value: 1 },
    uMorph: { value: new Array(12).fill(0) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', /* glsl */ `#include <common>
attribute vec3 aFiber;
attribute float aAcross;
attribute vec4 aMus;
attribute vec4 aMisc;
attribute float aTrunks;
attribute vec4 aAo0;
attribute vec4 aAo1;
attribute vec4 aAo2;
uniform float uMorph[12];
varying vec3 vObjPos;
varying vec3 vFiber;
varying float vAcross;
varying vec4 vMus;
varying vec4 vMisc;
varying float vTrunks;
varying float vAo;`)
      .replace('#include <morphtarget_vertex>', /* glsl */ `#include <morphtarget_vertex>
transformed += objectNormal * 0.0016 * smoothstep(-0.001, 0.001, aTrunks * 0.1);
vObjPos = transformed;
vFiber = aFiber;
vAcross = aAcross;
vMus = aMus;
vMisc = aMisc;
vTrunks = aTrunks * 0.1;
vAo = aMisc.z / 255.0
  + dot(aAo0, vec4(uMorph[0], uMorph[1], uMorph[2], uMorph[3]))
  + dot(aAo1, vec4(uMorph[4], uMorph[5], uMorph[6], uMorph[7]))
  + dot(aAo2, vec4(uMorph[8], uMorph[9], uMorph[10], uMorph[11]));`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', /* glsl */ `#include <common>
uniform float uStri;
uniform float uGrain;
uniform float uVeinTint;
uniform float uHighlight[${REGION_COUNT}];
uniform vec3 uHighlightColor;
uniform float uTime;
uniform vec3 uTrunksColor;
uniform float uAoStrength;
varying vec3 vObjPos;
varying vec3 vFiber;
varying float vAcross;
varying vec4 vMus;
varying vec4 vMisc;
varying float vTrunks;
varying float vAo;
float bbTrunks;
float bbAo;
float bbHl;
${NOISE}
// Height of fine surface detail in meters (negative = groove).
float bbDetail() {
  float h = 0.0;
  vec3 p = vObjPos;
  // Striations: rounded fiber-bundle ridges separated by narrow valleys, running along the
  // fiber direction. Spacing, depth and length vary so they read as bundles, not engraving.
  float sw = vMus.y * uStri;
  if (sw > 0.002) {
    float across = vAcross * 0.45;
    float warp = bbNoise(p * 16.0) * 0.4 + bbNoise(p * 44.0) * 0.12;
    float ph = across + warp;
    float fw = fwidth(across) + 1e-4;
    float aa = 1.0 - smoothstep(0.25, 0.6, fw);
    float id = floor(ph);
    float f = fract(ph);
    // bundles of uneven width: shift the valley inside each cell
    float c = 0.5 + 0.28 * (bbHash1(id + 3.7) - 0.5);
    float u = f < c ? f / c : (1.0 - f) / (1.0 - c);
    float ridge = pow(clamp(u, 0.0, 1.0), 0.45);       // 1 on the bundle crown, 0 in the valley
    float amp = 0.45 + 0.55 * bbHash1(id + 13.0);
    // bundles surface and sink along their length
    float brk = smoothstep(-0.3, 0.3, bbNoise(vec3(id * 0.73, vMus.x * 4.0, 3.1)));
    h += sw * aa * amp * mix(0.35, 1.0, brk) * (ridge - 1.0) * 0.001;
  }
  // Grain: short, granular bumps over muscle bellies, only slightly elongated along the fibers.
  float gw = vMus.z * uGrain;
  if (gw > 0.002) {
    vec3 fdir = normalize(vFiber + 1e-5);
    vec3 b1 = normalize(cross(fdir, abs(fdir.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 b2 = cross(fdir, b1);
    vec3 q = vec3(dot(p, fdir) * 230.0, dot(p, b1) * 380.0, dot(p, b2) * 380.0);
    float n = bbNoise(q);
    float bumps = smoothstep(0.05, 0.55, n) - 0.35 * smoothstep(-0.6, -0.1, -n);
    float fwq = length(fwidth(q));
    float aa = 1.0 - smoothstep(0.5, 1.2, fwq);
    h += gw * aa * bumps * 0.0003;
  }
  // Skin micro relief (constant across presets), faded out when it would alias on screen.
  vec3 sp = p * 900.0;
  h += bbNoise(sp) * 0.000012 * (1.0 - smoothstep(0.35, 0.9, length(fwidth(sp))));
  return h * (1.0 - bbTrunks);
}`)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
bbTrunks = smoothstep(-0.0009, 0.0009, vTrunks);
bbAo = mix(1.0, clamp(vAo, 0.0, 1.0), uAoStrength);
diffuseColor.rgb *= mix(vec3(1.0), vec3(0.86, 0.88, 0.97), clamp(vMisc.y / 255.0, 0.0, 1.0) * uVeinTint);
diffuseColor.rgb = mix(diffuseColor.rgb, uTrunksColor, bbTrunks);
{
  int ri = int(vMisc.x + 0.5);
  float hl = 0.0;
  for (int i = 0; i < ${REGION_COUNT}; i++) { if (i == ri) hl = uHighlight[i]; }
  bbHl = hl * (1.0 - bbTrunks);
  // Light tint only, so the shading stays readable; the glow is added as emission below.
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uHighlightColor * 1.4, bbHl * 0.15);
}`)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
{
  // Fresnel-weighted glow: strongest at silhouettes, faint face-on, visible on any skin tone.
  float fres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.0);
  totalEmissiveRadiance += uHighlightColor * bbHl * (0.05 + 0.35 * fres);
}`)
      .replace('#include <roughnessmap_fragment>', /* glsl */ `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.62, bbTrunks);`)
      .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
{
  float H = bbDetail();
  vec3 dpx = dFdx(-vViewPosition);
  vec3 dpy = dFdy(-vViewPosition);
  vec3 r1 = cross(dpy, normal);
  vec3 r2 = cross(normal, dpx);
  float det = dot(dpx, r1);
  float dHx = dFdx(H), dHy = dFdy(H);
  vec3 grad = sign(det) * (dHx * r1 + dHy * r2);
  normal = normalize(abs(det) * normal - grad);
}`)
      .replace('#include <aomap_fragment>', /* glsl */ `#include <aomap_fragment>
reflectedLight.indirectDiffuse *= bbAo;
reflectedLight.indirectSpecular *= mix(1.0, bbAo, 0.7);
reflectedLight.directDiffuse *= mix(1.0, bbAo, 0.45);`);
  };
  material.customProgramCacheKey = () => 'bb-skin-v2';
  return { material, uniforms };
}

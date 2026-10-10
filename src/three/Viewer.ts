import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadModel, type LoadedModel } from './loadModel';
import { createSkinMaterial, REGION_COUNT, type SkinUniforms } from './skinMaterial';
import { type Appearance, NEUTRAL, TARGET_ORDER, toRenderParams, APPEARANCE_KEYS } from './appearance';
import { skinAlbedo, type Presentation } from './skin';

export type Side = 'A' | 'B';
export type LightingMode = 'neutral' | 'stage';
export type ViewName = 'front' | 'back' | 'left' | 'right' | 'threeQuarter';
export type FocusName =
  | 'full' | 'shoulders' | 'chest' | 'arms' | 'forearms' | 'abs' | 'back' | 'lowerback' | 'glutes' | 'quads' | 'hamstrings' | 'calves';

interface FigureSlot {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  uniforms: SkinUniforms;
  current: Appearance;
  target: Appearance;
}

interface CamShot { target: THREE.Vector3; dir: THREE.Vector3; dist: number }

const FOCUS: Record<FocusName, { target: [number, number, number]; dir: [number, number, number]; height: number }> = {
  // Framed slightly low and loose so the platform clears the control dock.
  full: { target: [0, 0.8, 0], dir: [0, 0.06, 1], height: 2.25 },
  shoulders: { target: [0.17, 1.4, 0.02], dir: [0.55, 0.15, 1], height: 0.42 },
  chest: { target: [0, 1.34, 0.08], dir: [0.15, 0.1, 1], height: 0.45 },
  arms: { target: [0.29, 1.25, 0.0], dir: [0.8, 0.1, 0.7], height: 0.5 },
  forearms: { target: [0.36, 1.05, 0.02], dir: [0.7, 0.05, 0.8], height: 0.42 },
  abs: { target: [0, 1.13, 0.09], dir: [0.12, 0.05, 1], height: 0.45 },
  back: { target: [0, 1.3, -0.1], dir: [0.05, 0.1, -1], height: 0.62 },
  lowerback: { target: [0, 1.1, -0.1], dir: [0.1, 0.05, -1], height: 0.42 },
  glutes: { target: [0, 0.9, -0.1], dir: [0.15, 0.05, -1], height: 0.48 },
  quads: { target: [0.06, 0.73, 0.06], dir: [0.25, 0.05, 1], height: 0.6 },
  hamstrings: { target: [0.06, 0.72, -0.08], dir: [0.2, 0.05, -1], height: 0.6 },
  calves: { target: [0.1, 0.32, -0.06], dir: [0.35, 0.05, -1], height: 0.5 },
};
const VIEW_DIR: Record<ViewName, [number, number, number]> = {
  front: [0, 0.02, 1], back: [0, 0.02, -1], left: [1, 0.02, 0], right: [-1, 0.02, 0], threeQuarter: [0.75, 0.05, 1],
};

export interface ViewerOptions { reducedMotion: boolean; modelBase: string }

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30);
  readonly controls: OrbitControls;
  private slots: Record<Side, FigureSlot> | null = null;
  private model: LoadedModel | null = null;
  private compare = false;
  private lights: { neutral: THREE.Light[]; stage: THREE.Light[] } = { neutral: [], stage: [] };
  private lightMix: Record<Side, number> = { A: 0, B: 0 }; // 0 neutral, 1 stage
  private lightTarget: Record<Side, number> = { A: 0, B: 0 };
  private envNeutral: THREE.Texture | null = null;
  private shot: CamShot | null = null;
  private focusHeight = FOCUS.full.height;
  private raf = 0;
  private last = performance.now();
  private disposed = false;
  private resizeObs: ResizeObserver;
  private frameListeners = new Set<() => void>();
  private needsRender = true;
  private idleFrames = 0;
  private shadowDirty = true;
  private shadowSide: Side = 'A';
  private lastFrameAt = 0;
  private frameEma = 16;
  private framesSinceAdapt = 0;
  private readonly maxPixelRatio = Math.min(window.devicePixelRatio, 1.75);
  reducedMotion: boolean;
  readonly modelBase: string;

  constructor(private container: HTMLElement, opts: ViewerOptions) {
    this.reducedMotion = opts.reducedMotion;
    this.modelBase = opts.modelBase;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.maxPixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envNeutral = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envNeutral;
    this.scene.environmentIntensity = 0.55;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.reducedMotion;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 7;
    this.controls.target.set(0, 0.93, 0);
    this.controls.addEventListener('change', () => { this.needsRender = true; });
    this.controls.addEventListener('start', () => { this.shot = null; });

    this.buildLights();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();
    this.applyCamera(this.computeShot('full', 'front'), true);
    this.loop();
  }

  private buildLights() {
    // Neutral, soft studio rig. Same rig on both sides of a comparison.
    const key = new THREE.DirectionalLight(0xfff4ea, 2.1);
    key.position.set(1.6, 3.0, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -1.1; key.shadow.camera.right = 1.1; key.shadow.camera.top = 2.1; key.shadow.camera.bottom = -0.2;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 8;
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.022; key.shadow.radius = 1.5;
    key.target.position.set(0, 0.95, 0);
    const fill = new THREE.DirectionalLight(0xe8f0ff, 0.75);
    fill.position.set(-3, 1.6, 2);
    const rim = new THREE.DirectionalLight(0xffffff, 1.0);
    rim.position.set(-1.2, 2.4, -3);
    const rim2 = new THREE.DirectionalLight(0xffffff, 0.7);
    rim2.position.set(2, 1.8, -2.5);
    const hemi = new THREE.HemisphereLight(0xf2f4ff, 0x4a3d36, 0.35);
    this.lights.neutral = [key, fill, rim, rim2, hemi];
    // Stage rig: strong overhead and high side lights deepen shadows in grooves.
    const top = new THREE.SpotLight(0xfff1dc, 60, 9, Math.PI / 7, 0.5, 1.4);
    top.position.set(0.35, 4.2, 1.6);
    top.target.position.set(0, 1.0, 0);
    top.castShadow = true;
    top.shadow.mapSize.set(4096, 4096);
    top.shadow.camera.near = 1; top.shadow.camera.far = 7;
    top.shadow.bias = -0.0008; top.shadow.normalBias = 0.028; top.shadow.radius = 1.5;
    const sideL = new THREE.SpotLight(0xffe7cc, 22, 9, Math.PI / 8, 0.6, 1.4);
    sideL.position.set(2.4, 3.4, 0.6);
    sideL.target.position.set(0, 1.0, 0);
    const sideR = new THREE.SpotLight(0xffe7cc, 22, 9, Math.PI / 8, 0.6, 1.4);
    sideR.position.set(-2.4, 3.4, 0.6);
    sideR.target.position.set(0, 1.0, 0);
    const back = new THREE.SpotLight(0xffffff, 14, 9, Math.PI / 7, 0.6, 1.4);
    back.position.set(0, 3.5, -2.5);
    back.target.position.set(0, 1.0, 0);
    this.lights.stage = [top, sideL, sideR, back];
    for (const l of [...this.lights.neutral, ...this.lights.stage]) {
      this.scene.add(l);
      const t = (l as THREE.DirectionalLight).target;
      if (t) this.scene.add(t);
      l.userData.base = l.intensity;
    }
    // Posing platform: a dark disc with a glowing rim. The figure's lighting does not depend on it.
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.05, 96),
      new THREE.MeshStandardMaterial({ color: '#171b26', roughness: 0.45, metalness: 0.2 }));
    platform.position.y = -0.026;
    platform.receiveShadow = true;
    this.scene.add(platform);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.635, 0.006, 8, 128),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.75, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    // Ground contact shadow on top of the platform.
    const ground = new THREE.Mesh(new THREE.CircleGeometry(0.62, 64), new THREE.ShadowMaterial({ opacity: 0.3 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.0005;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.applyLightMix(0);
  }

  private applyLightMix(m: number) {
    // Hidden lights cost nothing; intensity 0 lights would still be shaded.
    for (const l of this.lights.neutral) { l.intensity = l.userData.base * (1 - m); l.visible = m < 0.999; }
    for (const l of this.lights.stage) { l.intensity = l.userData.base * m; l.visible = m > 0.001; }
    this.scene.environmentIntensity = 0.55 * (1 - m) + 0.08 * m;
    this.renderer.toneMappingExposure = 1.0 + 0.1 * m;
  }

  async load(pose = 'relaxed', onProgress?: (f: number) => void) {
    this.model = await loadModel(this.modelBase, pose, onProgress);
    const geo = this.model.geometry;
    const make = (): FigureSlot => {
      const { material, uniforms } = createSkinMaterial();
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      if (this.model!.meta.targets.length) mesh.morphTargetInfluences = new Array(this.model!.meta.targets.length).fill(0);
      this.scene.add(mesh);
      return { mesh, material, uniforms, current: { ...NEUTRAL }, target: { ...NEUTRAL } };
    };
    this.slots = { A: make(), B: make() };
    this.slots.B.mesh.visible = false;
    for (const s of ['A', 'B'] as Side[]) this.applySlot(this.slots[s]);
    this.needsRender = true;
  }

  get loaded() { return !!this.slots; }
  get meta() { return this.model?.meta ?? null; }

  setAppearance(side: Side, a: Appearance, instant = false) {
    if (!this.slots) return;
    const s = this.slots[side];
    s.target = { ...a };
    if (instant || this.reducedMotion) { s.current = { ...a }; this.applySlot(s); }
    this.needsRender = true;
  }

  getAppearance(side: Side): Appearance | null { return this.slots ? { ...this.slots[side].current } : null; }

  setCompare(on: boolean) {
    this.compare = on;
    if (this.slots) this.slots.B.mesh.visible = on;
    this.resize();
    if (this.shot) this.applyCamera(this.refit(this.shot), true);
    this.needsRender = true;
  }

  /** Lighting for both sides, or for one side of a comparison. */
  setLighting(mode: LightingMode, side?: Side) {
    const v = mode === 'stage' ? 1 : 0;
    for (const s of side ? [side] : (['A', 'B'] as Side[])) {
      this.lightTarget[s] = v;
      if (this.reducedMotion) this.lightMix[s] = v;
    }
    this.needsRender = true;
  }

  setPresentation(p: Presentation) {
    if (!this.slots) return;
    const [r, g, b] = skinAlbedo(p);
    for (const s of Object.values(this.slots)) {
      s.material.color.setRGB(r, g, b, THREE.SRGBColorSpace);
      // Sheen follows the skin so deep tones do not get a pale haze.
      s.material.sheenColor.setRGB(Math.min(1, r * 1.25 + 0.08), Math.min(1, g * 1.2 + 0.06), Math.min(1, b * 1.15 + 0.05), THREE.SRGBColorSpace);
      // Spray tan products leave a faint satin finish; oil adds a real gloss layer.
      s.material.clearcoat = p.oil;
      s.material.clearcoatRoughness = 0.3 - 0.15 * p.oil;
      s.material.roughness = 0.52 - 0.04 * p.tan - 0.2 * p.oil;
      s.material.sheen = 0.25 * (1 - p.oil);
    }
    this.needsRender = true;
  }

  /** Highlight body regions (by region name) on one or both sides. */
  setHighlight(regions: string[], sides: Side[] = ['A', 'B']) {
    if (!this.slots || !this.model) return;
    const names = this.model.meta.regions;
    for (const side of ['A', 'B'] as Side[]) {
      const arr = new Array(REGION_COUNT).fill(0);
      if (sides.includes(side)) for (const r of regions) { const i = names.indexOf(r); if (i >= 0) arr[i] = 1; }
      this.slots[side].uniforms.uHighlight.value = arr;
    }
    this.needsRender = true;
  }

  /** Average GPU frame time over a few synchronized renders (used once after load to pick a detail level). */
  measureFrameMs(frames = 3): number {
    const gl = this.renderer.getContext();
    const px = new Uint8Array(4);
    this.render();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < frames; i++) { this.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    return (performance.now() - t0) / frames;
  }

  private applySlot(s: FigureSlot) {
    this.shadowDirty = true;
    const r = toRenderParams(s.current);
    const inf = s.mesh.morphTargetInfluences!;
    const m = s.uniforms.uMorph.value;
    const baked = this.model?.meta.targets ?? [];
    // Baked targets may be a subset (fast builds); map by name.
    for (let i = 0; i < baked.length; i++) {
      const v = r.influences[TARGET_ORDER.indexOf(baked[i].name as (typeof TARGET_ORDER)[number])] ?? 0;
      inf[i] = v;
      if (i < 12) m[i] = v;
    }
    s.uniforms.uStri.value = r.stri;
    s.uniforms.uGrain.value = r.grain;
    s.uniforms.uVeinTint.value = r.veinTint;
  }

  // ---------- camera ----------
  private viewportAspect() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    return (this.compare ? w / 2 : w) / h;
  }

  private computeShot(focus: FocusName, view?: ViewName): CamShot {
    const f = FOCUS[focus];
    const dir = new THREE.Vector3(...(view ? VIEW_DIR[view] : f.dir)).normalize();
    if (view && focus !== 'full') {
      // keep the region's preferred side when the region faces away from the requested view
      const pref = new THREE.Vector3(...f.dir);
      if (pref.z * dir.z < 0 && Math.abs(dir.z) > 0.5) dir.z *= -1;
    }
    this.focusHeight = f.height;
    return this.refit({ target: new THREE.Vector3(...f.target), dir, dist: 0 });
  }

  private refit(s: CamShot): CamShot {
    const vfov = (this.camera.fov * Math.PI) / 180;
    const aspect = this.viewportAspect();
    const hNeeded = Math.max(this.focusHeight, (this.focusHeight * 0.62) / aspect);
    const dist = (hNeeded / 2) / Math.tan(vfov / 2) * 1.08;
    return { ...s, dist };
  }

  private applyCamera(s: CamShot, instant = false) {
    this.shot = s;
    if (instant || this.reducedMotion) {
      this.controls.target.copy(s.target);
      this.camera.position.copy(s.target).addScaledVector(s.dir, s.dist);
      this.controls.update();
      this.shot = null;
    }
    this.needsRender = true;
  }

  setView(view: ViewName, focus: FocusName = 'full') { this.applyCamera(this.computeShot(focus, view)); }
  focus(focus: FocusName) { this.applyCamera(this.computeShot(focus)); }
  resetCamera() { this.applyCamera(this.computeShot('full', 'front')); }

  /** Snapshot of the camera for tests/screenshots. */
  cameraState() {
    return { position: this.camera.position.toArray(), target: this.controls.target.toArray() };
  }

  onFrame(cb: () => void) { this.frameListeners.add(cb); return () => this.frameListeners.delete(cb); }

  private resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = this.viewportAspect();
    this.camera.updateProjectionMatrix();
    this.needsRender = true;
  }

  /** True while transitions are running. */
  get animating() { return this.idleFrames < 2; }

  private step(dt: number): boolean {
    let moving = false;
    const k = 1 - Math.exp(-dt * 5.5);
    if (this.slots) for (const s of Object.values(this.slots)) {
      let changed = false;
      for (const key of APPEARANCE_KEYS) {
        const d = s.target[key] - s.current[key];
        if (Math.abs(d) > 1e-4) { s.current[key] += d * k; changed = true; } else s.current[key] = s.target[key];
      }
      if (changed) { this.applySlot(s); moving = true; this.shadowDirty = true; }
    }
    for (const s of ['A', 'B'] as Side[]) {
      const d = this.lightTarget[s] - this.lightMix[s];
      if (Math.abs(d) > 1e-3) { this.lightMix[s] += d * k; moving = true; this.shadowDirty = true; }
      else if (d !== 0) { this.lightMix[s] = this.lightTarget[s]; moving = true; this.shadowDirty = true; }
    }
    if (this.shot) {
      const s = this.shot;
      const goalPos = s.target.clone().addScaledVector(s.dir, s.dist);
      this.controls.target.lerp(s.target, k);
      this.camera.position.lerp(goalPos, k);
      if (this.camera.position.distanceTo(goalPos) < 1e-3 && this.controls.target.distanceTo(s.target) < 1e-3) this.shot = null;
      this.controls.update();
      moving = true;
    }
    return moving;
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const moving = this.step(dt);
    const damping = this.controls.update();
    if (moving || damping || this.needsRender) {
      this.render();
      this.needsRender = false;
      this.idleFrames = 0;
      this.adaptResolution(now);
    } else { this.idleFrames++; this.lastFrameAt = 0; }
    for (const cb of this.frameListeners) cb();
  };

  render() {
    const r = this.renderer;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!this.slots) { r.clear(); return; }
    if (!this.compare) {
      r.setScissorTest(false);
      r.setViewport(0, 0, w, h);
      this.slots.A.mesh.visible = true; this.slots.B.mesh.visible = false;
      this.applyLightMix(this.lightMix.A);
      // Shadows depend on the body and the lights, not on the camera: skip them while orbiting.
      if (this.shadowDirty || this.shadowSide !== 'A') r.shadowMap.needsUpdate = true;
      this.shadowDirty = false; this.shadowSide = 'A';
      r.render(this.scene, this.camera);
      return;
    }
    r.setScissorTest(true);
    const half = Math.floor(w / 2);
    for (const [side, x, width] of [['A', 0, half], ['B', half, w - half]] as const) {
      this.slots.A.mesh.visible = side === 'A';
      this.slots.B.mesh.visible = side === 'B';
      this.applyLightMix(this.lightMix[side]);
      // Each side needs its own shadow pass (different body or light).
      r.shadowMap.needsUpdate = true;
      r.setViewport(x, 0, width, h);
      r.setScissor(x, 0, width, h);
      r.render(this.scene, this.camera);
    }
    this.shadowDirty = false; this.shadowSide = 'B';
    r.setScissorTest(false);
  }

  /** Lowers the pixel ratio when frames are slow during motion, raises it again when fast. */
  private adaptResolution(now: number) {
    if (this.lastFrameAt > 0) {
      const dt = now - this.lastFrameAt;
      this.frameEma = this.frameEma * 0.9 + dt * 0.1;
      if (++this.framesSinceAdapt > 30) {
        const pr = this.renderer.getPixelRatio();
        if (this.frameEma > 34 && pr > 0.75) { this.renderer.setPixelRatio(Math.max(0.75, pr - 0.25)); this.resize(); this.framesSinceAdapt = 0; }
        else if (this.frameEma < 18 && pr < this.maxPixelRatio) { this.renderer.setPixelRatio(Math.min(this.maxPixelRatio, pr + 0.25)); this.resize(); this.framesSinceAdapt = 0; }
      }
    }
    this.lastFrameAt = now;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

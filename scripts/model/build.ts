// Builds the figure mesh, morph targets, anatomy attributes and skin weights from the procedural field.
// Usage: bun scripts/model/build.ts [--h 0.0035] [--pose relaxed] [--out public/model] [--targets none|a,b] [--workers N]
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Field, type VeinPath } from './field';
import { ANATOMY } from './anatomy';
import { BASE_STATE, REGIONS, type FieldState, type V3 } from './types';
import { POSES, solvePose, posePt, rigManifest } from './skeleton';
import { bakeSkinWeights } from './skinWeights';
import type { Job, JobResult } from './worker';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const H = Number(args.get('h') ?? 0.0035);
const POSE = args.get('pose') ?? 'relaxed';
const OUT = args.get('out') ?? 'public/model';
const BLOCK = 8;

/** Morph targets: each is a full appearance state; the app blends their displacements. */
export const TARGETS: { name: string; state: Partial<FieldState> }[] = [
  { name: 'full', state: { full: 1 } },
  { name: 'flat', state: { full: -1 } },
  { name: 'sizeUp', state: { size: 1 } },
  { name: 'sizeDown', state: { size: -1 } },
  { name: 'fat', state: { fat: 1 } },
  { name: 'smooth', state: { smooth: 1 } },
  { name: 'sep', state: { sep: 1 } },
  { name: 'detail', state: { detail: 1 } },
  { name: 'vein', state: { vein: 1 } },
];
// --targets none|full,flat,... builds a subset (fast anatomy iteration).
const TARGET_FILTER = args.get('targets');
const ACTIVE_TARGETS = TARGET_FILTER === undefined ? TARGETS
  : TARGET_FILTER === 'none' ? [] : TARGETS.filter((t) => TARGET_FILTER.split(',').includes(t.name));

// ---------------- worker pool ----------------
const NW = Math.max(2, Math.min(28, Number(args.get('workers') ?? cpus().length - 2)));
const workers = Array.from({ length: NW }, () => new Worker(new URL('./worker.ts', import.meta.url).href));
let jobId = 0;
const pending = new Map<number, (v: JobResult) => void>();
for (const w of workers) w.onmessage = (ev: MessageEvent<JobResult>) => { const r = pending.get(ev.data.id); pending.delete(ev.data.id); r?.(ev.data); };
let rr = 0;
function run(job: Job, transfer: ArrayBuffer[] = []): Promise<JobResult> {
  const id = jobId++;
  const { promise, resolve } = Promise.withResolvers<JobResult>();
  pending.set(id, resolve);
  workers[rr++ % NW].postMessage({ id, job }, transfer);
  return promise;
}

const t0 = performance.now();
const log = (...m: unknown[]) => console.log(`[${((performance.now() - t0) / 1000).toFixed(1)}s]`, ...m);

// ---------------- 1. sample the base field on a narrow band ----------------
const base = new Field(ANATOMY, BASE_STATE, POSE);
const bb = base.bounds();
const origin: V3 = [bb.min[0] - 0.02, bb.min[1] - 0.02, bb.min[2] - 0.02];
const dims = [0, 1, 2].map((k) => Math.ceil((bb.max[k] - bb.min[k] + 0.04) / (H * BLOCK))) as V3; // blocks per axis
const NX = dims[0] * BLOCK + 1, NY = dims[1] * BLOCK + 1, NZ = dims[2] * BLOCK + 1;
log(`grid ${NX}x${NY}x${NZ} h=${H}  workers=${NW}`);

const HB = H * BLOCK;
const coarse = new Float32Array((dims[0] + 1) * (dims[1] + 1) * (dims[2] + 1));
for (let k = 0; k <= dims[2]; k++) for (let j = 0; j <= dims[1]; j++) for (let i = 0; i <= dims[0]; i++) {
  coarse[i + (dims[0] + 1) * (j + (dims[1] + 1) * k)] = base.eval(origin[0] + i * HB, origin[1] + j * HB, origin[2] + k * HB);
}
const cidx = (i: number, j: number, k: number) => i + (dims[0] + 1) * (j + (dims[1] + 1) * k);
const marked = new Uint8Array(dims[0] * dims[1] * dims[2]);
const bidx = (i: number, j: number, k: number) => i + dims[0] * (j + dims[1] * k);
const thresh = HB * 1.1;
for (let k = 0; k < dims[2]; k++) for (let j = 0; j < dims[1]; j++) for (let i = 0; i < dims[0]; i++) {
  let mn = 1e9, pos = false, neg = false;
  for (let c = 0; c < 8; c++) {
    const v = coarse[cidx(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))];
    mn = Math.min(mn, Math.abs(v)); if (v > 0) pos = true; else neg = true;
  }
  if (mn < thresh || (pos && neg)) marked[bidx(i, j, k)] = 1;
}
// dilate by one block
const dil = marked.slice();
for (let k = 0; k < dims[2]; k++) for (let j = 0; j < dims[1]; j++) for (let i = 0; i < dims[0]; i++) {
  if (!marked[bidx(i, j, k)]) continue;
  for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const a = i + dx, b = j + dy, c = k + dz;
    if (a >= 0 && b >= 0 && c >= 0 && a < dims[0] && b < dims[1] && c < dims[2]) dil[bidx(a, b, c)] = 1;
  }
}
const blockList: number[] = [];
for (let k = 0; k < dims[2]; k++) for (let j = 0; j < dims[1]; j++) for (let i = 0; i < dims[0]; i++) if (dil[bidx(i, j, k)]) blockList.push(i, j, k);
const nBlocks = blockList.length / 3;
log(`narrow band blocks: ${nBlocks}`);

const vals = new Float32Array(NX * NY * NZ).fill(1);
{
  const per = Math.ceil(nBlocks / (NW * 6));
  const jobs: Promise<void>[] = [];
  for (let lo = 0; lo < nBlocks; lo += per) {
    const hi = Math.min(nBlocks, lo + per);
    const blocks = Int32Array.from(blockList.slice(lo * 3, hi * 3));
    jobs.push(run({ type: 'blocks', state: BASE_STATE, pose: POSE, origin, h: H, B: BLOCK, blocks }).then(({ out }) => {
      if (!out) throw new Error('blocks job returned no values');
      const n = BLOCK + 1;
      let o = 0;
      for (let b = 0; b < blocks.length / 3; b++) {
        const bx = blocks[b * 3] * BLOCK, by = blocks[b * 3 + 1] * BLOCK, bz = blocks[b * 3 + 2] * BLOCK;
        for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) vals[bx + i + NX * (by + j + NY * (bz + k))] = out[o++];
      }
    }));
  }
  await Promise.all(jobs);
}
log('sampled');

// ---------------- 2. surface nets ----------------
const cellVert = new Int32Array(NX * NY * NZ).fill(-1);
const vpos: number[] = [];
const inBand = (i: number, j: number, k: number) => {
  const bi = Math.floor(i / BLOCK), bj = Math.floor(j / BLOCK), bk = Math.floor(k / BLOCK);
  return bi < dims[0] && bj < dims[1] && bk < dims[2] && dil[bidx(bi, bj, bk)] === 1;
};
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
for (let b = 0; b < nBlocks; b++) {
  const bx = blockList[b * 3] * BLOCK, by = blockList[b * 3 + 1] * BLOCK, bz = blockList[b * 3 + 2] * BLOCK;
  for (let k = bz; k < bz + BLOCK; k++) for (let j = by; j < by + BLOCK; j++) for (let i = bx; i < bx + BLOCK; i++) {
    const c: number[] = [];
    let mask = 0;
    for (let q = 0; q < 8; q++) {
      const v = vals[i + (q & 1) + NX * (j + ((q >> 1) & 1) + NY * (k + ((q >> 2) & 1)))];
      c.push(v); if (v < 0) mask |= 1 << q;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, bq] of EDGES) {
      const va = c[a], vb = c[bq];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      sx += (a & 1) + t * ((bq & 1) - (a & 1));
      sy += ((a >> 1) & 1) + t * (((bq >> 1) & 1) - ((a >> 1) & 1));
      sz += ((a >> 2) & 1) + t * (((bq >> 2) & 1) - ((a >> 2) & 1));
      n++;
    }
    cellVert[i + NX * (j + NY * k)] = vpos.length / 3;
    vpos.push(origin[0] + (i + sx / n) * H, origin[1] + (j + sy / n) * H, origin[2] + (k + sz / n) * H);
  }
}
const tris: number[] = [];
const cv = (i: number, j: number, k: number) => (i < 0 || j < 0 || k < 0 ? -1 : cellVert[i + NX * (j + NY * k)]);
const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
  if (a < 0 || b < 0 || c < 0 || d < 0) return;
  // split along the shorter diagonal
  const d02 = (vpos[a * 3] - vpos[c * 3]) ** 2 + (vpos[a * 3 + 1] - vpos[c * 3 + 1]) ** 2 + (vpos[a * 3 + 2] - vpos[c * 3 + 2]) ** 2;
  const d13 = (vpos[b * 3] - vpos[d * 3]) ** 2 + (vpos[b * 3 + 1] - vpos[d * 3 + 1]) ** 2 + (vpos[b * 3 + 2] - vpos[d * 3 + 2]) ** 2;
  const t = d02 < d13 ? [a, b, c, a, c, d] : [a, b, d, b, c, d];
  if (flip) for (let q = 0; q < 6; q += 3) { const s = t[q + 1]; t[q + 1] = t[q + 2]; t[q + 2] = s; }
  tris.push(...t);
};
for (let b = 0; b < nBlocks; b++) {
  const bx = blockList[b * 3] * BLOCK, by = blockList[b * 3 + 1] * BLOCK, bz = blockList[b * 3 + 2] * BLOCK;
  for (let k = bz; k < bz + BLOCK; k++) for (let j = by; j < by + BLOCK; j++) for (let i = bx; i < bx + BLOCK; i++) {
    const v0 = vals[i + NX * (j + NY * k)];
    const in0 = v0 < 0;
    // +x edge
    if (i + 1 < NX && (vals[i + 1 + NX * (j + NY * k)] < 0) !== in0 && inBand(i, j - 1, k - 1))
      quad(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k), !in0);
    // +y edge
    if (j + 1 < NY && (vals[i + NX * (j + 1 + NY * k)] < 0) !== in0 && inBand(i - 1, j, k - 1))
      quad(cv(i - 1, j, k - 1), cv(i - 1, j, k), cv(i, j, k), cv(i, j, k - 1), !in0);
    // +z edge
    if (k + 1 < NZ && (vals[i + NX * (j + NY * (k + 1))] < 0) !== in0 && inBand(i - 1, j - 1, k))
      quad(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k), !in0);
  }
}
// Keep only the outer skin: the largest connected component (drops internal pockets).
const { pos: keptPos, index: keptIndex } = (() => {
  const nv0 = vpos.length / 3;
  const parent = new Int32Array(nv0).map((_, i) => i);
  const find = (a: number): number => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (let t = 0; t < tris.length; t += 3) {
    const a = find(tris[t]), b = find(tris[t + 1]), c = find(tris[t + 2]);
    parent[b] = a; parent[find(c)] = a;
  }
  const size = new Int32Array(nv0);
  for (let v = 0; v < nv0; v++) size[find(v)]++;
  let root = 0;
  for (let v = 0; v < nv0; v++) if (size[v] > size[root]) root = v;
  const remap = new Int32Array(nv0).fill(-1);
  const outP: number[] = [];
  for (let v = 0; v < nv0; v++) if (find(v) === root) { remap[v] = outP.length / 3; outP.push(vpos[v * 3], vpos[v * 3 + 1], vpos[v * 3 + 2]); }
  const outI: number[] = [];
  for (let t = 0; t < tris.length; t += 3) if (remap[tris[t]] >= 0) outI.push(remap[tris[t]], remap[tris[t + 1]], remap[tris[t + 2]]);
  return { pos: Float32Array.from(outP), index: Uint32Array.from(outI) };
})();
let pos: Float32Array = keptPos;
const index = keptIndex;
const NV = pos.length / 3;
log(`surface nets: ${vpos.length / 3} verts -> outer skin ${NV} verts, ${index.length / 3} tris`);

// ---------------- 3. smooth + project onto the surface ----------------
function laplacian(p: Float32Array, lambda: number): Float32Array {
  const acc = new Float32Array(p.length), cnt = new Uint16Array(NV);
  for (let t = 0; t < index.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = index[t + e], b = index[t + ((e + 1) % 3)];
      acc[a * 3] += p[b * 3]; acc[a * 3 + 1] += p[b * 3 + 1]; acc[a * 3 + 2] += p[b * 3 + 2]; cnt[a]++;
      acc[b * 3] += p[a * 3]; acc[b * 3 + 1] += p[a * 3 + 1]; acc[b * 3 + 2] += p[a * 3 + 2]; cnt[b]++;
    }
  }
  const out = new Float32Array(p.length);
  for (let v = 0; v < NV; v++) for (let c = 0; c < 3; c++) {
    const avg = cnt[v] ? acc[v * 3 + c] / cnt[v] : p[v * 3 + c];
    out[v * 3 + c] = p[v * 3 + c] + lambda * (avg - p[v * 3 + c]);
  }
  return out;
}
async function refine(p: Float32Array, iters: number, state: FieldState = BASE_STATE): Promise<{ p: Float32Array; n: Float32Array }> {
  const outP = new Float32Array(p.length), outN = new Float32Array(p.length);
  const nv = p.length / 3, per = Math.ceil(nv / (NW * 4));
  const jobs: Promise<void>[] = [];
  for (let lo = 0; lo < nv; lo += per) {
    const hi = Math.min(nv, lo + per);
    jobs.push(run({ type: 'refine', state, pose: POSE, pos: p.slice(lo * 3, hi * 3), iters }).then((r) => {
      outP.set(r.out!, lo * 3); outN.set(r.nrm!, lo * 3);
    }));
  }
  await Promise.all(jobs);
  return { p: outP, n: outN };
}
let nrm: Float32Array;
{
  let r = await refine(pos, 3);
  for (let s = 0; s < 2; s++) {
    pos = laplacian(laplacian(r.p, 0.5), -0.53);
    r = await refine(pos, 2);
  }
  pos = r.p; nrm = r.n;
}
log('refined base surface');

// ---------------- 4. veins: project authored paths onto the base skin ----------------
const xf = solvePose(POSES[POSE] ?? {});
const veinPaths: VeinPath[] = [];
const veinSamples: { p: V3; r: number }[] = [];
for (const v of ANATOMY.veins) {
  for (const side of [1, -1] as const) {
    const ctrl = v.pts.map((q) => posePt(xf, q, side));
    // Catmull-Rom resample every ~4 mm
    const pts: V3[] = [], rs: number[] = [];
    const total = ctrl.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - ctrl[i][0], q[1] - ctrl[i][1], q[2] - ctrl[i][2]), 0);
    const nS = Math.max(4, Math.ceil(total / 0.004));
    for (let s = 0; s <= nS; s++) {
      const u = (s / nS) * (ctrl.length - 1);
      const i = Math.min(ctrl.length - 2, Math.floor(u)), t = u - i;
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      const c = (k: number) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
      let q: V3 = [c(0), c(1), c(2)];
      for (let it = 0; it < 6; it++) {
        const d = base.eval(...q), g = base.grad(...q);
        q = [q[0] - g[0] * d, q[1] - g[1] * d, q[2] - g[2] * d];
      }
      const g = base.grad(...q);
      const fr = s / nS;
      const taper = v.taper ?? 1;
      // Prominent superficial veins on a very lean athlete are a few millimeters high.
      const r = 1.35 * v.r * (1 + (taper - 1) * fr) * (0.9 + 0.1 * Math.sin(s * 0.7));
      const depth = r * 0.2;
      pts.push([q[0] - g[0] * depth, q[1] - g[1] * depth, q[2] - g[2] * depth]);
      rs.push(r);
      veinSamples.push({ p: q, r });
    }
    veinPaths.push({ pts, r: rs, region: REGIONS.indexOf(v.region) });
  }
}
log(`veins: ${veinPaths.length} paths`);

// ---------------- 5. morph targets ----------------
interface TargetOut { name: string; dp: Float32Array; dn: Float32Array; ao: Float32Array }
// Vertex adjacency (CSR) for smoothing scalar offsets.
const adjStart = new Int32Array(NV + 1);
const adjList = (() => {
  const deg = new Int32Array(NV);
  for (let t = 0; t < index.length; t++) deg[index[t]] += 2;
  for (let v = 0; v < NV; v++) adjStart[v + 1] = adjStart[v] + deg[v];
  const fill = adjStart.slice(0, NV);
  const list = new Int32Array(adjStart[NV]);
  for (let t = 0; t < index.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = index[t + e], b = index[t + ((e + 1) % 3)];
    list[fill[a]++] = b; list[fill[b]++] = a;
  }
  return list;
})();

function meshNormals(p: Float32Array): Float32Array {
  const n = new Float32Array(p.length);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) { n[i] += nx; n[i + 1] += ny; n[i + 2] += nz; }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
  }
  return n;
}

/** Offsets along the base normal; failed or outlier vertices take their neighbors' average. */
function cleanOffsets(s: Float32Array, fail: Uint8Array, smoothMix = 0.4): Float32Array {
  let cur = s.slice();
  const bad = fail.slice();
  for (let it = 0; it < 400; it++) {
    const next = cur.slice();
    let remaining = 0, changed = 0;
    for (let v = 0; v < NV; v++) {
      let sum = 0, cnt = 0;
      for (let k = adjStart[v]; k < adjStart[v + 1]; k++) { const u = adjList[k]; if (!bad[u]) { sum += cur[u]; cnt++; } }
      if (!cnt) { if (bad[v]) remaining++; continue; }
      const avg = sum / cnt;
      if (bad[v] || (it < 6 && Math.abs(cur[v] - avg) > 0.0025)) { next[v] = avg; bad[v] = 0; changed++; }
    }
    cur = next;
    if (it >= 6 && (remaining === 0 || changed === 0)) break;
  }
  // light smoothing to remove sampling noise
  const out = cur.slice();
  for (let v = 0; v < NV; v++) {
    let sum = 0, cnt = 0;
    for (let k = adjStart[v]; k < adjStart[v + 1]; k++) { sum += cur[adjList[k]]; cnt++; }
    if (cnt) out[v] = cur[v] * (1 - smoothMix) + (sum / cnt) * smoothMix;
  }
  return out;
}

async function project(state: FieldState, veins?: VeinPath[]): Promise<{ p: Float32Array; ao: Float32Array }> {
  const outP = new Float32Array(pos.length), ao = new Float32Array(NV), fail = new Uint8Array(NV);
  const per = Math.ceil(NV / (NW * 4));
  const jobs: Promise<void>[] = [];
  for (let lo = 0; lo < NV; lo += per) {
    const hi = Math.min(NV, lo + per);
    jobs.push(run({ type: 'project', state, pose: POSE, veins, pos: pos.slice(lo * 3, hi * 3), nrm: nrm.slice(lo * 3, hi * 3), maxDist: 0.04 }).then((r) => {
      outP.set(r.out!, lo * 3); ao.set(r.ao!, lo); fail.set(r.fail!, lo);
    }));
  }
  await Promise.all(jobs);
  const s = new Float32Array(NV);
  for (let v = 0; v < NV; v++) {
    s[v] = (outP[v * 3] - pos[v * 3]) * nrm[v * 3] + (outP[v * 3 + 1] - pos[v * 3 + 1]) * nrm[v * 3 + 1] + (outP[v * 3 + 2] - pos[v * 3 + 2]) * nrm[v * 3 + 2];
  }
  const sc = cleanOffsets(s, fail, veins ? 0.1 : 0.4);
  const p = new Float32Array(pos.length);
  for (let v = 0; v < NV; v++) for (let c = 0; c < 3; c++) p[v * 3 + c] = pos[v * 3 + c] + nrm[v * 3 + c] * sc[v];
  let nf = 0; for (let v = 0; v < NV; v++) nf += fail[v];
  if (nf) log(`  ${nf} vertices without a root (filled from neighbors)`);
  return { p, ao };
}
const baseProj = await project(BASE_STATE);
const baseAo = baseProj.ao;
const baseP = baseProj.p;
const baseN = meshNormals(baseP);
const targets: TargetOut[] = [];
for (const t of ACTIVE_TARGETS) {
  const state = { ...BASE_STATE, ...t.state };
  const r = await project(state, t.name === 'vein' ? veinPaths : undefined);
  // Soft-tissue targets fill creases; vertices on crease walls bunch up and fold. Relax them
  // tangentially (Taubin) and re-project onto the target surface; vertex identity is kept.
  if (t.name === 'fat' || t.name === 'smooth') {
    for (let s = 0; s < 3; s++) {
      const relaxed = laplacian(laplacian(r.p, 0.5), -0.53);
      r.p = (await refine(relaxed, 2, state)).p;
    }
  }
  const tn = meshNormals(r.p);
  const dp = new Float32Array(pos.length), dn = new Float32Array(pos.length), dao = new Float32Array(NV);
  for (let i = 0; i < pos.length; i++) { dp[i] = r.p[i] - baseP[i]; dn[i] = tn[i] - baseN[i]; }
  for (let i = 0; i < NV; i++) dao[i] = r.ao[i] - baseAo[i];
  targets.push({ name: t.name, dp, dn, ao: dao });
  log(`target ${t.name}`);
}
pos = baseP; nrm = baseN;

// ---------------- 6. anatomy attributes ----------------
const info = { fiber: new Float32Array(NV * 3), across: new Float32Array(NV), mus: new Float32Array(NV * 4), region: new Uint8Array(NV), part: new Int16Array(NV) };
{
  const per = Math.ceil(NV / (NW * 4));
  const jobs: Promise<void>[] = [];
  for (let lo = 0; lo < NV; lo += per) {
    const hi = Math.min(NV, lo + per);
    jobs.push(run({ type: 'info', state: BASE_STATE, pose: POSE, pos: pos.slice(lo * 3, hi * 3) }).then((r) => {
      info.fiber.set(r.fiber!, lo * 3); info.across.set(r.across!, lo); info.mus.set(r.mus!, lo * 4); info.region.set(r.region!, lo); info.part.set(r.part!, lo);
    }));
  }
  await Promise.all(jobs);
}
log('anatomy attributes');
const skin = bakeSkinWeights(base, pos, adjStart, adjList, H);
log(`skin weights (${skin.filled} vertices without a nearby part took their neighbors' weights)`);

// Vein proximity (for subtle color), trunks signed distance.
const veinProx = new Float32Array(NV);
{
  const cell = 0.01, grid = new Map<string, number[]>();
  veinSamples.forEach((s, i) => {
    const key = `${Math.floor(s.p[0] / cell)},${Math.floor(s.p[1] / cell)},${Math.floor(s.p[2] / cell)}`;
    (grid.get(key) ?? grid.set(key, []).get(key)!).push(i);
  });
  for (let v = 0; v < NV; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    let best = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const l = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
      if (!l) continue;
      for (const i of l) {
        const s = veinSamples[i];
        const d = Math.hypot(x - s.p[0], y - s.p[1], z - s.p[2]);
        best = Math.max(best, Math.exp(-((d / (s.r * 1.6)) ** 2)));
      }
    }
    veinProx[v] = best;
  }
}
const trunks = new Float32Array(NV);
for (let v = 0; v < NV; v++) {
  const x = Math.abs(pos[v * 3]), y = pos[v * 3 + 1], z = pos[v * 3 + 2];
  const front = Math.min(1, Math.max(0, (z + 0.03) / 0.06));
  const top = 0.968 + 0.22 * x * x / 0.02 * 0.1 + (1 - front) * 0.02;
  const legSlope = 0.82 * front + 0.6 * (1 - front);
  const leg = 0.84 + Math.max(0, x - 0.02) * legSlope;
  let d = Math.min(top - y, y - leg);
  if (x > 0.2 || y < 0.75 || y > 1.1) d = -0.05;
  trunks[v] = d;
}

// ---------------- 7. write ----------------
mkdirSync(OUT, { recursive: true });
const chunks: { name: string; data: ArrayBufferView; type: string; size: number; normalized?: boolean; scale?: number }[] = [];
const q16 = (a: Float32Array, scale: number) => { const o = new Int16Array(a.length); for (let i = 0; i < a.length; i++) o[i] = Math.round(Math.max(-1, Math.min(1, a[i] / scale)) * 32767); return o; };
const q8s = (a: Float32Array, scale: number) => { const o = new Int8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = Math.round(Math.max(-1, Math.min(1, a[i] / scale)) * 127); return o; };
const q8u = (a: Float32Array) => { const o = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = Math.round(Math.max(0, Math.min(1, a[i])) * 255); return o; };
const maxAbs = (a: Float32Array) => { let m = 1e-6; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m; };

chunks.push({ name: 'position', data: pos, type: 'f32', size: 3 });
chunks.push({ name: 'normal', data: q16(nrm, 1), type: 'i16', size: 3, normalized: true });
chunks.push({ name: 'index', data: index, type: 'u32', size: 1 });
chunks.push({ name: 'aFiber', data: q16(info.fiber, 1), type: 'i16', size: 3, normalized: true });
chunks.push({ name: 'aAcross', data: info.across, type: 'f32', size: 1 });
chunks.push({ name: 'aMus', data: q8u(info.mus), type: 'u8', size: 4, normalized: true });
const misc = new Uint8Array(NV * 4);
for (let v = 0; v < NV; v++) { misc[v * 4] = info.region[v]; misc[v * 4 + 1] = Math.round(veinProx[v] * 255); misc[v * 4 + 2] = Math.round(Math.max(0, Math.min(1, baseAo[v])) * 255); misc[v * 4 + 3] = 0; }
chunks.push({ name: 'aMisc', data: misc, type: 'u8', size: 4 });
chunks.push({ name: 'aTrunks', data: q16(trunks, 0.1), type: 'i16', size: 1, normalized: true, scale: 0.1 });
chunks.push({ name: 'aPart', data: info.part, type: 'i16', size: 1 });
// AO deltas packed 4 per attribute
const nAo = Math.ceil(targets.length / 4);
for (let a = 0; a < nAo; a++) {
  const arr = new Int8Array(NV * 4);
  for (let c = 0; c < 4; c++) {
    const t = targets[a * 4 + c];
    if (!t) continue;
    for (let v = 0; v < NV; v++) arr[v * 4 + c] = Math.round(Math.max(-1, Math.min(1, t.ao[v])) * 127);
  }
  chunks.push({ name: `aAo${a}`, data: arr, type: 'i8', size: 4, normalized: true });
}
const targetMeta = targets.map((t) => {
  const ps = maxAbs(t.dp), ns = maxAbs(t.dn);
  // Int8 per-target quantization: about 0.2 mm steps for a 3 cm max offset; halves the file.
  chunks.push({ name: `morph:${t.name}:position`, data: q8s(t.dp, ps), type: 'i8', size: 3, scale: ps });
  chunks.push({ name: `morph:${t.name}:normal`, data: q8s(t.dn, ns), type: 'i8', size: 3, scale: ns });
  return { name: t.name, posScale: ps, nrmScale: ns };
});
chunks.push({ name: 'aBone', data: skin.index, type: 'u8', size: 4 });
chunks.push({ name: 'aBoneW', data: skin.weight, type: 'u8', size: 4, normalized: true });

let offset = 0;
const layout = chunks.map((c) => {
  const pad = (4 - (offset % 4)) % 4; offset += pad;
  const e = { name: c.name, type: c.type, size: c.size, normalized: !!c.normalized, scale: c.scale ?? 1, offset, byteLength: c.data.byteLength };
  offset += c.data.byteLength;
  return e;
});
const buf = new Uint8Array(offset);
chunks.forEach((c, i) => buf.set(new Uint8Array(c.data.buffer, c.data.byteOffset, c.data.byteLength), layout[i].offset));
writeFileSync(`${OUT}/${POSE}.bin`, buf);
const parts = Array.from({ length: base.parts.length }, (_, i) => base.partName(i));
writeFileSync(`${OUT}/${POSE}.json`, JSON.stringify({
  pose: POSE, vertexCount: NV, indexCount: index.length, h: H, targets: targetMeta, chunks: layout, regions: REGIONS, parts,
  aoTargets: targets.map((t) => t.name), rig: rigManifest(POSE), generated: new Date().toISOString(),
}, null, 1));
log(`wrote ${OUT}/${POSE}.bin (${(offset / 1e6).toFixed(1)} MB)`);
for (const w of workers) w.terminate();

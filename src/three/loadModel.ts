import * as THREE from 'three';

export interface ChunkMeta {
  name: string; type: 'f32' | 'i16' | 'u32' | 'u8' | 'i8'; size: number; normalized: boolean; scale: number; offset: number; byteLength: number;
}
export interface ModelMeta {
  pose: string; vertexCount: number; indexCount: number; h: number;
  targets: { name: string; posScale: number; nrmScale: number }[];
  chunks: ChunkMeta[]; regions: string[]; parts: string[]; aoTargets: string[];
}
export interface LoadedModel { geometry: THREE.BufferGeometry; meta: ModelMeta; targetIndex: Record<string, number> }

const CTOR = { f32: Float32Array, i16: Int16Array, u32: Uint32Array, u8: Uint8Array, i8: Int8Array } as const;

export async function loadModel(base: string, pose: string, onProgress?: (f: number) => void): Promise<LoadedModel> {
  const metaRes = await fetch(`${base}/${pose}.json`);
  if (!metaRes.ok) throw new Error(`Model metadata failed to load (${metaRes.status})`);
  const meta = (await metaRes.json()) as ModelMeta;
  const res = await fetch(`${base}/${pose}.bin`);
  if (!res.ok || !res.body) throw new Error(`Model data failed to load (${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); got += value.byteLength;
    if (total) onProgress?.(got / total);
  }
  const buf = new Uint8Array(got);
  let o = 0;
  for (const p of parts) { buf.set(p, o); o += p.byteLength; }

  const view = (c: ChunkMeta) => {
    const C = CTOR[c.type];
    return new C(buf.buffer, c.offset, c.byteLength / C.BYTES_PER_ELEMENT);
  };
  const g = new THREE.BufferGeometry();
  const morphPos: THREE.BufferAttribute[] = [];
  const morphNrm: THREE.BufferAttribute[] = [];
  const targetIndex: Record<string, number> = {};
  for (const c of meta.chunks) {
    const arr = view(c);
    if (c.name === 'index') { g.setIndex(new THREE.BufferAttribute(arr, 1)); continue; }
    if (c.name.startsWith('morph:')) {
      const [, tname, kind] = c.name.split(':');
      const f = new Float32Array(arr.length);
      const s = c.scale / (c.type === 'i8' ? 127 : 32767);
      for (let i = 0; i < arr.length; i++) f[i] = arr[i] * s;
      const attr = new THREE.BufferAttribute(f, 3);
      attr.name = tname;
      if (kind === 'position') { targetIndex[tname] = morphPos.length; morphPos.push(attr); } else morphNrm.push(attr);
      continue;
    }
    g.setAttribute(c.name, new THREE.BufferAttribute(arr, c.size, c.normalized));
  }
  if (morphPos.length) {
    g.morphAttributes.position = morphPos;
    g.morphAttributes.normal = morphNrm;
    g.morphTargetsRelative = true;
  }
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return { geometry: g, meta, targetIndex };
}

// Puts the MediaPipe pose tracker's assets in public/mediapipe/ so the app loads nothing from a CDN.
// The WASM is copied from the @mediapipe/tasks-vision package pinned in package.json, so it always matches the
// JS bundle Vite serves; the model is downloaded once from a versioned URL and checked by hash.
// Safe to rerun: files that already match are kept. Run it again after upgrading the package.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'mediapipe');
const PACKAGE = join(ROOT, 'node_modules', '@mediapipe', 'tasks-vision');
const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];
// Version 1 holds the same weights as the `latest` file the pose-track prototype measured; the two differ only in
// zip timestamps.
const MODEL = {
  url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  sha256: '5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1',
  path: join(OUT, 'pose_landmarker_full.task'),
};

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** Writes through a temporary file, so an interrupted run never leaves a partial asset behind. */
async function put(path: string, bytes: Uint8Array): Promise<void> {
  await writeFile(`${path}.part`, bytes);
  await rename(`${path}.part`, path);
}

const { version } = JSON.parse(await readFile(join(PACKAGE, 'package.json'), 'utf8')) as { version: string };
await mkdir(join(OUT, 'wasm'), { recursive: true });
for (const name of WASM_FILES) {
  const bytes = await readFile(join(PACKAGE, 'wasm', name));
  const target = join(OUT, 'wasm', name);
  if (existsSync(target) && sha256(await readFile(target)) === sha256(bytes)) {
    console.log(`kept    ${relative(ROOT, target)}`);
    continue;
  }
  await put(target, bytes);
  console.log(`copied  ${relative(ROOT, target)} from @mediapipe/tasks-vision ${version}`);
}

if (existsSync(MODEL.path) && sha256(await readFile(MODEL.path)) === MODEL.sha256) {
  console.log(`kept    ${relative(ROOT, MODEL.path)}`);
} else {
  const res = await fetch(MODEL.url);
  if (!res.ok) throw new Error(`${MODEL.url}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const hash = sha256(bytes);
  if (hash !== MODEL.sha256) throw new Error(`${MODEL.url}: sha256 ${hash}, expected ${MODEL.sha256}`);
  await put(MODEL.path, bytes);
  console.log(`fetched ${relative(ROOT, MODEL.path)} (${(bytes.length / 1e6).toFixed(1)} MB)`);
}

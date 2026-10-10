import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { PoseLandmarks } from '../src/posing/landmarks.ts';
import type { PhotoFault, PhotoId, PhotoImageType, PhotoMeta } from '../src/posing/progress/types.ts';
import type { PoseId } from '../src/posing/types.ts';
import { parsePhotoId, parsePhotoMeta } from './validate.ts';

// One photo is two files in one directory: `<id>.jpg|.webp` and its `<id>.json` sidecar. The sidecar is
// written last, so a photo exists exactly when its sidecar does.

export interface PhotoInput {
  pose: PoseId;
  image: { type: PhotoImageType; bytes: Buffer };
  score: number;
  faults: PhotoFault[];
  landmarks?: PoseLandmarks;
  mode?: string;
  note?: string;
}

export type PhotoScope = { pose: PoseId } | 'all';

export const CONTENT_TYPE: Record<PhotoImageType, string> = { jpeg: 'image/jpeg', webp: 'image/webp' };
const EXTENSION: Record<PhotoImageType, string> = { jpeg: 'jpg', webp: 'webp' };
/** Every file name the store writes, including temp files of an interrupted write. */
const STORE_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(json|jpg|webp)(\.[0-9a-f-]{36}\.tmp)?$/;

export const DEFAULT_DATA_DIR = join(homedir(), '.local', 'share', 'bodyhack-infinity');

/** `$BODYHACK_DATA_DIR/photos`, else `~/.local/share/bodyhack-infinity/photos`. */
export function photosDir(env: NodeJS.ProcessEnv = process.env): string {
  const root = env.BODYHACK_DATA_DIR?.trim();
  return join(root ? resolve(root) : DEFAULT_DATA_DIR, 'photos');
}

const metaPath = (dir: string, id: PhotoId) => join(dir, `${id}.json`);
const imagePath = (dir: string, id: PhotoId, type: PhotoImageType) => join(dir, `${id}.${EXTENSION[type]}`);
const isMissing = (err: unknown) => err instanceof Error && 'code' in err && err.code === 'ENOENT';

async function writeAtomic(path: string, data: string | Buffer): Promise<void> {
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, data, { mode: 0o600, flag: 'wx' });
    await rename(tmp, path);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}

export async function savePhoto(dir: string, input: PhotoInput, takenAt = new Date()): Promise<PhotoMeta> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const id = randomUUID() as PhotoId;
  const { image, ...fields } = input;
  const meta: PhotoMeta = { id, ...fields, takenAt: takenAt.toISOString(), image: image.type };
  await writeAtomic(imagePath(dir, id, image.type), image.bytes);
  await writeAtomic(metaPath(dir, id), JSON.stringify(meta));
  return meta;
}

async function readMeta(dir: string, id: PhotoId): Promise<PhotoMeta | null> {
  let text: string;
  try {
    text = await readFile(metaPath(dir, id), 'utf8');
  } catch (err) {
    if (isMissing(err)) return null;
    throw err;
  }
  try {
    const meta = parsePhotoMeta(JSON.parse(text));
    return meta?.id === id ? meta : null;
  } catch {
    return null;
  }
}

/** Newest first. */
export async function listPhotos(dir: string, pose?: PoseId): Promise<PhotoMeta[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (err) {
    if (isMissing(err)) return [];
    throw err;
  }
  const ids = names.flatMap((name) => {
    const id = name.endsWith('.json') ? parsePhotoId(name.slice(0, -'.json'.length)) : null;
    return id ? [id] : [];
  });
  const metas = await Promise.all(ids.map((id) => readMeta(dir, id)));
  return metas
    .filter((m): m is PhotoMeta => m !== null && (pose === undefined || m.pose === pose))
    .sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt));
}

export async function readPhotoImage(dir: string, id: PhotoId): Promise<{ type: PhotoImageType; bytes: Buffer } | null> {
  const meta = await readMeta(dir, id);
  if (!meta) return null;
  try {
    return { type: meta.image, bytes: await readFile(imagePath(dir, id, meta.image)) };
  } catch (err) {
    if (isMissing(err)) return null;
    throw err;
  }
}

/** False when there was no such photo. */
export async function deletePhoto(dir: string, id: PhotoId): Promise<boolean> {
  const meta = await readMeta(dir, id);
  if (!meta) return false;
  await rm(metaPath(dir, id), { force: true });
  await rm(imagePath(dir, id, meta.image), { force: true });
  return true;
}

/** Returns the number of photos deleted. `'all'` also removes files left behind by interrupted writes. */
export async function deletePhotos(dir: string, scope: PhotoScope): Promise<number> {
  const photos = await listPhotos(dir, scope === 'all' ? undefined : scope.pose);
  for (const photo of photos) await deletePhoto(dir, photo.id);
  if (scope === 'all') {
    const leftovers = (await readdir(dir).catch(() => [])).filter((name) => STORE_FILE.test(name));
    await Promise.all(leftovers.map((name) => rm(join(dir, name), { force: true })));
  }
  return photos.length;
}

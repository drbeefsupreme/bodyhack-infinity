import { chmod, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LANDMARK_COUNT } from '../src/posing/landmarks.ts';
import type { PhotoId } from '../src/posing/progress/types.ts';
import { deletePhoto, deletePhotos, listPhotos, photosDir, readPhotoImage, savePhoto, type PhotoInput } from './photos.ts';
import { parsePhotoId, parsePhotoRequest } from './validate.ts';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
const landmarks = { aspect: 0.75, points: Array.from({ length: LANDMARK_COUNT }, (_, i) => ({ x: i / 40, y: 0.5, visibility: 0.9 })) };

const input = (over: Partial<PhotoInput> = {}): PhotoInput => ({
  pose: 'frontDoubleBiceps',
  image: { type: 'jpeg', bytes: JPEG },
  score: 72,
  faults: [{ metric: 'elbowHeight', side: 'left', cue: 'Raise your elbows to shoulder height.' }],
  ...over,
});

let root: string;
let dir: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'bodyhack-photos-'));
  dir = photosDir({ BODYHACK_DATA_DIR: root });
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe('photo store', () => {
  it('keeps photos under $BODYHACK_DATA_DIR/photos', () => {
    expect(dir).toBe(join(root, 'photos'));
  });

  it('saves a photo and lists it with its metadata, newest first and per pose', async () => {
    const first = await savePhoto(dir, input({ landmarks, mode: 'learn' }), new Date('2026-01-02T10:00:00Z'));
    const second = await savePhoto(dir, input({ score: 88, faults: [] }), new Date('2026-03-04T10:00:00Z'));
    const other = await savePhoto(dir, input({ pose: 'sideChest', image: { type: 'webp', bytes: WEBP } }), new Date('2026-02-01T10:00:00Z'));

    expect((await listPhotos(dir)).map((p) => p.id)).toEqual([second.id, other.id, first.id]);
    expect((await listPhotos(dir, 'frontDoubleBiceps')).map((p) => p.id)).toEqual([second.id, first.id]);
    expect((await listPhotos(dir, 'sideChest'))[0]).toEqual({
      id: other.id,
      pose: 'sideChest',
      takenAt: '2026-02-01T10:00:00.000Z',
      score: 72,
      faults: [{ metric: 'elbowHeight', side: 'left', cue: 'Raise your elbows to shoulder height.' }],
      image: 'webp',
    });
    expect((await listPhotos(dir, 'frontDoubleBiceps'))[1]).toMatchObject({ landmarks, mode: 'learn', score: 72 });
    expect(await readPhotoImage(dir, other.id)).toEqual({ type: 'webp', bytes: WEBP });
  });

  it('writes the directory as 0700 and every file as 0600, with no temp files left', async () => {
    const photo = await savePhoto(dir, input());
    expect((await stat(dir)).mode & 0o777).toBe(0o700);
    const names = (await readdir(dir)).sort();
    expect(names).toEqual([`${photo.id}.jpg`, `${photo.id}.json`]);
    for (const name of names) expect((await stat(join(dir, name))).mode & 0o777).toBe(0o600);
  });

  it('tightens an existing directory that is open to others to 0700', async () => {
    await mkdir(dir, { recursive: true, mode: 0o755 });
    await chmod(dir, 0o755);
    await savePhoto(dir, input());
    expect((await stat(dir)).mode & 0o777).toBe(0o700);
  });

  it('lists nothing for a directory that does not exist yet', async () => {
    expect(await listPhotos(dir)).toEqual([]);
  });

  it('deletes one photo, then reports it missing', async () => {
    const keep = await savePhoto(dir, input());
    const gone = await savePhoto(dir, input());
    expect(await deletePhoto(dir, gone.id)).toBe(true);
    expect(await deletePhoto(dir, gone.id)).toBe(false);
    expect(await readPhotoImage(dir, gone.id)).toBeNull();
    expect((await listPhotos(dir)).map((p) => p.id)).toEqual([keep.id]);
    expect((await readdir(dir)).sort()).toEqual([`${keep.id}.jpg`, `${keep.id}.json`]);
  });

  it('deletes all photos of one pose, or all photos and files left by interrupted writes', async () => {
    await savePhoto(dir, input());
    await savePhoto(dir, input());
    const side = await savePhoto(dir, input({ pose: 'sideChest' }));
    expect(await deletePhotos(dir, { pose: 'frontDoubleBiceps' })).toBe(2);
    expect((await listPhotos(dir)).map((p) => p.id)).toEqual([side.id]);

    const orphan = '0b5e1d7c-3f6a-4c2e-9a4b-1c2d3e4f5a6b';
    await writeFile(join(dir, `${orphan}.jpg`), JPEG);
    await writeFile(join(dir, `${orphan}.json.0b5e1d7c-3f6a-4c2e-9a4b-1c2d3e4f5a6c.tmp`), '{');
    await writeFile(join(dir, 'notes.txt'), 'not ours');
    expect(await deletePhotos(dir, 'all')).toBe(1);
    expect(await readdir(dir)).toEqual(['notes.txt']);
  });

  it('only accepts UUID photo ids, so no id can name another path', () => {
    for (const bad of ['../../etc/passwd', '..', '%2e%2e%2fsecret', 'a/b', '', '0B5E1D7C-3F6A-4C2E-9A4B-1C2D3E4F5A6B', `${'0'.repeat(8)}-0000-0000-0000-000000000000.json`]) {
      expect(parsePhotoId(bad)).toBeNull();
    }
    expect(parsePhotoId('0b5e1d7c-3f6a-4c2e-9a4b-1c2d3e4f5a6b')).toBe('0b5e1d7c-3f6a-4c2e-9a4b-1c2d3e4f5a6b');
  });

  it('ignores sidecars that are corrupt or claim another id', async () => {
    const real = await savePhoto(dir, input());
    const forged = '0b5e1d7c-3f6a-4c2e-9a4b-1c2d3e4f5a6b' as PhotoId;
    const sidecar = JSON.parse(await readFile(join(dir, `${real.id}.json`), 'utf8')) as object;
    await writeFile(join(dir, `${forged}.json`), JSON.stringify(sidecar));
    await writeFile(join(dir, '1b5e1d7c-3f6a-4c2e-9a4b-1c2d3e4f5a6b.json'), 'not json');
    expect((await listPhotos(dir)).map((p) => p.id)).toEqual([real.id]);
    expect(await readPhotoImage(dir, forged)).toBeNull();
    expect(await deletePhoto(dir, forged)).toBe(false);
  });
});

describe('parsePhotoRequest', () => {
  const body = {
    pose: 'frontDoubleBiceps',
    imageDataUrl: `data:image/jpeg;base64,${JPEG.toString('base64')}`,
    score: 81.5,
    faults: [{ metric: 'abduction', side: 'near', cue: ' Lower your elbows a little. ' }],
    landmarks: { ...landmarks, points: landmarks.points.map((p) => ({ ...p, z: 0.1 })) },
    mode: 'hold-drill',
  };

  it('parses a well-formed body into the store input', () => {
    expect(parsePhotoRequest(body)).toEqual({
      ok: true,
      value: {
        pose: 'frontDoubleBiceps',
        image: { type: 'jpeg', bytes: JPEG },
        score: 81.5,
        faults: [{ metric: 'abduction', side: 'near', cue: 'Lower your elbows a little.' }],
        landmarks,
        mode: 'hold-drill',
      },
    });
  });

  it('rejects bad bodies', () => {
    const bad: unknown[] = [
      null,
      [],
      'photo',
      { ...body, pose: 'flexEverything' },
      { ...body, pose: '../relaxedFront' },
      { ...body, imageDataUrl: `data:image/png;base64,${JPEG.toString('base64')}` },
      { ...body, imageDataUrl: `data:image/webp;base64,${JPEG.toString('base64')}` },
      { ...body, imageDataUrl: 'data:image/jpeg;base64,' },
      { ...body, imageDataUrl: undefined },
      { ...body, score: 101 },
      { ...body, score: Number.NaN },
      { ...body, score: '80' },
      { ...body, faults: undefined },
      { ...body, faults: [{ metric: 'lats', cue: 'Flare.' }] },
      { ...body, faults: [{ metric: 'abduction', side: 'up', cue: 'Flare.' }] },
      { ...body, faults: [{ metric: 'abduction', cue: '   ' }] },
      { ...body, landmarks: { ...landmarks, points: landmarks.points.slice(1) } },
      { ...body, landmarks: { aspect: 0, points: landmarks.points } },
      { ...body, mode: '../../x' },
      { ...body, note: 'x'.repeat(1001) },
    ];
    for (const raw of bad) expect(parsePhotoRequest(raw).ok, JSON.stringify(raw)?.slice(0, 120)).toBe(false);
  });
});

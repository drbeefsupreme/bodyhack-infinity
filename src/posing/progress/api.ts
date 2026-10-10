import type { PoseId } from '../types';
import type { PhotoId, PhotoMeta, SavePhotoRequest } from './types';

const BASE = '/api/photos';

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `${init?.method ?? 'GET'} ${url} failed with ${res.status}`);
  return body as T;
}

/** Newest first; every pose when `pose` is omitted. */
export async function listPhotos(pose?: PoseId): Promise<PhotoMeta[]> {
  const { photos } = await call<{ photos: PhotoMeta[] }>(pose ? `${BASE}?pose=${pose}` : BASE);
  return photos;
}

export async function savePhoto(req: SavePhotoRequest): Promise<PhotoMeta> {
  const { photo } = await call<{ photo: PhotoMeta }>(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  });
  return photo;
}

export const photoImageUrl = (id: PhotoId): string => `${BASE}/${id}/image`;

export async function deletePhoto(id: PhotoId): Promise<void> {
  await call(`${BASE}/${id}`, { method: 'DELETE' });
}

/** Deletes every photo of one pose, or every photo; returns how many were deleted. */
export async function deletePhotos(scope: { pose: PoseId } | 'all'): Promise<number> {
  const query = scope === 'all' ? 'all=1' : `pose=${scope.pose}`;
  const { deleted } = await call<{ deleted: number }>(`${BASE}?${query}`, { method: 'DELETE' });
  return deleted;
}

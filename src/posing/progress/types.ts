// Wire contract of the progress photo API (server/photos.ts). The server parses every field it receives.
import type { PoseLandmarks } from '../landmarks';
import type { MetricId, MetricSide, PoseId } from '../types';

/** Server-generated photo id (a UUID). Never a path. */
export type PhotoId = string & { readonly __brand: 'PhotoId' };

export type PhotoImageType = 'jpeg' | 'webp';

/** A correction that the tutor gave when the photo was taken. */
export interface PhotoFault {
  metric: MetricId;
  side?: MetricSide;
  cue: string;
}

export interface PhotoMeta {
  id: PhotoId;
  pose: PoseId;
  /** ISO 8601 time of the capture, set by the server. */
  takenAt: string;
  /** 0..100 */
  score: number;
  faults: PhotoFault[];
  landmarks?: PoseLandmarks;
  /** Practice mode that took the photo. */
  mode?: string;
  note?: string;
  image: PhotoImageType;
}

/** Body of `POST /api/photos`. */
export interface SavePhotoRequest {
  pose: PoseId;
  /** `data:image/jpeg;base64,...` or `data:image/webp;base64,...` */
  imageDataUrl: string;
  score: number;
  faults: PhotoFault[];
  landmarks?: PoseLandmarks;
  mode?: string;
  note?: string;
}

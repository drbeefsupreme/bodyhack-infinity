// The web Platform: the browser's camera, MediaPipe for the web, Web Speech, the screen wake lock, localStorage, and
// the local API (server/api.ts) for photos, the coach and the voice intent. Coach and intent replies are parsed in
// ./replies.ts, at the network boundary.

import { COMMAND_OPTIONS, type IntentReply } from '../modes/commands';
import type { PhotoId, PhotoMeta, SavePhotoRequest } from '../progress/types';
import { webSpeech } from '../speech';
import { CameraError, createTracker, openCamera, type Tracker } from '../tracker';
import type { PoseId } from '../types';
import type { CoachAsk, CoachNote, Health } from '../ui/api';
import { parseCoach, parseHealth, parseIntent } from './replies';
import type { CoachClient, KeepAwake, Platform, PhotoStore, PoseSource, PoseSourceStart } from './types';
import { VoiceListener } from './webVoice';

let trackerLoad: Promise<Tracker> | undefined;

/** One tracker per page: loading MediaPipe takes seconds, and every run reuses it. */
function sharedTracker(): Promise<Tracker> {
  trackerLoad ??= createTracker().catch((err: unknown) => {
    trackerLoad = undefined;
    throw err;
  });
  return trackerLoad;
}

const MIRRORED_VIDEO: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  inset: '0',
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  transform: 'scaleX(-1)',
};

/** getUserMedia into a mirrored <video> in `pane`, MediaPipe on every new video frame. A tracker that fails to load
 * rejects `start`; camera failures resolve as `{ ok: false }`. */
function webPoseSource(): PoseSource {
  let stopped = false;
  let stream: MediaStream | undefined;
  let video: HTMLVideoElement | undefined;
  let tracker: Tracker | undefined;
  let frameHandle: number | undefined;
  let lastTimestamp = 0;

  return {
    async start(pane, onFrame): Promise<PoseSourceStart> {
      const [loaded, opened] = await Promise.allSettled([sharedTracker(), openCamera()]);
      if (opened.status === 'rejected') {
        const err: unknown = opened.reason;
        if (err instanceof CameraError) return { ok: false, failure: err.reason, message: err.message };
        throw err;
      }
      stream = opened.value;
      if (loaded.status === 'rejected' || stopped) {
        for (const track of stream.getTracks()) track.stop();
        if (loaded.status === 'rejected') throw loaded.reason;
        return { ok: false, failure: 'busy', message: 'The camera was stopped while it started.' };
      }
      const live = loaded.value;
      tracker = live;
      const v = Object.assign(document.createElement('video'), { playsInline: true, muted: true, srcObject: stream });
      Object.assign(v.style, MIRRORED_VIDEO);
      pane.append(v);
      video = v;
      await v.play();
      const tick = (now: number) => {
        if (stopped) return;
        lastTimestamp = now;
        onFrame({ landmarks: live.detect(v, now), timestampMs: now, width: v.videoWidth, height: v.videoHeight });
        frameHandle = v.requestVideoFrameCallback(tick);
      };
      frameHandle = v.requestVideoFrameCallback(tick);
      return { ok: true, delegate: live.delegate };
    },
    reset() {
      tracker?.reset(lastTimestamp + 1);
    },
    async capturePhoto(maxWidth) {
      if (!video || video.videoWidth === 0) return undefined;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      const canvas = Object.assign(document.createElement('canvas'), {
        width: Math.round(video.videoWidth * scale),
        height: Math.round(video.videoHeight * scale),
      });
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.88);
    },
    stop() {
      stopped = true;
      if (video && frameHandle !== undefined) video.cancelVideoFrameCallback(frameHandle);
      for (const track of stream?.getTracks() ?? []) track.stop();
      if (video) {
        video.srcObject = null;
        video.remove();
      }
    },
  };
}

const PHOTOS = '/api/photos';

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `${init?.method ?? 'GET'} ${url} failed with ${res.status}`);
  return body as T;
}

const JSON_POST = { method: 'POST', headers: { 'content-type': 'application/json' } } as const;

const webPhotos: PhotoStore = {
  async list(pose?: PoseId): Promise<PhotoMeta[]> {
    const { photos } = await call<{ photos: PhotoMeta[] }>(pose ? `${PHOTOS}?pose=${pose}` : PHOTOS);
    return photos;
  },
  async save(req: SavePhotoRequest): Promise<PhotoMeta> {
    const { photo } = await call<{ photo: PhotoMeta }>(PHOTOS, { ...JSON_POST, body: JSON.stringify(req) });
    return photo;
  },
  imageSrc: (meta: PhotoMeta): string => `${PHOTOS}/${meta.id}/image`,
  async remove(id: PhotoId): Promise<void> {
    await call(`${PHOTOS}/${id}`, { method: 'DELETE' });
  },
  async removeAll(scope): Promise<number> {
    const query = scope === 'all' ? 'all=1' : `pose=${scope.pose}`;
    const { deleted } = await call<{ deleted: number }>(`${PHOTOS}?${query}`, { method: 'DELETE' });
    return deleted;
  },
};

const webCoach: CoachClient = {
  async health(): Promise<Health> {
    return parseHealth(await fetch('/api/health').then((res) => res.json()));
  },

  async askIntent(heard: string, signal?: AbortSignal): Promise<IntentReply> {
    try {
      const res = await fetch('/api/intent', { ...JSON_POST, body: JSON.stringify({ heard, options: COMMAND_OPTIONS }), signal });
      return parseIntent(res.ok, await res.json().catch(() => undefined));
    } catch {
      return { kind: 'unavailable' };
    }
  },

  async askCoach(ask: CoachAsk): Promise<CoachNote> {
    const res = await fetch('/api/coach', { ...JSON_POST, body: JSON.stringify(ask) });
    return parseCoach(res.status, await res.json().catch(() => undefined));
  },
};

/** The screen wake lock. The browser drops it when the page is hidden, so it is requested again when the page is
 * visible while still wanted. A browser without the API keeps the screen's own timeout. */
function webKeepAwake(): KeepAwake {
  let wanted = false;
  let requesting = false;
  let sentinel: WakeLockSentinel | undefined;

  const lock = async (): Promise<void> => {
    if (!wanted || sentinel || requesting || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    requesting = true;
    try {
      const held = await navigator.wakeLock.request('screen');
      if (!wanted) {
        await held.release();
        return;
      }
      sentinel = held;
      held.addEventListener('release', () => {
        if (sentinel === held) sentinel = undefined;
      });
    } finally {
      requesting = false;
    }
  };
  const onVisibility = () => {
    lock().catch((err: unknown) => console.warn('The screen wake lock failed.', err));
  };

  return {
    async acquire() {
      wanted = true;
      document.addEventListener('visibilitychange', onVisibility);
      await lock();
    },
    async release() {
      wanted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      const held = sentinel;
      sentinel = undefined;
      await held?.release();
    },
  };
}

export const webPlatform: Platform = {
  kind: 'web',
  modelBase: 'model',
  poseSource: webPoseSource,
  speechEngine: webSpeech,
  voiceInput: (onPhrase, onState) => new VoiceListener(onPhrase, onState),
  photos: webPhotos,
  coach: webCoach,
  setup: undefined,
  keepAwake: webKeepAwake(),
  store: localStorage,
};

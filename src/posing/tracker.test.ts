import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraError, openCamera } from './tracker';

const stream = { id: 'fake stream' };

/** A browser camera that records each request and fails with `failure`, if given. */
function browserCamera(failure?: Error): unknown[] {
  const requests: unknown[] = [];
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: async (constraints: unknown) => {
        requests.push(constraints);
        if (failure) throw failure;
        return stream;
      },
    },
  });
  return requests;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openCamera', () => {
  it('asks for the front camera at 1280x720 without audio and returns its stream', async () => {
    const requests = browserCamera();
    expect(await openCamera()).toBe(stream);
    expect(requests).toEqual([{ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }]);
  });

  it('turns the browser errors a user can act on into typed reasons and passes others through', async () => {
    const names = ['NotAllowedError', 'SecurityError', 'NotFoundError', 'OverconstrainedError', 'NotReadableError', 'AbortError'];
    const reasons: string[] = [];
    for (const name of names) {
      browserCamera(new DOMException('test', name));
      reasons.push(await openCamera().then(() => 'opened', (err: unknown) => (err instanceof CameraError ? err.reason : 'other')));
    }
    expect(reasons).toEqual(['denied', 'denied', 'noDevice', 'noDevice', 'busy', 'busy']);
    const programmingError = new TypeError('bad constraints');
    browserCamera(programmingError);
    await expect(openCamera()).rejects.toBe(programmingError);
  });

  it('reports a page without the camera API as unsupported', async () => {
    vi.stubGlobal('navigator', {});
    await expect(openCamera()).rejects.toMatchObject({ name: 'CameraError', reason: 'unsupported' });
  });
});

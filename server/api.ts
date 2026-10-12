import { accessSync, constants } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { delimiter, join } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { chooseIntent, type PostJson } from '../src/posing/intent/jev.ts';
import type { PhotoImageType } from '../src/posing/progress/types.ts';
import { apiRefusal } from './access.ts';
import { coachModel, runCoach } from './coach.ts';
import { CONTENT_TYPE, deletePhoto, deletePhotos, listPhotos, photosDir, readPhotoImage, savePhoto } from './photos.ts';
import { typesafeKey } from './secrets.ts';
import { parseCoachRequest, parseIntentRequest, parsePhotoId, parsePhotoRequest, parsePoseId } from './validate.ts';

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const PHOTO_ROUTE = /^(GET|DELETE) \/api\/photos\/([^/]+)(\/image)?$/;

type Reply = { status: number; body: object } | { status: number; image: { type: PhotoImageType; bytes: Buffer } };

/**
 * Local API for both `vite` (dev) and `vite preview`. `root` is the project root, where `.env.local` lives.
 * Only loopback callers on a local Host reach it, unless BODYHACK_API_ALLOW_REMOTE=1 (server/access.ts).
 */
export function bodyhackApi(root: string): Plugin {
  const handle = apiMiddleware(root, photosDir(), process.env.BODYHACK_API_ALLOW_REMOTE === '1');
  return {
    name: 'bodyhack-api',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

function apiMiddleware(root: string, photos: string, allowRemote: boolean): Connect.NextHandleFunction {
  return (req, res, next) => {
    const [path, search = ''] = (req.url ?? '').split('?');
    if (!path.startsWith('/api/')) {
      next();
      return;
    }
    const route = `${req.method} ${path}`;
    const refusal = apiRefusal(
      {
        method: req.method,
        remoteAddress: req.socket.remoteAddress,
        host: req.headers.host,
        origin: req.headers.origin,
        contentType: req.headers['content-type'],
      },
      allowRemote,
    );
    if (refusal) {
      console.warn(`[api] ${route} from ${req.socket.remoteAddress} refused: ${refusal}`);
      send(res, { status: 403, body: { error: refusal } });
      return;
    }
    const started = performance.now();
    handle(root, photos, route, new URLSearchParams(search), req)
      .catch((err: unknown): Reply => {
        console.error(`[api] ${route} failed:`, err instanceof Error ? err.message : err);
        return { status: 500, body: { error: 'internal error' } };
      })
      .then((reply) => {
        console.log(`[api] ${route} ${reply.status} ${Math.round(performance.now() - started)} ms`);
        send(res, reply);
      });
  };
}

async function handle(root: string, photos: string, route: string, query: URLSearchParams, req: IncomingMessage): Promise<Reply> {
  switch (route) {
    case 'GET /api/health':
      return { status: 200, body: { ok: true, omp: onPath('omp'), jev: typesafeKey(root) !== null, coachModel: coachModel() } };
    case 'POST /api/intent': {
      const raw = await readJson(req);
      if ('status' in raw) return raw;
      const parsed = parseIntentRequest(raw.json);
      if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
      const key = typesafeKey(root);
      if (!key) return { status: 503, body: { error: 'jev is not configured: set TYPESAFE_API_KEY' } };
      try {
        return { status: 200, body: await chooseIntent(postJson, key, parsed.value.heard, parsed.value.options) };
      } catch (err) {
        return failure(503, route, err);
      }
    }
    case 'POST /api/coach': {
      const raw = await readJson(req);
      if ('status' in raw) return raw;
      const parsed = parseCoachRequest(raw.json);
      if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
      if (!onPath('omp')) return { status: 503, body: { error: 'omp is not on PATH' } };
      try {
        return { status: 200, body: await runCoach(parsed.value) };
      } catch (err) {
        return failure(502, route, err);
      }
    }
    default:
      return (await handlePhotos(photos, route, query, req)) ?? { status: 404, body: { error: `no route ${route}` } };
  }
}

/** Progress photos in `dir`; null when the route is not a photo route. */
async function handlePhotos(dir: string, route: string, query: URLSearchParams, req: IncomingMessage): Promise<Reply | null> {
  switch (route) {
    case 'GET /api/photos': {
      const raw = query.get('pose');
      if (raw === null) return { status: 200, body: { photos: await listPhotos(dir) } };
      const pose = parsePoseId(raw);
      if (!pose) return { status: 400, body: { error: 'pose must be one of the pose ids' } };
      return { status: 200, body: { photos: await listPhotos(dir, pose) } };
    }
    case 'POST /api/photos': {
      const raw = await readJson(req);
      if ('status' in raw) return raw;
      const parsed = parsePhotoRequest(raw.json);
      if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
      return { status: 201, body: { photo: await savePhoto(dir, parsed.value) } };
    }
    case 'DELETE /api/photos': {
      if (query.get('all') === '1') return { status: 200, body: { deleted: await deletePhotos(dir, 'all') } };
      const pose = parsePoseId(query.get('pose'));
      if (!pose) return { status: 400, body: { error: 'give pose=<pose id> or all=1' } };
      return { status: 200, body: { deleted: await deletePhotos(dir, { pose }) } };
    }
  }
  const match = PHOTO_ROUTE.exec(route);
  if (!match) return null;
  const [, method, rawId, image] = match;
  const id = parsePhotoId(rawId);
  const missing: Reply = { status: 404, body: { error: 'no such photo' } };
  if (method === 'GET' && image) {
    const found = id && (await readPhotoImage(dir, id));
    return found ? { status: 200, image: found } : missing;
  }
  if (method === 'DELETE' && !image) return id && (await deletePhoto(dir, id)) ? { status: 200, body: { deleted: 1 } } : missing;
  return null;
}

function failure(status: number, route: string, err: unknown): Reply {
  const error = err instanceof Error ? err.message : String(err);
  console.warn(`[api] ${route}: ${error}`);
  return { status, body: { error } };
}

const postJson: PostJson = async (url, headers, body, timeoutMs) => {
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    return { status: res.status, body: await res.json().catch(() => undefined) };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') throw new Error(`timed out after ${timeoutMs} ms`);
    throw err;
  }
};

/** Reads and parses a JSON body of at most 8 MB; returns the error reply when it cannot. */
async function readJson(req: IncomingMessage): Promise<{ json: unknown } | Reply> {
  const tooLarge: Reply = { status: 413, body: { error: `request body must be at most ${MAX_BODY_BYTES} bytes` } };
  if (Number(req.headers['content-length'] ?? 0) > MAX_BODY_BYTES) return tooLarge;
  const { promise, resolve, reject } = Promise.withResolvers<Buffer | null>();
  const chunks: Buffer[] = [];
  let size = 0;
  const onData = (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      req.off('data', onData).pause();
      resolve(null);
    } else chunks.push(chunk);
  };
  req.on('data', onData).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
  const body = await promise;
  if (!body) return tooLarge;
  try {
    return { json: JSON.parse(body.toString('utf8')) as unknown };
  } catch {
    return { status: 400, body: { error: 'request body must be JSON' } };
  }
}

function send(res: ServerResponse, reply: Reply): void {
  res.statusCode = reply.status;
  if ('image' in reply) {
    res.setHeader('content-type', CONTENT_TYPE[reply.image.type]);
    res.setHeader('cache-control', 'private, max-age=86400, immutable');
    res.setHeader('x-content-type-options', 'nosniff');
    res.end(reply.image.bytes);
    return;
  }
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  // A rejected oversized body is left unread, so the connection cannot be reused.
  if (reply.status === 413) res.setHeader('connection', 'close');
  res.end(JSON.stringify(reply.body));
}

function onPath(bin: string): boolean {
  return (process.env.PATH ?? '').split(delimiter).some((dir) => {
    if (!dir) return false;
    try {
      accessSync(join(dir, bin), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

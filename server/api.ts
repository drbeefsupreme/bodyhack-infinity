import { accessSync, constants } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { delimiter, join } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { runCoach } from './coach.ts';
import { chooseIntent } from './jev.ts';
import { typesafeKey } from './secrets.ts';
import { parseCoachRequest, parseIntentRequest } from './validate.ts';

const MAX_BODY_BYTES = 8 * 1024 * 1024;

interface Reply {
  status: number;
  body: object;
}

/** Local API for both `vite` (dev) and `vite preview`. `root` is the project root, where `.env.local` lives. */
export function bodyhackApi(root: string): Plugin {
  const handle = apiMiddleware(root);
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

function apiMiddleware(root: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith('/api/')) {
      next();
      return;
    }
    const route = `${req.method} ${path}`;
    const started = performance.now();
    handle(root, route, req)
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

async function handle(root: string, route: string, req: IncomingMessage): Promise<Reply> {
  switch (route) {
    case 'GET /api/health':
      return { status: 200, body: { ok: true, omp: onPath('omp'), jev: typesafeKey(root) !== null } };
    case 'POST /api/intent': {
      const raw = await readJson(req);
      if ('status' in raw) return raw;
      const parsed = parseIntentRequest(raw.json);
      if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
      const key = typesafeKey(root);
      if (!key) return { status: 503, body: { error: 'jev is not configured: set TYPESAFE_API_KEY' } };
      try {
        return { status: 200, body: await chooseIntent(key, parsed.value.heard, parsed.value.options) };
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
      return { status: 404, body: { error: `no route ${route}` } };
  }
}

function failure(status: number, route: string, err: unknown): Reply {
  const error = err instanceof Error ? err.message : String(err);
  console.warn(`[api] ${route}: ${error}`);
  return { status, body: { error } };
}

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

function send(res: ServerResponse, { status, body }: Reply): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  // A rejected oversized body is left unread, so the connection cannot be reused.
  if (status === 413) res.setHeader('connection', 'close');
  res.end(JSON.stringify(body));
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

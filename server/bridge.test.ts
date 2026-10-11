import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { apiAccess, type AccessPolicy, type ApiRequest } from './access.ts';
import { bearerMatches, pair, pairingLink, readPairing } from './bridge.ts';

const TOKEN = 'kq3Jx0n7VbZp1R8cWm4sT6yH2uD9eA5fG0iL3oN7qQw';
const paired: AccessPolicy = { allowRemote: false, bridgeToken: () => TOKEN };
const phone: ApiRequest = {
  method: 'GET',
  path: '/api/health',
  remoteAddress: '100.101.102.103',
  host: '100.124.212.65:5392',
  origin: undefined,
  contentType: undefined,
  authorization: `Bearer ${TOKEN}`,
  preflightMethod: undefined,
  preflightHeaders: undefined,
};
const intent: ApiRequest = { ...phone, method: 'POST', path: '/api/intent', contentType: 'application/json' };
const preflight: ApiRequest = {
  ...phone,
  method: 'OPTIONS',
  path: '/api/intent',
  origin: 'https://localhost',
  authorization: undefined,
  preflightMethod: 'POST',
  preflightHeaders: 'authorization,content-type',
};

describe('apiAccess with the phone bridge paired', () => {
  it('allows a Tailscale peer with the token on health, coach and intent, and echoes an app origin', () => {
    expect(apiAccess(phone, paired)).toEqual({ kind: 'allowed', cors: null });
    expect(apiAccess(intent, paired)).toEqual({ kind: 'allowed', cors: null });
    expect(apiAccess({ ...intent, path: '/api/coach' }, paired)).toEqual({ kind: 'allowed', cors: null });
    for (const origin of ['https://localhost', 'capacitor://localhost', 'http://localhost']) {
      expect(apiAccess({ ...intent, origin }, paired), origin).toEqual({ kind: 'allowed', cors: origin });
    }
    for (const remoteAddress of ['100.64.0.1', '100.127.255.254', '::ffff:100.124.212.65', 'fd7a:115c:a1e0::8e2d:d442']) {
      expect(apiAccess({ ...phone, remoteAddress }, paired), remoteAddress).toEqual({ kind: 'allowed', cors: null });
    }
    expect(apiAccess({ ...phone, authorization: `bearer  ${TOKEN}` }, paired)).toEqual({ kind: 'allowed', cors: null });
  });

  it('refuses a missing or wrong token, with the CORS header so the app can read why', () => {
    for (const authorization of [undefined, '', TOKEN, `Bearer ${TOKEN}x`, `Bearer ${TOKEN.slice(1)}`, `Basic ${TOKEN}`, 'Bearer ']) {
      expect(apiAccess({ ...intent, authorization, origin: 'https://localhost' }, paired), String(authorization)).toEqual({
        kind: 'refused',
        reason: 'missing or wrong bridge token',
        cors: 'https://localhost',
      });
    }
  });

  it('refuses photos and every other route from a Tailscale peer, even with the token', () => {
    for (const [method, path] of [
      ['GET', '/api/photos'],
      ['POST', '/api/photos'],
      ['DELETE', '/api/photos'],
      ['GET', '/api/photos/0b6f1c1e-0c7a-4d5e-9a57-0f4a6c2d9e11/image'],
      ['GET', '/api/health/'],
      ['GET', '/api/coach'],
      ['POST', '/api/health'],
    ]) {
      expect(apiAccess({ ...intent, method, path, origin: 'https://localhost' }, paired).kind, `${method} ${path}`).toBe('refused');
    }
    expect(apiAccess({ ...phone, path: '/api/photos' }, paired)).toEqual({
      kind: 'refused',
      reason: 'the API only answers requests from this computer (set BODYHACK_API_ALLOW_REMOTE=1 to allow others)',
      cors: null,
    });
  });

  it('refuses remote peers outside the Tailscale range, even with the token', () => {
    for (const remoteAddress of ['192.168.1.221', '100.63.255.255', '100.128.0.1', '::ffff:10.0.0.2', 'fd7a:115c:a1e1::1', 'fe80::1', undefined]) {
      expect(apiAccess({ ...intent, remoteAddress }, paired), String(remoteAddress)).toEqual({
        kind: 'refused',
        reason: 'the API only answers requests from this computer (set BODYHACK_API_ALLOW_REMOTE=1 to allow others)',
        cors: null,
      });
    }
  });

  it('refuses a foreign origin and a POST without a JSON body type, even with the token', () => {
    expect(apiAccess({ ...intent, origin: 'https://evil.example' }, paired)).toEqual({
      kind: 'refused',
      reason: 'cross-origin request from https://evil.example',
      cors: null,
    });
    expect(apiAccess({ ...intent, contentType: 'text/plain' }, paired)).toMatchObject({ kind: 'refused', reason: 'POST requests must have Content-Type: application/json' });
  });

  it('answers a preflight only from an app origin on a Tailscale peer, for the route method and the two headers', () => {
    expect(apiAccess(preflight, paired)).toEqual({ kind: 'preflight', cors: 'https://localhost', method: 'POST' });
    expect(apiAccess({ ...preflight, path: '/api/health', preflightMethod: 'GET', preflightHeaders: 'Authorization' }, paired)).toEqual({
      kind: 'preflight',
      cors: 'https://localhost',
      method: 'GET',
    });
    for (const req of [
      { ...preflight, origin: 'https://evil.example' },
      { ...preflight, origin: undefined },
      { ...preflight, preflightMethod: 'DELETE' },
      { ...preflight, preflightHeaders: 'authorization,x-debug' },
      { ...preflight, path: '/api/photos' },
      { ...preflight, remoteAddress: '192.168.1.221' },
    ]) {
      expect(apiAccess(req, paired).kind, JSON.stringify(req)).toBe('refused');
    }
    expect(apiAccess(preflight, { allowRemote: false, bridgeToken: () => null }).kind).toBe('refused');
  });

  it('acts as if the bridge did not exist when it is not paired', () => {
    expect(apiAccess(intent, { allowRemote: false, bridgeToken: () => null })).toEqual({
      kind: 'refused',
      reason: 'the API only answers requests from this computer (set BODYHACK_API_ALLOW_REMOTE=1 to allow others)',
      cors: null,
    });
  });

  it('keeps loopback rules: the app origin is still cross-origin on this computer', () => {
    const loopback: ApiRequest = { ...intent, remoteAddress: '127.0.0.1', host: 'localhost:5392', origin: 'http://localhost:5392', authorization: undefined };
    expect(apiAccess(loopback, paired)).toEqual({ kind: 'allowed', cors: null });
    expect(apiAccess({ ...loopback, origin: 'https://localhost' }, paired)).toEqual({
      kind: 'refused',
      reason: 'cross-origin request from https://localhost',
      cors: null,
    });
  });

  it('with the allow-remote flag, a same-site page on the tailnet still works without the token', () => {
    const page: ApiRequest = { ...intent, origin: 'http://100.124.212.65:5392', authorization: undefined };
    expect(apiAccess(page, paired).kind).toBe('refused');
    expect(apiAccess(page, { ...paired, allowRemote: true })).toEqual({ kind: 'allowed', cors: null });
  });
});

describe('bearerMatches', () => {
  it('accepts only Bearer and the exact token', () => {
    expect(bearerMatches(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
    expect(bearerMatches(`Bearer ${TOKEN}`, `${TOKEN}A`)).toBe(false);
    expect(bearerMatches(`Bearer ${TOKEN} extra`, TOKEN)).toBe(false);
    expect(bearerMatches(undefined, TOKEN)).toBe(false);
  });
});

describe('pairingLink', () => {
  it('encodes the server URL and the token as query parameters', () => {
    expect(pairingLink('http://100.124.212.65:5173', TOKEN)).toBe(`bodyhack://pair?url=http%3A%2F%2F100.124.212.65%3A5173&token=${TOKEN}`);
  });
});

describe('pair', () => {
  let dir = '';
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('stores a random 32-byte token in a 0600 file, keeps it on the next run and replaces it on rotate', () => {
    dir = mkdtempSync(join(tmpdir(), 'bridge-'));
    const file = join(dir, 'config/bodyhack-infinity/bridge.json');
    const first = pair(file, false);
    expect(first.isNew).toBe(true);
    expect(Buffer.from(first.pairing.token, 'base64url')).toHaveLength(32);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(join(dir, 'config/bodyhack-infinity')).mode & 0o777).toBe(0o700);
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ token: first.pairing.token, created: first.pairing.created });
    expect(readPairing(file)).toEqual(first.pairing);

    chmodSync(file, 0o644);
    expect(pair(file, false)).toEqual({ pairing: first.pairing, isNew: false });
    expect(statSync(file).mode & 0o777).toBe(0o600);

    const rotated = pair(file, true);
    expect(rotated.isNew).toBe(true);
    expect(rotated.pairing.token).not.toBe(first.pairing.token);
    expect(readPairing(file)).toEqual(rotated.pairing);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it('reads no pairing from a missing or malformed file', () => {
    dir = mkdtempSync(join(tmpdir(), 'bridge-'));
    const file = join(dir, 'bridge.json');
    expect(readPairing(file)).toBeNull();
    writeFileSync(file, JSON.stringify({ token: 'short', created: '2026-10-10T00:00:00.000Z' }));
    expect(readPairing(file)).toBeNull();
    writeFileSync(file, JSON.stringify({ token: TOKEN, created: '2026-10-10T00:00:00.000Z' }));
    expect(readPairing(file)).toEqual({ token: TOKEN, created: '2026-10-10T00:00:00.000Z' });
  });
});

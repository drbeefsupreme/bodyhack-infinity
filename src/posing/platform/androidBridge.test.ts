import { describe, expect, it } from 'vitest';
import type { SpeechStore } from '../speech';
import { bridgeCoach, PAIRING_KEY, parsePairingInput, parsePairLink, type BridgeHttp, type BridgeRequest } from './androidBridge';

/** The link format of pairingLink in server/bridge.ts (the src tests do not load server code). */
const pairingLink = (url: string, token: string) => `bodyhack://pair?${new URLSearchParams({ url, token })}`;

const TOKEN = 'Zm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4Zm9vYmFyYmF6';
const URL_ = 'http://100.101.102.103:5173';

function memoryStore(pairing?: object): SpeechStore {
  const items = new Map<string, string>(pairing ? [[PAIRING_KEY, JSON.stringify(pairing)]] : []);
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

/** A bridge that answers each path with a fixed reply, or fails to connect, and records the requests. */
function fakeHttp(replies: Readonly<Record<string, { status: number; body: unknown } | 'unreachable'>>) {
  const requests: BridgeRequest[] = [];
  const http: BridgeHttp = async (request) => {
    requests.push(request);
    const reply = replies[new URL(request.url).pathname];
    if (!reply || reply === 'unreachable') throw new Error('connect timed out');
    return reply;
  };
  return { http, requests };
}

const paired = memoryStore({ url: URL_, token: TOKEN });

describe('parsePairingInput', () => {
  it('accepts a Tailscale URL and the bridge token, trimmed and without a trailing slash', () => {
    expect(parsePairingInput(` ${URL_}/ `, ` ${TOKEN}\n`)).toEqual({ url: URL_, token: TOKEN });
    expect(parsePairingInput('https://desk.tail1234.ts.net', TOKEN).url).toBe('https://desk.tail1234.ts.net');
  });

  it('refuses addresses outside Tailscale, paths and short tokens', () => {
    expect(() => parsePairingInput('http://192.168.1.20:5173', TOKEN)).toThrow('not a Tailscale address');
    expect(() => parsePairingInput('http://100.128.0.1:5173', TOKEN)).toThrow('not a Tailscale address');
    expect(() => parsePairingInput(`${URL_}/api`, TOKEN)).toThrow('no path');
    expect(() => parsePairingInput(URL_, 'abc')).toThrow('base64url token');
    expect(() => parsePairingInput('100.101.102.103:5173', TOKEN)).toThrow();
  });
});

describe('parsePairLink', () => {
  it('reads the link that npm run bridge prints', () => {
    expect(parsePairLink(pairingLink(URL_, TOKEN))).toEqual({ ok: true, url: URL_, token: TOKEN });
  });

  it('reports a pairing link that cannot be a bridge, and ignores other links', () => {
    expect(parsePairLink(pairingLink('http://192.168.1.20:5173', TOKEN))).toEqual({ ok: false, error: '192.168.1.20 is not a Tailscale address (100.64.0.0/10 or *.ts.net)' });
    expect(parsePairLink('bodyhack://pair?url=http%3A%2F%2F100.101.102.103%3A5173')).toMatchObject({ ok: false });
    expect(parsePairLink('https://example.com/pair?url=x')).toBeUndefined();
    expect(parsePairLink('bodyhack://other?url=x')).toBeUndefined();
    expect(parsePairLink('not a link')).toBeUndefined();
  });
});

describe('bridgeCoach', () => {
  it('reports unpaired and offline cleanly', async () => {
    const { http, requests } = fakeHttp({ '/api/health': 'unreachable' });
    expect(await bridgeCoach(memoryStore(), http).status()).toEqual({ state: 'unpaired' });
    expect(requests).toHaveLength(0);
    const coach = bridgeCoach(paired, http);
    expect(await coach.status()).toEqual({ state: 'offline', url: URL_, error: 'connect timed out' });
    expect(await coach.health()).toEqual({ omp: false, jev: false, coachModel: undefined });
  });

  it('stores a valid pairing, refuses an invalid one, and forgets it on unpair', async () => {
    const store = memoryStore();
    const { http } = fakeHttp({ '/api/health': { status: 200, body: { omp: true, jev: false, coachModel: 'm' } } });
    const coach = bridgeCoach(store, http);
    await expect(coach.pair('http://10.0.0.2:5173', TOKEN)).rejects.toThrow('not a Tailscale address');
    expect(await coach.status()).toEqual({ state: 'unpaired' });
    expect(await coach.pair(`${URL_}/`, TOKEN)).toEqual({ state: 'online', url: URL_, health: { omp: true, jev: false, coachModel: 'm' } });
    expect(JSON.parse(store.getItem(PAIRING_KEY) ?? '')).toEqual({ url: URL_, token: TOKEN });
    coach.unpair();
    expect(await coach.status()).toEqual({ state: 'unpaired' });
  });

  it('sends the token and reads the health of an online bridge', async () => {
    const { http, requests } = fakeHttp({ '/api/health': { status: 200, body: { omp: true, jev: true, coachModel: 'anthropic/claude-sonnet-5' } } });
    expect(await bridgeCoach(paired, http).health()).toEqual({ omp: true, jev: true, coachModel: 'anthropic/claude-sonnet-5' });
    expect(requests).toEqual([{ method: 'GET', url: `${URL_}/api/health`, token: TOKEN, timeoutMs: 4000 }]);
  });

  it('shows a refused token as offline with the reason', async () => {
    const { http } = fakeHttp({ '/api/health': { status: 403, body: { error: 'bridge token required' } } });
    expect(await bridgeCoach(paired, http).status()).toEqual({ state: 'offline', url: URL_, error: 'the bridge answered 403: bridge token required' });
  });

  it('returns the intent answer, and unavailable when unpaired, failing or aborted', async () => {
    const answer = fakeHttp({ '/api/intent': { status: 200, body: { choice: 'next', confidence: 0.93 } } });
    expect(await bridgeCoach(paired, answer.http).askIntent('next one please')).toEqual({ kind: 'answer', choice: 'next', confidence: 0.93 });
    expect(answer.requests[0].body).toMatchObject({ heard: 'next one please' });

    expect(await bridgeCoach(memoryStore(), answer.http).askIntent('next')).toEqual({ kind: 'unavailable' });
    expect(await bridgeCoach(paired, fakeHttp({ '/api/intent': { status: 503, body: { error: 'jev is down' } } }).http).askIntent('next')).toEqual({
      kind: 'unavailable',
    });
    expect(await bridgeCoach(paired, fakeHttp({ '/api/intent': 'unreachable' }).http).askIntent('next')).toEqual({ kind: 'unavailable' });

    const never: BridgeHttp = () => Promise.withResolvers<{ status: number; body: unknown }>().promise;
    const abort = new AbortController();
    const asked = bridgeCoach(paired, never).askIntent('next', abort.signal);
    abort.abort();
    expect(await asked).toEqual({ kind: 'unavailable' });
  });

  it('returns the coach note, and throws "coach offline" when unpaired or unreachable', async () => {
    const ask = { pose: 'Side chest', summary: {}, imageDataUrl: 'data:image/jpeg;base64,/9j/', model: undefined };
    const note = fakeHttp({ '/api/coach': { status: 200, body: { cues: ['Lift the chest.'], note: 'Good line.', model: 'm', ms: 4200 } } });
    expect(await bridgeCoach(paired, note.http).askCoach(ask)).toEqual({ cues: ['Lift the chest.'], note: 'Good line.', model: 'm', ms: 4200 });
    await expect(bridgeCoach(memoryStore(), note.http).askCoach(ask)).rejects.toThrow('coach offline: pair the app');
    await expect(bridgeCoach(paired, fakeHttp({ '/api/coach': 'unreachable' }).http).askCoach(ask)).rejects.toThrow(
      `coach offline: ${URL_} did not answer (connect timed out)`,
    );
    await expect(bridgeCoach(paired, fakeHttp({ '/api/coach': { status: 502, body: { error: 'omp failed' } } }).http).askCoach(ask)).rejects.toThrow('omp failed');
  });
});

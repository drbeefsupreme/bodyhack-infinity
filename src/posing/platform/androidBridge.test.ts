import { describe, expect, it } from 'vitest';
import type { SpeechStore } from '../speech';
import { bridgeCoach, PAIRING_KEY, parsePairingInput, type BridgeHttp, type BridgeRequest } from './androidBridge';

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

describe('bridgeCoach', () => {
  it('reports unpaired and offline cleanly', async () => {
    const { http, requests } = fakeHttp({ '/api/health': 'unreachable' });
    expect(await bridgeCoach(memoryStore(), http).status()).toEqual({ state: 'unpaired' });
    expect(requests).toHaveLength(0);
    const coach = bridgeCoach(paired, http);
    expect(await coach.status()).toEqual({ state: 'offline', url: URL_, error: 'connect timed out' });
    expect(await coach.health()).toEqual({ omp: false, jev: false, coachModel: undefined });
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

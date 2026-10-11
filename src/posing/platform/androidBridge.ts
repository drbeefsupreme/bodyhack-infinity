// The Android CoachClient: the coach and the voice-command intent go to the desktop bridge (server/bridge.ts) that the
// app is paired with: a Tailscale URL and a bearer token, kept in the platform store. Without a pairing, or when the
// bridge does not answer, the coach is offline and voice commands fall back to keywords.

import { COMMAND_OPTIONS, type IntentReply } from '../modes/commands';
import { field, storedObject } from '../modes/stored';
import type { SpeechStore } from '../speech';
import type { CoachAsk, CoachNote, Health } from '../ui/api';
import { parseCoach, parseHealth, parseIntent } from './replies';
import type { CoachClient } from './types';

export const PAIRING_KEY = 'bodyhack-bridge';

export interface Pairing {
  /** `http://<tailscale address>:<port>`, no trailing slash. */
  readonly url: string;
  readonly token: string;
}

export interface BridgeRequest {
  readonly method: 'GET' | 'POST';
  readonly url: string;
  readonly token: string;
  readonly body?: object;
  readonly timeoutMs: number;
}

/** One HTTP exchange with the bridge. Rejects when the bridge cannot be reached. */
export type BridgeHttp = (request: BridgeRequest) => Promise<{ readonly status: number; readonly body: unknown }>;

export type BridgeStatus =
  | { readonly state: 'unpaired' }
  | { readonly state: 'offline'; readonly url: string; readonly error: string }
  | { readonly state: 'online'; readonly url: string; readonly health: Health };

export interface BridgeCoach extends CoachClient {
  status(): Promise<BridgeStatus>;
}

const OFFLINE: Health = { omp: false, jev: false, coachModel: undefined };
const HEALTH_MS = 4000;
const INTENT_MS = 6000;
/** The coach model reads a photo; a slow model takes a minute. */
const COACH_MS = 120_000;
/** The bridge's tokens: 32 random bytes in base64url (server/bridge.ts). */
const TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

/** True for the Tailscale ranges the bridge accepts (100.64.0.0/10, fd7a:115c:a1e0::/48) and MagicDNS names. */
function tailscaleHost(host: string): boolean {
  const v4 = /^100\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(host);
  if (v4) return Number(v4[1]) >= 64 && Number(v4[1]) <= 127;
  return /^\[fd7a:115c:a1e0:/i.test(host) || host.endsWith('.ts.net');
}

/** The pairing for `url` and `token` as typed or scanned. Throws with the reason when they cannot be a bridge. */
export function parsePairingInput(url: string, token: string): Pairing {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error(`"${url}" is not a URL such as http://100.101.102.103:5173`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('the bridge URL must start with http:// or https://');
  if (!tailscaleHost(parsed.hostname)) throw new Error(`${parsed.hostname} is not a Tailscale address (100.64.0.0/10 or *.ts.net)`);
  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username) throw new Error('the bridge URL must have no path, query or user');
  const cleanToken = token.trim();
  if (!TOKEN.test(cleanToken)) throw new Error('the token must be the base64url token that npm run bridge printed');
  return { url: parsed.origin, token: cleanToken };
}

/** The stored pairing, or undefined when none is stored or it is not valid. */
export function storedPairing(store: SpeechStore): Pairing | undefined {
  const obj = storedObject(store.getItem(PAIRING_KEY));
  const url = field(obj, 'url');
  const token = field(obj, 'token');
  if (typeof url !== 'string' || typeof token !== 'string') return undefined;
  try {
    return parsePairingInput(url, token);
  } catch {
    return undefined;
  }
}

export function bridgeCoach(store: SpeechStore, http: BridgeHttp): BridgeCoach {
  const status = async (): Promise<BridgeStatus> => {
    const pairing = storedPairing(store);
    if (!pairing) return { state: 'unpaired' };
    try {
      const res = await http({ method: 'GET', url: `${pairing.url}/api/health`, token: pairing.token, timeoutMs: HEALTH_MS });
      if (res.status === 200) return { state: 'online', url: pairing.url, health: parseHealth(res.body) };
      const error = field(res.body, 'error');
      return { state: 'offline', url: pairing.url, error: `the bridge answered ${res.status}${typeof error === 'string' ? `: ${error}` : ''}` };
    } catch (err) {
      return { state: 'offline', url: pairing.url, error: err instanceof Error ? err.message : String(err) };
    }
  };

  return {
    status,

    async health(): Promise<Health> {
      const now = await status();
      return now.state === 'online' ? now.health : OFFLINE;
    },

    async askIntent(heard: string, signal?: AbortSignal): Promise<IntentReply> {
      const pairing = storedPairing(store);
      if (!pairing || signal?.aborted) return { kind: 'unavailable' };
      const aborted = Promise.withResolvers<IntentReply>();
      const onAbort = () => aborted.resolve({ kind: 'unavailable' });
      signal?.addEventListener('abort', onAbort, { once: true });
      const asked = http({ method: 'POST', url: `${pairing.url}/api/intent`, token: pairing.token, body: { heard, options: COMMAND_OPTIONS }, timeoutMs: INTENT_MS }).then(
        (res) => parseIntent(res.status >= 200 && res.status <= 299, res.body),
        (err: unknown): IntentReply => {
          console.warn('The bridge intent call failed; voice commands use keywords.', err);
          return { kind: 'unavailable' };
        },
      );
      try {
        return await Promise.race([asked, aborted.promise]);
      } finally {
        signal?.removeEventListener('abort', onAbort);
      }
    },

    async askCoach(ask: CoachAsk): Promise<CoachNote> {
      const pairing = storedPairing(store);
      if (!pairing) throw new Error('coach offline: pair the app with the desktop bridge (npm run bridge)');
      let res: { readonly status: number; readonly body: unknown };
      try {
        res = await http({ method: 'POST', url: `${pairing.url}/api/coach`, token: pairing.token, body: ask, timeoutMs: COACH_MS });
      } catch (err) {
        throw new Error(`coach offline: ${pairing.url} did not answer (${err instanceof Error ? err.message : String(err)})`);
      }
      return parseCoach(res.status, res.body);
    },
  };
}

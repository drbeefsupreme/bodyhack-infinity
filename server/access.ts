// Who may call /api/*. The API serves body photos, runs omp on the operator's LLM login and uses the jev key, so
// only this computer may call it, and only from a page that the dev or preview server itself served. One exception,
// the phone bridge: the paired Android app may call health, coach and intent over Tailscale with the bridge token.

import { BlockList, isIP } from 'node:net';
import { bearerMatches } from './bridge.ts';

export interface ApiRequest {
  method: string | undefined;
  /** URL path without the query. */
  path: string;
  /** Socket peer address. */
  remoteAddress: string | undefined;
  host: string | undefined;
  origin: string | undefined;
  contentType: string | undefined;
  authorization: string | undefined;
  /** `Access-Control-Request-Method` and `Access-Control-Request-Headers` of a CORS preflight. */
  preflightMethod: string | undefined;
  preflightHeaders: string | undefined;
}

export interface AccessPolicy {
  /** BODYHACK_API_ALLOW_REMOTE=1: lifts the loopback and Host rules on every route. */
  allowRemote: boolean;
  /** The paired bridge token, or null when the bridge is not paired; then the API acts as if the bridge did not exist. */
  bridgeToken: () => string | null;
}

/** `cors` is the app origin to send back in `Access-Control-Allow-Origin`, or null for none. */
export type ApiAccess =
  | { kind: 'allowed'; cors: string | null }
  | { kind: 'preflight'; cors: string; method: BridgeMethod }
  | { kind: 'refused'; reason: string; cors: string | null };

type BridgeMethod = 'GET' | 'POST';

const LOOPBACK_ADDRESS = /^(127\.\d{1,3}\.\d{1,3}\.\d{1,3}|::1|::ffff:127\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
/** A bare host and optional port; rejects userinfo, paths and other tricks a URL parser would accept. */
const HOST_HEADER = /^(\[[0-9a-f:.]+\]|[a-z0-9.-]+)(:\d{1,5})?$/;
/** A Host header outside this list can be DNS rebinding: a foreign site name that resolves to this computer. */
const LOCAL_HOSTNAMES: Record<string, true> = { localhost: true, '127.0.0.1': true, '[::1]': true };
/** Methods that a page on another site could send without a CORS preflight, if the body type allowed it. */
const JSON_ONLY_METHODS: Record<string, true> = { POST: true, PUT: true, PATCH: true };
const JSON_TYPE = /^application\/json\s*(;|$)/i;

/** The only routes the phone bridge opens. Photos are never among them. */
const BRIDGE_ROUTES: Record<string, BridgeMethod> = { '/api/health': 'GET', '/api/coach': 'POST', '/api/intent': 'POST' };
/** WebView origins of the Capacitor app (Android `https`, iOS `capacitor`, Android with `androidScheme: 'http'`). */
const APP_ORIGINS: Record<string, true> = { 'https://localhost': true, 'capacitor://localhost': true, 'http://localhost': true };
const BRIDGE_HEADERS: Record<string, true> = { authorization: true, 'content-type': true };
/** Tailscale's address ranges: CGNAT 100.64.0.0/10 and its ULA prefix. IPv4-mapped IPv6 peers match the IPv4 rule. */
const TAILNET = new BlockList();
TAILNET.addSubnet('100.64.0.0', 10, 'ipv4');
TAILNET.addSubnet('fd7a:115c:a1e0::', 48, 'ipv6');

/** Whether the API may run the request, answer it as a CORS preflight, or must refuse it. */
export function apiAccess(req: ApiRequest, policy: AccessPolicy): ApiAccess {
  const host = HOST_HEADER.exec(req.host?.toLowerCase() ?? '');
  if (!host) return { kind: 'refused', reason: 'missing or malformed Host header', cors: null };
  const address = req.remoteAddress ?? '';
  const family = isIP(address);
  const candidate =
    family !== 0 &&
    !LOOPBACK_ADDRESS.test(address) &&
    Object.hasOwn(BRIDGE_ROUTES, req.path) &&
    TAILNET.check(address, family === 4 ? 'ipv4' : 'ipv6');
  const token = candidate ? policy.bridgeToken() : null;
  if (token !== null) {
    const bridged = bridgeAccess(req, BRIDGE_ROUTES[req.path], token);
    if (bridged.kind !== 'refused' || !policy.allowRemote) return bridged;
  }
  const reason = localRefusal(req, host, policy.allowRemote);
  return reason ? { kind: 'refused', reason, cors: null } : { kind: 'allowed', cors: null };
}

/** A Tailscale peer on a bridge route of a paired server: it needs the token, an app origin or none, and a JSON body type. */
function bridgeAccess(req: ApiRequest, method: BridgeMethod, token: string): ApiAccess {
  const app = req.origin !== undefined && Object.hasOwn(APP_ORIGINS, req.origin) ? req.origin : null;
  const refuse = (reason: string): ApiAccess => ({ kind: 'refused', reason, cors: app });
  if (req.method === 'OPTIONS') {
    if (!app) return refuse(`preflight from ${req.origin ?? 'no origin'}; only the app may call the bridge`);
    if (req.preflightMethod !== method) return refuse(`preflight for ${req.preflightMethod} ${req.path}; the bridge allows ${method}`);
    const extra = (req.preflightHeaders ?? '')
      .split(',')
      .map((header) => header.trim().toLowerCase())
      .find((header) => header !== '' && !Object.hasOwn(BRIDGE_HEADERS, header));
    if (extra !== undefined) return refuse(`preflight asks for header ${extra}`);
    return { kind: 'preflight', cors: app, method };
  }
  if (req.method !== method) return refuse(`${req.method} ${req.path} is not a bridge route`);
  if (!bearerMatches(req.authorization, token)) return refuse('missing or wrong bridge token');
  if (req.origin !== undefined && !app) return refuse(`cross-origin request from ${req.origin}`);
  if (method === 'POST' && !JSON_TYPE.test(req.contentType ?? '')) return refuse('POST requests must have Content-Type: application/json');
  return { kind: 'allowed', cors: app };
}

/** Why a same-site request is refused, or null. `allowRemote` lifts only the loopback and Host rules. */
function localRefusal(req: ApiRequest, host: RegExpExecArray, allowRemote: boolean): string | null {
  if (!allowRemote) {
    if (!LOOPBACK_ADDRESS.test(req.remoteAddress ?? '')) {
      return 'the API only answers requests from this computer (set BODYHACK_API_ALLOW_REMOTE=1 to allow others)';
    }
    if (!Object.hasOwn(LOCAL_HOSTNAMES, host[1])) return `Host ${host[0]} is not localhost, 127.0.0.1 or [::1]`;
  }
  if (req.origin !== undefined) {
    let origin: string;
    try {
      origin = new URL(req.origin).host;
    } catch {
      return 'cross-origin request';
    }
    if (origin !== host[0]) return `cross-origin request from ${req.origin}`;
  }
  if (Object.hasOwn(JSON_ONLY_METHODS, req.method ?? '') && !JSON_TYPE.test(req.contentType ?? '')) {
    return `${req.method} requests must have Content-Type: application/json`;
  }
  return null;
}

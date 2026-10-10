// Who may call /api/*. The API serves body photos, runs omp on the operator's LLM login and uses the jev key, so
// only this computer may call it, and only from a page that the dev or preview server itself served.

export interface ApiRequest {
  method: string | undefined;
  /** Socket peer address. */
  remoteAddress: string | undefined;
  host: string | undefined;
  origin: string | undefined;
  contentType: string | undefined;
}

const LOOPBACK_ADDRESS = /^(127\.\d{1,3}\.\d{1,3}\.\d{1,3}|::1|::ffff:127\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
/** A bare host and optional port; rejects userinfo, paths and other tricks a URL parser would accept. */
const HOST_HEADER = /^(\[[0-9a-f:.]+\]|[a-z0-9.-]+)(:\d{1,5})?$/;
/** A Host header outside this list can be DNS rebinding: a foreign site name that resolves to this computer. */
const LOCAL_HOSTNAMES: Record<string, true> = { localhost: true, '127.0.0.1': true, '[::1]': true };
/** Methods that a page on another site could send without a CORS preflight, if the body type allowed it. */
const JSON_ONLY_METHODS: Record<string, true> = { POST: true, PUT: true, PATCH: true };
const JSON_TYPE = /^application\/json\s*(;|$)/i;

/** Why the API refuses the request, or null when it may run. `allowRemote` lifts only the loopback and Host rules. */
export function apiRefusal(req: ApiRequest, allowRemote: boolean): string | null {
  const host = HOST_HEADER.exec(req.host?.toLowerCase() ?? '');
  if (!host) return 'missing or malformed Host header';
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

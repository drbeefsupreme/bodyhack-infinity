import { describe, expect, it } from 'vitest';
import { apiAccess, type ApiRequest } from './access.ts';

const local: ApiRequest = {
  method: 'GET',
  path: '/api/health',
  remoteAddress: '127.0.0.1',
  host: 'localhost:5351',
  origin: undefined,
  contentType: undefined,
  authorization: undefined,
  preflightMethod: undefined,
  preflightHeaders: undefined,
};
const post: ApiRequest = { ...local, method: 'POST', origin: 'http://localhost:5351', contentType: 'application/json' };

/** The refusal reason with the bridge unpaired, or null when the request may run. */
function apiRefusal(req: ApiRequest, allowRemote: boolean): string | null {
  const access = apiAccess(req, { allowRemote, bridgeToken: () => null });
  return access.kind === 'refused' ? access.reason : null;
}

describe('apiAccess without the bridge', () => {
  it('lets loopback requests on a local Host through', () => {
    for (const req of [
      local,
      { ...local, remoteAddress: '::1', host: '[::1]:5351' },
      { ...local, remoteAddress: '::ffff:127.0.0.1', host: '127.0.0.1:4173' },
      { ...local, host: 'LOCALHOST' },
      post,
      { ...post, contentType: 'application/json; charset=utf-8' },
      { ...local, method: 'DELETE', origin: 'http://localhost:5351' },
      { ...local, method: 'DELETE' },
    ]) {
      expect(apiRefusal(req, false), JSON.stringify(req)).toBeNull();
    }
  });

  it('refuses requests from other machines', () => {
    for (const remoteAddress of ['192.168.1.221', '100.124.212.65', '::ffff:10.0.0.2', 'fe80::1', undefined]) {
      expect(apiRefusal({ ...local, remoteAddress }, false)).toMatch(/only answers requests from this computer/);
    }
  });

  it('refuses a Host that is not local, as DNS rebinding sends', () => {
    for (const host of ['evil.example:5351', '192.168.1.221:5351', 'localhost.evil.example', 'evil.example@localhost', 'localhost/x', '', undefined]) {
      expect(apiRefusal({ ...local, host }, false), String(host)).not.toBeNull();
    }
  });

  it('refuses cross-origin requests', () => {
    for (const origin of ['http://evil.example', 'http://localhost:5173', 'http://127.0.0.1:5351', 'null']) {
      expect(apiRefusal({ ...post, origin }, false), origin).toMatch(/cross-origin/);
      expect(apiRefusal({ ...local, method: 'DELETE', origin }, false), origin).toMatch(/cross-origin/);
    }
  });

  it('refuses a POST without a JSON body type, which a form on another site could send', () => {
    for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'application/jsonp', undefined]) {
      expect(apiRefusal({ ...post, contentType }, false), String(contentType)).toMatch(/Content-Type: application\/json/);
    }
  });

  it('with the allow-remote flag, accepts other machines and Hosts but still refuses cross-origin requests', () => {
    const remote: ApiRequest = { ...post, remoteAddress: '100.124.212.65', host: '100.124.212.65:5351', origin: 'http://100.124.212.65:5351' };
    expect(apiRefusal(remote, false)).not.toBeNull();
    expect(apiRefusal(remote, true)).toBeNull();
    expect(apiRefusal({ ...remote, host: 'bodyhack.tailnet.ts.net:5351', origin: 'http://bodyhack.tailnet.ts.net:5351' }, true)).toBeNull();
    expect(apiRefusal({ ...remote, origin: 'http://evil.example' }, true)).toMatch(/cross-origin/);
    expect(apiRefusal({ ...remote, contentType: 'text/plain' }, true)).toMatch(/Content-Type/);
  });
});

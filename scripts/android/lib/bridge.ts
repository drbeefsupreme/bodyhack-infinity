// The desktop side of the phone bridge for the Android harness: the URL and token that `npm run bridge` prints, and a
// Vite dev server (with the bridge routes) on a free port.
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { openSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { ROOT, stopGroup, waitFor } from './tools.ts';

/** A type, not an interface, so it can go straight into `URLSearchParams` for the pairing link. */
export type BridgeValues = {
  /** `http://<tailscale address>:<port>`. */
  readonly url: string;
  readonly token: string;
};

/** The URL and token that `npm run bridge` prints for a server on `port`. It keeps the stored token. */
export function bridgeValues(port: number): BridgeValues {
  const out = execFileSync('npm', ['run', 'bridge', '--', '--port', String(port)], { cwd: ROOT, encoding: 'utf8' });
  const url = /Server URL:\s+(\S+)/.exec(out)?.[1];
  const token = /Token:\s+(\S+)/.exec(out)?.[1];
  if (!url || !token) throw new Error(`npm run bridge printed no URL and token:\n${out}`);
  return { url, token };
}

export interface BridgeServer extends BridgeValues {
  readonly port: number;
  stop(): Promise<void>;
}

/**
 * Starts `npm run dev` on a free port (output in `log`, photo data in `dataDir`) and waits until its bridge answers
 * `GET /api/health` with the token, from this computer's Tailscale address.
 */
export async function startBridgeServer(log: string, dataDir: string): Promise<BridgeServer> {
  const probe = createServer().listen(0);
  await once(probe, 'listening');
  const { port } = probe.address() as AddressInfo;
  probe.close();
  await once(probe, 'close');
  const values = bridgeValues(port);
  const child = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    env: { ...process.env, BODYHACK_DATA_DIR: dataDir },
    detached: true,
    stdio: ['ignore', openSync(log, 'w'), openSync(log, 'a')],
  });
  child.unref();
  const pid = child.pid;
  if (pid === undefined) throw new Error('npm run dev did not start.');
  const stop = () => stopGroup(pid);
  try {
    await waitFor(`the bridge on ${values.url} (log ${log})`, 90_000, async () => {
      if (child.exitCode !== null) throw new Error(`npm run dev exited with ${child.exitCode}; log ${log}`);
      const res = await fetch(`${values.url}/api/health`, { headers: { authorization: `Bearer ${values.token}` } }).catch(() => undefined);
      return res?.status === 200 ? true : undefined;
    });
  } catch (err) {
    await stop();
    throw err;
  }
  return { ...values, port, stop };
}

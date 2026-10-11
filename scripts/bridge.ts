// Pairs the Android app with this computer: makes or shows the bridge token and prints the URL, token and QR code.
// Usage: npm run bridge [-- --port <port>] [-- --rotate]

import { execFileSync, spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { bridgeFile, pair, pairingLink } from '../server/bridge.ts';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '5173' },
    rotate: { type: 'boolean', default: false },
  },
});
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`--port must be a port number, not ${values.port}`);
  process.exit(2);
}

const file = bridgeFile();
const { pairing, isNew } = pair(file, values.rotate);
console.log(`${isNew ? 'New' : 'Existing'} bridge token (${file}, made ${pairing.created}).`);
if (values.rotate) console.log('The old token no longer works. Pair the app again.');

let address: string;
try {
  address = execFileSync('tailscale', ['ip', '-4'], { encoding: 'utf8' }).split('\n')[0].trim();
} catch (err) {
  console.error(`tailscale ip -4 failed: ${err instanceof Error ? err.message : err}`);
  console.error(`Start Tailscale and run this again. Token: ${pairing.token}`);
  process.exit(1);
}
const url = `http://${address}:${port}`;
const link = pairingLink(url, pairing.token);

console.log(`
Server URL: ${url}
Token:      ${pairing.token}
Pair link:  ${link}

The server must run on port ${port}, for example: npm run dev -- --port ${port}
`);

const qr = spawnSync('qrencode', ['-t', 'ANSIUTF8', '-m', '2', link], { stdio: ['ignore', 'inherit', 'pipe'] });
if (qr.error || qr.status !== 0) {
  console.log('No QR code: install qrencode (apt install qrencode), or type the server URL and token in the app.');
}

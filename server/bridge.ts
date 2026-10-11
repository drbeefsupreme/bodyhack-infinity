// The phone bridge: a token that lets the paired Android app call a few API routes over Tailscale (server/access.ts).

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface BridgePairing {
  /** 32 random bytes, base64url. */
  token: string;
  /** ISO time the token was made. */
  created: string;
}

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const BEARER = /^Bearer\s+(\S+)\s*$/i;

export function bridgeFile(): string {
  return join(homedir(), '.config/bodyhack-infinity/bridge.json');
}

/** The stored pairing, or null when `file` is missing or holds no valid token. Read on each call, so a new token applies without a restart. */
export function readPairing(file: string): BridgePairing | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { token, created } = parsed as Record<string, unknown>;
  if (typeof token !== 'string' || !TOKEN.test(token) || typeof created !== 'string') return null;
  return { token, created };
}

/** Keeps the stored pairing, or makes a new one when there is none or `rotate` is set. The file is always left at mode 0600. */
export function pair(file: string, rotate: boolean): { pairing: BridgePairing; isNew: boolean } {
  const existing = rotate ? null : readPairing(file);
  if (existing) {
    chmodSync(file, 0o600);
    return { pairing: existing, isNew: false };
  }
  const pairing: BridgePairing = { token: randomBytes(32).toString('base64url'), created: new Date().toISOString() };
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
  writeFileSync(temp, `${JSON.stringify(pairing, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  chmodSync(temp, 0o600);
  renameSync(temp, file);
  return { pairing, isNew: true };
}

/** Whether an `Authorization` header carries `Bearer <token>`. Compares SHA-256 digests in constant time, so neither the token nor its length leaks through timing. */
export function bearerMatches(authorization: string | undefined, token: string): boolean {
  const given = BEARER.exec(authorization ?? '');
  if (!given) return false;
  return timingSafeEqual(createHash('sha256').update(given[1]).digest(), createHash('sha256').update(token).digest());
}

/** The link that the app's pairing QR code holds. */
export function pairingLink(serverUrl: string, token: string): string {
  return `bodyhack://pair?${new URLSearchParams({ url: serverUrl, token })}`;
}

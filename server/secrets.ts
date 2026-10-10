import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY_NAME = 'TYPESAFE_API_KEY';

/** Files searched for the jev key, in order, after the process environment. */
export function keyFiles(root: string): string[] {
  const home = homedir();
  return [
    join(root, '.env.local'),
    join(home, 'git/crispy/.env.local'),
    join(home, '.config/bodyhack-infinity/env'),
  ];
}

/** Value of `name` in dotenv text (`NAME=value`, optional `export` and quotes), or null if unset or empty. */
export function readEnvValue(text: string, name: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || m[1] !== name) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (value) return value;
  }
  return null;
}

/** The jev key, read fresh on each call so a key added while the server runs is picked up. Never send it to the browser. */
export function typesafeKey(root: string): string | null {
  const fromEnv = process.env[KEY_NAME]?.trim();
  if (fromEnv) return fromEnv;
  for (const file of keyFiles(root)) {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const value = readEnvValue(text, KEY_NAME);
    if (value) return value;
  }
  return null;
}

/** The process environment without the jev key, for child processes that do not need it. */
export function envWithoutKey(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env[KEY_NAME];
  return env;
}

import { describe, expect, it } from 'vitest';
import { coachModel, DEFAULT_COACH_MODEL } from './coach.ts';
import { readEnvValue } from './secrets.ts';
import { parseCoachRequest, parseIntentRequest } from './validate.ts';

describe('coachModel', () => {
  it('uses BODYHACK_COACH_MODEL when it is set, else the default that /api/health reports', () => {
    expect(coachModel({ BODYHACK_COACH_MODEL: ' anthropic/claude-opus-5-5 ' })).toBe('anthropic/claude-opus-5-5');
    expect(coachModel({ BODYHACK_COACH_MODEL: '  ' })).toBe(DEFAULT_COACH_MODEL);
    expect(coachModel({})).toBe('anthropic/claude-sonnet-5');
  });
});

describe('readEnvValue', () => {
  it('reads plain, exported and quoted values and skips empty ones', () => {
    expect(readEnvValue('A=1\nTYPESAFE_API_KEY=abc\n', 'TYPESAFE_API_KEY')).toBe('abc');
    expect(readEnvValue('export TYPESAFE_API_KEY="q x"', 'TYPESAFE_API_KEY')).toBe('q x');
    expect(readEnvValue('TYPESAFE_API_KEY=\n', 'TYPESAFE_API_KEY')).toBeNull();
  });
});

describe('request validation', () => {
  it('accepts a well-formed intent request', () => {
    const r = parseIntentRequest({ heard: ' next one ', options: { next: 'Go on', repeat: 'Again' } });
    expect(r).toEqual({ ok: true, value: { heard: 'next one', options: { next: 'Go on', repeat: 'Again' } } });
  });

  it('rejects intent requests with missing text or fewer than two options', () => {
    expect(parseIntentRequest({ heard: '', options: { a: '', b: '' } }).ok).toBe(false);
    expect(parseIntentRequest({ heard: 'x', options: { a: '' } }).ok).toBe(false);
    expect(parseIntentRequest({ heard: 'x', options: { a: 1, b: 2 } }).ok).toBe(false);
    expect(parseIntentRequest(null).ok).toBe(false);
  });

  it('decodes a coach image and rejects other data URLs and unsafe model ids', () => {
    const png = `data:image/png;base64,${Buffer.from('fake png').toString('base64')}`;
    const ok = parseCoachRequest({ pose: 'front double biceps', summary: { score: 80 }, imageDataUrl: png });
    expect(ok.ok && ok.value.image).toEqual({ type: 'png', bytes: Buffer.from('fake png') });
    expect(parseCoachRequest({ pose: 'p', summary: {}, imageDataUrl: 'data:text/html;base64,PGI+' }).ok).toBe(false);
    expect(parseCoachRequest({ pose: 'p', summary: {}, model: '--tools=bash' }).ok).toBe(false);
    expect(parseCoachRequest({ pose: 'p', summary: [] }).ok).toBe(false);
  });
});

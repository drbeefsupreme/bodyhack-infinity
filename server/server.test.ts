import { describe, expect, it } from 'vitest';
import { coachModel, DEFAULT_COACH_MODEL, parseCoachReply } from './coach.ts';
import { parseChoiceAnswer } from './jev.ts';
import { readEnvValue } from './secrets.ts';
import { parseCoachRequest, parseIntentRequest } from './validate.ts';

describe('parseCoachReply', () => {
  it('reads the JSON from a fenced reply with prose around it', () => {
    const out = 'Looking at the image.\n```json\n{"cues": ["Flare the lats", "Lift the chest"], "note": "Good {shape}."}\n```\nDone.';
    expect(parseCoachReply(out)).toEqual({ cues: ['Flare the lats', 'Lift the chest'], note: 'Good {shape}.' });
  });

  it('keeps at most three cues and takes the last valid object', () => {
    const out = '{"cues": ["old"], "note": "draft"} then {"cues": ["a", "b", "c", "d"], "note": "final"}';
    expect(parseCoachReply(out)).toEqual({ cues: ['a', 'b', 'c'], note: 'final' });
  });

  it('returns null when no object has string cues', () => {
    expect(parseCoachReply('{"cues": string[], "note": string}')).toBeNull();
    expect(parseCoachReply('{"cues": [1, 2]}')).toBeNull();
  });
});

describe('coachModel', () => {
  it('uses BODYHACK_COACH_MODEL when it is set, else the default that /api/health reports', () => {
    expect(coachModel({ BODYHACK_COACH_MODEL: ' anthropic/claude-opus-5-5 ' })).toBe('anthropic/claude-opus-5-5');
    expect(coachModel({ BODYHACK_COACH_MODEL: '  ' })).toBe(DEFAULT_COACH_MODEL);
    expect(coachModel({})).toBe('anthropic/claude-sonnet-5');
  });
});

describe('parseChoiceAnswer', () => {
  it('returns choice, confidence and a probability for every option', () => {
    const body = { answers: { intent: { type: 'choice', choice: 'next', confidence: 0.9, probabilities: { next: 0.95, repeat: 0.05 } } } };
    expect(parseChoiceAnswer(body, ['next', 'repeat', 'stop'])).toEqual({
      choice: 'next',
      confidence: 0.9,
      probabilities: { next: 0.95, repeat: 0.05, stop: 0 },
    });
  });

  it('rejects a choice outside the options and malformed bodies', () => {
    expect(parseChoiceAnswer({ answers: { intent: { choice: 'jump', confidence: 1, probabilities: {} } } }, ['next'])).toBeNull();
    expect(parseChoiceAnswer(null, ['next'])).toBeNull();
    expect(parseChoiceAnswer('oops', ['next'])).toBeNull();
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

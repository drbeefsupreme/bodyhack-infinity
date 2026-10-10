const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const TIMEOUT_MS = 2000;
const QUESTION_ID = 'intent';
const INSTRUCTIONS =
  'The `transcript` is what speech recognition heard while a user practiced bodybuilding poses in a training app. ' +
  'Which command did the user mean?';

export interface IntentAnswer {
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

/** Asks jev one Choice question: which of `options` (option → description) the transcript `heard` means. */
export async function chooseIntent(key: string, heard: string, options: Record<string, string>): Promise<IntentAnswer> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        state: { transcript: heard },
        model: MODEL,
        questions: { [QUESTION_ID]: { type: 'choice', instructions: INSTRUCTIONS, criteria: options } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') throw new Error(`jev timed out after ${TIMEOUT_MS} ms`);
    throw new Error(`jev unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw new Error(`jev returned HTTP ${res.status}`);
  const answer = parseChoiceAnswer(await res.json(), Object.keys(options));
  if (!answer) throw new Error('jev returned an unexpected answer shape');
  return answer;
}

interface JevResponse {
  answers?: Record<string, { choice?: unknown; confidence?: unknown; probabilities?: Record<string, unknown> | null } | null>;
}

/** Reads the Choice answer out of a jev response body, or null if the body does not have the expected shape. */
export function parseChoiceAnswer(body: unknown, options: readonly string[]): IntentAnswer | null {
  const answer = (body as JevResponse | null)?.answers?.[QUESTION_ID];
  const choice = answer?.choice;
  const confidence = answer?.confidence;
  const probabilities = answer?.probabilities;
  if (typeof choice !== 'string' || !options.includes(choice)) return null;
  if (typeof confidence !== 'number' || typeof probabilities !== 'object' || probabilities === null) return null;
  const probs: Record<string, number> = {};
  for (const option of options) {
    const p = probabilities[option];
    probs[option] = typeof p === 'number' ? p : 0;
  }
  return { choice, confidence, probabilities: probs };
}

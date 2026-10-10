const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

export const formatDate = (iso: string, short = false): string => (short ? SHORT_DATE : DATE).format(new Date(iso));

/** Bands of the tracking gate (plan.md, done item 3): 85+ is the pose, below 60 is a different pose. */
export const scoreTone = (score: number): 'good' | 'warn' | 'bad' => (score >= 85 ? 'good' : score >= 60 ? 'warn' : 'bad');

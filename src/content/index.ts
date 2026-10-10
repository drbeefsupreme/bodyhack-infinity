import raw from './sources.generated.json';
import type { Source } from './types';
import { TERMS, GROUPS } from './terms';
import { COMPARISONS, QUIZ } from './comparisons';

const ALL = raw as Source[];
const cited = new Set(TERMS.flatMap((t) => t.sources));

/** Only the sources the app cites (all are verified entries from research/*.md). */
export const SOURCES: Source[] = ALL.filter((s) => cited.has(s.id));
export { TERMS, GROUPS, COMPARISONS, QUIZ };

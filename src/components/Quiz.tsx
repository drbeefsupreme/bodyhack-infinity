import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { QuizItem } from '../content/types';
import type { PresetId } from '../content/presets';
import { IconEye, IconFlame, IconQuestion, IconStar, IconTrophy } from './Icons';

export interface QuizRoundInfo { a: PresetId; b: PresetId; item: QuizItem; revealed: boolean; targetSide: 'A' | 'B' }

const BEST_KEY = 'bae-best-score';
const POINTS = 100, STREAK_BONUS = 25;

const RANKS = [
  { min: 0.9, name: 'Eagle eye', blurb: 'You read the vocabulary like a seasoned judge reads a lineup.' },
  { min: 0.7, name: 'Sharp eye', blurb: 'You spot most cues. Try the ones you missed from another angle.' },
  { min: 0.4, name: 'Keen eye', blurb: 'Good start. Use the "Look for" cues in Explore, then come back.' },
  { min: 0, name: 'Rookie spotter', blurb: 'Every expert started here. Explore a few terms and try again.' },
];

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function Quiz({ items, onRound }: { items: QuizItem[]; onRound: (r: QuizRoundInfo) => void }) {
  const [runSeed, setRunSeed] = useState(() => Math.floor(Math.random() * 1e6) + 1);
  const rounds = useMemo(
    () => shuffle(items, runSeed).map((item, i) => ({ item, targetSide: ((runSeed >> i) & 1 ? 'A' : 'B') as 'A' | 'B' })),
    [items, runSeed],
  );
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<'A' | 'B' | 'unsure' | null>(null);
  const [results, setResults] = useState<('hit' | 'miss' | 'unsure')[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gain, setGain] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) ?? 0));
  const round = rounds[idx];
  const revealed = answer !== null;

  useEffect(() => {
    if (!round) return;
    const a = round.targetSide === 'A' ? round.item.target : round.item.other;
    const b = round.targetSide === 'A' ? round.item.other : round.item.target;
    onRound({ a, b, item: round.item, revealed, targetSide: round.targetSide });
  }, [round, revealed, onRound]);

  useEffect(() => {
    if (round || score <= best) return;
    setBest(score);
    localStorage.setItem(BEST_KEY, String(score));
  }, [round, score, best]);

  const restart = () => { setRunSeed(runSeed * 7 + 3); setIdx(0); setAnswer(null); setResults([]); setScore(0); setStreak(0); };

  const pips = (
    <ol className="pips" aria-label={`Pair ${Math.min(idx + 1, rounds.length)} of ${rounds.length}`}>
      {rounds.map((_, i) => <li key={i} className={results[i] ?? (i === idx ? 'now' : '')} />)}
    </ol>
  );

  if (!round) {
    const hits = results.filter((r) => r === 'hit').length;
    const rank = RANKS.find((r) => hits / results.length >= r.min)!;
    return (
      <div className="quiz done">
        {pips}
        <div className="rank-badge" aria-hidden="true"><IconTrophy size={44} /></div>
        <h2 className="display big">{rank.name}</h2>
        <p className="rank-blurb">{rank.blurb}</p>
        <div className="scoreline">
          <span><strong>{score}</strong> points</span>
          <span><strong>{hits}/{results.length}</strong> matched</span>
          <span><IconStar size={14} /> best <strong>{best}</strong></span>
        </div>
        <p className="hint">This scores your eye for the vocabulary, not anyone's body. Several pairs have more than one fair description.</p>
        <button type="button" className="btn big" onClick={restart}>Play again</button>
      </div>
    );
  }

  const choose = (c: 'A' | 'B' | 'unsure') => {
    if (revealed) return;
    setAnswer(c);
    const hit = c === round.targetSide;
    const g = hit ? POINTS + STREAK_BONUS * streak : 0;
    setGain(g);
    setScore((s) => s + g);
    setStreak((s) => (hit ? s + 1 : 0));
    setResults((r) => [...r, hit ? 'hit' : c === 'unsure' ? 'unsure' : 'miss']);
  };
  const hit = answer === round.targetSide;

  return (
    <div className="quiz">
      <div className="quiz-top">
        <span className="score" aria-label={`Score ${score}`}><IconStar size={15} /> {score}</span>
        <span className={`streak ${streak >= 2 ? 'hot' : ''}`} aria-label={`Streak ${streak}`}><IconFlame size={15} /> {streak}</span>
        <span className="best">best {best}</span>
      </div>
      {pips}
      <h2 className="quiz-q display">{round.item.question}</h2>
      <p className="hint"><IconEye size={13} /> Orbit, zoom and switch views first. Both sides share one camera.</p>
      <div className="choices" role="group" aria-label="Your answer">
        {(['A', 'B'] as const).map((c) => (
          <button key={c} type="button" className={`choice choice-${c.toLowerCase()}`} disabled={revealed}
            data-state={revealed ? (c === round.targetSide ? 'right' : c === answer ? 'wrong' : '') : ''}
            onClick={() => choose(c)}>{c}</button>
        ))}
        <button type="button" className="choice choice-unsure" disabled={revealed} onClick={() => choose('unsure')}>
          <IconQuestion size={18} /> Can't tell
        </button>
      </div>
      {revealed && (
        <div className={`reveal ${hit ? 'hit' : 'miss'}`} aria-live="polite">
          {hit && (
            <div className="burst" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <span key={i} style={{ '--i': i } as CSSProperties} />)}</div>
          )}
          <p className="reveal-head">
            {hit ? <>Nice spot! <span className="gain">+{gain}</span>{streak >= 2 && <span className="gain hot"> {streak}× streak</span>}</>
              : answer === 'unsure' ? 'Honest call. Here is the intended reading.' : 'Not this time.'}
          </p>
          <p>Side <strong>{round.targetSide}</strong> is the intended answer. The glowing areas show where to look.</p>
          <p>{round.item.explain}</p>
          {round.item.ambiguity && <p className="callout warn"><strong>Why it can be ambiguous:</strong> {round.item.ambiguity}</p>}
          <button type="button" className="btn big" onClick={() => { setIdx(idx + 1); setAnswer(null); }}>
            {idx + 1 < rounds.length ? 'Next pair' : 'See your rank'}
          </button>
        </div>
      )}
    </div>
  );
}

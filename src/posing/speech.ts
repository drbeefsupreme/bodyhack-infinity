/** The voice fields the wrapper reads; a browser `SpeechSynthesisVoice` fits. */
export type Voice = Pick<SpeechSynthesisVoice, 'voiceURI' | 'name' | 'lang' | 'default'>;

/** One sentence handed to an engine. The engine calls `done` once when it ends, fails or is cancelled. */
export interface Line {
  readonly text: string;
  readonly voice: Voice | undefined;
  readonly done: () => void;
}

/** What `Speech` needs from a speech engine: the Web Speech API in the browser (`webSpeech`), a fake in tests. */
export interface SpeechEngine {
  speak(line: Line): void;
  cancel(): void;
  voices(): readonly Voice[];
  onVoicesChanged(listener: () => void): void;
}

export type SpeechStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** `spoken`: handed to the engine now. `queued`: waits for the sentence in flight. */
export type SayResult = 'spoken' | 'queued' | 'muted' | 'unavailable';

const VOICE_KEY = 'posing-voice';
const MUTED_KEY = 'posing-muted';

/** The browser's Web Speech API as an engine, or undefined where the browser has none. */
export function webSpeech(): SpeechEngine | undefined {
  if (typeof speechSynthesis === 'undefined') return undefined;
  const synth = speechSynthesis;
  // Chrome never fires `end` for an utterance that was garbage collected while speaking, so hold on to it.
  let inFlight: SpeechSynthesisUtterance | undefined;
  return {
    speak({ text, voice, done }) {
      const utterance = new SpeechSynthesisUtterance(text);
      const chosen = voice && synth.getVoices().find((v) => v.voiceURI === voice.voiceURI);
      if (chosen) utterance.voice = chosen;
      utterance.lang = chosen ? chosen.lang : 'en-US';
      const finish = () => {
        if (inFlight === utterance) inFlight = undefined;
        done();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      inFlight = utterance;
      synth.speak(utterance);
    },
    cancel: () => synth.cancel(),
    voices: () => synth.getVoices(),
    onVoicesChanged: (listener) => synth.addEventListener('voiceschanged', listener),
  };
}

/**
 * Speaks one sentence at a time, matching the cue scheduler: a sentence said while another is in flight waits, and
 * only the newest waiting sentence is kept, so a late correction never piles up behind stale ones. An interrupting
 * sentence (the hold started, the pose was hit) cuts off the one in flight. Mute and the chosen voice persist in
 * the store. Without an engine every call is a safe no-op.
 */
export class Speech {
  private readonly engine: SpeechEngine | undefined;
  private readonly store: SpeechStore | undefined;
  private readonly listeners = new Set<() => void>();
  private current: Line | undefined;
  private pending: string | undefined;
  private isMuted: boolean;
  private voiceURI: string | undefined;

  constructor(
    engine: SpeechEngine | undefined = webSpeech(),
    store: SpeechStore | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  ) {
    this.engine = engine;
    this.store = store;
    this.isMuted = store?.getItem(MUTED_KEY) === 'true';
    this.voiceURI = store?.getItem(VOICE_KEY) ?? undefined;
    engine?.onVoicesChanged(() => this.notify());
  }

  get available(): boolean {
    return this.engine !== undefined;
  }

  /** True while a sentence is being spoken. */
  get speaking(): boolean {
    return this.current !== undefined;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  /** URI of the chosen voice; undefined lets the browser pick an English voice. */
  get voice(): string | undefined {
    return this.voiceURI;
  }

  voices(): readonly Voice[] {
    return this.engine?.voices() ?? [];
  }

  /** Calls `listener` when `speaking`, `muted`, `voice` or the voice list changes. Returns the unsubscribe call. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  say(text: string, interrupt: boolean): SayResult {
    if (this.engine === undefined) return 'unavailable';
    if (this.isMuted) return 'muted';
    if (interrupt) {
      this.cancel();
    } else if (this.current !== undefined) {
      this.pending = text;
      return 'queued';
    }
    this.start(this.engine, text);
    return 'spoken';
  }

  /** Stops the sentence in flight and forgets the waiting one. */
  cancel(): void {
    this.pending = undefined;
    if (this.current === undefined) return;
    this.current = undefined;
    this.engine?.cancel();
    this.notify();
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.store?.setItem(MUTED_KEY, String(muted));
    if (muted) this.cancel();
    this.notify();
  }

  setVoice(voiceURI: string | undefined): void {
    this.voiceURI = voiceURI;
    if (voiceURI === undefined) this.store?.removeItem(VOICE_KEY);
    else this.store?.setItem(VOICE_KEY, voiceURI);
    this.notify();
  }

  private start(engine: SpeechEngine, text: string): void {
    const line: Line = {
      text,
      voice: this.voices().find((v) => v.voiceURI === this.voiceURI),
      done: () => {
        if (this.current !== line) return;
        this.current = undefined;
        const next = this.pending;
        this.pending = undefined;
        if (next === undefined) this.notify();
        else this.start(engine, next);
      },
    };
    this.current = line;
    engine.speak(line);
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

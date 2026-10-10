// Chrome speech recognition for voice commands: continuous, final phrases only. It is paused while the tutor speaks,
// so the microphone does not hear the tutor's own voice. Chrome ends a recognition session after some silence; the
// listener starts a new one while it is wanted.

/** The part of Chrome's `SpeechRecognition` the listener uses. TypeScript's DOM library does not declare it. */
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

type RecognitionConstructor = new () => Recognition;

export type ListenState = 'off' | 'listening' | 'paused' | 'unsupported' | 'denied' | 'error';

/** Quiet time after the tutor stops speaking before the microphone opens again (room echo). */
const AFTER_SPEECH_MS = 400;
const RETRY_MS = 3000;

function recognitionConstructor(): RecognitionConstructor | undefined {
  const ctor: unknown = Reflect.get(window, 'SpeechRecognition') ?? Reflect.get(window, 'webkitSpeechRecognition');
  // A constructor function from the browser; its shape is Chrome's SpeechRecognition.
  return typeof ctor === 'function' ? (ctor as RecognitionConstructor) : undefined;
}

export class VoiceListener {
  private readonly ctor = recognitionConstructor();
  private recognition: Recognition | undefined;
  private enabled = false;
  private suppressed = false;
  private blocked = false;
  private timer: number | undefined;
  private current: ListenState = 'off';

  constructor(
    private readonly onPhrase: (text: string) => void,
    private readonly onState: (state: ListenState) => void,
  ) {}

  get state(): ListenState {
    return this.current;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.update(0);
  }

  /** True while the tutor speaks. */
  setSuppressed(suppressed: boolean): void {
    if (suppressed === this.suppressed) return;
    this.suppressed = suppressed;
    this.update(suppressed ? 0 : AFTER_SPEECH_MS);
  }

  dispose(): void {
    this.enabled = false;
    this.update(0);
  }

  private wanted(): boolean {
    return this.enabled && !this.suppressed && !this.blocked;
  }

  private set(state: ListenState): void {
    if (state === this.current) return;
    this.current = state;
    this.onState(state);
  }

  private update(delayMs: number): void {
    window.clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.ctor) {
      this.set(this.enabled ? 'unsupported' : 'off');
      return;
    }
    if (!this.wanted()) {
      this.recognition?.abort();
      this.recognition = undefined;
      if (!this.blocked) this.set(this.enabled ? 'paused' : 'off');
      return;
    }
    if (this.recognition) return;
    this.timer = window.setTimeout(() => this.open(), delayMs);
  }

  private open(): void {
    if (!this.ctor || !this.wanted() || this.recognition) return;
    const rec = new this.ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript.trim();
        if (result.isFinal && text) this.onPhrase(text);
      }
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.blocked = true;
        this.set('denied');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.set('error');
      }
    };
    rec.onend = () => {
      if (this.recognition !== rec) return;
      this.recognition = undefined;
      if (this.wanted()) this.update(this.current === 'error' ? RETRY_MS : 0);
    };
    this.recognition = rec;
    try {
      rec.start();
      this.set('listening');
    } catch {
      this.recognition = undefined;
      this.set('error');
    }
  }
}

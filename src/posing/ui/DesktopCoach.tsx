// The coach server as the tutor sees it: the local server on web, the paired desktop bridge on Android. On Android,
// Settings pairs and unpairs here, and a `bodyhack://pair` link (the QR code of `npm run bridge`) opens PairDialog.

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { BridgeStatus, DesktopBridge, PairLink, Platform } from '../platform/types';
import type { Health } from './api';

export type CoachLink =
  | { readonly kind: 'checking' }
  | { readonly kind: 'server'; readonly health: Health | undefined }
  | { readonly kind: 'bridge'; readonly status: BridgeStatus };

export interface CoachLinkState {
  readonly link: CoachLink;
  check(): void;
  /** Shows the bridge status after a pairing change. */
  showStatus(status: BridgeStatus): void;
}

/** Checks the coach server at start and on demand. A newer result always wins over an older check. */
export function useCoachLink({ coach, bridge }: Platform): CoachLinkState {
  const [link, setLink] = useState<CoachLink>({ kind: 'checking' });
  const latest = useRef(0);

  const check = useCallback(() => {
    const n = ++latest.current;
    setLink({ kind: 'checking' });
    const checked: Promise<CoachLink> = bridge
      ? bridge.status().then((status) => ({ kind: 'bridge', status }))
      : coach.health().then(
          (health) => ({ kind: 'server', health }),
          (err: unknown) => {
            console.warn('The coach server did not answer the health check.', err);
            return { kind: 'server', health: undefined };
          },
        );
    void checked.then((next) => n === latest.current && setLink(next));
  }, [coach, bridge]);

  useEffect(check, [check]);

  const showStatus = useCallback((status: BridgeStatus) => {
    latest.current++;
    setLink({ kind: 'bridge', status });
  }, []);

  return { link, check, showStatus };
}

function BridgeState({ link }: { link: CoachLink }) {
  if (link.kind !== 'bridge') return <p className="tutor-bridge-state" data-state="checking">Checking the desktop…</p>;
  const { status } = link;
  switch (status.state) {
    case 'unpaired':
      return (
        <p className="tutor-bridge-state" data-state="unpaired">
          <b>Not paired.</b> The coach debrief is off, and voice commands use keywords on the phone.
        </p>
      );
    case 'offline':
      return (
        <p className="tutor-bridge-state" data-state="offline">
          <b>Paired, but unreachable:</b> {status.url} did not answer ({status.error}). Check that the computer is on,
          on Tailscale, and runs the server. Until then the coach debrief is off and voice commands use keywords.
        </p>
      );
    case 'online':
      return (
        <div className="tutor-bridge-state" data-state="online">
          <p>
            <b>Paired</b> with {status.url}. Coach model: {status.health.coachModel ?? 'the server default'}.
          </p>
          {!status.health.omp && <p className="tutor-field-error">omp is not on the desktop server's PATH: the coach debrief is off.</p>}
          {!status.health.jev && <p className="hint">Jev is not configured on the desktop: voice commands use keywords only.</p>}
        </div>
      );
  }
}

/** The "Desktop coach" part of Settings on Android: the bridge status, pairing by URL and token, and unpairing. */
export function DesktopCoachSettings({ bridge, coach }: { bridge: DesktopBridge; coach: CoachLinkState }) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const { link } = coach;

  const pair = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      coach.showStatus(await bridge.pair(url, token));
      setUrl('');
      setToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tutor-bridge" aria-labelledby="tutor-bridge-title">
      <h4 id="tutor-bridge-title">Desktop coach</h4>
      <BridgeState link={link} />
      {link.kind === 'bridge' && link.status.state === 'unpaired' && (
        <form className="tutor-bridge-form" onSubmit={(e) => void pair(e)}>
          <p className="hint">
            On your computer, run <code>npm run bridge</code>. Scan its QR code with the phone camera, or type the server
            URL and the token here.
          </p>
          <label className="tutor-field">
            <span>Server URL</span>
            <input type="url" inputMode="url" value={url} placeholder="http://100.101.102.103:5173" spellCheck={false} autoCapitalize="off" onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="tutor-field">
            <span>Token</span>
            <input type="text" value={token} spellCheck={false} autoCapitalize="off" autoComplete="off" onChange={(e) => setToken(e.target.value)} />
          </label>
          {error && (
            <p className="tutor-field-error" role="alert">
              Cannot pair: {error}.
            </p>
          )}
          <button type="submit" className="btn" disabled={busy || url.trim() === '' || token.trim() === ''}>
            {busy ? 'Pairing…' : 'Pair'}
          </button>
        </form>
      )}
      {link.kind === 'bridge' && link.status.state !== 'unpaired' && (
        <div className="tutor-bridge-actions">
          <button type="button" className="pill" onClick={coach.check}>
            Check again
          </button>
          <button
            type="button"
            className="pill progress-danger-pill"
            onClick={() => {
              bridge.unpair();
              coach.showStatus({ state: 'unpaired' });
            }}
          >
            Unpair
          </button>
        </div>
      )}
    </section>
  );
}

type PairStep = { readonly kind: 'ask' } | { readonly kind: 'pairing' } | { readonly kind: 'paired'; readonly status: BridgeStatus } | { readonly kind: 'failed'; readonly error: string };

/** Asks before it pairs with the computer of a `bodyhack://pair` link, since any app can open such a link. */
export function PairDialog({ link, bridge, coach, onClose }: { link: PairLink; bridge: DesktopBridge; coach: CoachLinkState; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<PairStep>(link.ok ? { kind: 'ask' } : { kind: 'failed', error: link.error });

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const pair = async (url: string, token: string) => {
    setStep({ kind: 'pairing' });
    try {
      const status = await bridge.pair(url, token);
      coach.showStatus(status);
      setStep({ kind: 'paired', status });
    } catch (err) {
      setStep({ kind: 'failed', error: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <dialog ref={ref} className="tutor-dialog" onClose={onClose} aria-labelledby="tutor-pair-title" data-testid="pair-dialog" data-step={step.kind}>
      <h3 id="tutor-pair-title" className="display small">
        {step.kind === 'failed' ? 'Cannot pair' : 'Pair with the desktop coach'}
      </h3>
      {step.kind === 'failed' && <p>This pairing link cannot be used: {step.error}.</p>}
      {link.ok && (step.kind === 'ask' || step.kind === 'pairing') && (
        <>
          <p>
            Pair with <b>{link.url}</b>? Only pair with your own computer: with the coach debrief on, each hit photo and its
            scores go to it over Tailscale.
          </p>
          <div className="tutor-dialog-actions">
            <button type="button" className="pill" onClick={onClose} disabled={step.kind === 'pairing'}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={() => void pair(link.url, link.token)} disabled={step.kind === 'pairing'} autoFocus>
              {step.kind === 'pairing' ? 'Pairing…' : 'Pair'}
            </button>
          </div>
        </>
      )}
      {step.kind === 'paired' && <BridgeState link={{ kind: 'bridge', status: step.status }} />}
      {(step.kind === 'failed' || step.kind === 'paired') && (
        <div className="tutor-dialog-actions">
          <button type="button" className="btn" onClick={onClose} autoFocus>
            Done
          </button>
        </div>
      )}
    </dialog>
  );
}

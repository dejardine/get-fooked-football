'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlappyGame } from './_flappy';

/** Classic Konami code: ↑ ↑ ↓ ↓ ← → ← → B A */
const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

/** Public name of the event sibling components dispatch to force the modal
 *  open. Used by _konami-trigger.tsx and the URL-param shortcut below. */
export const KONAMI_OPEN_EVENT = 'konami:open';

/**
 * Global keydown listener for the Konami code. When the sequence matches,
 * opens a portaled fullscreen modal with the Flappy Bird easter egg.
 *
 * Listener bails out when the user is typing into a form input so the chat
 * composer doesn't fight the cheat detection. Also responds to:
 *  - The custom `konami:open` event (dispatched by the triple-click trigger
 *    on the header ⚽ '26 badge — a no-arrow-keys alternative).
 *  - The URL search param `?konami=1` (deep link / mobile fallback).
 *  - The global function `window.__openFlappy()` for devtools poking.
 */
export function Konami() {
  const buffer = useRef<string[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[konami] listener attached. press ↑↑↓↓←→←→BA, or window.__openFlappy()');
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inField =
        !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (inField) {
        // eslint-disable-next-line no-console
        console.log('[konami] key skipped — focus is in', t!.tagName, e.key);
        return;
      }
      const raw = e.key;
      const key = raw.length === 1 ? raw.toLowerCase() : raw;
      buffer.current.push(key);
      if (buffer.current.length > SEQUENCE.length) {
        buffer.current = buffer.current.slice(-SEQUENCE.length);
      }
      const expectedNext = SEQUENCE[Math.min(buffer.current.length - 1, SEQUENCE.length - 1)];
      // eslint-disable-next-line no-console
      console.log(
        `[konami] key=${JSON.stringify(raw)} -> ${JSON.stringify(key)} | buffer=[${buffer.current
          .map((k) => JSON.stringify(k))
          .join(', ')}] | expected next=${JSON.stringify(expectedNext)}`,
      );
      if (buffer.current.length === SEQUENCE.length) {
        let match = true;
        for (let i = 0; i < SEQUENCE.length; i++) {
          if (buffer.current[i] !== SEQUENCE[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          // eslint-disable-next-line no-console
          console.log('[konami] sequence matched — opening flappy');
          buffer.current = [];
          setOpen(true);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Custom-event trigger (used by the header badge triple-click).
  useEffect(() => {
    const onOpen = () => {
      // eslint-disable-next-line no-console
      console.log('[konami] open event received');
      setOpen(true);
    };
    window.addEventListener(KONAMI_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(KONAMI_OPEN_EVENT, onOpen);
  }, []);

  // URL-param trigger + devtools backdoor on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('konami') === '1') setOpen(true);
    } catch {
      /* ignore */
    }
    (window as unknown as { __openFlappy?: () => void }).__openFlappy = () => setOpen(true);
    return () => {
      try {
        delete (window as unknown as { __openFlappy?: () => void }).__openFlappy;
      } catch {
        /* ignore */
      }
    };
  }, []);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Flappy Bird easter egg"
      className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: 'rgba(0,0,0,0.9)', zIndex: 2147483647 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold uppercase text-cga-cyan">
            <span className="ansi-magenta">▓▒░</span> FLAPPY <span className="ansi-magenta">░▒▓</span>
          </h2>
          <button
            type="button"
            onClick={close}
            className="border-[2px] border-cga-white text-cga-white px-2 py-1 text-xs font-bold uppercase hover:bg-cga-magenta hover:text-cga-black"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <FlappyGame onClose={close} />
      </div>
    </div>,
    document.body,
  );
}

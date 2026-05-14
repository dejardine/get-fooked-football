'use client';

import { useRef } from 'react';
import { KONAMI_OPEN_EVENT } from './_konami';

/**
 * Hidden alt trigger for the Flappy easter egg. Triple-click the
 * "⚽ '26" badge in the header to open the game — keyboard-free, so
 * mobile / no-arrow-key users have a way in.
 *
 * Detection uses `MouseEvent.detail` (the browser's own click count) so we
 * don't pick up accidental double-clicks; only ≥ 3 in the system multi-
 * click window fires.
 */
export function KonamiTrigger() {
  const lastFireRef = useRef(0);

  return (
    <span
      role="button"
      tabIndex={-1}
      title="⚽ '26"
      onClick={(e) => {
        if (e.detail >= 3) {
          // Debounce so a quintuple-click doesn't fire twice in a row.
          const now = Date.now();
          if (now - lastFireRef.current < 1000) return;
          lastFireRef.current = now;
          e.preventDefault();
          window.dispatchEvent(new CustomEvent(KONAMI_OPEN_EVENT));
        }
      }}
      className="text-xs font-bold opacity-100 select-none cursor-default"
    >
      ⚽ &apos;26
    </span>
  );
}

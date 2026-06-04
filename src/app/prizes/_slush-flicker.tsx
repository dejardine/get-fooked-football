'use client';

import { useEffect, useState } from 'react';

/**
 * The slush fund total only settles once every prize is awarded — until then it
 * depends entirely on who wins what (rich cunts leak nothing, cheap cunts leak
 * a lot). So we flicker the number around its possible range like a slot machine
 * to make the uncertainty obvious. If the range has collapsed (everything's
 * awarded) we just show the settled figure.
 */
export function SlushFlicker({ min, max }: { min: number; max: number }) {
  const [val, setVal] = useState(min);

  useEffect(() => {
    if (max <= min) {
      setVal(min);
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      // Park it in the middle of the range rather than strobing.
      setVal(Math.round((min + max) / 2));
      return;
    }
    const id = setInterval(() => {
      setVal(min + Math.floor(Math.random() * (max - min + 1)));
    }, 90);
    return () => clearInterval(id);
  }, [min, max]);

  return <span className="tabular-nums">${val}</span>;
}

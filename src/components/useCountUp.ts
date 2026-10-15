import { useEffect, useRef, useState } from 'react';

/** Animates a number towards `target` with an ease-out, for odometer-style counters. */
export function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const current = useRef(target);

  useEffect(() => {
    from.current = current.current;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from.current + (target - from.current) * eased;
      current.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

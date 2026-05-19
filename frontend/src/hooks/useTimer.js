import { useEffect, useRef, useState } from 'react';

/**
 * Stopwatch hook. Returns { elapsed, start, stop, reset }
 * elapsed: milliseconds since start
 */
export function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  const tick = () => {
    setElapsed(Date.now() - startRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (running) return;
    startRef.current = Date.now() - elapsed;
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
  };

  const reset = () => {
    stop();
    setElapsed(0);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { elapsed, running, start, stop, reset };
}

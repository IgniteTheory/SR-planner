import { useEffect, useRef } from 'react';
import type { PlannerTask } from '../api/types';

const CHECK_IN_MINUTES = 30;

// Polls running timers and fires once per 30-minute boundary crossed while a
// timer keeps running, so a task left ticking in the background gets a
// "still working on this?" nudge instead of silently racking up hours.
// Per-task prompted thresholds reset whenever that task's timer restarts
// (a fresh timerStartedAt), so stopping and starting again gets its own
// full run of check-ins.
export function useTimerCheckIn(tasks: PlannerTask[], onCheckIn: (task: PlannerTask) => void) {
  const promptedRef = useRef<Map<number, Set<number>>>(new Map());
  const startedAtRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    function check() {
      const now = Date.now();
      for (const t of tasks) {
        if (!t.timerStartedAt) {
          promptedRef.current.delete(t.id);
          startedAtRef.current.delete(t.id);
          continue;
        }
        if (startedAtRef.current.get(t.id) !== t.timerStartedAt) {
          startedAtRef.current.set(t.id, t.timerStartedAt);
          promptedRef.current.set(t.id, new Set());
        }
        const elapsedMinutes = (now - new Date(t.timerStartedAt).getTime()) / 60000;
        const threshold = Math.floor(elapsedMinutes / CHECK_IN_MINUTES) * CHECK_IN_MINUTES;
        if (threshold < CHECK_IN_MINUTES) continue;
        const prompted = promptedRef.current.get(t.id) ?? new Set<number>();
        if (prompted.has(threshold)) continue;
        prompted.add(threshold);
        promptedRef.current.set(t.id, prompted);
        onCheckIn(t);
      }
    }

    const handle = setInterval(check, 15000);
    check();
    return () => clearInterval(handle);
  }, [tasks, onCheckIn]);
}

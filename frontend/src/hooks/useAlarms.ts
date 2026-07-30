import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlannerTask } from '../api/types';
import { CALL_BLOCK_TIMES, isoDate } from '../utils/time';

// Alarms are a per-device browser feature (Notification permission is
// per-browser anyway), so the on/off preference lives in localStorage here
// rather than the shared backend — each device decides for itself.
const STORAGE_KEY = 'srPlannerAlarmsEnabled';
const ALARM_LEAD_MINUTES = 10;

function readEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

function setGlobalEnabled(v: boolean) {
  localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false');
  listeners.forEach((l) => l(v));
}

export function useAlarmToggle() {
  const [enabled, setEnabled] = useState(readEnabled);

  useEffect(() => {
    listeners.add(setEnabled);
    return () => { listeners.delete(setEnabled); };
  }, []);

  const toggle = useCallback(() => {
    if (enabled) {
      setGlobalEnabled(false);
      return;
    }
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications.');
      return;
    }
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then((perm) => {
        if (perm !== 'granted') {
          alert('Notifications were blocked. Allow them for this site to use alarms.');
          return;
        }
        setGlobalEnabled(true);
      });
      return;
    }
    setGlobalEnabled(true);
  }, [enabled]);

  return { enabled, toggle };
}

function beep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    /* audio isn't essential */
  }
}

function addHalfHour(time: string): string {
  const [hh, mm] = time.split(':').map(Number);
  const total = hh * 60 + mm + 30;
  const h2 = Math.floor(total / 60) % 24;
  const m2 = total % 60;
  return String(h2).padStart(2, '0') + ':' + String(m2).padStart(2, '0');
}

export function useAlarms(tasks: PlannerTask[]) {
  const alertedRef = useRef<Set<number>>(new Set());
  const callBlockAlertedRef = useRef<Set<string>>(new Set());
  const [, forceRerun] = useState(0);

  useEffect(() => {
    const listener: Listener = () => forceRerun((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    function check() {
      if (!readEnabled()) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      const todayIso = isoDate(now);
      const leadMs = ALARM_LEAD_MINUTES * 60000;

      for (const t of tasks) {
        if (t.assignedTo !== 'STEPHAN' || t.completed || !t.scheduledDate || !t.startTime) continue;
        if (t.scheduledDate.slice(0, 10) !== todayIso) continue;
        if (alertedRef.current.has(t.id)) continue;
        const [hh, mm] = t.startTime.split(':').map(Number);
        const start = new Date(now);
        start.setHours(hh, mm, 0, 0);
        const diff = start.getTime() - now.getTime();
        if (diff <= leadMs && diff > -60000) {
          alertedRef.current.add(t.id);
          const label = (t.kind === 'MEETING' ? 'Meeting' : 'Task') + ' at ' + t.startTime;
          try {
            new Notification('SR Planner — ' + label, {
              body: t.title + (t.client ? ' — ' + t.client : '') + (t.location ? ' @ ' + t.location : ''),
            });
          } catch {
            /* ignore */
          }
          beep();
        }
      }

      // Standing call-back blocks aren't real tasks, so they're checked
      // separately — fired right at the start of the block (no lead time;
      // "return calls" is an now-do-this reminder, not something to prep for).
      // Weekday-only, matching the grid (which never shows them on Sat/Sun).
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      for (const time of isWeekday ? CALL_BLOCK_TIMES : []) {
        const key = todayIso + '-' + time;
        if (callBlockAlertedRef.current.has(key)) continue;
        const [hh, mm] = time.split(':').map(Number);
        const start = new Date(now);
        start.setHours(hh, mm, 0, 0);
        const diff = start.getTime() - now.getTime();
        if (diff <= 0 && diff > -60000) {
          callBlockAlertedRef.current.add(key);
          try {
            new Notification('SR Planner — Return calls', {
              body: 'Standing reminder: ' + time + '–' + addHalfHour(time) + ' is set aside to return calls.',
            });
          } catch {
            /* ignore */
          }
          beep();
        }
      }
    }

    check();
    const handle = setInterval(check, 30000);
    return () => clearInterval(handle);
  }, [tasks]);
}

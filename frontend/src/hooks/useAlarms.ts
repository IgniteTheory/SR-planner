import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlannerTask } from '../api/types';
import { isoDate } from '../utils/time';

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

export function useAlarms(tasks: PlannerTask[]) {
  const alertedRef = useRef<Set<number>>(new Set());
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
    }

    check();
    const handle = setInterval(check, 30000);
    return () => clearInterval(handle);
  }, [tasks]);
}

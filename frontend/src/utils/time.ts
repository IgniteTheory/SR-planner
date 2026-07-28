import type { PlannerTask } from '../api/types';

// Used for both meetings and tasks — any scheduled item can now book out
// more than one 30-min slot so long-running work blocks the grid properly.
export const DURATION_OPTIONS = [
  { label: '30 min', slots: 1 },
  { label: '1 hour', slots: 2 },
  { label: '1.5 hours', slots: 3 },
  { label: '2 hours', slots: 4 },
  { label: '3 hours', slots: 6 },
  { label: '4 hours', slots: 8 },
];

function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  const startMin = 6 * 60 + 30;
  const endMin = 19 * 60;
  for (let m = startMin; m < endMin; m += 30) {
    slots.push(pad2(Math.floor(m / 60)) + ':' + pad2(m % 60));
  }
  return slots;
})();

export function isoDate(d: Date): string {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

export function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const datePart = iso.slice(0, 10);
  const parts = datePart.split('-');
  if (parts.length !== 3) return iso;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

export function fmtDayHeader(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + d.getDate() + ' ' + d.toLocaleDateString(undefined, { month: 'short' });
}

export function fmtWeekRange(start: Date): string {
  const end = addDays(start, 4);
  return start.getDate() + ' ' + start.toLocaleDateString(undefined, { month: 'short' }) +
    ' - ' + end.getDate() + ' ' + end.toLocaleDateString(undefined, { month: 'short' }) + ' ' + end.getFullYear();
}

export function durationLabel(slots: number): string {
  const match = DURATION_OPTIONS.find((d) => d.slots === slots);
  return match ? match.label : slots * 30 + ' min';
}

export function occupiedSlotsFor(item: Pick<PlannerTask, 'startTime' | 'durationSlots'>): string[] {
  if (!item.startTime) return [];
  const startIdx = TIME_SLOTS.indexOf(item.startTime);
  if (startIdx === -1) return [item.startTime];
  return TIME_SLOTS.slice(startIdx, startIdx + (item.durationSlots || 1));
}

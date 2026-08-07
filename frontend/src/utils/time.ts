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

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// Every weekday gets two standing slots reserved to return calls — always
// treated as booked when scheduling, and shown on the grid as a reminder.
export const CALL_BLOCK_TIMES = ['09:30', '13:30'];

// Slots already taken on a given date for Stephan's board, seeded with the
// standing call-back blocks — used to grey out Start Time options so a
// double-booking can't be picked in the first place. excludeId lets an
// item being rescheduled ignore its own current slot.
export function getBookedSlots(
  tasks: PlannerTask[],
  dateIso: string,
  excludeId?: number
): Set<string> {
  const booked = new Set<string>(CALL_BLOCK_TIMES);
  for (const t of tasks) {
    if (t.assignedTo !== 'STEPHAN' || t.completed || t.id === excludeId) continue;
    if (t.scheduledDate?.slice(0, 10) !== dateIso || !t.startTime) continue;
    for (const slot of occupiedSlotsFor(t)) booked.add(slot);
  }
  return booked;
}

export function isStartTimeBlocked(booked: Set<string>, startTime: string, durationSlots: number): boolean {
  const startIdx = TIME_SLOTS.indexOf(startTime);
  if (startIdx === -1) return false;
  for (let i = startIdx; i < startIdx + durationSlots; i++) {
    if (booked.has(TIME_SLOTS[i])) return true;
  }
  return false;
}

// Stopgap for spotting freshly-added Parking Lot items among older, stale
// ones that can't be cleaned out yet — a different pastel hue each day,
// applied only to items created that day, so "just added" is obvious
// without having to read every card.
const PASTEL_RAINBOW = ['#ffd1d1', '#ffe0b8', '#fff3b0', '#d3f5c6', '#c6f0e8', '#c9dcff', '#ddd1ff'];

export function todaysPastelColour(): string {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayIndex = Math.floor(localMidnight / 86400000);
  return PASTEL_RAINBOW[((dayIndex % PASTEL_RAINBOW.length) + PASTEL_RAINBOW.length) % PASTEL_RAINBOW.length];
}

export function isAddedToday(createdAt: string): boolean {
  return createdAt.slice(0, 10) === isoDate(new Date());
}

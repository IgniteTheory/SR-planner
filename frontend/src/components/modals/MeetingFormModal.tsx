import { useMemo, useState } from 'react';
import type { PlannerTask } from '../../api/types';
import { DURATION_OPTIONS, TIME_SLOTS, getBookedSlots, isStartTimeBlocked } from '../../utils/time';

const MEETING_COLOUR = '#8b5cf6';

interface MeetingInitial {
  title?: string;
  client?: string;
  scheduledDate?: string | null;
  startTime?: string | null;
  durationSlots?: number | null;
  location?: string | null;
  agenda?: string | null;
}

interface Props {
  title: string;
  initial?: MeetingInitial;
  tasks: PlannerTask[];
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  checkConflict: (scheduledDate: string, startTime: string, durationSlots: number, excludeId?: number) => Promise<PlannerTask | null>;
  excludeId?: number;
}

export default function MeetingFormModal({ title, initial, tasks, onClose, onSubmit, checkConflict, excludeId }: Props) {
  const isEdit = excludeId != null;
  const [meetingTitle, setMeetingTitle] = useState(initial?.title ?? '');
  const [client, setClient] = useState(initial?.client ?? '');
  const [date, setDate] = useState(initial?.scheduledDate?.slice(0, 10) ?? '');
  const [time, setTime] = useState(initial?.startTime ?? TIME_SLOTS[0]);
  const [durationSlots, setDurationSlots] = useState(initial?.durationSlots ?? 2);
  const bookedSlots = useMemo(
    () => (date ? getBookedSlots(tasks, date, excludeId) : new Set<string>()),
    [tasks, date, excludeId]
  );
  const [location, setLocation] = useState(initial?.location ?? '');
  const [agenda, setAgenda] = useState(initial?.agenda ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!meetingTitle.trim() || !date) {
      setError('Title and date are required.');
      return;
    }
    setSubmitting(true);
    try {
      const conflict = await checkConflict(date, time, durationSlots, excludeId);
      if (conflict && !window.confirm(`This overlaps with "${conflict.title}". Schedule anyway?`)) {
        setSubmitting(false);
        return;
      }
      await onSubmit({
        title: meetingTitle.trim(),
        client: client.trim(),
        colour: MEETING_COLOUR,
        scheduledDate: date,
        startTime: time,
        durationSlots,
        location: location.trim(),
        agenda: agenda.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <label>Title<input value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} placeholder="e.g. Client review" /></label>
        <label>With / Client<input value={client} onChange={(e) => setClient(e.target.value)} /></label>
        <div className="row2">
          <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Start Time
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              {TIME_SLOTS.map((t) => {
                const blocked = isStartTimeBlocked(bookedSlots, t, durationSlots);
                return <option key={t} value={t} disabled={blocked}>{t}{blocked ? ' (booked)' : ''}</option>;
              })}
            </select>
          </label>
        </div>
        <label>Duration
          <select value={durationSlots} onChange={(e) => setDurationSlots(Number(e.target.value))}>
            {DURATION_OPTIONS.map((d) => <option key={d.slots} value={d.slots}>{d.label}</option>)}
          </select>
        </label>
        <label>Location<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Boardroom, Teams, client office" /></label>
        <label>Agenda<textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="What needs to be covered..." /></label>
        {!isEdit && (
          <p className="prompt-text">A companion to-do to schedule this on Outlook and set alarms will be added to Chanel&apos;s To Do automatically.</p>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save' : 'Schedule Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}

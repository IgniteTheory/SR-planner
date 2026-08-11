import { useMemo, useState } from 'react';
import type { AssignedTo, PlannerTask, Priority } from '../../api/types';
import { DURATION_OPTIONS, TIME_SLOTS, getBookedSlots, isStartTimeBlocked } from '../../utils/time';

const SWATCHES = ['#1f7a4d', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b', '#0ea5e9'];

interface InitialValues {
  client?: string;
  title?: string;
  budgetHours?: string | number;
  dueDate?: string | null;
  priority?: Priority;
  assignedTo?: AssignedTo;
  colour?: string;
  scheduledDate?: string | null;
  startTime?: string | null;
}

interface Props {
  title: string;
  initial?: InitialValues | PlannerTask;
  tasks: PlannerTask[];
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  checkConflict: (scheduledDate: string, startTime: string, durationSlots: number, excludeId?: number) => Promise<PlannerTask | null>;
  excludeId?: number;
}

export default function TaskFormModal({ title, initial, tasks, onClose, onSubmit, checkConflict, excludeId }: Props) {
  const isEdit = excludeId != null;
  const [client, setClient] = useState(initial?.client ?? '');
  const [taskTitle, setTaskTitle] = useState(initial?.title ?? '');
  const [assignedTo, setAssignedTo] = useState<AssignedTo>(initial?.assignedTo ?? 'STEPHAN');
  const [budgetHours, setBudgetHours] = useState(String(initial?.budgetHours ?? (isEdit ? '' : '0.5')));
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'MEDIUM');
  const [colour, setColour] = useState(initial?.colour ?? SWATCHES[0]);
  const [scheduleDate, setScheduleDate] = useState(initial?.scheduledDate?.slice(0, 10) ?? '');
  const [scheduleTime, setScheduleTime] = useState(initial?.startTime ?? TIME_SLOTS[0]);
  const [scheduleDuration, setScheduleDuration] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bookedSlots = useMemo(
    () => (scheduleDate ? getBookedSlots(tasks, scheduleDate, excludeId) : new Set<string>()),
    [tasks, scheduleDate, excludeId]
  );

  async function handleSubmit() {
    setError(null);
    if (!taskTitle.trim() || !client.trim()) {
      setError('Client and Title are required.');
      return;
    }
    setSubmitting(true);
    try {
      const values: Record<string, unknown> = {
        client: client.trim(),
        title: taskTitle.trim(),
        priority,
        assignedTo,
        colour,
        dueDate: dueDate || null,
      };
      if (assignedTo === 'STEPHAN') {
        values.budgetHours = budgetHours ? Number(budgetHours) : 0;
      }
      if (!isEdit && scheduleDate && assignedTo === 'STEPHAN') {
        const conflict = await checkConflict(scheduleDate, scheduleTime, scheduleDuration, excludeId);
        if (conflict && !window.confirm(`This overlaps with "${conflict.title}". Schedule anyway?`)) {
          setSubmitting(false);
          return;
        }
        values.scheduledDate = scheduleDate;
        values.startTime = scheduleTime;
        values.durationSlots = scheduleDuration;
      }
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>

        <div className="radio-group">
          <label><input type="radio" checked={assignedTo === 'STEPHAN'} onChange={() => setAssignedTo('STEPHAN')} /> Stephan</label>
          <label><input type="radio" checked={assignedTo === 'CHANEL'} onChange={() => setAssignedTo('CHANEL')} /> Chanel</label>
        </div>

        <label>Client<input value={client} onChange={(e) => setClient(e.target.value)} /></label>
        <label>Title<input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} /></label>

        <div className="row2">
          {assignedTo === 'STEPHAN' && (
            <label>Budget Hours<input type="number" min={0} step="0.25" value={budgetHours} onChange={(e) => setBudgetHours(e.target.value)} /></label>
          )}
          <label>Due Date<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
        </div>

        {!isEdit && assignedTo === 'STEPHAN' && (
          <>
            <div className="row2">
              <label>Schedule Date <span style={{ fontWeight: 400 }}>(optional)</span>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </label>
              <label>Start Time
                <select value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}>
                  {TIME_SLOTS.map((t) => {
                    const blocked = isStartTimeBlocked(bookedSlots, t, scheduleDuration);
                    return <option key={t} value={t} disabled={blocked}>{t}{blocked ? ' (booked)' : ''}</option>;
                  })}
                </select>
              </label>
            </div>
            {scheduleDate && (
              <label>Duration
                <select value={scheduleDuration} onChange={(e) => setScheduleDuration(Number(e.target.value))}>
                  {DURATION_OPTIONS.map((d) => <option key={d.slots} value={d.slots}>{d.label}</option>)}
                </select>
              </label>
            )}
          </>
        )}

        <label>Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </label>

        <label>Colour
          <div className="swatches">
            {SWATCHES.map((c) => (
              <div key={c} className={`swatch${c === colour ? ' selected' : ''}`} style={{ background: c }} onClick={() => setColour(c)} />
            ))}
          </div>
        </label>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

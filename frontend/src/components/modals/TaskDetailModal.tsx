import { useMemo, useState } from 'react';
import type { PlannerTask } from '../../api/types';
import { DURATION_OPTIONS, TIME_SLOTS, durationLabel, fmtDate, getBookedSlots, isStartTimeBlocked } from '../../utils/time';

interface Props {
  task: PlannerTask;
  tasks: PlannerTask[];
  onClose: () => void;
  onEdit: (task: PlannerTask) => void;
  onDelete: (task: PlannerTask) => void;
  onUpdateTask: (id: number, patch: Record<string, unknown>) => Promise<PlannerTask>;
  onComplete: (task: PlannerTask) => Promise<void> | void;
  onRestore: (task: PlannerTask) => Promise<void>;
  onMarkNeedsBilling: (task: PlannerTask) => Promise<void>;
  onContinueTomorrowChanel: (id: number) => Promise<void>;
  onScheduleWithConflictCheck: (id: number, date: string, time: string, durationSlots?: number) => Promise<boolean>;
  onDuplicateTask: (id: number, opts: { dates?: string[]; startTime?: string | null; durationSlots?: number | null }) => Promise<PlannerTask[]>;
  checkConflict: (scheduledDate: string, startTime: string, durationSlots: number, excludeId?: number) => Promise<PlannerTask | null>;
  onAddSubtask: (taskId: number, text: string) => Promise<void>;
  onToggleSubtask: (taskId: number, subId: number, done: boolean) => Promise<void>;
  onDeleteSubtask: (taskId: number, subId: number) => Promise<void>;
  onLogWork: (taskId: number, hours: number) => Promise<PlannerTask>;
  onDeleteWorkLogEntry: (taskId: number, entryId: number) => Promise<void>;
}

export default function TaskDetailModal({
  task,
  tasks,
  onClose,
  onEdit,
  onDelete,
  onUpdateTask,
  onComplete,
  onRestore,
  onMarkNeedsBilling,
  onContinueTomorrowChanel,
  onScheduleWithConflictCheck,
  onDuplicateTask,
  checkConflict,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onLogWork,
  onDeleteWorkLogEntry,
}: Props) {
  const isStephan = task.assignedTo === 'STEPHAN';
  const isMeeting = task.kind === 'MEETING';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(task.scheduledDate?.slice(0, 10) ?? '');
  const [scheduleTime, setScheduleTime] = useState(task.startTime ?? TIME_SLOTS[0]);
  const [scheduleDuration, setScheduleDuration] = useState(task.durationSlots ?? 2);
  const [showLogWork, setShowLogWork] = useState(false);
  const [logHours, setLogHours] = useState('');
  const [continuePrompt, setContinuePrompt] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [duplicateDates, setDuplicateDates] = useState<string[]>([]);
  const [duplicateDateInput, setDuplicateDateInput] = useState('');
  const [duplicateTime, setDuplicateTime] = useState(task.startTime ?? TIME_SLOTS[0]);
  const [duplicateDuration, setDuplicateDuration] = useState(task.durationSlots ?? 1);

  const bookedSlots = useMemo(
    () => (scheduleDate ? getBookedSlots(tasks, scheduleDate, task.id) : new Set<string>()),
    [tasks, scheduleDate, task.id]
  );

  async function run(fn: () => Promise<unknown> | void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const scheduleInfo = task.scheduledDate
    ? `${fmtDate(task.scheduledDate)} ${task.startTime ?? ''}${isMeeting ? ` (${durationLabel(task.durationSlots ?? 1)})` : ''}`
    : 'Not scheduled';

  async function submitSchedule() {
    if (!scheduleDate) {
      setError('Choose a date.');
      return;
    }
    await run(async () => {
      const applied = await onScheduleWithConflictCheck(task.id, scheduleDate, scheduleTime, scheduleDuration);
      if (applied) setShowSchedule(false);
    });
  }

  async function submitLogWork() {
    const hours = Number(logHours);
    if (!hours || hours <= 0) {
      setError('Enter the hours worked.');
      return;
    }
    await run(async () => {
      const updated = await onLogWork(task.id, hours);
      setLogHours('');
      if (updated.completed) {
        setShowLogWork(false);
        onClose();
      } else {
        setContinuePrompt(true);
      }
    });
  }

  function addDuplicateDate() {
    if (!duplicateDateInput || duplicateDates.includes(duplicateDateInput)) return;
    setDuplicateDates((prev) => [...prev, duplicateDateInput].sort());
    setDuplicateDateInput('');
  }

  function removeDuplicateDate(d: string) {
    setDuplicateDates((prev) => prev.filter((x) => x !== d));
  }

  async function submitDuplicate() {
    await run(async () => {
      if (duplicateDates.length > 0) {
        const conflicts: string[] = [];
        for (const d of duplicateDates) {
          const conflict = await checkConflict(d, duplicateTime, duplicateDuration);
          if (conflict) conflicts.push(`${fmtDate(d)} — overlaps "${conflict.title}"`);
        }
        if (conflicts.length && !window.confirm(`These dates overlap existing items:\n${conflicts.join('\n')}\n\nDuplicate anyway?`)) {
          return;
        }
      }
      await onDuplicateTask(task.id, {
        dates: duplicateDates,
        startTime: duplicateDates.length ? duplicateTime : null,
        durationSlots: duplicateDates.length ? duplicateDuration : null,
      });
      setShowDuplicate(false);
      setDuplicateDates([]);
      onClose();
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{task.title}</h2>

        <div className="stat-row"><span>Client</span><b>{task.client || '—'}</b></div>
        <div className="stat-row"><span>Priority</span><b>{task.priority}</b></div>
        <div className="stat-row"><span>Due</span><b>{task.dueDate ? fmtDate(task.dueDate) : '—'}</b></div>
        {isStephan && !isMeeting && (
          <>
            <div className="stat-row"><span>Budget</span><b>{task.budgetHours}h</b></div>
            <div className="stat-row"><span>Actual</span><b>{task.actualHours}h</b></div>
            <div className="stat-row"><span>Remaining</span><b>{task.remainingHours}h</b></div>
          </>
        )}
        {isStephan && <div className="stat-row"><span>Schedule</span><b>{scheduleInfo}</b></div>}
        {isMeeting && task.location && <div className="stat-row"><span>Location</span><b>{task.location}</b></div>}

        {isMeeting && task.agenda && (
          <>
            <h3>Agenda</h3>
            <p style={{ fontSize: 13.5, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{task.agenda}</p>
          </>
        )}

        {showSchedule && (
          <div style={{ marginTop: 4, marginBottom: 10 }}>
            <div className="row2">
              <label>Date<input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} /></label>
              <label>Start Time
                <select value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}>
                  {TIME_SLOTS.map((t) => {
                    const blocked = isStartTimeBlocked(bookedSlots, t, scheduleDuration);
                    return <option key={t} value={t} disabled={blocked}>{t}{blocked ? ' (booked)' : ''}</option>;
                  })}
                </select>
              </label>
            </div>
            <label>Duration
              <select value={scheduleDuration} onChange={(e) => setScheduleDuration(Number(e.target.value))}>
                {DURATION_OPTIONS.map((d) => <option key={d.slots} value={d.slots}>{d.label}</option>)}
              </select>
            </label>
            <button className="btn btn-primary btn-sm" onClick={submitSchedule} disabled={busy}>Confirm</button>
          </div>
        )}

        {showDuplicate && (
          <div className="duplicate-panel" style={{ marginTop: 4, marginBottom: 10 }}>
            <p className="prompt-text" style={{ marginBottom: 8 }}>
              {isStephan
                ? 'Leave dates empty for a single unscheduled copy, or add a date for each day you need it booked.'
                : 'Creates an unscheduled copy on the To Do board.'}
            </p>
            {isStephan && (
              <>
                {duplicateDates.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {duplicateDates.map((d) => (
                      <span key={d} className="date-chip">
                        {fmtDate(d)}
                        <button onClick={() => removeDuplicateDate(d)} title="Remove">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="row2">
                  <label>Add date
                    <input type="date" value={duplicateDateInput} onChange={(e) => setDuplicateDateInput(e.target.value)} />
                  </label>
                  <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-end', marginBottom: 10 }} onClick={addDuplicateDate}>
                    + Add Date
                  </button>
                </div>
                {duplicateDates.length > 0 && (
                  <div className="row2">
                    <label>Start Time
                      <select value={duplicateTime} onChange={(e) => setDuplicateTime(e.target.value)}>
                        {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label>Duration
                      <select value={duplicateDuration} onChange={(e) => setDuplicateDuration(Number(e.target.value))}>
                        {DURATION_OPTIONS.map((d) => <option key={d.slots} value={d.slots}>{d.label}</option>)}
                      </select>
                    </label>
                  </div>
                )}
              </>
            )}
            <button className="btn btn-primary btn-sm" onClick={submitDuplicate} disabled={busy}>
              {duplicateDates.length > 0 ? `Duplicate to ${duplicateDates.length} date${duplicateDates.length > 1 ? 's' : ''}` : 'Duplicate'}
            </button>
          </div>
        )}

        {showLogWork && !continuePrompt && (
          <div style={{ marginTop: 4, marginBottom: 10 }}>
            <label>Hours worked now<input type="number" min={0} step="0.25" value={logHours} onChange={(e) => setLogHours(e.target.value)} autoFocus /></label>
            <button className="btn btn-primary btn-sm" onClick={submitLogWork} disabled={busy}>Save Work</button>
          </div>
        )}

        {continuePrompt && (
          <div className="stat-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span>Continue tomorrow, or mark complete now?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => run(async () => {
                await onUpdateTask(task.id, { scheduledDate: null, startTime: null });
                setContinuePrompt(false);
                setShowLogWork(false);
              })} disabled={busy}>Continue Tomorrow</button>
              <button className="btn btn-danger btn-sm" onClick={() => run(async () => {
                await onComplete(task);
              })} disabled={busy}>Mark Complete</button>
            </div>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <h3>Sub-tasks</h3>
        {task.subtasks.length ? (
          task.subtasks.map((s) => (
            <div className="subtask-row" key={s.id}>
              <input type="checkbox" checked={s.done} onChange={() => onToggleSubtask(task.id, s.id, !s.done)} />
              <span className={`txt${s.done ? ' done' : ''}`}>{s.text}</span>
              <button onClick={() => onDeleteSubtask(task.id, s.id)} title="Delete">×</button>
            </div>
          ))
        ) : (
          <div className="empty-note">No sub-tasks.</div>
        )}
        <div className="phone-slip-add">
          <input
            type="text"
            placeholder="Add sub-task..."
            value={subtaskInput}
            onChange={(e) => setSubtaskInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && subtaskInput.trim()) {
                onAddSubtask(task.id, subtaskInput.trim());
                setSubtaskInput('');
              }
            }}
          />
        </div>

        {isStephan && !isMeeting && task.workLog.length > 0 && (
          <>
            <h3>Work Log</h3>
            {task.workLog.slice().reverse().map((w) => (
              <div className="subtask-row" key={w.id}>
                <span className="txt">{new Date(w.loggedAt).toLocaleString()} — {w.hours}h</span>
                <button onClick={() => onDeleteWorkLogEntry(task.id, w.id)} title="Remove entry">×</button>
              </div>
            ))}
          </>
        )}

        <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
          {isStephan && (
            <button className="btn btn-light btn-sm" onClick={() => setShowSchedule((v) => !v)} disabled={busy}>
              {task.scheduledDate ? 'Reschedule' : 'Schedule'}
            </button>
          )}
          <button className="btn btn-light btn-sm" onClick={() => setShowDuplicate((v) => !v)} disabled={busy}>Duplicate</button>
          {isStephan && !isMeeting && (
            <button className="btn btn-light btn-sm" onClick={() => { setShowLogWork((v) => !v); setContinuePrompt(false); }} disabled={busy}>Log Work</button>
          )}
          {isStephan && !isMeeting && !task.completed && (
            <button className="btn btn-light btn-sm" onClick={() => run(async () => {
              await onUpdateTask(task.id, { scheduledDate: null, startTime: null });
              onClose();
            })} disabled={busy}>Continue Tomorrow</button>
          )}
          {!isStephan && task.chanelStatus !== 'DONE' && (
            <button className="btn btn-light btn-sm" onClick={() => run(() => onContinueTomorrowChanel(task.id))} disabled={busy}>Continue Tomorrow</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(task)} disabled={busy}>Edit</button>
          {!task.completed ? (
            <button className="btn btn-primary btn-sm" onClick={() => run(() => onComplete(task))} disabled={busy}>Complete</button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => run(() => onRestore(task))} disabled={busy}>Reopen</button>
          )}
          {isStephan && (
            <button
              className={`btn btn-sm${task.readyToBill ? ' btn-secondary' : ' btn-light'}`}
              onClick={() => run(() => onMarkNeedsBilling(task))}
              disabled={busy || task.readyToBill}
              title="Flags this for Chanel to bill the client"
            >
              {task.readyToBill ? 'Billed ✓' : 'Bill'}
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(task)} disabled={busy}>Delete</button>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

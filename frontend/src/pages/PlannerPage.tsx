import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { AssignedTo, PhoneSlip, PlannerTask } from '../api/types';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import LeftPanel from '../components/LeftPanel';
import CentrePanel from '../components/CentrePanel';
import ParkingLot from '../components/ParkingLot';
import DoneBox from '../components/DoneBox';
import BillingBox from '../components/BillingBox';
import CollapsibleSection from '../components/CollapsibleSection';
import TaskFormModal from '../components/modals/TaskFormModal';
import MeetingFormModal from '../components/modals/MeetingFormModal';
import TaskDetailModal from '../components/modals/TaskDetailModal';
import QuickAddModal from '../components/modals/QuickAddModal';
import ReportModal from '../components/modals/ReportModal';
import ImportModal from '../components/modals/ImportModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import FollowUpPromptModal from '../components/modals/FollowUpPromptModal';
import BillingPromptModal from '../components/modals/BillingPromptModal';
import TimerCheckInModal from '../components/modals/TimerCheckInModal';
import { useAlarms } from '../hooks/useAlarms';
import { useTimerCheckIn } from '../hooks/useTimerCheckIn';
import { isSlotInFuture } from '../utils/time';

export type ModalState =
  | {
      type: 'newTask';
      prefill?: Partial<{ client: string; title: string; assignedTo: AssignedTo; scheduledDate: string; startTime: string }>;
      convertSlipId?: number;
    }
  | { type: 'editTask'; task: PlannerTask }
  | { type: 'newMeeting'; prefill?: { scheduledDate?: string; startTime?: string } }
  | { type: 'editMeeting'; task: PlannerTask }
  | { type: 'detail'; task: PlannerTask }
  | { type: 'quickAdd'; dateIso: string; time: string }
  | { type: 'report' }
  | { type: 'import' }
  | { type: 'deleteConfirm'; task: PlannerTask }
  | { type: 'meetingCompletedPrompt'; client: string; title: string }
  | { type: 'billingPrompt'; task: PlannerTask }
  | { type: 'timerCheckIn'; task: PlannerTask }
  | null;

export default function PlannerPage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [phoneSlips, setPhoneSlips] = useState<PhoneSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [centreView, setCentreView] = useState<'week' | 'today'>('week');
  const [modal, setModal] = useState<ModalState>(null);

  const loadAll = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([
        api.get<{ tasks: PlannerTask[] }>('/tasks'),
        api.get<{ phoneSlips: PhoneSlip[] }>('/phone-slips'),
      ]);
      setTasks(t.tasks);
      setPhoneSlips(p.phoneSlips);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load planner data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useAlarms(tasks);
  useTimerCheckIn(tasks, (task) => {
    setModal((current) => (current === null ? { type: 'timerCheckIn', task } : current));
  });

  // Refresh whichever task is open in a modal after a mutation, so the modal
  // stays in sync instead of showing stale data.
  function refreshOpenTask(updated: PlannerTask) {
    setModal((m) => {
      if (m && (m.type === 'detail') && m.task.id === updated.id) return { type: 'detail', task: updated };
      return m;
    });
  }

  async function createTask(payload: Record<string, unknown>) {
    const res = await api.post<{ task: PlannerTask }>('/tasks', payload);
    await loadAll();
    return res.task;
  }

  async function updateTask(id: number, patch: Record<string, unknown>) {
    const res = await api.patch<{ task: PlannerTask }>(`/tasks/${id}`, patch);
    setTasks((prev) => prev.map((t) => (t.id === id ? res.task : t)));
    refreshOpenTask(res.task);
    return res.task;
  }

  async function deleteTask(id: number) {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setModal(null);
  }

  // Completing a Stephan task/meeting whose slot hasn't happened yet frees
  // that slot up for something else; a slot that's already now or in the
  // past is left in place so the card stays visible as a record of when it
  // happened. Compared against the browser's local time, not the server's.
  async function completeTask(id: number) {
    const res = await api.post<{ task: PlannerTask }>(`/tasks/${id}/complete`);
    let task = res.task;
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    if (task.assignedTo === 'STEPHAN' && isSlotInFuture(task.scheduledDate, task.startTime)) {
      task = await updateTask(id, { scheduledDate: null, startTime: null, durationSlots: null });
    }
    return task;
  }

  async function restoreTask(id: number) {
    const res = await api.post<{ task: PlannerTask }>(`/tasks/${id}/restore`);
    setTasks((prev) => prev.map((t) => (t.id === id ? res.task : t)));
    refreshOpenTask(res.task);
    return res.task;
  }

  async function setChanelStatus(id: number, status: 'TO_DO' | 'DOING' | 'DONE') {
    const res = await api.post<{ task: PlannerTask }>(`/tasks/${id}/chanel-status`, { status });
    setTasks((prev) => prev.map((t) => (t.id === id ? res.task : t)));
  }

  async function restoreChanelTask(id: number) {
    await setChanelStatus(id, 'TO_DO');
  }

  async function continueTomorrowChanel(id: number) {
    await api.post(`/tasks/${id}/continue-tomorrow-chanel`);
    await loadAll();
    setModal(null);
  }

  async function duplicateTask(id: number, opts: { dates?: string[]; startTime?: string | null; durationSlots?: number | null }) {
    const res = await api.post<{ tasks: PlannerTask[] }>(`/tasks/${id}/duplicate`, opts);
    setTasks((prev) => [...prev, ...res.tasks]);
    return res.tasks;
  }

  async function addSubtask(taskId: number, text: string) {
    const res = await api.post<{ task: PlannerTask }>(`/tasks/${taskId}/subtasks`, { text });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    refreshOpenTask(res.task);
  }

  async function toggleSubtask(taskId: number, subId: number, done: boolean) {
    const res = await api.patch<{ task: PlannerTask }>(`/tasks/${taskId}/subtasks/${subId}`, { done });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    refreshOpenTask(res.task);
  }

  async function deleteSubtask(taskId: number, subId: number) {
    const res = await api.delete<{ task: PlannerTask }>(`/tasks/${taskId}/subtasks/${subId}`);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    refreshOpenTask(res.task);
  }

  async function logWork(taskId: number, hours: number) {
    const res = await api.post<{ task: PlannerTask }>(`/tasks/${taskId}/worklog`, { hours });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    return res.task;
  }

  async function deleteWorkLogEntry(taskId: number, entryId: number) {
    const res = await api.delete<{ task: PlannerTask }>(`/tasks/${taskId}/worklog/${entryId}`);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    refreshOpenTask(res.task);
  }

  async function addAttachment(taskId: number, file: File) {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const res = await api.post<{ task: PlannerTask }>(`/tasks/${taskId}/attachments`, {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      dataBase64,
    });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    refreshOpenTask(res.task);
  }

  async function deleteAttachment(taskId: number, attachmentId: number) {
    const res = await api.delete<{ task: PlannerTask }>(`/tasks/${taskId}/attachments/${attachmentId}`);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    refreshOpenTask(res.task);
  }

  async function startTimer(taskId: number) {
    const alreadyRunning = tasks.find((t) => t.id !== taskId && t.timerStartedAt);
    if (alreadyRunning) {
      const ok = window.confirm(`A timer is already running on "${alreadyRunning.title}". Stop it and start this one instead?`);
      if (!ok) return;
      await stopTimer(alreadyRunning.id);
    }
    const res = await api.post<{ task: PlannerTask }>(`/tasks/${taskId}/timer/start`);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    refreshOpenTask(res.task);
  }

  async function stopTimer(taskId: number) {
    const res = await api.post<{ task: PlannerTask }>(`/tasks/${taskId}/timer/stop`);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    refreshOpenTask(res.task);
  }

  async function quickAddChanelTask(text: string) {
    await createTask({ title: text, client: '', assignedTo: 'CHANEL', priority: 'MEDIUM', colour: '#1f7a4d' });
  }

  async function addPhoneSlip(text: string) {
    const res = await api.post<{ phoneSlip: PhoneSlip }>('/phone-slips', { text });
    setPhoneSlips((prev) => [...prev, res.phoneSlip]);
  }

  async function togglePhoneSlip(id: number, done: boolean) {
    const res = await api.patch<{ phoneSlip: PhoneSlip }>(`/phone-slips/${id}`, { done });
    setPhoneSlips((prev) => prev.map((p) => (p.id === id ? res.phoneSlip : p)));
  }

  async function deletePhoneSlip(id: number) {
    await api.delete(`/phone-slips/${id}`);
    setPhoneSlips((prev) => prev.filter((p) => p.id !== id));
  }

  async function checkConflict(scheduledDate: string, startTime: string, durationSlots: number, excludeId?: number) {
    const res = await api.post<{ conflict: PlannerTask | null }>('/tasks/conflict-check', {
      scheduledDate,
      startTime,
      durationSlots,
      excludeId,
    });
    return res.conflict;
  }

  async function scheduleWithConflictCheck(
    id: number,
    scheduledDate: string,
    startTime: string,
    durationSlots?: number
  ): Promise<boolean> {
    const conflict = await checkConflict(scheduledDate, startTime, durationSlots ?? 1, id);
    if (conflict && !window.confirm(`This overlaps with "${conflict.title}". Schedule anyway?`)) return false;
    await updateTask(id, { scheduledDate, startTime, ...(durationSlots ? { durationSlots } : {}) });
    return true;
  }

  async function handleParkingDrop(id: number) {
    const task = tasks.find((t) => t.id === id);
    if (!task || !task.scheduledDate) return;
    await updateTask(id, { scheduledDate: null, startTime: null });
  }

  // Swaps two of Stephan's scheduled items' slots wholesale. If the dragged
  // item had no slot yet (came from the Parking Lot), it simply hands its
  // "no slot" over to the bumped item, which ends up unscheduled. The
  // backend guards against a third item already sitting in either
  // destination slot and rejects the swap rather than double-booking it.
  async function swapSchedule(id: number, withId: number) {
    try {
      const res = await api.post<{ taskA: PlannerTask; taskB: PlannerTask }>(`/tasks/${id}/swap-schedule`, { withId });
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === res.taskA.id) return res.taskA;
          if (t.id === res.taskB.id) return res.taskB;
          return t;
        })
      );
      refreshOpenTask(res.taskA);
      refreshOpenTask(res.taskB);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not swap these slots.');
    }
  }

  async function handleCellDrop(id: number, dateIso: string, time: string, occupyingTaskId?: number) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.scheduledDate?.slice(0, 10) === dateIso && task.startTime === time) return;
    if (occupyingTaskId != null && occupyingTaskId !== id) {
      await swapSchedule(id, occupyingTaskId);
      return;
    }
    await scheduleWithConflictCheck(id, dateIso, time, task.durationSlots ?? undefined);
  }

  // Single choke point for both completion paths (Complete button + drag-to-
  // Done): completes the task, then — if it's one of Stephan's items not
  // already flagged for billing — asks whether it must be billed before
  // (for meetings) the existing Outlook follow-up prompt shows.
  function completeThenMaybePromptBilling(task: PlannerTask) {
    return completeTask(task.id).then((completed) => {
      if (completed.assignedTo === 'STEPHAN' && !completed.readyToBill) {
        setModal({ type: 'billingPrompt', task: completed });
      } else if (completed.kind === 'MEETING') {
        setModal({ type: 'meetingCompletedPrompt', client: completed.client, title: completed.title });
      } else {
        setModal(null);
      }
    });
  }

  // Dragging a task/meeting off the calendar onto the Done box — same
  // completion logic as the Complete button in the detail modal, so a
  // dropped meeting still gets the billing prompt and Outlook follow-up
  // prompt. Items that were already marked done ahead of time have nothing
  // left to complete, so dropping them just unschedules them off the
  // calendar instead.
  function completeTaskById(id: number) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.completed) {
      if (task.scheduledDate) updateTask(id, { scheduledDate: null, startTime: null });
      return;
    }
    completeThenMaybePromptBilling(task).catch((err) => {
      window.alert(err instanceof ApiError ? err.message : 'Could not complete this task.');
    });
  }

  // Stephan flags a task as needing to be billed. Kept out of Chanel's
  // regular To Do/Doing/Done board — it lands in its own Bill box instead.
  // An amount is optional so the plain "Bill" button in the detail modal
  // (no amount) keeps working exactly as before.
  async function markNeedsBilling(task: PlannerTask, amount?: number) {
    await updateTask(task.id, { readyToBill: true, ...(amount != null ? { billingAmount: amount } : {}) });
    await createTask({
      title: `Bill client for "${task.title}"`,
      client: task.client,
      assignedTo: 'CHANEL',
      priority: 'MEDIUM',
      colour: '#1f7a4d',
      isBillingItem: true,
      ...(amount != null ? { billingAmount: amount } : {}),
    });
  }

  async function markBillingDone(id: number) {
    await completeTask(id);
  }

  if (loading) return <div className="planner-loading">Loading…</div>;

  return (
    <div>
      <TopBar
        userName={user?.name ?? ''}
        onLogout={logout}
        onOpenReport={() => setModal({ type: 'report' })}
        onOpenImport={() => setModal({ type: 'import' })}
        onOpenNewMeeting={() => setModal({ type: 'newMeeting' })}
        onOpenNewTask={() => setModal({ type: 'newTask' })}
      />

      <div className="layout">
        <LeftPanel
          tasks={tasks}
          phoneSlips={phoneSlips}
          onSelectTask={(task) => setModal({ type: 'detail', task })}
          onAddPhoneSlip={addPhoneSlip}
          onTogglePhoneSlip={togglePhoneSlip}
          onDeletePhoneSlip={deletePhoneSlip}
          onConvertSlipToTask={(slip) =>
            setModal({ type: 'newTask', prefill: { title: slip.text }, convertSlipId: slip.id })
          }
          onQuickAddChanelTask={quickAddChanelTask}
          onSetChanelStatus={setChanelStatus}
          onContinueTomorrowChanel={continueTomorrowChanel}
          onDeleteTask={(task) => setModal({ type: 'deleteConfirm', task })}
          onViewAllDone={() => setModal({ type: 'report' })}
        />

        <div className="panel">
          {error && <div className="form-error">{error}</div>}
          <CentrePanel
            tasks={tasks}
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
            centreView={centreView}
            onCentreViewChange={setCentreView}
            onSelectTask={(task) => setModal({ type: 'detail', task })}
            onCellDrop={handleCellDrop}
            onCellClick={(dateIso, time) => setModal({ type: 'quickAdd', dateIso, time })}
            onStartTimer={startTimer}
            onStopTimer={stopTimer}
          />
        </div>

        <div className="panel" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
          e.preventDefault();
          const id = Number(e.dataTransfer.getData('text/plain'));
          if (id) handleParkingDrop(id);
        }}>
          <CollapsibleSection title="Done">
            <DoneBox tasks={tasks} onSelectTask={(task) => setModal({ type: 'detail', task })} onDropComplete={completeTaskById} />
          </CollapsibleSection>
          <hr className="divider" />
          <CollapsibleSection title="Bill">
            <BillingBox tasks={tasks} onMarkBilled={markBillingDone} />
          </CollapsibleSection>
          <hr className="divider" />
          <CollapsibleSection title="Parking Lot">
            <ParkingLot
              tasks={tasks}
              onSelectTask={(task) => setModal({ type: 'detail', task })}
              onScheduleTask={(task) => setModal({ type: 'detail', task })}
              onEditTask={(task) => setModal(task.kind === 'MEETING' ? { type: 'editMeeting', task } : { type: 'editTask', task })}
              onDeleteTask={(task) => setModal({ type: 'deleteConfirm', task })}
            />
          </CollapsibleSection>
        </div>
      </div>

      {modal?.type === 'newTask' && (
        <TaskFormModal
          title="New Task"
          initial={modal.prefill}
          tasks={tasks}
          onClose={() => setModal(null)}
          onSubmit={async (values) => {
            await createTask(values);
            if (modal.convertSlipId != null) await deletePhoneSlip(modal.convertSlipId);
            setModal(null);
          }}
          checkConflict={checkConflict}
        />
      )}

      {modal?.type === 'editTask' && (
        <TaskFormModal
          title="Edit Task"
          initial={modal.task}
          tasks={tasks}
          onClose={() => setModal(null)}
          onSubmit={async (values) => {
            await updateTask(modal.task.id, values);
            setModal(null);
          }}
          checkConflict={checkConflict}
          excludeId={modal.task.id}
        />
      )}

      {modal?.type === 'newMeeting' && (
        <MeetingFormModal
          title="New Meeting"
          initial={modal.prefill}
          tasks={tasks}
          onClose={() => setModal(null)}
          onSubmit={async (values) => {
            await createTask({ ...values, kind: 'MEETING', assignedTo: 'STEPHAN' });
            await createTask({
              title: `Schedule "${values.title}" on Outlook + set alarm — ${values.scheduledDate} ${values.startTime}`,
              client: values.client,
              assignedTo: 'CHANEL',
              priority: 'MEDIUM',
              colour: '#1f7a4d',
            });
            setModal(null);
          }}
          checkConflict={checkConflict}
        />
      )}

      {modal?.type === 'editMeeting' && (
        <MeetingFormModal
          title="Edit Meeting"
          initial={modal.task}
          tasks={tasks}
          onClose={() => setModal(null)}
          onSubmit={async (values) => {
            await updateTask(modal.task.id, values);
            setModal(null);
          }}
          checkConflict={checkConflict}
          excludeId={modal.task.id}
        />
      )}

      {modal?.type === 'detail' && (
        <TaskDetailModal
          task={modal.task}
          tasks={tasks}
          onClose={() => setModal(null)}
          onEdit={(task) => setModal(task.kind === 'MEETING' ? { type: 'editMeeting', task } : { type: 'editTask', task })}
          onDelete={(task) => setModal({ type: 'deleteConfirm', task })}
          onUpdateTask={updateTask}
          onComplete={(task) => completeThenMaybePromptBilling(task)}
          onRestore={async (task) => {
            await restoreTask(task.id);
          }}
          onMarkNeedsBilling={markNeedsBilling}
          onContinueTomorrowChanel={continueTomorrowChanel}
          onScheduleWithConflictCheck={scheduleWithConflictCheck}
          onDuplicateTask={duplicateTask}
          checkConflict={checkConflict}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onLogWork={logWork}
          onDeleteWorkLogEntry={deleteWorkLogEntry}
          onAddAttachment={addAttachment}
          onDeleteAttachment={deleteAttachment}
          onStartTimer={startTimer}
          onStopTimer={stopTimer}
        />
      )}

      {modal?.type === 'quickAdd' && (
        <QuickAddModal
          dateIso={modal.dateIso}
          time={modal.time}
          onClose={() => setModal(null)}
          onPick={(kind) => {
            if (kind === 'TASK') {
              setModal({ type: 'newTask', prefill: { scheduledDate: modal.dateIso, startTime: modal.time } });
            } else if (kind === 'MEETING') {
              setModal({ type: 'newMeeting', prefill: { scheduledDate: modal.dateIso, startTime: modal.time } });
            } else {
              setModal({ type: 'newTask', prefill: { assignedTo: 'CHANEL' } });
            }
          }}
        />
      )}

      {modal?.type === 'meetingCompletedPrompt' && (
        <FollowUpPromptModal
          title={modal.title}
          onSkip={() => setModal(null)}
          onAddTask={() => setModal({ type: 'newTask', prefill: { client: modal.client } })}
        />
      )}

      {modal?.type === 'billingPrompt' && (
        <BillingPromptModal
          title={modal.task.title}
          onSkip={() => {
            const task = modal.task;
            if (task.kind === 'MEETING') {
              setModal({ type: 'meetingCompletedPrompt', client: task.client, title: task.title });
            } else {
              setModal(null);
            }
          }}
          onConfirm={async (amount) => {
            const task = modal.task;
            await markNeedsBilling(task, amount);
            if (task.kind === 'MEETING') {
              setModal({ type: 'meetingCompletedPrompt', client: task.client, title: task.title });
            } else {
              setModal(null);
            }
          }}
        />
      )}

      {modal?.type === 'timerCheckIn' && (
        <TimerCheckInModal
          title={modal.task.title}
          onStillWorking={() => setModal(null)}
          onStop={() => {
            const taskId = modal.task.id;
            setModal(null);
            stopTimer(taskId).catch((err) => {
              window.alert(err instanceof ApiError ? err.message : 'Could not stop the timer.');
            });
          }}
        />
      )}

      {modal?.type === 'deleteConfirm' && (
        <ConfirmDeleteModal
          task={modal.task}
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            await deleteTask(modal.task.id);
          }}
        />
      )}

      {modal?.type === 'report' && (
        <ReportModal
          onClose={() => setModal(null)}
          onRestoreTask={async (id) => { await restoreTask(id); }}
          onRestoreChanelTask={restoreChanelTask}
        />
      )}

      {modal?.type === 'import' && (
        <ImportModal
          onClose={() => setModal(null)}
          onImported={async () => {
            // Don't close here — ImportModal shows a result summary and
            // only closes when the user clicks Close.
            await loadAll();
          }}
        />
      )}
    </div>
  );
}

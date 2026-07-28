import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { PhoneSlip, PlannerTask } from '../api/types';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import LeftPanel from '../components/LeftPanel';
import CentrePanel from '../components/CentrePanel';
import ParkingLot from '../components/ParkingLot';
import TaskFormModal from '../components/modals/TaskFormModal';
import MeetingFormModal from '../components/modals/MeetingFormModal';
import TaskDetailModal from '../components/modals/TaskDetailModal';
import ReportModal from '../components/modals/ReportModal';
import ImportModal from '../components/modals/ImportModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import FollowUpPromptModal from '../components/modals/FollowUpPromptModal';
import { useAlarms } from '../hooks/useAlarms';

export type ModalState =
  | { type: 'newTask'; prefill?: Partial<{ client: string; title: string }>; convertSlipId?: number }
  | { type: 'editTask'; task: PlannerTask }
  | { type: 'newMeeting' }
  | { type: 'editMeeting'; task: PlannerTask }
  | { type: 'detail'; task: PlannerTask }
  | { type: 'report' }
  | { type: 'import' }
  | { type: 'deleteConfirm'; task: PlannerTask }
  | { type: 'meetingCompletedPrompt'; client: string; title: string }
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

  async function completeTask(id: number) {
    const res = await api.post<{ task: PlannerTask }>(`/tasks/${id}/complete`);
    setTasks((prev) => prev.map((t) => (t.id === id ? res.task : t)));
    return res.task;
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

  async function handleCellDrop(id: number, dateIso: string, time: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.scheduledDate?.slice(0, 10) === dateIso && task.startTime === time) return;
    await scheduleWithConflictCheck(id, dateIso, time, task.durationSlots ?? undefined);
  }

  function completeMeetingThenPrompt(task: PlannerTask) {
    completeTask(task.id).then(() => {
      setModal({ type: 'meetingCompletedPrompt', client: task.client, title: task.title });
    });
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
          />
        </div>

        <div className="panel" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
          e.preventDefault();
          const id = Number(e.dataTransfer.getData('text/plain'));
          if (id) handleParkingDrop(id);
        }}>
          <ParkingLot
            tasks={tasks}
            onSelectTask={(task) => setModal({ type: 'detail', task })}
            onScheduleTask={(task) => setModal({ type: 'detail', task })}
            onEditTask={(task) => setModal(task.kind === 'MEETING' ? { type: 'editMeeting', task } : { type: 'editTask', task })}
            onDeleteTask={(task) => setModal({ type: 'deleteConfirm', task })}
          />
        </div>
      </div>

      {modal?.type === 'newTask' && (
        <TaskFormModal
          title="New Task"
          initial={modal.prefill}
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
          onClose={() => setModal(null)}
          onEdit={(task) => setModal(task.kind === 'MEETING' ? { type: 'editMeeting', task } : { type: 'editTask', task })}
          onDelete={(task) => setModal({ type: 'deleteConfirm', task })}
          onUpdateTask={updateTask}
          onComplete={async (task) => {
            if (task.kind === 'MEETING') {
              completeMeetingThenPrompt(task);
            } else {
              await completeTask(task.id);
              setModal(null);
            }
          }}
          onRestore={async (task) => {
            await restoreTask(task.id);
          }}
          onContinueTomorrowChanel={continueTomorrowChanel}
          onScheduleWithConflictCheck={scheduleWithConflictCheck}
          onDuplicateTask={duplicateTask}
          checkConflict={checkConflict}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onLogWork={logWork}
          onDeleteWorkLogEntry={deleteWorkLogEntry}
        />
      )}

      {modal?.type === 'meetingCompletedPrompt' && (
        <FollowUpPromptModal
          title={modal.title}
          onSkip={() => setModal(null)}
          onAddTask={() => setModal({ type: 'newTask', prefill: { client: modal.client } })}
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

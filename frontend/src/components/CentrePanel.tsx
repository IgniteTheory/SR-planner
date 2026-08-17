import { Fragment, useEffect, useState, type DragEvent } from 'react';
import type { PlannerTask } from '../api/types';
import {
  CALL_BLOCK_TIMES,
  TIME_SLOTS,
  addDays,
  fmtDayHeader,
  fmtWeekRange,
  isoDate,
  mondayOf,
  occupiedSlotsFor,
} from '../utils/time';

interface Props {
  tasks: PlannerTask[];
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  centreView: 'week' | 'today';
  onCentreViewChange: (view: 'week' | 'today') => void;
  onSelectTask: (task: PlannerTask) => void;
  onCellDrop: (taskId: number, dateIso: string, time: string, occupyingTaskId?: number) => void;
  onCellClick: (dateIso: string, time: string) => void;
  onStartTimer: (taskId: number) => void;
  onStopTimer: (taskId: number) => void;
}

function subtaskBadge(t: PlannerTask) {
  if (!t.subtasks.length) return null;
  const done = t.subtasks.filter((s) => s.done).length;
  return <span className="subtask-badge">{done}/{t.subtasks.length}</span>;
}

function attachmentBadge(t: PlannerTask) {
  if (!t.attachments.length) return null;
  return <span className="attachment-badge" title={`${t.attachments.length} attachment${t.attachments.length > 1 ? 's' : ''}`}>📎{t.attachments.length}</span>;
}

// Live-updating start/stop control shown on a task card so Stephan can time
// his work directly from the calendar. Each stop logs its own work-log
// entry — repeated start/stop cycles just add more entries.
function TimerControl({ task, onStart, onStop }: { task: PlannerTask; onStart: () => void; onStop: () => void }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!task.timerStartedAt) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [task.timerStartedAt]);

  if (task.timerStartedAt) {
    const elapsedMs = Date.now() - new Date(task.timerStartedAt).getTime();
    const mins = Math.floor(elapsedMs / 60000);
    const secs = Math.floor((elapsedMs % 60000) / 1000);
    return (
      <button
        type="button"
        className="timer-btn running"
        onClick={(e) => { e.stopPropagation(); onStop(); }}
        title="Stop timer and log the hours"
      >
        ⏹ {mins}:{secs < 10 ? '0' : ''}{secs}
      </button>
    );
  }
  return (
    <button type="button" className="timer-btn" onClick={(e) => { e.stopPropagation(); onStart(); }} title="Start timer">
      ▶ Start
    </button>
  );
}

export default function CentrePanel({
  tasks,
  weekOffset,
  onWeekOffsetChange,
  centreView,
  onCentreViewChange,
  onSelectTask,
  onCellDrop,
  onCellClick,
  onStartTimer,
  onStopTimer,
}: Props) {
  const todayIso = isoDate(new Date());
  const weekStart = addDays(mondayOf(new Date()), weekOffset * 7);
  const dayDates = centreView === 'today' ? [new Date()] : [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  const singleDay = dayDates.length === 1;

  const scheduledItems = tasks.filter((t) => t.assignedTo === 'STEPHAN' && t.scheduledDate && t.startTime);

  function findCell(dateIso: string, time: string) {
    for (const it of scheduledItems) {
      if (it.scheduledDate?.slice(0, 10) !== dateIso) continue;
      const occ = occupiedSlotsFor(it);
      if (occ.includes(time)) return { item: it, isStart: time === it.startTime };
    }
    return null;
  }

  function handleDragStart(e: DragEvent, id: number) {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e: DragEvent, dateIso: string, time: string, occupyingTaskId?: number) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (id) onCellDrop(id, dateIso, time, occupyingTaskId);
  }

  return (
    <>
      <div className="week-nav" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{centreView === 'today' ? `Today — ${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}` : 'Weekly Planner'}</h2>
        <div className="view-toggle">
          <button className={`btn btn-secondary btn-sm${centreView === 'week' ? ' active' : ''}`} onClick={() => onCentreViewChange('week')}>Week</button>
          <button className={`btn btn-secondary btn-sm${centreView === 'today' ? ' active' : ''}`} onClick={() => onCentreViewChange('today')}>Today Only</button>
        </div>
      </div>

      {centreView === 'week' && (
        <div className="week-nav">
          <button className="btn btn-secondary btn-sm" onClick={() => onWeekOffsetChange(weekOffset - 1)}>‹ Prev</button>
          <span className="week-range">{fmtWeekRange(weekStart)}{weekOffset === 0 ? ' (This Week)' : ''}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => onWeekOffsetChange(weekOffset + 1)}>Next ›</button>
          {weekOffset !== 0 && <button className="btn btn-light btn-sm" onClick={() => onWeekOffsetChange(0)}>Today</button>}
        </div>
      )}

      <div className={`planner-grid${singleDay ? ' single-day' : ''}`}>
        <div className="head" />
        {dayDates.map((d) => {
          const iso = isoDate(d);
          return <div key={iso} className={`head${iso === todayIso ? ' today' : ''}`}>{fmtDayHeader(d)}</div>;
        })}

        {TIME_SLOTS.map((time) => (
          <Fragment key={time}>
            <div className="time-label">{time}</div>
            {dayDates.map((d) => {
              const dateIso = isoDate(d);
              const found = findCell(dateIso, time);
              const todayColClass = dateIso === todayIso ? ' today-col' : '';
              const isCallBlock = !found && CALL_BLOCK_TIMES.includes(time);
              const isEmpty = !found && !isCallBlock;
              return (
                <div
                  key={`${dateIso}-${time}`}
                  className={`cell${todayColClass}${isEmpty ? ' empty-cell' : ''}`}
                  onDragOver={(e) => { if (!isCallBlock) e.preventDefault(); }}
                  onDrop={(e) => { if (!isCallBlock) handleDrop(e, dateIso, time, found && !found.item.completed ? found.item.id : undefined); }}
                  onClick={() => { if (isEmpty) onCellClick(dateIso, time); }}
                >
                  {isCallBlock && (
                    <div className="task-card call-block" title="Standing block — return calls">
                      <div className="title">📞 Return calls</div>
                    </div>
                  )}
                  {found && found.isStart && (
                    <div
                      className={`task-card prio-${found.item.priority}${found.item.kind === 'MEETING' ? ' kind-meeting' : ''}${found.item.completed ? ' done' : ''}`}
                      style={{ borderLeftColor: found.item.colour }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, found.item.id)}
                      onClick={() => onSelectTask(found.item)}
                    >
                      <div className="title">{found.item.title}{subtaskBadge(found.item)}{attachmentBadge(found.item)}{found.item.readyToBill && <span className="bill-badge" title="Needs billing">💰</span>}</div>
                      <div className="client">{found.item.client}</div>
                      {found.item.kind === 'MEETING' ? (
                        <div className="hours">{found.item.startTime} · Meeting{found.item.location ? ` · ${found.item.location}` : ''}</div>
                      ) : (
                        <div className="hours">{found.item.startTime} · {found.item.remainingHours}h left</div>
                      )}
                      {found.item.kind === 'TASK' && !found.item.completed && (
                        <TimerControl
                          task={found.item}
                          onStart={() => onStartTimer(found.item.id)}
                          onStop={() => onStopTimer(found.item.id)}
                        />
                      )}
                    </div>
                  )}
                  {found && !found.isStart && (
                    <div
                      className={`task-card${found.item.kind === 'MEETING' ? ' kind-meeting' : ''}${found.item.completed ? ' done' : ''} continuation`}
                      style={{ borderLeftColor: found.item.colour, backgroundColor: `${found.item.colour}26` }}
                      title={found.item.title}
                      onClick={() => onSelectTask(found.item)}
                    />
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </>
  );
}

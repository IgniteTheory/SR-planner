import { Fragment, type DragEvent } from 'react';
import type { PlannerTask } from '../api/types';
import {
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
  onCellDrop: (taskId: number, dateIso: string, time: string) => void;
}

function subtaskBadge(t: PlannerTask) {
  if (!t.subtasks.length) return null;
  const done = t.subtasks.filter((s) => s.done).length;
  return <span className="subtask-badge">{done}/{t.subtasks.length}</span>;
}

export default function CentrePanel({ tasks, weekOffset, onWeekOffsetChange, centreView, onCentreViewChange, onSelectTask, onCellDrop }: Props) {
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

  function handleDrop(e: DragEvent, dateIso: string, time: string) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (id) onCellDrop(id, dateIso, time);
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
              return (
                <div
                  key={`${dateIso}-${time}`}
                  className={`cell${todayColClass}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, dateIso, time)}
                >
                  {found && found.isStart && (
                    <div
                      className={`task-card prio-${found.item.priority}${found.item.kind === 'MEETING' ? ' kind-meeting' : ''}${found.item.completed ? ' done' : ''}`}
                      style={{ borderLeftColor: found.item.colour }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, found.item.id)}
                      onClick={() => onSelectTask(found.item)}
                    >
                      <div className="title">{found.item.title}{subtaskBadge(found.item)}</div>
                      <div className="client">{found.item.client}</div>
                      {found.item.kind === 'MEETING' ? (
                        <div className="hours">Meeting{found.item.location ? ` · ${found.item.location}` : ''}</div>
                      ) : (
                        <div className="hours">{found.item.remainingHours}h left</div>
                      )}
                    </div>
                  )}
                  {found && !found.isStart && (
                    <div
                      className={`task-card${found.item.kind === 'MEETING' ? ' kind-meeting' : ''}${found.item.completed ? ' done' : ''} continuation`}
                      style={{ borderLeftColor: found.item.colour }}
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

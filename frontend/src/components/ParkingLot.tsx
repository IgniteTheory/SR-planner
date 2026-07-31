import type { DragEvent } from 'react';
import type { PlannerTask } from '../api/types';
import { fmtDate } from '../utils/time';

interface Props {
  tasks: PlannerTask[];
  onSelectTask: (task: PlannerTask) => void;
  onScheduleTask: (task: PlannerTask) => void;
  onEditTask: (task: PlannerTask) => void;
  onDeleteTask: (task: PlannerTask) => void;
}

export default function ParkingLot({ tasks, onSelectTask, onScheduleTask, onEditTask, onDeleteTask }: Props) {
  const parking = tasks
    .filter((t) => t.assignedTo === 'STEPHAN' && !t.completed && !t.scheduledDate)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.id - b.id;
    });

  function handleDragStart(e: DragEvent, id: number) {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <>
      {parking.length ? (
        <div className="parking-list">
          {parking.map((t) => (
            <div key={t.id} className="parking-card" draggable onDragStart={(e) => handleDragStart(e, t.id)} style={{ borderLeft: `4px solid ${t.colour}` }}>
              <div className="title" onClick={() => onSelectTask(t)}>{t.title}</div>
              <div className="client">{t.client}</div>
              <div className="meta"><span>{t.priority}</span><span>{t.remainingHours}h left</span></div>
              {t.dueDate && <div className="meta"><span>Due {fmtDate(t.dueDate)}</span><span /></div>}
              <div className="actions">
                <button className="btn btn-primary btn-sm" onClick={() => onScheduleTask(t)}>Schedule</button>
                <button className="btn btn-secondary btn-sm" onClick={() => onEditTask(t)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => onDeleteTask(t)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-note">Parking Lot is empty. Drag a task here, or add a new one.</div>
      )}
    </>
  );
}

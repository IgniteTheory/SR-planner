import type { DragEvent } from 'react';
import type { PlannerTask } from '../api/types';

const SHOW_LIMIT = 5;

interface Props {
  tasks: PlannerTask[];
  onSelectTask: (task: PlannerTask) => void;
  onViewAllDone: () => void;
  onDropComplete: (id: number) => void;
}

export default function DoneBox({ tasks, onSelectTask, onViewAllDone, onDropComplete }: Props) {
  const allDone = tasks
    .filter((t) => t.assignedTo === 'STEPHAN' && t.completed)
    .sort((a, b) => (b.completedAt ?? '') < (a.completedAt ?? '') ? -1 : 1);
  const shown = allDone.slice(0, SHOW_LIMIT);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (id) onDropComplete(id);
  }

  return (
    <div className="done-box" onDragOver={handleDragOver} onDrop={handleDrop}>
      <h2>Done</h2>
      {shown.length ? (
        <div className="parking-list">
          {shown.map((t) => (
            <div key={t.id} className="parking-card done-card" onClick={() => onSelectTask(t)} style={{ borderLeft: `4px solid ${t.colour}` }}>
              <div className="title">{t.title}</div>
              <div className="client">{t.client}</div>
            </div>
          ))}
          {allDone.length > SHOW_LIMIT && (
            <div className="link-note" onClick={onViewAllDone}>
              View all {allDone.length} done items →
            </div>
          )}
        </div>
      ) : (
        <div className="empty-note">Drag a task here from the calendar to mark it done.</div>
      )}
    </div>
  );
}

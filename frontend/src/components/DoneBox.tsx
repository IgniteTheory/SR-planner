import type { DragEvent } from 'react';
import type { PlannerTask } from '../api/types';
import { dayBucketLabel } from '../utils/time';

// Keeps the sidebar list from growing forever — anything older just drops
// off here (the full history is still in the Report modal).
const DONE_LIST_LIMIT = 30;

interface Props {
  tasks: PlannerTask[];
  onSelectTask: (task: PlannerTask) => void;
  onDropComplete: (id: number) => void;
}

export default function DoneBox({ tasks, onSelectTask, onDropComplete }: Props) {
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

  const done = tasks
    .filter((t): t is PlannerTask & { completedAt: string } => t.assignedTo === 'STEPHAN' && t.completed && !!t.completedAt)
    .sort((a, b) => (b.completedAt < a.completedAt ? -1 : 1))
    .slice(0, DONE_LIST_LIMIT);

  const groups: { label: string; items: typeof done }[] = [];
  for (const t of done) {
    const label = dayBucketLabel(t.completedAt);
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(t);
    else groups.push({ label, items: [t] });
  }

  return (
    <div className="done-box" onDragOver={handleDragOver} onDrop={handleDrop}>
      {done.length ? (
        <>
          {groups.map((g) => (
            <div key={g.label} className="done-date-group">
              <h4>{g.label}</h4>
              {g.items.map((t) => (
                <div
                  key={t.id}
                  className={`done-item${t.kind === 'MEETING' ? ' kind-meeting' : ''}`}
                  style={{ borderLeftColor: t.colour }}
                  onClick={() => onSelectTask(t)}
                >
                  <div className="t">{t.title}</div>
                  <div className="c">{t.client}</div>
                </div>
              ))}
            </div>
          ))}
          <div className="empty-note">Drag a task here from the calendar to mark it done, even if it's already marked done.</div>
        </>
      ) : (
        <div className="empty-note">Nothing completed yet. Drag a task here from the calendar to mark it done.</div>
      )}
    </div>
  );
}

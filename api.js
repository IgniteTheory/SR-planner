const PRIORITY_COLORS = {
  Low: '#8a8f98',
  Normal: '#3d7dd6',
  High: '#e8511a',
  Urgent: '#c62828',
}

export default function TaskCard({ task, onDragStart, onClick }) {
  const overBudget = task.actual_hours > task.estimated_hours && task.estimated_hours > 0

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onClick(task)}
    >
      <div className="task-card-top">
        <span
          className="priority-dot"
          style={{ background: PRIORITY_COLORS[task.priority] || '#8a8f98' }}
          title={task.priority}
        />
        <span className="task-client">{task.client}</span>
      </div>
      <div className="task-title">{task.task}</div>
      <div className="task-meta">
        <span className={overBudget ? 'hours-over' : ''}>
          {task.actual_hours}h / {task.estimated_hours}h
        </span>
        {task.due_date && <span className="task-due">Due {task.due_date}</span>}
      </div>
      <div className="task-status">{task.status}</div>
    </div>
  )
}

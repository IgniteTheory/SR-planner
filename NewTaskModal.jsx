import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import TaskCard from './TaskCard'
import NewTaskModal from './NewTaskModal'
import TaskDetailModal from './TaskDetailModal'
import CapacityBar from './CapacityBar'
import WaitingOnClient from './WaitingOnClient'

const COLUMNS = [
  { key: 'parking_lot', label: 'Parking Lot' },
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
]

export default function Planner() {
  const [tasks, setTasks] = useState([])
  const [today, setToday] = useState({ booked_hours: 0, capacity_hours: 8 })
  const [waiting, setWaiting] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const [taskList, todaySummary, waitingList] = await Promise.all([
        api.listTasks(),
        api.today(),
        api.waitingOnClient(),
      ])
      setTasks(taskList)
      setToday(todaySummary)
      setWaiting(waitingList)
      setError(null)
    } catch (err) {
      setError('Could not reach the backend. Is it running on port 8000?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCreate = async (payload) => {
    await api.createTask(payload)
    await refresh()
  }

  const handleSaveDetail = async (id, payload) => {
    await api.updateTask(id, payload)
    await refresh()
  }

  const handleDelete = async (id) => {
    await api.deleteTask(id)
    await refresh()
    return true
  }

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', String(task.id))
  }

  const handleDrop = async (e, columnKey) => {
    e.preventDefault()
    const id = parseInt(e.dataTransfer.getData('text/plain'), 10)
    const task = tasks.find((t) => t.id === id)
    if (!task || task.column === columnKey) return

    // Optimistic update so the drag feels instant.
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, column: columnKey } : t)))
    try {
      await api.moveTask(id, columnKey, 0)
      await refresh()
    } catch {
      refresh()
    }
  }

  const allowDrop = (e) => e.preventDefault()

  if (loading) return <div className="loading">Loading…</div>

  return (
    <div className="planner-page">
      <div className="planner-header">
        <CapacityBar booked={today.booked_hours} capacity={today.capacity_hours} />
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Task</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="planner-body">
        <div className="board">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.key)
            const colHours = colTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)
            return (
              <div
                key={col.key}
                className="board-column"
                onDragOver={allowDrop}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div className="board-column-header">
                  <span>{col.label}</span>
                  <span className="column-hours">{colHours}h</span>
                </div>
                <div className="board-column-cards">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={handleDragStart}
                      onClick={setEditingTask}
                    />
                  ))}
                  {colTasks.length === 0 && <div className="column-empty">Drop tasks here</div>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="planner-sidebar-right">
          <WaitingOnClient clients={waiting} />
        </div>
      </div>

      {showNew && (
        <NewTaskModal onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
      {editingTask && (
        <TaskDetailModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveDetail}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

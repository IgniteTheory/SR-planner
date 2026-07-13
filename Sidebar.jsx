import { useState } from 'react'

const STATUSES = ['Not Started', 'In Progress', 'Waiting on Client', 'Done']
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent']

export default function TaskDetailModal({ task, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    client: task.client,
    task: task.task,
    estimated_hours: task.estimated_hours,
    actual_hours: task.actual_hours,
    due_date: task.due_date || '',
    status: task.status,
    priority: task.priority,
  })
  const [saving, setSaving] = useState(false)

  const update = (field) => (e) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    setForm({ ...form, [field]: value })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(task.id, { ...form, due_date: form.due_date || null })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-detail" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Task</h3>

        <label>Client</label>
        <input value={form.client} onChange={update('client')} />

        <label>Task</label>
        <input value={form.task} onChange={update('task')} />

        <div className="modal-row">
          <div>
            <label>Estimated Hours</label>
            <input type="number" step="0.25" value={form.estimated_hours} onChange={update('estimated_hours')} />
          </div>
          <div>
            <label>Actual Hours</label>
            <input type="number" step="0.25" value={form.actual_hours} onChange={update('actual_hours')} />
          </div>
        </div>

        <label>Due Date</label>
        <input type="date" value={form.due_date} onChange={update('due_date')} />

        <div className="modal-row">
          <div>
            <label>Status</label>
            <select value={form.status} onChange={update('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label>Priority</label>
            <select value={form.priority} onChange={update('priority')}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-danger" onClick={() => onDelete(task.id).then(onClose)}>
            Delete
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

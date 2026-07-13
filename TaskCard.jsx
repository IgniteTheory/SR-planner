import { useState } from 'react'

export default function NewTaskModal({ onClose, onCreate }) {
  const [client, setClient] = useState('')
  const [task, setTask] = useState('')
  const [hours, setHours] = useState('')
  const [due, setDue] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = client.trim() && task.trim() && !saving

  const handleSave = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    try {
      await onCreate({
        client: client.trim(),
        task: task.trim(),
        estimated_hours: hours ? parseFloat(hours) : 0,
        due_date: due || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-quick" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
        <h3>New Task</h3>

        <label>Client</label>
        <input autoFocus value={client} onChange={(e) => setClient(e.target.value)} placeholder="ABC Manufacturing" />

        <label>Task</label>
        <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Reconcile VAT" />

        <label>Hours</label>
        <input
          type="number"
          step="0.25"
          min="0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="2.0"
        />

        <label>Due</label>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

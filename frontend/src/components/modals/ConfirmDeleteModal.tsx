import { useState } from 'react';
import type { PlannerTask } from '../../api/types';

interface Props {
  task: PlannerTask;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export default function ConfirmDeleteModal({ task, onCancel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Delete {task.kind === 'MEETING' ? 'Meeting' : 'Task'}</h2>
        <p className="prompt-text">Delete "{task.title}"{task.client ? ` for ${task.client}` : ''}? This cannot be undone.</p>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={busy}>Delete</button>
        </div>
      </div>
    </div>
  );
}

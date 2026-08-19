import { useState } from 'react';
import type { PlannerTask } from '../../api/types';

interface Props {
  task: PlannerTask;
  onCancel: () => void;
  onSave: (values: { description: string; hours: number; amount: number | null }) => void;
}

export default function BillingQuoteModal({ task, onCancel, onSave }: Props) {
  const [description, setDescription] = useState(task.billingDescription ?? '');
  const [hours, setHours] = useState(task.billingHours ?? task.actualHours ?? '');
  const [amount, setAmount] = useState(task.billingAmount ?? '');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!description.trim()) {
      setError('Enter a description of the work.');
      return;
    }
    const h = Number(hours);
    if (!h || h <= 0) {
      setError('Enter the hours being billed.');
      return;
    }
    const amt = amount === '' ? null : Number(amount);
    if (amt !== null && (!Number.isFinite(amt) || amt < 0)) {
      setError('Enter a valid amount, or leave it blank.');
      return;
    }
    onSave({ description: description.trim(), hours: h, amount: amt });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{task.readyToBill ? 'Edit Quote' : 'Bill Client'}</h2>
        <p className="prompt-text">&ldquo;{task.title}&rdquo;{task.client ? ` — ${task.client}` : ''}</p>

        <label>Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What the work covered..."
            autoFocus
          />
        </label>
        <label>Hours being billed
          <input type="number" min={0} step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label>Amount (R) <span style={{ fontWeight: 400 }}>(optional — leave blank if waiting on a price)</span>
          <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}

import type { PlannerTask } from '../api/types';

interface Props {
  tasks: PlannerTask[];
  onSelectTask: (task: PlannerTask) => void;
  onMarkBilled: (id: number) => void;
  onMarkLegacyBilled: (id: number) => void;
}

export default function BillingBox({ tasks, onSelectTask, onMarkBilled, onMarkLegacyBilled }: Props) {
  // Quotes captured via the current flow (Bill button / completion prompt) —
  // the real Stephan task itself carries the quote, so "View" just opens it.
  const quoted = tasks.filter((t) => t.assignedTo === 'STEPHAN' && t.readyToBill && !t.billed);

  // Older "Bill client for X" placeholder tasks from before quotes existed —
  // kept visible and actionable here so nothing already in the pipeline gets
  // silently lost; no linked task to view since none was ever recorded.
  const legacy = tasks.filter((t) => t.assignedTo === 'CHANEL' && t.isBillingItem && !t.completed);

  if (!quoted.length && !legacy.length) {
    return <div className="empty-note">Nothing waiting to be billed.</div>;
  }

  return (
    <div className="parking-list">
      {quoted.map((t) => (
        <div key={t.id} className="parking-card" style={{ borderLeft: `4px solid ${t.colour}` }}>
          <div className="title">{t.title}</div>
          <div className="client">{t.client}</div>
          {t.billingDescription && <div className="billing-desc">{t.billingDescription}</div>}
          <div className="meta">
            <span>{t.billingHours ?? t.actualHours}h</span>
            <span>{t.billingAmount ? `R${t.billingAmount}` : 'Amount pending'}</span>
          </div>
          <div className="actions">
            <button className="btn btn-secondary btn-sm" onClick={() => onSelectTask(t)}>View</button>
            <button className="btn btn-primary btn-sm" onClick={() => onMarkBilled(t.id)}>Mark Billed</button>
          </div>
        </div>
      ))}
      {legacy.map((t) => (
        <div key={t.id} className="parking-card" style={{ borderLeft: `4px solid ${t.colour}` }}>
          <div className="title">{t.title}</div>
          <div className="client">{t.client}{t.billingAmount ? ` · R${t.billingAmount}` : ''}</div>
          <div className="actions">
            <button className="btn btn-primary btn-sm" onClick={() => onMarkLegacyBilled(t.id)}>Mark Billed</button>
          </div>
        </div>
      ))}
    </div>
  );
}

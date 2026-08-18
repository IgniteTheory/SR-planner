import type { PlannerTask } from '../api/types';

interface Props {
  tasks: PlannerTask[];
  onMarkBilled: (id: number) => void;
}

export default function BillingBox({ tasks, onMarkBilled }: Props) {
  const items = tasks.filter((t) => t.assignedTo === 'CHANEL' && t.isBillingItem && !t.completed);

  return (
    <>
      {items.length ? (
        <div className="parking-list">
          {items.map((t) => (
            <div key={t.id} className="parking-card" style={{ borderLeft: `4px solid ${t.colour}` }}>
              <div className="title">{t.title}</div>
              <div className="client">{t.client}{t.billingAmount ? ` · R${t.billingAmount}` : ''}</div>
              <div className="actions">
                <button className="btn btn-primary btn-sm" onClick={() => onMarkBilled(t.id)}>Mark Billed</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-note">Nothing waiting to be billed.</div>
      )}
    </>
  );
}

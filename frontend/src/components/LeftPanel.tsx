import { useState, type KeyboardEvent, type ReactNode } from 'react';
import type { ChanelStatus, PhoneSlip, PlannerTask } from '../api/types';

const CHANEL_COLUMNS: { key: ChanelStatus; label: string }[] = [
  { key: 'DOING', label: 'Doing' },
  { key: 'TO_DO', label: 'To Do' },
  { key: 'DONE', label: 'Done' },
];
const CHANEL_DONE_LIMIT = 3;

interface Props {
  tasks: PlannerTask[];
  phoneSlips: PhoneSlip[];
  onSelectTask: (task: PlannerTask) => void;
  onAddPhoneSlip: (text: string) => void;
  onTogglePhoneSlip: (id: number, done: boolean) => void;
  onDeletePhoneSlip: (id: number) => void;
  onConvertSlipToTask: (slip: PhoneSlip) => void;
  onQuickAddChanelTask: (text: string) => void;
  onSetChanelStatus: (id: number, status: ChanelStatus) => void;
  onContinueTomorrowChanel: (id: number) => void;
  onDeleteTask: (task: PlannerTask) => void;
  onViewAllDone: () => void;
}

export default function LeftPanel({
  tasks,
  phoneSlips,
  onSelectTask,
  onAddPhoneSlip,
  onTogglePhoneSlip,
  onDeletePhoneSlip,
  onConvertSlipToTask,
  onQuickAddChanelTask,
  onSetChanelStatus,
  onContinueTomorrowChanel,
  onDeleteTask,
  onViewAllDone,
}: Props) {
  const [slipInput, setSlipInput] = useState('');
  const [quickAddInput, setQuickAddInput] = useState('');

  const topPriorities = tasks.filter((t) => t.assignedTo === 'STEPHAN' && !t.completed && t.priority === 'HIGH');
  const chanelTasks = tasks.filter((t) => t.assignedTo === 'CHANEL' && !t.completed);

  function handleSlipKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && slipInput.trim()) {
      onAddPhoneSlip(slipInput.trim());
      setSlipInput('');
    }
  }

  function handleQuickAddKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && quickAddInput.trim()) {
      onQuickAddChanelTask(quickAddInput.trim());
      setQuickAddInput('');
    }
  }

  return (
    <div className="panel">
      <div className="person-block">
        <div className="person-name">Stephan</div>
        <h3>Top Priorities</h3>
        {topPriorities.length ? (
          <div className="mini-list">
            {topPriorities.map((t) => (
              <div key={t.id} className="mini-task" style={{ borderLeftColor: t.colour }} onClick={() => onSelectTask(t)}>
                <div className="t">{t.title}{t.subtasks.length > 0 && (
                  <span className="subtask-badge">{t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}</span>
                )}</div>
                <div className="c">{t.client}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-note">No high priority tasks.</div>
        )}

        <h3>Phone Slips</h3>
        {phoneSlips.length ? (
          phoneSlips.map((p) => (
            <div key={p.id} className={`phone-slip${p.done ? ' done' : ''}`}>
              <input type="checkbox" checked={p.done} onChange={() => onTogglePhoneSlip(p.id, !p.done)} />
              <span className="txt">{p.text}</span>
              <button className="convert-btn" onClick={() => onConvertSlipToTask(p)} title="Convert to task">→ Task</button>
              <button onClick={() => onDeletePhoneSlip(p.id)} title="Delete">×</button>
            </div>
          ))
        ) : (
          <div className="empty-note">No phone slips.</div>
        )}
        <div className="phone-slip-add">
          <input
            type="text"
            placeholder="New phone slip..."
            value={slipInput}
            onChange={(e) => setSlipInput(e.target.value)}
            onKeyDown={handleSlipKey}
          />
        </div>
      </div>

      <hr className="divider" />

      <div className="person-block">
        <div className="person-name">Chanel</div>
        <div className="chanel-cols">
          {CHANEL_COLUMNS.map((col) => {
            let items = chanelTasks.filter((t) => (t.chanelStatus ?? 'TO_DO') === col.key);
            let doneLink: ReactNode = null;
            if (col.key === 'DONE') {
              const totalDone = items.length;
              items = items
                .slice()
                .sort((a, b) => (b.completedAt ?? '') < (a.completedAt ?? '') ? -1 : 1)
                .slice(0, CHANEL_DONE_LIMIT);
              if (totalDone > CHANEL_DONE_LIMIT) {
                doneLink = (
                  <div className="link-note" onClick={onViewAllDone}>
                    View all {totalDone} done items →
                  </div>
                );
              }
            }
            return (
              <div className="chanel-col" key={col.key}>
                <h4>{col.label}</h4>
                {col.key === 'TO_DO' && (
                  <div className="phone-slip-add" style={{ marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder="Quick add to-do..."
                      value={quickAddInput}
                      onChange={(e) => setQuickAddInput(e.target.value)}
                      onKeyDown={handleQuickAddKey}
                    />
                  </div>
                )}
                {items.length ? (
                  items.map((t) => (
                    <div key={t.id} className={`chanel-task${col.key === 'DONE' ? ' done' : ''}`} style={{ borderLeftColor: t.colour }}>
                      <div className="t" onClick={() => onSelectTask(t)}>
                        {t.title}
                        {t.subtasks.length > 0 && (
                          <span className="subtask-badge">{t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}</span>
                        )}
                      </div>
                      {t.client && <div className="c">{t.client}</div>}
                      <div className="chanel-actions">
                        {CHANEL_COLUMNS.map((s) => (
                          <button
                            key={s.key}
                            className={s.key === col.key ? 'active' : ''}
                            onClick={() => onSetChanelStatus(t.id, s.key)}
                          >
                            {s.label}
                          </button>
                        ))}
                        {col.key !== 'DONE' && (
                          <button onClick={() => onContinueTomorrowChanel(t.id)}>Continue Tmrw</button>
                        )}
                        <button onClick={() => onDeleteTask(t)}>Del</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-note">Empty</div>
                )}
                {doneLink}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

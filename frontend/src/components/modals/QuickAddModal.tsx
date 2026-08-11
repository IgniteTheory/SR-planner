import { fmtDate } from '../../utils/time';

interface Props {
  dateIso: string;
  time: string;
  onClose: () => void;
  onPick: (kind: 'TASK' | 'MEETING' | 'CHANEL_TODO') => void;
}

export default function QuickAddModal({ dateIso, time, onClose, onPick }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320 }}>
        <h2>Add for {fmtDate(dateIso)} at {time}</h2>
        <div className="modal-actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => onPick('TASK')}>+ Task</button>
          <button className="btn btn-primary" onClick={() => onPick('MEETING')}>+ Meeting</button>
          <button className="btn btn-secondary" onClick={() => onPick('CHANEL_TODO')}>+ Chanel To-Do</button>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

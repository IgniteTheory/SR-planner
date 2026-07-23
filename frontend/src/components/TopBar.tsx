import { useAlarmToggle } from '../hooks/useAlarms';

interface Props {
  userName: string;
  onLogout: () => void;
  onOpenReport: () => void;
  onOpenImport: () => void;
  onOpenNewMeeting: () => void;
  onOpenNewTask: () => void;
}

export default function TopBar({ userName, onLogout, onOpenReport, onOpenImport, onOpenNewMeeting, onOpenNewTask }: Props) {
  const { enabled, toggle } = useAlarmToggle();
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="topbar">
      <h1>SR Planner</h1>
      <div className="actions">
        <span className="date">{today}</span>
        <button className="btn btn-light" onClick={toggle}>{enabled ? '🔔 Alarms: On' : '🔕 Alarms: Off'}</button>
        <button className="btn btn-light" onClick={onOpenImport} title="Load a backup exported from the old single-file app">Import Backup</button>
        <button className="btn btn-light" onClick={onOpenReport}>Report</button>
        <button className="btn btn-light" onClick={onOpenNewMeeting}>+ Add Meeting</button>
        <button className="btn btn-light" onClick={onOpenNewTask}>+ Add Task</button>
        <button className="btn btn-light" onClick={onLogout} title={userName}>Sign out</button>
      </div>
    </header>
  );
}

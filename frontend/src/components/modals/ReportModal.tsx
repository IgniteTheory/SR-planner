import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { PlannerTask } from '../../api/types';

interface ReportResponse {
  billable: PlannerTask[];
  chanelDone: PlannerTask[];
  totalHours: number;
}

interface Props {
  onClose: () => void;
  onRestoreTask: (id: number) => Promise<void>;
  onRestoreChanelTask: (id: number) => Promise<void>;
}

function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        })
        .join(',')
    )
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportModal({ onClose, onRestoreTask, onRestoreChanelTask }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get<ReportResponse>(`/report?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load report');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadReportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [['Client', 'Task', 'Budget Hours', 'Actual Hours', 'Due Date', 'Completed At']];
    data.billable.forEach((t) => rows.push([t.client, t.title, t.budgetHours, t.actualHours, t.dueDate ?? '', t.completedAt ?? '']));
    downloadCsv(rows, 'sr-planner-billing-report.csv');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Completed Items &amp; Billing Report</h2>
        <h3>Stephan — Billing Report</h3>
        <div className="row2">
          <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 0 }}>
          <button className="btn btn-secondary btn-sm" onClick={load}>Apply</button>
          <button className="btn btn-primary btn-sm" onClick={downloadReportCsv}>Download CSV</button>
        </div>

        {error && <div className="form-error">{error}</div>}

        {data && (
          <>
            <div className="stat-row"><span><b>Total billable hours</b></span><b>{data.totalHours}h</b></div>
            {data.billable.length ? (
              data.billable.map((t) => (
                <div className="stat-row" key={t.id}>
                  <span>
                    {t.client} — {t.title}
                    <br />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                      {t.completedAt ? new Date(t.completedAt).toLocaleString() : ''}
                    </span>
                  </span>
                  <b>{t.actualHours}h</b>
                  <button className="btn btn-secondary btn-sm" onClick={() => onRestoreTask(t.id).then(load)}>Restore</button>
                </div>
              ))
            ) : (
              <div className="empty-note">No completed tasks in range.</div>
            )}

            <h3 style={{ marginTop: 16 }}>Chanel — Done Archive (all-time)</h3>
            {data.chanelDone.length ? (
              data.chanelDone.map((t) => (
                <div className="stat-row" key={t.id}>
                  <span>
                    {t.title}{t.client ? ` — ${t.client}` : ''}
                    <br />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                      {t.completedAt ? new Date(t.completedAt).toLocaleString() : ''}
                    </span>
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => onRestoreChanelTask(t.id).then(load)}>Restore</button>
                </div>
              ))
            ) : (
              <div className="empty-note">No completed Chanel items yet.</div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

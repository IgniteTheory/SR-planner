import { useState } from 'react';
import { api, ApiError } from '../../api/client';

interface Props {
  onClose: () => void;
  onImported: () => Promise<void>;
}

export default function ImportModal({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ importedTasks: number; importedSlips: number } | null>(null);

  async function handleImport() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await api.post<{ importedTasks: number; importedSlips: number }>('/import', parsed);
      setResult(res);
      await onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not read or import that file.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Import Backup</h2>
        <p className="prompt-text">
          Load a backup exported from the old single-file SR Planner (the ⬇ Export button there). This
          only ever adds items — safe to run more than once.
        </p>
        <label>Backup file (.json)
          <input type="file" accept="application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        {error && <div className="form-error">{error}</div>}
        {result && (
          <div className="stat-row">
            <span>Imported</span>
            <b>{result.importedTasks} tasks, {result.importedSlips} phone slips</b>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button className="btn btn-primary" onClick={handleImport} disabled={!file || submitting}>
              {submitting ? 'Importing…' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

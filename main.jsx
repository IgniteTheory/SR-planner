* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #f4f5f7;
  color: #1c1e21;
}

.app-shell {
  display: flex;
  height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 210px;
  background: #14161a;
  color: #e6e7ea;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  flex-shrink: 0;
}
.sidebar-brand {
  font-weight: 700;
  font-size: 18px;
  padding: 8px 12px 24px;
  letter-spacing: 0.3px;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: none;
  border: none;
  color: #c7c9cf;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  margin-bottom: 4px;
}
.sidebar-item:hover { background: #23262c; color: #fff; }
.sidebar-item.active { background: #e8511a; color: #fff; }
.sidebar-icon { font-size: 15px; width: 18px; }

/* Main area */
.main-area {
  flex: 1;
  overflow: auto;
  padding: 24px 28px;
}

.planner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

/* Capacity bar */
.capacity-block { flex: 1; max-width: 420px; }
.capacity-label { font-size: 13px; font-weight: 600; color: #55585e; margin-bottom: 6px; }
.capacity-bar-track {
  height: 10px;
  background: #e2e4e8;
  border-radius: 999px;
  overflow: hidden;
}
.capacity-bar-fill {
  height: 100%;
  background: #e8511a;
  transition: width 0.25s ease;
}
.capacity-bar-fill.over { background: #c62828; }
.capacity-hours { font-size: 12px; color: #7a7d84; margin-top: 4px; }
.capacity-hours.over-text { color: #c62828; font-weight: 600; }

/* Buttons */
.btn-primary {
  background: #e8511a;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #cf4614; }
.btn-ghost {
  background: none;
  border: 1px solid #d5d7db;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.btn-danger {
  background: none;
  border: 1px solid #c62828;
  color: #c62828;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

/* Board */
.planner-body { display: flex; gap: 20px; align-items: flex-start; }
.board {
  display: grid;
  grid-template-columns: repeat(6, minmax(180px, 1fr));
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.board-column {
  background: #eceef1;
  border-radius: 10px;
  padding: 10px;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}
.board-column-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #3a3d43;
  padding: 4px 4px 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.column-hours { color: #8a8f98; font-weight: 600; }
.board-column-cards { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.column-empty {
  font-size: 12px;
  color: #a3a6ac;
  text-align: center;
  padding: 20px 4px;
  border: 1px dashed #cfd2d8;
  border-radius: 8px;
}

/* Task card */
.task-card {
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
  cursor: grab;
}
.task-card:active { cursor: grabbing; }
.task-card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.priority-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.task-client { font-size: 11px; font-weight: 700; color: #6a6d73; text-transform: uppercase; letter-spacing: 0.2px; }
.task-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; line-height: 1.3; }
.task-meta { display: flex; justify-content: space-between; font-size: 12px; color: #7a7d84; margin-bottom: 4px; }
.hours-over { color: #c62828; font-weight: 700; }
.task-due { color: #7a7d84; }
.task-status { font-size: 11px; color: #e8511a; font-weight: 600; }

/* Waiting on client */
.planner-sidebar-right { width: 220px; flex-shrink: 0; }
.waiting-block {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}
.waiting-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; color: #3a3d43; }
.waiting-block ul { list-style: none; padding: 0; margin: 0; }
.waiting-block li { font-size: 13px; padding: 6px 0; border-top: 1px solid #eee; }
.waiting-block li:first-child { border-top: none; }
.waiting-empty { font-size: 12px; color: #a3a6ac; }

/* Modals */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
}
.modal-quick, .modal-detail {
  background: #fff;
  border-radius: 12px;
  padding: 22px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.modal-detail { width: 380px; }
.modal-quick h3, .modal-detail h3 { margin: 0 0 10px; font-size: 16px; }
.modal-quick label, .modal-detail label {
  font-size: 12px; font-weight: 600; color: #55585e; margin-top: 8px;
}
.modal-quick input, .modal-detail input, .modal-detail select {
  padding: 8px 10px;
  border: 1px solid #d5d7db;
  border-radius: 6px;
  font-size: 14px;
}
.modal-row { display: flex; gap: 12px; }
.modal-row > div { flex: 1; display: flex; flex-direction: column; }
.modal-actions { display: flex; gap: 8px; margin-top: 18px; justify-content: flex-end; }

.loading, .error-banner, .coming-soon { padding: 20px; color: #55585e; }
.error-banner { background: #fdecea; color: #c62828; border-radius: 8px; margin-bottom: 16px; }
.coming-soon h2 { margin-top: 0; }

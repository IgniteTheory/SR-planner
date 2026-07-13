const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'planner', label: 'Planner', icon: '📅' },
  { key: 'clients', label: 'Clients', icon: '👥' },
  { key: 'reports', label: 'Reports', icon: '📊' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">SR Planner</div>
      <nav>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${active === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

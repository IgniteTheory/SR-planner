export default function CapacityBar({ booked, capacity }) {
  const pct = capacity > 0 ? Math.min(100, (booked / capacity) * 100) : 0
  const over = booked > capacity

  return (
    <div className="capacity-block">
      <div className="capacity-label">Today's Capacity</div>
      <div className="capacity-bar-track">
        <div
          className={`capacity-bar-fill ${over ? 'over' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`capacity-hours ${over ? 'over-text' : ''}`}>
        {booked} / {capacity} Hours{over ? ' — over capacity' : ''}
      </div>
    </div>
  )
}

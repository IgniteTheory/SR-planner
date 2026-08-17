interface Props {
  title: string;
  onStillWorking: () => void;
  onStop: () => void;
}

export default function TimerCheckInModal({ title, onStillWorking, onStop }: Props) {
  return (
    <div className="modal-overlay" onClick={onStillWorking}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Still working?</h2>
        <p className="prompt-text">The timer on &ldquo;{title}&rdquo; has been running a while. Still working on it?</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onStop}>No, stop timer</button>
          <button className="btn btn-primary" onClick={onStillWorking}>Yes, keep going</button>
        </div>
      </div>
    </div>
  );
}

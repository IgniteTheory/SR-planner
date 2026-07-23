interface Props {
  title: string;
  onSkip: () => void;
  onAddTask: () => void;
}

export default function FollowUpPromptModal({ title, onSkip, onAddTask }: Props) {
  return (
    <div className="modal-overlay" onClick={onSkip}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Meeting Completed</h2>
        <p className="prompt-text">Add a follow-up task for &ldquo;{title}&rdquo;?</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onSkip}>No, Skip</button>
          <button className="btn btn-primary" onClick={onAddTask}>Add Follow-up Task</button>
        </div>
      </div>
    </div>
  );
}

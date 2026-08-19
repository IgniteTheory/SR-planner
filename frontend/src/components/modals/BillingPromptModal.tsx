interface Props {
  title: string;
  onNo: () => void;
  onYes: () => void;
}

export default function BillingPromptModal({ title, onNo, onYes }: Props) {
  return (
    <div className="modal-overlay" onClick={onNo}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Billing</h2>
        <p className="prompt-text">Must &ldquo;{title}&rdquo; be billed?</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onNo}>No</button>
          <button className="btn btn-primary" onClick={onYes}>Yes</button>
        </div>
      </div>
    </div>
  );
}

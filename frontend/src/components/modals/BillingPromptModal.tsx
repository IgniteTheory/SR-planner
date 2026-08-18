import { useState } from 'react';

interface Props {
  title: string;
  onSkip: () => void;
  onConfirm: (amount: number) => void;
}

export default function BillingPromptModal({ title, onSkip, onConfirm }: Props) {
  const [step, setStep] = useState<'ask' | 'amount'>('ask');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submitAmount() {
    const n = Number(amount);
    if (!n || n <= 0) {
      setError('Enter a valid Rand amount.');
      return;
    }
    onConfirm(n);
  }

  return (
    <div className="modal-overlay" onClick={onSkip}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Billing</h2>
        {step === 'ask' ? (
          <>
            <p className="prompt-text">Must &ldquo;{title}&rdquo; be billed?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onSkip}>No</button>
              <button className="btn btn-primary" onClick={() => setStep('amount')}>Yes</button>
            </div>
          </>
        ) : (
          <>
            <label>Amount (R)
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onSkip}>Cancel</button>
              <button className="btn btn-primary" onClick={submitAmount}>Save</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';

interface ChallengeModalProps {
  isOpen: boolean;
  claimText: string;
  onSubmit: (title: string, rationale: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ChallengeModal({
  isOpen,
  claimText,
  onSubmit,
  onCancel,
  isLoading = false,
}: ChallengeModalProps) {
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim() || !rationale.trim()) {
      alert('Please fill in both fields');
      return;
    }
    onSubmit(title, rationale);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-black border border-crt-border p-6 max-w-2xl w-full mx-4 font-mono">
        <h2 className="text-2xl font-bold mb-4 text-crt-fg">CREATE CHALLENGE</h2>

        <div className="mb-6 p-4 bg-black border border-crt-border">
          <p className="text-sm text-crt-muted mb-2">CLAIM BEING CHALLENGED:</p>
          <p className="text-crt-fg italic">{claimText}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-crt-fg mb-2">Challenge Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 'Questionable Statistical Claim'"
              className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg focus:outline-none focus:ring-2 focus:ring-crt-accent"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-crt-fg mb-2">Rationale</label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why are you challenging this claim? What concerns do you have?"
              rows={4}
              className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg focus:outline-none focus:ring-2 focus:ring-crt-accent"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-crt-accent text-black font-bold hover:bg-crt-fg disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Creating Challenge...' : 'Create Challenge'}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-crt-border text-crt-fg hover:bg-crt-border disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

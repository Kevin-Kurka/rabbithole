interface VoteWidgetProps {
  communityScore: number;
  userVote: 'for' | 'against' | null;
  onVote: (side: 'for' | 'against') => void;
  loading?: boolean;
}

export function VoteWidget({ communityScore, userVote, onVote, loading = false }: VoteWidgetProps) {
  const forVotes = Math.max(0, communityScore);
  const againstVotes = Math.max(0, -communityScore);
  const totalVotes = forVotes + againstVotes;

  return (
    <div className="bg-black border border-crt-border p-4 flex items-center justify-center gap-4 font-mono">
      <button
        disabled={userVote !== null || loading}
        onClick={() => onVote('for')}
        className={`px-4 py-2 font-medium transition-colors text-sm ${
          userVote === 'for'
            ? 'bg-crt-selection border border-crt-fg text-crt-fg cursor-not-allowed'
            : userVote || loading
            ? 'bg-black border border-crt-dim text-crt-dim cursor-not-allowed'
            : 'bg-crt-selection border border-crt-fg text-crt-fg hover:bg-crt-border'
        }`}
      >
        {userVote === 'for' ? '[ + SUPPORTED ]' : '[ + SUPPORT ]'}
      </button>

      <div className="flex flex-col items-center gap-1 text-crt-fg">
        <span className="text-2xl font-bold">{forVotes}</span>
        <span className="text-xs text-crt-muted">{totalVotes} votes</span>
        <span className="text-2xl font-bold mt-1">{againstVotes}</span>
      </div>

      <button
        disabled={userVote !== null || loading}
        onClick={() => onVote('against')}
        className={`px-4 py-2 font-medium transition-colors text-sm ${
          userVote === 'against'
            ? 'bg-black border border-crt-error text-crt-error cursor-not-allowed'
            : userVote || loading
            ? 'bg-black border border-crt-dim text-crt-dim cursor-not-allowed'
            : 'bg-black border border-crt-error text-crt-error hover:bg-black'
        }`}
      >
        {userVote === 'against' ? '[ − DISMISSED ]' : '[ − DISMISS ]'}
      </button>
    </div>
  );
}

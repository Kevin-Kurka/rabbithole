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
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-center gap-4">
      <button
        disabled={userVote !== null || loading}
        onClick={() => onVote('for')}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          userVote === 'for'
            ? 'bg-green-100 text-green-700 cursor-not-allowed'
            : userVote || loading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {userVote === 'for' ? '✓ Supported' : 'Support Challenge'}
      </button>

      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-bold text-gray-800">{forVotes}</span>
        <span className="text-xs text-gray-500">{totalVotes} votes</span>
        <span className="text-2xl font-bold text-gray-800 mt-1">{againstVotes}</span>
      </div>

      <button
        disabled={userVote !== null || loading}
        onClick={() => onVote('against')}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          userVote === 'against'
            ? 'bg-red-100 text-red-700 cursor-not-allowed'
            : userVote || loading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600'
        }`}
      >
        {userVote === 'against' ? '✕ Dismissed' : 'Dismiss Challenge'}
      </button>
    </div>
  );
}

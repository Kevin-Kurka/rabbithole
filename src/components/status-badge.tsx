import type { ClaimProps, ChallengeProps, EvidenceProps } from '../lib/types';

type Status = ClaimProps['status'] | ChallengeProps['status'] | ChallengeProps['verdict'] | EvidenceProps['status'];

interface StatusBadgeProps {
  status: Status;
  type?: 'claim' | 'challenge' | 'evidence' | 'verdict';
  className?: string;
}

export function StatusBadge({ status, type = 'claim', className = '' }: StatusBadgeProps) {
  const getColor = (): string => {
    // Claim statuses
    if (status === 'verified') return 'bg-green-100 text-green-800';
    if (status === 'debunked') return 'bg-red-100 text-red-800';
    if (status === 'challenged' || status === 'contested') return 'bg-yellow-100 text-yellow-800';
    if (status === 'unchallenged' || status === 'pending') return 'bg-gray-100 text-gray-800';

    // Challenge statuses
    if (status === 'open') return 'bg-blue-100 text-blue-800';
    if (status === 'in_review') return 'bg-purple-100 text-purple-800';
    if (status === 'resolved') return 'bg-green-100 text-green-800';

    // Verdict verdicts
    if (status === 'insufficient_evidence') return 'bg-gray-100 text-gray-800';

    return 'bg-gray-100 text-gray-800';
  };

  const getLabel = (): string => {
    if (status === 'unchallenged') return 'Unchallenged';
    if (status === 'insufficient_evidence') return 'Insufficient Evidence';
    if (status === 'in_review') return 'In Review';
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getColor()} ${className}`}>
      {getLabel()}
    </span>
  );
}

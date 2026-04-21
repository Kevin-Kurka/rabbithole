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
    if (status === 'verified') return 'bg-black border border-crt-fg text-crt-fg';
    if (status === 'debunked') return 'bg-black border border-crt-error text-crt-error';
    if (status === 'challenged' || status === 'contested') return 'bg-black border border-crt-warning text-crt-warning';
    if (status === 'unchallenged' || status === 'pending') return 'bg-black border border-crt-muted text-crt-muted';

    // Challenge statuses
    if (status === 'open') return 'bg-black border border-crt-info text-crt-info';
    if (status === 'in_review') return 'bg-black border border-crt-muted text-crt-muted';
    if (status === 'resolved') return 'bg-black border border-crt-fg text-crt-fg';

    // Verdict verdicts
    if (status === 'insufficient_evidence') return 'bg-black border border-crt-muted text-crt-muted';

    return 'bg-black border border-crt-muted text-crt-muted';
  };

  const getLabel = (): string => {
    if (status === 'unchallenged') return '[UNCHALLENGED]';
    if (status === 'insufficient_evidence') return '[INSUFFICIENT EVIDENCE]';
    if (status === 'in_review') return '[IN REVIEW]';
    if (status === 'verified') return '[VERIFIED]';
    if (status === 'debunked') return '[DEBUNKED]';
    if (status === 'challenged' || status === 'contested') return '[CHALLENGED]';
    return '[' + status.toUpperCase().replace(/_/g, ' ') + ']';
  };

  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-medium font-mono ${getColor()} ${className}`}>
      {getLabel()}
    </span>
  );
}

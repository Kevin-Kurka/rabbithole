import { useState } from 'react';
import { StatusBadge } from './status-badge';
import type { Evidence } from '../lib/types';

interface EvidenceCardProps {
  evidence: Evidence;
  onChallenge: (id: string) => void;
}

export function EvidenceCard({ evidence, onChallenge }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const props = evidence.properties;

  const sourceTypeBadgeColor = {
    'primary_source': 'bg-black border border-crt-info text-crt-info',
    'document': 'bg-black border border-crt-muted text-crt-muted',
    'data': 'bg-black border border-crt-fg text-crt-fg',
    'testimony': 'bg-black border border-crt-warning text-crt-warning',
    'expert_opinion': 'bg-black border border-crt-fg text-crt-fg',
    'media': 'bg-black border border-crt-muted text-crt-muted',
    'academic': 'bg-black border border-crt-fg text-crt-fg',
  }[props.source_type] || 'bg-black border border-crt-muted text-crt-muted';

  const borderColor = props.side === 'for' ? 'border-l-4 border-l-crt-fg' : 'border-l-4 border-l-crt-error';

  return (
    <div className={`bg-black p-4 ${borderColor} border border-crt-border hover:border-crt-fg transition-colors font-mono`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-crt-fg mb-1">{props.title}</h4>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block px-2 py-1 text-xs font-medium ${sourceTypeBadgeColor}`}>
              [{props.source_type.replace(/_/g, ' ').toUpperCase()}]
            </span>
            <StatusBadge status={props.status} type="evidence" className="text-xs" />
          </div>
        </div>
        <div className={`flex items-center justify-center w-8 h-8 text-sm font-bold border ${
          props.side === 'for'
            ? 'border-crt-fg text-crt-fg'
            : 'border-crt-error text-crt-error'
        }`}>
          {props.side === 'for' ? '+' : '−'}
        </div>
      </div>

      <div className="mb-3">
        <p className={`text-sm text-crt-fg ${expanded ? '' : 'line-clamp-2'}`}>
          {props.body}
        </p>
        {props.body.length > 150 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-crt-muted hover:text-crt-fg font-medium mt-1"
          >
            {expanded ? '[ show less ]' : '[ show more ]'}
          </button>
        )}
      </div>

      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-crt-muted">Relevance</span>
          <span className="font-medium text-crt-fg">{props.relevance_score}%</span>
        </div>
        <div className="w-full bg-crt-border h-1.5">
          <div
            className="bg-crt-fg h-1.5"
            style={{ width: `${props.relevance_score}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs mt-2">
          <span className="text-crt-muted">Credibility</span>
          <span className="font-medium text-crt-fg">{props.credibility_score}%</span>
        </div>
        <div className="w-full bg-crt-border h-1.5">
          <div
            className="bg-crt-fg h-1.5"
            style={{ width: `${props.credibility_score}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {props.source_url && (
          <a
            href={props.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-crt-muted hover:text-crt-fg underline"
          >
            [ view source ]
          </a>
        )}
        <button
          onClick={() => onChallenge(evidence.id)}
          className="text-xs text-crt-muted hover:text-crt-fg underline ml-auto"
        >
          [ challenge ]
        </button>
      </div>
    </div>
  );
}

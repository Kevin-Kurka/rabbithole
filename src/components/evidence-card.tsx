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
    'primary_source': 'bg-blue-100 text-blue-800',
    'document': 'bg-purple-100 text-purple-800',
    'data': 'bg-green-100 text-green-800',
    'testimony': 'bg-orange-100 text-orange-800',
    'expert_opinion': 'bg-indigo-100 text-indigo-800',
    'media': 'bg-pink-100 text-pink-800',
    'academic': 'bg-cyan-100 text-cyan-800',
  }[props.source_type] || 'bg-gray-100 text-gray-800';

  const borderColor = props.side === 'for' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500';

  return (
    <div className={`bg-white rounded-lg p-4 ${borderColor} shadow-sm border border-gray-200 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-gray-900 mb-1">{props.title}</h4>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${sourceTypeBadgeColor}`}>
              {props.source_type.replace(/_/g, ' ')}
            </span>
            <StatusBadge status={props.status} type="evidence" className="text-xs" />
          </div>
        </div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
          props.side === 'for'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {props.side === 'for' ? '✓' : '✕'}
        </div>
      </div>

      <div className="mb-3">
        <p className={`text-sm text-gray-700 ${expanded ? '' : 'line-clamp-2'}`}>
          {props.body}
        </p>
        {props.body.length > 150 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-rabbit-600 hover:text-rabbit-700 font-medium mt-1"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Relevance</span>
          <span className="font-medium">{props.relevance_score}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full"
            style={{ width: `${props.relevance_score}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs mt-2">
          <span className="text-gray-600">Credibility</span>
          <span className="font-medium">{props.credibility_score}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full"
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
            className="text-xs text-rabbit-600 hover:text-rabbit-700 underline"
          >
            View source
          </a>
        )}
        <button
          onClick={() => onChallenge(evidence.id)}
          className="text-xs text-gray-600 hover:text-gray-800 underline ml-auto"
        >
          Challenge this
        </button>
      </div>
    </div>
  );
}

import { StatusBadge } from './status-badge';
import type { Evidence } from '../lib/types';

interface EvidenceComparisonProps {
  evidenceA: Evidence;
  evidenceB: Evidence;
}

export function EvidenceComparison({ evidenceA, evidenceB }: EvidenceComparisonProps) {
  const propsA = evidenceA.properties;
  const propsB = evidenceB.properties;

  const sourceTypeBadgeColor = (sourceType: string) => {
    const colors: Record<string, string> = {
      'primary_source': 'bg-black border border-crt-info text-crt-info',
      'document': 'bg-black border border-crt-muted text-crt-muted',
      'data': 'bg-black border border-crt-fg text-crt-fg',
      'testimony': 'bg-black border border-crt-warning text-crt-warning',
      'expert_opinion': 'bg-black border border-crt-fg text-crt-fg',
      'media': 'bg-black border border-crt-muted text-crt-muted',
      'academic': 'bg-black border border-crt-fg text-crt-fg',
    };
    return colors[sourceType] || 'bg-black border border-crt-muted text-crt-muted';
  };

  const getComparisonIndicator = (valueA: number, valueB: number) => {
    if (valueA > valueB) {
      return { symbol: '>', color: 'text-crt-fg', text: 'LEFT STRONGER' };
    } else if (valueB > valueA) {
      return { symbol: '<', color: 'text-crt-error', text: 'RIGHT STRONGER' };
    }
    return { symbol: '=', color: 'text-crt-muted', text: 'EQUAL' };
  };

  const credibilityComparison = getComparisonIndicator(
    propsA.credibility_score,
    propsB.credibility_score
  );
  const relevanceComparison = getComparisonIndicator(
    propsA.relevance_score,
    propsB.relevance_score
  );

  return (
    <div className="grid grid-cols-3 gap-4 font-mono">
      {/* Evidence A */}
      <div className="bg-black border border-crt-border p-4">
        <div className="mb-4">
          <span className="inline-block px-2 py-1 text-xs font-bold bg-crt-border text-crt-fg mb-2">
            EVIDENCE A
          </span>
          <h3 className="text-sm font-bold text-crt-fg mb-2">{propsA.title}</h3>
          <span className="inline-block px-2 py-1 text-xs font-medium mr-2 mb-2">
            [{propsA.source_type.replace(/_/g, ' ').toUpperCase()}]
          </span>
          <StatusBadge status={propsA.status} type="evidence" className="text-xs inline-block" />
        </div>

        <div className="mb-3 p-2 bg-black border border-crt-border">
          <p className="text-xs text-crt-fg line-clamp-4">{propsA.body}</p>
        </div>

        <div className="space-y-2 mb-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-crt-muted">Credibility</span>
              <span className="font-bold text-crt-fg">{propsA.credibility_score}%</span>
            </div>
            <div className="w-full bg-crt-border h-1.5">
              <div
                className="bg-crt-fg h-1.5"
                style={{ width: `${propsA.credibility_score}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-crt-muted">Relevance</span>
              <span className="font-bold text-crt-fg">{propsA.relevance_score}%</span>
            </div>
            <div className="w-full bg-crt-border h-1.5">
              <div
                className="bg-crt-fg h-1.5"
                style={{ width: `${propsA.relevance_score}%` }}
              />
            </div>
          </div>
        </div>

        {propsA.source_url && (
          <a
            href={propsA.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-crt-fg hover:text-crt-accent underline"
          >
            [ view source ]
          </a>
        )}
      </div>

      {/* Comparison Divider */}
      <div className="flex flex-col items-center justify-center bg-black border border-crt-border p-4">
        <div className="text-center space-y-4">
          {/* Credibility Comparison */}
          <div>
            <div className="text-xs text-crt-muted mb-1">CREDIBILITY</div>
            <div className={`text-xl font-bold ${credibilityComparison.color}`}>
              {credibilityComparison.symbol}
            </div>
            <div className="text-xs text-crt-muted mt-1">{credibilityComparison.text}</div>
          </div>

          {/* Vertical Divider */}
          <div className="w-full border-t border-crt-border my-2" />

          {/* Relevance Comparison */}
          <div>
            <div className="text-xs text-crt-muted mb-1">RELEVANCE</div>
            <div className={`text-xl font-bold ${relevanceComparison.color}`}>
              {relevanceComparison.symbol}
            </div>
            <div className="text-xs text-crt-muted mt-1">{relevanceComparison.text}</div>
          </div>

          {/* Side Comparison */}
          <div className="w-full border-t border-crt-border my-2" />
          <div>
            <div className="text-xs text-crt-muted mb-1">SIDE</div>
            <div className="text-sm font-bold">
              <div className={propsA.side === 'for' ? 'text-crt-fg' : 'text-crt-error'}>
                {propsA.side.toUpperCase()}
              </div>
              <div className="text-xs text-crt-muted my-1">vs</div>
              <div className={propsB.side === 'for' ? 'text-crt-fg' : 'text-crt-error'}>
                {propsB.side.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence B */}
      <div className="bg-black border border-crt-border p-4">
        <div className="mb-4">
          <span className="inline-block px-2 py-1 text-xs font-bold bg-crt-border text-crt-fg mb-2">
            EVIDENCE B
          </span>
          <h3 className="text-sm font-bold text-crt-fg mb-2">{propsB.title}</h3>
          <span className="inline-block px-2 py-1 text-xs font-medium mr-2 mb-2">
            [{propsB.source_type.replace(/_/g, ' ').toUpperCase()}]
          </span>
          <StatusBadge status={propsB.status} type="evidence" className="text-xs inline-block" />
        </div>

        <div className="mb-3 p-2 bg-black border border-crt-border">
          <p className="text-xs text-crt-fg line-clamp-4">{propsB.body}</p>
        </div>

        <div className="space-y-2 mb-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-crt-muted">Credibility</span>
              <span className="font-bold text-crt-fg">{propsB.credibility_score}%</span>
            </div>
            <div className="w-full bg-crt-border h-1.5">
              <div
                className="bg-crt-fg h-1.5"
                style={{ width: `${propsB.credibility_score}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-crt-muted">Relevance</span>
              <span className="font-bold text-crt-fg">{propsB.relevance_score}%</span>
            </div>
            <div className="w-full bg-crt-border h-1.5">
              <div
                className="bg-crt-fg h-1.5"
                style={{ width: `${propsB.relevance_score}%` }}
              />
            </div>
          </div>
        </div>

        {propsB.source_url && (
          <a
            href={propsB.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-crt-fg hover:text-crt-accent underline"
          >
            [ view source ]
          </a>
        )}
      </div>
    </div>
  );
}

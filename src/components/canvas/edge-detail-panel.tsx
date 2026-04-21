import { useState } from 'react';
import type { SentientEdge } from '../../lib/types';

interface EdgeDetailPanelProps {
  edge: SentientEdge | null;
  onClose: () => void;
  onChallenge?: (edgeId: string) => void;
}

function getConfidenceColor(confidence: number | unknown | undefined): string {
  if (!confidence || typeof confidence !== 'number') return '#666666';
  if (confidence >= 70) return '#00d900'; // high confidence - green
  if (confidence >= 40) return '#e5e500'; // medium confidence - yellow
  return '#e50000'; // low confidence - red
}

function getStatusColor(status: string | unknown | undefined): string {
  const statusStr = typeof status === 'string' ? status : '';
  const colors: Record<string, string> = {
    active: '#00a6b2',
    verified: '#00d900',
    challenged: '#e5e500',
    debunked: '#e50000',
  };
  return colors[statusStr || 'active'] || '#00a6b2';
}

export function EdgeDetailPanel({ edge, onClose, onChallenge }: EdgeDetailPanelProps) {
  const [showChallengeForm, setShowChallengeForm] = useState(false);

  if (!edge) return null;

  const props = (edge.properties || {}) as Record<string, unknown>;
  const label = (props.label as string) || (props.relationship_type as string) || edge.edge_type || 'Relationship';
  const confidence = (props.confidence as number) || 50;
  const status = (props.status as string) || 'active';
  const confidencePercent = Math.min(100, Math.max(0, confidence));

  return (
    <div className="fixed top-0 right-0 h-full w-[420px] bg-black border-l border-crt-border z-50 flex flex-col font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-crt-border">
        <div>
          <span className="text-xs" style={{ color: '#00a6b2' }}>EDGE</span>
          <h2 className="text-crt-fg font-bold text-lg leading-tight mt-1">{label}</h2>
        </div>
        <button onClick={onClose} className="text-crt-muted hover:text-crt-fg text-xl px-2">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="text-crt-dim text-xs uppercase">Type</div>
          <div className="text-crt-fg text-sm font-mono">{edge.edge_type}</div>
        </div>

        {/* Label / Description */}
        {typeof props.label === 'string' && props.label && (
          <div>
            <div className="text-crt-dim text-xs uppercase">Label</div>
            <div className="text-crt-fg text-sm">{props.label}</div>
          </div>
        )}

        {/* Relationship Type */}
        {typeof props.relationship_type === 'string' && props.relationship_type && (
          <div>
            <div className="text-crt-dim text-xs uppercase">Relationship</div>
            <div className="text-crt-fg text-sm font-mono">{props.relationship_type}</div>
          </div>
        )}

        <div>
          <div className="text-crt-dim text-xs uppercase mb-1">Confidence</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 border border-crt-border bg-black">
              <div
                className="h-full transition-all"
                style={{
                  width: `${confidencePercent}%`,
                  backgroundColor: getConfidenceColor(confidence as number),
                }}
              />
            </div>
            <span className="text-crt-fg text-xs font-bold w-8">{Math.round(confidencePercent)}%</span>
          </div>
        </div>

        {/* Evidence Basis */}
        {typeof props.evidence_basis === 'string' && props.evidence_basis && (
          <div>
            <div className="text-crt-dim text-xs uppercase">Evidence Basis</div>
            <div className="text-crt-fg text-xs leading-relaxed p-2 border border-crt-border bg-black">
              {props.evidence_basis}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div
            className="text-xs px-2 py-1 border"
            style={{
              borderColor: getStatusColor(status),
              color: getStatusColor(status),
            }}
          >
            [{status.toUpperCase()}]
          </div>
          {typeof props.created_by === 'string' && props.created_by && (
            <div className="text-xs px-2 py-1 border border-crt-border text-crt-muted">
              by {props.created_by}
            </div>
          )}
        </div>

        {typeof props.challenge_count === 'number' && props.challenge_count > 0 && (
          <div className="p-2 border border-crt-border bg-black">
            <div className="text-crt-dim text-xs">Challenges</div>
            <div className="text-crt-fg font-bold">{props.challenge_count}</div>
          </div>
        )}

        <div className="text-xs text-crt-dim border-t border-crt-border pt-2 mt-4">
          <div>Created: {new Date(edge.created_at).toLocaleString()}</div>
          {edge.updated_at !== edge.created_at && (
            <div>Updated: {new Date(edge.updated_at).toLocaleString()}</div>
          )}
        </div>
      </div>

      <div className="border-t border-crt-border p-4 space-y-2">
        {!showChallengeForm ? (
          <button
            onClick={() => setShowChallengeForm(true)}
            className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg hover:bg-crt-border hover:text-black text-sm font-mono"
          >
            Challenge this connection
          </button>
        ) : (
          <div className="space-y-2">
            <div className="text-crt-dim text-xs">Challenge reason:</div>
            <textarea
              placeholder="Why is this connection questionable?"
              className="w-full p-2 bg-black border border-crt-border text-crt-fg text-xs font-mono resize-none h-16 focus:outline-none"
              style={{ color: '#00ff00' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowChallengeForm(false);
                  onChallenge?.(edge.id);
                }}
                className="flex-1 px-2 py-1 bg-crt-border text-black text-xs font-mono hover:opacity-80"
              >
                Submit
              </button>
              <button
                onClick={() => setShowChallengeForm(false)}
                className="flex-1 px-2 py-1 bg-black border border-crt-border text-crt-fg text-xs font-mono hover:bg-crt-border hover:text-black"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { EnhancementData } from '../lib/ai-enhance';

interface EnhancementReviewProps {
  enhancements: EnhancementData;
  onApprove: (approved: Partial<EnhancementData>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

type TabType = 'connections' | 'claims' | 'tags' | 'challenges';

export function EnhancementReview({
  enhancements,
  onApprove,
  onCancel,
  isLoading = false,
}: EnhancementReviewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('connections');
  const [approved, setApproved] = useState<Set<string>>(new Set());

  const toggleApproval = (id: string) => {
    const newApproved = new Set(approved);
    if (newApproved.has(id)) {
      newApproved.delete(id);
    } else {
      newApproved.add(id);
    }
    setApproved(newApproved);
  };

  const approveAll = () => {
    const allIds = new Set<string>();
    enhancements.suggested_connections?.forEach((_, i) => allIds.add(`conn-${i}`));
    enhancements.extracted_claims?.forEach((_, i) => allIds.add(`claim-${i}`));
    enhancements.suggested_tags?.forEach((_, i) => allIds.add(`tag-${i}`));
    enhancements.suggested_challenges?.forEach((_, i) => allIds.add(`challenge-${i}`));
    setApproved(allIds);
  };

  const rejectAll = () => {
    setApproved(new Set());
  };

  const handleApply = () => {
    const result: Partial<EnhancementData> = {
      suggested_connections: enhancements.suggested_connections?.filter(
        (_, i) => approved.has(`conn-${i}`)
      ),
      extracted_claims: enhancements.extracted_claims?.filter((_, i) =>
        approved.has(`claim-${i}`)
      ),
      suggested_tags: enhancements.suggested_tags?.filter((_, i) =>
        approved.has(`tag-${i}`)
      ),
      suggested_challenges: enhancements.suggested_challenges?.filter((_, i) =>
        approved.has(`challenge-${i}`)
      ),
      credibility_notes: enhancements.credibility_notes,
    };
    onApprove(result);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-2 border-crt-fg font-mono max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-crt-fg p-4 flex justify-between items-center bg-black">
          <h2 className="text-lg font-bold text-crt-fg">AI ENHANCEMENT REVIEW</h2>
          <button
            onClick={onCancel}
            className="text-crt-fg hover:text-crt-accent font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-crt-border px-4 bg-black">
          {(['connections', 'claims', 'tags', 'challenges'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-bold transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-crt-fg text-crt-fg'
                  : 'text-crt-muted hover:text-crt-fg'
              }`}
            >
              {tab.toUpperCase()} ({tab === 'connections' ? enhancements.suggested_connections?.length || 0 : tab === 'claims' ? enhancements.extracted_claims?.length || 0 : tab === 'tags' ? enhancements.suggested_tags?.length || 0 : enhancements.suggested_challenges?.length || 0})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'connections' && (
            <div className="space-y-3">
              {enhancements.suggested_connections?.map((conn, idx) => (
                <div
                  key={idx}
                  className={`p-3 border ${
                    approved.has(`conn-${idx}`)
                      ? 'border-crt-fg bg-black'
                      : 'border-crt-border bg-black'
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={approved.has(`conn-${idx}`)}
                      onChange={() => toggleApproval(`conn-${idx}`)}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-crt-fg text-sm">
                        {conn.relationship_type}
                      </p>
                      <p className="text-xs text-crt-muted mb-1">{conn.label}</p>
                      <p className="text-xs text-crt-dim">
                        Target: {conn.target_id} | Confidence: {conn.confidence}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!enhancements.suggested_connections?.length && (
                <p className="text-crt-dim text-sm text-center py-8">
                  No connections suggested
                </p>
              )}
            </div>
          )}

          {activeTab === 'claims' && (
            <div className="space-y-3">
              {enhancements.extracted_claims?.map((claim, idx) => (
                <div
                  key={idx}
                  className={`p-3 border ${
                    approved.has(`claim-${idx}`)
                      ? 'border-crt-fg bg-black'
                      : 'border-crt-border bg-black'
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={approved.has(`claim-${idx}`)}
                      onChange={() => toggleApproval(`claim-${idx}`)}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-crt-fg italic mb-2">"{claim.text}"</p>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {claim.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-black border border-crt-border text-crt-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-crt-dim">
                        Confidence: {claim.confidence}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!enhancements.extracted_claims?.length && (
                <p className="text-crt-dim text-sm text-center py-8">
                  No claims extracted
                </p>
              )}
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-3">
              {enhancements.suggested_tags?.map((tag, idx) => (
                <div
                  key={idx}
                  className={`p-3 border flex gap-2 items-center ${
                    approved.has(`tag-${idx}`)
                      ? 'border-crt-fg bg-black'
                      : 'border-crt-border bg-black'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={approved.has(`tag-${idx}`)}
                    onChange={() => toggleApproval(`tag-${idx}`)}
                    className="cursor-pointer"
                  />
                  <span className="px-3 py-1 bg-black border border-crt-border text-crt-fg text-sm font-bold">
                    {tag}
                  </span>
                </div>
              ))}
              {!enhancements.suggested_tags?.length && (
                <p className="text-crt-dim text-sm text-center py-8">
                  No tags suggested
                </p>
              )}
            </div>
          )}

          {activeTab === 'challenges' && (
            <div className="space-y-3">
              {enhancements.suggested_challenges?.map((challenge, idx) => (
                <div
                  key={idx}
                  className={`p-3 border ${
                    approved.has(`challenge-${idx}`)
                      ? 'border-crt-fg bg-black'
                      : 'border-crt-border bg-black'
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={approved.has(`challenge-${idx}`)}
                      onChange={() => toggleApproval(`challenge-${idx}`)}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex gap-2 mb-1 items-center">
                        <span className="px-2 py-0.5 bg-crt-selection text-black text-xs font-bold">
                          {challenge.framework}
                        </span>
                        <span className="px-2 py-0.5 bg-black border border-crt-border text-crt-fg text-xs">
                          {challenge.severity}
                        </span>
                      </div>
                      <p className="text-sm text-crt-fg italic mb-1">
                        "{challenge.claim_text}"
                      </p>
                      <p className="text-xs text-crt-muted">{challenge.rationale}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!enhancements.suggested_challenges?.length && (
                <p className="text-crt-dim text-sm text-center py-8">
                  No challenges suggested
                </p>
              )}
            </div>
          )}

          {/* Credibility notes */}
          {enhancements.credibility_notes && (
            <div className="mt-4 p-3 bg-black border border-crt-border">
              <p className="text-xs font-bold text-crt-dim mb-1">CREDIBILITY ASSESSMENT</p>
              <p className="text-sm text-crt-muted">{enhancements.credibility_notes}</p>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="border-t border-crt-border p-4 bg-black space-y-2">
          <div className="flex gap-2 text-xs text-crt-dim mb-3">
            <button
              onClick={approveAll}
              className="text-crt-accent hover:text-crt-fg"
            >
              SELECT ALL
            </button>
            <span>•</span>
            <button
              onClick={rejectAll}
              className="text-crt-accent hover:text-crt-fg"
            >
              DESELECT ALL
            </button>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-crt-border text-crt-fg hover:bg-crt-selection disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              onClick={handleApply}
              disabled={isLoading || approved.size === 0}
              className="px-4 py-2 bg-crt-fg text-black font-bold hover:bg-crt-accent disabled:bg-crt-muted disabled:text-crt-dim"
            >
              {isLoading ? 'APPLYING...' : `APPLY (${approved.size} selected)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

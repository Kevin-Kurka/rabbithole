import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNodes, traverse } from '../lib/api';
import { TagBadges } from '../components/tag-badges';
import type { SentientNode } from '../lib/types';

interface ClaimData {
  node: SentientNode<any>;
  status: string;
  article?: string;
}

type ClaimStatus = 'VERIFIED' | 'CHALLENGED' | 'DEBUNKED' | 'CONTESTED' | 'UNCHALLENGED';

const STATUS_ORDER: Record<ClaimStatus, number> = {
  VERIFIED: 0,
  CHALLENGED: 1,
  CONTESTED: 2,
  DEBUNKED: 3,
  UNCHALLENGED: 4,
};

export function ClaimsPage() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ClaimData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [claimsByStatus, setClaimsByStatus] = useState<Record<ClaimStatus, ClaimData[]>>({
    VERIFIED: [],
    CHALLENGED: [],
    DEBUNKED: [],
    CONTESTED: [],
    UNCHALLENGED: [],
  });

  // Get all unique tags from claims
  const getAllTags = (): Array<{ tag: string; count: number }> => {
    const tagCounts: Record<string, number> = {};
    for (const claim of claims) {
      const tags = (claim.node.properties as any).tags || [];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Filter claims by selected tag
  const getFilteredClaims = (): ClaimData[] => {
    if (!selectedTag) return claims;
    return claims.filter(claim => {
      const tags = (claim.node.properties as any).tags || [];
      return tags.includes(selectedTag);
    });
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    setSelectedTag(null);
    try {
      // Fetch all CLAIM nodes
      const claimNodes = await listNodes('CLAIM', 200);

      // Load parent article for each claim
      const claimData: ClaimData[] = [];

      for (const node of claimNodes) {
        const props = node.properties as any;
        let article = undefined;

        // Try to traverse to find parent article
        try {
          const traversed = await traverse(node.id, 1);
          const parent = traversed.find((n: any) => n.node_type === 'ARTICLE');
          if (parent) {
            article = (parent.properties as any).title;
          }
        } catch {
          // Ignore traversal errors
        }

        claimData.push({
          node,
          status: (props.status || 'UNCHALLENGED').toUpperCase(),
          article,
        });
      }

      setClaims(claimData);

      // Group by status
      const grouped: Record<ClaimStatus, ClaimData[]> = {
        VERIFIED: [],
        CHALLENGED: [],
        DEBUNKED: [],
        CONTESTED: [],
        UNCHALLENGED: [],
      };

      for (const claim of claimData) {
        const status = claim.status as ClaimStatus;
        if (grouped[status]) {
          grouped[status].push(claim);
        }
      }

      setClaimsByStatus(grouped);
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ClaimStatus): string => {
    const colors: Record<ClaimStatus, string> = {
      VERIFIED: 'text-crt-info',
      CHALLENGED: 'text-crt-warning',
      DEBUNKED: 'text-crt-error',
      CONTESTED: 'text-crt-warning',
      UNCHALLENGED: 'text-crt-muted',
    };
    return colors[status];
  };

  const getStatusBgColor = (status: ClaimStatus): string => {
    const colors: Record<ClaimStatus, string> = {
      VERIFIED: 'bg-crt-info bg-opacity-20 border-crt-info',
      CHALLENGED: 'bg-crt-warning bg-opacity-20 border-crt-warning',
      DEBUNKED: 'bg-crt-error bg-opacity-20 border-crt-error',
      CONTESTED: 'bg-crt-warning bg-opacity-20 border-crt-warning',
      UNCHALLENGED: 'bg-black border-crt-muted',
    };
    return colors[status];
  };

  const getStatusBarColor = (status: ClaimStatus): string => {
    const colors: Record<ClaimStatus, string> = {
      VERIFIED: 'bg-crt-info',
      CHALLENGED: 'bg-crt-warning',
      DEBUNKED: 'bg-crt-error',
      CONTESTED: 'bg-crt-warning',
      UNCHALLENGED: 'bg-crt-muted',
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-dim">[ Loading claims... ]</p>
        </div>
      </div>
    );
  }

  const filteredClaims = getFilteredClaims();
  const totalClaims = claims.length;
  const displayedClaims = filteredClaims.length;
  const allTags = getAllTags();
  const statuses: ClaimStatus[] = ['VERIFIED', 'CHALLENGED', 'DEBUNKED', 'CONTESTED', 'UNCHALLENGED'];

  // Recalculate status counts based on filtered claims
  const filteredClaimsByStatus: Record<ClaimStatus, ClaimData[]> = {
    VERIFIED: [],
    CHALLENGED: [],
    DEBUNKED: [],
    CONTESTED: [],
    UNCHALLENGED: [],
  };

  for (const claim of filteredClaims) {
    const status = claim.status as ClaimStatus;
    if (filteredClaimsByStatus[status]) {
      filteredClaimsByStatus[status].push(claim);
    }
  }

  const statusCounts = statuses.map(s => ({
    status: s,
    count: filteredClaimsByStatus[s].length,
  }));

  return (
    <div className="max-w-5xl mx-auto font-mono">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-crt-fg">CLAIM TRACKER</h1>
        <p className="text-crt-muted mb-6">
          {selectedTag ? `Filtering by tag [${selectedTag}]: ` : 'Overview of '}
          {displayedClaims}{selectedTag ? '' : ` / ${totalClaims}`} claims
        </p>

        {/* Tag Filter Bar */}
        {allTags.length > 0 && (
          <div className="mb-6 p-4 bg-black border border-crt-border">
            <p className="text-xs font-bold text-crt-muted mb-3">FILTER BY TAG:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 text-xs font-mono border transition-colors ${
                  selectedTag === null
                    ? 'bg-crt-accent text-black border-crt-accent'
                    : 'border-crt-border text-crt-fg hover:border-crt-accent'
                }`}
              >
                [All Tags]
              </button>
              {allTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1 text-xs font-mono border transition-colors ${
                    selectedTag === tag
                      ? 'bg-crt-accent text-black border-crt-accent'
                      : 'border-crt-border text-crt-fg hover:border-crt-accent'
                  }`}
                >
                  [{tag.replace(/_/g, ' ')}] ({count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Summary Bar */}
        {totalClaims > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-crt-muted mb-2">STATUS DISTRIBUTION</p>
            <div className="flex h-8 border border-crt-border overflow-hidden bg-black">
              {statusCounts
                .filter(s => s.count > 0)
                .map(({ status, count }, idx) => {
                  const percentage = (count / totalClaims) * 100;
                  return (
                    <div
                      key={status}
                      style={{ width: `${percentage}%` }}
                      className={`${getStatusBarColor(status)} flex items-center justify-center text-xs font-bold text-black`}
                      title={`${status}: ${count}`}
                    >
                      {percentage > 10 && `${Math.round(percentage)}%`}
                    </div>
                  );
                })}
            </div>
            <div className="flex gap-4 mt-3 flex-wrap text-xs">
              {statusCounts.map(({ status, count }) => (
                <span key={status} className={getStatusColor(status)}>
                  {status}: <span className="font-bold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Claims by Status */}
      {displayedClaims > 0 ? (
        <div className="space-y-8">
          {statuses.map(status => {
            const statusClaims = filteredClaimsByStatus[status];
            if (statusClaims.length === 0) return null;

            return (
              <div key={status}>
                <h2 className={`text-lg font-bold mb-4 pb-2 border-b ${getStatusColor(status)} border-current`}>
                  {status} ({statusClaims.length})
                </h2>

                <div className="space-y-3">
                  {statusClaims.map(claim => {
                    const claimTags = (claim.node.properties as any).tags || [];
                    return (
                      <button
                        key={claim.node.id}
                        onClick={() => navigate(`/article/${claim.node.id}`)}
                        className={`w-full text-left p-4 border transition-colors hover:opacity-80 ${getStatusBgColor(status)}`}
                      >
                        {/* Claim text */}
                        <p className="text-crt-fg font-medium mb-2 line-clamp-2">
                          {(claim.node.properties as any).text}
                        </p>

                        {/* Tags */}
                        {claimTags.length > 0 && (
                          <div className="mb-2">
                            <TagBadges
                              tags={claimTags}
                              onTagClick={(tag) => setSelectedTag(tag)}
                              className="justify-start"
                            />
                          </div>
                        )}

                        {/* Article reference */}
                        {claim.article && (
                          <p className="text-xs text-crt-muted mb-2">
                            From: <span className="text-crt-fg">{claim.article}</span>
                          </p>
                        )}

                        {/* Status badge */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-bold border border-current ${getStatusColor(status)}`}
                          >
                            {status}
                          </span>
                          <span className="text-xs text-crt-dim">
                            {new Date(claim.node.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : selectedTag ? (
        <div className="text-center py-12 border border-crt-border p-8">
          <p className="text-crt-muted mb-2">[ NO CLAIMS WITH TAG: {selectedTag.replace(/_/g, ' ').toUpperCase()} ]</p>
          <p className="text-crt-dim text-sm">
            No claims match the selected tag
          </p>
        </div>
      ) : (
        <div className="text-center py-12 border border-crt-border p-8">
          <p className="text-crt-muted mb-2">[ NO CLAIMS ]</p>
          <p className="text-crt-dim text-sm">
            No claims have been indexed yet
          </p>
        </div>
      )}
    </div>
  );
}

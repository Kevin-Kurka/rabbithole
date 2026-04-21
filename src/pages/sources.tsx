import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNodes, listEdges } from '../lib/api';
import type { SentientNode, SentientEdge } from '../lib/types';

interface SourceData {
  node: SentientNode<any>;
  credibility: number;
  citedBy: number;
}

export function SourcesPage() {
  const navigate = useNavigate();
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    avgCredibility: 0,
    byType: {} as Record<string, number>,
  });

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      // Fetch all nodes and edges
      const [nodes, edges] = await Promise.all([
        listNodes('SOURCE', 200),
        listEdges('CITES', 200),
      ]);

      // Count citations for each source
      const citationCounts: Record<string, number> = {};
      for (const edge of edges) {
        if (!citationCounts[edge.target_node_id]) {
          citationCounts[edge.target_node_id] = 0;
        }
        citationCounts[edge.target_node_id]++;
      }

      // Build source data
      const sourceData: SourceData[] = nodes.map(node => {
        const props = node.properties as any;
        return {
          node,
          credibility: props.credibility_rating || 0,
          citedBy: citationCounts[node.id] || 0,
        };
      });

      // Sort by credibility descending
      sourceData.sort((a, b) => b.credibility - a.credibility);
      setSources(sourceData);

      // Calculate stats
      const typeBreakdown: Record<string, number> = {};
      let totalCredibility = 0;

      for (const source of sourceData) {
        const sourceType = (source.node.properties as any).source_type || 'unknown';
        typeBreakdown[sourceType] = (typeBreakdown[sourceType] || 0) + 1;
        totalCredibility += source.credibility;
      }

      setStats({
        total: sourceData.length,
        avgCredibility: sourceData.length > 0 ? Math.round(totalCredibility / sourceData.length) : 0,
        byType: typeBreakdown,
      });
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSourceTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      news: 'text-crt-warning',
      academic: 'text-crt-info',
      government: 'text-crt-fg',
      primary: 'text-crt-accent',
      other: 'text-crt-muted',
    };
    return colors[type] || 'text-crt-fg';
  };

  const getCredibilityBar = (rating: number): string => {
    // rating is 0-5 or 0-100, normalize to 0-100
    const normalized = rating > 5 ? rating : rating * 20;
    if (normalized >= 80) return '█████████░ ' + Math.round(normalized);
    if (normalized >= 60) return '███████░░░ ' + Math.round(normalized);
    if (normalized >= 40) return '█████░░░░░ ' + Math.round(normalized);
    if (normalized >= 20) return '███░░░░░░░ ' + Math.round(normalized);
    return '█░░░░░░░░░ ' + Math.round(normalized);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-dim">[ Loading sources... ]</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto font-mono">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-crt-fg">SOURCE CREDIBILITY DASHBOARD</h1>
        <p className="text-crt-muted mb-6">
          Analysis of {stats.total} sources indexed in the investigation
        </p>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Sources */}
          <div className="bg-black border border-crt-border p-4">
            <p className="text-crt-muted text-xs font-bold mb-1">TOTAL SOURCES</p>
            <p className="text-3xl font-bold text-crt-fg">{stats.total}</p>
          </div>

          {/* Average Credibility */}
          <div className="bg-black border border-crt-border p-4">
            <p className="text-crt-muted text-xs font-bold mb-1">AVG CREDIBILITY</p>
            <p className="text-3xl font-bold text-crt-fg">{stats.avgCredibility}</p>
            <p className="text-xs text-crt-dim mt-1">out of 100</p>
          </div>

          {/* Source Type Breakdown */}
          <div className="bg-black border border-crt-border p-4">
            <p className="text-crt-muted text-xs font-bold mb-2">BREAKDOWN</p>
            <div className="space-y-1 text-xs">
              {Object.entries(stats.byType)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([type, count]) => (
                  <p key={type} className="text-crt-fg">
                    {type}: <span className="text-crt-muted">{count}</span>
                  </p>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sources Table */}
      {sources.length > 0 ? (
        <div className="overflow-x-auto bg-black border border-crt-border">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-crt-border bg-black sticky top-0">
            <div className="col-span-4 text-xs font-bold text-crt-muted">TITLE</div>
            <div className="col-span-2 text-xs font-bold text-crt-muted">TYPE</div>
            <div className="col-span-3 text-xs font-bold text-crt-muted">CREDIBILITY</div>
            <div className="col-span-2 text-xs font-bold text-crt-muted">CITED BY</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-crt-border">
            {sources.map(source => {
              const props = source.node.properties as any;
              const sourceType = props.source_type || 'unknown';

              return (
                <button
                  key={source.node.id}
                  onClick={() => navigate(`/article/${source.node.id}`)}
                  className="w-full grid grid-cols-12 gap-4 p-4 hover:bg-crt-selection transition-colors text-left"
                >
                  {/* Title */}
                  <div className="col-span-4 flex flex-col justify-center">
                    <p className="font-medium text-crt-fg line-clamp-1">
                      {props.title}
                    </p>
                    {props.publication && (
                      <p className="text-xs text-crt-muted line-clamp-1">
                        {props.publication}
                      </p>
                    )}
                  </div>

                  {/* Source Type */}
                  <div className="col-span-2 flex items-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold border border-current ${getSourceTypeColor(sourceType)}`}
                    >
                      {sourceType}
                    </span>
                  </div>

                  {/* Credibility Bar */}
                  <div className="col-span-3 flex items-center">
                    <p className="text-xs text-crt-fg font-mono">
                      {getCredibilityBar(source.credibility)}
                    </p>
                  </div>

                  {/* Cited By Count */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-crt-fg font-bold">
                      {source.citedBy}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border border-crt-border p-8">
          <p className="text-crt-muted mb-2">[ NO SOURCES ]</p>
          <p className="text-crt-dim text-sm">
            No sources have been indexed yet
          </p>
        </div>
      )}
    </div>
  );
}

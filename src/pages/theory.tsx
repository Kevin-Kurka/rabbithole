import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getNode, traverse } from '../lib/api';
import type { SentientNode } from '../lib/types';

export function TheoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [theory, setTheory] = useState<SentientNode<any> | null>(null);
  const [connectedNodes, setConnectedNodes] = useState<SentientNode<any>[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');

  // Load existing theory if ID provided
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const theoryNode = await getNode(id);
        setTheory(theoryNode);

        // Load connected nodes
        const traversed = await traverse(id, 2);
        const connected = traversed.filter((n: any) => n.id !== id);
        setConnectedNodes(connected);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load theory');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      ARTICLE: 'border-crt-info text-crt-info',
      CLAIM: 'border-crt-warning text-crt-warning',
      EVIDENCE: 'border-crt-fg text-crt-fg',
      THEORY: 'border-crt-muted text-crt-muted',
      CHALLENGE: 'border-crt-error text-crt-error',
      SOURCE: 'border-crt-dim text-crt-dim',
    };
    return colors[type] || 'border-crt-muted text-crt-muted';
  };

  const handleNodeClick = (type: string, nodeId: string) => {
    const routeMap: Record<string, string> = {
      ARTICLE: '/article',
      CLAIM: '/claim',
      THEORY: '/theory',
      CHALLENGE: '/challenge',
      EVIDENCE: '/evidence',
    };

    const route = routeMap[type];
    if (route) {
      navigate(`${route}/${nodeId}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-dim">Loading theory...</p>
        </div>
      </div>
    );
  }

  if (!theory) {
    return (
      <div className="max-w-4xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-error">{error || 'Theory not found'}</p>
        </div>
      </div>
    );
  }

  const props = theory.properties as any;
  const title = props.title || 'Untitled Theory';
  const summary = props.summary || '';
  const body = props.body || '';

  return (
    <div className="max-w-4xl mx-auto font-mono">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-crt-fg mb-2">{title}</h1>
        {summary && (
          <p className="text-crt-muted mb-4">{summary}</p>
        )}
        <p className="text-xs text-crt-dim">
          Published: {new Date(theory.created_at).toLocaleDateString()}
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-crt-error mb-6 border border-crt-error bg-black">
          [ ERROR ] {error}
        </div>
      )}

      {/* Body content with markdown rendering */}
      <div className="bg-black border border-crt-border p-6 mb-8">
        <div className="prose prose-invert max-w-none text-crt-fg font-mono text-sm">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
      </div>

      {/* Connected Research section */}
      {connectedNodes.length > 0 && (
        <div className="bg-black border border-crt-border p-6">
          <h2 className="text-lg font-bold text-crt-fg mb-4">Connected Research</h2>
          <div className="space-y-3">
            {connectedNodes.map((node) => {
              const nodeProps = node.properties as any;
              const nodeTitle =
                nodeProps.title ||
                nodeProps.text ||
                nodeProps.username ||
                'Untitled';

              const hasRoute =
                node.type === 'ARTICLE' ||
                node.type === 'THEORY' ||
                node.type === 'CHALLENGE';

              return (
                <div
                  key={node.id}
                  onClick={() => hasRoute && handleNodeClick(node.type, node.id)}
                  className={`p-3 bg-black border border-crt-border ${
                    hasRoute ? 'hover:border-crt-fg cursor-pointer transition' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-crt-fg font-mono font-bold">{nodeTitle}</p>
                      {nodeProps.body && (
                        <p className="text-xs text-crt-muted mt-1 line-clamp-1">
                          {nodeProps.body.substring(0, 100)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs border font-mono flex-shrink-0 ${getTypeBadgeColor(
                        node.type
                      )}`}
                    >
                      [{node.type}]
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

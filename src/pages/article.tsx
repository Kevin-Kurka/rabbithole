import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClaimHighlighter } from '../components/claim-highlighter';
import { StatusBadge } from '../components/status-badge';
import { SourceCitation } from '../components/source-citation';
import { GraphVisualizer, type GraphNode, type GraphEdge } from '../components/graph-visualizer';
import { getArticleWithContext, createNode, createEdge, traverse } from '../lib/api';
import type { Article, Claim, Source } from '../lib/types';

export function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeForm, setChallengeForm] = useState({ title: '', rationale: '' });
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'read' | 'canvas'>('read');
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const data = await getArticleWithContext(id);
        setArticle(data.article);
        // @ts-ignore
        setClaims(data.claims);
        // @ts-ignore
        setSources(data.sources);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'canvas' && id && graphNodes.length === 0 && !graphLoading) {
      loadGraphData();
    }
  }, [activeTab, id]);

  const loadGraphData = async () => {
    if (!id) return;
    setGraphLoading(true);
    try {
      const traversed = await traverse(id, 3);

      // Build nodes: article as central, then claims, sources, articles, theories, challenges, evidence
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const seenNodes = new Set<string>();
      const seenEdges = new Set<string>();

      // Add the article node itself
      nodes.push({
        id,
        label: article?.properties.title || 'Article',
        type: 'ARTICLE',
      });
      seenNodes.add(id);

      // Process traversed nodes and edges
      for (const node of traversed) {
        if (!seenNodes.has(node.id)) {
          const label =
            (node.properties as any).text ||
            (node.properties as any).title ||
            (node.properties as any).username ||
            node.type;
          nodes.push({
            id: node.id,
            label,
            type: node.type,
          });
          seenNodes.add(node.id);
        }
      }

      // Find edges in the traversed data
      // The traversal response should include edge information
      // If not available directly, we can infer from the structure
      const traversedMap = new Map(traversed.map(n => [n.id, n]));

      // Connect article to related nodes based on common patterns
      for (const node of traversed) {
        // Create edge from article to this node if it's a direct child type
        if (
          node.type === 'CLAIM' ||
          node.type === 'SOURCE' ||
          node.type === 'ARTICLE' ||
          node.type === 'THEORY' ||
          node.type === 'CHALLENGE'
        ) {
          const edgeKey = [id, node.id].sort().join('-');
          if (!seenEdges.has(edgeKey)) {
            edges.push({
              source: id,
              target: node.id,
            });
            seenEdges.add(edgeKey);
          }
        }

        // Connect challenges to evidence
        if (node.type === 'EVIDENCE') {
          for (const other of traversed) {
            if (other.type === 'CHALLENGE') {
              const edgeKey = [other.id, node.id].sort().join('-');
              if (!seenEdges.has(edgeKey)) {
                edges.push({
                  source: other.id,
                  target: node.id,
                });
                seenEdges.add(edgeKey);
              }
            }
          }
        }
      }

      setGraphNodes(nodes);
      setGraphEdges(edges);
    } catch (err) {
      console.error('Failed to load graph data:', err);
    } finally {
      setGraphLoading(false);
    }
  };

  const handleMarkClaim = async (text: string, start: number, end: number) => {
    if (!id) return;

    try {
      const claimNode = await createNode('CLAIM', {
        text,
        highlight_start: start,
        highlight_end: end,
        status: 'unchallenged',
      });

      await createEdge(id, claimNode.id, 'CONTAINS_CLAIM');
      setClaims([...claims, claimNode]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create claim');
    }
  };

  const handleChallenge = async (claimId?: string) => {
    if (!claimId) {
      // Create claim first if no ID provided
      setShowChallengeModal(true);
      return;
    }

    setSelectedClaim(claimId);
    setShowChallengeModal(true);
  };

  const submitChallenge = async () => {
    if (!challengeForm.title || !challengeForm.rationale || !selectedClaim) {
      setError('Title and rationale are required');
      return;
    }

    setChallengeLoading(true);
    try {
      const challenge = await createNode('CHALLENGE', {
        title: challengeForm.title,
        rationale: challengeForm.rationale,
        target_type: 'claim',
        status: 'open',
        community_score: 0,
        ai_score: 0,
        verdict: 'pending',
        opened_at: new Date().toISOString(),
      });

      await createEdge(selectedClaim, challenge.id, 'CHALLENGES');

      // Update claim status
      const claim = claims.find(c => c.id === selectedClaim);
      if (claim) {
        claim.properties.status = 'challenged';
      }

      navigate(`/challenge/${challenge.id}`);
      setShowChallengeModal(false);
      setChallengeForm({ title: '', rationale: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
    } finally {
      setChallengeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-600">{error || 'Article not found'}</p>
        </div>
      </div>
    );
  }

  const handleGraphNodeClick = (node: GraphNode) => {
    const routeMap: Record<string, string> = {
      ARTICLE: '/article',
      CLAIM: '/claim',
      THEORY: '/theory',
      CHALLENGE: '/challenge',
      EVIDENCE: '/evidence',
      SOURCE: '/source',
    };

    const route = routeMap[node.type];
    if (route) {
      navigate(`${route}/${node.id}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tab bar */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('read')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'read'
              ? 'border-b-2 border-rabbit-600 text-rabbit-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📖 Read
        </button>
        <button
          onClick={() => setActiveTab('canvas')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'canvas'
              ? 'border-b-2 border-rabbit-600 text-rabbit-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🕸️ Canvas
        </button>
      </div>

      {/* Read Tab */}
      {activeTab === 'read' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2">
            <article>
              <h1 className="text-4xl font-bold mb-2">{article.properties.title}</h1>
              <p className="text-gray-600 text-sm mb-6">
                Published {new Date(article.properties.published_at || '').toLocaleDateString()}
              </p>

              <div className="prose prose-sm max-w-none">
                <ClaimHighlighter
                  body={article.properties.body}
                  claims={claims}
                  onMarkClaim={handleMarkClaim}
                  onChallenge={handleChallenge}
                />
              </div>

              {/* Sources section */}
              {sources.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h2 className="text-xl font-bold mb-4">Sources</h2>
                  <div className="space-y-4">
                    {sources.map((source, idx) => (
                      <div key={source.id} className="flex gap-3">
                        <div className="flex-shrink-0 text-gray-500">
                          <SourceCitation source={source} index={idx + 1} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{source.properties.title}</p>
                          {source.properties.publication && (
                            <p className="text-sm text-gray-600">{source.properties.publication}</p>
                          )}
                          {source.properties.url && (
                            <a
                              href={source.properties.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-rabbit-600 hover:text-rabbit-700 underline"
                            >
                              Open source
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Claims list */}
            <div>
              <h3 className="font-bold text-lg mb-3">Claims ({claims.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {claims.length === 0 ? (
                  <p className="text-sm text-gray-500">No claims yet</p>
                ) : (
                  claims.map(claim => (
                    <div
                      key={claim.id}
                      className="bg-white border border-gray-200 rounded p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedClaim(claim.id)}
                    >
                      <p className="text-sm text-gray-900 mb-2 line-clamp-2">{claim.properties.text}</p>
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={claim.properties.status} type="claim" className="text-xs" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChallenge(claim.id);
                          }}
                          className="text-xs text-rabbit-600 hover:text-rabbit-700 font-medium"
                        >
                          Challenge
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Tab */}
      {activeTab === 'canvas' && (
        <div className="w-full h-screen -mx-6 -my-6 flex flex-col">
          <div className="flex-1 overflow-hidden">
            {graphLoading ? (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Building connection graph...</p>
              </div>
            ) : graphNodes.length > 0 ? (
              <GraphVisualizer
                nodes={graphNodes}
                edges={graphEdges}
                onNodeClick={handleGraphNodeClick}
                height={typeof window !== 'undefined' ? window.innerHeight - 100 : 800}
                className="w-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">No connected nodes found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Challenge This Claim</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Challenge Title</label>
                <input
                  type="text"
                  value={challengeForm.title}
                  onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                  placeholder="What are you challenging?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rabbit-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rationale</label>
                <textarea
                  value={challengeForm.rationale}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rationale: e.target.value })}
                  placeholder="Why do you think this is incorrect?"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rabbit-500"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChallengeModal(false);
                  setChallengeForm({ title: '', rationale: '' });
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitChallenge}
                disabled={challengeLoading}
                className="flex-1 px-4 py-2 bg-rabbit-600 text-white rounded-lg hover:bg-rabbit-700 disabled:bg-gray-400 font-medium transition-colors"
              >
                {challengeLoading ? 'Creating...' : 'Create Challenge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

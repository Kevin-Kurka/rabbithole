import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClaimHighlighter } from '../components/claim-highlighter';
import { ChallengeModal } from '../components/challenge-modal';
import { StatusBadge } from '../components/status-badge';
import { SourceCitation } from '../components/source-citation';
import { GraphVisualizer, type GraphNode, type GraphEdge } from '../components/graph-visualizer';
import { AiPanel } from '../components/ai-panel';
import { getNode, createNode, createEdge, traverse } from '../lib/api';
import { generateAutoEvidence } from '../lib/auto-evidence';
import type { Article, SentientNode } from '../lib/types';

export function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [traversedNodes, setTraversedNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'article' | 'challenges' | 'evidence' | 'explore'>('article');
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedClaimText, setSelectedClaimText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Load article and traverse graph on mount
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const articleData = await getNode<any>(id);
        setArticle(articleData);

        const traversed = await traverse(id, 3);
        setTraversedNodes(traversed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // Load graph data when Explore tab is opened
  useEffect(() => {
    if (activeTab === 'explore' && id && graphNodes.length === 0 && !graphLoading) {
      loadGraphData();
    }
  }, [activeTab, id]);

  const loadGraphData = async () => {
    if (!id) return;
    setGraphLoading(true);
    try {
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

      // Process traversed nodes
      for (const node of traversedNodes) {
        if (!seenNodes.has(node.id)) {
          const label =
            (node.properties as any).text ||
            (node.properties as any).title ||
            (node.properties as any).username ||
            node.node_type;
          nodes.push({
            id: node.id,
            label: label.substring(0, 30),
            type: node.node_type,
          });
          seenNodes.add(node.id);
        }
      }

      // Connect article to related nodes
      for (const node of traversedNodes) {
        if (
          node.node_type === 'CLAIM' ||
          node.node_type === 'SOURCE' ||
          node.node_type === 'ARTICLE' ||
          node.node_type === 'THEORY' ||
          node.node_type === 'CHALLENGE'
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
        if (node.node_type === 'EVIDENCE') {
          for (const other of traversedNodes) {
            if (other.node_type === 'CHALLENGE') {
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

  const handleGraphNodeClick = (node: GraphNode) => {
    const routeMap: Record<string, string> = {
      ARTICLE: '/article',
      THEORY: '/theory',
      CHALLENGE: '/challenge',
    };

    const route = routeMap[node.type];
    if (route) {
      navigate(`${route}/${node.id}`);
    }
  };

  const handleCreateChallenge = async (title: string, rationale: string) => {
    if (!id) return;

    setAiGenerating(true);
    try {
      // Create the CHALLENGE node
      const challengeNode = await createNode('CHALLENGE', {
        title,
        rationale,
        status: 'open',
        community_score: 0,
        ai_score: null,
        ai_analysis: null,
      });

      // Link challenge to article
      await createEdge(id, challengeNode.id, 'CHALLENGES');

      // Trigger auto-evidence generation in background
      setShowChallengeModal(false);
      try {
        await generateAutoEvidence(
          challengeNode.id,
          selectedClaimText,
          article?.properties.title || 'Article'
        );
      } catch (e) {
        console.error('Auto-evidence generation failed (non-blocking):', e);
      }

      // Navigate to challenge page
      navigate(`/challenge/${challengeNode.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
      setAiGenerating(false);
    }
  };

  // Filter traversed nodes by type
  const claims = traversedNodes.filter(n => n.node_type === 'CLAIM');
  const challenges = traversedNodes.filter(n => n.node_type === 'CHALLENGE');
  const evidence = traversedNodes.filter(n => n.node_type === 'EVIDENCE');
  const sources = traversedNodes.filter(n => n.node_type === 'SOURCE');
  const theories = traversedNodes.filter(n => n.node_type === 'THEORY');

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-dim">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-6xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-error">{error || 'Article not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto font-mono">
        {/* Tab bar */}
        <div className="mb-6 flex gap-2 border-b border-crt-border flex-wrap">
        {(['article', 'challenges', 'evidence', 'explore'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-crt-fg text-crt-fg -mb-0.5'
                : 'text-crt-muted hover:text-crt-fg border-b-2 border-transparent'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Article Tab */}
      {activeTab === 'article' && (
        <article>
          <h1 className="text-4xl font-bold mb-2 text-crt-fg">{article.properties.title}</h1>
          <p className="text-crt-muted text-sm mb-6">
            Published {new Date(article.properties.published_at || article.created_at).toLocaleDateString()}
          </p>

          <div className="prose prose-sm max-w-none mb-12">
            <ClaimHighlighter
              body={article.properties.body}
              claims={claims as any}
              onMarkClaim={async (text, start, end) => {
                try {
                  const claimNode = await createNode('CLAIM', {
                    text,
                    highlight_start: start,
                    highlight_end: end,
                    status: 'unchallenged',
                  });
                  await createEdge(id!, claimNode.id, 'CONTAINS_CLAIM');
                  setTraversedNodes([...traversedNodes, claimNode]);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to create claim');
                }
              }}
              onChallenge={(claimId?: string) => {
                const selectedText = window.getSelection()?.toString() || '';
                if (selectedText) {
                  setSelectedClaimText(selectedText);
                  setShowChallengeModal(true);
                }
              }}
            />
          </div>

          {/* Sources section */}
          {sources.length > 0 && (
            <div className="mt-12 pt-8 border-t border-crt-border">
              <h2 className="text-xl font-bold mb-4 text-crt-fg">SOURCES</h2>
              <div className="space-y-4">
                {sources.map((source, idx) => (
                  <div key={source.id} className="flex gap-3">
                    <div className="flex-shrink-0 text-crt-dim">
                      <SourceCitation source={source as any} index={idx + 1} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-crt-fg">{(source.properties as any).title}</p>
                      {(source.properties as any).publication && (
                        <p className="text-sm text-crt-muted">{(source.properties as any).publication}</p>
                      )}
                      {(source.properties as any).url && (
                        <a
                          href={(source.properties as any).url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-crt-fg hover:text-crt-accent underline"
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
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-crt-fg">CHALLENGES & REFERENCES</h2>
          {challenges.length === 0 && theories.length === 0 ? (
            <div className="text-center py-12 text-crt-dim">
              <p className="text-xl mb-2">[ NO CHALLENGES ]</p>
              <p>no open investigations on this article</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Challenges */}
              {challenges.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-crt-fg mb-3 pb-2 border-b border-crt-border">
                    Challenges ({challenges.length})
                  </h3>
                  <div className="space-y-3">
                    {challenges.map((c) => (
                      <a
                        key={c.id}
                        href={`/challenge/${c.id}`}
                        className="block p-4 bg-black border border-crt-border hover:border-crt-fg transition"
                      >
                        <h4 className="text-crt-fg font-bold mb-2">{(c.properties as any).title}</h4>
                        <p className="text-sm text-crt-muted mb-2">{(c.properties as any).rationale}</p>
                        <div className="flex gap-4 text-xs text-crt-dim">
                          <span>Community: {(c.properties as any).community_score}</span>
                          <span>AI Score: {(c.properties as any).ai_score}</span>
                          <span className="text-crt-warning">Status: {(c.properties as any).status}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Theories */}
              {theories.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-crt-fg mb-3 pb-2 border-b border-crt-border">
                    Referenced by Theories ({theories.length})
                  </h3>
                  <div className="space-y-3">
                    {theories.map((t) => (
                      <a
                        key={t.id}
                        href={`/theory/${t.id}`}
                        className="block p-4 bg-black border border-crt-border hover:border-crt-fg transition"
                      >
                        <h4 className="text-crt-fg font-bold mb-1">{(t.properties as any).title}</h4>
                        {(t.properties as any).summary && (
                          <p className="text-sm text-crt-muted">{(t.properties as any).summary}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Evidence Tab */}
      {activeTab === 'evidence' && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-crt-fg">EVIDENCE & SOURCES</h2>
          {evidence.length === 0 && sources.length === 0 ? (
            <div className="text-center py-12 text-crt-dim">
              <p className="text-xl mb-2">[ NO EVIDENCE ]</p>
              <p>no supporting evidence indexed</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Primary Sources */}
              {sources.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-crt-fg mb-3 pb-2 border-b border-crt-border">
                    Primary Sources ({sources.length})
                  </h3>
                  <div className="space-y-3">
                    {sources.map((s) => (
                      <div key={s.id} className="p-4 bg-black border border-crt-border">
                        <h4 className="text-crt-fg font-bold mb-1">{(s.properties as any).title}</h4>
                        {(s.properties as any).publication && (
                          <p className="text-sm text-crt-muted mb-1">{(s.properties as any).publication}</p>
                        )}
                        {(s.properties as any).url && (
                          <a
                            href={(s.properties as any).url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-crt-fg hover:text-crt-accent underline"
                          >
                            Visit source
                          </a>
                        )}
                        {(s.properties as any).credibility_rating && (
                          <p className="text-xs text-crt-dim mt-1">
                            Credibility: {(s.properties as any).credibility_rating}/5
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supporting Evidence */}
              {evidence.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-crt-fg mb-3 pb-2 border-b border-crt-border">
                    Supporting Evidence ({evidence.filter((e: any) => e.properties.side === 'for').length})
                  </h3>
                  <div className="space-y-3">
                    {evidence
                      .filter((e: any) => e.properties.side === 'for')
                      .map((e) => (
                        <div key={e.id} className="p-4 bg-black border border-crt-border">
                          <h4 className="text-crt-fg font-bold mb-1">{(e.properties as any).title}</h4>
                          <p className="text-sm text-crt-muted mb-2 line-clamp-2">{(e.properties as any).body}</p>
                          <div className="flex gap-4 text-xs text-crt-dim">
                            <span>Type: {(e.properties as any).source_type}</span>
                            <span>Relevance: {(e.properties as any).relevance_score}%</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Counter Evidence */}
              {evidence.filter((e: any) => e.properties.side === 'against').length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-crt-error mb-3 pb-2 border-b border-crt-border">
                    Counter Evidence ({evidence.filter((e: any) => e.properties.side === 'against').length})
                  </h3>
                  <div className="space-y-3">
                    {evidence
                      .filter((e: any) => e.properties.side === 'against')
                      .map((e) => (
                        <div key={e.id} className="p-4 bg-black border border-crt-error">
                          <h4 className="text-crt-error font-bold mb-1">{(e.properties as any).title}</h4>
                          <p className="text-sm text-crt-muted mb-2 line-clamp-2">{(e.properties as any).body}</p>
                          <div className="flex gap-4 text-xs text-crt-dim">
                            <span>Type: {(e.properties as any).source_type}</span>
                            <span>Relevance: {(e.properties as any).relevance_score}%</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Explore Tab */}
      {activeTab === 'explore' && (
        <div className="w-full flex flex-col h-screen -m-6">
          <div className="flex-1 flex flex-col px-6 pt-6">
            <h2 className="text-2xl font-bold mb-4 text-crt-fg">KNOWLEDGE GRAPH</h2>
            <div className="flex-1 border border-crt-border overflow-hidden bg-black rounded-none">
              {graphLoading ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-crt-muted">Building connection graph...</p>
                </div>
              ) : graphNodes.length > 0 ? (
                <GraphVisualizer
                  nodes={graphNodes}
                  edges={graphEdges}
                  onNodeClick={handleGraphNodeClick}
                  height={600}
                  className="w-full"
                  rootNodeId={id}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-crt-muted">No connected nodes found</p>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="px-6 py-4 border-t border-crt-border bg-black">
            <p className="text-sm text-crt-fg font-bold mb-3">NODE TYPES:</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00a6b2' }}></div>
                <span className="text-crt-muted">ARTICLE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e5e500' }}></div>
                <span className="text-crt-muted">CLAIM</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e50000' }}></div>
                <span className="text-crt-muted">CHALLENGE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00d900' }}></div>
                <span className="text-crt-muted">EVIDENCE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#b200b2' }}></div>
                <span className="text-crt-muted">THEORY</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#666666' }}></div>
                <span className="text-crt-muted">SOURCE</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Challenge Modal */}
      <ChallengeModal
        isOpen={showChallengeModal}
        claimText={selectedClaimText}
        onSubmit={handleCreateChallenge}
        onCancel={() => {
          setShowChallengeModal(false);
          setSelectedClaimText('');
        }}
        isLoading={aiGenerating}
      />

      {/* AI Generating Loading Overlay */}
      {aiGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-crt-fg text-2xl mb-4 font-mono font-bold">analyzing claim...</div>
            <div className="text-crt-muted font-mono text-sm mb-6">AI is searching the graph and generating evidence</div>
            <div className="mt-4 text-crt-accent animate-pulse font-mono">▓▓▓▓▓▓▓▓░░░░</div>
          </div>
        </div>
      )}

      {/* AI Panel */}
      <AiPanel articleId={id!} articleTitle={article?.properties.title || 'Article'} />
    </>
  );
}

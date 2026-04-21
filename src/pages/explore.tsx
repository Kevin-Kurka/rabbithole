import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { semanticSearch, traverse, listNodes, listEdges } from '../lib/api';
import { GraphVisualizer, type GraphNode, type GraphEdge } from '../components/graph-visualizer';
import type { SentientNode, SentientEdge } from '../lib/types';

export function ExplorePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SentientNode[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load all nodes and edges on mount
  useEffect(() => {
    loadAllNodes();
  }, []);

  const loadAllNodes = async () => {
    setInitialLoading(true);
    try {
      const allNodes = await listNodes(undefined, 100);
      const allEdges = await listEdges(undefined, 100);

      const nodes: GraphNode[] = allNodes.map(n => ({
        id: n.id,
        label: (n.properties as any).text || (n.properties as any).title || n.type,
        type: n.type,
      }));

      const edges: GraphEdge[] = allEdges.map((e: any) => ({
        source: e.source_node_id,
        target: e.target_node_id,
      }));

      setGraphNodes(nodes);
      setGraphEdges(edges);
      setShowGraph(true);
    } catch (err) {
      console.error('Failed to load all nodes:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await semanticSearch(query, 20);
      setResults(data);

      // Build graph from search results
      const nodes: GraphNode[] = data.map(n => ({
        id: n.id,
        label: (n.properties as any).text || (n.properties as any).title || n.type,
        type: n.type,
      }));

      // Traverse each node to find connections
      const edges: GraphEdge[] = [];
      const seenEdges = new Set<string>();

      for (const node of data) {
        try {
          const connected = await traverse(node.id, 1);
          for (const target of connected) {
            if (target.id !== node.id && data.find(n => n.id === target.id)) {
              const edgeKey = [node.id, target.id].sort().join('-');
              if (!seenEdges.has(edgeKey)) {
                edges.push({ source: node.id, target: target.id });
                seenEdges.add(edgeKey);
              }
            }
          }
        } catch {
          // Ignore traversal errors
        }
      }

      setGraphNodes(nodes);
      setGraphEdges(edges);
      setShowGraph(true);
    } catch {
      setResults([]);
      setGraphNodes([]);
      setGraphEdges([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node: GraphNode) => {
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

  const getNodeLabel = (node: SentientNode): string => {
    const props = node.properties as any;
    return props.text || props.title || props.username || node.type;
  };

  const getNodeTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ARTICLE: 'bg-black text-crt-info',
      CLAIM: 'bg-black text-crt-warning',
      EVIDENCE: 'bg-black text-crt-fg',
      THEORY: 'bg-black text-crt-fg',
      CHALLENGE: 'bg-black text-crt-warning',
      SOURCE: 'bg-black border border-crt-muted text-crt-fg',
    };
    return colors[type] || 'bg-black border border-crt-muted text-crt-fg';
  };

  return (<div className="h-screen flex flex-col bg-black font-mono">
      {/* Header with search */}
      <div className="bg-black border-b border-crt-border p-4 z-10">
        <h1 className="text-3xl font-bold mb-4">Explore</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for connections..."
            className="flex-1 px-4 py-2 border border-crt-border  focus:outline-none focus:ring-2 focus:ring-crt-fg"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-crt-selection text-white  hover:bg-crt-border disabled:bg-gray-400 font-medium transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Results list (shown only when searching) */}
        {results.length > 0 && (
          <div className="w-1/4 border-r border-crt-border bg-black overflow-y-auto p-4">
            <h2 className="font-semibold text-lg mb-3">Results ({results.length})</h2>
            <div className="space-y-2">
              {results.map(result => (
                <button
                  key={result.id}
                  onClick={() => handleNodeClick({ id: result.id, label: getNodeLabel(result), type: result.type })}
                  className="w-full text-left p-3 bg-black  border border-crt-border hover:border-crt-fg hover:shadow-md transition-all"
                >
                  <p className="font-medium text-crt-fg line-clamp-2">{getNodeLabel(result)}</p>
                  <span className={`inline-block mt-2 px-2 py-1  text-xs font-medium ${getNodeTypeColor(result.type)}`}>
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Graph visualization - full screen */}
        <div className="flex-1 flex flex-col">
          {initialLoading ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-crt-muted">Loading all connections...</p>
            </div>
          ) : showGraph && graphNodes.length > 0 ? (
            <GraphVisualizer
              nodes={graphNodes}
              edges={graphEdges}
              onNodeClick={handleNodeClick}
              height={typeof window !== 'undefined' ? window.innerHeight - 100 : 800}
              className="flex-1"
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-crt-muted mb-2">No nodes found</p>
                <p className="text-crt-dim text-sm">Create some nodes to see the connection map</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {results.length === 0 && !loading && query && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 pointer-events-none">
          <div className="text-center bg-black  p-8">
            <p className="text-crt-muted mb-2">No results found for "{query}"</p>
            <p className="text-crt-dim text-sm">Try searching for different keywords</p>
          </div>
        </div>
      )}
    </div>
  );
}

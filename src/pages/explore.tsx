import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { semanticSearch, traverse } from '../lib/api';
import { GraphVisualizer, type GraphNode, type GraphEdge } from '../components/graph-visualizer';
import type { SentientNode } from '../lib/types';

export function ExplorePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SentientNode[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

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
      ARTICLE: 'bg-blue-100 text-blue-800',
      CLAIM: 'bg-yellow-100 text-yellow-800',
      EVIDENCE: 'bg-green-100 text-green-800',
      THEORY: 'bg-purple-100 text-purple-800',
      CHALLENGE: 'bg-orange-100 text-orange-800',
      SOURCE: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Explore</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for connections..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rabbit-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-rabbit-600 text-white rounded-lg hover:bg-rabbit-700 disabled:bg-gray-400 font-medium transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Results list */}
          <div className="overflow-y-auto">
            <h2 className="font-semibold text-lg mb-3">Results ({results.length})</h2>
            <div className="space-y-2">
              {results.map(result => (
                <button
                  key={result.id}
                  onClick={() => handleNodeClick({ id: result.id, label: getNodeLabel(result), type: result.type })}
                  className="w-full text-left p-3 bg-white rounded border border-gray-200 hover:border-rabbit-500 hover:shadow-md transition-all"
                >
                  <p className="font-medium text-gray-900 line-clamp-2">{getNodeLabel(result)}</p>
                  <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${getNodeTypeColor(result.type)}`}>
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Graph visualization */}
          <div className="col-span-2">
            <h2 className="font-semibold text-lg mb-3">Connection Map</h2>
            {showGraph && graphNodes.length > 0 ? (
              <GraphVisualizer
                nodes={graphNodes}
                edges={graphEdges}
                onNodeClick={handleNodeClick}
                height={500}
              />
            ) : (
              <div className="bg-white rounded border border-gray-200 p-8 text-center">
                <p className="text-gray-500">Building connection graph...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {results.length === 0 && !loading && query && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-2">No results found for "{query}"</p>
            <p className="text-gray-500 text-sm">Try searching for different keywords</p>
          </div>
        </div>
      )}

      {!query && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg">Start searching to explore connections</p>
          </div>
        </div>
      )}
    </div>
  );
}

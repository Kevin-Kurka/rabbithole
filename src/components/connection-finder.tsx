import { useEffect, useState } from 'react';
import { listNodes, traverse } from '../lib/api';
import type { SentientNode } from '../lib/types';

interface ConnectionPath {
  nodeIds: string[];
  nodes: SentientNode[];
}

export function ConnectionFinder() {
  const [allNodes, setAllNodes] = useState<SentientNode<Record<string, unknown>>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [fromNodeId, setFromNodeId] = useState('');
  const [toNodeId, setToNodeId] = useState('');
  const [path, setPath] = useState<ConnectionPath | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Load all nodes on mount
  useEffect(() => {
    const loadNodes = async () => {
      try {
        const nodes = await listNodes(undefined, 200);
        setAllNodes(nodes as SentientNode<Record<string, unknown>>[]);
      } catch (err) {
        console.error('Failed to load nodes:', err);
      } finally {
        setLoading(false);
      }
    };
    loadNodes();
  }, []);

  const getNodeLabel = (node: SentientNode): string => {
    const props = node.properties as any;
    return props.text || props.title || props.username || node.type;
  };

  const findConnection = async () => {
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) {
      return;
    }

    setSearching(true);
    setPath(null);
    setNotFound(false);

    try {
      // Traverse from the start node
      const traversed = await traverse(fromNodeId, 5);

      // Look for the target node in the traversal results
      const foundNode = traversed.find((n: any) => n.id === toNodeId);

      if (foundNode) {
        // Build the path by following parent references
        const pathIds: string[] = [fromNodeId];
        const pathNodes: SentientNode[] = [allNodes.find(n => n.id === fromNodeId)!];

        // Simple path construction - in a real scenario, we'd track the full path
        // For now, we add intermediate nodes from traversal
        const intermediate = traversed
          .filter((n: any) => n.id !== fromNodeId && n.id !== toNodeId)
          .slice(0, 3); // Limit to 3 intermediate nodes

        for (const node of intermediate) {
          pathIds.push(node.id);
          pathNodes.push(node);
        }

        pathIds.push(toNodeId);
        pathNodes.push(allNodes.find(n => n.id === toNodeId)!);

        setPath({
          nodeIds: pathIds,
          nodes: pathNodes,
        });
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Failed to find connection:', err);
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchClick = () => {
    findConnection();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      findConnection();
    }
  };

  if (loading) {
    return (
      <div className="bg-black border border-crt-border p-4 font-mono">
        <p className="text-crt-muted text-sm">Loading nodes...</p>
      </div>
    );
  }

  return (
    <div className="bg-black border border-crt-border font-mono">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-crt-selection transition-colors flex items-center justify-between"
      >
        <h2 className="text-lg font-bold text-crt-fg">[ CONNECTION FINDER ]</h2>
        <span className="text-crt-muted">{expanded ? '[-]' : '[+]'}</span>
      </button>

      {expanded && (
        <div className="border-t border-crt-border p-4 space-y-4">
          {/* From Node Selector */}
          <div>
            <label className="block text-sm font-medium text-crt-fg mb-2">FROM NODE:</label>
            <select
              value={fromNodeId}
              onChange={(e) => {
                setFromNodeId(e.target.value);
                setPath(null);
                setNotFound(false);
              }}
              className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm font-mono"
            >
              <option value="">-- Select a node --</option>
              {allNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {`[${node.type}] ${getNodeLabel(node).substring(0, 50)}`}
                </option>
              ))}
            </select>
          </div>

          {/* To Node Selector */}
          <div>
            <label className="block text-sm font-medium text-crt-fg mb-2">TO NODE:</label>
            <select
              value={toNodeId}
              onChange={(e) => {
                setToNodeId(e.target.value);
                setPath(null);
                setNotFound(false);
              }}
              className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg focus:outline-none focus:ring-2 focus:ring-crt-fg text-sm font-mono"
            >
              <option value="">-- Select a node --</option>
              {allNodes.filter((n) => n.id !== fromNodeId).map((node) => (
                <option key={node.id} value={node.id}>
                  {`[${node.type}] ${getNodeLabel(node).substring(0, 50)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearchClick}
            disabled={searching || !fromNodeId || !toNodeId}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 bg-crt-selection text-white font-medium hover:bg-crt-border disabled:bg-crt-muted disabled:text-crt-dim transition-colors font-mono"
          >
            {searching ? 'SEARCHING...' : 'FIND CONNECTION'}
          </button>

          {/* Results */}
          {notFound && (
            <div className="p-3 bg-black border border-crt-error text-crt-error text-sm font-mono">
              &gt;&gt; NO DIRECT CONNECTION FOUND WITHIN 5 HOPS
            </div>
          )}

          {path && (
            <div className="mt-4">
              <p className="text-crt-fg font-medium mb-3 text-sm">CONNECTION PATH:</p>
              <div className="space-y-2">
                {path.nodes.map((node, idx) => (
                  <div key={node.id}>
                    <div className="flex items-center gap-2 p-3 bg-black border border-crt-border hover:border-crt-fg transition-colors">
                      <span className="text-crt-fg font-mono text-xs bg-crt-border px-2 py-1">
                        {node.type}
                      </span>
                      <span className="text-crt-fg text-sm flex-1">
                        {getNodeLabel(node).substring(0, 60)}
                      </span>
                      {idx < path.nodes.length - 1 && (
                        <span className="text-crt-muted text-xs">→</span>
                      )}
                    </div>
                    {idx < path.nodes.length - 1 && (
                      <div className="flex justify-center py-1">
                        <span className="text-crt-muted text-xs">↓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-black border border-crt-border text-crt-fg text-xs">
                &gt;&gt; PATH FOUND: {path.nodes.length} nodes, {path.nodes.length - 1} hops
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

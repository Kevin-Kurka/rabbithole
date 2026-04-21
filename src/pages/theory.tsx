import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MarkdownEditor } from '../components/markdown-editor';
import { GraphVisualizer, type GraphNode, type GraphEdge } from '../components/graph-visualizer';
import { SearchPanel } from '../components/search-panel';
import { getNode, createNode, createEdge, traverse } from '../lib/api';
import type { Theory, SentientNode } from '../lib/types';

export function TheoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [theory, setTheory] = useState<any | null>(null);
  const [narrative, setNarrative] = useState('');
  const [title, setTitle] = useState('');
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing theory if ID provided
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const theoryNode = await getNode(id) as any;
        setTheory(theoryNode);
        const props = theoryNode.properties as any;
        setTitle((props?.title) || '');
        setNarrative((props?.body) || '');

        // Load connected nodes
        const traversed = await traverse(id, 2);
        const connected = traversed.filter(n => n.id !== id);

        const nodes: GraphNode[] = [
          { id, label: theoryNode.properties.title, type: 'THEORY' },
          ...connected.map(n => ({
            id: n.id,
            label: (n.properties as any).text || (n.properties as any).title || n.type,
            type: n.type,
          })),
        ];

        const edges: GraphEdge[] = traversed
          .filter(n => n.id !== id)
          .map(n => ({
            source: id,
            target: n.id,
            label: 'CONNECTS',
          }));

        setGraphNodes(nodes);
        setGraphEdges(edges);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load theory');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSelectNode = (node: SentientNode) => {
    // Add to graph if not already there
    const exists = graphNodes.find(n => n.id === node.id);
    if (exists) {
      setError('Node already in theory');
      return;
    }

    const newNode: GraphNode = {
      id: node.id,
      label: (node.properties as any).text || (node.properties as any).title || node.type,
      type: node.type,
    };

    const newEdge: GraphEdge = {
      source: id || 'theory-new',
      target: node.id,
      label: 'CONNECTS',
    };

    setGraphNodes([...graphNodes, newNode]);
    setGraphEdges([...graphEdges, newEdge]);
    setError('');
  };

  const handleRemoveNode = (nodeId: string) => {
    setGraphNodes(graphNodes.filter(n => n.id !== nodeId));
    setGraphEdges(graphEdges.filter(e => e.target !== nodeId && e.source !== nodeId));
  };

  const handlePublish = async () => {
    if (!title.trim() || !narrative.trim()) {
      setError('Title and narrative are required');
      return;
    }

    if (graphNodes.length === 0) {
      setError('Add at least one node to the theory');
      return;
    }

    setSaving(true);
    try {
      const theoryProps = {
        title,
        body: narrative,
        status: 'published' as const,
        published_at: new Date().toISOString(),
      };

      const newTheory = await createNode('THEORY', theoryProps);

      // Create CONNECTS edges
      for (let i = 0; i < graphNodes.length; i++) {
        const node = graphNodes[i];
        if (node.id !== newTheory.id) {
          await createEdge(newTheory.id, node.id, 'CONNECTS', {
            sequence: i,
            annotation: `Connected node ${i + 1}`,
          });
        }
      }

      navigate(`/theory/${newTheory.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish theory');
    } finally {
      setSaving(false);
    }
  };

  const handleNodeClick = (node: GraphNode) => {
    // Navigate to the node's detail page based on type
    const routeMap: Record<string, string> = {
      ARTICLE: '/article',
      CLAIM: '/claim',
      THEORY: '/theory',
      CHALLENGE: '/challenge',
      EVIDENCE: '/evidence',
    };

    const route = routeMap[node.type];
    if (route) {
      navigate(`${route}/${node.id}`);
    }
  };

  if (loading) {
    return (<div className="max-w-7xl mx-auto font-mono">
        <div className="text-center py-12">
          <p className="text-crt-dim">Loading theory...</p>
        </div>
      </div>
    );
  }

  return (<div className="max-w-7xl mx-auto h-screen flex flex-col font-mono">
      {/* Header */}
      <div className="mb-4">
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Theory title..."
            className="text-3xl font-bold w-full focus:outline-none"
          />
        </div>

        {error && (
          <div className="p-3 bg-black border border-red-200  text-sm text-crt-error mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Left panel: Narrative editor */}
        <div className="flex flex-col overflow-hidden">
          <h2 className="font-semibold text-lg mb-2">Narrative</h2>
          <div className="flex-1 overflow-hidden">
            <MarkdownEditor
              value={narrative}
              onChange={setNarrative}
              height={400}
              placeholder="Write your theory narrative..."
            />
          </div>
        </div>

        {/* Right panel: Graph and search */}
        <div className="flex flex-col overflow-hidden">
          <h2 className="font-semibold text-lg mb-2">Connected Nodes</h2>

          {/* Search panel */}
          <div className="mb-4">
            <SearchPanel
              onSelect={handleSelectNode}
              placeholder="Search and add nodes to theory..."
            />
          </div>

          {/* Graph */}
          <div className="flex-1 overflow-hidden">
            <GraphVisualizer
              nodes={graphNodes}
              edges={graphEdges}
              onNodeClick={handleNodeClick}
              height={400}
            />
          </div>

          {/* Nodes list */}
          <div className="mt-4 bg-black border border-crt-border  p-3 max-h-32 overflow-y-auto">
            <div className="text-sm font-medium text-crt-fg mb-2">
              Nodes in theory ({graphNodes.length})
            </div>
            <div className="space-y-1">
              {graphNodes.map(node => (
                <div
                  key={node.id}
                  className="flex items-center justify-between bg-black p-2  text-sm"
                >
                  <span className="text-crt-fg truncate">{node.label}</span>
                  {node.id !== (id || 'theory-new') && (
                    <button
                      onClick={() => handleRemoveNode(node.id)}
                      className="text-crt-error hover:text-crt-error font-medium text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-crt-border">
        <button
          onClick={handlePublish}
          disabled={saving}
          className="px-6 py-2 bg-crt-selection text-white  hover:bg-crt-border disabled:bg-gray-400 font-medium transition-colors"
        >
          {saving ? 'Publishing...' : 'Publish Theory'}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { listNodes, createEdge } from '../lib/api';
import type { SentientNode } from '../lib/types';

interface ConnectionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const EDGE_TYPES = [
  'REFERENCES',
  'SUPPORTS',
  'REFUTES',
  'CITES',
  'CONNECTS',
  'CHALLENGES',
  'RELATED_TO',
];

const RELATIONSHIP_TYPES = [
  'funded_by',
  'recruited_for',
  'testified_about',
  'protected_by',
  'employed_by',
  'collaborated_with',
  'contradicts',
  'supports',
  'caused_by',
  'resulted_in',
  'mentioned_in',
  'authored_by',
];

export function ConnectionEditor({ isOpen, onClose, onCreated }: ConnectionEditorProps) {
  const [nodes, setNodes] = useState<SentientNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [edgeType, setEdgeType] = useState('RELATED_TO');
  const [label, setLabel] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [evidenceBasis, setEvidenceBasis] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Load nodes on mount
  useEffect(() => {
    if (!isOpen) return;
    const loadNodes = async () => {
      try {
        setLoading(true);
        const allNodes = await listNodes(undefined, 100);
        setNodes(allNodes as SentientNode[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load nodes');
      } finally {
        setLoading(false);
      }
    };
    loadNodes();
  }, [isOpen]);

  const filteredNodes = nodes.filter(n => {
    if (!searchQuery.trim()) return true;
    const title = (n.properties as any)?.title || (n.properties as any)?.text || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreate = async () => {
    if (!sourceId || !targetId) {
      setError('Please select both source and target nodes');
      return;
    }

    setCreating(true);
    setError('');
    try {
      await createEdge(sourceId, targetId, edgeType, {
        label: label || undefined,
        relationship_type: relationshipType || undefined,
        confidence,
        evidence_basis: evidenceBasis || undefined,
        status: 'active',
        created_by: 'user',
      });

      // Reset form
      setSourceId('');
      setTargetId('');
      setEdgeType('RELATED_TO');
      setLabel('');
      setRelationshipType('');
      setConfidence(50);
      setEvidenceBasis('');

      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  const sourceNode = nodes.find(n => n.id === sourceId);
  const targetNode = nodes.find(n => n.id === targetId);

  const getNodeLabel = (node: SentientNode): string => {
    const props = node.properties as any;
    return props?.title || props?.text || props?.url || `[${node.type}]`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 font-mono">
      <div className="bg-black border border-crt-border w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-crt-border">
          <h2 className="text-crt-fg font-bold text-xl">Create Connection</h2>
          <button
            onClick={onClose}
            className="text-crt-muted hover:text-crt-fg text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-2 border border-crt-error text-crt-error text-sm bg-black">
              {error}
            </div>
          )}

          {/* Source Node */}
          <div>
            <label className="text-crt-dim text-xs uppercase block mb-1">From Node</label>
            {!sourceId ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg text-sm font-mono focus:outline-none"
                  style={{ color: '#00ff00' }}
                />
                <div className="border border-crt-border bg-black max-h-[150px] overflow-y-auto">
                  {loading ? (
                    <div className="p-2 text-crt-muted text-xs">Loading nodes...</div>
                  ) : filteredNodes.length === 0 ? (
                    <div className="p-2 text-crt-muted text-xs">No nodes found</div>
                  ) : (
                    filteredNodes.map(node => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setSourceId(node.id);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-1 hover:bg-crt-border hover:text-black text-xs text-crt-fg border-b border-crt-border last:border-b-0"
                      >
                        {getNodeLabel(node)} <span className="text-crt-dim text-xs">({node.type})</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 bg-black border border-crt-border">
                <span className="text-crt-fg text-sm">{getNodeLabel(sourceNode!)}</span>
                <button
                  onClick={() => setSourceId('')}
                  className="text-crt-muted hover:text-crt-fg"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Arrow indicator */}
          {sourceId && targetId && (
            <div className="text-center text-crt-fg">→</div>
          )}

          {/* Target Node */}
          <div>
            <label className="text-crt-dim text-xs uppercase block mb-1">To Node</label>
            {!targetId ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg text-sm font-mono focus:outline-none"
                  style={{ color: '#00ff00' }}
                />
                <div className="border border-crt-border bg-black max-h-[150px] overflow-y-auto">
                  {loading ? (
                    <div className="p-2 text-crt-muted text-xs">Loading nodes...</div>
                  ) : filteredNodes.length === 0 ? (
                    <div className="p-2 text-crt-muted text-xs">No nodes found</div>
                  ) : (
                    filteredNodes.map(node => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setTargetId(node.id);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-1 hover:bg-crt-border hover:text-black text-xs text-crt-fg border-b border-crt-border last:border-b-0"
                      >
                        {getNodeLabel(node)} <span className="text-crt-dim text-xs">({node.type})</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 bg-black border border-crt-border">
                <span className="text-crt-fg text-sm">{getNodeLabel(targetNode!)}</span>
                <button
                  onClick={() => setTargetId('')}
                  className="text-crt-muted hover:text-crt-fg"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Edge Type */}
          <div>
            <label className="text-crt-dim text-xs uppercase block mb-1">Edge Type</label>
            <select
              value={edgeType}
              onChange={e => setEdgeType(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg text-sm font-mono focus:outline-none"
            >
              {EDGE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <label className="text-crt-dim text-xs uppercase block mb-1">Label (optional)</label>
            <input
              type="text"
              placeholder="What is this connection?"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg text-sm font-mono focus:outline-none"
              style={{ color: '#00ff00' }}
            />
          </div>

          {/* Relationship Type */}
          <div>
            <label className="text-crt-dim text-xs uppercase block mb-1">Relationship Type (optional)</label>
            <input
              list="relationship-types"
              value={relationshipType}
              onChange={e => setRelationshipType(e.target.value)}
              placeholder="funded_by, collaborated_with, ..."
              className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg text-sm font-mono focus:outline-none"
              style={{ color: '#00ff00' }}
            />
            <datalist id="relationship-types">
              {RELATIONSHIP_TYPES.map(type => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>

          {/* Confidence Slider */}
          <div>
            <label className="text-crt-dim text-xs uppercase block mb-2">
              Confidence: <span className="text-crt-fg font-bold">{confidence}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={confidence}
              onChange={e => setConfidence(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Evidence Basis */}
          <div>
            <label className="text-crt-dim text-xs uppercase block mb-1">Evidence Basis (optional)</label>
            <textarea
              placeholder="Why does this connection exist?"
              value={evidenceBasis}
              onChange={e => setEvidenceBasis(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-crt-border text-crt-fg text-sm font-mono resize-none h-20 focus:outline-none"
              style={{ color: '#00ff00' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-crt-border p-4 flex gap-2">
          <button
            onClick={handleCreate}
            disabled={!sourceId || !targetId || creating}
            className="flex-1 px-3 py-2 bg-crt-border text-black font-mono text-sm disabled:opacity-50 hover:opacity-80"
          >
            {creating ? 'Creating...' : 'Create Connection'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-black border border-crt-border text-crt-fg font-mono text-sm hover:bg-crt-border hover:text-black"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface CardNodeData {
  nodeType: string;
  title: string;
  excerpt: string;
  status?: string;
  side?: string;
  sourceType?: string;
  [key: string]: any;
}

const TYPE_COLORS: Record<string, string> = {
  ARTICLE: '#00a6b2',
  CLAIM: '#e5e500',
  CHALLENGE: '#e50000',
  EVIDENCE: '#00d900',
  THEORY: '#b200b2',
  SOURCE: '#666666',
};

const TYPE_LABELS: Record<string, string> = {
  ARTICLE: '📄 ARTICLE',
  CLAIM: '💬 CLAIM',
  CHALLENGE: '⚔️ CHALLENGE',
  EVIDENCE: '📋 EVIDENCE',
  THEORY: '🔗 THEORY',
  SOURCE: '📎 SOURCE',
};

export const CardNode = memo(({ data, selected }: NodeProps) => {
  const d = data as CardNodeData;
  const borderColor = TYPE_COLORS[d.nodeType] || '#00ff00';
  const typeLabel = TYPE_LABELS[d.nodeType] || d.nodeType;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: borderColor, border: 'none', width: 6, height: 6 }} />
      <div
        style={{
          width: 220,
          borderLeft: `4px solid ${borderColor}`,
          background: selected ? '#0d1f0d' : '#0a0a0a',
          border: selected ? `1px solid #00ff00` : `1px solid #1a1a1a`,
          borderLeftWidth: 4,
          borderLeftColor: borderColor,
          padding: '10px 12px',
          fontFamily: '"SF Mono", "Fira Code", Menlo, monospace',
          cursor: 'pointer',
          transition: 'all 0.15s',
          boxShadow: selected ? '0 0 12px rgba(0, 255, 0, 0.3)' : 'none',
        }}
        className="hover:brightness-125"
      >
        {/* Type badge */}
        <div style={{ fontSize: 9, color: borderColor, marginBottom: 4, letterSpacing: '0.05em' }}>
          {typeLabel}
        </div>

        {/* Title */}
        <div style={{ fontSize: 12, color: '#00ff00', fontWeight: 'bold', marginBottom: 4, lineHeight: 1.3 }}>
          {d.title.length > 50 ? d.title.slice(0, 50) + '...' : d.title}
        </div>

        {/* Excerpt */}
        {d.excerpt && (
          <div style={{ fontSize: 10, color: '#00a600', lineHeight: 1.3 }}>
            {d.excerpt.length > 80 ? d.excerpt.slice(0, 80) + '...' : d.excerpt}
          </div>
        )}

        {/* Status / Side badges */}
        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {d.status && (
            <span style={{
              fontSize: 8,
              padding: '1px 5px',
              border: `1px solid ${borderColor}`,
              color: borderColor,
              textTransform: 'uppercase',
            }}>
              {d.status}
            </span>
          )}
          {d.side && (
            <span style={{
              fontSize: 8,
              padding: '1px 5px',
              border: `1px solid ${d.side === 'for' ? '#00d900' : '#e50000'}`,
              color: d.side === 'for' ? '#00d900' : '#e50000',
              textTransform: 'uppercase',
            }}>
              {d.side}
            </span>
          )}
          {d.sourceType && (
            <span style={{ fontSize: 8, color: '#666666' }}>
              {d.sourceType}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: borderColor, border: 'none', width: 6, height: 6 }} />
    </>
  );
});

CardNode.displayName = 'CardNode';

import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface DetailPanelProps {
  node: any | null; // The traversed node data
  onClose: () => void;
}

const TYPE_ROUTES: Record<string, string> = {
  ARTICLE: '/article',
  CHALLENGE: '/challenge',
  THEORY: '/theory',
};

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ARTICLE: '#00a6b2',
    CLAIM: '#e5e500',
    CHALLENGE: '#e50000',
    EVIDENCE: '#00d900',
    THEORY: '#b200b2',
    SOURCE: '#666666',
  };
  return colors[type] || '#00ff00';
}

export function DetailPanel({ node, onClose }: DetailPanelProps) {
  const navigate = useNavigate();

  if (!node) return null;

  const props = node.properties || {};
  const nodeType = node.node_type || node.type || 'UNKNOWN';
  const title = props.title || props.text || props.url || 'Untitled';
  const route = TYPE_ROUTES[nodeType];

  return (
    <div className="fixed top-0 right-0 h-full w-[420px] bg-black border-l border-crt-border z-50 flex flex-col font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-crt-border">
        <div>
          <span className="text-xs" style={{ color: getTypeColor(nodeType) }}>{nodeType}</span>
          <h2 className="text-crt-fg font-bold text-lg leading-tight mt-1">{title}</h2>
        </div>
        <button onClick={onClose} className="text-crt-muted hover:text-crt-fg text-xl px-2">✕</button>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ARTICLE */}
        {nodeType === 'ARTICLE' && (
          <>
            {props.summary && <p className="text-crt-muted text-sm italic">{props.summary}</p>}
            {props.published_at && <p className="text-crt-dim text-xs">Published: {new Date(props.published_at).toLocaleDateString()}</p>}
            <div className="text-crt-fg text-sm leading-relaxed prose-invert">
              <ReactMarkdown>{props.body || ''}</ReactMarkdown>
            </div>
          </>
        )}

        {/* CLAIM */}
        {nodeType === 'CLAIM' && (
          <>
            <div className="text-crt-fg text-sm leading-relaxed">{props.text}</div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 border" style={{ borderColor: '#e5e500', color: '#e5e500' }}>[{props.status?.toUpperCase()}]</span>
            </div>
          </>
        )}

        {/* CHALLENGE */}
        {nodeType === 'CHALLENGE' && (
          <>
            <p className="text-crt-muted text-sm">{props.rationale}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="border border-crt-border p-2">
                <div className="text-crt-dim text-xs">Community</div>
                <div className="text-crt-fg font-bold">{props.community_score ?? 0}</div>
              </div>
              <div className="border border-crt-border p-2">
                <div className="text-crt-dim text-xs">AI Score</div>
                <div className="text-crt-fg font-bold">{props.ai_score ?? 0}</div>
              </div>
            </div>
            <div className="text-xs px-2 py-0.5 border inline-block" style={{ borderColor: '#e50000', color: '#e50000' }}>
              [{props.status?.toUpperCase()}] {props.verdict?.toUpperCase()}
            </div>
            {props.ai_analysis && <p className="text-crt-muted text-xs mt-2">{props.ai_analysis}</p>}
          </>
        )}

        {/* EVIDENCE */}
        {nodeType === 'EVIDENCE' && (
          <>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-0.5 border" style={{
                borderColor: props.side === 'for' ? '#00d900' : '#e50000',
                color: props.side === 'for' ? '#00d900' : '#e50000',
              }}>{props.side?.toUpperCase()}</span>
              <span className="text-xs text-crt-dim">{props.source_type}</span>
            </div>
            <p className="text-crt-fg text-sm leading-relaxed">{props.body}</p>
            {props.source_url && (
              <a href={props.source_url} target="_blank" rel="noopener noreferrer" className="text-crt-accent text-xs hover:underline">
                → View source
              </a>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
              <div className="border border-crt-border p-2">
                <div className="text-crt-dim text-xs">Relevance</div>
                <div className="w-full bg-black h-2 mt-1"><div className="h-2" style={{ width: `${props.relevance_score || 0}%`, background: '#00d900' }}></div></div>
              </div>
              <div className="border border-crt-border p-2">
                <div className="text-crt-dim text-xs">Credibility</div>
                <div className="w-full bg-black h-2 mt-1"><div className="h-2" style={{ width: `${props.credibility_score || 0}%`, background: '#00a6b2' }}></div></div>
              </div>
            </div>
          </>
        )}

        {/* THEORY */}
        {nodeType === 'THEORY' && (
          <>
            {props.summary && <p className="text-crt-muted text-sm italic">{props.summary}</p>}
            <div className="text-crt-fg text-sm leading-relaxed prose-invert">
              <ReactMarkdown>{props.body || ''}</ReactMarkdown>
            </div>
          </>
        )}

        {/* SOURCE */}
        {nodeType === 'SOURCE' && (
          <>
            {props.publication && <p className="text-crt-dim text-xs">{props.publication}</p>}
            {props.author && <p className="text-crt-dim text-xs">By {props.author}</p>}
            {props.date && <p className="text-crt-dim text-xs">{props.date}</p>}
            <span className="text-xs text-crt-dim">{props.source_type}</span>
            {props.url && (
              <a href={props.url} target="_blank" rel="noopener noreferrer" className="block text-crt-accent text-sm hover:underline mt-2">
                → Open source
              </a>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {route && (
        <div className="p-4 border-t border-crt-border">
          <button
            onClick={() => navigate(`${route}/${node.id}`)}
            className="w-full py-2 border border-crt-fg text-crt-fg hover:bg-crt-selection text-sm font-mono"
          >
            Open full page →
          </button>
        </div>
      )}
    </div>
  );
}

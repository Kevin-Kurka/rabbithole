import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarkdownEditor } from '../components/markdown-editor';
import { createNode, createEdge } from '../lib/api';
import type { ArticleProps } from '../lib/types';

interface Source {
  id: string;
  url: string;
  title: string;
  publication?: string;
  author?: string;
  date?: string;
  source_type: 'news' | 'academic' | 'government' | 'primary' | 'other';
}

interface Claim {
  id: string;
  text: string;
  start: number;
  end: number;
}

export function WritePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceForm, setSourceForm] = useState<Partial<Source>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMarkClaim = (text: string, start: number, end: number) => {
    const newClaim: Claim = {
      id: `claim-${Date.now()}`,
      text,
      start,
      end,
    };
    setClaims([...claims, newClaim]);

    // Insert claim marker in body
    const before = body.slice(0, start);
    const claim = body.slice(start, end);
    const after = body.slice(end);
    setBody(`${before}==${claim}==${after}`);
  };

  const handleAddSource = () => {
    if (!sourceForm.url || !sourceForm.title) {
      setError('URL and title are required');
      return;
    }

    const newSource: Source = {
      id: `source-${Date.now()}`,
      url: sourceForm.url,
      title: sourceForm.title,
      publication: sourceForm.publication,
      author: sourceForm.author,
      date: sourceForm.date,
      source_type: sourceForm.source_type || 'other',
    };

    setSources([...sources, newSource]);
    setSourceForm({});
    setShowSourceForm(false);
    setError('');

    // Insert footnote in body
    const footnoteNum = sources.length + 1;
    setBody(body + `\n\n[^${footnoteNum}]: ${sourceForm.title}`);
  };

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create article node with properties
      const articleProps: ArticleProps = {
        title,
        body,
        status: 'published',
        published_at: new Date().toISOString(),
      };

      const article = await createNode('ARTICLE', articleProps);

      // Create source nodes and edges
      for (const source of sources) {
        const sourceNode = await createNode('SOURCE', {
          url: source.url,
          title: source.title,
          publication: source.publication,
          author: source.author,
          date: source.date,
          source_type: source.source_type,
        });
        await createEdge(article.id, sourceNode.id, 'CITES');
      }

      // Navigate to the published article
      navigate(`/article/${article.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish article');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const articleProps: ArticleProps = {
        title,
        body,
        status: 'draft',
        published_at: new Date().toISOString(),
      };

      const article = await createNode('ARTICLE', articleProps);

      // Create source nodes and edges
      for (const source of sources) {
        const sourceNode = await createNode('SOURCE', {
          url: source.url,
          title: source.title,
          publication: source.publication,
          author: source.author,
          date: source.date,
          source_type: source.source_type,
        });
        await createEdge(article.id, sourceNode.id, 'CITES');
      }

      // Navigate to the draft
      navigate(`/article/${article.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const removeClaim = (id: string) => {
    const claim = claims.find(c => c.id === id);
    if (!claim) return;

    // Remove claim markers from body
    const markerStart = body.indexOf(`==${claim.text}==`);
    if (markerStart !== -1) {
      const before = body.slice(0, markerStart);
      const after = body.slice(markerStart + claim.text.length + 4);
      setBody(before + claim.text + after);
    }

    setClaims(claims.filter(c => c.id !== id));
  };

  const removeSource = (id: string) => {
    const source = sources.find(s => s.id === id);
    if (source) {
      setSources(sources.filter(s => s.id !== id));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black text-crt-fg font-mono">
      {/* Header */}
      <div className="border-b border-crt-border p-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="[ Article Title ]"
          className="w-full text-3xl font-bold bg-black text-crt-fg placeholder-crt-dim focus:outline-none border-none p-0"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-black border-b border-crt-error p-4">
          <p className="text-crt-error text-sm">{'>'} ERROR: {error}</p>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex gap-6 overflow-hidden p-6">
        {/* Main editor */}
        <div className="flex-1 flex flex-col border border-crt-border overflow-hidden">
          <div className="bg-black p-3 border-b border-crt-border text-xs text-crt-dim">
            $ nano article.md
          </div>
          <div className="flex-1 overflow-hidden">
            <MarkdownEditor value={body} onChange={setBody} height={600} />
          </div>
        </div>

        {/* Sidebar: Sources */}
        <div className="w-80 flex flex-col border border-crt-border overflow-hidden">
          <div className="bg-black p-3 border-b border-crt-border text-xs text-crt-dim font-bold">
            SOURCES ({sources.length})
          </div>

          {/* Sources list */}
          <div className="flex-1 overflow-y-auto p-4 bg-black space-y-3">
            {sources.length === 0 ? (
              <p className="text-xs text-crt-muted">{'>'} no sources yet</p>
            ) : (
              sources.map(source => (
                <div key={source.id} className="bg-black border border-crt-border p-2">
                  <p className="text-xs font-medium text-crt-fg mb-1 truncate">{source.title}</p>
                  {source.publication && (
                    <p className="text-xs text-crt-muted truncate">{source.publication}</p>
                  )}
                  <button
                    onClick={() => removeSource(source.id)}
                    className="text-xs text-crt-error hover:text-crt-fg mt-2"
                  >
                    [remove]
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Source form */}
          <div className="border-t border-crt-border bg-black">
            {showSourceForm ? (
              <div className="p-4 space-y-2 text-sm">
                <input
                  type="url"
                  placeholder="URL"
                  value={sourceForm.url || ''}
                  onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                  className="w-full px-2 py-1 bg-black border border-crt-border text-crt-fg text-xs focus:outline-none focus:border-crt-fg placeholder-crt-muted"
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={sourceForm.title || ''}
                  onChange={(e) => setSourceForm({ ...sourceForm, title: e.target.value })}
                  className="w-full px-2 py-1 bg-black border border-crt-border text-crt-fg text-xs focus:outline-none focus:border-crt-fg placeholder-crt-muted"
                />
                <input
                  type="text"
                  placeholder="Publication"
                  value={sourceForm.publication || ''}
                  onChange={(e) => setSourceForm({ ...sourceForm, publication: e.target.value })}
                  className="w-full px-2 py-1 bg-black border border-crt-border text-crt-fg text-xs focus:outline-none focus:border-crt-fg placeholder-crt-muted"
                />
                <select
                  value={sourceForm.source_type || 'other'}
                  onChange={(e) => setSourceForm({ ...sourceForm, source_type: e.target.value as any })}
                  className="w-full px-2 py-1 bg-black border border-crt-border text-crt-fg text-xs focus:outline-none focus:border-crt-fg"
                >
                  <option value="news">News</option>
                  <option value="academic">Academic</option>
                  <option value="government">Government</option>
                  <option value="primary">Primary</option>
                  <option value="other">Other</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddSource}
                    className="flex-1 px-2 py-1 bg-crt-fg text-black text-xs font-bold hover:bg-white transition"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowSourceForm(false)}
                    className="flex-1 px-2 py-1 bg-crt-border text-crt-fg text-xs hover:bg-crt-fg hover:text-black transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSourceForm(true)}
                className="w-full p-4 text-xs text-crt-fg hover:bg-crt-border transition text-left font-bold"
              >
                + Add Source
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer with buttons */}
      <div className="border-t border-crt-border bg-black p-4 flex gap-3">
        <button
          onClick={handlePublish}
          disabled={loading}
          className="px-6 py-2 bg-crt-fg text-black font-bold hover:bg-white disabled:opacity-50 transition"
        >
          {loading ? '[ Publishing... ]' : '[ Publish ]'}
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={loading}
          className="px-6 py-2 bg-crt-border text-crt-fg font-bold hover:bg-crt-fg hover:text-black disabled:opacity-50 transition"
        >
          [ Save Draft ]
        </button>
        <span className="text-xs text-crt-dim ml-auto pt-2">
          {title.length} chars | {body.split(/\s+/).filter(w => w).length} words | {sources.length} sources
        </span>
      </div>
    </div>
  );
}

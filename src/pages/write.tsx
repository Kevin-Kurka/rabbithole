import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarkdownEditor } from '../components/markdown-editor';
import { createNode, createEdge } from '../lib/api';
import type { ArticleProps, ClaimProps, SourceProps } from '../lib/types';

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
      // Get user ID (from localStorage or token)
      const token = localStorage.getItem('sentient_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Create article node
      const articleProps: ArticleProps = {
        title,
        body,
        status: 'published',
        published_at: new Date().toISOString(),
      };

      const article = await createNode('ARTICLE', articleProps);

      // Create claim nodes and edges
      for (const claim of claims) {
        const claimProps: ClaimProps = {
          text: claim.text,
          highlight_start: claim.start,
          highlight_end: claim.end,
          status: 'unchallenged',
        };

        const claimNode = await createNode('CLAIM', claimProps);
        await createEdge(article.id, claimNode.id, 'CONTAINS_CLAIM');
      }

      // Create source nodes and edges
      for (const source of sources) {
        const sourceProps: SourceProps = {
          url: source.url,
          title: source.title,
          publication: source.publication,
          author: source.author,
          date: source.date,
          source_type: source.source_type,
        };

        const sourceNode = await createNode('SOURCE', sourceProps);
        await createEdge(article.id, sourceNode.id, 'CITES');
      }

      navigate(`/article/${article.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish article');
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

  return (<div className="max-w-6xl mx-auto font-mono">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Write Article</h1>
        <p className="text-crt-muted">Create and publish articles with claims and sources</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-black border border-red-200  text-crt-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="mb-6">
            <label className="block text-sm font-medium text-crt-fg mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title..."
              className="w-full px-4 py-2 border border-crt-border  focus:outline-none focus:ring-2 focus:ring-crt-fg"
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-crt-fg">Content</label>
              <span className="text-xs text-crt-dim">Select text to mark as claim</span>
            </div>
            <MarkdownEditor value={body} onChange={setBody} height={400} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePublish}
              disabled={loading}
              className="px-6 py-2 bg-crt-selection text-white  hover:bg-crt-border disabled:bg-gray-400 font-medium transition-colors"
            >
              {loading ? 'Publishing...' : 'Publish Article'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Claims */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Claims ({claims.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {claims.length === 0 ? (
                <p className="text-sm text-crt-dim">No claims yet. Select text in the editor to mark claims.</p>
              ) : (
                claims.map(claim => (
                  <div key={claim.id} className="bg-yellow-50 border border-yellow-200  p-2">
                    <p className="text-sm text-crt-fg mb-1 line-clamp-2">{claim.text}</p>
                    <button
                      onClick={() => removeClaim(claim.id)}
                      className="text-xs text-crt-error hover:text-crt-error"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sources */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Sources ({sources.length})</h3>
              <button
                onClick={() => setShowSourceForm(!showSourceForm)}
                className="text-sm text-crt-fg hover:text-crt-accent font-medium"
              >
                {showSourceForm ? 'Cancel' : '+ Add'}
              </button>
            </div>

            {showSourceForm && (
              <div className="bg-black border border-crt-border  p-3 mb-3 space-y-2">
                <input
                  type="url"
                  placeholder="URL"
                  value={sourceForm.url || ''}
                  onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-crt-border  focus:outline-none focus:ring-1 focus:ring-crt-fg"
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={sourceForm.title || ''}
                  onChange={(e) => setSourceForm({ ...sourceForm, title: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-crt-border  focus:outline-none focus:ring-1 focus:ring-crt-fg"
                />
                <input
                  type="text"
                  placeholder="Publication (optional)"
                  value={sourceForm.publication || ''}
                  onChange={(e) => setSourceForm({ ...sourceForm, publication: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-crt-border  focus:outline-none focus:ring-1 focus:ring-crt-fg"
                />
                <input
                  type="text"
                  placeholder="Author (optional)"
                  value={sourceForm.author || ''}
                  onChange={(e) => setSourceForm({ ...sourceForm, author: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-crt-border  focus:outline-none focus:ring-1 focus:ring-crt-fg"
                />
                <select
                  value={sourceForm.source_type || 'other'}
                  onChange={(e) => setSourceForm({ ...sourceForm, source_type: e.target.value as any })}
                  className="w-full px-2 py-1 text-sm border border-crt-border  focus:outline-none focus:ring-1 focus:ring-crt-fg"
                >
                  <option value="news">News</option>
                  <option value="academic">Academic</option>
                  <option value="government">Government</option>
                  <option value="primary">Primary Source</option>
                  <option value="other">Other</option>
                </select>
                <button
                  onClick={handleAddSource}
                  className="w-full px-3 py-1 bg-crt-selection text-white text-sm  hover:bg-crt-border transition-colors"
                >
                  Add Source
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sources.length === 0 ? (
                <p className="text-sm text-crt-dim">No sources yet. Add sources to cite evidence.</p>
              ) : (
                sources.map(source => (
                  <div key={source.id} className="bg-blue-50 border border-blue-200  p-2">
                    <p className="text-sm font-medium text-crt-fg mb-1">{source.title}</p>
                    {source.publication && (
                      <p className="text-xs text-crt-muted">{source.publication}</p>
                    )}
                    <button
                      onClick={() => removeSource(source.id)}
                      className="text-xs text-crt-error hover:text-crt-error mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

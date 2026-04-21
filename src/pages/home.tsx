import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNodes, semanticSearch } from '../lib/api';
import type { Article, Theory, Challenge } from '../lib/types';

export function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [theories, setTheories] = useState<Theory[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load featured content on mount
  useEffect(() => {
    const loadFeatured = async () => {
      setLoading(true);
      setError('');
      try {
        const [articlesData, theoriesData, challengesData] = await Promise.all([
          listNodes<any>('ARTICLE', 20).catch(() => []),
          listNodes<any>('THEORY', 20).catch(() => []),
          listNodes<any>('CHALLENGE', 20).catch(() => []),
        ]);

        setArticles(
          articlesData
            .filter((a: any) => a.properties.status === 'published')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 4)
        );

        setTheories(
          theoriesData
            .filter((t: any) => t.properties.status === 'published')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 4)
        );

        setChallenges(
          challengesData
            .filter((c: any) => c.properties.status === 'open')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 4)
        );
      } catch (err) {
        console.error('Failed to load featured content:', err);
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    loadFeatured();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4">
      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .cursor-blink {
          display: inline-block;
          width: 12px;
          height: 1em;
          background-color: #00ff00;
          margin-left: 4px;
          animation: blink 1s infinite;
        }
      `}</style>

      {/* CRT Title with blinking cursor */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold font-mono text-crt-fg mb-2 flex items-center justify-center">
          &gt; rabbithole_
          <span className="cursor-blink"></span>
        </h1>
        <p className="text-lg text-crt-muted font-mono">explore the rabbit hole. discover the truth.</p>
      </div>

      {error && (
        <div className="p-4 text-sm text-crt-error mb-8 border border-crt-error bg-black font-mono max-w-2xl w-full">
          [ ERROR ] {error}
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="w-full max-w-2xl mb-20">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles, claims, evidence..."
            className="flex-1 px-4 py-3 bg-black border border-crt-border text-crt-fg placeholder-crt-dim font-mono focus:outline-none focus:border-crt-fg"
          />
          <button
            type="submit"
            className="px-6 py-3 border border-crt-border text-crt-fg hover:bg-crt-selection transition font-mono font-bold"
          >
            🔍
          </button>
        </div>
      </form>

      {/* Featured Sections */}
      {!loading && (
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Investigations */}
          <div>
            <h2 className="text-lg font-bold text-crt-fg font-mono mb-4 border-b border-crt-border pb-2">
              ACTIVE INVESTIGATIONS
            </h2>
            <div className="space-y-3">
              {challenges.length === 0 ? (
                <p className="text-sm text-crt-dim font-mono">[ no active challenges ]</p>
              ) : (
                challenges.map((c) => (
                  <a
                    key={c.id}
                    href={`/challenge/${c.id}`}
                    className="block p-3 bg-black border border-crt-border hover:border-crt-fg transition text-sm"
                  >
                    <p className="text-crt-fg font-mono font-bold mb-1 line-clamp-2">{c.properties.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-crt-dim">[CHALLENGED]</span>
                      <span className="text-xs text-crt-warning font-bold">{c.properties.community_score}v</span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Recent Articles */}
          <div>
            <h2 className="text-lg font-bold text-crt-fg font-mono mb-4 border-b border-crt-border pb-2">
              RECENT ARTICLES
            </h2>
            <div className="space-y-3">
              {articles.length === 0 ? (
                <p className="text-sm text-crt-dim font-mono">[ no articles ]</p>
              ) : (
                articles.map((a) => (
                  <a
                    key={a.id}
                    href={`/article/${a.id}`}
                    className="block p-3 bg-black border border-crt-border hover:border-crt-fg transition text-sm"
                  >
                    <p className="text-crt-fg font-mono font-bold mb-1 line-clamp-2">{a.properties.title}</p>
                    <p className="text-xs text-crt-dim">
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Theories */}
          <div>
            <h2 className="text-lg font-bold text-crt-fg font-mono mb-4 border-b border-crt-border pb-2">
              THEORIES
            </h2>
            <div className="space-y-3">
              {theories.length === 0 ? (
                <p className="text-sm text-crt-dim font-mono">[ no theories ]</p>
              ) : (
                theories.map((t) => (
                  <a
                    key={t.id}
                    href={`/theory/${t.id}`}
                    className="block p-3 bg-black border border-crt-border hover:border-crt-fg transition text-sm"
                  >
                    <p className="text-crt-fg font-mono font-bold mb-1 line-clamp-2">{t.properties.title}</p>
                    <p className="text-xs text-crt-dim">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

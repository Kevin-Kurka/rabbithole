import { useEffect, useState } from 'react';
import { listNodes, traverse } from '../lib/api';
import type { Article, Theory, Challenge, SentientNode } from '../lib/types';
import { Spinner } from '../components/spinner';

type TabType = 'articles' | 'theories' | 'challenges';

export function Home() {
  const [tab, setTab] = useState<TabType>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [theories, setTheories] = useState<Theory[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
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
        );

        setTheories(
          theoriesData
            .filter((t: any) => t.properties.status === 'published')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        );

        setChallenges(
          challengesData
            .filter((c: any) => c.properties.status === 'open')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        );
      } catch (err) {
        console.error('Failed to load feed:', err);
        setError('Failed to load feed');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const renderArticles = () => {
    if (articles.length === 0) {
      return (
        <div className="text-center py-20 text-crt-dim font-mono">
          <p className="text-xl mb-2">[ NO ARTICLES ]</p>
          <p>be the first to contribute</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {articles.map((a) => (
          <a
            key={a.id}
            href={`/article/${a.id}`}
            className="block p-6 bg-black border border-crt-border hover:border-crt-fg transition font-mono"
          >
            <h2 className="text-xl font-semibold text-crt-fg">{a.properties.title}</h2>
            {a.properties.summary && <p className="text-crt-muted mt-2">{a.properties.summary}</p>}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-crt-border">
              <span className="text-xs text-crt-dim">
                {new Date(a.created_at).toLocaleDateString()}
              </span>
              <span className="text-xs px-2 py-1 bg-black border border-crt-fg text-crt-fg">[PUBLISHED]</span>
            </div>
          </a>
        ))}
      </div>
    );
  };

  const renderTheories = () => {
    if (theories.length === 0) {
      return (
        <div className="text-center py-20 text-crt-dim font-mono">
          <p className="text-xl mb-2">[ NO THEORIES ]</p>
          <p>build a theory and be the first</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {theories.map((t) => (
          <a
            key={t.id}
            href={`/theory/${t.id}`}
            className="block p-6 bg-black border border-crt-border hover:border-crt-fg transition font-mono"
          >
            <h2 className="text-xl font-semibold text-crt-fg">{t.properties.title}</h2>
            {t.properties.summary && <p className="text-crt-muted mt-2">{t.properties.summary}</p>}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-crt-border">
              <span className="text-xs text-crt-dim">
                {new Date(t.created_at).toLocaleDateString()}
              </span>
              <span className="text-xs px-2 py-1 bg-black border border-crt-info text-crt-info">[THEORY]</span>
            </div>
          </a>
        ))}
      </div>
    );
  };

  const renderChallenges = () => {
    if (challenges.length === 0) {
      return (
        <div className="text-center py-20 text-crt-dim font-mono">
          <p className="text-xl mb-2">[ NO CHALLENGES ]</p>
          <p>all claims are currently accepted</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {challenges.map((c) => (
          <a
            key={c.id}
            href={`/challenge/${c.id}`}
            className="block p-6 bg-black border border-crt-border hover:border-crt-fg transition font-mono"
          >
            <h2 className="text-xl font-semibold text-crt-fg">{c.properties.title}</h2>
            <p className="text-crt-muted mt-2">{c.properties.rationale}</p>
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-crt-border">
              <div className="text-sm">
                <span className="text-crt-muted">community score: </span>
                <span className="font-semibold text-crt-fg">{c.properties.community_score}</span>
              </div>
              <div className="text-sm">
                <span className="text-crt-muted">ai score: </span>
                <span className="font-semibold text-crt-fg">{c.properties.ai_score}</span>
              </div>
              <div className="ml-auto">
                <span className="text-xs px-2 py-1 bg-black border border-crt-warning text-crt-warning">
                  {c.properties.status === 'open' ? '[OPEN]' : '[IN REVIEW]'}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-crt-fg font-mono">&gt; discovery feed</h1>

      {error && (
        <div className="p-4 text-sm text-crt-error mb-6 border border-crt-error bg-black font-mono">
          [ ERROR ] {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8 border-b border-crt-border">
        <button
          onClick={() => setTab('articles')}
          className={`px-4 py-3 font-medium border-b-2 transition font-mono ${
            tab === 'articles'
              ? 'border-crt-fg text-crt-fg'
              : 'border-transparent text-crt-muted hover:text-crt-fg'
          }`}
        >
          articles
        </button>
        <button
          onClick={() => setTab('theories')}
          className={`px-4 py-3 font-medium border-b-2 transition font-mono ${
            tab === 'theories'
              ? 'border-crt-fg text-crt-fg'
              : 'border-transparent text-crt-muted hover:text-crt-fg'
          }`}
        >
          theories
        </button>
        <button
          onClick={() => setTab('challenges')}
          className={`px-4 py-3 font-medium border-b-2 transition font-mono ${
            tab === 'challenges'
              ? 'border-crt-fg text-crt-fg'
              : 'border-transparent text-crt-muted hover:text-crt-fg'
          }`}
        >
          challenges
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 font-mono">
          <Spinner />
          <span className="ml-2 text-crt-muted">[ loading feed... ]</span>
        </div>
      ) : (
        <>
          {tab === 'articles' && renderArticles()}
          {tab === 'theories' && renderTheories()}
          {tab === 'challenges' && renderChallenges()}
        </>
      )}
    </div>
  );
}

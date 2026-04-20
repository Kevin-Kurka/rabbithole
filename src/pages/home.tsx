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
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl mb-2">No articles yet.</p>
          <p>Be the first to contribute.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {articles.map((a) => (
          <a
            key={a.id}
            href={`/article/${a.id}`}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-rabbit-500 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-gray-900">{a.properties.title}</h2>
            {a.properties.summary && <p className="text-gray-600 mt-2">{a.properties.summary}</p>}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {new Date(a.created_at).toLocaleDateString()}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Published</span>
            </div>
          </a>
        ))}
      </div>
    );
  };

  const renderTheories = () => {
    if (theories.length === 0) {
      return (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl mb-2">No theories yet.</p>
          <p>Build a theory and be the first.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {theories.map((t) => (
          <a
            key={t.id}
            href={`/theory/${t.id}`}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-rabbit-500 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-gray-900">{t.properties.title}</h2>
            {t.properties.summary && <p className="text-gray-600 mt-2">{t.properties.summary}</p>}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {new Date(t.created_at).toLocaleDateString()}
              </span>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Theory</span>
            </div>
          </a>
        ))}
      </div>
    );
  };

  const renderChallenges = () => {
    if (challenges.length === 0) {
      return (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl mb-2">No active challenges.</p>
          <p>All claims are currently accepted.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {challenges.map((c) => (
          <a
            key={c.id}
            href={`/challenge/${c.id}`}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-rabbit-500 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-gray-900">{c.properties.title}</h2>
            <p className="text-gray-600 mt-2">{c.properties.rationale}</p>
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm">
                <span className="text-gray-500">Community Score: </span>
                <span className="font-semibold text-gray-900">{c.properties.community_score}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">AI Score: </span>
                <span className="font-semibold text-gray-900">{c.properties.ai_score}</span>
              </div>
              <div className="ml-auto">
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                  {c.properties.status === 'open' ? 'Open' : 'In Review'}
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
      <h1 className="text-3xl font-bold mb-8">Discovery Feed</h1>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setTab('articles')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            tab === 'articles'
              ? 'border-rabbit-600 text-rabbit-600'
              : 'border-transparent text-gray-600 hover:text-rabbit-600'
          }`}
        >
          Articles
        </button>
        <button
          onClick={() => setTab('theories')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            tab === 'theories'
              ? 'border-rabbit-600 text-rabbit-600'
              : 'border-transparent text-gray-600 hover:text-rabbit-600'
          }`}
        >
          Theories
        </button>
        <button
          onClick={() => setTab('challenges')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            tab === 'challenges'
              ? 'border-rabbit-600 text-rabbit-600'
              : 'border-transparent text-gray-600 hover:text-rabbit-600'
          }`}
        >
          Active Challenges
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
          <span className="ml-2 text-gray-600">Loading feed...</span>
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

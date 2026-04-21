import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { listNodes, traverse } from '../lib/api';
import type { Article, Theory, Challenge, SentientNode } from '../lib/types';
import { Spinner } from '../components/spinner';

type TabType = 'articles' | 'theories' | 'challenges';

export function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [theories, setTheories] = useState<Theory[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    articlesCount: 0,
    theoriesCount: 0,
    challengesCount: 0,
    reputationScore: 0,
  });

  useEffect(() => {
    const loadUserContent = async () => {
      setLoading(true);
      try {
        // Load all content and filter by what might be authored by this user
        // In a real app, you'd have author edges or user_id properties
        const [articlesData, theoriesData, challengesData] = await Promise.all([
          listNodes<any>('ARTICLE', 50).catch(() => []),
          listNodes<any>('THEORY', 50).catch(() => []),
          listNodes<any>('CHALLENGE', 50).catch(() => []),
        ]);

        // For MVP, show all content (in production, filter by user_id from edges)
        const publishedArticles = articlesData
          .filter((a: any) => a.properties.status === 'published')
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const publishedTheories = theoriesData
          .filter((t: any) => t.properties.status === 'published')
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const userChallenges = challengesData
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setArticles(publishedArticles);
        setTheories(publishedTheories);
        setChallenges(userChallenges);
        setStats({
          articlesCount: publishedArticles.length,
          theoriesCount: publishedTheories.length,
          challengesCount: userChallenges.length,
          reputationScore: 42, // Placeholder
        });
      } catch (err) {
        console.error('Failed to load user content:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserContent();
  }, [user?.userId]);

  const renderArticles = () => {
    if (articles.length === 0) {
      return (<div className="text-center py-12 text-crt-dim font-mono">
          <p className="text-lg">No articles published yet.</p>
        </div>
      );
    }

    return (<div className="space-y-4 font-mono">
        {articles.map((a) => (
          <a
            key={a.id}
            href={`/article/${a.id}`}
            className="block p-6 bg-black  border border-crt-border hover:border-crt-fg hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-crt-fg">{a.properties.title}</h3>
                {a.properties.summary && <p className="text-crt-muted mt-1">{a.properties.summary}</p>}
              </div>
              <span className="text-xs px-2 py-1 bg-black text-crt-fg  flex-shrink-0 ml-4">
                Published
              </span>
            </div>
          </a>
        ))}
      </div>
    );
  };

  const renderTheories = () => {
    if (theories.length === 0) {
      return (<div className="text-center py-12 text-crt-dim font-mono">
          <p className="text-lg">No theories published yet.</p>
        </div>
      );
    }

    return (<div className="space-y-4 font-mono">
        {theories.map((t) => (
          <a
            key={t.id}
            href={`/theory/${t.id}`}
            className="block p-6 bg-black  border border-crt-border hover:border-crt-fg hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-crt-fg">{t.properties.title}</h3>
                {t.properties.summary && <p className="text-crt-muted mt-1">{t.properties.summary}</p>}
              </div>
              <span className="text-xs px-2 py-1 bg-black text-crt-info  flex-shrink-0 ml-4">
                Theory
              </span>
            </div>
          </a>
        ))}
      </div>
    );
  };

  const renderChallenges = () => {
    if (challenges.length === 0) {
      return (<div className="text-center py-12 text-crt-dim font-mono">
          <p className="text-lg">No challenges yet.</p>
        </div>
      );
    }

    return (<div className="space-y-4 font-mono">
        {challenges.map((c) => (
          <a
            key={c.id}
            href={`/challenge/${c.id}`}
            className="block p-6 bg-black  border border-crt-border hover:border-crt-fg hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-crt-fg">{c.properties.title}</h3>
                <p className="text-crt-muted mt-1">{c.properties.rationale}</p>
              </div>
              <span className={`text-xs px-2 py-1  flex-shrink-0 ml-4 ${
                c.properties.status === 'open'
                  ? 'bg-black text-crt-warning'
                  : 'bg-black border border-crt-muted text-crt-fg'
              }`}>
                {c.properties.status === 'open' ? 'Open' : 'Resolved'}
              </span>
            </div>
          </a>
        ))}
      </div>
    );
  };

  if (loading) {
    return (<div className="flex items-center justify-center py-20 font-mono">
        <Spinner />
        <span className="ml-2 text-crt-muted">Loading profile...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-black  border border-crt-border p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-grow">
            <h1 className="text-3xl font-bold text-crt-fg">{user?.display_name || user?.username || 'User'}</h1>
            {user?.username && <p className="text-crt-muted mt-1">@{user.username}</p>}
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-crt-fg">{stats.reputationScore}</div>
            <p className="text-crt-muted text-sm">Reputation Score</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-crt-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-crt-fg">{stats.articlesCount}</div>
            <p className="text-crt-muted text-sm">Articles</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-crt-fg">{stats.theoriesCount}</div>
            <p className="text-crt-muted text-sm">Theories</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-crt-fg">{stats.challengesCount}</div>
            <p className="text-crt-muted text-sm">Challenges</p>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div>
        <div className="flex gap-4 mb-8 border-b border-crt-border">
          <button
            onClick={() => setTab('articles')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              tab === 'articles'
                ? 'border-crt-fg text-crt-fg'
                : 'border-transparent text-crt-muted hover:text-crt-fg'
            }`}
          >
            Articles ({stats.articlesCount})
          </button>
          <button
            onClick={() => setTab('theories')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              tab === 'theories'
                ? 'border-crt-fg text-crt-fg'
                : 'border-transparent text-crt-muted hover:text-crt-fg'
            }`}
          >
            Theories ({stats.theoriesCount})
          </button>
          <button
            onClick={() => setTab('challenges')}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              tab === 'challenges'
                ? 'border-crt-fg text-crt-fg'
                : 'border-transparent text-crt-muted hover:text-crt-fg'
            }`}
          >
            Challenges ({stats.challengesCount})
          </button>
        </div>

        {tab === 'articles' && renderArticles()}
        {tab === 'theories' && renderTheories()}
        {tab === 'challenges' && renderChallenges()}
      </div>
    </div>
  );
}

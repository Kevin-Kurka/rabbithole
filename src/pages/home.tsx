import { useEffect, useState } from 'react';
import { listNodes } from '../lib/api';
import type { Article } from '../lib/types';

export function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNodes<any>('ARTICLE', 20)
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Recent Research</h1>
      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && articles.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl mb-2">No articles yet.</p>
          <p>Be the first to go down the rabbit hole.</p>
        </div>
      )}
      <div className="space-y-4">
        {articles.map((a) => (
          <a key={a.id} href={`/article/${a.id}`} className="block p-4 bg-white rounded-lg border hover:border-rabbit-500 transition">
            <h2 className="text-xl font-semibold">{a.properties.title}</h2>
            {a.properties.summary && <p className="text-gray-600 mt-1">{a.properties.summary}</p>}
          </a>
        ))}
      </div>
    </div>
  );
}

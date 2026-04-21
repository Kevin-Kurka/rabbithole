import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { semanticSearch, listNodes } from '../lib/api';
import type { SentientNode } from '../lib/types';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SentientNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError('');
      try {
        const searchResults = await semanticSearch(query, 20);
        setResults(searchResults);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Failed to perform search');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      ARTICLE: 'border-crt-info text-crt-info',
      CLAIM: 'border-crt-warning text-crt-warning',
      EVIDENCE: 'border-crt-fg text-crt-fg',
      THEORY: 'border-crt-muted text-crt-muted',
      CHALLENGE: 'border-crt-error text-crt-error',
      SOURCE: 'border-crt-dim text-crt-dim',
    };
    return colors[type] || 'border-crt-muted text-crt-muted';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      ARTICLE: '📄',
      CLAIM: '💭',
      EVIDENCE: '📊',
      THEORY: '🔍',
      CHALLENGE: '⚔️',
      SOURCE: '🔗',
    };
    return icons[type] || '📌';
  };

  const getRoute = (type: string) => {
    const routes: Record<string, string> = {
      ARTICLE: '/article',
      THEORY: '/theory',
      CHALLENGE: '/challenge',
    };
    return routes[type] || null;
  };

  const groupedResults = results.reduce((acc, node) => {
    const type = node.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(node);
    return acc;
  }, {} as Record<string, SentientNode[]>);

  const resultGroups = ['ARTICLE', 'CLAIM', 'THEORY', 'CHALLENGE', 'EVIDENCE', 'SOURCE'] as const;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-crt-fg font-mono mb-2">
          &gt; search results
        </h1>
        <p className="text-crt-muted font-mono">
          {query && `searching for: "${query}"`}
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-crt-error mb-6 border border-crt-error bg-black font-mono">
          [ ERROR ] {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-crt-dim font-mono">
          <p className="text-xl mb-2">[ SEARCHING... ]</p>
          <p>analyzing knowledge base</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 text-crt-dim font-mono">
          <p className="text-xl mb-2">[ NO RESULTS ]</p>
          <p>try a different query</p>
        </div>
      ) : (
        <div className="space-y-8">
          {resultGroups.map((type) => {
            const typeResults = groupedResults[type];
            if (!typeResults || typeResults.length === 0) return null;

            const route = getRoute(type);
            const typeName = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

            return (
              <div key={type}>
                <h2 className="text-lg font-bold text-crt-fg font-mono mb-4 pb-2 border-b border-crt-border">
                  {getTypeIcon(type)} {typeName.toUpperCase()}
                </h2>
                <div className="space-y-3">
                  {typeResults.map((node) => {
                    const title =
                      (node.properties as any).title ||
                      (node.properties as any).text ||
                      (node.properties as any).username ||
                      'Untitled';
                    const snippet =
                      (node.properties as any).summary ||
                      (node.properties as any).body?.substring(0, 150) ||
                      '';

                    const Element = route ? 'a' : 'div';
                    const elementProps = route
                      ? { href: `${route}/${node.id}` }
                      : {};

                    return (
                      <Element
                        key={node.id}
                        {...elementProps}
                        className={`p-4 bg-black border border-crt-border ${
                          route ? 'hover:border-crt-fg cursor-pointer transition' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h3 className="text-crt-fg font-mono font-bold mb-1 line-clamp-2">{title}</h3>
                            {snippet && (
                              <p className="text-sm text-crt-muted font-mono line-clamp-2">{snippet}</p>
                            )}
                            <p className="text-xs text-crt-dim font-mono mt-2">
                              {new Date(node.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs border font-mono flex-shrink-0 ${getTypeBadgeColor(
                              type
                            )}`}
                          >
                            [{type}]
                          </span>
                        </div>
                      </Element>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

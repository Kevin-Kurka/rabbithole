import { useState } from 'react';
import { semanticSearch } from '../lib/api';
import type { SentientNode } from '../lib/types';

interface SearchPanelProps {
  onSelect: (node: SentientNode) => void;
  placeholder?: string;
}

export function SearchPanel({ onSelect, placeholder = 'Search nodes...' }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SentientNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const found = await semanticSearch(query, 10);
      setResults(found);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getNodePreview = (node: SentientNode): string => {
    const props = node.properties as any;
    return props.text || props.title || props.body || props.username || node.type;
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rabbit-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-rabbit-600 text-white rounded-lg hover:bg-rabbit-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No results found</div>
          ) : (
            results.map(node => (
              <button
                key={node.id}
                onClick={() => {
                  onSelect(node);
                  setQuery('');
                  setResults([]);
                  setShowResults(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{getNodePreview(node)}</p>
                    <p className="text-xs text-gray-600">{node.type}</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {node.type}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

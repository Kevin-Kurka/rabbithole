import { useState } from 'react';
import { semanticSearch } from '../lib/api';

export function ExplorePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const data = await semanticSearch(query);
      setResults(data);
    } catch {
      setResults([]);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Explore</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for connections..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rabbit-500"
        />
        <button onClick={handleSearch} className="px-6 py-2 bg-rabbit-600 text-white rounded-lg hover:bg-rabbit-700">
          Search
        </button>
      </div>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r: any) => (
            <div key={r.id} className="p-3 bg-white rounded border">
              <span className="text-xs font-mono text-gray-400">{r.node_type}</span>
              <p className="font-medium">{r.properties?.title || r.properties?.text || r.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { SEARCH_NODES } from '@/graphql/queries/activity';
import { Network, FileText, AlertTriangle, User, Shield, Target, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NodeSearchResult {
  id: string;
  title: string;
  type: string;
  relevance: number;
}

interface GroupedResults {
  [key: string]: NodeSearchResult[];
}

const getNodeTypeIcon = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'ARTICLE':
      return <FileText className="w-4 h-4" />;
    case 'CLAIM':
      return <Target className="w-4 h-4" />;
    case 'CHALLENGE':
      return <AlertTriangle className="w-4 h-4" />;
    case 'EVIDENCE':
      return <Shield className="w-4 h-4" />;
    case 'THEORY':
      return <Brain className="w-4 h-4" />;
    case 'PERSON':
      return <User className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getNodeTypeColor = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'ARTICLE':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    case 'CLAIM':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
    case 'CHALLENGE':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
    case 'EVIDENCE':
      return 'bg-green-500/10 text-green-700 dark:text-green-400';
    case 'THEORY':
      return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400';
    case 'PERSON':
      return 'bg-pink-500/10 text-pink-700 dark:text-pink-400';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  }
};

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [groupedResults, setGroupedResults] = useState<GroupedResults>({});
  const [isSearching, setIsSearching] = useState(false);

  const { data, loading, error } = useQuery(SEARCH_NODES, {
    variables: { query, limit: 100 },
    skip: !query || query.length < 2,
  });

  useEffect(() => {
    if (data?.searchNodes) {
      const grouped: GroupedResults = {};
      data.searchNodes.forEach((node: NodeSearchResult) => {
        const type = node.type || 'Other';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(node);
      });

      // Sort each group by relevance
      Object.keys(grouped).forEach(type => {
        grouped[type].sort((a, b) => b.relevance - a.relevance);
      });

      setGroupedResults(grouped);
    }
  }, [data]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    router.push(`/nodes/${nodeId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-2"
            >
              <Network className="w-4 h-4" />
              Back to Home
            </Button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search nodes, articles, claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Search</Button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {query ? (
          <>
            {/* Results Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Search Results</h1>
              <p className="text-muted-foreground">
                Found {Object.values(groupedResults).reduce((acc, arr) => acc + arr.length, 0)} result
                {Object.values(groupedResults).reduce((acc, arr) => acc + arr.length, 0) !== 1 ? 's' : ''} for "{query}"
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Searching...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="border-red-500/50 bg-red-500/5">
                <CardContent className="pt-6">
                  <p className="text-red-700 dark:text-red-400">
                    Error searching: {error.message}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* No Results */}
            {!loading && !error && Object.keys(groupedResults).length === 0 && (
              <Card>
                <CardContent className="pt-12 text-center">
                  <p className="text-muted-foreground mb-4">No results found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search query
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Results by Type */}
            {!loading && !error && Object.keys(groupedResults).length > 0 && (
              <div className="space-y-8">
                {Object.entries(groupedResults).map(([type, nodes]) => (
                  <div key={type}>
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        {getNodeTypeIcon(type)}
                        {type}s
                        <span className="text-sm font-normal text-muted-foreground ml-auto">
                          {nodes.length} result{nodes.length !== 1 ? 's' : ''}
                        </span>
                      </h2>
                    </div>

                    <div className="grid gap-3">
                      {nodes.map((node) => (
                        <Card
                          key={node.id}
                          className="cursor-pointer hover:border-primary hover:bg-accent transition-all"
                          onClick={() => handleNodeClick(node.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getNodeTypeColor(type)}`}>
                                    {getNodeTypeIcon(type)}
                                    {type}
                                  </span>
                                </div>
                                <h3 className="font-semibold truncate hover:text-primary">
                                  {node.title}
                                </h3>
                              </div>
                              {node.relevance && (
                                <div className="flex-shrink-0 text-right">
                                  <div className="text-sm font-medium text-muted-foreground">
                                    {Math.round(node.relevance * 100)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Relevance
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Enter a search query to get started</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p>Loading search...</p></div>}>
      <SearchPageContent />
    </Suspense>
  );
}

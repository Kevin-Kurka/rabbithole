"use client";

import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { theme } from '@/styles/theme';

export interface SearchPanelProps {
  onSearch?: (query: string, filters: SearchFilters) => void;
}

export interface SearchFilters {
  nodeTypes: string[];
  edgeTypes: string[];
  graphs: string[];
  minVeracity: number;
  maxVeracity: number;
}

const DEFAULT_FILTERS: SearchFilters = {
  nodeTypes: [],
  edgeTypes: [],
  graphs: [],
  minVeracity: 0,
  maxVeracity: 1,
};

/**
 * SearchPanel Component
 *
 * Global search functionality for finding nodes, edges, and content across all graphs.
 */
export default function SearchPanel({ onSearch }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(query, filters);
    }
    // TODO: Implement actual search via GraphQL
    console.log('Search:', { query, filters });
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.bg.secondary,
      }}
    >
      {/* Header */}
      <div style={{ padding: theme.spacing.md, borderBottom: `1px solid ${theme.colors.border.primary}` }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 600,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.sm
        }}>
          Search
        </h3>

        {/* Search Input */}
        <div style={{ display: 'flex', gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.bg.primary,
            border: `1px solid ${theme.colors.border.primary}`,
            borderRadius: theme.radius.sm,
            padding: '4px 8px',
          }}>
            <Search size={14} style={{ color: theme.colors.text.tertiary }} />
            <input
              type="text"
              placeholder="Search nodes, edges, content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: theme.colors.text.primary,
                fontSize: '12px',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.text.tertiary,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '4px 8px',
              borderRadius: theme.radius.sm,
              backgroundColor: showFilters ? theme.colors.button.primary.bg : theme.colors.bg.primary,
              color: showFilters ? theme.colors.button.primary.text : theme.colors.text.secondary,
              border: `1px solid ${theme.colors.border.primary}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
          >
            <Filter size={12} />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div style={{
            backgroundColor: theme.colors.bg.primary,
            border: `1px solid ${theme.colors.border.primary}`,
            borderRadius: theme.radius.sm,
            padding: theme.spacing.sm,
            marginTop: theme.spacing.xs,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.text.primary }}>
                Filters
              </span>
              <button
                onClick={handleClearFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.text.tertiary,
                  fontSize: '10px',
                }}
              >
                Clear
              </button>
            </div>

            {/* Veracity Range */}
            <div style={{ marginBottom: theme.spacing.sm }}>
              <label style={{ display: 'block', fontSize: '10px', color: theme.colors.text.secondary, marginBottom: '4px' }}>
                Veracity Range
              </label>
              <div style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.minVeracity}
                  onChange={(e) => setFilters({ ...filters, minVeracity: parseFloat(e.target.value) })}
                  style={{
                    width: '60px',
                    padding: '4px',
                    fontSize: '11px',
                    backgroundColor: theme.colors.bg.secondary,
                    border: `1px solid ${theme.colors.border.primary}`,
                    borderRadius: theme.radius.sm,
                    color: theme.colors.text.primary,
                  }}
                />
                <span style={{ fontSize: '11px', color: theme.colors.text.tertiary }}>to</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.maxVeracity}
                  onChange={(e) => setFilters({ ...filters, maxVeracity: parseFloat(e.target.value) })}
                  style={{
                    width: '60px',
                    padding: '4px',
                    fontSize: '11px',
                    backgroundColor: theme.colors.bg.secondary,
                    border: `1px solid ${theme.colors.border.primary}`,
                    borderRadius: theme.radius.sm,
                    color: theme.colors.text.primary,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            marginTop: theme.spacing.xs,
            borderRadius: theme.radius.sm,
            backgroundColor: query.trim() ? theme.colors.button.primary.bg : theme.colors.bg.primary,
            color: query.trim() ? theme.colors.button.primary.text : theme.colors.text.tertiary,
            border: 'none',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          Search
        </button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.sm }}>
        {results.length === 0 ? (
          <div style={{
            padding: theme.spacing.lg,
            textAlign: 'center',
            color: theme.colors.text.tertiary,
            fontSize: '12px'
          }}>
            <Search size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>Enter a search query to find nodes, edges, and content across all graphs.</p>
          </div>
        ) : (
          <div>
            {/* TODO: Render search results */}
            {results.map((result, index) => (
              <div key={index}>Result {index}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

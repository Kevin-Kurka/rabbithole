"use client";
import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { theme } from '@/styles/theme';
import { Navigation } from '@/components/Navigation';
import { PromotionLedgerTable, PromotionEvent } from '@/components/PromotionLedgerTable';
import { GET_PROMOTION_EVENTS } from '@/graphql/queries/promotions';
import { BookOpen, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
const ITEMS_PER_PAGE = 20;
/**
 * PromotionLedger Page
 *
 * Public-facing page showing all Level 0 promotions with full transparency.
 * No authentication required - this is a public audit trail.
 *
 * Features:
 * - Paginated list of all promotions
 * - Filter by date range and methodology
 * - View details of each promotion
 * - Link to original graph
 */
export default function PromotionLedgerPage() {
  const router = useRouter();
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    methodology: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  // Calculate pagination
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  // Fetch promotion events
  const { data, loading, error } = useQuery(GET_PROMOTION_EVENTS, {
    variables: {
      limit: ITEMS_PER_PAGE,
      offset,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      methodology: filters.methodology || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });
  const events: PromotionEvent[] = data?.promotionEvents || [];
  const totalEvents = events.length; // In production, fetch total count separately
  // Calculate total pages
  const totalPages = Math.ceil(totalEvents / ITEMS_PER_PAGE);
  /**
   * Handle row click - navigate to graph detail page
   */
  const handleRowClick = (graphId: string) => {
    router.push(`/graph/${graphId}`);
  };
  /**
   * Handle filter changes
   */
  const handleFilterChange = (filterName: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };
  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      methodology: '',
    });
    setCurrentPage(1);
  };
  /**
   * Check if filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return filters.startDate || filters.endDate || filters.methodology;
  }, [filters]);
  return (
    <div
      style={{
        backgroundColor: theme.colors.bg.secondary,
        minHeight: '100vh',
      }}
    >
      {/* Navigation */}
      <Navigation />
      {/* Main Content */}
      <div style={{ padding: theme.spacing.xl }}>
        {/* Header */}
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: theme.spacing.xl }}>
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={32} style={{ color: theme.colors.text.primary }} />
            <h1
              style={{
                color: theme.colors.text.primary,
                fontSize: '2rem',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Promotion Ledger
            </h1>
          </div>
          <p
            style={{
              color: theme.colors.text.secondary,
              fontSize: '1rem',
              marginBottom: theme.spacing.md,
            }}
          >
            Public audit trail of all Level 0 promotions. Every graph that reaches the immutable
            truth layer is recorded here with full transparency.
          </p>
          <div
            style={{
              color: theme.colors.text.tertiary,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: theme.colors.text.tertiary,
              }}
            />
            <span>No authentication required - this ledger is publicly accessible</span>
          </div>
        </div>
        {/* Filters */}
        <div
          style={{
            backgroundColor: theme.colors.bg.primary,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            border: `1px solid ${theme.colors.border.primary}`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.button.ghost.bg,
                border: 'none',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                fontSize: '0.875rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                cursor: 'pointer',
              }}
              className="hover:opacity-80 transition-opacity"
            >
              <Filter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  color: theme.colors.text.tertiary,
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: theme.spacing.sm,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
                className="hover:opacity-80 transition-opacity"
              >
                Clear Filters
              </button>
            )}
          </div>
          {showFilters && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: theme.spacing.md,
              }}
            >
              {/* Start Date Filter */}
              <div>
                <label
                  style={{
                    color: theme.colors.text.tertiary,
                    fontSize: '0.875rem',
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: theme.colors.input.bg,
                    border: `1px solid ${theme.colors.input.border}`,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.sm,
                    color: theme.colors.text.primary,
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              {/* End Date Filter */}
              <div>
                <label
                  style={{
                    color: theme.colors.text.tertiary,
                    fontSize: '0.875rem',
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: theme.colors.input.bg,
                    border: `1px solid ${theme.colors.input.border}`,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.sm,
                    color: theme.colors.text.primary,
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              {/* Methodology Filter */}
              <div>
                <label
                  style={{
                    color: theme.colors.text.tertiary,
                    fontSize: '0.875rem',
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  Methodology
                </label>
                <select
                  value={filters.methodology}
                  onChange={(e) => handleFilterChange('methodology', e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: theme.colors.input.bg,
                    border: `1px solid ${theme.colors.input.border}`,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.sm,
                    color: theme.colors.text.primary,
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">All Methodologies</option>
                  <option value="scientific_method">Scientific Method</option>
                  <option value="legal_discovery">Legal Discovery</option>
                  <option value="toulmin_argumentation">Toulmin Argumentation</option>
                </select>
              </div>
            </div>
          )}
        </div>
        {/* Error State */}
        {error && (
          <div
            style={{
              backgroundColor: '#7f1d1d',
              color: '#fecaca',
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              marginBottom: theme.spacing.lg,
              border: '1px solid #991b1b',
            }}
          >
            <strong>Error loading promotions:</strong> {error.message}
          </div>
        )}
        {/* Table */}
        <PromotionLedgerTable events={events} loading={loading} onRowClick={handleRowClick} />
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: theme.spacing.md,
              marginTop: theme.spacing.xl,
            }}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                backgroundColor: theme.colors.button.secondary.bg,
                color: theme.colors.button.secondary.text,
                border: 'none',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                fontSize: '0.875rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
              className="hover:opacity-80 transition-opacity"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span
              style={{
                color: theme.colors.text.secondary,
                fontSize: '0.875rem',
              }}
            >
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                backgroundColor: theme.colors.button.secondary.bg,
                color: theme.colors.button.secondary.text,
                border: 'none',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                fontSize: '0.875rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
              className="hover:opacity-80 transition-opacity"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        {/* Footer Info */}
        <div
          style={{
            marginTop: theme.spacing.xl,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.bg.primary,
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.colors.border.primary}`,
          }}
        >
          <h3
            style={{
              color: theme.colors.text.primary,
              fontSize: '1rem',
              fontWeight: 600,
              marginBottom: theme.spacing.sm,
            }}
          >
            About the Promotion Ledger
          </h3>
          <p
            style={{
              color: theme.colors.text.secondary,
              fontSize: '0.875rem',
              lineHeight: '1.6',
              marginBottom: theme.spacing.sm,
            }}
          >
            The Promotion Ledger is a transparent, immutable record of all graphs that have been
            promoted to Level 0 (the truth layer). Each promotion represents a graph that has met
            all objective criteria:
          </p>
          <ul
            style={{
              color: theme.colors.text.secondary,
              fontSize: '0.875rem',
              lineHeight: '1.6',
              paddingLeft: theme.spacing.lg,
              marginBottom: theme.spacing.sm,
            }}
          >
            <li>Methodology completion (80%+ required steps)</li>
            <li>Community consensus (80%+ weighted approval)</li>
            <li>Evidence quality (80%+ average confidence)</li>
            <li>Challenge resolution (all challenges resolved)</li>
          </ul>
          <p
            style={{
              color: theme.colors.text.tertiary,
              fontSize: '0.75rem',
              fontStyle: 'italic',
            }}
          >
            No curator approval is required - promotions are automatic when criteria are met.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

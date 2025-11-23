"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Search, BrainCircuit, TrendingUp, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { GET_GRAPHS, CREATE_GRAPH } from '@/graphql/graph-queries';
import { theme } from '@/styles/theme';

interface Graph {
  id: string;
  name: string;
  description: string | null;
  level: number;
  methodology: string | null;
  privacy: string;
  created_at: string;
  updated_at: string;
}

interface GraphSidebarProps {
  activeGraphs: string[];
  onToggleGraph: (graphId: string) => void;
}

type TabType = 'all' | 'trending' | 'recents';

const SIDEBAR_WIDTH = 320;
const COLLAPSED_WIDTH = 48;

export default function GraphSidebar({ activeGraphs, onToggleGraph }: GraphSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');
  const [newGraphDescription, setNewGraphDescription] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch all graphs
  const { data, loading, error, refetch } = useQuery(GET_GRAPHS);

  // Create graph mutation
  const [createGraphMutation, { loading: creating }] = useMutation(CREATE_GRAPH, {
    onCompleted: (data) => {
      setShowCreateModal(false);
      setNewGraphName('');
      setNewGraphDescription('');
      refetch();
      onToggleGraph(data.createGraph.id);
    },
    onError: (err) => {
      console.error('Failed to create graph:', err);
      alert(`Failed to create graph: ${err.message}`);
    }
  });

  // Filter and sort graphs
  const filteredGraphs = useMemo(() => {
    if (!data?.graphs) return [];

    let graphs = [...data.graphs] as Graph[];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      graphs = graphs.filter(g =>
        g.name.toLowerCase().includes(query) ||
        g.description?.toLowerCase().includes(query)
      );
    }

    switch (activeTab) {
      case 'trending':
        graphs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case 'recents':
        graphs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        graphs.sort((a, b) => a.name.localeCompare(b.name));
    }

    return graphs;
  }, [data, searchQuery, activeTab]);

  const handleCreateGraph = async () => {
    if (!newGraphName.trim()) {
      alert('Please enter a graph name');
      return;
    }

    await createGraphMutation({
      variables: {
        input: {
          name: newGraphName.trim(),
          description: newGraphDescription.trim() || null,
          methodology: null,
          privacy: 'private'
        }
      }
    });
  };

  return (
    <>
      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: isCollapsed ? `${COLLAPSED_WIDTH}px` : `${SIDEBAR_WIDTH}px`,
          backgroundColor: theme.colors.bg.elevated,
          borderRight: `1px solid ${theme.colors.border.primary}`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          zIndex: 50,
        }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '48px',
            backgroundColor: theme.colors.bg.elevated,
            border: `1px solid ${theme.colors.border.primary}`,
            borderRadius: '0 8px 8px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.text.secondary,
            zIndex: 51,
          }}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {!isCollapsed ? (
          <>
            {/* Header */}
            <div style={{ padding: theme.spacing.md, borderBottom: `1px solid ${theme.colors.border.primary}` }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: theme.colors.text.primary, marginBottom: theme.spacing.sm }}>
                Graphs
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                <Search size={16} style={{ color: theme.colors.text.tertiary }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: theme.colors.bg.primary,
                    border: `1px solid ${theme.colors.border.primary}`,
                    borderRadius: theme.radius.sm,
                    outline: 'none',
                    color: theme.colors.text.primary,
                    fontSize: '14px',
                    padding: '6px 8px',
                  }}
                />
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                padding: theme.spacing.sm,
                borderBottom: `1px solid ${theme.colors.border.primary}`,
              }}
            >
              {[
                { id: 'all' as TabType, label: 'All', icon: null },
                { id: 'trending' as TabType, label: 'Trending', icon: <TrendingUp size={12} /> },
                { id: 'recents' as TabType, label: 'Recent', icon: <Clock size={12} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: theme.radius.sm,
                    backgroundColor: activeTab === tab.id ? theme.colors.button.primary.bg : 'transparent',
                    color: activeTab === tab.id ? theme.colors.button.primary.text : theme.colors.text.secondary,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Graph List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.sm }}>
              {loading && (
                <div style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.text.secondary, fontSize: '14px' }}>
                  Loading...
                </div>
              )}

              {error && (
                <div style={{ padding: theme.spacing.md, textAlign: 'center', color: '#ef4444', fontSize: '14px' }}>
                  Error: {error.message}
                </div>
              )}

              {!loading && !error && filteredGraphs.length === 0 && (
                <div style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.text.secondary, fontSize: '14px' }}>
                  {searchQuery ? 'No matches' : 'No graphs'}
                </div>
              )}

              {!loading && !error && filteredGraphs.map(graph => {
                const isActive = activeGraphs.includes(graph.id);
                return (
                  <div
                    key={graph.id}
                    onClick={() => onToggleGraph(graph.id)}
                    style={{
                      padding: theme.spacing.sm,
                      borderRadius: theme.radius.sm,
                      backgroundColor: isActive ? theme.colors.button.primary.bg : 'transparent',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      border: `1px solid ${isActive ? theme.colors.button.primary.bg : 'transparent'}`,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = theme.colors.bg.primary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 500,
                              color: isActive ? theme.colors.button.primary.text : theme.colors.text.primary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {graph.name}
                          </span>
                          {graph.weight >= 0.90 && (
                            <span
                              style={{
                                fontSize: '9px',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                fontWeight: 600,
                              }}
                            >
                              L0
                            </span>
                          )}
                        </div>
                        {graph.description && (
                          <p
                            style={{
                              fontSize: '12px',
                              color: isActive ? theme.colors.button.primary.text : theme.colors.text.tertiary,
                              marginTop: '2px',
                              opacity: 0.8,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {graph.description}
                          </p>
                        )}
                      </div>
                      {isActive && (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: theme.colors.button.primary.text,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: theme.colors.button.primary.bg,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create Button */}
            <div style={{ padding: theme.spacing.sm, borderTop: `1px solid ${theme.colors.border.primary}` }}>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.button.primary.bg,
                  color: theme.colors.button.primary.text,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.button.primary.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.button.primary.bg;
                }}
              >
                <BrainCircuit size={16} />
                New Graph
              </button>
            </div>
          </>
        ) : (
          /* Collapsed State */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: theme.spacing.sm, gap: theme.spacing.sm }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.button.primary.bg,
                color: theme.colors.button.primary.text,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="New Graph"
            >
              <BrainCircuit size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Create Graph Modal */}
      {showCreateModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 100,
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setShowCreateModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '500px',
              backgroundColor: theme.colors.bg.elevated,
              borderRadius: theme.radius.lg,
              boxShadow: theme.shadows.xl,
              zIndex: 101,
              padding: theme.spacing.lg,
              border: `1px solid ${theme.colors.border.primary}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: theme.colors.text.primary, marginBottom: theme.spacing.md }}>
              Create New Graph
            </h2>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: theme.spacing.xs }}>
                Name *
              </label>
              <input
                type="text"
                value={newGraphName}
                onChange={(e) => setNewGraphName(e.target.value)}
                placeholder="Enter graph name"
                autoFocus
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.bg.primary,
                  border: `1px solid ${theme.colors.border.primary}`,
                  color: theme.colors.text.primary,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: theme.spacing.lg }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: theme.spacing.xs }}>
                Description (optional)
              </label>
              <textarea
                value={newGraphDescription}
                onChange={(e) => setNewGraphDescription(e.target.value)}
                placeholder="Describe your graph"
                rows={3}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.bg.primary,
                  border: `1px solid ${theme.colors.border.primary}`,
                  color: theme.colors.text.primary,
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.bg.primary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.primary}`,
                  cursor: creating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: creating ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGraph}
                disabled={creating || !newGraphName.trim()}
                style={{
                  flex: 1,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.button.primary.bg,
                  color: theme.colors.button.primary.text,
                  border: 'none',
                  cursor: (creating || !newGraphName.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: (creating || !newGraphName.trim()) ? 0.6 : 1,
                }}
              >
                {creating ? 'Creating...' : 'Create Graph'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

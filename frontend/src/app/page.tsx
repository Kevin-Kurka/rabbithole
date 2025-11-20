"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
import { gql } from '@apollo/client';
import { User, Sparkles, FileText, Link2, Shield, AlertTriangle, CheckCircle, Loader2, Plus, X } from 'lucide-react';
import LoginDialog from '@/components/LoginDialog';

// GraphQL queries and mutations
const GET_GRAPHS_QUERY = gql`
  query GetGraphs {
    graphs {
      id
      name
      description
    }
  }
`;

const SEARCH_NODES_QUERY = gql`
  query SearchNodes($query: String!) {
    search(input: { query: $query }) {
      nodes {
        id
        title
      }
    }
  }
`;

const AUTOCOMPLETE_QUERY = gql`
  query Autocomplete($query: String!, $limit: Int) {
    autocomplete(query: $query, limit: $limit)
  }
`;

const ASK_AI_MUTATION = gql`
  mutation AskAI($input: AIQueryInput!) {
    askAI(input: $input) {
      message
      success
      error
    }
  }
`;

/**
 * Home Page - Starfield canvas with nodes and AI chat
 */
interface Node {
  id: string;
  title: string;
  type: string;
  credibility: number;
  x: number;
  y: number;
  connections: string[];
}

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const apolloClient = useApolloClient();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Graph state
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);

  // Fetch graphs
  const { data: graphsData } = useQuery(GET_GRAPHS_QUERY);

  // Fetch JFK nodes via search
  const { data: nodesData } = useQuery(SEARCH_NODES_QUERY, {
    variables: { query: 'JFK' },
  });

  // AI state
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [askAI, { loading: aiLoading }] = useMutation(ASK_AI_MUTATION);

  // Search suggestions state
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Dragging state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Node positions state
  const [nodes, setNodes] = useState<Node[]>([]);

  // Set default graph to JFK when graphs load
  useEffect(() => {
    if (graphsData?.graphs?.length > 0 && !selectedGraphId) {
      // Find JFK graph or use first graph
      const jfkGraph = graphsData.graphs.find((g: any) =>
        g.name.includes('JFK') || g.name.includes('Assassination')
      );
      setSelectedGraphId(jfkGraph?.id || graphsData.graphs[0].id);
    }
  }, [graphsData, selectedGraphId]);

  // Convert GraphQL nodes to display nodes with random positions
  useEffect(() => {
    if (nodesData?.search?.nodes) {
      const displayNodes = nodesData.search.nodes.slice(0, 8).map((node: any, index: number) => ({
        id: node.id,
        title: node.title,
        type: 'Node',
        credibility: 85 + Math.floor(Math.random() * 15), // Random credibility 85-100%
        x: 20 + (index % 4) * 20 + Math.random() * 10,
        y: 30 + Math.floor(index / 4) * 30 + Math.random() * 10,
        connections: [],
      }));
      setNodes(displayNodes);
    }
  }, [nodesData]);

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || !selectedGraphId) return;

    // Clear previous responses
    setAiResponse(null);
    setAiError(null);

    try {
      const { data } = await askAI({
        variables: {
          input: {
            graphId: selectedGraphId,
            question: aiQuery,
            userId: session?.user?.id || '00000000-0000-0000-0000-000000000000',
          },
        },
      });

      if (data?.askAI?.success) {
        setAiResponse(data.askAI.message);
      } else {
        setAiError(data?.askAI?.error || 'Failed to get AI response');
      }
    } catch (error: any) {
      setAiError(error.message || 'An error occurred while querying AI');
      console.error('AI Query Error:', error);
    }

    setAiQuery('');
    setShowSuggestions(false); // Hide suggestions after submitting
  };

  // Debounced search handler for autocomplete
  const handleSearchInput = useCallback((value: string) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query too short, clear suggestions
    if (value.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await apolloClient.query({
          query: AUTOCOMPLETE_QUERY,
          variables: { query: value, limit: 5 },
        });

        if (data?.autocomplete && data.autocomplete.length > 0) {
          setSearchSuggestions(data.autocomplete);
          setShowSuggestions(true);
        } else {
          setSearchSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSearchSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [apolloClient]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAiQuery(value);
    handleSearchInput(value);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setShowSuggestions(false);
    setAiQuery('');

    try {
      // Search for the node to get its ID
      const { data } = await apolloClient.query({
        query: SEARCH_NODES_QUERY,
        variables: { query: suggestion },
      });

      // Find exact match or first result
      const node = data?.search?.nodes?.find((n: any) => n.title === suggestion)
                   || data?.search?.nodes?.[0];

      if (node?.id) {
        // Navigate to node details page
        router.push(`/nodes/${node.id}`);
      }
    } catch (error) {
      console.error('Error finding node:', error);
    }
  };

  const handleAvatarClick = () => {
    if (!session) {
      setShowLoginModal(true);
    } else {
      router.push('/profile');
    }
  };

  const handleNodeClick = (nodeId: string) => {
    router.push(`/nodes/${nodeId}`);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, nodeId: string, node: Node) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const nodeX = (node.x / 100) * rect.width;
    const nodeY = (node.y / 100) * rect.height;

    setDraggedNodeId(nodeId);
    setDragOffset({
      x: e.clientX - nodeX,
      y: e.clientY - nodeY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = ((e.clientX - dragOffset.x) / rect.width) * 100;
    const newY = ((e.clientY - dragOffset.y) / rect.height) * 100;

    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));

    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === draggedNodeId
          ? { ...node, x: clampedX, y: clampedY }
          : node
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // Get icon based on node type
  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'Investigation':
        return <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1} />;
      case 'Evidence':
        return <FileText className="w-3.5 h-3.5" strokeWidth={1} />;
      case 'Person':
        return <User className="w-3.5 h-3.5" strokeWidth={1} />;
      default:
        return <FileText className="w-3.5 h-3.5" strokeWidth={1} />;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Starfield Background - 3 Layers with Parallax */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 starfield-layer-1" />
        <div className="absolute inset-0 starfield-layer-2" />
        <div className="absolute inset-0 starfield-layer-3" />
      </div>

      {/* Canvas with Nodes */}
      <div
        ref={canvasRef}
        className="absolute inset-0 z-10"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodes.flatMap(node =>
            node.connections.map(targetId => {
              const target = nodes.find(n => n.id === targetId);
              if (!target) return null;
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${target.x}%`}
                  y2={`${target.y}%`}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1"
                />
              );
            })
          )}
        </svg>

        {/* Node Cards */}
        {nodes.map(node => (
          <div
            key={node.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              cursor: draggedNodeId === node.id ? 'grabbing' : 'grab',
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id, node)}
          >
            <div
              onClick={(e) => {
                // Only trigger click if not dragging
                if (draggedNodeId === null) {
                  handleNodeClick(node.id);
                }
              }}
              className="group relative"
            >
              {/* Node Card */}
              <div className="w-56 bg-zinc-900/90 backdrop-blur-xl border border-white/20 rounded shadow-2xl hover:border-white/40 hover:bg-zinc-800/90 transition-all overflow-hidden" style={{ borderWidth: '1px', borderRadius: '8px' }}>
                {/* Top Row - Node Title */}
                <div className="px-4 py-3 border-b border-white/10" style={{ borderBottomWidth: '1px' }}>
                  <h3 className="text-white font-medium text-sm leading-tight text-left truncate">
                    {node.title}
                  </h3>
                </div>

                {/* Bottom Row - Type, Credibility, Link Icon */}
                <div className="px-4 py-2 flex items-center justify-between">
                  {/* Left: Type Icon and Credibility */}
                  <div className="flex items-center gap-2">
                    {/* Type Icon */}
                    <div className="text-zinc-400">
                      {getNodeTypeIcon(node.type)}
                    </div>

                    {/* Credibility Score */}
                    <div className="text-zinc-400">
                      <span className="text-xs font-medium">{node.credibility}%</span>
                    </div>
                  </div>

                  {/* Right: Link Icon */}
                  <div className="text-zinc-400 group-hover:text-white transition-colors">
                    <Link2 className="w-3.5 h-3.5" strokeWidth={1} />
                  </div>
                </div>
              </div>

              {/* Connection Dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Floating Navigation - Top Right */}
      <div className="fixed top-8 right-8 flex items-center gap-3 z-50">
        {/* Propose New Topic Button */}
        <button
          onClick={() => setShowProposalModal(true)}
          className="px-4 py-2 bg-blue-600/20 backdrop-blur-xl border border-blue-400/30 rounded-lg hover:bg-blue-600/30 transition-all shadow-2xl flex items-center gap-2"
          style={{ borderWidth: '1px' }}
        >
          <Plus className="w-4 h-4 text-blue-300" />
          <span className="text-blue-100 text-sm font-medium">Propose New Topic</span>
        </button>

        {/* Avatar */}
        <button
          onClick={handleAvatarClick}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all shadow-2xl"
          style={{ borderWidth: '1px' }}
        >
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* AI Chat Input - Bottom */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8 z-50">
        {/* AI Response Display */}
        {(aiResponse || aiError) && (
          <div className="mb-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-6 py-4 shadow-2xl" style={{ borderWidth: '1px', borderRadius: '8px' }}>
            {aiError ? (
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Error</p>
                  <p className="text-sm text-zinc-300 mt-1">{aiError}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-400 mb-2">AI Response</p>
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap">{aiResponse}</p>
                </div>
                <button
                  onClick={() => setAiResponse(null)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleAiSubmit} className="relative">
          {/* Search Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl" style={{ borderWidth: '1px', borderRadius: '8px' }}>
              <div className="px-4 py-2 text-xs text-zinc-400 border-b border-white/5">
                Search Results
              </div>
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="block w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span>{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 shadow-2xl" style={{ borderWidth: '1px', borderRadius: '8px' }}>
            <input
              type="text"
              value={aiQuery}
              onChange={handleInputChange}
              onBlur={() => {
                // Delay hiding to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onFocus={() => {
                // Show suggestions if there are any and query is long enough
                if (aiQuery.length >= 2 && searchSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Search nodes or ask AI anything..."
              className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder:text-zinc-500"
              disabled={aiLoading}
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
            )}
            <button
              type="submit"
              className="p-2 bg-white/10 hover:bg-white/20 transition-all border border-white/20 disabled:opacity-50"
              style={{ borderWidth: '1px', borderRadius: '8px' }}
              disabled={!aiQuery.trim() || aiLoading}
              title="Ask AI (press Enter)"
            >
              {aiLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Login Modal */}
      <LoginDialog
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Topic Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl mx-4">
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden" style={{ borderWidth: '1px' }}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Propose New Topic</h2>
                <button
                  onClick={() => setShowProposalModal(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-8">
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Coming Soon</h3>
                  <p className="text-zinc-400 max-w-md mx-auto">
                    The formal topic proposal process is being developed. This will include:
                  </p>
                  <ul className="text-zinc-400 text-sm mt-4 space-y-2 max-w-md mx-auto text-left">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>AI-powered duplicate detection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>Reference quality assessment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>Formal justification requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>AI evaluation and approval workflow</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setShowProposalModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Layer 1 - Fastest, Largest Stars */
        .starfield-layer-1 {
          background: radial-gradient(2px 2px at 20% 30%, white, transparent),
                      radial-gradient(2px 2px at 60% 70%, white, transparent),
                      radial-gradient(2px 2px at 50% 50%, white, transparent),
                      radial-gradient(2px 2px at 80% 10%, white, transparent),
                      radial-gradient(2px 2px at 90% 60%, white, transparent);
          background-size: 250% 250%;
          animation: starfield-fast 100s linear infinite;
          opacity: 0.6;
        }

        /* Layer 2 - Medium Speed, Medium Stars */
        .starfield-layer-2 {
          background: radial-gradient(1.5px 1.5px at 33% 80%, rgba(255,255,255,0.8), transparent),
                      radial-gradient(1.5px 1.5px at 15% 90%, rgba(255,255,255,0.8), transparent),
                      radial-gradient(1.5px 1.5px at 75% 25%, rgba(255,255,255,0.8), transparent),
                      radial-gradient(1.5px 1.5px at 45% 45%, rgba(255,255,255,0.8), transparent);
          background-size: 300% 300%;
          animation: starfield-medium 150s linear infinite;
          opacity: 0.5;
        }

        /* Layer 3 - Slowest, Smallest Stars */
        .starfield-layer-3 {
          background: radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 40% 60%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 85% 15%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 25% 40%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 55% 75%, rgba(255,255,255,0.6), transparent);
          background-size: 400% 400%;
          animation: starfield-slow 250s linear infinite;
          opacity: 0.4;
        }

        @keyframes starfield-fast {
          0% { background-position: 0% 0%; }
          100% { background-position: 250% 250%; }
        }

        @keyframes starfield-medium {
          0% { background-position: 0% 0%; }
          100% { background-position: 300% 300%; }
        }

        @keyframes starfield-slow {
          0% { background-position: 0% 0%; }
          100% { background-position: 400% 400%; }
        }
      `}</style>
    </div>
  );
}

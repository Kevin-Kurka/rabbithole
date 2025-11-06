"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  User,
  LogIn,
  LogOut,
  Send,
  X,
  ChevronRight,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Network,
  Check,
  Search,
  Sparkles,
  Bot,
  FileText,
  Camera,
  Users,
  MapPin,
  Building,
  Calendar,
  Scale,
  Clock,
  Microscope,
  Target,
  AlertCircle,
  HelpCircle,
  Shield,
  Gavel,
  BookOpen,
  UserCheck,
  Newspaper,
  Archive,
  Video,
  Headphones,
  Image,
  Link,
  MoreVertical,
  MessageCircle,
  GitBranch,
  Star,
  Flag,
  Edit3,
  Trash2,
  Plus,
  ExternalLink,
  Menu
} from 'lucide-react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  SCHEMA_TYPES,
  getSchemaType,
  detectSchemaType as detectSchemaTypeFromLib,
  hasTemporalProperties,
  calculateTemporalSpan
} from '@/lib/schema-types';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  Viewport,
  Handle,
  NodeProps,
  ConnectionMode,
  getBezierPath,
  EdgeProps,
  BaseEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import LoginDialog from '@/components/LoginDialog';

// Use the comprehensive Schema.org types from lib/schema-types.ts
// This provides 100+ types with full inheritance, temporal properties, and contextual icons

// Helper to get icon for a type name
function getIconForType(typeName: string) {
  const schemaType = getSchemaType(typeName);
  return schemaType.icon;
}

// Helper to get label for a type name
function getLabelForType(typeName: string) {
  const schemaType = getSchemaType(typeName);
  return schemaType.label;
}

// Function to detect node type from content (wrapper around lib function)
function detectNodeType(props: any, meta?: any): string {
  // Use the comprehensive detection from lib
  return detectSchemaTypeFromLib(props, meta);
}

// Function to detect node type from content (OLD - kept for reference)
function detectNodeTypeOld(props: any, meta?: any): string {
  // First check if schema_type is already stored in meta
  if (meta?.schema_type) {
    return meta.schema_type;
  }

  const title = props.title?.toLowerCase() || '';
  const description = props.description?.toLowerCase() || '';
  const content = `${title} ${description}`;

  // Media detection
  if (content.includes('film') || content.includes('video') || content.includes('footage')) {
    return 'MediaObject/VideoObject';
  }
  if (content.includes('photograph') || content.includes('photo') || content.includes('image')) {
    return 'MediaObject/Photograph';
  }
  if (content.includes('recording') || content.includes('audio') || content.includes('dictabelt')) {
    return 'MediaObject/AudioObject';
  }

  // Document types
  if (content.includes('report') || content.includes('commission')) {
    return 'CreativeWork/Report';
  }
  if (content.includes('autopsy') || content.includes('medical')) {
    return 'CreativeWork/Report';
  }
  if (content.includes('notes') || content.includes('interrogation')) {
    return 'CreativeWork/Article';
  }

  // Places and events
  if (content.includes('plaza') || content.includes('hospital') || content.includes('scene')) {
    return 'Place';
  }
  if (content.includes('witnesses') || content.includes('testimony')) {
    return 'PersonTestimony';
  }

  // Theories and analysis
  if (content.includes('theory') || content.includes('conspiracy')) {
    return 'Theory';
  }
  if (content.includes('analysis') || content.includes('shot')) {
    return 'Analysis';
  }

  // Physical evidence
  if (content.includes('rifle') || content.includes('bullet') || content.includes('evidence')) {
    return 'Evidence';
  }

  // Default to report for most documents
  return 'CreativeWork/Report';
}

// GraphQL Queries
const GET_ALL_GRAPHS = gql`
  query GetAllGraphs {
    graphs {
      id
      name
      description
      level
      privacy
      nodes {
        id
        props
        is_level_0
        created_at
        meta
      }
      edges {
        id
        from {
          id
        }
        to {
          id
        }
        props
        is_level_0
        meta
      }
    }
  }
`;

// Simple seeded random number generator with fixed precision
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * 10000) / 10000; // Fixed to 4 decimal places
};

// Starfield component with parallax
const Starfield = ({ viewport }: { viewport: Viewport }) => {
  // Use state to handle client-side only rendering
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate stars with stable seed-based positions
  const stars = useMemo(() => {
    if (!mounted) {
      // Return empty arrays during SSR
      return {
        small: [],
        medium: [],
        large: [],
      };
    }

    let seed = 12345; // Fixed seed for stable generation
    const getRandom = () => seededRandom(++seed);

    const starLayers = {
      small: Array.from({ length: 200 }).map(() => ({
        x: getRandom() * 200 - 100, // -100% to 100%
        y: getRandom() * 200 - 100,
        size: Math.floor(getRandom() * 50 + 10) / 100, // 0.1 to 0.6
        opacity: Math.floor(getRandom() * 30 + 10) / 100, // 0.1 to 0.4
      })),
      medium: Array.from({ length: 80 }).map(() => ({
        x: getRandom() * 200 - 100,
        y: getRandom() * 200 - 100,
        size: Math.floor(getRandom() * 100 + 50) / 100, // 0.5 to 1.5
        opacity: Math.floor(getRandom() * 30 + 20) / 100, // 0.2 to 0.5
      })),
      large: Array.from({ length: 30 }).map(() => ({
        x: getRandom() * 200 - 100,
        y: getRandom() * 200 - 100,
        size: Math.floor(getRandom() * 150 + 100) / 100, // 1.0 to 2.5
        opacity: Math.floor(getRandom() * 40 + 30) / 100, // 0.3 to 0.7
      })),
    };
    return starLayers;
  }, [mounted]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Small stars - slow parallax */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${viewport.x * 0.1}px, ${viewport.y * 0.1}px) scale(${1 + viewport.zoom * 0.1})`,
        }}
      >
        {stars.small.map((star, i) => (
          <div
            key={`small-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* Medium stars - medium parallax */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${viewport.x * 0.3}px, ${viewport.y * 0.3}px) scale(${1 + viewport.zoom * 0.2})`,
        }}
      >
        {stars.medium.map((star, i) => (
          <div
            key={`medium-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* Large stars - fast parallax */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${viewport.x * 0.5}px, ${viewport.y * 0.5}px) scale(${1 + viewport.zoom * 0.3})`,
        }}
      >
        {stars.large.map((star, i) => (
          <div
            key={`large-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, ${star.opacity * 0.5})`,
            }}
          />
        ))}
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-radial pointer-events-none"
        style={{
          transform: `scale(${1 + (viewport.zoom - 1) * 0.05})`,
          opacity: 0.6
        }}
      />
    </div>
  );
};

// Custom node component with credibility-based SVG border
function CredibilityNode({ data, selected }: NodeProps) {
  const credibility = data.credibility || 0;
  const [isDragging, setIsDragging] = useState(false);
  const [dragLine, setDragLine] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // Detect node type and get icon
  const nodeType = detectNodeType(data.props || {}, data.meta);
  const IconComponent = getIconForType(nodeType);
  const typeLabel = getLabelForType(nodeType);

  // Updated credibility styling:
  // Solid 0.5px lines for all
  // Opacity: 100% at credibility=0 (no credibility), fading to 10% at credibility=1 (fully credible)
  const strokeWidth = 0.5;
  let strokeOpacity = 1;

  // Calculate opacity: 100% at credibility=0 (no credibility), fading to 10% at credibility=1 (fully credible)
  if (credibility <= 0.1) {
    // Full opacity for low credibility (0 to 0.1)
    strokeOpacity = 1.0;
  } else if (credibility >= 0.9) {
    // 10% opacity for high credibility (0.9 to 1.0)
    strokeOpacity = 0.1;
  } else {
    // Linear fade from 100% (credibility=0.1) to 10% (credibility=0.9)
    strokeOpacity = 1.0 - ((credibility - 0.1) / 0.8) * 0.9;
  }

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Visual feedback during drag over
        e.currentTarget.style.filter = 'brightness(1.2)';
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Remove visual feedback
        e.currentTarget.style.filter = 'none';
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Remove visual feedback
        e.currentTarget.style.filter = 'none';

        // Get source node data
        const sourceNodeData = e.dataTransfer.getData('sourceNode');
        if (sourceNodeData && data.onConnectionDrop) {
          const sourceNode = JSON.parse(sourceNodeData);
          // Don't allow self-connection
          if (sourceNode.id !== data.id) {
            data.onConnectionDrop(sourceNode, {
              id: data.id,
              label: data.label,
              props: data.props,
              meta: data.meta,
              credibility: data.credibility
            });
          }
        }
      }}>
      {/* Node content container with proper clipping */}
      <div
        className="relative bg-black overflow-hidden"
        style={{
          minWidth: '120px',
          borderRadius: '4px'
        }}
      >
        {/* SVG border overlay - positioned exactly on the content edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          <rect
            x={0.25}
            y={0.25}
            width="calc(100% - 0.5px)"
            height="calc(100% - 0.5px)"
            fill="none"
            stroke="#ffffff"
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            rx={3.5}
            ry={3.5}
          />
        </svg>

        {/* Node content */}
        <div className="px-3 py-2 text-white text-[11px] font-medium relative">
          {/* Left-justified node label */}
          <div className="text-left mb-1">{data.label}</div>

          {/* Bottom row with icon/credibility (left) and connection icon (right) */}
          <div className="flex justify-between items-end">
            {/* Icon and credibility score at bottom left */}
            <div className="flex items-center gap-1">
              <IconComponent
                size={9}
                className="text-zinc-500"
                style={{ height: '9px', minWidth: '9px' }}
              />
              {data.credibility !== undefined && (
                <span
                  className="text-zinc-500 font-mono"
                  style={{ fontSize: '6px', lineHeight: '6px' }}
                >
                  {Math.round(data.credibility * 100)}%
                </span>
              )}
            </div>

            {/* Connection icon at bottom right - draggable */}
            <div
              className="text-zinc-400 hover:text-blue-400 transition-colors cursor-move bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-blue-400 rounded-full p-1"
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                setIsDragging(true);
                // Store node data in dataTransfer
                e.dataTransfer.effectAllowed = 'link';
                e.dataTransfer.setData('sourceNode', JSON.stringify({
                  id: data.id,
                  label: data.label,
                  props: data.props,
                  meta: data.meta,
                  credibility: data.credibility
                }));
                // Create custom drag image
                const dragImg = document.createElement('div');
                dragImg.style.opacity = '0';
                document.body.appendChild(dragImg);
                e.dataTransfer.setDragImage(dragImg, 0, 0);
                setTimeout(() => document.body.removeChild(dragImg), 0);

                // Add visual feedback class to source node
                if (data.onDragStart) {
                  data.onDragStart();
                }
              }}
              onDragEnd={(e) => {
                e.stopPropagation();
                setIsDragging(false);
                setDragLine(null);

                // Remove visual feedback
                if (data.onDragEnd) {
                  data.onDragEnd();
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Only open modal on click, not drag
                if (!isDragging && data.onConnectionClick) {
                  data.onConnectionClick({
                    id: data.id,
                    label: data.label,
                    props: data.props,
                    meta: data.meta,
                    credibility: data.credibility
                  });
                }
              }}
              title="Drag to connect nodes"
            >
              <Link size={12} />
            </div>
          </div>
        </div>
      </div>


      {/* Connection handles on all sides */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!bg-transparent !border-0"
        style={{ top: -4, left: '50%', width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!bg-transparent !border-0"
        style={{ top: -4, left: '50%', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-transparent !border-0"
        style={{ right: -4, top: '50%', width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className="!bg-transparent !border-0"
        style={{ right: -4, top: '50%', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-transparent !border-0"
        style={{ bottom: -4, left: '50%', width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="!bg-transparent !border-0"
        style={{ bottom: -4, left: '50%', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!bg-transparent !border-0"
        style={{ left: -4, top: '50%', width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!bg-transparent !border-0"
        style={{ left: -4, top: '50%', width: 8, height: 8 }}
      />
    </div>
  );
}

// Custom edge with dynamic bezier curves
function CredibilityEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  markerStart,
  style = {},
}: EdgeProps) {
  // Calculate dynamic curvature based on distance and direction
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Adjust curvature based on distance - more curve for longer distances
  const curvature = Math.min(0.7, Math.max(0.2, distance / 500));

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature,
  });

  // Get credibility from data and calculate opacity
  const credibility = data?.credibility || 0;
  let opacity = 1;

  // Calculate opacity: 100% at credibility=0 (no credibility), fading to 10% at credibility=1 (fully credible)
  if (credibility <= 0.1) {
    // Full opacity for low credibility (0 to 0.1)
    opacity = 1.0;
  } else if (credibility >= 0.9) {
    // 10% opacity for high credibility (0.9 to 1.0)
    opacity = 0.1;
  } else {
    // Linear fade from 100% (credibility=0.1) to 10% (credibility=0.9)
    opacity = 1.0 - ((credibility - 0.1) / 0.8) * 0.9;
  }

  // Merge the calculated opacity with the style
  const edgeStyle = {
    ...style,
    opacity,
  };

  return (
    <>
      {/* Define custom markers */}
      <defs>
        {/* Circle marker for source */}
        <marker
          id={`circle-${id}`}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="10"
          markerHeight="10"
          orient="auto"
        >
          <circle
            cx="5"
            cy="5"
            r="3"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.5"
            strokeOpacity={opacity}
          />
        </marker>
        {/* Arrow marker for target */}
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="10"
          markerHeight="10"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill="#ffffff"
            fillOpacity={opacity}
            stroke="none"
          />
        </marker>
      </defs>
      <BaseEdge
        path={edgePath}
        markerStart={`url(#circle-${id})`}
        markerEnd={`url(#arrow-${id})`}
        style={edgeStyle}
      />
    </>
  );
}

const nodeTypes = {
  credibilityNode: CredibilityNode,
};

const edgeTypes = {
  credibilityEdge: CredibilityEdge,
};

// Schema.org edge/relationship types
const SCHEMA_EDGE_TYPES = {
  'relatedTo': { label: 'Related To', icon: Link, description: 'General relationship' },
  'supports': { label: 'Supports', icon: Star, description: 'Provides evidence for' },
  'contradicts': { label: 'Contradicts', icon: X, description: 'Provides evidence against' },
  'causes': { label: 'Causes', icon: ChevronRight, description: 'Directly causes or leads to' },
  'contains': { label: 'Contains', icon: Archive, description: 'Contains or includes' },
  'describes': { label: 'Describes', icon: FileText, description: 'Provides description of' },
  'cites': { label: 'Cites', icon: BookOpen, description: 'References or cites' },
  'temporalSequence': { label: 'Temporal Sequence', icon: Clock, description: 'Happens before/after' },
  'locatedAt': { label: 'Located At', icon: MapPin, description: 'Physically located at' },
  'involves': { label: 'Involves', icon: Users, description: 'Involves person/organization' },
} as const;

// Connection Modal Component
function ConnectionModal({
  isOpen,
  onClose,
  sourceNode,
  targetNode,
  availableNodes,
  onCreateConnection
}: {
  isOpen: boolean;
  onClose: () => void;
  sourceNode: any;
  targetNode?: any;
  availableNodes: any[];
  onCreateConnection: (sourceId: string, targetId: string, edgeType: string, description?: string) => void;
}) {
  const [selectedTargetNode, setSelectedTargetNode] = useState<string>(targetNode?.id || '');
  const [selectedEdgeType, setSelectedEdgeType] = useState<string>('relatedTo');
  const [description, setDescription] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [connectionTypeQuery, setConnectionTypeQuery] = useState<string>('');
  const [showConnectionTypeDropdown, setShowConnectionTypeDropdown] = useState<boolean>(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);
  const [isAiEnhancing, setIsAiEnhancing] = useState<boolean>(false);

  // Update selected target when targetNode prop changes
  useEffect(() => {
    if (targetNode) {
      setSelectedTargetNode(targetNode.id);
    }
  }, [targetNode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showConnectionTypeDropdown) {
        const target = event.target as Element;
        if (!target.closest('.connection-type-dropdown')) {
          setShowConnectionTypeDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConnectionTypeDropdown]);

  const filteredNodes = useMemo(() => {
    if (!availableNodes) return [];
    return availableNodes.filter(node =>
      node.id !== sourceNode?.id && // Don't include source node
      (!searchQuery ||
        node.data.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.data.props?.description && node.data.props.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );
  }, [availableNodes, sourceNode, searchQuery]);

  const filteredConnectionTypes = useMemo(() => {
    return Object.entries(SCHEMA_EDGE_TYPES).filter(([key, type]) =>
      !connectionTypeQuery ||
      type.label.toLowerCase().includes(connectionTypeQuery.toLowerCase()) ||
      type.description.toLowerCase().includes(connectionTypeQuery.toLowerCase())
    );
  }, [connectionTypeQuery]);

  const handleAiEnhancement = async () => {
    if (!description.trim()) return;
    setIsAiEnhancing(true);
    try {
      // Simulate AI enhancement (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1500));
      const enhanced = `Enhanced: ${description} - This connection demonstrates a significant relationship with verified supporting evidence and contextual relevance.`;
      setDescription(enhanced);
    } catch (error) {
      console.error('AI enhancement failed:', error);
    } finally {
      setIsAiEnhancing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTargetNode && sourceNode) {
      onCreateConnection(sourceNode.id, selectedTargetNode, selectedEdgeType, description);
      onClose();
      // Reset form
      setSelectedTargetNode('');
      setSelectedEdgeType('relatedTo');
      setDescription('');
      setSearchQuery('');
      setConnectionTypeQuery('');
      setShowConnectionTypeDropdown(false);
      setIsDescriptionExpanded(false);
      setIsAiEnhancing(false);
    }
  };

  if (!isOpen) return null;

  const edgeTypeInfo = SCHEMA_EDGE_TYPES[selectedEdgeType as keyof typeof SCHEMA_EDGE_TYPES];
  const EdgeIcon = edgeTypeInfo?.icon || Link;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-zinc-900 border-l border-zinc-700 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Create Connection</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Node Display */}
          <div className="bg-zinc-800 p-3 rounded border">
            <div className="text-sm text-zinc-400 mb-1">From:</div>
            <div className="text-white font-medium">{sourceNode?.label}</div>
          </div>

          {/* Connection Type Selection with Search */}
          <div className="relative connection-type-dropdown">
            <label className="block text-sm text-zinc-300 mb-2">Connection Type:</label>
            <div className="relative">
              <input
                type="text"
                value={connectionTypeQuery}
                onChange={(e) => {
                  setConnectionTypeQuery(e.target.value);
                  setShowConnectionTypeDropdown(true);
                }}
                onFocus={() => setShowConnectionTypeDropdown(true)}
                placeholder="Search connection types..."
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-white pr-8"
              />
              <Search size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
            </div>

            {showConnectionTypeDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-600 rounded max-h-40 overflow-y-auto">
                {filteredConnectionTypes.map(([key, type]) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedEdgeType(key);
                        setConnectionTypeQuery('');
                        setShowConnectionTypeDropdown(false);
                      }}
                      className={`w-full text-left p-3 border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700 transition-colors ${
                        selectedEdgeType === key ? 'bg-zinc-700' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <IconComponent size={14} className="text-zinc-400" />
                        <div>
                          <div className="text-white font-medium">{type.label}</div>
                          <div className="text-xs text-zinc-400">{type.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <EdgeIcon size={12} />
              {edgeTypeInfo?.description}
            </div>
          </div>

          {/* Target Node Selection */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">To:</label>

            {/* Search */}
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className="w-full bg-zinc-800 border border-zinc-600 rounded pl-10 pr-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>

            {/* Node List - Only show when searching */}
            {searchQuery && (
              <div className="border border-zinc-600 rounded max-h-40 overflow-y-auto">
                {filteredNodes.length === 0 ? (
                  <div className="p-3 text-zinc-500 text-center">No nodes found</div>
                ) : (
                  filteredNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedTargetNode(node.id)}
                    className={`w-full text-left p-3 border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700 transition-colors ${
                      selectedTargetNode === node.id ? 'bg-zinc-700' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedTargetNode === node.id ? 'bg-white' : 'bg-zinc-600'}`} />
                      <div>
                        <div className="text-white font-medium">{node.data.label}</div>
                        {node.data.props?.description && (
                          <div className="text-xs text-zinc-400 truncate">
                            {node.data.props.description}
                          </div>
                        )}
                        <div className="text-xs text-zinc-500">
                          Credibility: {node.data.credibility !== undefined ? `${Math.round(node.data.credibility * 100)}%` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Description with AI Enhancement */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Description (optional):</label>
            <div className="relative">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setIsDescriptionExpanded(true)}
                placeholder="Describe this relationship..."
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-white pr-20"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={handleAiEnhancement}
                  disabled={!description.trim() || isAiEnhancing}
                  className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
                  title="AI enhance description"
                >
                  {isAiEnhancing ? 'AI...' : '✨ AI'}
                </button>
                {description && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="text-xs px-2 py-1 bg-zinc-600 hover:bg-zinc-500 text-white rounded transition-colors"
                    title={isDescriptionExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isDescriptionExpanded ? '▲' : '▼'}
                  </button>
                )}
              </div>
            </div>

            {isDescriptionExpanded && description && (
              <div className="mt-2 p-3 bg-zinc-800 border border-zinc-600 rounded">
                <div className="text-sm text-zinc-300 whitespace-pre-wrap">{description}</div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleAiEnhancement}
                    disabled={isAiEnhancing}
                    className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    {isAiEnhancing ? (
                      <>
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>✨ Enhance with AI</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescription('')}
                    className="text-xs px-3 py-1 bg-zinc-600 hover:bg-zinc-500 text-white rounded transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

        </form>
      </div>

      {/* Pinned buttons at bottom */}
      <div className="border-t border-zinc-700 p-4 bg-zinc-900">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (selectedTargetNode && sourceNode) {
                onCreateConnection(sourceNode.id, selectedTargetNode, selectedEdgeType, description);
                onClose();
                // Reset form
                setSelectedTargetNode('');
                setSelectedEdgeType('relatedTo');
                setDescription('');
                setSearchQuery('');
                setConnectionTypeQuery('');
                setShowConnectionTypeDropdown(false);
                setIsDescriptionExpanded(false);
                setIsAiEnhancing(false);
              }
            }}
            disabled={!selectedTargetNode}
            className="flex-1 px-4 py-2 bg-white text-black rounded hover:bg-zinc-100 transition-colors disabled:bg-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed"
          >
            Create Connection
          </button>
        </div>
      </div>
    </div>
  );
}

// Media Viewer Component
function MediaViewer({ mediaData, nodeProps }: { mediaData: any; nodeProps: any }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Detect media type from props
  const getMediaType = () => {
    // Check for explicit URL media types first
    if (nodeProps?.url) {
      const url = nodeProps.url.toLowerCase();
      if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) return 'video';
      if (url.includes('.pdf')) return 'pdf';
      if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp') || url.includes('.svg')) return 'image';
      if (url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || url.includes('.ogg')) return 'audio';
      if (url.includes('.mp4') || url.includes('.webm') || url.includes('.avi') || url.includes('.mov')) return 'video';
      if (url.includes('.doc') || url.includes('.docx') || url.includes('.txt') || url.includes('.html')) return 'document';
      return 'document';
    }

    // Check schema.org types
    if (nodeProps?.type === 'VideoObject' || nodeProps?.schema_type === 'VideoObject') return 'video';
    if (nodeProps?.type === 'ImageObject' || nodeProps?.schema_type === 'ImageObject') return 'image';
    if (nodeProps?.type === 'AudioObject' || nodeProps?.schema_type === 'AudioObject') return 'audio';

    // Check for document indicators
    if (nodeProps?.pages || nodeProps?.datePublished || nodeProps?.dateCreated ||
        nodeProps?.title?.includes('Report') || nodeProps?.title?.includes('Document') ||
        nodeProps?.title?.includes('Autopsy') || nodeProps?.title?.includes('Commission') ||
        nodeProps?.schema_type === 'Report' || nodeProps?.schema_type === 'MedicalReport') return 'document';

    // Check for film/video indicators
    if (nodeProps?.title?.includes('Film') || nodeProps?.frames || nodeProps?.duration ||
        nodeProps?.title?.includes('Recording') || nodeProps?.title?.includes('Footage')) return 'video';

    // Check for image indicators
    if (nodeProps?.title?.includes('Photo') || nodeProps?.title?.includes('Image') ||
        nodeProps?.title?.includes('Picture') || nodeProps?.title?.includes('Snapshot')) return 'image';

    // Check for audio indicators
    if (nodeProps?.title?.includes('Audio') || nodeProps?.title?.includes('Recording') ||
        nodeProps?.title?.includes('Dictabelt') || nodeProps?.title?.includes('Sound')) return 'audio';

    // If we have substantial content, show as document
    if (nodeProps?.description && nodeProps.description.length > 100) return 'document';

    return null; // No media detected
  };

  const mediaType = getMediaType();

  const renderMedia = () => {
    switch (mediaType) {
      case 'video':
        return (
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3">{nodeProps?.title || 'Video'}</h4>

            <div className="text-sm text-zinc-400 mb-4">
              {nodeProps?.duration && <span>Duration: {nodeProps.duration}</span>}
              {nodeProps?.creator && <span className="ml-3">by {nodeProps.creator}</span>}
              {nodeProps?.dateCreated && <span className="ml-3">Recorded {nodeProps.dateCreated}</span>}
              {nodeProps?.frames && <span className="ml-3">{nodeProps.frames} frames</span>}
            </div>

            {/* Video embed - simplified */}
            {nodeProps?.url && (() => {
              const youtubeMatch = nodeProps.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
              if (youtubeMatch) {
                const videoId = youtubeMatch[1];
                return (
                  <div className="aspect-video bg-black mb-4 border border-zinc-700">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={nodeProps.title || 'Video'}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                );
              }
              return (
                <p className="mb-4">
                  <a
                    href={nodeProps.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Watch video
                  </a>
                </p>
              );
            })()}

            {/* Key frames as text */}
            {nodeProps?.frame_313 && (
              <p className="text-zinc-300 mb-4">
                <strong>Frame 313:</strong> {nodeProps.frame_313}
              </p>
            )}

            {nodeProps?.key_frames && (
              <div className="mb-4">
                <p className="text-zinc-300 mb-2"><strong>Key frames:</strong></p>
                <ul className="text-zinc-300 ml-4">
                  {Object.entries(nodeProps.key_frames).map(([frame, description]) => (
                    <li key={frame} className="mb-1">
                      <strong>Frame {frame}:</strong> {description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {nodeProps?.description && (
              <p className="text-zinc-300 leading-relaxed">
                {nodeProps.description}
              </p>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="bg-zinc-900 rounded-lg overflow-hidden">
            {nodeProps?.url ? (
              <img
                src={nodeProps.url}
                alt={nodeProps.title || 'Image'}
                className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setIsFullscreen(true)}
              />
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center">
                  <Image size={48} className="mx-auto mb-2 text-zinc-500" />
                  <p className="text-zinc-400">Image content</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="bg-zinc-900 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <Headphones size={32} className="text-zinc-400" />
              <div>
                <h4 className="font-semibold">{nodeProps?.title || 'Audio Recording'}</h4>
                {nodeProps?.duration && <p className="text-sm text-zinc-400">{nodeProps.duration}</p>}
              </div>
            </div>
            {nodeProps?.url && (
              <audio controls className="w-full">
                <source src={nodeProps.url} />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        );

      case 'pdf':
      case 'document':
        return (
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3">{nodeProps?.title || 'Document'}</h4>

            <div className="text-sm text-zinc-400 mb-4">
              {nodeProps?.pages && <span>{nodeProps.pages} pages</span>}
              {nodeProps?.datePublished && <span className="ml-3">Published {nodeProps.datePublished}</span>}
              {nodeProps?.author && <span className="ml-3">by {nodeProps.author}</span>}
              {nodeProps?.url && (
                <a
                  href={nodeProps.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 text-blue-400 hover:text-blue-300 hover:underline"
                >
                  View document
                </a>
              )}
            </div>

            {/* Key details as inline text */}
            {(nodeProps?.location || nodeProps?.time || nodeProps?.exhibit_number) && (
              <p className="text-zinc-300 mb-4">
                {nodeProps?.exhibit_number && <span><strong>Exhibit:</strong> {nodeProps.exhibit_number}. </span>}
                {nodeProps?.location && <span><strong>Location:</strong> {nodeProps.location}. </span>}
                {nodeProps?.time && <span><strong>Time:</strong> {nodeProps.time}. </span>}
                {nodeProps?.wounds_documented && <span><strong>Wounds documented:</strong> {nodeProps.wounds_documented}. </span>}
              </p>
            )}

            {/* Commission members as text */}
            {(nodeProps?.commission_members || nodeProps?.doctors) && (
              <p className="text-zinc-300 mb-4">
                <strong>{nodeProps?.commission_members ? 'Commission members' : 'Medical team'}:</strong>{' '}
                {(nodeProps?.commission_members || nodeProps?.doctors || []).join(', ')}.
              </p>
            )}

            {nodeProps?.description && (
              <p className="text-zinc-300 leading-relaxed">
                {nodeProps.description}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Don't render anything if no media detected
  if (!mediaType) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <FileText size={32} className="mx-auto mb-2" />
        <p>No media content available for this node</p>
      </div>
    );
  }

  return (
    <>
      {renderMedia()}

      {/* Fullscreen overlay for images */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 text-white hover:text-zinc-300"
          >
            <X size={24} />
          </button>
          <img
            src={nodeProps?.url}
            alt={nodeProps?.title || 'Image'}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}

// Breadcrumb Component
function Breadcrumb({ breadcrumbs, onNavigate }: {
  breadcrumbs: { label: string; page: string; data?: any }[];
  onNavigate: (page: string, data?: any) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight size={12} className="text-zinc-600" />}
          <button
            onClick={() => onNavigate(crumb.page, crumb.data)}
            className={`hover:text-white transition-colors ${
              index === breadcrumbs.length - 1 ? 'text-white font-semibold' : ''
            }`}
          >
            {crumb.page === 'graph' && <Network size={12} className="inline mr-1" />}
            {crumb.label}
          </button>
        </div>
      ))}
    </div>
  );
}

// Node Detail Page Component
function NodePage({
  node,
  breadcrumbs,
  onNavigate
}: {
  node: any;
  breadcrumbs: { label: string; page: string; data?: any }[];
  onNavigate: (page: string, data?: any) => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  // Detect node type for icon
  const nodeType = detectNodeType(node.props || {}, node.meta);
  const IconComponent = getIconForType(nodeType);
  const typeLabel = getLabelForType(nodeType);

  // Check for temporal properties (not just Person nodes anymore)
  const temporalSpan = calculateTemporalSpan({ props: node.props, meta: node.meta });
  const hasTemporal = temporalSpan !== null;

  // Mock data for demonstration
  const mockClaims = [
    { id: 1, text: "Lee Harvey Oswald acted alone in the assassination", credibility: 0.65, section: "conclusion" },
    { id: 2, text: "Three shots were fired from the sixth floor", credibility: 0.85, section: "timeline" },
    { id: 3, text: "No credible evidence of conspiracy", credibility: 0.45, section: "analysis" }
  ];

  const mockInquiries = [
    { id: 1, title: "Dispute: Single Bullet Theory", status: "active", author: "forensics_expert", date: "2024-11-01" },
    { id: 2, title: "Evidence Challenge: Trajectory Analysis", status: "resolved", author: "ballistics_pro", date: "2024-10-15" }
  ];

  const mockConnections = [
    { id: 'e1', label: 'Warren Commission Report', type: 'cites', credibility: 0.75 },
    { id: 'e2', label: 'Dealey Plaza', type: 'locatedAt', credibility: 1.0 },
    { id: 'e3', label: 'Magic Bullet Theory', type: 'contradicts', credibility: 0.35 }
  ];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const [activeTab, setActiveTab] = useState('article');
  const [showContentsDropdown, setShowContentsDropdown] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showNewInquiryModal, setShowNewInquiryModal] = useState(false);
  const [showInquiryDetails, setShowInquiryDetails] = useState<number | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showVideoArchive, setShowVideoArchive] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [inquiryForm, setInquiryForm] = useState({
    title: '',
    description: '',
    methodology: 'Scientific Method',
    priority: 'medium'
  });

  // Mock comments data with more interactive state
  const [comments, setComments] = useState([
    { id: 1, author: 'researcher_42', content: 'The single bullet theory has been extensively debated. New ballistics analysis suggests...', timestamp: '2024-11-05 14:30', likes: 5, replies: [
      { id: 11, author: 'forensics_expert', content: 'I disagree with this interpretation. The trajectory analysis clearly shows...', timestamp: '2024-11-05 15:45', likes: 2 }
    ]},
    { id: 2, author: 'history_buff', content: 'Has anyone considered the witness testimony contradictions?', timestamp: '2024-11-05 13:15', likes: 3, replies: [] },
  ]);

  // Enhanced inquiries with expandable state
  const [inquiryExpanded, setInquiryExpanded] = useState<Set<number>>(new Set());

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showContentsDropdown) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setShowContentsDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContentsDropdown]);

  // Functions for interactivity
  const handlePostComment = () => {
    if (newComment.trim()) {
      const newCommentObj = {
        id: Date.now(),
        author: 'current_user',
        content: newComment,
        timestamp: new Date().toLocaleString(),
        likes: 0,
        replies: []
      };
      setComments([...comments, newCommentObj]);
      setNewComment('');
    }
  };

  const handlePostReply = (commentId: number) => {
    if (replyText.trim()) {
      const newReply = {
        id: Date.now(),
        author: 'current_user',
        content: replyText,
        timestamp: new Date().toLocaleString(),
        likes: 0
      };
      setComments(comments.map(comment =>
        comment.id === commentId
          ? { ...comment, replies: [...comment.replies, newReply] }
          : comment
      ));
      setReplyText('');
      setReplyingTo(null);
    }
  };

  const handleCreateInquiry = () => {
    if (inquiryForm.title.trim() && inquiryForm.description.trim()) {
      // Here you would typically send to backend
      console.log('Creating inquiry:', inquiryForm);
      setShowNewInquiryModal(false);
      setInquiryForm({ title: '', description: '', methodology: 'Scientific Method', priority: 'medium' });
    }
  };

  const toggleInquiryExpanded = (inquiryId: number) => {
    setInquiryExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(inquiryId)) {
        newSet.delete(inquiryId);
      } else {
        newSet.add(inquiryId);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden">
      <div className="flex h-full">

        {/* Center Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-zinc-700">
            <Breadcrumb breadcrumbs={breadcrumbs} onNavigate={onNavigate} />
            <h1 className="text-4xl font-light mt-4 mb-2">{node.label}</h1>
            <div className="text-sm text-zinc-400">
              <span>{typeLabel}</span>
              {node.credibility !== undefined && (
                <>
                  <span className="mx-2">•</span>
                  <span className={
                    node.credibility >= 0.8 ? 'text-green-400' :
                    node.credibility >= 0.5 ? 'text-yellow-400' :
                    'text-red-400'
                  }>
                    {Math.round(node.credibility * 100)}% credibility
                  </span>
                </>
              )}
              {node.props?.dateCreated && (
                <>
                  <span className="mx-2">•</span>
                  <span>{node.props.dateCreated}</span>
                </>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-zinc-700">
            <div className="flex space-x-0">
              {/* Article Tab with Menu */}
              <div className="relative">
                <button
                  onClick={() => setActiveTab('article')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                    activeTab === 'article'
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  Article
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowContentsDropdown(!showContentsDropdown);
                    }}
                    className="p-1 hover:bg-zinc-700 rounded"
                  >
                    <Menu size={14} />
                  </button>
                </button>

                {/* Contents Dropdown */}
                {showContentsDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-50">
                    <div className="p-3">
                      <h3 className="font-bold text-zinc-300 mb-3 text-sm">Contents</h3>
                      <div className="space-y-2 text-sm">
                        <button
                          onClick={() => {toggleSection('claims'); setActiveTab('article'); setShowContentsDropdown(false);}}
                          className="block w-full text-left text-blue-400 hover:text-blue-300 hover:underline py-1"
                        >
                          Claims and assertions
                        </button>
                        {expandedSections.has('claims') && (
                          <div className="ml-3 space-y-1 text-xs text-zinc-500">
                            {mockClaims.map(claim => (
                              <div key={claim.id} className="py-1">• Claim {claim.id}</div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => {toggleSection('media'); setActiveTab('article'); setShowContentsDropdown(false);}}
                          className="block w-full text-left text-blue-400 hover:text-blue-300 hover:underline py-1"
                        >
                          Media and documentation
                        </button>
                        <button
                          onClick={() => {toggleSection('related'); setActiveTab('article'); setShowContentsDropdown(false);}}
                          className="block w-full text-left text-blue-400 hover:text-blue-300 hover:underline py-1"
                        >
                          Related topics
                        </button>
                        {expandedSections.has('related') && (
                          <div className="ml-3 space-y-1 text-xs text-zinc-500">
                            {mockConnections.map(conn => (
                              <div key={conn.id} className="py-1">• {conn.label}</div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => {toggleSection('inquiries'); setActiveTab('article'); setShowContentsDropdown(false);}}
                          className="block w-full text-left text-blue-400 hover:text-blue-300 hover:underline py-1"
                        >
                          See also
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Other Tabs */}
              {['inquiries', 'comments'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'article' && (
              <div>
                {/* Lead paragraph */}
                {node.props?.description && (
                  <p className="text-zinc-300 leading-relaxed text-lg mb-8">
                    {node.props.description}
                  </p>
                )}

                {/* Claims Section */}
                {expandedSections.has('claims') && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-light border-b border-zinc-700 pb-2 mb-4">Claims and assertions</h2>
                    <div className="space-y-6">
                      {mockClaims.map(claim => (
                        <div key={claim.id} className="border-l-4 border-zinc-600 pl-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm text-zinc-500">Claim {claim.id}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              claim.credibility >= 0.8 ? 'bg-green-900 text-green-300' :
                              claim.credibility >= 0.5 ? 'bg-yellow-900 text-yellow-300' :
                              'bg-red-900 text-red-300'
                            }`}>
                              {Math.round(claim.credibility * 100)}% credible
                            </span>
                          </div>
                          <blockquote className="text-zinc-200 text-base mb-3 italic">
                            "{claim.text}"
                          </blockquote>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media Section */}
                {expandedSections.has('media') && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-light border-b border-zinc-700 pb-2 mb-4">Media and documentation</h2>
                    <MediaViewer mediaData={node} nodeProps={node.props} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'inquiries' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-light">Active Inquiries</h2>
                  <button
                    onClick={() => setShowNewInquiryModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                  >
                    New Inquiry
                  </button>
                </div>

                <div className="space-y-4">
                  {mockInquiries.map(inquiry => (
                    <div key={inquiry.id} className="border border-zinc-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <button
                          onClick={() => toggleInquiryExpanded(inquiry.id)}
                          className="flex items-center gap-2 text-left flex-1"
                        >
                          <ChevronRight
                            size={16}
                            className={`transition-transform ${inquiryExpanded.has(inquiry.id) ? 'rotate-90' : ''}`}
                          />
                          <h3 className="font-medium text-white">{inquiry.title}</h3>
                        </button>
                        <span className={`text-xs px-2 py-1 rounded ${
                          inquiry.status === 'active'
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-green-900 text-green-300'
                        }`}>
                          {inquiry.status}
                        </span>
                      </div>

                      <div className="text-sm text-zinc-400 mb-3">
                        By {inquiry.author} • {inquiry.date}
                      </div>

                      {inquiryExpanded.has(inquiry.id) && (
                        <div className="mt-4 p-4 bg-zinc-900 rounded">
                          <p className="text-zinc-300 mb-4">
                            This inquiry examines the {inquiry.title.toLowerCase()} through systematic analysis of available evidence and expert testimony.
                          </p>

                          <div className="space-y-3 mb-4">
                            <h4 className="font-medium text-zinc-200">Current Evidence:</h4>
                            <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1">
                              <li>Ballistics analysis report (credibility: 85%)</li>
                              <li>Witness testimony compilation (credibility: 60%)</li>
                              <li>Medical examination findings (credibility: 90%)</li>
                            </ul>
                          </div>

                          <div className="space-y-3 mb-4">
                            <h4 className="font-medium text-zinc-200">Responses (3):</h4>
                            <div className="space-y-2">
                              <div className="bg-zinc-800 p-3 rounded text-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium">ballistics_expert</span>
                                  <span className="text-xs text-zinc-500">2024-11-04 16:20</span>
                                </div>
                                <p className="text-zinc-300">The trajectory calculations support the single bullet theory based on...</p>
                              </div>
                              <div className="bg-zinc-800 p-3 rounded text-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium">medical_researcher</span>
                                  <span className="text-xs text-zinc-500">2024-11-03 14:15</span>
                                </div>
                                <p className="text-zinc-300">The wound patterns suggest multiple entry points which contradicts...</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium text-zinc-200">Add Response:</h4>
                            <textarea
                              placeholder="Share your analysis or evidence..."
                              className="w-full bg-zinc-800 border border-zinc-600 rounded p-3 text-white resize-none text-sm"
                              rows={3}
                            />
                            <div className="flex justify-end space-x-2">
                              <button className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">
                                Cancel
                              </button>
                              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                                Submit Response
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {!inquiryExpanded.has(inquiry.id) && (
                        <div className="text-sm space-x-4">
                          <button
                            onClick={() => toggleInquiryExpanded(inquiry.id)}
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            View Details
                          </button>
                          <button className="text-blue-400 hover:text-blue-300 hover:underline">
                            Quick Response
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'comments' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-light mb-4">Discussion</h2>

                  {/* New Comment Form */}
                  <div className="bg-zinc-900 p-4 rounded mb-6">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts on this topic..."
                      className="w-full bg-zinc-800 border border-zinc-600 rounded p-3 text-white resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handlePostComment}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        Post Comment
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comments Feed */}
                <div className="space-y-6">
                  {comments.map(comment => (
                    <div key={comment.id} className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-xs">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.author}</span>
                            <span className="text-xs text-zinc-500">{comment.timestamp}</span>
                          </div>
                          <p className="text-zinc-300 text-sm">{comment.content}</p>
                          <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                            <button
                              onClick={() => setReplyingTo(comment.id)}
                              className="hover:text-white flex items-center gap-1"
                            >
                              <MessageCircle size={12} />
                              Reply
                            </button>
                            <button className="hover:text-white flex items-center gap-1">
                              <Star size={12} />
                              Like ({comment.likes})
                            </button>
                          </div>

                          {/* Reply form */}
                          {replyingTo === comment.id && (
                            <div className="mt-3 p-3 bg-zinc-900 rounded">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a reply..."
                                className="w-full bg-zinc-800 border border-zinc-600 rounded p-2 text-white resize-none text-sm"
                                rows={2}
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={() => setReplyingTo(null)}
                                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handlePostReply(comment.id)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="ml-11 flex gap-3">
                          <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center text-xs">
                            {reply.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{reply.author}</span>
                              <span className="text-xs text-zinc-500">{reply.timestamp}</span>
                            </div>
                            <p className="text-zinc-300 text-sm">{reply.content}</p>
                            <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                              <button className="hover:text-white flex items-center gap-1">
                                <Star size={10} />
                                Like ({reply.likes})
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Related Links and Media */}
        <div className="w-80 bg-zinc-950 p-4 overflow-y-auto" style={{ paddingTop: '60px' }}>
          {/* Info Box */}
          {(node.props?.birthDate || node.props?.deathDate || node.props?.pages || node.props?.duration) && (
            <div className="mb-6">
              <h3 className="font-bold text-zinc-300 mb-3">Quick Facts</h3>
              <table className="w-full text-sm">
                <tbody>
                  {node.props?.birthDate && (
                    <tr>
                      <td className="text-zinc-500 pr-3 py-1">Born</td>
                      <td className="text-white">{node.props.birthDate}</td>
                    </tr>
                  )}
                  {node.props?.deathDate && (
                    <tr>
                      <td className="text-zinc-500 pr-3 py-1">Died</td>
                      <td className="text-white">{node.props.deathDate}</td>
                    </tr>
                  )}
                  {node.props?.pages && (
                    <tr>
                      <td className="text-zinc-500 pr-3 py-1">Pages</td>
                      <td className="text-white">{node.props.pages}</td>
                    </tr>
                  )}
                  {node.props?.location && (
                    <tr>
                      <td className="text-zinc-500 pr-3 py-1">Location</td>
                      <td className="text-white">{node.props.location}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Related Nodes */}
          <div className="mb-6">
            <h3 className="font-bold text-zinc-300 mb-3">Related Topics</h3>
            <ul className="space-y-2 text-sm">
              {mockConnections.map(conn => (
                <li key={conn.id}>
                  <button
                    onClick={() => onNavigate('node', { id: conn.id, label: conn.label })}
                    className="text-blue-400 hover:text-blue-300 hover:underline block"
                  >
                    {conn.label}
                  </button>
                  <span className="text-zinc-500 text-xs">({conn.type})</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Media Links */}
          <div>
            <h3 className="font-bold text-zinc-300 mb-3">Media</h3>
            <div className="space-y-2 text-sm">
              {node.props?.url && (
                <a
                  href={node.props.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline block"
                >
                  View Original Source
                </a>
              )}
              <button
                onClick={() => setShowImageGallery(true)}
                className="text-blue-400 hover:text-blue-300 hover:underline block"
              >
                Image Gallery (12)
              </button>
              <button
                onClick={() => setShowVideoArchive(true)}
                className="text-blue-400 hover:text-blue-300 hover:underline block"
              >
                Video Archive (5)
              </button>
              <button className="text-blue-400 hover:text-blue-300 hover:underline block">
                Audio Recordings (3)
              </button>
              <button className="text-blue-400 hover:text-blue-300 hover:underline block">
                Documents (24)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* New Inquiry Modal */}
      {showNewInquiryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Create New Inquiry</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-2">Title</label>
                <input
                  type="text"
                  value={inquiryForm.title}
                  onChange={(e) => setInquiryForm({...inquiryForm, title: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded p-3 text-white"
                  placeholder="Enter inquiry title..."
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-2">Description</label>
                <textarea
                  value={inquiryForm.description}
                  onChange={(e) => setInquiryForm({...inquiryForm, description: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded p-3 text-white resize-none"
                  rows={4}
                  placeholder="Describe what you want to investigate..."
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-2">Methodology</label>
                <select
                  value={inquiryForm.methodology}
                  onChange={(e) => setInquiryForm({...inquiryForm, methodology: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded p-3 text-white"
                >
                  <option value="Scientific Method">Scientific Method</option>
                  <option value="Legal Discovery">Legal Discovery</option>
                  <option value="Historical Analysis">Historical Analysis</option>
                  <option value="Toulmin Argumentation">Toulmin Argumentation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-2">Priority</label>
                <select
                  value={inquiryForm.priority}
                  onChange={(e) => setInquiryForm({...inquiryForm, priority: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded p-3 text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewInquiryModal(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInquiry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                Create Inquiry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-4xl h-3/4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Image Gallery</h3>
              <button
                onClick={() => setShowImageGallery(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {/* Mock images */}
              {Array.from({length: 12}, (_, i) => (
                <div key={i} className="aspect-square bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center">
                  <div className="text-center text-zinc-500">
                    <Image size={32} className="mx-auto mb-2" />
                    <p className="text-xs">Image {i + 1}</p>
                    <p className="text-xs">Evidence photo</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Archive Modal */}
      {showVideoArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-4xl h-3/4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Video Archive</h3>
              <button
                onClick={() => setShowVideoArchive(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              {/* Mock videos */}
              {Array.from({length: 5}, (_, i) => (
                <div key={i} className="border border-zinc-700 rounded p-4">
                  <div className="flex gap-4">
                    <div className="w-32 h-20 bg-zinc-800 rounded flex items-center justify-center">
                      <Video size={24} className="text-zinc-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">Video Evidence {i + 1}</h4>
                      <p className="text-sm text-zinc-400 mb-2">
                        {i === 0 && "Zapruder film - Frame by frame analysis"}
                        {i === 1 && "Dealey Plaza reconstruction - 3D animation"}
                        {i === 2 && "Witness interview compilation"}
                        {i === 3 && "Ballistics demonstration video"}
                        {i === 4 && "Medical examination documentation"}
                      </p>
                      <div className="flex gap-2 text-xs text-zinc-500">
                        <span>Duration: {Math.floor(Math.random() * 20) + 5}:30</span>
                        <span>•</span>
                        <span>1963-{(Math.random() * 11 + 1).toFixed(0).padStart(2, '0')}-{(Math.random() * 28 + 1).toFixed(0).padStart(2, '0')}</span>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                      Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Sidebar Component
function EnhancedSidebar({ selectedItem, onClose }: { selectedItem: any, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarStack, setSidebarStack] = useState<string[]>(['main']);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const nodeData = selectedItem.data?.data || {};
  const isNode = selectedItem.type === 'node';

  // Detect node type for icon
  const nodeType = isNode ? detectNodeType(nodeData.props || {}, nodeData.meta) : null;
  const typeInfo = nodeType ? (SCHEMA_NODE_TYPES[nodeType] || SCHEMA_NODE_TYPES['Thing']) : null;
  const IconComponent = typeInfo?.icon;

  // Mock data for demonstration
  const mockClaims = [
    { id: 1, text: "Lee Harvey Oswald acted alone in the assassination", credibility: 0.65, section: "conclusion" },
    { id: 2, text: "Three shots were fired from the sixth floor", credibility: 0.85, section: "timeline" },
    { id: 3, text: "No credible evidence of conspiracy", credibility: 0.45, section: "analysis" }
  ];

  const mockInquiries = [
    { id: 1, title: "Dispute: Single Bullet Theory", status: "active", author: "forensics_expert", date: "2024-11-01" },
    { id: 2, title: "Evidence Challenge: Trajectory Analysis", status: "resolved", author: "ballistics_pro", date: "2024-10-15" }
  ];

  const mockSupport = [
    { id: 1, title: "Additional Ballistics Evidence", author: "researcher_a", date: "2024-11-03" },
    { id: 2, title: "Witness Testimony Corroboration", author: "historian_b", date: "2024-10-28" }
  ];

  const mockComments = [
    { id: 1, author: "expert_user", text: "The trajectory analysis seems inconsistent", date: "2024-11-04" },
    { id: 2, author: "researcher_c", text: "Additional evidence needed", date: "2024-11-02" }
  ];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const navigateToInquiry = (inquiryId: number) => {
    setSidebarStack([...sidebarStack, `inquiry-${inquiryId}`]);
  };

  const navigateBack = () => {
    if (sidebarStack.length > 1) {
      setSidebarStack(sidebarStack.slice(0, -1));
    }
  };

  const currentView = sidebarStack[sidebarStack.length - 1];

  return (
    <div className="absolute top-0 right-0 h-full w-[90%] bg-black shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 border-l" style={{ borderLeftWidth: '0.6px', borderColor: '#3f3f46' }}>
      {/* Header */}
      <div className="sticky top-0 bg-black border-b p-4 flex items-center justify-between" style={{ borderBottomWidth: '0.6px', borderColor: '#3f3f46' }}>
        <div className="flex items-center gap-3">
          {/* Back navigation for sub-views */}
          {sidebarStack.length > 1 && (
            <button
              onClick={navigateBack}
              className="text-zinc-400 hover:text-white transition-colors p-1"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
          )}

          {/* Node Type Icon */}
          {isNode && IconComponent && (
            <IconComponent size={18} className="text-zinc-400" />
          )}

          {/* Node Name */}
          <h2 className="text-xl font-bold text-white font-sans">
            {nodeData.label || 'Untitled'}
          </h2>

        </div>

        {/* Kebab Menu and Close */}
        <div className="flex items-center gap-2">
          <button
            className="text-zinc-400 hover:text-white transition-colors p-1"
            onClick={() => {
              // TODO: Open kebab menu
              console.log('Open kebab menu');
            }}
          >
            <MoreVertical size={18} />
          </button>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {currentView === 'main' && (
          <>
            {/* Stats Section */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-white font-sans">Stats</h3>

              {/* Credibility Score */}
              <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Credibility Score</span>
                  <span className="text-lg font-bold text-white">
                    {((nodeData.credibility || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Claims Dropdown */}
              <div className="bg-zinc-800 rounded-lg">
                <button
                  onClick={() => toggleSection('claims')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-700 transition-colors"
                >
                  <span className="text-white font-medium">Claims ({mockClaims.length})</span>
                  <ChevronRight
                    size={16}
                    className={`text-zinc-400 transition-transform ${expandedSections.has('claims') ? 'rotate-90' : ''}`}
                  />
                </button>
                {expandedSections.has('claims') && (
                  <div className="border-t border-zinc-700 p-4 space-y-3">
                    {mockClaims.map((claim) => (
                      <div key={claim.id} className="p-3 bg-zinc-900 rounded border border-zinc-600">
                        <p className="text-sm text-white mb-2">{claim.text}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Section: {claim.section}</span>
                          <span className="text-zinc-300">{(claim.credibility * 100).toFixed(0)}% credibility</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inquiries */}
              <div className="bg-zinc-800 rounded-lg">
                <button
                  onClick={() => toggleSection('inquiries')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-700 transition-colors"
                >
                  <span className="text-white font-medium">Inquiries ({mockInquiries.length})</span>
                  <ChevronRight
                    size={16}
                    className={`text-zinc-400 transition-transform ${expandedSections.has('inquiries') ? 'rotate-90' : ''}`}
                  />
                </button>
                {expandedSections.has('inquiries') && (
                  <div className="border-t border-zinc-700 p-4 space-y-3">
                    {mockInquiries.map((inquiry) => (
                      <button
                        key={inquiry.id}
                        onClick={() => navigateToInquiry(inquiry.id)}
                        className="w-full p-3 bg-zinc-900 rounded border border-zinc-600 hover:bg-zinc-800 transition-colors text-left"
                      >
                        <p className="text-sm text-white font-medium">{inquiry.title}</p>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-zinc-400">by {inquiry.author}</span>
                          <span className={`px-2 py-1 rounded ${inquiry.status === 'active' ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200'}`}>
                            {inquiry.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Support */}
              <div className="bg-zinc-800 rounded-lg">
                <button
                  onClick={() => toggleSection('support')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-700 transition-colors"
                >
                  <span className="text-white font-medium">Support ({mockSupport.length})</span>
                  <ChevronRight
                    size={16}
                    className={`text-zinc-400 transition-transform ${expandedSections.has('support') ? 'rotate-90' : ''}`}
                  />
                </button>
                {expandedSections.has('support') && (
                  <div className="border-t border-zinc-700 p-4 space-y-3">
                    {mockSupport.map((support) => (
                      <div key={support.id} className="p-3 bg-zinc-900 rounded border border-zinc-600">
                        <p className="text-sm text-white font-medium">{support.title}</p>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-zinc-400">by {support.author}</span>
                          <span className="text-zinc-400">{support.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="bg-zinc-800 rounded-lg">
                <button
                  onClick={() => toggleSection('comments')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle size={16} className="text-zinc-400" />
                    <span className="text-white font-medium">Comments ({mockComments.length})</span>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-zinc-400 transition-transform ${expandedSections.has('comments') ? 'rotate-90' : ''}`}
                  />
                </button>
                {expandedSections.has('comments') && (
                  <div className="border-t border-zinc-700 p-4 space-y-3">
                    {mockComments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-zinc-900 rounded border border-zinc-600">
                        <p className="text-sm text-white">{comment.text}</p>
                        <div className="flex items-center justify-between text-xs mt-2">
                          <span className="text-zinc-400">by {comment.author}</span>
                          <span className="text-zinc-400">{comment.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edges */}
              <div className="bg-zinc-800 rounded-lg">
                <button
                  onClick={() => toggleSection('edges')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GitBranch size={16} className="text-zinc-400" />
                    <span className="text-white font-medium">Connections (3)</span>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-zinc-400 transition-transform ${expandedSections.has('edges') ? 'rotate-90' : ''}`}
                  />
                </button>
                {expandedSections.has('edges') && (
                  <div className="border-t border-zinc-700 p-4 space-y-3">
                    <div className="p-3 bg-zinc-900 rounded border border-zinc-600">
                      <p className="text-sm text-white">Connected to: Zapruder Film</p>
                      <p className="text-xs text-zinc-400">Relationship: supports</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Wiki Tab */}
            <div className="border-t border-zinc-700 pt-6">
              <h3 className="text-lg font-semibold text-white font-sans mb-4">Wiki</h3>
              <div className="bg-zinc-800 rounded-lg p-4">
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-zinc-300 mb-4">
                    The Warren Commission Report was the official investigation into the assassination of President John F. Kennedy.
                  </p>
                  <p className="text-zinc-300">
                    <span className="bg-yellow-900/30 px-1 rounded cursor-pointer hover:bg-yellow-900/50" title="Claim: credibility 65%">
                      The commission concluded that Lee Harvey Oswald acted alone
                    </span> in the assassination of President Kennedy on November 22, 1963.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Inquiry Detail View */}
        {currentView.startsWith('inquiry-') && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white font-sans">Dispute: Single Bullet Theory</h3>
            <div className="bg-zinc-800 rounded-lg p-4">
              <p className="text-zinc-300 mb-4">
                This formal inquiry challenges the single bullet theory presented in the Warren Commission Report.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">Status: <span className="text-yellow-200">Active</span></p>
                <p className="text-sm text-zinc-400">Submitted by: forensics_expert</p>
                <p className="text-sm text-zinc-400">Date: November 1, 2024</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Calculate graph outline color with electric gradients
function getGraphElectricColor(graphId: string, index: number) {
  const colors = [
    { primary: '#00ffff', secondary: '#0080ff' }, // Cyan
    { primary: '#ff00ff', secondary: '#ff0080' }, // Magenta
    { primary: '#00ff00', secondary: '#00ff80' }, // Lime
    { primary: '#ffff00', secondary: '#ff8000' }, // Yellow-Orange
    { primary: '#ff00aa', secondary: '#aa00ff' }, // Pink-Purple
    { primary: '#00ff80', secondary: '#00ffff' }, // Aqua
  ];

  const colorSet = colors[index % colors.length];
  return {
    gradient: `linear-gradient(135deg, ${colorSet.primary}, ${colorSet.secondary})`,
    glow: colorSet.primary,
  };
}

function HomeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [selectedGraphs, setSelectedGraphs] = useState<Set<string>>(new Set()); // Will be initialized with Level 0 graphs
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showGraphSearch, setShowGraphSearch] = useState(false);
  const [graphSearchQuery, setGraphSearchQuery] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [sourceNodeForConnection, setSourceNodeForConnection] = useState<any>(null);
  const [targetNodeForConnection, setTargetNodeForConnection] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<'graph' | 'node'>('graph');
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; page: string; data?: any }[]>([
    { label: 'Graph', page: 'graph' }
  ]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Function to recalculate edge handles based on node positions
  const recalculateEdgeHandles = (currentNodes: Node[], currentEdges: Edge[]) => {
    const nodeMap = new Map(currentNodes.map(n => [n.id, n]));

    return currentEdges.map(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) return edge;

      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;

      let sourceHandle = 'right';
      let targetHandle = 'target-left';

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal connection
        if (dx > 0) {
          sourceHandle = 'right';
          targetHandle = 'target-left';
        } else {
          sourceHandle = 'left';
          targetHandle = 'target-right';
        }
      } else {
        // Vertical connection
        if (dy > 0) {
          sourceHandle = 'bottom';
          targetHandle = 'target-top';
        } else {
          sourceHandle = 'top';
          targetHandle = 'target-bottom';
        }
      }

      return {
        ...edge,
        sourceHandle,
        targetHandle,
      };
    });
  };

  // Custom handler for node changes that recalculates edges
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);

    // Check if any nodes have moved (position changed)
    const hasPositionChange = changes.some((change: any) =>
      change.type === 'position'
    );

    if (hasPositionChange) {
      // Get the latest nodes with their new positions
      setNodes(currentNodes => {
        // Recalculate edge handles with updated node positions
        setEdges(currentEdges => recalculateEdgeHandles(currentNodes, currentEdges));
        return currentNodes;
      });
    }
  }, [onNodesChange, setNodes, setEdges]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });

  // Fetch all graphs
  const { data: graphsData, loading: graphsLoading } = useQuery(GET_ALL_GRAPHS);

  // Filter graphs based on search
  const filteredGraphs = useMemo(() => {
    if (!graphsData?.graphs) return [];

    return graphsData.graphs.filter((graph: any) => {
      // Always show public graphs and user's own graphs
      const searchMatch = !graphSearchQuery ||
        graph.name.toLowerCase().includes(graphSearchQuery.toLowerCase()) ||
        (graph.description && graph.description.toLowerCase().includes(graphSearchQuery.toLowerCase()));

      return searchMatch && (graph.privacy === 'public' || graph.level === 0);
    });
  }, [graphsData, graphSearchQuery]);

  // Auto-select Level 0 graphs on initial load (fully credible layer only)
  useEffect(() => {
    if (!graphsData?.graphs) return;

    // Only initialize once when graphs first load
    if (selectedGraphs.size === 0) {
      const level0Graphs = graphsData.graphs.filter((g: any) => g.level === 0);
      if (level0Graphs.length > 0) {
        const newSelection = new Set(level0Graphs.map((g: any) => g.id));
        setSelectedGraphs(newSelection);
        console.log('Auto-selected Level 0 graphs:', level0Graphs.map(g => g.name));
      }
    }
  }, [graphsData, selectedGraphs.size]);

  // Process graph data when selection changes
  useEffect(() => {
    if (!graphsData?.graphs) return;

    console.log('Processing graphs:', graphsData.graphs.length, 'Selected:', selectedGraphs.size);

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    const nodeIdMap = new Map<string, boolean>(); // Track unique nodes
    const edgeIdMap = new Map<string, boolean>(); // Track unique edges

    // Process ALL graphs - always show Level 0 nodes, only show Level 1 nodes from selected graphs
    graphsData.graphs.forEach((graph: any, graphIndex: number) => {
      const isGraphSelected = selectedGraphs.has(graph.id);
      console.log(`Graph ${graph.name}: Selected=${isGraphSelected}, Nodes=${graph.nodes?.length || 0}`);

      // Process nodes
      graph.nodes?.forEach((node: any, index: number) => {
        // Level 0: Immutable fully credible layer (credibility = 1.0)
        // Level 1: User workspace where all nodes have credibility scores (0.0=no credibility to 1.0=fully credible)
        // Theory nodes are special containers that group related evidence

        // Parse meta to check node type
        const parsedMeta = typeof node.meta === 'string' ? JSON.parse(node.meta) : node.meta;
        const schemaType = parsedMeta?.schema_type || '';

        // Filter out Theory nodes - they should be shown differently, not as regular nodes
        if (schemaType === 'Theory') {
          console.log('Filtering out Theory node:', node.props);
          return;
        }

        if (node.is_level_0) {
          // Always show Level 0 nodes (immutable fully credible nodes with credibility = 1.0)
        } else {
          // Level 1 nodes - show based on graph selection
          if (!isGraphSelected) return; // Only show if graph is selected
        }

        if (nodeIdMap.has(node.id)) return; // Skip duplicates
        nodeIdMap.set(node.id, true);

        const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
        const meta = parsedMeta;
        const createdAt = new Date(node.created_at).toLocaleDateString();

        // Simple grid positioning
        const nodeType = detectNodeType(props, meta);
        const nodeIndex = allNodes.length;
        const columns = 8;
        const columnWidth = 250;
        const rowHeight = 120;
        const startX = 100;
        const startY = 100;

        const col = nodeIndex % columns;
        const row = Math.floor(nodeIndex / columns);
        const xPosition = startX + (col * columnWidth);
        const yPosition = startY + (row * rowHeight)

        // Get credibility score (0=no credibility, 1=fully credible) from meta field
        const credibility = meta?.credibility_score || (node.is_level_0 ? 1.0 : 0.0);
        allNodes.push({
          id: node.id,
          type: 'credibilityNode',
          position: { x: xPosition, y: yPosition },
          data: {
            label: props.title || props.name || `Node ${node.id}`,
            isLevel0: node.is_level_0,
            credibility,
            props,
            meta,
            createdAt,
            graphName: graph.name,
            onConnectionClick: handleOpenConnectionModal,
            onConnectionDrop: handleConnectionDrop,
            nodeType,
          },
          style: {
            zIndex: Math.round(credibility * 1000), // Higher credibility = higher z-index
          },
        });
      });

      // Function to determine best handles for edge connection
      const getBestHandles = (sourceNode: any, targetNode: any) => {
        if (!sourceNode || !targetNode) return { sourceHandle: 'right', targetHandle: 'left' };

        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;

        // Determine which sides are closest
        let sourceHandle = 'right';
        let targetHandle = 'left';

        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal connection
          if (dx > 0) {
            sourceHandle = 'right';
            targetHandle = 'target-left';
          } else {
            sourceHandle = 'left';
            targetHandle = 'target-right';
          }
        } else {
          // Vertical connection
          if (dy > 0) {
            sourceHandle = 'bottom';
            targetHandle = 'target-top';
          } else {
            sourceHandle = 'top';
            targetHandle = 'target-bottom';
          }
        }

        return { sourceHandle, targetHandle };
      };

      // Process edges
      graph.edges?.forEach((edge: any) => {
        // Check if both source and target nodes exist
        const sourceId = edge.from?.id || edge.from_id;
        const targetId = edge.to?.id || edge.to_id;

        if (!nodeIdMap.has(sourceId) || !nodeIdMap.has(targetId)) {
          console.log('Skipping edge - missing node:', sourceId, '->', targetId);
          return;
        }

        // Always show Level 0 edges, only show Level 1 edges if graph is selected
        if (!edge.is_level_0 && !isGraphSelected) return;
        if (edgeIdMap.has(edge.id)) return; // Skip duplicates
        edgeIdMap.set(edge.id, true);

        const props = typeof edge.props === 'string' ? JSON.parse(edge.props) : edge.props;

        // Get edge credibility score (0=no credibility, 1=fully credible) from meta field
        const edgeMeta = typeof edge.meta === 'string' ? JSON.parse(edge.meta) : edge.meta;
        const edgeCredibility = edgeMeta?.credibility_score || (edge.is_level_0 ? 1.0 : 0.0);

        // Updated credibility styling:
        // Solid 0.5px lines for all
        // Opacity: 100% at credibility=0 (no credibility), fading to 10% at credibility=1 (fully credible)
        const stroke = '#ffffff';
        let opacity = 1;

        // Calculate opacity: 100% at credibility=0 (no credibility), fading to 10% at credibility=1 (fully credible)
        if (edgeCredibility <= 0.1) {
          // Full opacity for low credibility (0 to 0.1)
          opacity = 1.0;
        } else if (edgeCredibility >= 0.9) {
          // 10% opacity for high credibility (0.9 to 1.0)
          opacity = 0.1;
        } else {
          // Linear fade from 100% (credibility=0.1) to 10% (credibility=0.9)
          opacity = 1.0 - ((edgeCredibility - 0.1) / 0.8) * 0.9;
        }

        // Find the source and target nodes to determine handle positions
        const sourceNode = allNodes.find(n => n.id === sourceId);
        const targetNode = allNodes.find(n => n.id === targetId);
        const { sourceHandle, targetHandle } = getBestHandles(sourceNode, targetNode);

        allEdges.push({
          id: edge.id,
          source: sourceId,
          target: targetId,
          sourceHandle,
          targetHandle,
          type: 'credibilityEdge', // Use custom edge type
          animated: false,
          style: {
            stroke,
            strokeWidth: 0.5, // Thin solid lines
            opacity,
          },
          // Markers will be handled by the custom edge component
          markerEnd: undefined,
          markerStart: undefined,
          data: {
            label: props.relationship || props.label || '',
            props,
            isLevel0: edge.is_level_0,
            credibility: edgeCredibility,
          },
        });
      });
    });

    console.log(`Total nodes: ${allNodes.length}, Total edges: ${allEdges.length}`);
    setNodes(allNodes);
    setEdges(allEdges);
  }, [graphsData, selectedGraphs, setNodes, setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Navigate to node page
    setCurrentNode(node.data);
    setCurrentPage('node');
    setBreadcrumbs([
      { label: 'Graph', page: 'graph' },
      { label: node.data.label, page: 'node', data: node.data }
    ]);
  }, []);

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedItem({ type: 'edge', data: edge });
    setShowSidebar(true);
  }, []);

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiInput.trim()) {
      // TODO: Handle AI interaction
      console.log('AI Input:', aiInput);
      setAiInput('');
    }
  };

  const handleOpenConnectionModal = (sourceNode: any) => {
    setSourceNodeForConnection(sourceNode);
    setTargetNodeForConnection(null); // Clear any previous target
    setShowConnectionModal(true);
  };

  const handleConnectionDrop = (sourceNode: any, targetNode: any) => {
    setSourceNodeForConnection(sourceNode);
    setTargetNodeForConnection(targetNode);
    setShowConnectionModal(true);
  };

  const handleCreateConnection = (sourceId: string, targetId: string, edgeType: string, description?: string) => {
    // TODO: Implement GraphQL mutation to create edge
    console.log('Creating connection:', {
      sourceId,
      targetId,
      edgeType,
      description
    });

    // For now, just close the modal and show a success message
    setShowConnectionModal(false);
    setSourceNodeForConnection(null);

    // In a real implementation, this would call a GraphQL mutation
    // and update the edges state to reflect the new connection
  };

  const navigateToPage = (page: string, data?: any) => {
    if (page === 'graph') {
      setCurrentPage('graph');
      setCurrentNode(null);
      setBreadcrumbs([{ label: 'Graph', page: 'graph' }]);
    } else if (page === 'node' && data) {
      setCurrentNode(data);
      setCurrentPage('node');
      setBreadcrumbs([
        { label: 'Graph', page: 'graph' },
        { label: data.label, page: 'node', data }
      ]);
    }
  };

  const toggleGraph = (graphId: string) => {
    setSelectedGraphs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(graphId)) {
        newSet.delete(graphId);
      } else {
        newSet.add(graphId);
      }
      return newSet;
    });
  };


  // Conditional page rendering
  if (currentPage === 'node' && currentNode) {
    return (
      <NodePage
        node={currentNode}
        breadcrumbs={breadcrumbs}
        onNavigate={navigateToPage}
      />
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* Parallax Starfield Background - z-0 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Starfield viewport={viewport} />
      </div>

      {/* Main Graph Canvas - z-10 */}
      <div className="absolute inset-0 z-10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={() => {
            setSelectedItem(null);
            setShowSidebar(false);
          }}
          onViewportChange={setViewport}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
          className="bg-transparent"
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          maxZoom={4}
          panOnDrag={true}
          panOnScroll={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          preventScrolling={false}
        >
        </ReactFlow>
      </div>

      {/* User FAB - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => session ? setShowUserMenu(!showUserMenu) : setShowLoginDialog(true)}
          className="flex items-center justify-center w-10 h-10 bg-white hover:bg-zinc-100 text-black rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        >
          {session?.user ? <User size={18} /> : <LogIn size={18} />}
        </button>

        {/* User Menu Dropdown */}
        {showUserMenu && session && (
          <div className="absolute right-0 mt-2 w-64 bg-black shadow-xl border overflow-hidden" style={{ borderWidth: '0.6px', borderColor: '#3f3f46', borderRadius: '4px' }}>
            <div className="p-4 border-b" style={{ borderBottomWidth: '0.6px', borderColor: '#3f3f46' }}>
              <p className="font-semibold text-white font-sans">{session.user?.email}</p>
              <p className="text-sm text-zinc-400 font-sans">{session.user?.name}</p>
            </div>
            <div className="p-2">
              <button
                onClick={async () => {
                  await signOut({ redirect: false });
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-zinc-800 rounded text-zinc-400 font-sans"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unified Input Field - Bottom Center */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-2xl px-4">
        <div className="bg-black/95 backdrop-blur-sm shadow-xl" style={{ border: '0.6px solid #3f3f46', borderRadius: '4px' }}>
          {/* Graph Search Results - Shows above input when in graph search mode */}
          {showGraphSearch && (
            <div className="border-b" style={{ borderBottomWidth: '0.6px', borderColor: '#3f3f46' }}>
              <div className="p-3">
                {/* Graph List */}
                <div className="max-h-60 overflow-y-auto">
                  {graphsLoading ? (
                    <div className="text-zinc-400 text-sm py-2 font-sans">
                      Loading graphs...
                    </div>
                  ) : filteredGraphs.length === 0 ? (
                    <div className="text-zinc-400 text-sm py-2 font-sans">
                      No graphs found
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredGraphs.map((graph: any) => (
                        <label
                          key={graph.id}
                          className="flex items-start gap-2 p-2 hover:bg-zinc-800 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedGraphs.has(graph.id)}
                            onChange={() => toggleGraph(graph.id)}
                            className="mt-0.5 border-zinc-600 bg-zinc-800 text-white focus:ring-zinc-500"
                            style={{ borderRadius: '4px' }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-medium font-sans">
                                {graph.name}
                              </span>
                              {graph.privacy === 'public' && (
                                <Globe size={12} className="text-zinc-400" />
                              )}
                            </div>
                            {graph.description && (
                              <p className="text-xs text-zinc-500 mt-0.5 font-sans">
                                {graph.description}
                              </p>
                            )}
                            <p className="text-xs text-zinc-600 mt-0.5 font-sans">
                              {graph.nodes?.length || 0} nodes • {graph.edges?.length || 0} edges
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Unified Input Section */}
          <div className="border-b" style={{ borderBottomWidth: '0.6px', borderColor: '#3f3f46' }}>
            <div className="flex items-center gap-2 px-4 py-3">
              {/* Input field that adapts based on mode */}
              {showGraphSearch ? (
                <input
                  type="text"
                  value={graphSearchQuery}
                  onChange={(e) => setGraphSearchQuery(e.target.value)}
                  placeholder="Search available graphs..."
                  className="flex-1 bg-transparent text-zinc-700 font-light placeholder-zinc-700 focus:outline-none font-sans"
                  autoFocus
                />
              ) : (
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAiSubmit(e as any);
                    }
                  }}
                  placeholder="Discover truth..."
                  className="flex-1 bg-transparent resize-none focus:outline-none text-zinc-700 font-light placeholder-zinc-700 font-sans"
                  style={{
                    minHeight: '24px',
                    maxHeight: '200px',
                  }}
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                  }}
                />
              )}

              {/* Action button for search mode only */}
              {showGraphSearch && (
                <button
                  className="p-1.5 text-zinc-700 hover:text-zinc-500 transition-colors"
                  title="Search"
                >
                  <Search size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Action Section */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              {/* AI Mode Toggle */}
              <button
                onClick={() => {
                  setShowGraphSearch(false);
                  setGraphSearchQuery('');
                }}
                className={`transition-colors ${
                  !showGraphSearch ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="AI Assistant"
              >
                <Sparkles size={14} />
              </button>

              {/* Graph Search Toggle */}
              <button
                onClick={() => setShowGraphSearch(true)}
                className={`transition-colors ${
                  showGraphSearch ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Search graphs"
              >
                <Network size={14} />
              </button>

              <div className="ml-2 font-mono" style={{ fontSize: '8px', color: '#d4d4d8' }}>
                {selectedGraphs.size} graph{selectedGraphs.size !== 1 ? 's' : ''} active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Details Sidebar */}
      {showSidebar && selectedItem && (
        <EnhancedSidebar
          selectedItem={selectedItem}
          onClose={() => setShowSidebar(false)}
        />
      )}

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={showConnectionModal}
        onClose={() => {
          setShowConnectionModal(false);
          setSourceNodeForConnection(null);
          setTargetNodeForConnection(null);
        }}
        sourceNode={sourceNodeForConnection}
        targetNode={targetNodeForConnection}
        availableNodes={nodes}
        onCreateConnection={handleCreateConnection}
      />

      {/* Login Dialog */}
      <LoginDialog isOpen={showLoginDialog} onClose={() => setShowLoginDialog(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <HomeContent />
    </ReactFlowProvider>
  );
}

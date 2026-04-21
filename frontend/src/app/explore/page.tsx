"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { SEARCH_NODES } from '@/graphql/queries/activity';
import { FileText, AlertTriangle, User, Shield, Target, Brain, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface NodeData {
  id: string;
  title: string;
  type: string;
  relevance: number;
  x: number;
  y: number;
}

const NODE_TYPES = [
  { value: 'ARTICLE', label: 'Articles', icon: FileText, color: 'bg-blue-500' },
  { value: 'CLAIM', label: 'Claims', icon: Target, color: 'bg-purple-500' },
  { value: 'CHALLENGE', label: 'Challenges', icon: AlertTriangle, color: 'bg-orange-500' },
  { value: 'EVIDENCE', label: 'Evidence', icon: Shield, color: 'bg-green-500' },
  { value: 'THEORY', label: 'Theories', icon: Brain, color: 'bg-indigo-500' },
  { value: 'PERSON', label: 'People', icon: User, color: 'bg-pink-500' },
];

export default function ExplorePage() {
  const router = useRouter();
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(
    new Set(NODE_TYPES.map(t => t.value))
  );
  const [showFilters, setShowFilters] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Query to fetch all nodes
  const { data, loading } = useQuery(SEARCH_NODES, {
    variables: { query: '', limit: 1000 },
  });

  // Initialize canvas size
  useEffect(() => {
    const updateSize = () => {
      const canvas = document.getElementById('explore-canvas');
      if (canvas) {
        setCanvasSize({
          width: canvas.clientWidth,
          height: canvas.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Process nodes and assign random positions
  useEffect(() => {
    if (data?.searchNodes) {
      const processedNodes: NodeData[] = data.searchNodes.map((node: any, idx: number) => ({
        id: node.id,
        title: node.title,
        type: node.type || 'Other',
        relevance: node.relevance || 0.5,
        x: Math.random() * 100,
        y: Math.random() * 100,
      }));
      setNodes(processedNodes);
    }
  }, [data]);

  const handleTypeToggle = (type: string) => {
    const newTypes = new Set(visibleTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setVisibleTypes(newTypes);
  };

  const filteredNodes = nodes.filter(node => visibleTypes.has(node.type));
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const getNodeTypeIcon = (type: string) => {
    const nodeType = NODE_TYPES.find(t => t.value === type);
    if (nodeType) {
      return <nodeType.icon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getNodeTypeColor = (type: string) => {
    const nodeType = NODE_TYPES.find(t => t.value === type);
    return nodeType?.color || 'bg-gray-500';
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Filter Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-card border-r transform transition-transform duration-300 z-40 overflow-y-auto ${
          showFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(false)}
              className="lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Node Type Filters */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Node Types</h3>
            {NODE_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={type.value}
                  checked={visibleTypes.has(type.value)}
                  onCheckedChange={() => handleTypeToggle(type.value)}
                />
                <Label
                  htmlFor={type.value}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <div className={`w-3 h-3 rounded-full ${type.color}`} />
                  {type.label}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {nodes.filter(n => n.type === type.value).length}
                </span>
              </div>
            ))}
          </div>

          {/* Statistics */}
          <div className="space-y-2 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Total Nodes</div>
              <p className="text-2xl font-bold">{filteredNodes.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col lg:ml-80">
        {/* Header */}
        <header className="border-b bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-2xl font-bold">Explore Knowledge Graph</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredNodes.length} node{filteredNodes.length !== 1 ? 's' : ''} visible
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </header>

        {/* Canvas */}
        <div
          id="explore-canvas"
          className="flex-1 relative overflow-hidden bg-background"
          onClick={() => setSelectedNodeId(null)}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">Loading knowledge graph...</p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">No nodes to display</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleTypes(new Set(NODE_TYPES.map(t => t.value)))}
                  className="mt-2"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* SVG Connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                {filteredNodes.map((node, i) => {
                  if (i === 0) return null;
                  const prev = filteredNodes[i - 1];
                  return (
                    <line
                      key={`${node.id}-${prev.id}`}
                      x1={`${prev.x}%`}
                      y1={`${prev.y}%`}
                      x2={`${node.x}%`}
                      y2={`${node.y}%`}
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {filteredNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                    selectedNodeId === node.id ? 'z-20' : 'z-10'
                  }`}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                  }}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all cursor-pointer ${getNodeTypeColor(node.type)} ${
                      selectedNodeId === node.id ? 'ring-2 ring-offset-2 ring-primary scale-125' : ''
                    }`}
                    title={node.title}
                  >
                    {getNodeTypeIcon(node.type)}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedNode && (
        <div className="absolute right-0 top-0 h-full w-96 bg-card border-l shadow-lg overflow-y-auto z-50">
          <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
            <h3 className="font-semibold">Node Details</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedNodeId(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <Badge className={`${getNodeTypeColor(selectedNode.type)} text-white mb-3`}>
                {selectedNode.type}
              </Badge>
              <h2 className="text-xl font-bold break-words">{selectedNode.title}</h2>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div>
                <div className="text-xs text-muted-foreground mb-1">ID</div>
                <p className="text-sm font-mono break-all">{selectedNode.id}</p>
              </div>

              {selectedNode.relevance && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Relevance</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${selectedNode.relevance * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(selectedNode.relevance * 100)}%
                    </span>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-muted-foreground mb-1">Position</div>
                <p className="text-sm">
                  ({Math.round(selectedNode.x)}%, {Math.round(selectedNode.y)}%)
                </p>
              </div>
            </div>

            <Button
              onClick={() => router.push(`/nodes/${selectedNode.id}`)}
              className="w-full"
            >
              View Details
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}

/**
 * Connectable Node Component
 *
 * Enhanced node with visible connection handles that appear on hover
 */

'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Quote, Link as LinkIcon, AlertCircle } from 'lucide-react';

export interface ConnectableNodeData {
  label: string;
  nodeType?: string;
  credibilityScore?: number;
  isTextBox?: boolean;
  content?: string;
}

const ConnectableNode: React.FC<NodeProps<ConnectableNodeData>> = ({ data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Get icon based on node type
  const getIcon = () => {
    switch (data.nodeType) {
      case 'Thesis':
        return <FileText className="w-4 h-4" />;
      case 'Citation':
        return <Quote className="w-4 h-4" />;
      case 'Reference':
        return <LinkIcon className="w-4 h-4" />;
      case 'Article':
        return <FileText className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Get color based on credibility score
  const getCredibilityColor = (score?: number) => {
    if (!score) return 'bg-gray-700 border-gray-600';
    if (score >= 0.8) return 'bg-green-900/30 border-green-600';
    if (score >= 0.6) return 'bg-yellow-900/30 border-yellow-600';
    if (score >= 0.4) return 'bg-orange-900/30 border-orange-600';
    return 'bg-red-900/30 border-red-600';
  };

  const showHandles = isHovered || selected;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 transition-all duration-200
        ${getCredibilityColor(data.credibilityScore)}
        ${selected ? 'ring-2 ring-blue-400 shadow-lg' : 'shadow-md'}
        ${isHovered ? 'shadow-xl scale-105' : ''}
        min-w-[150px] max-w-[300px]
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connection Handles - Visible on hover/select */}
      <>
        {/* Top Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className={`
            !w-3 !h-3 !bg-blue-500 !border-2 !border-white
            transition-all duration-200
            ${showHandles ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `}
          style={{ top: -6 }}
        />

        {/* Right Handle */}
        <Handle
          type="source"
          position={Position.Right}
          className={`
            !w-3 !h-3 !bg-blue-500 !border-2 !border-white
            transition-all duration-200
            ${showHandles ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `}
          style={{ right: -6 }}
        />

        {/* Bottom Handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          className={`
            !w-3 !h-3 !bg-blue-500 !border-2 !border-white
            transition-all duration-200
            ${showHandles ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `}
          style={{ bottom: -6 }}
        />

        {/* Left Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className={`
            !w-3 !h-3 !bg-blue-500 !border-2 !border-white
            transition-all duration-200
            ${showHandles ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `}
          style={{ left: -6 }}
        />
      </>

      {/* Node Content */}
      <div className="flex items-center gap-2 mb-1">
        <div className="text-gray-300">{getIcon()}</div>
        <div className="text-xs text-gray-400 uppercase tracking-wider">
          {data.nodeType || 'Node'}
        </div>
      </div>

      <div className="text-sm font-medium text-gray-100 mb-1">{data.label}</div>

      {data.content && (
        <div className="text-xs text-gray-400 line-clamp-2 mt-1">
          {data.content}
        </div>
      )}

      {data.credibilityScore !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          <div className="text-xs text-gray-500">Credibility:</div>
          <div className="text-xs font-semibold text-gray-300">
            {(data.credibilityScore * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectableNode;

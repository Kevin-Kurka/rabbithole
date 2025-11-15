import React, { useState, useEffect } from 'react';
import { Node } from '@/types/graph';
import { X, ChevronRight, ChevronDown, ExternalLink, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { gql, useQuery } from '@apollo/client';

interface NodeDetailsSidebarProps {
  node: Node | null;
  onClose: () => void;
  onDrillDown: (nodeId: string) => void;
}

const GET_NODE_DETAILS = gql`
  query GetNodeDetails($nodeId: ID!) {
    node(id: $nodeId) {
      id
      title
      type
      content
      veracity
      props
      created_at
      updated_at
      edges {
        id
        type
        weight
        target_node {
          id
          title
          type
        }
      }
      inquiries {
        id
        title
        status
        methodology
      }
    }
  }
`;

export const NodeDetailsSidebar: React.FC<NodeDetailsSidebarProps> = ({
  node,
  onClose,
  onDrillDown,
}) => {
  const router = useRouter();
  const [drilldownPath, setDrilldownPath] = useState<Node[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    properties: true,
    connections: false,
    inquiries: false,
  });

  const { data, loading, error } = useQuery(GET_NODE_DETAILS, {
    variables: { nodeId: node?.id },
    skip: !node?.id,
  });

  useEffect(() => {
    if (node) {
      setDrilldownPath([node]);
    }
  }, [node]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleDrillDown = (targetNodeId: string) => {
    const targetNode = data?.node.edges.find(
      (e: any) => e.target_node.id === targetNodeId
    )?.target_node;

    if (targetNode) {
      setDrilldownPath(prev => [...prev, targetNode]);
      onDrillDown(targetNodeId);
    }
  };

  const navigateBreadcrumb = (index: number) => {
    const targetNode = drilldownPath[index];
    setDrilldownPath(prev => prev.slice(0, index + 1));
    onDrillDown(targetNode.id);
  };

  if (!node) return null;

  const currentNode = drilldownPath[drilldownPath.length - 1];
  const nodeDetails = data?.node || currentNode;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Node Details</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Breadcrumb */}
      {drilldownPath.length > 1 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b">
          <div className="flex items-center text-sm">
            <Layers className="w-4 h-4 mr-2 text-gray-500" />
            <div className="flex items-center gap-1 overflow-x-auto">
              {drilldownPath.map((pathNode, index) => (
                <React.Fragment key={pathNode.id}>
                  {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                  <button
                    onClick={() => navigateBreadcrumb(index)}
                    className={`px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                      index === drilldownPath.length - 1
                        ? 'font-semibold text-blue-600'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {pathNode.title}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold">{nodeDetails.title}</h3>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
              {nodeDetails.type}
            </span>
            <span className="text-sm text-gray-500">
              Veracity: {(nodeDetails.veracity * 100).toFixed(1)}%
            </span>
          </div>
          {nodeDetails.content && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
              {nodeDetails.content}
            </p>
          )}
        </div>

        {/* Properties Section */}
        <div className="border-t pt-4">
          <button
            onClick={() => toggleSection('properties')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-semibold">Properties</h4>
            {expandedSections.properties ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSections.properties && nodeDetails.props && (
            <div className="mt-2 space-y-1 text-sm">
              {Object.entries(nodeDetails.props).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connections Section */}
        <div className="border-t pt-4">
          <button
            onClick={() => toggleSection('connections')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-semibold">
              Connections ({nodeDetails.edges?.length || 0})
            </h4>
            {expandedSections.connections ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSections.connections && nodeDetails.edges && (
            <div className="mt-2 space-y-2">
              {nodeDetails.edges.map((edge: any) => (
                <div
                  key={edge.id}
                  className="p-2 bg-gray-50 dark:bg-gray-900 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleDrillDown(edge.target_node.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{edge.target_node.title}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {edge.type} • Weight: {edge.weight.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inquiries Section */}
        {nodeDetails.inquiries && nodeDetails.inquiries.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={() => toggleSection('inquiries')}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="font-semibold">
                Inquiries ({nodeDetails.inquiries.length})
              </h4>
              {expandedSections.inquiries ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedSections.inquiries && (
              <div className="mt-2 space-y-2">
                {nodeDetails.inquiries.map((inquiry: any) => (
                  <div
                    key={inquiry.id}
                    className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded"
                  >
                    <div className="font-medium text-sm">{inquiry.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {inquiry.methodology} • {inquiry.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="border-t pt-4 space-y-2">
          <button
            onClick={() => router.push(`/nodes/${nodeDetails.id}`)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Details
          </button>
        </div>
      </div>
    </div>
  );
};
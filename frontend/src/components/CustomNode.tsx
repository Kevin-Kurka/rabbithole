import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface CustomNodeData {
  label: string;
  weight?: number;
}

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const weight = data.weight || 0;

  // Color coding based on veracity score (weight)
  const getColorByWeight = (w: number) => {
    if (w >= 1.0) return 'bg-green-500 border-green-700'; // Level 0 - verified
    if (w >= 0.7) return 'bg-lime-400 border-lime-600'; // High confidence
    if (w >= 0.4) return 'bg-yellow-400 border-yellow-600'; // Medium confidence
    if (w >= 0.1) return 'bg-orange-400 border-orange-600'; // Low confidence
    return 'bg-red-400 border-red-600'; // Provisional
  };

  return (
    <div
      className={`
        px-4 py-2 rounded-lg border-2 shadow-md min-w-[150px]
        ${getColorByWeight(weight)}
        ${selected ? 'ring-2 ring-blue-500' : ''}
        transition-all duration-200
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-600" />

      <div className="text-sm font-medium text-gray-900">
        {data.label || 'New Node'}
      </div>

      {weight >= 1.0 && (
        <div className="text-xs mt-1 font-bold text-white bg-green-700 px-2 py-0.5 rounded inline-block">
          ✓ Level 0
        </div>
      )}

      {weight > 0 && weight < 1.0 && (
        <div className="text-xs mt-1 text-gray-700">
          Veracity: {(weight * 100).toFixed(0)}%
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-600" />
    </div>
  );
}

export default memo(CustomNode);

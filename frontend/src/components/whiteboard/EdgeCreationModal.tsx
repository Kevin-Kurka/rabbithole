/**
 * Edge Creation Modal Component
 *
 * Modal dialog for specifying edge relationship details after drag-to-connect
 */

'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface EdgeCreationData {
  sourceNodeId: string;
  targetNodeId: string;
  sourceLabel?: string;
  targetLabel?: string;
}

export interface EdgeDetails {
  relationshipType: string;
  description?: string;
  properties?: Record<string, any>;
}

export interface EdgeCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: EdgeDetails) => void;
  edgeData?: EdgeCreationData;
}

const RELATIONSHIP_TYPES = [
  { value: 'supports', label: 'Supports', color: 'text-green-400' },
  { value: 'contradicts', label: 'Contradicts', color: 'text-red-400' },
  { value: 'related', label: 'Related To', color: 'text-blue-400' },
  { value: 'cites', label: 'Cites', color: 'text-purple-400' },
  { value: 'references', label: 'References', color: 'text-yellow-400' },
  { value: 'questions', label: 'Questions', color: 'text-orange-400' },
  { value: 'derives', label: 'Derives From', color: 'text-indigo-400' },
  { value: 'implies', label: 'Implies', color: 'text-cyan-400' },
];

const EdgeCreationModal: React.FC<EdgeCreationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  edgeData,
}) => {
  const [relationshipType, setRelationshipType] = useState('related');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(1.0);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      relationshipType,
      description: description || undefined,
      properties: {
        weight,
      },
    });

    // Reset form
    setRelationshipType('related');
    setDescription('');
    setWeight(1.0);
  };

  const handleCancel = () => {
    setRelationshipType('related');
    setDescription('');
    setWeight(1.0);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-md w-full pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100">Create Connection</h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Connection Info */}
            {edgeData && (
              <div className="bg-gray-800 rounded-lg p-3 text-sm">
                <div className="text-gray-400 mb-2">Connecting:</div>
                <div className="flex items-center gap-2">
                  <div className="text-gray-200 font-medium truncate">
                    {edgeData.sourceLabel || 'Source Node'}
                  </div>
                  <div className="text-gray-500">→</div>
                  <div className="text-gray-200 font-medium truncate">
                    {edgeData.targetLabel || 'Target Node'}
                  </div>
                </div>
              </div>
            )}

            {/* Relationship Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Relationship Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {RELATIONSHIP_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setRelationshipType(type.value)}
                    className={`
                      px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all
                      ${
                        relationshipType === type.value
                          ? `${type.color} border-current bg-current/10`
                          : 'text-gray-400 border-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this relationship..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            {/* Weight Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Relationship Strength: {weight.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Weak</span>
                <span>Strong</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-300 hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Connection
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EdgeCreationModal;

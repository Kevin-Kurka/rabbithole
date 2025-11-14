/**
 * Sticky Note Panel Component
 *
 * Panel for creating sticky notes and managing visibility
 */

'use client';

import React, { useState } from 'react';
import {
  StickyNote as StickyNoteIcon,
  Eye,
  EyeOff,
  Plus,
  X,
  Palette,
} from 'lucide-react';

export interface StickyNotePanelProps {
  visible: boolean;
  onToggleVisibility: () => void;
  onCreate: (data: {
    nodeId: string;
    content: string;
    style: { color: string; size: string };
  }) => void;
  selectedNodeId?: string | null;
}

const COLORS = [
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-200' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-200' },
  { value: 'green', label: 'Green', class: 'bg-green-200' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-200' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-200' },
];

const SIZES = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
];

const StickyNotePanel: React.FC<StickyNotePanelProps> = ({
  visible,
  onToggleVisibility,
  onCreate,
  selectedNodeId,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [selectedSize, setSelectedSize] = useState('medium');

  const handleCreate = () => {
    if (!content.trim()) {
      alert('Please enter some content for the sticky note');
      return;
    }

    if (!selectedNodeId) {
      alert('Please select a node first');
      return;
    }

    onCreate({
      nodeId: selectedNodeId,
      content: content.trim(),
      style: {
        color: selectedColor,
        size: selectedSize,
      },
    });

    // Reset form
    setContent('');
    setIsCreating(false);
  };

  return (
    <div className="fixed right-4 top-20 z-40 flex flex-col gap-2">
      {/* Visibility Toggle Button */}
      <button
        onClick={onToggleVisibility}
        className={`
          px-4 py-2 rounded-lg shadow-lg flex items-center gap-2
          transition-all duration-200
          ${
            visible
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }
        `}
        title={visible ? 'Hide sticky notes' : 'Show sticky notes'}
      >
        {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        <span className="text-sm font-medium">
          {visible ? 'Sticky Notes On' : 'Sticky Notes Off'}
        </span>
      </button>

      {/* Create Sticky Note Button */}
      {visible && !isCreating && (
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
          title="Create sticky note"
          disabled={!selectedNodeId}
        >
          <Plus className="w-4 h-4" />
          <StickyNoteIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Add Note</span>
        </button>
      )}

      {/* Create Sticky Note Form */}
      {isCreating && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 w-80">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StickyNoteIcon className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-200">New Sticky Note</h3>
            </div>
            <button
              onClick={() => {
                setIsCreating(false);
                setContent('');
              }}
              className="text-gray-400 hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Node Info */}
          {selectedNodeId && (
            <div className="mb-3 text-xs text-gray-400">
              Attaching to selected node
            </div>
          )}

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter note content..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            rows={4}
            autoFocus
          />

          {/* Style Options */}
          <div className="mt-3 space-y-3">
            {/* Color Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                <Palette className="w-3 h-3 inline mr-1" />
                Color
              </label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`
                      w-8 h-8 rounded-full border-2 transition-all
                      ${color.class}
                      ${
                        selectedColor === color.value
                          ? 'border-white scale-110'
                          : 'border-gray-600 hover:border-gray-400'
                      }
                    `}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Size
              </label>
              <div className="flex gap-2">
                {SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setSelectedSize(size.value)}
                    className={`
                      px-3 py-1 rounded text-xs font-medium transition-all
                      ${
                        selectedSize === size.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setIsCreating(false);
                setContent('');
              }}
              className="px-3 py-1.5 text-sm text-gray-300 hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              disabled={!content.trim() || !selectedNodeId}
            >
              Create Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickyNotePanel;

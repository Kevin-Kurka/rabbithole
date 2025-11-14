/**
 * Canvas Context Menu Component
 *
 * Provides a right-click context menu for creating nodes and other canvas operations
 */

'use client';

import React from 'react';
import { FileText, Quote, Link, Type, Image, Trash2, Copy, Lock } from 'lucide-react';

export interface ContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onCreateNode: (type: string) => void;
  onPaste?: () => void;
  onDelete?: () => void;
  selectedNodeId?: string | null;
}

const CanvasContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onClose,
  onCreateNode,
  onPaste,
  onDelete,
  selectedNodeId,
}) => {
  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop to close menu */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Context Menu */}
      <div
        className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-2 min-w-[200px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Create Node Section */}
        <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase">
          Create
        </div>

        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 flex items-center gap-2"
          onClick={() => handleItemClick(() => onCreateNode('Thesis'))}
        >
          <Type className="w-4 h-4" />
          Thesis
        </button>

        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 flex items-center gap-2"
          onClick={() => handleItemClick(() => onCreateNode('Citation'))}
        >
          <Quote className="w-4 h-4" />
          Citation
        </button>

        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 flex items-center gap-2"
          onClick={() => handleItemClick(() => onCreateNode('Reference'))}
        >
          <Link className="w-4 h-4" />
          Reference
        </button>

        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 flex items-center gap-2"
          onClick={() => handleItemClick(() => onCreateNode('Article'))}
        >
          <FileText className="w-4 h-4" />
          Article
        </button>

        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 flex items-center gap-2"
          onClick={() => handleItemClick(() => onCreateNode('Claim'))}
        >
          <FileText className="w-4 h-4" />
          Claim
        </button>

        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 flex items-center gap-2"
          onClick={() => handleItemClick(() => onCreateNode('Evidence'))}
        >
          <FileText className="w-4 h-4" />
          Evidence
        </button>

        {/* Divider */}
        {selectedNodeId && (
          <>
            <div className="my-1 border-t border-gray-700" />

            {/* Node Actions Section */}
            <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase">
              Actions
            </div>

            {onPaste && (
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 flex items-center gap-2"
                onClick={() => handleItemClick(onPaste)}
              >
                <Copy className="w-4 h-4" />
                Paste
              </button>
            )}

            {onDelete && (
              <button
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2"
                onClick={() => handleItemClick(onDelete)}
              >
                <Trash2 className="w-4 h-4" />
                Delete Node
              </button>
            )}
          </>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-2 border-t border-gray-700 pt-2 px-4 pb-2">
          <div className="text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Thesis</span>
              <span className="font-mono">Ctrl+T</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Citation</span>
              <span className="font-mono">Ctrl+Shift+C</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Reference</span>
              <span className="font-mono">Ctrl+R</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CanvasContextMenu;

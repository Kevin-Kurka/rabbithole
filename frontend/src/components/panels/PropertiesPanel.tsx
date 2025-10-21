"use client";

import React, { useState } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';
import { theme } from '@/styles/theme';

export interface PropertiesPanelProps {
  selectedNode?: any;
  selectedEdge?: any;
  onSave?: (updates: any) => void;
  onDelete?: () => void;
}

/**
 * PropertiesPanel Component
 *
 * Displays and allows editing of properties for selected nodes or edges.
 */
export default function PropertiesPanel({
  selectedNode,
  selectedEdge,
  onSave,
  onDelete
}: PropertiesPanelProps) {
  console.log('PropertiesPanel render - selectedNode:', selectedNode, 'selectedEdge:', selectedEdge);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProps, setEditedProps] = useState<any>({});

  const handleSave = () => {
    if (onSave) {
      onSave(editedProps);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProps({});
    setIsEditing(false);
  };

  const renderEmptyState = () => (
    <div style={{
      padding: theme.spacing.lg,
      textAlign: 'center',
      color: theme.colors.text.tertiary,
      fontSize: '12px'
    }}>
      <AlertCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
      <p>Select a node or edge to view its properties</p>
    </div>
  );

  const renderNodeProperties = (node: any) => (
    <div style={{ padding: theme.spacing.md }}>
      {/* Header */}
      <div style={{ marginBottom: theme.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.text.primary }}>
            Node Properties
          </h4>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: theme.colors.button.primary.bg,
                color: theme.colors.button.primary.text,
                border: 'none',
                borderRadius: theme.radius.sm,
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
          )}
        </div>
        <p style={{ fontSize: '11px', color: theme.colors.text.tertiary }}>
          ID: {node.id}
        </p>
      </div>

      {/* Properties */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
        {/* Label */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Label
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedProps.label || node.label || ''}
              onChange={(e) => setEditedProps({ ...editedProps, label: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.xs,
                fontSize: '12px',
                backgroundColor: theme.colors.bg.primary,
                border: `1px solid ${theme.colors.border.primary}`,
                borderRadius: theme.radius.sm,
                color: theme.colors.text.primary,
                outline: 'none',
              }}
            />
          ) : (
            <p style={{ fontSize: '12px', color: theme.colors.text.primary }}>
              {node.label || '(No label)'}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Type
          </label>
          <p style={{ fontSize: '12px', color: theme.colors.text.primary }}>
            {node.type || 'Unknown'}
          </p>
        </div>

        {/* Veracity */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Veracity Score
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            {isEditing ? (
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={editedProps.veracity !== undefined ? editedProps.veracity : (node.veracity || 0.5)}
                onChange={(e) => setEditedProps({ ...editedProps, veracity: parseFloat(e.target.value) })}
                style={{ flex: 1 }}
              />
            ) : (
              <div style={{
                flex: 1,
                height: '8px',
                backgroundColor: theme.colors.bg.primary,
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(node.veracity || 0.5) * 100}%`,
                  height: '100%',
                  backgroundColor: theme.colors.button.primary.bg,
                }} />
              </div>
            )}
            <span style={{ fontSize: '12px', color: theme.colors.text.primary, minWidth: '40px' }}>
              {((editedProps.veracity !== undefined ? editedProps.veracity : (node.veracity || 0.5)) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Description
          </label>
          {isEditing ? (
            <textarea
              value={editedProps.description || node.description || ''}
              onChange={(e) => setEditedProps({ ...editedProps, description: e.target.value })}
              rows={4}
              style={{
                width: '100%',
                padding: theme.spacing.xs,
                fontSize: '12px',
                backgroundColor: theme.colors.bg.primary,
                border: `1px solid ${theme.colors.border.primary}`,
                borderRadius: theme.radius.sm,
                color: theme.colors.text.primary,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          ) : (
            <p style={{ fontSize: '12px', color: theme.colors.text.primary }}>
              {node.description || '(No description)'}
            </p>
          )}
        </div>

        {/* Created/Updated */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Metadata
          </label>
          <div style={{ fontSize: '11px', color: theme.colors.text.tertiary }}>
            <p>Created: {node.created_at || 'Unknown'}</p>
            <p>Updated: {node.updated_at || 'Unknown'}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTop: `1px solid ${theme.colors.border.primary}` }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: theme.spacing.sm,
              fontSize: '12px',
              backgroundColor: theme.colors.bg.primary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.primary}`,
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <X size={14} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: theme.spacing.sm,
              fontSize: '12px',
              backgroundColor: theme.colors.button.primary.bg,
              color: theme.colors.button.primary.text,
              border: 'none',
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      )}

      {/* Delete Button */}
      {!isEditing && onDelete && (
        <div style={{ marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTop: `1px solid ${theme.colors.border.primary}` }}>
          <button
            onClick={onDelete}
            style={{
              width: '100%',
              padding: theme.spacing.sm,
              fontSize: '12px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
            }}
          >
            Delete Node
          </button>
        </div>
      )}
    </div>
  );

  const renderEdgeProperties = (edge: any) => (
    <div style={{ padding: theme.spacing.md }}>
      {/* Header */}
      <div style={{ marginBottom: theme.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.text.primary }}>
            Edge Properties
          </h4>
        </div>
        <p style={{ fontSize: '11px', color: theme.colors.text.tertiary }}>
          ID: {edge.id}
        </p>
      </div>

      {/* Properties */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
        {/* Connection */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Connection
          </label>
          <p style={{ fontSize: '12px', color: theme.colors.text.primary }}>
            {edge.source || 'Unknown'} → {edge.target || 'Unknown'}
          </p>
        </div>

        {/* Label */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Label
          </label>
          <p style={{ fontSize: '12px', color: theme.colors.text.primary }}>
            {edge.data?.label || edge.label || '(No label)'}
          </p>
        </div>

        {/* Type */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Type
          </label>
          <p style={{ fontSize: '12px', color: theme.colors.text.primary }}>
            {edge.type || 'default'}
          </p>
        </div>

        {/* Veracity Score */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Veracity Score
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <div style={{
              flex: 1,
              height: '8px',
              backgroundColor: theme.colors.bg.primary,
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(edge.data?.weight || edge.weight || 0.5) * 100}%`,
                height: '100%',
                backgroundColor: theme.colors.button.primary.bg,
              }} />
            </div>
            <span style={{ fontSize: '12px', color: theme.colors.text.primary, minWidth: '40px' }}>
              {((edge.data?.weight || edge.weight || 0.5) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Level */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Level
          </label>
          <p style={{ fontSize: '12px', color: theme.colors.text.primary }}>
            {edge.data?.level === 0 ? 'Level 0 (Verified)' : 'Level 1 (Editable)'}
          </p>
        </div>

        {/* Metadata */}
        {edge.data?.metadata && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' }}>
              Additional Data
            </label>
            <pre style={{
              fontSize: '11px',
              color: theme.colors.text.tertiary,
              backgroundColor: theme.colors.bg.primary,
              padding: theme.spacing.xs,
              borderRadius: theme.radius.sm,
              overflow: 'auto',
              maxHeight: '150px',
            }}>
              {JSON.stringify(edge.data.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.bg.secondary,
        overflowY: 'auto',
      }}
    >
      {!selectedNode && !selectedEdge ? (
        renderEmptyState()
      ) : selectedNode ? (
        renderNodeProperties(selectedNode)
      ) : (
        renderEdgeProperties(selectedEdge)
      )}
    </div>
  );
}

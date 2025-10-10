/**
 * ChallengeForm Component
 *
 * Modal form for creating new challenges against nodes or edges.
 * Includes challenge type selection, evidence input, and reasoning.
 */

import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import * as Icons from 'lucide-react';
import { ChallengeType, CreateChallengeInput } from '@/types/challenge';
import { getAllChallengeTypes, getChallengeTypeInfo } from '@/utils/challengeHelpers';
import { theme } from '@/styles/theme';

export interface ChallengeFormProps {
  nodeId?: string;
  edgeId?: string;
  claimText?: string;
  onSubmit: (input: CreateChallengeInput) => void;
  onCancel: () => void;
}

/**
 * ChallengeForm component
 */
export const ChallengeForm: React.FC<ChallengeFormProps> = ({
  nodeId,
  edgeId,
  claimText,
  onSubmit,
  onCancel,
}) => {
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null);
  const [evidence, setEvidence] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [claimReference, setClaimReference] = useState(claimText || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const challengeTypes = getAllChallengeTypes();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedType) {
      newErrors.type = 'Please select a challenge type';
    }

    if (!evidence.trim()) {
      newErrors.evidence = 'Evidence is required';
    } else if (evidence.trim().length < 20) {
      newErrors.evidence = 'Evidence must be at least 20 characters';
    }

    if (!reasoning.trim()) {
      newErrors.reasoning = 'Reasoning is required';
    } else if (reasoning.trim().length < 20) {
      newErrors.reasoning = 'Reasoning must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const input: CreateChallengeInput = {
      type: selectedType!,
      targetNodeId: nodeId,
      targetEdgeId: edgeId,
      evidence: evidence.trim(),
      reasoning: reasoning.trim(),
      claimReference: claimReference.trim() || undefined,
    };

    onSubmit(input);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme.colors.overlay.backdrop }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl"
        style={{
          backgroundColor: theme.colors.overlay.modal,
          border: `1px solid ${theme.colors.border.primary}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between p-6 pb-4"
          style={{
            backgroundColor: theme.colors.overlay.modal,
            borderBottom: `1px solid ${theme.colors.border.primary}`,
          }}
        >
          <h2
            className="text-2xl font-bold"
            style={{ color: theme.colors.text.primary }}
          >
            Create Challenge
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-zinc-700 transition-colors"
            style={{ color: theme.colors.text.secondary }}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Challenge Type Selection */}
          <div>
            <label
              className="block text-sm font-semibold mb-3"
              style={{ color: theme.colors.text.secondary }}
            >
              Challenge Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {challengeTypes.map((type) => {
                const IconComponent = (Icons as any)[type.icon] || Icons.AlertCircle;
                const isSelected = selectedType === type.id;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className="p-3 rounded-lg text-left transition-all duration-200"
                    style={{
                      backgroundColor: isSelected
                        ? `${type.color}20`
                        : theme.colors.bg.elevated,
                      border: `2px solid ${
                        isSelected ? type.color : theme.colors.border.primary
                      }`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent
                        size={16}
                        style={{ color: isSelected ? type.color : theme.colors.text.tertiary }}
                      />
                      <span
                        className="font-semibold text-sm"
                        style={{
                          color: isSelected ? type.color : theme.colors.text.primary,
                        }}
                      >
                        {type.name}
                      </span>
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: theme.colors.text.tertiary }}
                    >
                      {type.description}
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.type && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                <AlertCircle size={12} />
                {errors.type}
              </div>
            )}
          </div>

          {/* Claim Reference (optional) */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: theme.colors.text.secondary }}
              htmlFor="claimReference"
            >
              Specific Claim (optional)
            </label>
            <input
              id="claimReference"
              type="text"
              value={claimReference}
              onChange={(e) => setClaimReference(e.target.value)}
              placeholder="Quote the specific claim you're challenging..."
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: theme.colors.input.bg,
                border: `1px solid ${theme.colors.input.border}`,
                color: theme.colors.text.primary,
              }}
            />
            <div
              className="text-xs mt-1"
              style={{ color: theme.colors.text.tertiary }}
            >
              Optional: Quote the exact text you're disputing
            </div>
          </div>

          {/* Evidence */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: theme.colors.text.secondary }}
              htmlFor="evidence"
            >
              Evidence <span className="text-red-500">*</span>
            </label>
            <textarea
              id="evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Provide concrete evidence supporting your challenge (sources, data, references, etc.)"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors"
              style={{
                backgroundColor: theme.colors.input.bg,
                border: `1px solid ${errors.evidence ? '#ef4444' : theme.colors.input.border}`,
                color: theme.colors.text.primary,
                minHeight: '120px',
              }}
              rows={5}
            />
            {errors.evidence ? (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                <AlertCircle size={12} />
                {errors.evidence}
              </div>
            ) : (
              <div
                className="text-xs mt-1"
                style={{ color: theme.colors.text.tertiary }}
              >
                Minimum 20 characters. Include links to sources if available.
              </div>
            )}
          </div>

          {/* Reasoning */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: theme.colors.text.secondary }}
              htmlFor="reasoning"
            >
              Reasoning <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain why this evidence challenges the claim. What should be corrected or clarified?"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors"
              style={{
                backgroundColor: theme.colors.input.bg,
                border: `1px solid ${errors.reasoning ? '#ef4444' : theme.colors.input.border}`,
                color: theme.colors.text.primary,
                minHeight: '120px',
              }}
              rows={5}
            />
            {errors.reasoning ? (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                <AlertCircle size={12} />
                {errors.reasoning}
              </div>
            ) : (
              <div
                className="text-xs mt-1"
                style={{ color: theme.colors.text.tertiary }}
              >
                Minimum 20 characters. Clearly explain your concern.
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div
            className="flex items-start gap-3 p-4 rounded-lg"
            style={{
              backgroundColor: `${theme.colors.status.info}20`,
              border: `1px solid ${theme.colors.border.primary}`,
            }}
          >
            <AlertCircle
              size={20}
              className="flex-shrink-0 mt-0.5"
              style={{ color: theme.colors.text.tertiary }}
            />
            <div>
              <div
                className="text-sm font-semibold mb-1"
                style={{ color: theme.colors.text.primary }}
              >
                Community Review Process
              </div>
              <div
                className="text-xs"
                style={{ color: theme.colors.text.tertiary }}
              >
                Your challenge will be reviewed by the community. Users will vote based on the
                strength of your evidence and reasoning. High-quality challenges help maintain
                the integrity of the knowledge graph.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200"
              style={{
                backgroundColor: theme.colors.bg.elevated,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.primary}`,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200"
              style={{
                backgroundColor: '#f97316',
                color: '#ffffff',
                border: '1px solid #ea580c',
              }}
            >
              Submit Challenge
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChallengeForm;

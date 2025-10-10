"use client";

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  BookOpen,
  Workflow,
  Network,
  Brain,
  Layers,
  GitBranch,
  Sparkles,
  Info,
  X,
  ChevronRight
} from 'lucide-react';
import { theme } from '@/styles/theme';
import { METHODOLOGIES_QUERY } from '@/graphql/queries/methodologies';
import type { Methodology } from '@/types/methodology';

interface MethodologySelectorProps {
  onSelect: (methodologyId: string | null) => void;
  onCancel: () => void;
  selectedMethodology?: string | null;
}

// Icon mapping based on methodology name/category
const getMethodologyIcon = (name: string, category?: string) => {
  const nameLower = name.toLowerCase();
  const categoryLower = category?.toLowerCase() || '';

  if (nameLower.includes('zettelkasten')) return BookOpen;
  if (nameLower.includes('mind map') || nameLower.includes('mindmap')) return Brain;
  if (nameLower.includes('workflow') || categoryLower.includes('process')) return Workflow;
  if (nameLower.includes('network') || categoryLower.includes('network')) return Network;
  if (nameLower.includes('hierarchical') || categoryLower.includes('hierarchy')) return Layers;
  if (nameLower.includes('branch') || categoryLower.includes('tree')) return GitBranch;

  return Sparkles;
};

export default function MethodologySelector({
  onSelect,
  onCancel,
  selectedMethodology
}: MethodologySelectorProps) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState<Methodology | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const { data, loading, error } = useQuery(METHODOLOGIES_QUERY);

  const methodologies: Methodology[] = data?.methodologies || [];

  const handleLearnMore = (methodology: Methodology, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForDetails(methodology);
    setDetailsModalOpen(true);
  };

  const [localSelectedMethodology, setLocalSelectedMethodology] = useState<string | null>(
    selectedMethodology || null
  );

  const handleSelectMethodology = (methodologyId: string) => {
    setLocalSelectedMethodology(methodologyId);
  };

  const handleSelectCustom = () => {
    setLocalSelectedMethodology('custom');
  };

  const handleContinue = () => {
    if (localSelectedMethodology === 'custom') {
      onSelect(null); // null indicates custom methodology
    } else {
      onSelect(localSelectedMethodology);
    }
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedForDetails(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2
          style={{ color: theme.colors.text.primary }}
          className="text-lg font-semibold mb-1"
        >
          Select Methodology
        </h2>
        <p
          style={{ color: theme.colors.text.muted }}
          className="text-sm"
        >
          Choose a knowledge organization methodology for your graph
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            backgroundColor: theme.colors.bg.elevated,
            borderRadius: theme.radius.md
          }}
          className="p-6 text-center"
        >
          <p style={{ color: theme.colors.text.muted }}>Loading methodologies...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            backgroundColor: theme.colors.bg.elevated,
            borderColor: theme.colors.border.primary,
            borderRadius: theme.radius.md
          }}
          className="p-4 border"
        >
          <p style={{ color: theme.colors.text.secondary }}>
            Failed to load methodologies. Using default options.
          </p>
        </div>
      )}

      {/* Methodologies Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {methodologies.map((methodology) => {
            const Icon = getMethodologyIcon(methodology.name, methodology.category);
            const isSelected = localSelectedMethodology === methodology.id;
            const isHovered = hoveredCard === methodology.id;

            return (
              <button
                key={methodology.id}
                onClick={() => handleSelectMethodology(methodology.id)}
                onMouseEnter={() => setHoveredCard(methodology.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  backgroundColor: isSelected
                    ? theme.colors.bg.hover
                    : isHovered
                      ? theme.colors.bg.elevated
                      : theme.colors.bg.primary,
                  borderColor: isSelected
                    ? theme.colors.border.secondary
                    : theme.colors.border.primary,
                  borderRadius: theme.radius.md,
                  borderWidth: '1px',
                }}
                className="p-4 text-left transition-all duration-200 relative group"
              >
                {/* Icon and Title */}
                <div className="flex items-start gap-3 mb-2">
                  <div
                    style={{
                      backgroundColor: theme.colors.bg.elevated,
                      borderRadius: theme.radius.sm,
                    }}
                    className="p-2 flex-shrink-0"
                  >
                    <Icon
                      style={{ color: theme.colors.text.secondary }}
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      style={{ color: theme.colors.text.primary }}
                      className="font-medium text-sm mb-1 truncate"
                    >
                      {methodology.name}
                    </h3>
                    {methodology.category && (
                      <span
                        style={{ color: theme.colors.text.tertiary }}
                        className="text-xs"
                      >
                        {methodology.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p
                  style={{ color: theme.colors.text.muted }}
                  className="text-xs leading-relaxed line-clamp-3 mb-3"
                >
                  {methodology.description}
                </p>

                {/* Learn More Button */}
                <button
                  onClick={(e) => handleLearnMore(methodology, e)}
                  style={{
                    color: theme.colors.text.tertiary,
                    borderRadius: theme.radius.sm,
                  }}
                  className="flex items-center gap-1 text-xs hover:underline transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.colors.text.secondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.colors.text.tertiary;
                  }}
                >
                  <Info className="w-3 h-3" />
                  Learn More
                </button>

                {/* Selected Indicator */}
                {isSelected && (
                  <div
                    style={{
                      backgroundColor: theme.colors.text.primary,
                      borderRadius: theme.radius.full,
                    }}
                    className="absolute top-2 right-2 w-2 h-2"
                  />
                )}
              </button>
            );
          })}

          {/* Custom Methodology Card */}
          <button
            onClick={handleSelectCustom}
            onMouseEnter={() => setHoveredCard('custom')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: localSelectedMethodology === 'custom'
                ? theme.colors.bg.hover
                : hoveredCard === 'custom'
                  ? theme.colors.bg.elevated
                  : theme.colors.bg.primary,
              borderColor: localSelectedMethodology === 'custom'
                ? theme.colors.border.secondary
                : theme.colors.border.primary,
              borderRadius: theme.radius.md,
              borderWidth: '1px',
              borderStyle: 'dashed',
            }}
            className="p-4 text-left transition-all duration-200 relative group min-h-[160px] flex flex-col justify-center items-center"
          >
            <div
              style={{
                backgroundColor: theme.colors.bg.elevated,
                borderRadius: theme.radius.sm,
              }}
              className="p-3 mb-3"
            >
              <Sparkles
                style={{ color: theme.colors.text.secondary }}
                className="w-6 h-6"
              />
            </div>
            <h3
              style={{ color: theme.colors.text.primary }}
              className="font-medium text-sm mb-2"
            >
              Custom Methodology
            </h3>
            <p
              style={{ color: theme.colors.text.muted }}
              className="text-xs text-center"
            >
              Create your own knowledge organization system
            </p>
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          style={{
            backgroundColor: theme.colors.bg.elevated,
            color: theme.colors.text.primary,
            borderRadius: theme.radius.sm,
          }}
          className="px-4 py-2 text-sm font-medium transition-all duration-200"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.elevated;
          }}
        >
          Back
        </button>
        {localSelectedMethodology && (
          <button
            onClick={handleContinue}
            style={{
              backgroundColor: theme.colors.text.primary,
              color: theme.colors.bg.primary,
              borderRadius: theme.radius.sm,
            }}
            className="flex-1 px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.text.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.text.primary;
            }}
          >
            Create Graph
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Details Modal */}
      {detailsModalOpen && selectedForDetails && (
        <>
          {/* Backdrop */}
          <div
            style={{ backgroundColor: theme.colors.overlay.backdrop }}
            className="fixed inset-0 z-50 transition-opacity duration-300"
            onClick={closeDetailsModal}
          />

          {/* Modal */}
          <div
            style={{
              backgroundColor: theme.colors.overlay.modal,
              borderColor: theme.colors.border.primary,
              borderRadius: theme.radius.md,
            }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-2xl max-h-[80vh] overflow-y-auto border shadow-xl"
          >
            {/* Modal Header */}
            <div
              style={{
                borderBottomColor: theme.colors.border.primary
              }}
              className="sticky top-0 bg-inherit p-6 border-b flex items-start justify-between"
            >
              <div className="flex items-start gap-4">
                {(() => {
                  const Icon = getMethodologyIcon(selectedForDetails.name, selectedForDetails.category);
                  return (
                    <div
                      style={{
                        backgroundColor: theme.colors.bg.elevated,
                        borderRadius: theme.radius.sm,
                      }}
                      className="p-3"
                    >
                      <Icon
                        style={{ color: theme.colors.text.secondary }}
                        className="w-6 h-6"
                      />
                    </div>
                  );
                })()}
                <div>
                  <h2
                    style={{ color: theme.colors.text.primary }}
                    className="text-xl font-semibold mb-1"
                  >
                    {selectedForDetails.name}
                  </h2>
                  {selectedForDetails.category && (
                    <span
                      style={{ color: theme.colors.text.tertiary }}
                      className="text-sm"
                    >
                      {selectedForDetails.category}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closeDetailsModal}
                style={{
                  color: theme.colors.text.tertiary,
                  borderRadius: theme.radius.sm,
                }}
                className="p-2 transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.bg.elevated;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3
                  style={{ color: theme.colors.text.secondary }}
                  className="text-sm font-semibold mb-2"
                >
                  Description
                </h3>
                <p
                  style={{ color: theme.colors.text.muted }}
                  className="text-sm leading-relaxed"
                >
                  {selectedForDetails.description}
                </p>
              </div>

              {/* Steps */}
              {selectedForDetails.steps && selectedForDetails.steps.length > 0 && (
                <div>
                  <h3
                    style={{ color: theme.colors.text.secondary }}
                    className="text-sm font-semibold mb-3"
                  >
                    How It Works
                  </h3>
                  <ol className="space-y-2">
                    {selectedForDetails.steps.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span
                          style={{
                            backgroundColor: theme.colors.bg.elevated,
                            color: theme.colors.text.primary,
                            borderRadius: theme.radius.full,
                          }}
                          className="w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0"
                        >
                          {index + 1}
                        </span>
                        <span
                          style={{ color: theme.colors.text.muted }}
                          className="text-sm leading-relaxed"
                        >
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Benefits */}
              {selectedForDetails.benefits && selectedForDetails.benefits.length > 0 && (
                <div>
                  <h3
                    style={{ color: theme.colors.text.secondary }}
                    className="text-sm font-semibold mb-3"
                  >
                    Benefits
                  </h3>
                  <ul className="space-y-2">
                    {selectedForDetails.benefits.map((benefit, index) => (
                      <li key={index} className="flex gap-3">
                        <div
                          style={{
                            backgroundColor: theme.colors.bg.elevated,
                            borderRadius: theme.radius.full,
                          }}
                          className="w-1.5 h-1.5 mt-1.5 flex-shrink-0"
                        />
                        <span
                          style={{ color: theme.colors.text.muted }}
                          className="text-sm leading-relaxed"
                        >
                          {benefit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Examples */}
              {selectedForDetails.examples && selectedForDetails.examples.length > 0 && (
                <div>
                  <h3
                    style={{ color: theme.colors.text.secondary }}
                    className="text-sm font-semibold mb-3"
                  >
                    Use Cases
                  </h3>
                  <div className="space-y-2">
                    {selectedForDetails.examples.map((example, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor: theme.colors.bg.elevated,
                          borderRadius: theme.radius.sm,
                        }}
                        className="p-3"
                      >
                        <p
                          style={{ color: theme.colors.text.muted }}
                          className="text-sm"
                        >
                          {example}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => {
                  handleSelectMethodology(selectedForDetails.id);
                  closeDetailsModal();
                }}
                style={{
                  backgroundColor: theme.colors.text.primary,
                  color: theme.colors.bg.primary,
                  borderRadius: theme.radius.sm,
                }}
                className="w-full px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.text.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.text.primary;
                }}
              >
                Select This Methodology
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

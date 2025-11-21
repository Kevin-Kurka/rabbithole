/**
 * MethodologyProgressPanel Component
 *
 * Shows transparent checklist of methodology workflow steps.
 * Green checkmarks for completed, gray for incomplete.
 * AI-powered "next step" suggestions.
 */

import React from 'react';
import { CheckCircle2, Circle, Sparkles, User } from 'lucide-react';
import { theme } from '../styles/theme';
import { MethodologyStep } from '../types/promotion';

export interface MethodologyProgressPanelProps {
  graphId: string;
  methodologyName: string;
  steps: MethodologyStep[];
  completionPercentage: number;
  nextStepSuggestion?: string;
  loading?: boolean;
}

/**
 * Individual step display
 */
const StepItem: React.FC<{ step: MethodologyStep }> = ({ step }) => {
  const isCompleted = step.isCompleted;
  const IconComponent = isCompleted ? CheckCircle2 : Circle;
  const iconColor = isCompleted ? '#10b981' : theme.colors.text.tertiary;

  return (
    <div
      className="flex items-start gap-3 p-3 rounded transition-colors hover:bg-zinc-800/50"
      role="listitem"
    >
      <IconComponent
        size={20}
        strokeWidth={2}
        style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }}
        aria-label={isCompleted ? 'Completed' : 'Not completed'}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4
            className="font-medium text-sm"
            style={{
              color: isCompleted
                ? theme.colors.text.primary
                : theme.colors.text.secondary,
            }}
          >
            {step.name}
          </h4>
          {step.completionPercentage > 0 && step.completionPercentage < 100 && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: theme.colors.bg.elevated,
                color: theme.colors.text.tertiary,
              }}
            >
              {step.completionPercentage}%
            </span>
          )}
        </div>
        <p
          className="text-xs mt-1 leading-relaxed"
          style={{ color: theme.colors.text.tertiary }}
        >
          {step.description}
        </p>
        {step.completedBy && (
          <div
            className="flex items-center gap-1.5 mt-2 text-xs"
            style={{ color: theme.colors.text.muted }}
          >
            <User size={12} />
            <span>
              Completed by <strong>{step.completedBy.username}</strong>
            </span>
            {step.completedAt && (
              <span className="ml-1">
                on {new Date(step.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Progress bar visualization
 */
const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => {
  const getProgressColor = (pct: number): string => {
    if (pct === 100) return '#10b981'; // green
    if (pct >= 70) return '#84cc16'; // lime
    if (pct >= 40) return '#eab308'; // yellow
    return '#f97316'; // orange
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium"
          style={{ color: theme.colors.text.secondary }}
        >
          Overall Progress
        </span>
        <span
          className="text-xs font-bold"
          style={{ color: getProgressColor(percentage) }}
        >
          {percentage}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: theme.colors.bg.elevated }}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: getProgressColor(percentage),
          }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

/**
 * AI-powered next step suggestion
 */
const NextStepSuggestion: React.FC<{ suggestion: string }> = ({
  suggestion,
}) => (
  <div
    className="p-3 rounded-lg border flex items-start gap-3"
    style={{
      backgroundColor: theme.colors.bg.elevated,
      borderColor: theme.colors.border.primary,
    }}
  >
    <Sparkles
      size={16}
      strokeWidth={2}
      style={{ color: '#eab308', flexShrink: 0, marginTop: '2px' }}
      aria-hidden="true"
    />
    <div className="flex-1 min-w-0">
      <h4
        className="text-xs font-semibold mb-1"
        style={{ color: theme.colors.text.secondary }}
      >
        Suggested Next Step
      </h4>
      <p
        className="text-sm leading-relaxed"
        style={{ color: theme.colors.text.primary }}
      >
        {suggestion}
      </p>
    </div>
  </div>
);

/**
 * Loading skeleton
 */
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div
      className="h-4 rounded"
      style={{ backgroundColor: theme.colors.bg.elevated }}
    />
    <div
      className="h-2 rounded"
      style={{ backgroundColor: theme.colors.bg.elevated }}
    />
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-16 rounded"
        style={{ backgroundColor: theme.colors.bg.elevated }}
      />
    ))}
  </div>
);

/**
 * Main component
 */
export const MethodologyProgressPanel: React.FC<
  MethodologyProgressPanelProps
> = ({
  graphId,
  methodologyName,
  steps,
  completionPercentage,
  nextStepSuggestion,
  loading = false,
}) => {
  if (loading) {
    return (
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: theme.colors.bg.secondary,
          borderColor: theme.colors.border.primary,
        }}
      >
        <LoadingSkeleton />
      </div>
    );
  }

  const completedSteps = steps.filter((s) => s.isCompleted).length;
  const totalSteps = steps.length;

  return (
    <div
      className="rounded-lg border"
      style={{
        backgroundColor: theme.colors.bg.secondary,
        borderColor: theme.colors.border.primary,
      }}
      role="region"
      aria-label="Methodology progress panel"
    >
      {/* Header */}
      <div
        className="p-4 border-b"
        style={{ borderColor: theme.colors.border.primary }}
      >
        <h3
          className="text-base font-semibold mb-1"
          style={{ color: theme.colors.text.primary }}
        >
          Methodology Progress
        </h3>
        <p className="text-xs" style={{ color: theme.colors.text.tertiary }}>
          {methodologyName} • {completedSteps} of {totalSteps} steps completed
        </p>
      </div>

      {/* Progress Bar */}
      <div className="p-4">
        <ProgressBar percentage={completionPercentage} />
      </div>

      {/* Steps List */}
      <div className="px-2 pb-2" role="list">
        {steps.map((step) => (
          <StepItem key={step.id} step={step} />
        ))}
      </div>

      {/* Next Step Suggestion */}
      {nextStepSuggestion && (
        <div
          className="p-4 border-t"
          style={{ borderColor: theme.colors.border.primary }}
        >
          <NextStepSuggestion suggestion={nextStepSuggestion} />
        </div>
      )}

      {/* Completion Badge */}
      {completionPercentage === 100 && (
        <div
          className="p-4 border-t flex items-center justify-center gap-2"
          style={{ borderColor: theme.colors.border.primary }}
        >
          <CheckCircle2 size={20} color="#10b981" strokeWidth={2} />
          <span
            className="text-sm font-semibold"
            style={{ color: '#10b981' }}
          >
            All steps completed! Ready for community review.
          </span>
        </div>
      )}
    </div>
  );
};

export default MethodologyProgressPanel;

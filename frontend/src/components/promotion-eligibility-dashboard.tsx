/**
 * PromotionEligibilityDashboard Component
 *
 * Transparent dashboard showing all 4 promotion criteria.
 * Color-coded progress circles with actionable next steps.
 * No hidden requirements - everything visible to community.
 */

import React from 'react';
import {
  CheckCircle2,
  TrendingUp,
  FileCheck2,
  Shield,
  Target,
  ArrowRight,
} from 'lucide-react';
import { theme } from '../styles/theme';
import { PromotionEligibility, getEligibilityColor, eligibilityColors } from '../types/promotion';

export interface PromotionEligibilityDashboardProps {
  graphId: string;
  eligibility: PromotionEligibility;
  loading?: boolean;
}

/**
 * Circular progress indicator
 */
const CircularProgress: React.FC<{
  score: number;
  target: number;
  size?: 'small' | 'large';
  label: string;
  icon: React.ReactNode;
}> = ({ score, target, size = 'small', label, icon }) => {
  const isMet = score >= target;
  const color = getEligibilityColor(score);
  const colorScheme = eligibilityColors[color];

  const dimensions = size === 'large' ? 160 : 120;
  const strokeWidth = size === 'large' ? 12 : 10;
  const radius = (dimensions - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min((score / 100) * circumference, circumference);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: dimensions, height: dimensions }}>
        {/* Background circle */}
        <svg
          width={dimensions}
          height={dimensions}
          className="transform -rotate-90"
        >
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            stroke={theme.colors.bg.elevated}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            stroke={colorScheme.bg}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div style={{ color: colorScheme.bg }} className="mb-1">
            {icon}
          </div>
          <div
            className={size === 'large' ? 'text-3xl' : 'text-2xl'}
            style={{ color: colorScheme.bg, fontWeight: 'bold' }}
          >
            {score}%
          </div>
          {size === 'small' && (
            <div
              className="text-xs mt-1"
              style={{ color: theme.colors.text.tertiary }}
            >
              Target: {target}%
            </div>
          )}
        </div>
        {/* Checkmark overlay for completed */}
        {isMet && (
          <div className="absolute -top-2 -right-2">
            <div
              className="rounded-full p-1"
              style={{ backgroundColor: '#10b981' }}
            >
              <CheckCircle2 size={size === 'large' ? 24 : 20} color="#ffffff" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>
      <div className="text-center">
        <div
          className={`font-semibold ${size === 'large' ? 'text-lg' : 'text-sm'}`}
          style={{ color: theme.colors.text.primary }}
        >
          {label}
        </div>
        {size === 'large' && (
          <div
            className="text-sm mt-1"
            style={{ color: theme.colors.text.tertiary }}
          >
            Target: {target}%
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Next action item
 */
const NextActionItem: React.FC<{
  criterion: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}> = ({ criterion, action, priority }) => {
  const priorityColors = {
    high: '#ef4444',
    medium: '#eab308',
    low: '#10b981',
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border hover:border-zinc-600 transition-colors cursor-pointer"
      style={{
        backgroundColor: theme.colors.bg.elevated,
        borderColor: theme.colors.border.primary,
      }}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
        style={{ backgroundColor: priorityColors[priority] }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-medium mb-1"
          style={{ color: theme.colors.text.tertiary }}
        >
          {criterion}
        </div>
        <div
          className="text-sm"
          style={{ color: theme.colors.text.primary }}
        >
          {action}
        </div>
      </div>
      <ArrowRight
        size={16}
        style={{ color: theme.colors.text.tertiary }}
        className="flex-shrink-0 mt-1"
      />
    </div>
  );
};

/**
 * What's Next panel
 */
const WhatsNextPanel: React.FC<{
  eligibility: PromotionEligibility;
}> = ({ eligibility }) => {
  const actions = [];

  // Methodology completion
  if (!eligibility.methodologyCompletion.isMet) {
    const incompleteSteps = eligibility.methodologyCompletion.steps.filter(
      (s) => !s.isCompleted
    );
    if (incompleteSteps.length > 0) {
      actions.push({
        criterion: 'Methodology',
        action: `Complete ${incompleteSteps.length} remaining workflow step${
          incompleteSteps.length > 1 ? 's' : ''
        }`,
        priority: 'high' as const,
      });
    }
  }

  // Consensus
  if (!eligibility.consensus.isMet) {
    const needed = eligibility.consensus.targetScore - eligibility.consensus.currentScore;
    actions.push({
      criterion: 'Consensus',
      action: `Need ${needed.toFixed(0)}% more consensus - encourage community voting`,
      priority: 'high' as const,
    });
  }

  // Evidence quality
  if (!eligibility.evidenceQuality.isMet) {
    actions.push({
      criterion: 'Evidence Quality',
      action: eligibility.evidenceQuality.recommendations[0] || 'Add high-quality evidence sources',
      priority: 'medium' as const,
    });
  }

  // Challenges
  if (!eligibility.challengeResolution.isMet) {
    const openChallenges = eligibility.challengeResolution.details.openChallenges;
    actions.push({
      criterion: 'Challenges',
      action: `Address ${openChallenges} open challenge${openChallenges > 1 ? 's' : ''}`,
      priority: 'high' as const,
    });
  }

  // AI suggestion
  if (eligibility.nextAction) {
    actions.push({
      criterion: eligibility.nextAction.criterion,
      action: eligibility.nextAction.action,
      priority: eligibility.nextAction.priority,
    });
  }

  return (
    <div
      className="rounded-lg border"
      style={{
        backgroundColor: theme.colors.bg.secondary,
        borderColor: theme.colors.border.primary,
      }}
    >
      <div
        className="p-4 border-b"
        style={{ borderColor: theme.colors.border.primary }}
      >
        <h3
          className="text-base font-semibold"
          style={{ color: theme.colors.text.primary }}
        >
          What's Next
        </h3>
        <p className="text-xs mt-1" style={{ color: theme.colors.text.tertiary }}>
          Actionable steps to improve promotion eligibility
        </p>
      </div>
      <div className="p-4 space-y-2">
        {actions.length > 0 ? (
          actions.map((action, idx) => (
            <NextActionItem
              key={idx}
              criterion={action.criterion}
              action={action.action}
              priority={action.priority}
            />
          ))
        ) : (
          <div
            className="text-center py-8"
            style={{ color: theme.colors.text.tertiary }}
          >
            <Target size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium mb-1">All Criteria Met!</p>
            <p className="text-xs">
              This graph is eligible for Level 0 promotion.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Overall eligibility banner
 */
const EligibilityBanner: React.FC<{
  isEligible: boolean;
  overallScore: number;
  threshold: number;
}> = ({ isEligible, overallScore, threshold }) => {
  const color = getEligibilityColor(overallScore);
  const colorScheme = eligibilityColors[color];

  return (
    <div
      className="p-6 rounded-lg border-2 text-center"
      style={{
        backgroundColor: `${colorScheme.bg}15`,
        borderColor: colorScheme.border,
      }}
    >
      {isEligible ? (
        <>
          <CheckCircle2
            size={48}
            style={{ color: colorScheme.bg }}
            className="mx-auto mb-3"
            strokeWidth={2}
          />
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: colorScheme.bg }}
          >
            Eligible for Level 0 Promotion!
          </h2>
          <p
            className="text-sm"
            style={{ color: theme.colors.text.secondary }}
          >
            All criteria met. Graph can be promoted to verified status.
          </p>
        </>
      ) : (
        <>
          <Target
            size={48}
            style={{ color: colorScheme.bg }}
            className="mx-auto mb-3"
            strokeWidth={2}
          />
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: colorScheme.bg }}
          >
            {overallScore}% Complete
          </h2>
          <p
            className="text-sm"
            style={{ color: theme.colors.text.secondary }}
          >
            Need {threshold}% to be eligible for Level 0 promotion
          </p>
        </>
      )}
    </div>
  );
};

/**
 * Loading skeleton
 */
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div
      className="h-32 rounded-lg"
      style={{ backgroundColor: theme.colors.bg.elevated }}
    />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-48 rounded-lg"
          style={{ backgroundColor: theme.colors.bg.elevated }}
        />
      ))}
    </div>
  </div>
);

/**
 * Main component
 */
export const PromotionEligibilityDashboard: React.FC<
  PromotionEligibilityDashboardProps
> = ({ graphId, eligibility, loading = false }) => {
  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6" role="region" aria-label="Promotion eligibility dashboard">
      {/* Overall Status */}
      <EligibilityBanner
        isEligible={eligibility.isEligible}
        overallScore={eligibility.overallScore}
        threshold={eligibility.promotionThreshold}
      />

      {/* 4 Criteria Circles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <CircularProgress
          score={eligibility.methodologyCompletion.currentScore}
          target={eligibility.methodologyCompletion.targetScore}
          size="small"
          label="Methodology"
          icon={<FileCheck2 size={24} strokeWidth={2} />}
        />
        <CircularProgress
          score={eligibility.consensus.currentScore}
          target={eligibility.consensus.targetScore}
          size="small"
          label="Consensus"
          icon={<TrendingUp size={24} strokeWidth={2} />}
        />
        <CircularProgress
          score={eligibility.evidenceQuality.currentScore}
          target={eligibility.evidenceQuality.targetScore}
          size="small"
          label="Evidence"
          icon={<Shield size={24} strokeWidth={2} />}
        />
        <CircularProgress
          score={eligibility.challengeResolution.currentScore}
          target={eligibility.challengeResolution.targetScore}
          size="small"
          label="Challenges"
          icon={<CheckCircle2 size={24} strokeWidth={2} />}
        />
      </div>

      {/* What's Next Panel */}
      <WhatsNextPanel eligibility={eligibility} />

      {/* Last Updated */}
      <div
        className="text-center text-xs"
        style={{ color: theme.colors.text.muted }}
      >
        Last updated: {new Date(eligibility.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default PromotionEligibilityDashboard;

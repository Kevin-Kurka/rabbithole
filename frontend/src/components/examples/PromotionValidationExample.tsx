/**
 * Promotion Validation Example
 *
 * Example integration showing how to use promotion validation components.
 * This demonstrates the complete transparent promotion system.
 */

import React, { useState } from 'react';
import { PromotionEligibilityDashboard } from '../PromotionEligibilityDashboard';
import { MethodologyProgressPanel } from '../MethodologyProgressPanel';
import { ConsensusVotingWidget } from '../ConsensusVotingWidget';
import { PromotionEligibilityBadge } from '../PromotionEligibilityBadge';
import {
  mockEligibilityFullyEligible,
  mockEligibilityInProgress,
  mockEligibilityEarlyStage,
  mockBadgeData,
} from '../../mocks/promotionEligibility';
import { theme } from '../../styles/theme';

type ExampleScenario = 'eligible' | 'progress' | 'early';

export const PromotionValidationExample: React.FC = () => {
  const [scenario, setScenario] = useState<ExampleScenario>('progress');

  const eligibilityData = {
    eligible: mockEligibilityFullyEligible,
    progress: mockEligibilityInProgress,
    early: mockEligibilityEarlyStage,
  }[scenario];

  const handleVoteSubmit = async (confidence: number, reasoning: string) => {
    console.log('Vote submitted:', { confidence, reasoning });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: theme.colors.bg.tertiary }}
    >
      {/* Scenario Selector */}
      <div className="max-w-7xl mx-auto mb-8">
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            borderColor: theme.colors.border.primary,
          }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: theme.colors.text.primary }}
          >
            Example Scenario
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => setScenario('eligible')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                scenario === 'eligible' ? 'ring-2 ring-green-500' : ''
              }`}
              style={{
                backgroundColor:
                  scenario === 'eligible'
                    ? theme.colors.bg.elevated
                    : theme.colors.bg.primary,
                color: theme.colors.text.primary,
              }}
            >
              Fully Eligible (86%)
            </button>
            <button
              onClick={() => setScenario('progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                scenario === 'progress' ? 'ring-2 ring-yellow-500' : ''
              }`}
              style={{
                backgroundColor:
                  scenario === 'progress'
                    ? theme.colors.bg.elevated
                    : theme.colors.bg.primary,
                color: theme.colors.text.primary,
              }}
            >
              In Progress (68%)
            </button>
            <button
              onClick={() => setScenario('early')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                scenario === 'early' ? 'ring-2 ring-red-500' : ''
              }`}
              style={{
                backgroundColor:
                  scenario === 'early'
                    ? theme.colors.bg.elevated
                    : theme.colors.bg.primary,
                color: theme.colors.text.primary,
              }}
            >
              Early Stage (32%)
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto">
        {/* Header with Badge */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: theme.colors.text.primary }}
            >
              Climate Change Research Graph
            </h1>
            <p
              className="text-sm"
              style={{ color: theme.colors.text.tertiary }}
            >
              Created by researcher_alice • Updated 2 hours ago
            </p>
          </div>
          <PromotionEligibilityBadge
            graphId={eligibilityData.graphId}
            eligibilityData={mockBadgeData[eligibilityData.graphId]}
            size="lg"
          />
        </div>

        {/* Main Dashboard */}
        <div className="mb-8">
          <PromotionEligibilityDashboard
            graphId={eligibilityData.graphId}
            eligibility={eligibilityData}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Methodology Progress */}
          <div>
            <MethodologyProgressPanel
              graphId={eligibilityData.graphId}
              methodologyName="Scientific Research Method"
              steps={eligibilityData.methodologyCompletion.steps}
              completionPercentage={
                eligibilityData.methodologyCompletion.currentScore
              }
              nextStepSuggestion={
                eligibilityData.nextAction?.criterion === 'Methodology Completion'
                  ? eligibilityData.nextAction.action
                  : undefined
              }
            />
          </div>

          {/* Right Column: Consensus Voting */}
          <div>
            <ConsensusVotingWidget
              graphId={eligibilityData.graphId}
              overallScore={eligibilityData.consensus.currentScore}
              voteCount={eligibilityData.consensus.details.voteCount}
              votes={eligibilityData.consensus.details.votes}
              targetConsensus={eligibilityData.consensus.targetScore}
              userReputation={{
                score: 72,
                level: 2,
                canVote: true,
              }}
              onSubmitVote={handleVoteSubmit}
            />
          </div>
        </div>

        {/* Info Panel */}
        <div
          className="mt-8 p-6 rounded-lg border"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            borderColor: theme.colors.border.primary,
          }}
        >
          <h3
            className="text-lg font-semibold mb-3"
            style={{ color: theme.colors.text.primary }}
          >
            About This System
          </h3>
          <div
            className="space-y-2 text-sm"
            style={{ color: theme.colors.text.secondary }}
          >
            <p>
              <strong>Transparent Promotion:</strong> All criteria for Level 0
              promotion are visible. No hidden requirements or gatekeepers.
            </p>
            <p>
              <strong>Community-Driven:</strong> Vote weights based on evidence
              quality and reputation, not authority. Everyone can see who voted
              and why.
            </p>
            <p>
              <strong>Real-Time Updates:</strong> All scores update automatically
              as the community contributes votes, evidence, and reviews.
            </p>
            <p>
              <strong>Actionable Feedback:</strong> Clear next steps tell you
              exactly what's needed to improve eligibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionValidationExample;

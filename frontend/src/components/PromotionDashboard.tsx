'use client';

import React, { useState } from 'react';
<br>import { useQuery, useMutation } from '@apollo/client';
import {
  GET_PROMOTION_ELIGIBILITY,
  GET_ELIGIBLE_NODES,
  PROMOTE_TO_LEVEL_0,
  GET_PROMOTION_EVENTS,
} from '@/graphql/mutations';

// ============================================================================
// Types
// ============================================================================

interface PromotionDashboardProps {
  userRole?: 'curator' | 'user';
  userId?: string;
}

interface PromotionEligibility {
  nodeId: string;
  criteria: {
    methodologyCompletion: number;
    communityConsensus: number;
    evidenceQuality: number;
    openChallenges: number;
  };
  overallScore: number;
  eligible: boolean;
  blockers: string[];
  recommendations: string[];
  lastEvaluated: string;
}

interface PromotionEvent {
  id: string;
  nodeId: string;
  promotionType: string;
  finalWeight: number;
  methodologyCompletion: number;
  communityConsensus: number;
  evidenceQuality: number;
  curatorId: string;
  curatorNotes: string | null;
  promotedAt: string;
  node: {
    id: string;
    props: any;
  };
  curator: {
    username: string;
  };
}

type TabType = 'eligible' | 'pending' | 'history';
type PromotionType = 'FACT' | 'FALSEHOOD';

// ============================================================================
// Main Component
// ============================================================================

export default function PromotionDashboard({ userRole = 'user', userId }: PromotionDashboardProps) {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('eligible');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promotionType, setPromotionType] = useState<PromotionType>('FACT');
  const [curatorNotes, setCuratorNotes] = useState('');

  // GraphQL Queries
  const { data: eligibleData, loading: eligibleLoading, refetch: refetchEligible } = useQuery(
    GET_ELIGIBLE_NODES,
    {
      variables: { limit: 50 },
      skip: activeTab !== 'eligible',
    }
  );

  const { data: historyData, loading: historyLoading } = useQuery(GET_PROMOTION_EVENTS, {
    variables: { limit: 100, offset: 0 },
    skip: activeTab !== 'history',
  });

  const { data: nodeEligibilityData, loading: nodeLoading } = useQuery(GET_PROMOTION_ELIGIBILITY, {
    variables: { nodeId: selectedNode },
    skip: !selectedNode,
  });

  // GraphQL Mutations
  const [promoteToLevel0, { loading: promoting }] = useMutation(PROMOTE_TO_LEVEL_0, {
    onCompleted: () => {
      setShowPromoteModal(false);
      setSelectedNode(null);
      refetchEligible();
      alert('Node promoted to Level 0 successfully!');
    },
    onError: (error) => {
      alert(`Promotion failed: ${error.message}`);
    },
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handlePromote = async () => {
    if (!selectedNode) return;

    try {
      await promoteToLevel0({
        variables: {
          nodeId: selectedNode,
          promotionType,
          curatorNotes: curatorNotes || null,
        },
      });
    } catch (error) {
      console.error('Promotion failed:', error);
    }
  };

  const handleOpenPromoteModal = (nodeId: string) => {
    setSelectedNode(nodeId);
    setShowPromoteModal(true);
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderCriteriaScore = (label: string, score: number, threshold: number, unit = '%') => {
    const percentage = score * 100;
    const passes = score >= threshold;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-semibold ${passes ? 'text-green-600' : 'text-red-600'}`}>
              {percentage.toFixed(1)}{unit}
            </span>
            <span className="text-xl">{passes ? '✓' : '✗'}</span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              passes ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500">
          Threshold: {(threshold * 100).toFixed(0)}{unit}
        </div>
      </div>
    );
  };

  const renderEligibleNodes = () => {
    if (eligibleLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const eligibleNodes: PromotionEligibility[] = eligibleData?.eligibleNodes || [];

    if (eligibleNodes.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-lg">No nodes currently eligible for Level 0 promotion</p>
          <p className="text-sm mt-2">
            Nodes must meet all 4 criteria: Methodology (100%), Consensus (99%), Evidence (95%), No
            Challenges
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {eligibleNodes.map((node) => (
          <div
            key={node.nodeId}
            className="bg-white border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">✅</span>
                  <h3 className="text-lg font-semibold text-gray-800">Node {node.nodeId}</h3>
                  {node.eligible && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      ELIGIBLE
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Last evaluated: {new Date(node.lastEvaluated).toLocaleString()}
                </p>
              </div>

              {userRole === 'curator' && (
                <button
                  onClick={() => handleOpenPromoteModal(node.nodeId)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  Promote to Level 0
                </button>
              )}
            </div>

            {/* Criteria Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {renderCriteriaScore(
                  '1. Methodology Completion',
                  node.criteria.methodologyCompletion,
                  1.0
                )}
              </div>
              <div>
                {renderCriteriaScore(
                  '2. Community Consensus',
                  node.criteria.communityConsensus,
                  0.99
                )}
              </div>
              <div>
                {renderCriteriaScore('3. Evidence Quality', node.criteria.evidenceQuality, 0.95)}
              </div>
              <div>
                {renderCriteriaScore('4. Open Challenges', 1 - node.criteria.openChallenges, 1.0, '')}
              </div>
            </div>

            {/* Overall Score */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-green-900">Overall Eligibility Score</span>
                <span className="text-2xl font-bold text-green-600">
                  {(node.overallScore * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Blockers */}
            {node.blockers.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">⚠️ Blockers:</h4>
                <ul className="space-y-1">
                  {node.blockers.map((blocker, index) => (
                    <li key={index} className="text-sm text-red-800">
                      • {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {node.recommendations.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Recommendations:</h4>
                <ul className="space-y-1">
                  {node.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-800">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPromotionHistory = () => {
    if (historyLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const events: PromotionEvent[] = historyData?.promotionEvents || [];

    if (events.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📜</div>
          <p className="text-lg">No promotion events yet</p>
          <p className="text-sm mt-2">
            When nodes are promoted to Level 0, they will appear here in the public ledger
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">
                    {event.promotionType === 'FACT' ? '✅' : '❌'}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {event.promotionType === 'FACT' ? 'Verified Fact' : 'Verified Falsehood'}
                  </h3>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                    LEVEL 0
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Promoted by {event.curator.username} on{' '}
                  {new Date(event.promotedAt).toLocaleString()}
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {(event.finalWeight * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">Final Weight</div>
              </div>
            </div>

            {/* Criteria at Promotion */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-semibold text-gray-700">Methodology</div>
                <div className="text-lg font-bold text-gray-800">
                  {(event.methodologyCompletion * 100).toFixed(0)}%
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-semibold text-gray-700">Consensus</div>
                <div className="text-lg font-bold text-gray-800">
                  {(event.communityConsensus * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-semibold text-gray-700">Evidence</div>
                <div className="text-lg font-bold text-gray-800">
                  {(event.evidenceQuality * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Node Content Preview */}
            {event.node?.props && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Content:</h4>
                <p className="text-sm text-gray-600">
                  {JSON.stringify(event.node.props).substring(0, 200)}...
                </p>
              </div>
            )}

            {/* Curator Notes */}
            {event.curatorNotes && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📝 Curator Notes:</h4>
                <p className="text-sm text-blue-800">{event.curatorNotes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPromoteModal = () => {
    if (!showPromoteModal || !selectedNode) return null;

    const eligibility = nodeEligibilityData?.promotionEligibility;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Promote to Level 0</h2>
            <button
              onClick={() => setShowPromoteModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Node Info */}
            {eligibility && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4">Eligibility Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  {renderCriteriaScore(
                    'Methodology',
                    eligibility.criteria.methodologyCompletion,
                    1.0
                  )}
                  {renderCriteriaScore(
                    'Consensus',
                    eligibility.criteria.communityConsensus,
                    0.99
                  )}
                  {renderCriteriaScore(
                    'Evidence',
                    eligibility.criteria.evidenceQuality,
                    0.95
                  )}
                  {renderCriteriaScore(
                    'No Challenges',
                    1 - eligibility.criteria.openChallenges,
                    1.0,
                    ''
                  )}
                </div>
              </div>
            )}

            {/* Promotion Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promotion Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPromotionType('FACT')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    promotionType === 'FACT'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}
                >
                  <div className="text-3xl mb-2">✅</div>
                  <div className="font-semibold text-gray-800">Verified Fact</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Truth verified at 99%+ consensus
                  </div>
                </button>
                <button
                  onClick={() => setPromotionType('FALSEHOOD')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    promotionType === 'FALSEHOOD'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-red-300'
                  }`}
                >
                  <div className="text-3xl mb-2">❌</div>
                  <div className="font-semibold text-gray-800">Verified Falsehood</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Debunked at 99%+ consensus
                  </div>
                </button>
              </div>
            </div>

            {/* Curator Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Curator Notes (Optional)
              </label>
              <textarea
                value={curatorNotes}
                onChange={(e) => setCuratorNotes(e.target.value)}
                placeholder="Add any notes about this promotion decision..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important:</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• This action is permanent and will be recorded in the public ledger</li>
                <li>• The node will be moved to Level 0 (immutable truth corpus)</li>
                <li>• Weight will be set to 1.0 (verified truth/falsehood)</li>
                <li>• All users' theories can reference this Level 0 node</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPromoteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={promoting || !eligibility?.eligible}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promoting ? 'Promoting...' : 'Confirm Promotion'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Level 0 Promotion Dashboard</h1>
        <p className="text-gray-600">
          Track nodes eligible for promotion to the immutable truth corpus
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('eligible')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'eligible'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Eligible Nodes
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Promotion History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'eligible' && renderEligibleNodes()}
      {activeTab === 'history' && renderPromotionHistory()}

      {/* Promote Modal */}
      {renderPromoteModal()}
    </div>
  );
}

import React, { useState } from 'react';
import { X, TrendingUp, Clock, Info } from 'lucide-react';
import { theme } from '../styles/theme';
import VeracityBadge from './VeracityBadge';
import VeracityTimeline, { VeracityHistoryEntry } from './VeracityTimeline';
import VeracityBreakdown, { VeracityBreakdownData } from './VeracityBreakdown';

export interface VeracityPanelProps {
  nodeId?: string;
  edgeId?: string;
  isOpen: boolean;
  onClose: () => void;
  score: number;
  isLevel0?: boolean;
  breakdownData?: VeracityBreakdownData;
  historyData?: VeracityHistoryEntry[];
  isLoading?: boolean;
}

type TabType = 'breakdown' | 'timeline' | 'info';

export const VeracityPanel: React.FC<VeracityPanelProps> = ({
  nodeId,
  edgeId,
  isOpen,
  onClose,
  score,
  isLevel0 = false,
  breakdownData,
  historyData,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');

  if (!isOpen) return null;

  const entityType = nodeId ? 'Node' : 'Edge';
  const entityId = nodeId || edgeId;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          backgroundColor: theme.colors.overlay.backdrop,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full md:w-96 z-50 flex flex-col shadow-xl transition-transform duration-300"
        style={{
          backgroundColor: theme.colors.bg.primary,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: theme.colors.border.primary }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: theme.colors.text.primary }}>
              Veracity Analysis
            </h2>
            <p className="text-sm" style={{ color: theme.colors.text.tertiary }}>
              {entityType} {entityId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded transition-colors duration-200"
            style={{
              color: theme.colors.text.secondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Score Badge */}
        <div className="p-4 border-b" style={{ borderColor: theme.colors.border.primary }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: theme.colors.text.secondary }}>
              Current Score
            </span>
            <VeracityBadge score={score} isLevel0={isLevel0} size="lg" />
          </div>
          {isLevel0 && (
            <p
              className="text-xs mt-2"
              style={{ color: theme.colors.text.tertiary }}
            >
              This is a Level 0 node with verified veracity.
            </p>
          )}
        </div>

        {/* Tabs */}
        <div
          className="flex border-b"
          style={{ borderColor: theme.colors.border.primary }}
        >
          <button
            onClick={() => setActiveTab('breakdown')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200"
            style={{
              color:
                activeTab === 'breakdown'
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary,
              backgroundColor:
                activeTab === 'breakdown'
                  ? theme.colors.bg.secondary
                  : 'transparent',
              borderBottom:
                activeTab === 'breakdown'
                  ? `2px solid ${theme.colors.text.primary}`
                  : 'none',
            }}
          >
            <TrendingUp size={16} />
            Breakdown
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200"
            style={{
              color:
                activeTab === 'timeline'
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary,
              backgroundColor:
                activeTab === 'timeline'
                  ? theme.colors.bg.secondary
                  : 'transparent',
              borderBottom:
                activeTab === 'timeline'
                  ? `2px solid ${theme.colors.text.primary}`
                  : 'none',
            }}
          >
            <Clock size={16} />
            Timeline
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200"
            style={{
              color:
                activeTab === 'info'
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary,
              backgroundColor:
                activeTab === 'info' ? theme.colors.bg.secondary : 'transparent',
              borderBottom:
                activeTab === 'info'
                  ? `2px solid ${theme.colors.text.primary}`
                  : 'none',
            }}
          >
            <Info size={16} />
            Info
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'breakdown' && (
            <VeracityBreakdown
              data={
                breakdownData || {
                  evidenceScore: 0,
                  consensusScore: 0,
                  challengePenalty: 0,
                  totalScore: score,
                  evidence: [],
                }
              }
              isLoading={isLoading}
            />
          )}

          {activeTab === 'timeline' && (
            <div>
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: theme.colors.text.secondary }}
              >
                Score History
              </h3>
              {historyData && historyData.length > 0 ? (
                <VeracityTimeline history={historyData} height={300} />
              ) : (
                <div
                  className="text-center py-8 rounded"
                  style={{
                    backgroundColor: theme.colors.bg.secondary,
                    color: theme.colors.text.tertiary,
                  }}
                >
                  <Clock size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No history data available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  About Veracity Scores
                </h3>
                <p className="text-sm mb-3" style={{ color: theme.colors.text.primary }}>
                  Veracity scores range from 0.0 (completely unreliable) to 1.0 (completely
                  verified). Scores are calculated based on multiple factors.
                </p>
              </div>

              <div>
                <h4
                  className="text-sm font-semibold mb-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Score Ranges
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                      Level 0 (Verified)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#84cc16' }} />
                    <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                      70-100% - High Confidence
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
                    <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                      40-70% - Medium Confidence
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
                    <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                      10-40% - Low Confidence
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                    <span className="text-sm" style={{ color: theme.colors.text.primary }}>
                      0-10% - Very Low Confidence
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4
                  className="text-sm font-semibold mb-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Contributing Factors
                </h4>
                <ul className="space-y-2 text-sm" style={{ color: theme.colors.text.primary }}>
                  <li>• Evidence Score: Quality and quantity of supporting evidence</li>
                  <li>• Consensus Score: Agreement among contributors</li>
                  <li>• Challenge Penalty: Deductions from unresolved challenges</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VeracityPanel;

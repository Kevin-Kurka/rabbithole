import React from 'react';
import { theme } from '../styles/theme';
import { FileText, Users, AlertTriangle } from 'lucide-react';

export interface Evidence {
  id: string;
  type: string;
  description: string;
  weight: number;
  addedAt: Date;
  addedBy?: string;
}

export interface VeracityBreakdownData {
  evidenceScore: number;
  consensusScore: number;
  challengePenalty: number;
  totalScore: number;
  evidence: Evidence[];
}

export interface VeracityBreakdownProps {
  data: VeracityBreakdownData;
  isLoading?: boolean;
}

interface FactorBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  icon: React.ReactNode;
  description?: string;
}

const FactorBar: React.FC<FactorBarProps> = ({
  label,
  value,
  maxValue,
  color,
  icon,
  description,
}) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const displayValue = Math.round(value * 100);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div style={{ color }}>{icon}</div>
          <span className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
            {label}
          </span>
        </div>
        <span className="text-sm font-semibold" style={{ color }}>
          {displayValue}%
        </span>
      </div>

      {description && (
        <p className="text-xs mb-2" style={{ color: theme.colors.text.tertiary }}>
          {description}
        </p>
      )}

      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: theme.colors.bg.elevated }}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

export const VeracityBreakdown: React.FC<VeracityBreakdownProps> = ({
  data,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        className="rounded p-4 animate-pulse"
        style={{ backgroundColor: theme.colors.bg.secondary }}
      >
        <div
          className="h-4 rounded mb-4"
          style={{ backgroundColor: theme.colors.bg.elevated }}
        />
        <div
          className="h-4 rounded mb-4"
          style={{ backgroundColor: theme.colors.bg.elevated }}
        />
        <div
          className="h-4 rounded"
          style={{ backgroundColor: theme.colors.bg.elevated }}
        />
      </div>
    );
  }

  const maxScore = 1.0;

  return (
    <div
      className="rounded p-4"
      style={{ backgroundColor: theme.colors.bg.secondary }}
    >
      {/* Overall Score */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2" style={{ color: theme.colors.text.primary }}>
          Overall Veracity Score
        </h3>
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-bold"
            style={{
              color:
                data.totalScore >= 0.7
                  ? '#84cc16'
                  : data.totalScore >= 0.4
                  ? '#eab308'
                  : data.totalScore >= 0.1
                  ? '#f97316'
                  : '#ef4444',
            }}
          >
            {Math.round(data.totalScore * 100)}%
          </span>
        </div>
      </div>

      {/* Factors Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-3" style={{ color: theme.colors.text.secondary }}>
          Contributing Factors
        </h4>

        <FactorBar
          label="Evidence Score"
          value={data.evidenceScore}
          maxValue={maxScore}
          color="#84cc16"
          icon={<FileText size={16} />}
          description="Quality and quantity of supporting evidence"
        />

        <FactorBar
          label="Consensus Score"
          value={data.consensusScore}
          maxValue={maxScore}
          color="#3b82f6"
          icon={<Users size={16} />}
          description="Agreement among contributors and validators"
        />

        <FactorBar
          label="Challenge Penalty"
          value={data.challengePenalty}
          maxValue={maxScore}
          color="#ef4444"
          icon={<AlertTriangle size={16} />}
          description="Deductions from unresolved challenges"
        />
      </div>

      {/* Evidence List */}
      {data.evidence.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: theme.colors.text.secondary }}>
            Supporting Evidence ({data.evidence.length})
          </h4>

          <div className="space-y-2">
            {data.evidence.map((evidence) => (
              <div
                key={evidence.id}
                className="rounded p-3 transition-colors duration-200"
                style={{
                  backgroundColor: theme.colors.bg.primary,
                  border: `1px solid ${theme.colors.border.primary}`,
                }}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: theme.colors.bg.elevated,
                          color: theme.colors.text.secondary,
                        }}
                      >
                        {evidence.type}
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color:
                            evidence.weight >= 0.7
                              ? '#84cc16'
                              : evidence.weight >= 0.4
                              ? '#eab308'
                              : '#f97316',
                        }}
                      >
                        Weight: {Math.round(evidence.weight * 100)}%
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: theme.colors.text.primary }}>
                      {evidence.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs" style={{ color: theme.colors.text.tertiary }}>
                    Added {evidence.addedAt.toLocaleDateString()}
                  </span>
                  {evidence.addedBy && (
                    <span className="text-xs" style={{ color: theme.colors.text.tertiary }}>
                      by {evidence.addedBy}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.evidence.length === 0 && (
        <div
          className="text-center py-4 rounded"
          style={{
            backgroundColor: theme.colors.bg.primary,
            color: theme.colors.text.tertiary,
          }}
        >
          <FileText size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No evidence provided yet</p>
        </div>
      )}
    </div>
  );
};

export default VeracityBreakdown;

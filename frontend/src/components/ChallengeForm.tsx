/**
 * ChallengeForm Component
 *
 * Modal form for creating challenges using the Toulmin Argumentation Model.
 * Includes optional AI fact-checking to strengthen challenges before submission.
 */

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { X, AlertCircle, Sparkles, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { CreateChallengeInput } from '@/types/challenge';
import { theme } from '@/styles/theme';
import {
  FACT_CHECK_CLAIM,
  FactCheckResult,
  FactCheckClaimData,
  FactCheckClaimVariables,
} from '@/graphql/ai-queries';

export interface ChallengeFormProps {
  nodeId?: string;
  edgeId?: string;
  onSubmit: (input: CreateChallengeInput) => void;
  onCancel: () => void;
  userId?: string; // User ID for AI rate limiting
}

/**
 * ChallengeForm component
 */
export const ChallengeForm: React.FC<ChallengeFormProps> = ({
  nodeId,
  edgeId,
  onSubmit,
  onCancel,
  userId = 'anonymous', // Default user ID if not provided
}) => {
  // Form state
  const [claim, setClaim] = useState('');
  const [grounds, setGrounds] = useState('');
  const [warrant, setWarrant] = useState('');
  const [backing, setBacking] = useState('');
  const [qualifier, setQualifier] = useState('');
  const [requestAIResearch, setRequestAIResearch] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // AI state
  const [aiFactCheckResult, setAIFactCheckResult] = useState<FactCheckResult | null>(null);
  const [showAIHelp, setShowAIHelp] = useState(false);

  // GraphQL mutation for fact-checking
  const [factCheckClaim, { loading: isFactChecking }] = useMutation<
    FactCheckClaimData,
    FactCheckClaimVariables
  >(FACT_CHECK_CLAIM, {
    onCompleted: (data) => {
      setAIFactCheckResult(data.factCheckClaim);
    },
    onError: (error) => {
      console.error('Fact-check error:', error);
      setAIFactCheckResult({
        verdict: 'insufficient_evidence',
        confidence: 0,
        supportingEvidence: [],
        contradictingEvidence: [],
        missingContext: ['AI service unavailable'],
        recommendations: ['Please try again later or continue without AI assistance'],
        analysis: `Error: ${error.message}. The AI fact-checking service may not be running. Make sure Ollama is installed and running on http://localhost:11434`,
      });
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!claim.trim()) {
      newErrors.claim = 'Claim is required';
    } else if (claim.trim().length < 10) {
      newErrors.claim = 'Claim must be at least 10 characters';
    }

    if (grounds && grounds.trim().length > 0 && grounds.trim().length < 20) {
      newErrors.grounds = 'Evidence must be at least 20 characters if provided';
    }

    if (warrant && warrant.trim().length > 0 && warrant.trim().length < 20) {
      newErrors.warrant = 'Warrant must be at least 20 characters if provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFactCheck = async () => {
    if (!claim.trim()) {
      setErrors({ claim: 'Please enter a claim before requesting AI research' });
      return;
    }

    setAIFactCheckResult(null);

    try {
      await factCheckClaim({
        variables: {
          input: {
            claim: claim.trim(),
            targetNodeId: nodeId,
            targetEdgeId: edgeId,
            grounds: grounds.trim() || undefined,
            userId,
          },
        },
      });
    } catch (error) {
      // Error is handled in onError callback above
      console.error('AI fact-check error:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const input: CreateChallengeInput = {
      targetNodeId: nodeId,
      targetEdgeId: edgeId,
      claim: claim.trim(),
      grounds: grounds.trim() || undefined,
      warrant: warrant.trim() || undefined,
      backing: backing.trim() || undefined,
      qualifier: qualifier.trim() || undefined,
      requestAIResearch,
    };

    onSubmit(input);
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'supported':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'contradicted':
        return <XCircle className="text-red-500" size={20} />;
      case 'insufficient_evidence':
        return <HelpCircle className="text-yellow-500" size={20} />;
      case 'needs_clarification':
        return <AlertCircle className="text-blue-500" size={20} />;
      default:
        return <HelpCircle className="text-gray-500" size={20} />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme.colors.overlay.backdrop }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl"
        style={{
          backgroundColor: theme.colors.overlay.modal,
          border: `1px solid ${theme.colors.border.primary}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between p-6 pb-4 z-10"
          style={{
            backgroundColor: theme.colors.overlay.modal,
            borderBottom: `1px solid ${theme.colors.border.primary}`,
          }}
        >
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ color: theme.colors.text.primary }}
            >
              Create Formal Challenge
            </h2>
            <p className="text-sm mt-1" style={{ color: theme.colors.text.tertiary }}>
              Using the Toulmin Argumentation Model
            </p>
          </div>
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
          {/* Claim Field */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: theme.colors.text.secondary }}
              htmlFor="claim"
            >
              Claim <span className="text-red-500">*</span>
            </label>
            <textarea
              id="claim"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="State your claim clearly and concisely (e.g., 'This node contains a factual error about X')"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors"
              style={{
                backgroundColor: theme.colors.input.bg,
                border: `1px solid ${errors.claim ? '#ef4444' : theme.colors.input.border}`,
                color: theme.colors.text.primary,
                minHeight: '80px',
              }}
              rows={3}
            />
            {errors.claim ? (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                <AlertCircle size={12} />
                {errors.claim}
              </div>
            ) : (
              <div
                className="text-xs mt-1"
                style={{ color: theme.colors.text.tertiary }}
              >
                What assertion are you making? This is your main argument.
              </div>
            )}
          </div>

          {/* AI Fact-Check Section */}
          <div
            className="p-4 rounded-lg"
            style={{
              backgroundColor: `${theme.colors.accent.purple}10`,
              border: `1px solid ${theme.colors.border.primary}`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: theme.colors.accent.purple }} />
                <span className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
                  AI Research Assistant
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAIHelp(!showAIHelp)}
                className="text-xs px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
                style={{ color: theme.colors.text.tertiary }}
              >
                {showAIHelp ? 'Hide Info' : 'Learn More'}
              </button>
            </div>

            {showAIHelp && (
              <div
                className="mb-3 p-3 rounded text-xs"
                style={{
                  backgroundColor: theme.colors.bg.elevated,
                  color: theme.colors.text.tertiary,
                }}
              >
                The AI will search the knowledge graph for evidence, identify contradictions,
                suggest missing context, and provide recommendations to strengthen your challenge.
                This helps ensure high-quality formal inquiries.
              </div>
            )}

            <button
              type="button"
              onClick={handleFactCheck}
              disabled={isFactChecking || !claim.trim()}
              className="w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                backgroundColor: theme.colors.accent.purple,
                color: '#ffffff',
                opacity: isFactChecking || !claim.trim() ? 0.5 : 1,
                cursor: isFactChecking || !claim.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isFactChecking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Researching...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Ask AI to Research This Claim
                </>
              )}
            </button>

            {/* AI Results */}
            {aiFactCheckResult && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  {getVerdictIcon(aiFactCheckResult.verdict)}
                  <span className="font-semibold text-sm capitalize" style={{ color: theme.colors.text.primary }}>
                    Verdict: {aiFactCheckResult.verdict.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs" style={{ color: theme.colors.text.tertiary }}>
                    (Confidence: {(aiFactCheckResult.confidence * 100).toFixed(0)}%)
                  </span>
                </div>

                <div className="p-3 rounded text-xs" style={{ backgroundColor: theme.colors.bg.elevated }}>
                  <p style={{ color: theme.colors.text.secondary }}>{aiFactCheckResult.analysis}</p>
                </div>

                {aiFactCheckResult.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: theme.colors.text.secondary }}>
                      Recommendations:
                    </p>
                    <ul className="space-y-1">
                      {aiFactCheckResult.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs flex items-start gap-2" style={{ color: theme.colors.text.tertiary }}>
                          <span>•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grounds (Evidence) */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: theme.colors.text.secondary }}
              htmlFor="grounds"
            >
              Grounds (Evidence) <span className="text-zinc-500 text-xs font-normal">(Optional)</span>
            </label>
            <textarea
              id="grounds"
              value={grounds}
              onChange={(e) => setGrounds(e.target.value)}
              placeholder="Provide concrete evidence, data, or facts that support your claim (sources, citations, examples, etc.)"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors"
              style={{
                backgroundColor: theme.colors.input.bg,
                border: `1px solid ${errors.grounds ? '#ef4444' : theme.colors.input.border}`,
                color: theme.colors.text.primary,
                minHeight: '100px',
              }}
              rows={4}
            />
            {errors.grounds && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                <AlertCircle size={12} />
                {errors.grounds}
              </div>
            )}
            <div
              className="text-xs mt-1"
              style={{ color: theme.colors.text.tertiary }}
            >
              What evidence supports your claim? Include links, citations, or references.
            </div>
          </div>

          {/* Warrant */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: theme.colors.text.secondary }}
              htmlFor="warrant"
            >
              Warrant <span className="text-zinc-500 text-xs font-normal">(Optional)</span>
            </label>
            <textarea
              id="warrant"
              value={warrant}
              onChange={(e) => setWarrant(e.target.value)}
              placeholder="Explain how your evidence connects to your claim. Why does the evidence matter?"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors"
              style={{
                backgroundColor: theme.colors.input.bg,
                border: `1px solid ${errors.warrant ? '#ef4444' : theme.colors.input.border}`,
                color: theme.colors.text.primary,
                minHeight: '100px',
              }}
              rows={4}
            />
            {errors.warrant && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                <AlertCircle size={12} />
                {errors.warrant}
              </div>
            )}
            <div
              className="text-xs mt-1"
              style={{ color: theme.colors.text.tertiary }}
            >
              Bridge your evidence to your claim. Why should we accept the connection?
            </div>
          </div>

          {/* Advanced Fields - Collapsible */}
          <details className="group">
            <summary
              className="cursor-pointer font-semibold text-sm py-2 flex items-center gap-2"
              style={{ color: theme.colors.text.secondary }}
            >
              <span className="transform group-open:rotate-90 transition-transform">▶</span>
              Advanced Arguments (Optional)
            </summary>

            <div className="mt-4 space-y-6">
              {/* Backing */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: theme.colors.text.secondary }}
                  htmlFor="backing"
                >
                  Backing
                </label>
                <textarea
                  id="backing"
                  value={backing}
                  onChange={(e) => setBacking(e.target.value)}
                  placeholder="Additional support for your warrant (theoretical framework, expert consensus, precedent, etc.)"
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors"
                  style={{
                    backgroundColor: theme.colors.input.bg,
                    border: `1px solid ${theme.colors.input.border}`,
                    color: theme.colors.text.primary,
                    minHeight: '80px',
                  }}
                  rows={3}
                />
                <div
                  className="text-xs mt-1"
                  style={{ color: theme.colors.text.tertiary }}
                >
                  What additional support strengthens your reasoning?
                </div>
              </div>

              {/* Qualifier */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: theme.colors.text.secondary }}
                  htmlFor="qualifier"
                >
                  Qualifier
                </label>
                <input
                  id="qualifier"
                  type="text"
                  value={qualifier}
                  onChange={(e) => setQualifier(e.target.value)}
                  placeholder='e.g., "probably", "certainly", "in most cases", "with 95% confidence"'
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
                  How confident are you in your claim? Indicates degree of certainty.
                </div>
              </div>
            </div>
          </details>

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
                Formal Inquiry Process
              </div>
              <div
                className="text-xs"
                style={{ color: theme.colors.text.tertiary }}
              >
                Your challenge initiates a structured formal inquiry. The defender can submit a rebuttal,
                the community can participate with evidence and votes, and AI will assist throughout the process.
                Well-structured challenges using the Toulmin model receive more consideration.
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

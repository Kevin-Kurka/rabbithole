'use client';

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { VALIDATE_EVIDENCE_MUTATION } from '@/graphql/mutations';

// ============================================================================
// Types
// ============================================================================

interface EvidenceWizardProps {
  nodeId?: string;
  graphId: string;
  onComplete?: (result: EvidenceValidationResult) => void;
  onCancel?: () => void;
}

interface EvidenceValidationResult {
  isValid: boolean;
  freCompliance: {
    fre401_relevance: FRECheck;
    fre403_prejudice: FRECheck;
    fre602_personal_knowledge: FRECheck;
    fre702_expert_testimony: FREExpertCheck;
    fre801_hearsay: FRECheck;
    fre901_authentication: FRECheck;
    fre1002_best_evidence: FRECheck;
  };
  overallScore: number;
  suggestions: string[];
  requiredImprovements: string[];
}

interface FRECheck {
  passed: boolean;
  score: number;
  explanation: string;
}

interface FREExpertCheck {
  passed: boolean;
  needsExpert: boolean;
  explanation: string;
}

type Step = 'claim' | 'evidence' | 'sources' | 'review';

// ============================================================================
// Main Component
// ============================================================================

export default function EvidenceWizard({
  nodeId,
  graphId,
  onComplete,
  onCancel
}: EvidenceWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState<Step>('claim');
  const [claim, setClaim] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [sourceDate, setSourceDate] = useState('');
  const [sourceType, setSourceType] = useState('document');
  const [validationResult, setValidationResult] = useState<EvidenceValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // GraphQL Mutation
  const [validateEvidence, { loading }] = useMutation(VALIDATE_EVIDENCE_MUTATION);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleNext = async () => {
    if (currentStep === 'claim' && claim.trim()) {
      setCurrentStep('evidence');
    } else if (currentStep === 'evidence' && evidenceText.trim()) {
      setCurrentStep('sources');
    } else if (currentStep === 'sources' && sourceUrl.trim()) {
      setCurrentStep('review');
      // Auto-validate when reaching review
      await handleValidate();
    }
  };

  const handleBack = () => {
    if (currentStep === 'evidence') setCurrentStep('claim');
    else if (currentStep === 'sources') setCurrentStep('evidence');
    else if (currentStep === 'review') setCurrentStep('sources');
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const { data } = await validateEvidence({
        variables: {
          input: {
            nodeId: nodeId || null,
            graphId,
            claim,
            evidenceText,
            sourceInfo: {
              url: sourceUrl,
              author: sourceAuthor,
              date: sourceDate,
              type: sourceType,
            },
          },
        },
      });

      if (data?.validateEvidence) {
        setValidationResult(data.validateEvidence);
      }
    } catch (error) {
      console.error('Evidence validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = () => {
    if (validationResult && onComplete) {
      onComplete(validationResult);
    }
  };

  // ============================================================================
  // Step Rendering
  // ============================================================================

  const renderStepIndicator = () => {
    const steps = [
      { id: 'claim', label: 'Claim' },
      { id: 'evidence', label: 'Evidence' },
      { id: 'sources', label: 'Sources' },
      { id: 'review', label: 'Review' },
    ];

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === step.id
                    ? 'bg-blue-600 text-white'
                    : steps.findIndex((s) => s.id === currentStep) > index
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
              <span className="text-sm mt-2 font-medium">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-4 ${
                  steps.findIndex((s) => s.id === currentStep) > index
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderClaimStep = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Step 1: State Your Claim</h2>
      <p className="text-gray-600 mb-4">
        Enter a clear, specific claim that you want to validate. Be precise and avoid vague language.
      </p>
      <textarea
        value={claim}
        onChange={(e) => setClaim(e.target.value)}
        placeholder="Example: The Apollo 11 mission landed on the moon on July 20, 1969."
        className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Strong Claims:</h3>
        <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
          <li>Be specific about dates, people, places, and events</li>
          <li>Avoid emotional language or bias</li>
          <li>State facts that can be verified with evidence</li>
          <li>Use clear, unambiguous terminology</li>
        </ul>
      </div>
    </div>
  );

  const renderEvidenceStep = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Step 2: Provide Evidence</h2>
      <p className="text-gray-600 mb-4">
        Enter the evidence that supports your claim. This should be factual information from reliable sources.
      </p>
      <textarea
        value={evidenceText}
        onChange={(e) => setEvidenceText(e.target.value)}
        placeholder="Example: NASA mission transcripts show astronaut Neil Armstrong transmitted 'That's one small step for man' at 02:56 UTC on July 21, 1969. Independent radio tracking stations in Australia and Spain confirmed the transmission originated from the lunar surface."
        className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">⚖️ Federal Rules of Evidence (FRE):</h3>
        <ul className="list-disc list-inside text-yellow-800 space-y-1 text-sm">
          <li><strong>FRE 401:</strong> Evidence must be relevant to the claim</li>
          <li><strong>FRE 602:</strong> Testimony must be from personal knowledge or credible sources</li>
          <li><strong>FRE 801:</strong> Avoid hearsay (secondhand information)</li>
          <li><strong>FRE 901:</strong> Evidence must be authenticated with source metadata</li>
        </ul>
      </div>
    </div>
  );

  const renderSourcesStep = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Step 3: Cite Your Sources</h2>
      <p className="text-gray-600 mb-4">
        Provide information about where your evidence comes from. Original sources are preferred.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source URL or Reference
          </label>
          <input
            type="text"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.nasa.gov/mission_pages/apollo/apollo11.html"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Author or Organization
          </label>
          <input
            type="text"
            value={sourceAuthor}
            onChange={(e) => setSourceAuthor(e.target.value)}
            placeholder="NASA"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Publication Date
          </label>
          <input
            type="date"
            value={sourceDate}
            onChange={(e) => setSourceDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source Type
          </label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="document">Official Document</option>
            <option value="video">Video Recording</option>
            <option value="audio">Audio Recording</option>
            <option value="image">Image/Photo</option>
            <option value="testimony">Testimony</option>
            <option value="publication">Academic Publication</option>
            <option value="news">News Article</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">✅ Best Evidence Rule (FRE 1002):</h3>
        <p className="text-green-800 text-sm">
          Original documents are preferred over copies. Link to primary sources when possible
          (e.g., government archives, court records, academic papers).
        </p>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    if (!validationResult) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Validating your evidence against FRE standards...</p>
          </div>
        </div>
      );
    }

    const { freCompliance, overallScore, suggestions, requiredImprovements } = validationResult;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Step 4: AI Validation Results</h2>

        {/* Overall Score */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Overall Evidence Quality</h3>
              <p className="text-sm text-gray-600 mt-1">
                Based on Federal Rules of Evidence compliance
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">
                {(overallScore * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {overallScore >= 0.95 ? '✅ Excellent' : overallScore >= 0.8 ? '⚠️ Good' : '❌ Needs Work'}
              </div>
            </div>
          </div>
        </div>

        {/* FRE Compliance Breakdown */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 text-lg">Federal Rules Compliance:</h3>

          {renderFRECheck('FRE 401: Relevance', freCompliance.fre401_relevance)}
          {renderFRECheck('FRE 403: Prejudice vs. Probative Value', freCompliance.fre403_prejudice)}
          {renderFRECheck('FRE 602: Personal Knowledge', freCompliance.fre602_personal_knowledge)}
          {renderFREExpertCheck('FRE 702: Expert Testimony', freCompliance.fre702_expert_testimony)}
          {renderFRECheck('FRE 801: Hearsay', freCompliance.fre801_hearsay)}
          {renderFRECheck('FRE 901: Authentication', freCompliance.fre901_authentication)}
          {renderFRECheck('FRE 1002: Best Evidence', freCompliance.fre1002_best_evidence)}
        </div>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">💡 AI Suggestions:</h3>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start text-blue-800 text-sm">
                  <span className="mr-2">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Required Improvements */}
        {requiredImprovements.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-3">⚠️ Required Improvements:</h3>
            <ul className="space-y-2">
              {requiredImprovements.map((improvement, index) => (
                <li key={index} className="flex items-start text-red-800 text-sm">
                  <span className="mr-2">•</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Your Submission:</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Claim:</strong> {claim}</p>
            <p><strong>Evidence:</strong> {evidenceText.substring(0, 150)}...</p>
            <p><strong>Source:</strong> {sourceUrl}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFRECheck = (label: string, check: FRECheck) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-800">{label}</h4>
        <div className="flex items-center">
          <span className="text-sm font-semibold mr-2">
            {(check.score * 100).toFixed(0)}%
          </span>
          <span className={`text-xl ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
            {check.passed ? '✓' : '✗'}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-600">{check.explanation}</p>
    </div>
  );

  const renderFREExpertCheck = (label: string, check: FREExpertCheck) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-800">{label}</h4>
        <span className={`text-xl ${check.passed ? 'text-green-600' : 'text-yellow-600'}`}>
          {check.passed ? '✓' : check.needsExpert ? '⚠️' : '✗'}
        </span>
      </div>
      <p className="text-sm text-gray-600">{check.explanation}</p>
      {check.needsExpert && (
        <p className="text-sm text-yellow-700 mt-2 font-medium">
          Expert testimony may be required for this claim.
        </p>
      )}
    </div>
  );

  // ============================================================================
  // Navigation Buttons
  // ============================================================================

  const renderNavigationButtons = () => (
    <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
      <button
        onClick={onCancel || handleBack}
        disabled={loading || isValidating}
        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {currentStep === 'claim' ? 'Cancel' : 'Back'}
      </button>

      {currentStep === 'review' ? (
        <button
          onClick={handleSubmit}
          disabled={!validationResult || loading}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Evidence
        </button>
      ) : (
        <button
          onClick={handleNext}
          disabled={
            loading ||
            isValidating ||
            (currentStep === 'claim' && !claim.trim()) ||
            (currentStep === 'evidence' && !evidenceText.trim()) ||
            (currentStep === 'sources' && !sourceUrl.trim())
          }
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      )}
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      {renderStepIndicator()}

      <div className="min-h-[400px]">
        {currentStep === 'claim' && renderClaimStep()}
        {currentStep === 'evidence' && renderEvidenceStep()}
        {currentStep === 'sources' && renderSourcesStep()}
        {currentStep === 'review' && renderReviewStep()}
      </div>

      {renderNavigationButtons()}
    </div>
  );
}

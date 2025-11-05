'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EvidenceWizard from '@/components/EvidenceWizard';

export default function EvidenceWizardDemoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(true);
  const [result, setResult] = useState<any>(null);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleComplete = (validationResult: any) => {
    console.log('Validation result:', validationResult);
    setResult(validationResult);
    setShowWizard(false);
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  const handleReset = () => {
    setResult(null);
    setShowWizard(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Evidence Wizard</h1>
              <p className="text-gray-600 mt-1">
                Add evidence-backed claims with AI-powered FRE validation
              </p>
            </div>
            <a
              href="/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">About the Evidence Wizard</h2>
          <p className="text-blue-800 text-sm mb-4">
            The Evidence Wizard guides you through creating evidence-backed claims that comply with the
            Federal Rules of Evidence (FRE). Our AI validates your evidence in real-time against 7 FRE rules:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
            <div>✓ FRE 401: Relevance</div>
            <div>✓ FRE 403: Prejudice vs. Probative Value</div>
            <div>✓ FRE 602: Personal Knowledge</div>
            <div>✓ FRE 702: Expert Testimony</div>
            <div>✓ FRE 801: Hearsay</div>
            <div>✓ FRE 901: Authentication</div>
            <div>✓ FRE 1002: Best Evidence</div>
          </div>
        </div>

        {/* Wizard or Result */}
        {showWizard ? (
          <EvidenceWizard
            graphId="demo-graph-id"
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Validation Complete!</h2>
              <p className="text-gray-600">
                Your evidence has been validated. Score: {result ? (result.overallScore * 100).toFixed(0) : 0}%
              </p>
            </div>

            {result && (
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Summary:</h3>
                  <div className="text-sm text-gray-700">
                    <p><strong>Status:</strong> {result.isValid ? '✅ Valid' : '❌ Needs Improvement'}</p>
                    <p><strong>Overall Score:</strong> {(result.overallScore * 100).toFixed(1)}%</p>
                    <p><strong>Suggestions:</strong> {result.suggestions?.length || 0}</p>
                    <p><strong>Required Improvements:</strong> {result.requiredImprovements?.length || 0}</p>
                  </div>
                </div>

                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">💡 Suggestions:</h3>
                    <ul className="space-y-1 text-sm text-blue-800">
                      {result.suggestions.map((suggestion: string, index: number) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.requiredImprovements && result.requiredImprovements.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-900 mb-2">⚠️ Required Improvements:</h3>
                    <ul className="space-y-1 text-sm text-red-800">
                      {result.requiredImprovements.map((improvement: string, index: number) => (
                        <li key={index}>• {improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Try Another Claim
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Validation</h3>
            <p className="text-sm text-gray-600">
              Advanced AI checks your evidence against Federal Rules of Evidence in real-time.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="font-semibold text-gray-900 mb-2">Guided Workflow</h3>
            <p className="text-sm text-gray-600">
              Step-by-step wizard ensures you provide all necessary information for valid evidence.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="font-semibold text-gray-900 mb-2">Instant Feedback</h3>
            <p className="text-sm text-gray-600">
              Get immediate suggestions and improvements to strengthen your evidence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

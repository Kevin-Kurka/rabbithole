'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TheoryOverlay from '@/components/TheoryOverlay';

export default function TheoryOverlayDemoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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

  const userId = session?.user?.id;

  const handleGraphSelect = (graphId: string) => {
    console.log('Selected graph:', graphId);
    router.push(`/graph?id=${graphId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Theory Overlay</h1>
              <p className="text-gray-600 mt-1">
                Visualize multiple theory layers over Level 0 truth corpus
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">About Theory Overlay</h2>
          <p className="text-gray-700 text-sm mb-4">
            The Theory Overlay system allows you to visualize multiple graph layers simultaneously:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-start">
              <span className="text-green-600 font-bold mr-2">●</span>
              <div>
                <strong>Level 0 (Truth Corpus):</strong> Immutable verified facts with 99%+ consensus
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 font-bold mr-2">●</span>
              <div>
                <strong>Level 1 Theories:</strong> Your working hypotheses that reference Level 0
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-purple-600 font-bold mr-2">●</span>
              <div>
                <strong>Credibility Boost:</strong> Nodes connected to Level 0 gain higher veracity scores
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-orange-600 font-bold mr-2">●</span>
              <div>
                <strong>Multi-Layer View:</strong> Toggle visibility of different theory layers
              </div>
            </div>
          </div>
        </div>

        {/* Theory Overlay Component */}
        <TheoryOverlay userId={userId!} onGraphSelect={handleGraphSelect} />

        {/* Feature Highlights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="font-semibold text-gray-900 mb-2">Color-Coded Layers</h3>
            <p className="text-sm text-gray-600">
              Each theory gets a distinct color for easy identification in the visualization.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-3xl mb-3">👁️</div>
            <h3 className="font-semibold text-gray-900 mb-2">Toggle Visibility</h3>
            <p className="text-sm text-gray-600">
              Show and hide different layers to focus on specific theories or connections.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900 mb-2">Layer Statistics</h3>
            <p className="text-sm text-gray-600">
              View node count, edge count, and average veracity score for each layer.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-12 bg-white rounded-lg p-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">How Theory Overlay Works</h2>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900 mb-1">Select Your Theories</h3>
                <p className="text-sm text-gray-600">
                  From the left panel, choose which theories you want to visualize. You can select multiple theories at once.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900 mb-1">Toggle Level 0</h3>
                <p className="text-sm text-gray-600">
                  Enable or disable the Level 0 truth corpus overlay to see how your theories connect to verified facts.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900 mb-1">Manage Visibility</h3>
                <p className="text-sm text-gray-600">
                  Use the eye icon on each layer to toggle its visibility. Hidden layers won't appear in the graph canvas.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-orange-600 font-bold">4</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900 mb-1">Open for Editing</h3>
                <p className="text-sm text-gray-600">
                  Click "Open Theory" to navigate to the graph canvas where you can edit and expand your selected theory.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Why Use Theory Overlay?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✓ Compare Competing Theories</h3>
              <p>See how different theories explain the same facts and identify contradictions.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✓ Build on Verified Truth</h3>
              <p>Connect your theories to Level 0 nodes to increase credibility and veracity scores.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✓ Identify Gaps</h3>
              <p>Spot missing connections and evidence gaps in your theories.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✓ Collaborate Effectively</h3>
              <p>Share multi-layer views with collaborators to facilitate discussions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

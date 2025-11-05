'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rabbit Hole Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {session?.user?.name || session?.user?.email}
              </p>
            </div>
            <Link
              href="/logout"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Logout
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/graph"
              className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Open Graph</h3>
                  <p className="text-sm text-gray-600">Visualize theories</p>
                </div>
              </div>
            </Link>

            <Link
              href="/demo/evidence-wizard"
              className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Add Evidence</h3>
                  <p className="text-sm text-gray-600">Validate claims with FRE</p>
                </div>
              </div>
            </Link>

            <Link
              href="/ledger"
              className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Public Ledger</h3>
                  <p className="text-sm text-gray-600">View Level 0 promotions</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Feature Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Theory Building */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                🧠
              </span>
              Theory Building
            </h2>
            <div className="space-y-3">
              <Link
                href="/graph"
                className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Graph Canvas</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create and visualize knowledge graphs
                </p>
              </Link>
              <Link
                href="/demo/theory-overlay"
                className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Theory Overlay</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Overlay theories on Level 0 truth corpus
                </p>
              </Link>
              <Link
                href="/demo/evidence-wizard"
                className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Evidence Wizard</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Add evidence with AI validation (FRE compliance)
                </p>
              </Link>
            </div>
          </div>

          {/* Community & Verification */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                ⚖️
              </span>
              Community & Verification
            </h2>
            <div className="space-y-3">
              <Link
                href="/demo/challenge-voting"
                className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Challenge Voting</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Vote on challenges with reputation-weighted consensus
                </p>
              </Link>
              <Link
                href="/curator"
                className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Curator Dashboard</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Review nodes eligible for Level 0 promotion
                </p>
              </Link>
              <Link
                href="/ledger"
                className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Promotion Ledger</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Public audit trail of all Level 0 promotions
                </p>
              </Link>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Level 0: Truth Corpus</h3>
            <p className="text-sm text-green-800">
              Immutable facts verified by 99% community consensus. All theories build on this foundation.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Level 1: Your Theories</h3>
            <p className="text-sm text-blue-800">
              Build and test theories. Connect to Level 0 to boost credibility. Challenge and be challenged.
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">AI-Assisted Research</h3>
            <p className="text-sm text-purple-800">
              GraphRAG semantic search, FRE validation, deduplication, and intelligent suggestions.
            </p>
          </div>
        </div>

        {/* Getting Started */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">Create Your First Theory</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Go to Graph Canvas and start building your knowledge graph. Add nodes and connections.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-semibold">2</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">Add Evidence</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Use the Evidence Wizard to add claims with proper citations. AI validates against Federal Rules of Evidence.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 font-semibold">3</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">Seek Consensus</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Share your theory with the community. Reach 99% consensus to promote nodes to Level 0.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

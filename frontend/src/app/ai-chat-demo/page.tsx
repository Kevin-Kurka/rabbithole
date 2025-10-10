/**
 * AI Chat Demo Page
 *
 * Demonstration and testing page for AIChat component.
 * Shows integration with GraphRAG backend.
 */

'use client';

import React from 'react';
import { GraphWithAIChat } from '@/components/examples/GraphWithAIChat';

export default function AIChatDemoPage() {
  // Mock graph ID - replace with real graph from URL params or state
  const graphId = 'demo-graph-id';
  const methodologyId = '5-whys'; // Example methodology

  return (
    <div className="w-full h-screen">
      <GraphWithAIChat graphId={graphId} methodologyId={methodologyId} />
    </div>
  );
}

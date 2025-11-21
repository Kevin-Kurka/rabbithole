#!/bin/bash

# Script to update all imports after renaming PascalCase files to kebab-case

set -e

cd "$(dirname "$0")/.."

echo "=== Updating Import Statements ==="

# Function to update imports in all TypeScript/JavaScript files
update_imports() {
  local old_name="$1"
  local new_name="$2"

  echo "Updating imports: $old_name -> $new_name"

  # Find all TS/TSX/JS/JSX files and update imports
  find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    -exec sed -i '' "s|from ['\"]@/components/${old_name}['\"]|from '@/components/${new_name}'|g" {} \;

  find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    -exec sed -i '' "s|from ['\"]\\.\\./${old_name}['\"]|from '../${new_name}'|g" {} \;

  find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    -exec sed -i '' "s|from ['\"]\\.\\./${old_name}['\"]|from './${new_name}'|g" {} \;
}

# Component renames (removing .tsx extension from import paths)
update_imports "AIAssistantFAB" "ai-assistant-fab"
update_imports "AIAssistantPanel" "ai-assistant-panel"
update_imports "AIChat" "ai-chat"
update_imports "ChallengeCard" "challenge-card"
update_imports "ChallengeForm" "challenge-form"
update_imports "ChallengeHistory" "challenge-history"
update_imports "ChallengePanel" "challenge-panel"
update_imports "ChallengeVotingWidget" "challenge-voting-widget"
update_imports "Chat" "in-graph-chat"
update_imports "ClusterView" "cluster-view"
update_imports "CollaborationPanel" "collaboration-panel"
update_imports "CommandMenu" "command-menu"
update_imports "ConsensusVotingWidget" "consensus-voting-widget"
update_imports "ContextMenu" "context-menu"
update_imports "CustomNode" "custom-node"
update_imports "EnhancedGraphCanvas" "enhanced-graph-canvas"
update_imports "ErrorBoundary" "error-boundary"
update_imports "FileViewerExample" "file-viewer-example"
update_imports "FileViewerSidebar" "file-viewer-sidebar"
update_imports "FilterPanel" "filter-panel"
update_imports "GraphCanvas" "graph-canvas"
update_imports "GraphEdge" "graph-edge"
update_imports "GraphNode" "graph-node"
update_imports "GraphSidebar" "graph-sidebar"
update_imports "LayoutControls" "layout-controls"
update_imports "LoadingStates" "loading-states"
update_imports "LoginDialog" "login-dialog"
update_imports "MethodologyProgressPanel" "methodology-progress-panel"
update_imports "MethodologySelector" "methodology-selector"
update_imports "Navigation" "navigation"
update_imports "NotificationBell" "notification-bell"
update_imports "PerformanceMonitor" "performance-monitor"
update_imports "PromotionEligibilityBadge" "promotion-eligibility-badge"
update_imports "PromotionEligibilityDashboard" "promotion-eligibility-dashboard"
update_imports "PromotionLedgerTable" "promotion-ledger-table"
update_imports "RemoteCursor" "remote-cursor"
update_imports "ReputationBadge" "reputation-badge"
update_imports "ThreadedComments" "threaded-comments"
update_imports "TimelineView" "timeline-view"
update_imports "VeracityBadge" "veracity-badge"
update_imports "VeracityBreakdown" "veracity-breakdown"
update_imports "VeracityIndicator" "veracity-indicator"
update_imports "VeracityPanel" "veracity-panel"
update_imports "VeracityTimeline" "veracity-timeline"
update_imports "VisualizationControls" "visualization-controls"

echo ""
echo "✅ Import paths updated!"
echo ""
echo "⚠️  Please review changes with: git diff"
echo "    Then test with: npm run build"

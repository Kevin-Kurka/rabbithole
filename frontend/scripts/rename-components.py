#!/usr/bin/env python3

import os
import subprocess
import sys

# Component file renames (PascalCase -> kebab-case)
COMPONENT_RENAMES = {
    "AIAssistantFAB.tsx": "ai-assistant-fab.tsx",
    "AIAssistantPanel.tsx": "ai-assistant-panel.tsx",
    "AIChat.tsx": "ai-chat.tsx",
    "ChallengeCard.tsx": "challenge-card.tsx",
    "ChallengeForm.tsx": "challenge-form.tsx",
    "ChallengeHistory.tsx": "challenge-history.tsx",
    "ChallengePanel.tsx": "challenge-panel.tsx",
    "ChallengeVotingWidget.tsx": "challenge-voting-widget.tsx",
    "Chat.tsx": "in-graph-chat.tsx",
    "ClusterView.tsx": "cluster-view.tsx",
    "CollaborationPanel.tsx": "collaboration-panel.tsx",
    "CommandMenu.tsx": "command-menu.tsx",
    "ConsensusVotingWidget.tsx": "consensus-voting-widget.tsx",
    "ContextMenu.tsx": "context-menu.tsx",
    "CustomNode.tsx": "custom-node.tsx",
    "EnhancedGraphCanvas.tsx": "enhanced-graph-canvas.tsx",
    "ErrorBoundary.tsx": "error-boundary.tsx",
    "FileViewerExample.tsx": "file-viewer-example.tsx",
    "FileViewerSidebar.tsx": "file-viewer-sidebar.tsx",
    "FilterPanel.tsx": "filter-panel.tsx",
    "GraphCanvas.tsx": "graph-canvas.tsx",
    "GraphEdge.tsx": "graph-edge.tsx",
    "GraphNode.tsx": "graph-node.tsx",
    "GraphSidebar.tsx": "graph-sidebar.tsx",
    "LayoutControls.tsx": "layout-controls.tsx",
    "LoadingStates.tsx": "loading-states.tsx",
    "LoginDialog.tsx": "login-dialog.tsx",
    "MethodologyProgressPanel.tsx": "methodology-progress-panel.tsx",
    "MethodologySelector.tsx": "methodology-selector.tsx",
    "Navigation.tsx": "navigation.tsx",
    "NotificationBell.tsx": "notification-bell.tsx",
    "PerformanceMonitor.tsx": "performance-monitor.tsx",
    "PromotionEligibilityBadge.tsx": "promotion-eligibility-badge.tsx",
    "PromotionEligibilityDashboard.tsx": "promotion-eligibility-dashboard.tsx",
    "PromotionLedgerTable.tsx": "promotion-ledger-table.tsx",
    "RemoteCursor.tsx": "remote-cursor.tsx",
    "ReputationBadge.tsx": "reputation-badge.tsx",
    "ThreadedComments.tsx": "threaded-comments.tsx",
    "TimelineView.tsx": "timeline-view.tsx",
    "VeracityBadge.tsx": "veracity-badge.tsx",
    "VeracityBreakdown.tsx": "veracity-breakdown.tsx",
    "VeracityIndicator.tsx": "veracity-indicator.tsx",
    "VeracityPanel.tsx": "veracity-panel.tsx",
    "VeracityTimeline.tsx": "veracity-timeline.tsx",
    "VisualizationControls.tsx": "visualization-controls.tsx",
}

# Story file renames
STORY_RENAMES = {
    "ChallengeCard.stories.tsx": "challenge-card.stories.tsx",
    "ChallengePanel.stories.tsx": "challenge-panel.stories.tsx",
    "ChallengeVotingWidget.stories.tsx": "challenge-voting-widget.stories.tsx",
    "GraphCanvas.stories.tsx": "graph-canvas.stories.tsx",
    "MethodologyProgressPanel.stories.tsx": "methodology-progress-panel.stories.tsx",
    "MethodologySelector.stories.tsx": "methodology-selector.stories.tsx",
    "PromotionEligibilityBadge.stories.tsx": "promotion-eligibility-badge.stories.tsx",
    "PromotionEligibilityDashboard.stories.tsx": "promotion-eligibility-dashboard.stories.tsx",
    "ReputationBadge.stories.tsx": "reputation-badge.stories.tsx",
    "ConsensusVotingWidget.stories.tsx": "consensus-voting-widget.stories.tsx",
    "CollaborationPanel.stories.tsx": "collaboration-panel.stories.tsx",
    "VeracityBadge.stories.tsx": "veracity-badge.stories.tsx",
    "VeracityBreakdown.stories.tsx": "veracity-breakdown.stories.tsx",
    "VeracityTimeline.stories.tsx": "veracity-timeline.stories.tsx",
}

def main():
    # Change to components directory
    os.chdir("src/components")

    print("=== Renaming Component Files ===")
    for old_name, new_name in sorted(COMPONENT_RENAMES.items()):
        if os.path.exists(old_name):
            try:
                result = subprocess.run(["git", "mv", old_name, new_name],
                                      capture_output=True, text=True, check=True)
                print(f"✓ {old_name} → {new_name}")
            except subprocess.CalledProcessError as e:
                print(f"✗ Failed to rename {old_name}: {e.stderr}")
        else:
            print(f"⊘ Skipping (not found): {old_name}")

    print("\n=== Renaming Story Files ===")
    for old_name, new_name in sorted(STORY_RENAMES.items()):
        if os.path.exists(old_name):
            try:
                result = subprocess.run(["git", "mv", old_name, new_name],
                                      capture_output=True, text=True, check=True)
                print(f"✓ {old_name} → {new_name}")
            except subprocess.CalledProcessError as e:
                print(f"✗ Failed to rename {old_name}: {e.stderr}")
        else:
            print(f"⊘ Skipping (not found): {old_name}")

    print("\n✅ File renaming complete!")
    print("\n⚠️  IMPORTANT: Run ./scripts/update-imports.sh to fix all import paths")

if __name__ == "__main__":
    main()

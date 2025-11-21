#!/usr/bin/env python3

import os
import re
from pathlib import Path

# Mapping of old names (without extension) to new names (without extension)
RENAMES = {
    "AIAssistantFAB": "ai-assistant-fab",
    "AIAssistantPanel": "ai-assistant-panel",
    "AIChat": "ai-chat",
    "ChallengeCard": "challenge-card",
    "ChallengeForm": "challenge-form",
    "ChallengeHistory": "challenge-history",
    "ChallengePanel": "challenge-panel",
    "ChallengeVotingWidget": "challenge-voting-widget",
    "Chat": "in-graph-chat",
    "ClusterView": "cluster-view",
    "CollaborationPanel": "collaboration-panel",
    "CommandMenu": "command-menu",
    "ConsensusVotingWidget": "consensus-voting-widget",
    "ContextMenu": "context-menu",
    "CustomNode": "custom-node",
    "EnhancedGraphCanvas": "enhanced-graph-canvas",
    "ErrorBoundary": "error-boundary",
    "FileViewerExample": "file-viewer-example",
    "FileViewerSidebar": "file-viewer-sidebar",
    "FilterPanel": "filter-panel",
    "GraphCanvas": "graph-canvas",
    "GraphEdge": "graph-edge",
    "GraphNode": "graph-node",
    "GraphSidebar": "graph-sidebar",
    "LayoutControls": "layout-controls",
    "LoadingStates": "loading-states",
    "LoginDialog": "login-dialog",
    "MethodologyProgressPanel": "methodology-progress-panel",
    "MethodologySelector": "methodology-selector",
    "Navigation": "navigation",
    "NotificationBell": "notification-bell",
    "PerformanceMonitor": "performance-monitor",
    "PromotionEligibilityBadge": "promotion-eligibility-badge",
    "PromotionEligibilityDashboard": "promotion-eligibility-dashboard",
    "PromotionLedgerTable": "promotion-ledger-table",
    "RemoteCursor": "remote-cursor",
    "ReputationBadge": "reputation-badge",
    "ThreadedComments": "threaded-comments",
    "TimelineView": "timeline-view",
    "VeracityBadge": "veracity-badge",
    "VeracityBreakdown": "veracity-breakdown",
    "VeracityIndicator": "veracity-indicator",
    "VeracityPanel": "veracity-badge",
    "VeracityTimeline": "veracity-timeline",
    "VisualizationControls": "visualization-controls",
}

def update_file(filepath):
    """Update import statements in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        modified = False

        for old_name, new_name in RENAMES.items():
            # Pattern 1: from '@/components/OldName'
            pattern1 = rf"(from\s+['\"]@/components/){old_name}(['\"])"
            if re.search(pattern1, content):
                content = re.sub(pattern1, rf"\1{new_name}\2", content)
                modified = True

            # Pattern 2: from '../OldName' or './OldName'
            pattern2 = rf"(from\s+['\"]\.+/){old_name}(['\"])"
            if re.search(pattern2, content):
                content = re.sub(pattern2, rf"\1{new_name}\2", content)
                modified = True

            # Pattern 3: import('OldName')
            pattern3 = rf"(import\(['\"]@/components/){old_name}(['\"])"
            if re.search(pattern3, content):
                content = re.sub(pattern3, rf"\1{new_name}\2", content)
                modified = True

            # Pattern 4: import('../../OldName')
            pattern4 = rf"(import\(['\"]\.+/){old_name}(['\"])"
            if re.search(pattern4, content):
                content = re.sub(pattern4, rf"\1{new_name}\2", content)
                modified = True

        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False

    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False

def main():
    os.chdir("/Users/kmk/rabbithole/frontend")

    print("=== Updating Import Statements ===\n")

    # Find all TypeScript/JavaScript files
    extensions = ['*.ts', '*.tsx', '*.js', '*.jsx']
    files_to_check = []

    for ext in extensions:
        files_to_check.extend(Path('src').rglob(ext))

    updated_count = 0
    total_count = len(files_to_check)

    for filepath in files_to_check:
        if update_file(filepath):
            print(f"✓ Updated: {filepath}")
            updated_count += 1

    print(f"\n✅ Import update complete!")
    print(f"   Updated {updated_count} of {total_count} files")
    print(f"\n⚠️  Please review changes with: git diff")
    print(f"   Then test with: npm run build")

if __name__ == "__main__":
    main()

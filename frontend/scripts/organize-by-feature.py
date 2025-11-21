#!/usr/bin/env python3

import os
import subprocess

# Component organization by feature
# Format: "current_filename.tsx": "target_directory"

COMPONENT_MOVES = {
    # AI Assistant
    "ai-assistant-fab.tsx": "ai-assistant",
    "ai-assistant-panel.tsx": "ai-assistant",
    "ai-chat.tsx": "ai-assistant",

    # Credibility/Veracity System
    "credibility-badge.tsx": "credibility",
    "veracity-badge.tsx": "credibility",
    "veracity-panel.tsx": "credibility",
    "veracity-timeline.tsx": "credibility",
    "veracity-breakdown.tsx": "credibility",
    "veracity-indicator.tsx": "credibility",

    # Promotion System
    "promotion-eligibility-badge.tsx": "promotion",
    "promotion-eligibility-dashboard.tsx": "promotion",
    "consensus-voting-widget.tsx": "promotion",
    "promotion-ledger-table.tsx": "promotion",
    "methodology-progress-panel.tsx": "promotion",

    # Media System
    "media-upload-dialog.tsx": "media",
    "media-processing-status.tsx": "media",
    "file-upload-button.tsx": "media",
    "file-attachment-list.tsx": "media",
    "media-library-integration.tsx": "media",
    "universal-file-viewer.tsx": "media",
    "file-viewer-example.tsx": "media",
    "file-viewer-sidebar.tsx": "media",

    # Collaboration System
    "collaboration-panel.tsx": "collaboration",
    "remote-cursor.tsx": "collaboration",
    "in-graph-chat.tsx": "collaboration",
    "chat-sidebar.tsx": "collaboration",
    "chat-input.tsx": "collaboration",
    "chat-message.tsx": "collaboration",
    "threaded-comments.tsx": "collaboration",
    "activity-feed.tsx": "collaboration",
    "activity-post.tsx": "collaboration",
    "post-composer.tsx": "collaboration",

    # Visualization System
    "cluster-view.tsx": "visualization",
    "timeline-view.tsx": "visualization",
    "visualization-controls.tsx": "visualization",
    "layout-controls.tsx": "visualization",

    # Methodology System
    "methodology-selector.tsx": "methodology",

    # Shared/Utility Components
    "error-boundary.tsx": "shared",
    "loading-states.tsx": "shared",
    "performance-monitor.tsx": "shared",
    "command-menu.tsx": "shared",
    "context-menu.tsx": "shared",
    "notification-bell.tsx": "shared",
    "node-mention-combobox.tsx": "shared",
    "node-link-combobox.tsx": "shared",
    "node-link-card.tsx": "shared",
    "text-selection-menu.tsx": "shared",
    "navigation.tsx": "shared",

    # Forms
    "markdown-editor.tsx": "forms",
    "add-comment-dialog.tsx": "forms",
    "add-reference-dialog.tsx": "forms",
    "create-article-dialog.tsx": "forms",
    "create-node-relationship-dialog.tsx": "forms",
    "upload-file-dialog.tsx": "forms",
    "ai-reference-processor-dialog.tsx": "forms",
    "login-dialog.tsx": "forms",

    # Content Components
    "enriched-content.tsx": "content",
    "article-with-badges.tsx": "content",
    "image-carousel.tsx": "content",
}

# Also move corresponding .stories.tsx files
STORY_MOVES = {
    "ai-assistant-panel.stories.tsx": "ai-assistant",
    "ai-chat.stories.tsx": "ai-assistant",
    "veracity-badge.stories.tsx": "credibility",
    "veracity-breakdown.stories.tsx": "credibility",
    "veracity-timeline.stories.tsx": "credibility",
    "promotion-eligibility-badge.stories.tsx": "promotion",
    "promotion-eligibility-dashboard.stories.tsx": "promotion",
    "consensus-voting-widget.stories.tsx": "promotion",
    "methodology-progress-panel.stories.tsx": "promotion",
    "collaboration-panel.stories.tsx": "collaboration",
    "methodology-selector.stories.tsx": "methodology",
}

def main():
    os.chdir("/Users/kmk/rabbithole/frontend/src/components")

    print("=== Moving Components to Feature Folders ===\n")

    moved_count = 0
    skipped_count = 0

    # Move component files
    for filename, target_dir in sorted(COMPONENT_MOVES.items()):
        if os.path.exists(filename):
            target_path = f"{target_dir}/{filename}"
            try:
                result = subprocess.run(
                    ["git", "mv", filename, target_path],
                    capture_output=True, text=True, check=True
                )
                print(f"✓ {filename} → {target_dir}/")
                moved_count += 1
            except subprocess.CalledProcessError as e:
                print(f"✗ Failed to move {filename}: {e.stderr}")
        else:
            print(f"⊘ Skipping (not found): {filename}")
            skipped_count += 1

    # Move story files
    print("\n=== Moving Story Files ===\n")
    for filename, target_dir in sorted(STORY_MOVES.items()):
        if os.path.exists(filename):
            target_path = f"{target_dir}/{filename}"
            try:
                result = subprocess.run(
                    ["git", "mv", filename, target_path],
                    capture_output=True, text=True, check=True
                )
                print(f"✓ {filename} → {target_dir}/")
                moved_count += 1
            except subprocess.CalledProcessError as e:
                print(f"✗ Failed to move {filename}: {e.stderr}")
        else:
            print(f"⊘ Skipping (not found): {filename}")
            skipped_count += 1

    print(f"\n✅ Component organization complete!")
    print(f"   Moved: {moved_count} files")
    print(f"   Skipped: {skipped_count} files (not found)")
    print(f"\n⚠️  Next steps:")
    print(f"   1. Create index.ts barrel exports for each feature")
    print(f"   2. Update imports across codebase")
    print(f"   3. Test build")

if __name__ == "__main__":
    main()

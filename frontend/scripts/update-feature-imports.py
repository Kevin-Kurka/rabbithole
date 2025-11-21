#!/usr/bin/env python3
"""
Update imports to use new feature-based paths after Phase 2 reorganization.
Maps old flat component paths to new feature directory structure.
"""

import os
import re
from pathlib import Path

# Mapping of component files to their new feature directories
PATH_UPDATES = {
    # AI Assistant (3 components)
    "ai-assistant-fab": "ai-assistant/ai-assistant-fab",
    "ai-assistant-panel": "ai-assistant/ai-assistant-panel",
    "ai-chat": "ai-assistant/ai-chat",

    # Credibility/Veracity System (6 components)
    "credibility-badge": "credibility/credibility-badge",
    "veracity-badge": "credibility/veracity-badge",
    "veracity-panel": "credibility/veracity-panel",
    "veracity-timeline": "credibility/veracity-timeline",
    "veracity-breakdown": "credibility/veracity-breakdown",
    "veracity-indicator": "credibility/veracity-indicator",

    # Promotion System (5 components)
    "promotion-eligibility-badge": "promotion/promotion-eligibility-badge",
    "promotion-eligibility-dashboard": "promotion/promotion-eligibility-dashboard",
    "consensus-voting-widget": "promotion/consensus-voting-widget",
    "promotion-ledger-table": "promotion/promotion-ledger-table",
    "methodology-progress-panel": "promotion/methodology-progress-panel",

    # Media System (8 components)
    "media-upload-dialog": "media/media-upload-dialog",
    "media-processing-status": "media/media-processing-status",
    "file-upload-button": "media/file-upload-button",
    "file-attachment-list": "media/file-attachment-list",
    "media-library-integration": "media/media-library-integration",
    "universal-file-viewer": "media/universal-file-viewer",
    "file-viewer-example": "media/file-viewer-example",
    "file-viewer-sidebar": "media/file-viewer-sidebar",

    # Collaboration System (10 components)
    "collaboration-panel": "collaboration/collaboration-panel",
    "remote-cursor": "collaboration/remote-cursor",
    "in-graph-chat": "collaboration/in-graph-chat",
    "chat-sidebar": "collaboration/chat-sidebar",
    "chat-input": "collaboration/chat-input",
    "chat-message": "collaboration/chat-message",
    "threaded-comments": "collaboration/threaded-comments",
    "activity-feed": "collaboration/activity-feed",
    "activity-post": "collaboration/activity-post",
    "post-composer": "collaboration/post-composer",

    # Visualization System (4 components)
    "cluster-view": "visualization/cluster-view",
    "timeline-view": "visualization/timeline-view",
    "visualization-controls": "visualization/visualization-controls",
    "layout-controls": "visualization/layout-controls",

    # Methodology System (1 component)
    "methodology-selector": "methodology/methodology-selector",

    # Shared Utilities (11 components)
    "badge-system": "shared/badge-system",
    "theme-toggle": "shared/theme-toggle",
    "logo": "shared/logo",
    "loading-spinner": "shared/loading-spinner",
    "error-boundary": "shared/error-boundary",
    "keyboard-shortcuts": "shared/keyboard-shortcuts",
    "search-bar": "shared/search-bar",
    "filter-panel": "shared/filter-panel",
    "sort-controls": "shared/sort-controls",
    "pagination": "shared/pagination",
    "confirmation-dialog": "shared/confirmation-dialog",

    # Forms (8 components)
    "node-form": "forms/node-form",
    "edge-form": "forms/edge-form",
    "evidence-form": "forms/evidence-form",
    "citation-form": "forms/citation-form",
    "hypothesis-form": "forms/hypothesis-form",
    "inquiry-form": "forms/inquiry-form",
    "amendment-form": "forms/amendment-form",
    "challenge-form": "forms/challenge-form",

    # Content (3 components)
    "enriched-content": "content/enriched-content",
    "markdown-renderer": "content/markdown-renderer",
    "article-with-badges": "content/article-with-badges",
}

def update_file(filepath):
    """Update import paths in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        updated_count = 0

        for old_path, new_path in PATH_UPDATES.items():
            # Pattern 1: Absolute imports from @/components/old-path
            pattern1 = rf"(from\s+['\"]@/components/){old_path}(['\"])"
            new_content = re.sub(pattern1, rf"\1{new_path}\2", content)
            if new_content != content:
                updated_count += 1
                content = new_content

            # Pattern 2: Relative imports from ../old-path or ./old-path
            pattern2 = rf"(from\s+['\"]\.+/){old_path}(['\"])"
            new_content = re.sub(pattern2, rf"\1{new_path}\2", content)
            if new_content != content:
                updated_count += 1
                content = new_content

            # Pattern 3: Dynamic imports
            pattern3 = rf"(import\(['\"]@/components/){old_path}(['\"])"
            new_content = re.sub(pattern3, rf"\1{new_path}\2", content)
            if new_content != content:
                updated_count += 1
                content = new_content

        # Only write if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return updated_count

        return 0

    except Exception as e:
        print(f"  ⚠️  Error processing {filepath}: {e}")
        return 0

def main():
    """Update all TypeScript files in src/ directory."""
    os.chdir(Path(__file__).parent.parent)  # Move to frontend/

    print("🔄 Updating imports to use new feature-based paths...\n")

    files_updated = 0
    total_updates = 0

    # Find all TypeScript files in src/
    for root, dirs, files in os.walk("src"):
        # Skip node_modules
        if 'node_modules' in dirs:
            dirs.remove('node_modules')

        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                update_count = update_file(filepath)

                if update_count > 0:
                    files_updated += 1
                    total_updates += update_count
                    print(f"✓ {filepath}: {update_count} import(s) updated")

    print(f"\n✅ Complete!")
    print(f"   Files updated: {files_updated}")
    print(f"   Total imports fixed: {total_updates}")

if __name__ == "__main__":
    main()

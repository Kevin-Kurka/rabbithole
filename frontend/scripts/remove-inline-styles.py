#!/usr/bin/env python3
"""Remove common inline styles that can be replaced with Tailwind classes."""

import os
import re
from pathlib import Path

def remove_border_width_styles(content):
    """Remove style={{ borderWidth: '1px' }} - already handled by border class."""
    # Pattern: style={{ borderWidth: '1px' }}
    content = re.sub(r'\s*style=\{\{\s*borderWidth:\s*["\']1px["\']\s*\}\}', '', content)
    return content

def update_file(filepath):
    """Update inline styles in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        
        # Remove borderWidth: '1px' styles
        content = remove_border_width_styles(content)

        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False

    except Exception as e:
        print(f"  ⚠️  Error: {e}")
        return False

def main():
    """Update all component files."""
    os.chdir(Path(__file__).parent.parent)

    print("🔄 Removing unnecessary inline styles...\n")

    files_updated = 0

    # Target files with inline styles
    target_files = [
        "src/components/credibility/credibility-badge.tsx",
        "src/components/promotion/promotion-eligibility-badge.tsx",
        "src/components/promotion/consensus-voting-widget.tsx",
        "src/components/promotion/methodology-progress-panel.tsx",
    ]

    for filepath in target_files:
        if os.path.exists(filepath):
            if update_file(filepath):
                files_updated += 1
                print(f"✓ {filepath}")

    print(f"\n✅ Complete! Files updated: {files_updated}")

if __name__ == "__main__":
    main()

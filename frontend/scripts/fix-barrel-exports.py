#!/usr/bin/env python3
"""Fix barrel export paths that have incorrect nested directories."""

import os
import re
from pathlib import Path

FILES_TO_FIX = {
    "src/components/ai-assistant/index.ts": [
        ("./ai-assistant/", "./"),
    ],
    "src/components/collaboration/index.ts": [
        ("./collaboration/", "./"),
    ],
    "src/components/media/index.ts": [
        ("./media/", "./"),
    ],
    "src/components/promotion/index.ts": [
        ("./promotion/", "./"),
    ],
    "src/components/credibility/index.ts": [
        ("./credibility/", "./"),
    ],
}

def fix_file(filepath, replacements):
    """Fix export paths in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        for old_path, new_path in replacements:
            content = content.replace(f"from '{old_path}", f"from '{new_path}")

        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False

    except Exception as e:
        print(f"  ⚠️  Error: {e}")
        return False

def main():
    """Fix all barrel export files."""
    os.chdir(Path(__file__).parent.parent)

    print("🔄 Fixing barrel export paths...\n")

    files_updated = 0

    for filepath, replacements in FILES_TO_FIX.items():
        if os.path.exists(filepath):
            if fix_file(filepath, replacements):
                files_updated += 1
                print(f"✓ {filepath}")

    print(f"\n✅ Complete! Files updated: {files_updated}")

if __name__ == "__main__":
    main()

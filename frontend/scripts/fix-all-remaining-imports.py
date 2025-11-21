#!/usr/bin/env python3
"""Fix all remaining import issues after reorganization."""

import os
import re
from pathlib import Path

# Map of old paths to new feature paths
FIXES = [
    # Forms
    ('@/components/create-article-dialog', '@/components/forms'),
    ('@/components/login-dialog', '@/components/forms'),
    
    # Shared - relative import fix
    ('./create-node-relationship-dialog', '../forms/create-node-relationship-dialog'),
]

def update_file(filepath):
    """Update import paths in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        for old_path, new_path in FIXES:
            # For @/components paths, extract component name and update
            if old_path.startswith('@/components/'):
                component_name = old_path.split('/')[-1]
                pascal_name = ''.join(word.capitalize() for word in component_name.split('-'))
                
                # Pattern: import { ComponentName } from 'old-path'
                pattern = rf"import\s+\{{\s*{pascal_name}\s*\}}\s+from\s+['\"]" + re.escape(old_path) + r"['\"]"
                replacement = f"import {{ {pascal_name} }} from '{new_path}'"
                content = re.sub(pattern, replacement, content)
            else:
                # Relative path - just replace directly
                pattern = rf"import\s+\{{\s*([^}}]+)\s*\}}\s+from\s+['\"]" + re.escape(old_path) + r"['\"]"
                replacement = rf"import {{ \1 }} from '{new_path}'"
                content = re.sub(pattern, replacement, content)

        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False

    except Exception as e:
        print(f"  ⚠️  Error: {e}")
        return False

def main():
    """Update all TypeScript files."""
    os.chdir(Path(__file__).parent.parent)

    print("🔄 Fixing all remaining imports...\n")

    files_updated = 0

    for root, dirs, files in os.walk("src"):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')

        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                if update_file(filepath):
                    files_updated += 1
                    print(f"✓ {filepath}")

    print(f"\n✅ Complete! Files updated: {files_updated}")

if __name__ == "__main__":
    main()

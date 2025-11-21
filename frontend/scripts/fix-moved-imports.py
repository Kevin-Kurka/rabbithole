#!/usr/bin/env python3
"""Fix imports for components that were moved to feature directories."""

import os
import re
from pathlib import Path

# Map of old paths to new feature paths
IMPORT_FIXES = {
    # Challenge components
    "@/components/challenge-card": "@/components/challenges",
    "@/components/challenge-form": "@/components/challenges",
    "@/components/challenge-history": "@/components/challenges",
    "@/components/challenge-panel": "@/components/challenges",
    "@/components/challenge-voting-widget": "@/components/challenges",
    
    # Graph components
    "@/components/enhanced-graph-canvas": "@/components/graph/enhanced-graph-canvas",
    "@/components/custom-node": "@/components/graph/custom-node",
    
    # Panel components
    "@/components/context-panel": "@/components/panels",
    "@/components/filter-panel": "@/components/panels",
    "@/components/graph-sidebar": "@/components/panels",
    
    # Badge
    "@/components/reputation-badge": "@/components/credibility",
    
    # Providers
    "@/components/providers": "@/components/layout/providers",
    "@/components/theme-provider": "@/components/layout/theme-provider",
}

def update_file(filepath):
    """Update import paths in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        
        for old_path, new_path in IMPORT_FIXES.items():
            # Extract component name from old path
            component_name = old_path.split('/')[-1]
            # Convert kebab-case to PascalCase for named import
            pascal_name = ''.join(word.capitalize() for word in component_name.split('-'))
            
            # Pattern: import { ComponentName } from 'old-path'
            pattern = rf"import\s+\{{\s*([^}}]*{pascal_name}[^}}]*)\s*\}}\s+from\s+['\"]" + re.escape(old_path) + r"['\"]"
            replacement = rf"import {{ \1 }} from '{new_path}'"
            content = re.sub(pattern, replacement, content)
            
            # Pattern: default imports
            pattern2 = rf"import\s+{pascal_name}\s+from\s+['\"]" + re.escape(old_path) + r"['\"]"
            replacement2 = f"import {pascal_name} from '{new_path}'"
            content = re.sub(pattern2, replacement2, content)

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

    print("🔄 Fixing imports for moved components...\n")

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

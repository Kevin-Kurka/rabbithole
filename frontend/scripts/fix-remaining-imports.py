#!/usr/bin/env python3
"""Fix remaining imports that reference components now in feature directories."""

import os
import re
from pathlib import Path

# Components that are now in feature directories (via barrel exports)
IMPORT_FIXES = {
    # Forms directory (via forms/index.ts)
    "@/components/add-comment-dialog": "@/components/forms",
    "@/components/add-reference-dialog": "@/components/forms",
    "@/components/upload-file-dialog": "@/components/forms",
    "@/components/ai-reference-processor-dialog": "@/components/forms",
    
    # Shared directory (via shared/index.ts)
    "@/components/node-link-combobox": "@/components/shared",
    "@/components/text-selection-menu": "@/components/shared",
    
    # Content directory (via content/index.ts)
    "@/components/citation-panel": "@/components/content",
    "@/components/amendment-dialog": "@/components/content",
    "@/components/node-detail-dialog": "@/components/content",
    "@/components/veracity-form": "@/components/credibility",
}

def update_file(filepath):
    """Update import paths in a single file."""
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
            pattern = rf"import\s+\{{\s*{pascal_name}\s*\}}\s+from\s+['\"]" + re.escape(old_path) + r"['\"]"
            replacement = f"import {{ {pascal_name} }} from '{new_path}'"
            
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                content = new_content
                print(f"  Fixed: {pascal_name} → {new_path}")

        # Only write if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False

    except Exception as e:
        print(f"  ⚠️  Error processing {filepath}: {e}")
        return False

def main():
    """Update all TypeScript files."""
    os.chdir(Path(__file__).parent.parent)  # Move to frontend/

    print("🔄 Fixing remaining imports...\n")

    files_updated = 0

    # Find all TypeScript files in src/
    for root, dirs, files in os.walk("src"):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')

        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                if update_file(filepath):
                    files_updated += 1
                    print(f"✓ {filepath}\n")

    print(f"✅ Complete! Files updated: {files_updated}")

if __name__ == "__main__":
    main()

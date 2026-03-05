import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content
    
    # 1. Ensure Item is imported if used but missing in lib/types import
    if re.search(r'\bItem\b', content) and not re.search(r'\bItem\b', re.search(r'from\s+[\'"]@/lib/types[\'"]', content or '').string or ''):
        new_content = re.sub(
            r'import\s+\{([^}]*)\bLegacyItem\b([^}]*)\}\s+from\s+[\'"]@/lib/types[\'"]',
            r'import {\1Item, LegacyItem\2} from "@/lib/types"',
            new_content
        )
    
    # 2. Ensure ItemType is imported if used
    if re.search(r'\bItemType\b', content) and not re.search(r'\bItemType\b', re.search(r'from\s+[\'"]@/lib/types[\'"]', content or '').string or ''):
         new_content = re.sub(
            r'import\s+\{([^}]*)\bLegacyItem\b([^}]*)\}\s+from\s+[\'"]@/lib/types[\'"]',
            r'import {\1ItemType, LegacyItem\2} from "@/lib/types"',
            new_content
        )

    # 3. Clean up duplicate Item/LegacyItem in same import
    new_content = re.sub(r'Item,\s*Item', 'Item', new_content)
    new_content = re.sub(r'ItemType,\s*ItemType', 'ItemType', new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed imports in {filepath}")

dirs_to_process = ['./components', './lib', './app']
for d in dirs_to_process:
    if not os.path.exists(d): continue
    for root, _, files in os.walk(d):
        if 'node_modules' in root or '.git' in root or '.next' in root or '.gemini' in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                process_file(os.path.join(root, file))

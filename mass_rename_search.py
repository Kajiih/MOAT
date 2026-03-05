import os
import re

replacements = {
    r'\bSearchPanelV2\b': 'SearchPanel',
    r'\bSearchTabV2\b': 'SearchTab',
    r'\bFilterPanelV2\b': 'FilterPanel',
    r'\buseDatabaseSearch\b': 'useItemSearch',
    r'\bSearchTabV2Props\b': 'SearchTabProps',
    r'\bSearchPanelV2Props\b': 'SearchPanelProps',
    r'\bFilterPanelV2Props\b': 'FilterPanelProps'
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = re.sub(old, new, new_content)
        
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

# Only process relevant directories to save time
dirs_to_process = ['./components', './lib', './app']
for d in dirs_to_process:
    if not os.path.exists(d): continue
    for root, _, files in os.walk(d):
        if 'node_modules' in root or '.git' in root or '.next' in root or '.gemini' in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.md')):
                process_file(os.path.join(root, file))

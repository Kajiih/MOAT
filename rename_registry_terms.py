import os
import re

replacements = {
    r'\bMediaTypeRegistry\b': 'ItemTypeRegistry',
    r'\bMediaTypeDefinition\b': 'ItemTypeDefinition',
    r'\bmediaTypeRegistry\b': 'itemTypeRegistry',
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

dirs_to_process = ['./v1/lib/item-types', './v1/lib/services', './components', './lib/hooks']
for d in dirs_to_process:
    if not os.path.exists(d): continue
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                process_file(os.path.join(root, file))

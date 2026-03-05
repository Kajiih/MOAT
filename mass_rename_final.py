import os
import re

replacements = {
    r'\bMediaItem\b': 'LegacyItem',
    r'\bMediaType\b': 'ItemType',
    r'\bMediaDetails\b': 'LegacyItemDetails',
    r'\bBaseMediaItem\b': 'BaseLegacyItem',
    r'\bMediaItemSchema\b': 'LegacyItemSchema',
    r'\bBaseMediaItemSchema\b': 'BaseLegacyItemSchema',
    r'\bMediaSelection\b': 'ItemSelection',
    r'\bmediaTypeRegistry\b': 'itemTypeRegistry',
    r'\bMediaRegistryProvider\b': 'ItemRegistryProvider',
    r'\buseMediaRegistry\b': 'useItemRegistry',
    r'\buseMediaDetails\b': 'useItemDetails',
    r'\buseMediaResolver\b': 'useItemResolver',
    r'\buseMediaSearch\b': 'useItemSearch',
}

# Second pass for unions
unions = {
    r'LegacyItem\s*\|\s*StandardItem': 'Item',
    r'StandardItem\s*\|\s*LegacyItem': 'Item',
    r'\(LegacyItem\s*\|\s*StandardItem\)': 'Item',
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = re.sub(old, new, new_content)
    
    for old, new in unions.items():
        new_content = re.sub(old, new, new_content)
        
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

dirs_to_process = ['./components', './lib', './app', './v1']
for d in dirs_to_process:
    if not os.path.exists(d): continue
    for root, _, files in os.walk(d):
        if 'node_modules' in root or '.git' in root or '.next' in root or '.gemini' in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.md')):
                process_file(os.path.join(root, file))

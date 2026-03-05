import os
import re

replacements = {
    r'\bMediaCard\b': 'ItemCard',
    r'\bMediaImage\b': 'ItemImage',
    r'\bMediaPicker\b': 'ItemPicker',
    r'\bMediaRegistryProvider\b': 'ItemRegistryProvider',
    r'\buseMediaRegistry\b': 'useItemRegistry',
    r'\bMediaRegistryProviderProps\b': 'ItemRegistryProviderProps',
    r'\buseMediaResolver\b': 'useItemResolver',
    r'\bUseMediaResolverOptions\b': 'UseItemResolverOptions',
    r'\buseMediaDetails\b': 'useItemDetails',
    r'\bmediaItem\b': 'item',
    r'\bmediaDetails\b': 'details'
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

for root, _, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or '.next' in root or '.gemini' in root:
        continue
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.md')):
            process_file(os.path.join(root, file))

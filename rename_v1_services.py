import os
import re

replacements = {
    r'\bgetMediaDetails\b': 'getLegacyItemDetails',
    r'\bmapReleaseGroupToMediaItem\b': 'mapReleaseGroupToLegacyItem',
    r'\bmapArtistToMediaItem\b': 'mapArtistToLegacyItem',
    r'\bmapRecordingToMediaItem\b': 'mapRecordingToLegacyItem',
    r'\bmapSearchResultToMediaItem\b': 'mapSearchResultToLegacyItem',
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

dirs_to_process = ['./v1/lib/services']
for d in dirs_to_process:
    if not os.path.exists(d): continue
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                process_file(os.path.join(root, file))

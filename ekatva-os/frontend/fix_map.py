import os
import re

md_path = r'C:\Users\Kavya Jain\.gemini\antigravity\brain\f38ab064-8b54-470a-9897-7c8feae85bdb\.system_generated\steps\1581\content.md'
with open(md_path, 'r') as f:
    lines = f.readlines()

path_lines = lines[19:73] # lines 20 to 73 in zero-indexed
path_lines[0] = path_lines[0].replace('<path d="', '')
path_data = ' '.join([l.strip() for l in path_lines]).replace('"', '').replace('/>', '').replace('>', '').replace('z', '') + ' z'

map_path = r'c:\Users\Kavya Jain\OneDrive\Desktop\ekatva-os\ekatva-os\frontend\src\components\IndiaMap.tsx'
with open(map_path, 'r', encoding='utf-8') as f:
    map_content = f.read()

new_content = re.sub(r'<path d=".*?" />', f'<path d="{path_data}" />', map_content, flags=re.DOTALL)

with open(map_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Fixed IndiaMap.tsx')

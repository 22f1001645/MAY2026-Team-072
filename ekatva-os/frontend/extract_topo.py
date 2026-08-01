import json
import os

md_path = r'C:\Users\Kavya Jain\.gemini\antigravity\brain\f38ab064-8b54-470a-9897-7c8feae85bdb\.system_generated\steps\1696\content.md'
with open(md_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find the first { and the last }
start = -1
end = -1
for i, line in enumerate(lines):
    if '{' in line and start == -1:
        start = i
    if '}' in line:
        end = i

if start != -1 and end != -1:
    json_str = "".join(lines[start:end+1])
    try:
        data = json.loads(json_str)
        os.makedirs(r'c:\Users\Kavya Jain\OneDrive\Desktop\ekatva-os\ekatva-os\frontend\src\data', exist_ok=True)
        out_path = r'c:\Users\Kavya Jain\OneDrive\Desktop\ekatva-os\ekatva-os\frontend\src\data\india.topo.json'
        with open(out_path, 'w', encoding='utf-8') as out_f:
            json.dump(data, out_f)
        print('Successfully saved india.topo.json')
    except Exception as e:
        print('Error parsing JSON:', e)
else:
    print('Could not find JSON in content.md')

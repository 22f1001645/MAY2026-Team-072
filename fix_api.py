import re

path = 'c:/Users/ashre/SE-PROJECT/MAY2026-Team-072/frontend/src/lib/api.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'<<<<<<< HEAD\nlet _explicitRefreshPromise: Promise<any> \| null = null\n=======\n(.*?)>>>>>>> [^\n]+\n',
    r'let _explicitRefreshPromise: Promise<any> | null = null\n\1',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

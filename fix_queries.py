import re

path = 'c:/Users/ashre/SE-PROJECT/MAY2026-Team-072/frontend/src/lib/queries.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

conflict = """<<<<<<< HEAD
export const useMyRegistrations = () =>
  useQuery({ queryKey: ['my-registrations'], queryFn: api.myRegistrations, refetchInterval: 10000 })
=======
/** `enabled` exists for the one page a visitor can open without a session
 *  (`/events/:slug`, OD-3). Firing this without one answers 401, which the
 *  request pipeline reads as an expired session and redirects to /login —
 *  so an unguarded call here would bounce the visitor off the public page. */
export const useMyRegistrations = (enabled = true) =>
  useQuery({ queryKey: ['my-registrations'], queryFn: api.myRegistrations, enabled })
>>>>>>> c011865f4a65ec5b52f3009c7820edebe7f7c6bd"""

replacement = """/** `enabled` exists for the one page a visitor can open without a session
 *  (`/events/:slug`, OD-3). Firing this without one answers 401, which the
 *  request pipeline reads as an expired session and redirects to /login —
 *  so an unguarded call here would bounce the visitor off the public page. */
export const useMyRegistrations = (enabled = true) =>
  useQuery({ queryKey: ['my-registrations'], queryFn: api.myRegistrations, enabled, refetchInterval: 10000 })"""

# In case the dash '—' character causes mismatch due to encoding, using regex
content = re.sub(
    r'<<<<<<< HEAD\nexport const useMyRegistrations = \(\) =>\n\s*useQuery\(\{ queryKey: \[\'my-registrations\'\], queryFn: api\.myRegistrations, refetchInterval: 10000 \}\)\n=======\n(.*?)\nexport const useMyRegistrations = \(enabled = true\) =>\n\s*useQuery\(\{ queryKey: \[\'my-registrations\'\], queryFn: api\.myRegistrations, enabled \}\)\n>>>>>>> [^\n]+\n',
    r'\1\nexport const useMyRegistrations = (enabled = true) =>\n  useQuery({ queryKey: [\'my-registrations\'], queryFn: api.myRegistrations, enabled, refetchInterval: 10000 })\n',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

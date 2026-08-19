import re

path = 'c:/Users/ashre/SE-PROJECT/MAY2026-Team-072/frontend/src/pages/EventDetail.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'<<<<<<< HEAD\nimport \{ Link, useParams, useLocation, useSearchParams \} from \'react-router-dom\'\n=======\nimport \{ Link, useLocation, useNavigate, useParams, useSearchParams \} from \'react-router-dom\'\n>>>>>>> [^\n]+\n',
    'import { Link, useLocation, useNavigate, useParams, useSearchParams } from \'react-router-dom\'\n',
    content
)

content = re.sub(
    r'<<<<<<< HEAD\n  const \{ data: myRegs = \[\] \} = useMyRegistrations\(\)\n  const \{ data: announcements = \[\] \} = useAnnouncements\(id\)\n=======\n  const \{ data: myRegs = \[\] \} = useMyRegistrations\(!!currentUser\)\n>>>>>>> [^\n]+\n',
    '  const { data: myRegs = [] } = useMyRegistrations(!!currentUser)\n  const { data: announcements = [] } = useAnnouncements(id)\n',
    content
)

content = re.sub(
    r'<<<<<<< HEAD\n\s*\{\/\* Referral Banner \*\/}.*?=======\n\s*\{\/\* \/discover is behind auth.*?>>>>>>> [^\n]+\n',
    '''      {/* Referral Banner */}
      {refId && !registered && !isPast && (
        <div className="mb-4 rounded-xl border border-teal/20 bg-teal/10 p-4 text-center backdrop-blur-xl shadow-lg">
          <div className="text-[14px] font-medium text-teal">
            🎉 A friend invited you to join them at this event!
          </div>
        </div>
      )}

      {/* /discover is behind auth, so it is not offered to a visitor who has
          arrived from a shared link and has no session yet. */}
      {currentUser && (
        <Link
          to="/discover"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-graytext-light hover:text-teal"
        >
          ← Discovery feed
        </Link>
      )}
''',
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'<<<<<<< HEAD\n\s*disabled=\{registerMut.isPending \|\| \(spotsLeft <= 0 && isWaitlistClosed\)\}\n.*?=======\n\s*disabled=\{registerMut.isPending\}\n.*?>>>>>>> [^\n]+\n',
    '''                    disabled={registerMut.isPending || (spotsLeft <= 0 && isWaitlistClosed)}
                    onClick={() => {
                      // A visitor from a shared link signs in first and comes
                      // back here — the same router-state idiom the session
                      // expiry flow uses. The register endpoint stays behind
                      // @auth_required either way; this only saves them a
                      // failed request and a lost page (T-05-35).
                      if (!currentUser) {
                        navigate('/login', { state: { from: location.pathname } })
                        return
                      }
                      registerMut.mutate({ id: e.id, referredBy: refId })
                    }}
''',
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'<<<<<<< HEAD\n\s*\{!isPast && e.status !== \'cancelled\' && \(\n=======\n\n\s*\{currentUser && e.status !== \'cancelled\' && \(\n>>>>>>> [^\n]+\n',
    '            {currentUser && !isPast && e.status !== \'cancelled\' && (\n',
    content
)

content = re.sub(
    r'<<<<<<< HEAD\n=======\n\n\s*\{\/\* Chat Drawer & Backdrop.*?document\.body\n\s*\)\}\n>>>>>>> [^\n]+\n',
    '',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)


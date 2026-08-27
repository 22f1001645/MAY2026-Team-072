/**
 * CHAT-04 structural gate: the channel polls, and it stops when the tab does.
 *
 * ROADMAP Phase 8 criterion 5 is two promises, not one — new announcements and
 * team responses appear within roughly 15 seconds *and* a backgrounded tab
 * stops polling. TanStack's default is the opposite of the second one: an
 * interval keeps firing in a hidden tab unless `refetchIntervalInBackground`
 * says otherwise. So the flag is the entire implementation of that promise, it
 * is one line, and it is invisible when missing — a fifth channel hook written
 * by copying the shape but not the flag would look right in review and quietly
 * put every abandoned tab back on the API for the whole run-up to an event.
 *
 * This is the mirror image of `no-kanban-polling.test.ts` (AC-35), which forbids
 * polling on a board that must not have it. A channel IS the live surface, so
 * here the interval is required and only its background behaviour is pinned.
 *
 * Scoped to the four CHAT-04 hooks by name, deliberately. `useMyRegistrations`
 * and `useNotifications` also poll and carry no such flag; they predate this
 * phase and fixing them is not Phase 8's to do. A gate that failed on them
 * would be deleted rather than obeyed.
 *
 * Sources are read through `import.meta.glob('?raw')` rather than `node:fs` —
 * the repo has no `@types/node` and vite's raw glob is already typed by
 * `src/vite-env.d.ts`, so the gate costs no extra packages. Same idiom as
 * `no-kanban-polling.test.ts` and `no-por-literals.test.ts`.
 */
import { describe, expect, it } from 'vitest'

/** The channel's four polled surfaces (CHAT-01, CHAT-02, CHAT-04). */
const CHANNEL_HOOKS = ['useAnnouncements', 'usePolls', 'useMyQueries', 'useOrgQueries']

const RAW_SOURCES = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_SOURCES).map(([key, source]) => [key.replace(/^\.\.\//, 'src/'), source]),
)

/** One hook's own lines: from its `export const useX` declaration to the next
 *  top-level export. Returned as text so a missing flag is reported against the
 *  hook that lacks it and not against the module. */
const hookBody = (source: string, name: string): string | null => {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`export const ${name} `))
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => line.startsWith('export '))
  return [lines[start], ...(end === -1 ? rest : rest.slice(0, end))].join('\n')
}

describe('CHAT-04: the channel polls in the foreground only', () => {
  const source = SOURCES['src/lib/queries.ts'] ?? ''

  it('every channel hook still exists in the data layer', () => {
    const missing = CHANNEL_HOOKS.filter((name) => hookBody(source, name) === null)

    expect(
      missing,
      `These channel hooks were renamed or removed: ${missing.join(', ')}. A gate ` +
        'over a hook that no longer exists passes for free — repoint it.',
    ).toEqual([])
  })

  it('every channel hook polls', () => {
    const notPolling = CHANNEL_HOOKS.filter(
      (name) => !(hookBody(source, name) ?? '').includes('refetchInterval:'),
    )

    expect(
      notPolling,
      `These channel hooks no longer poll: ${notPolling.join(', ')}. CHAT-04 is ` +
        'the reason the channel refreshes at all — a response nobody sees until ' +
        'they reload is a response that did not arrive.',
    ).toEqual([])
  })

  it('no channel hook keeps polling in a backgrounded tab', () => {
    const leaking = CHANNEL_HOOKS.filter(
      (name) => !(hookBody(source, name) ?? '').includes('refetchIntervalInBackground: false'),
    )

    expect(
      leaking,
      `These channel hooks poll in the background: ${leaking.join(', ')}. Add ` +
        '`refetchIntervalInBackground: false`. TanStack keeps the interval ' +
        'running in a hidden tab by default, so omitting it leaves every ' +
        'abandoned tab calling the API until it is closed.',
    ).toEqual([])
  })

  it('detects a known-bad fixture, so the scan cannot silently match nothing', () => {
    const bad = [
      'export const usePolls = (id?: string) =>',
      "  useQuery({ queryKey: ['polls', id], refetchInterval: 15000 })",
      '',
      'export const useSomethingElse = () => null',
    ].join('\n')

    const body = hookBody(bad, 'usePolls') ?? ''
    expect(body).toContain('refetchInterval:')
    expect(body).not.toContain('refetchIntervalInBackground: false')
    expect(body).not.toContain('useSomethingElse')
    expect(hookBody(bad, 'useNotAHook')).toBeNull()
  })
})

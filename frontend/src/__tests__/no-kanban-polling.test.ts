/**
 * AC-35 structural gate: the Kanban board is fetched on page load only.
 *
 * No polling interval, no timer, no socket. That promise was made in a design
 * document, and a promise that lives only in prose decays — the next person to
 * want a "live" board reaches for `refetchInterval` and nothing objects. It is
 * kept here instead, where adding one fails the build.
 *
 * The rule is not an aesthetic preference. A board on an interval is one open
 * tab per crew member hammering the API for the whole run-up to an event, for
 * data that changes a handful of times a day (T-05-45). Tasks are invalidated
 * by the mutations that change them; that is the whole refresh story.
 *
 * Source files are read through `import.meta.glob('?raw')` rather than
 * `node:fs`: the repo has no `@types/node`, and vite's raw glob is already
 * typed by `src/vite-env.d.ts`, so the gate costs zero extra packages. Same
 * idiom as `no-por-literals.test.ts`, deliberately.
 */
import { describe, expect, it } from 'vitest'

/** The three ways this board could start polling. Named, so the failure message
 *  can say which one was reintroduced and not merely that something matched. */
const FORBIDDEN = [
  { token: 'refetchInterval', why: "TanStack's polling option" },
  { token: 'setInterval', why: 'a browser interval timer' },
  { token: 'new WebSocket', why: 'a socket connection' },
]

/** Only the files that make up the board and its data layer. A scan over all of
 *  src/ would fail on an unrelated carousel and teach people to weaken it. */
const SCANNED = [
  'src/lib/queries.ts',
  'src/pages/KanbanWorkspace.tsx',
  'src/components/KanbanBoard.tsx',
]

const RAW_SOURCES = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Glob keys are relative to this file ('../lib/queries.ts') — anchor at src/. */
const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_SOURCES).map(([key, source]) => [key.replace(/^\.\.\//, 'src/'), source]),
)

/** Matches a forbidden token anywhere except inside a `//` line comment — the
 *  prose above and the explanatory comments in queries.ts name these tokens on
 *  purpose, and a matcher that flagged them would be uninstallable. */
const findForbidden = (source: string) => {
  const hits: { line: number; token: string; why: string }[] = []
  source.split('\n').forEach((line, index) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
    for (const { token, why } of FORBIDDEN) {
      if (line.includes(token)) hits.push({ line: index + 1, token, why })
    }
  })
  return hits
}

describe('AC-35: the Kanban board never polls', () => {
  it('no refetch interval, timer or socket appears in the board or its hooks', () => {
    const violations: string[] = []

    for (const path of SCANNED) {
      for (const hit of findForbidden(SOURCES[path] ?? '')) {
        violations.push(`${path}:${hit.line}  ${hit.token} (${hit.why})`)
      }
    }

    expect(
      violations,
      `Polling reintroduced into the task board:\n${violations.join('\n')}\n` +
        'AC-35: the board is fetched on page load and after a mutation ' +
        'invalidates it — nothing else. Do not delete this test to add a ' +
        'refresh; invalidate the ["tasks", activityId] key instead.',
    ).toEqual([])
  })

  it('every scanned path still names a file that exists', () => {
    const missing = SCANNED.filter((path) => SOURCES[path] === undefined)

    expect(
      missing,
      `These scanned paths no longer exist: ${missing.join(', ')}. A scan over a ` +
        'file that was renamed passes for free and guards nothing — repoint it.',
    ).toEqual([])
  })

  it('detects a known-bad fixture, so the scan cannot silently match nothing', () => {
    const bad = [
      "  useQuery({ queryKey: ['tasks'], refetchInterval: 5000 })",
      '  setInterval(refetch, 5000)',
      "  const socket = new WebSocket('ws://localhost:5000/tasks')",
    ].join('\n')

    expect(findForbidden(bad).map((h) => h.token)).toEqual([
      'refetchInterval',
      'setInterval',
      'new WebSocket',
    ])
    expect(findForbidden('  const tasks = useTasks(activityId)')).toEqual([])
  })
})

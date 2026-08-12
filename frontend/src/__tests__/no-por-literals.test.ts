/**
 * D-12 structural gate: the frontend must never again decide organiser status
 * from its own copy of the POR list.
 *
 * `ORGANISER_POR_TYPES` was deleted from `src/lib/auth.tsx`; this test is what
 * keeps it deleted. A POR list living in the client is an authorization input
 * the server can neither see nor revoke, so the rule fails the build rather
 * than the code review — the frontend mirror of Phase 1's `url_map` gate.
 *
 * Long-term, `src/pages/Orgs.tsx` should source POR type names from a server
 * endpoint, which would empty the allowlist below entirely. That is a Phase 3+
 * change and explicitly out of scope for this phase.
 *
 * Source files are read through `import.meta.glob('?raw')` rather than
 * `node:fs`: the repo has no `@types/node`, and vite's raw glob is already
 * typed by `src/vite-env.d.ts`, so the gate costs zero extra packages.
 */
import { describe, expect, it } from 'vitest'

// The nine POR types from backend/app/constants.py ORGANISER_PORS — that set is
// the single source of truth. This copy exists only to be searched for; nothing
// in src/ may hold an equivalent list.
const POR_LITERALS = [
  'Regional Coordinator',
  'Society Secretary',
  'House Secretary',
  'Deputy House Secretary',
  'Event Lead',
  'Technical Secretary',
  'Web Admin',
  'Society Deputy Secretary',
  'Coordinator',
]

// Frozen, and it never grows. `src/pages/Orgs.tsx` is the admin POR-management
// surface: it renders and assigns POR type names as user-facing data, which is
// a legitimate and unavoidable use of the strings. Exempting it by directory or
// by pattern would blind the gate, so the exemption is one named file. A second
// entry is a visible, reviewable diff — and the companion test below fails if
// an entry ever stops matching, so a stale exemption cannot rot into blanket
// cover for a file that later claims the same path.
const POR_LITERAL_ALLOWLIST = Object.freeze(['src/pages/Orgs.tsx'])

const RAW_SOURCES = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Glob keys are relative to this file ('../pages/Orgs.tsx') — anchor them at src/. */
const toSrcPath = (key: string) => key.replace(/^\.\.\//, 'src/')

const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_SOURCES).map(([key, source]) => [toSrcPath(key), source]),
)

/**
 * Matches a POR type only as a quoted string literal, so the word
 * "Coordinator" in prose, a component name or JSX text is not a false positive.
 */
const quotedLiteral = (literal: string) =>
  new RegExp(`['"\`]${literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`)

const containsPorLiteral = (source: string) =>
  POR_LITERALS.some((literal) => quotedLiteral(literal).test(source))

describe('D-12: no POR-type literals outside the allowlist', () => {
  it('no POR-type literal appears in any authorization-deciding module', () => {
    const violations: string[] = []

    for (const [path, source] of Object.entries(SOURCES)) {
      if (path.startsWith('src/__tests__/')) continue
      if (POR_LITERAL_ALLOWLIST.includes(path)) continue

      source.split('\n').forEach((line, index) => {
        for (const literal of POR_LITERALS) {
          if (quotedLiteral(literal).test(line)) {
            violations.push(`${path}:${index + 1}  ${literal}`)
          }
        }
      })
    }

    expect(
      violations,
      `POR type strings found outside ${POR_LITERAL_ALLOWLIST.join(', ')}:\n` +
        `${violations.join('\n')}\n` +
        'The frontend must not decide organiser capability from its own POR ' +
        'list — read it from the session the server issues. Do not add the ' +
        'file to POR_LITERAL_ALLOWLIST.',
    ).toEqual([])
  })

  it('every allowlist entry still exists and still contains a POR literal', () => {
    const dead = POR_LITERAL_ALLOWLIST.filter(
      (path) => !SOURCES[path] || !containsPorLiteral(SOURCES[path]),
    )

    expect(
      dead,
      `These POR_LITERAL_ALLOWLIST entries no longer match a file that uses a ` +
        `POR literal: ${dead.join(', ')}. Delete them — an allowlist entry ` +
        'with nothing behind it silently exempts whatever later claims that path.',
    ).toEqual([])
  })
})

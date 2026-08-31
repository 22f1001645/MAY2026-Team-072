import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mandala } from '../components/ui'
import { cx } from '../lib/format'

/* ---------------------------------------------------------------------------
 * Public landing / hero — the pre-login front door.
 * Warm, not corporate. Celebration, not transaction (Brand Kit §1).
 * ------------------------------------------------------------------------- */

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-onyx text-offwhite">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-onyx/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <Mandala size={32} />
            <div>
              <div className="text-[17px] font-bold leading-none tracking-wide">
                EKATVA<span className="text-teal"> OS</span>
              </div>
              <div className="text-[8px] uppercase tracking-[0.28em] text-gold">
                Unite · Inspire · Celebrate
              </div>
            </div>
          </Link>

          <nav className="ml-auto hidden items-center gap-8 text-[14px] text-graytext-light md:flex">
            <a href="#problem" className="transition-colors hover:text-teal">The problem</a>
            <a href="#features" className="transition-colors hover:text-teal">What it does</a>
            <a href="#journey" className="transition-colors hover:text-teal">The journey</a>
            <a href="#proof" className="transition-colors hover:text-teal">Proof</a>
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-6">
            <Link
              to="/login"
              className="hidden rounded-full px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-graytext-light transition-colors hover:text-teal sm:inline-block"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-teal px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-onyx shadow-glow-teal transition-all duration-300 ease-material hover:scale-[1.02] hover:bg-teal-accent"
            >
              Get started
            </Link>
          </div>

          <button
            className="ml-3 text-graytext-light md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-white/5 px-5 py-3 text-[14px] md:hidden">
            {['problem', 'features', 'journey', 'proof'].map((s) => (
              <a
                key={s}
                href={`#${s}`}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2 capitalize text-graytext-light hover:bg-white/5 hover:text-teal"
              >
                {s}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="grain absolute inset-0" />
        {/* Concentric mandala rings, decorative */}
        <div className="pointer-events-none absolute -right-40 top-1/2 hidden -translate-y-1/2 opacity-30 lg:block">
          <RingArt />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-32">
          <div className="max-w-3xl animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal/10 px-4 py-1.5 text-caption font-semibold text-teal">
              <Mandala size={16} /> एकत्व · Sanskrit for oneness
            </div>
            <h1 className="text-[40px] font-bold leading-[1.08] tracking-tight sm:text-[56px] lg:text-[68px]">
              Make an online degree
              <br />
              feel like <span className="text-gold">a place.</span>
            </h1>
            <p className="mt-6 max-w-[600px] text-[18px] leading-relaxed text-graytext-light">
              40,000+ IIT Madras BS students, spread across every state, meeting their
              degree through a screen. Ekatva OS is the connective tissue that turns
              scattered usernames into one community — city after city, year after year.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="rounded-full bg-teal px-8 py-4 text-[14px] font-bold uppercase tracking-wide text-onyx shadow-glow-teal transition-all duration-300 ease-material hover:scale-[1.02] hover:bg-teal-accent"
              >
                Explore the app →
              </Link>
              <a
                href="#features"
                className="rounded-full border border-teal/30 bg-teal-deep/40 px-8 py-4 text-[14px] font-bold uppercase tracking-wide text-teal transition-all duration-300 ease-material hover:scale-[1.02] hover:bg-teal-deep"
              >
                See what it does
              </a>
            </div>
            <div className="mt-8 flex items-center gap-2 text-caption text-graytext-mid">
              <span className="flex -space-x-2">
                {['SR', 'AY', 'MP', 'TN'].map((i, idx) => (
                  <span
                    key={i}
                    className={cx(
                      'grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ring-2 ring-onyx',
                      idx % 2 ? 'bg-gold/20 text-gold' : 'bg-teal/20 text-teal',
                    )}
                  >
                    {i}
                  </span>
                ))}
              </span>
              Built by students, for students — CodeCrafters · Team-072
            </div>
          </div>
        </div>
      </section>

      {/* Proof stat bar — Ekatva Hyderabad, the founding fest */}
      <section id="proof" className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
          <div className="mb-8 text-center">
            <div className="text-caption font-semibold uppercase tracking-[0.2em] text-teal">
              The thesis, proven in the flesh
            </div>
            <h2 className="mt-1 text-h2 font-bold text-gold">Ekatva Hyderabad</h2>
            <p className="mx-auto mt-1 max-w-xl text-body text-graytext-light">
              A regional fest that put a room full of people who had only ever known each
              other as usernames — in the same place, on the same day.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
            <Stat value="230" label="students" />
            <Stat value="171" label="bused in · 3 buses" />
            <Stat value="266" label="meals served" />
            <Stat value="100%" label="engagement" />
            <Stat value="4.4/5" label="rating" />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-3 text-caption font-semibold uppercase tracking-[0.2em] text-teal">
              Why it exists
            </div>
            <h2 className="text-h1 font-bold leading-tight text-gold">
              The belonging runs on a colander.
            </h2>
            <p className="mt-4 text-body leading-relaxed text-graytext-light">
              The student civic layer — Houses, Societies, Regional Chapters, the SEC —
              does the work of manufacturing belonging. But it runs on borrowed tools:
              WhatsApp for coordination, Forms for registration, Sheets for budgets,
              email for approvals, and human memory for everything else.
            </p>
            <p className="mt-3 text-body leading-relaxed text-graytext-light">
              Each tool is fine alone. Together they leak. Information gets missed,
              accountability blurs, and every year at handover the institutional memory
              of an entire community <span className="text-gold">evaporates</span> —
              because it never lived anywhere but the outgoing Secretary's head.
            </p>
          </div>
          <div className="space-y-3">
            {[
              ['Fragmented operations', 'One connected activity workspace'],
              ['Missed / unclear events', 'A trusted city discovery feed'],
              ['Turnout uncertainty', 'Registration tied to every event'],
              ['Approval opacity', 'Proposal → approval with an audit trail'],
              ['15–30 day reimbursement', 'A tracked reimbursement workflow'],
              ['Knowledge lost at handover', 'Auto-archive of every closed activity'],
            ].map(([pain, fix]) => (
              <div
                key={pain}
                className="grid grid-cols-[1fr_auto_1.2fr] items-center gap-4 rounded-xl2 border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4"
              >
                <span className="text-[13px] text-graytext-mid">
                  {pain}
                </span>
                <svg className="shrink-0 text-teal" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[13px] font-semibold text-teal">{fix}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/5 bg-white/[0.02] py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="mb-12 text-center">
            <div className="text-caption font-semibold uppercase tracking-[0.2em] text-teal">
              The v1 city-meetup lifecycle
            </div>
            <h2 className="mt-1 text-h1 font-bold text-gold">
              One event, built end to end.
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-body text-graytext-light">
              Not ten shallow modules — one complete vertical where the student's journey
              and the organiser's journey meet at a single object: the published event.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl2 border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-all duration-300 ease-material hover:-translate-y-1 hover:border-teal/40 hover:shadow-glow-teal"
              >
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-teal/10 text-teal transition-colors group-hover:bg-teal/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-h3 font-semibold text-offwhite">{f.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-graytext-light">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey flywheel */}
      <section id="journey" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <div className="mb-12 text-center">
          <div className="text-caption font-semibold uppercase tracking-[0.2em] text-teal">
            The community journey
          </div>
          <h2 className="mt-1 text-h1 font-bold text-gold">A wheel that renews its own leaders.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-body text-graytext-light">
            Every feature exists to move a student one step further — and then turn them
            around to pull the next student in behind them.
          </p>
        </div>

        <div className="flex flex-wrap items-stretch justify-center gap-3">
          {JOURNEY.map((j, i) => (
            <div key={j.stage} className="flex items-center">
              <div
                className={cx(
                  'w-40 rounded-xl2 border p-4 text-center',
                  j.v1
                    ? 'border-teal/40 bg-teal/[0.07]'
                    : 'border-white/8 bg-white/[0.02]',
                )}
              >
                <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-white/5 text-lg">
                  {j.emoji}
                </div>
                <div className="text-[14px] font-semibold text-offwhite">{j.stage}</div>
                <div className="mt-1 text-caption text-graytext-mid">{j.desc}</div>
                {j.v1 ? (
                  <span className="mt-2 inline-block rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal">
                    In v1
                  </span>
                ) : (
                  <span className="mt-2 inline-block rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                    Vision
                  </span>
                )}
              </div>
              {i < JOURNEY.length - 1 && (
                <svg className="mx-1 hidden shrink-0 text-teal/50 lg:block" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="border-t border-white/5 bg-white/[0.02] py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="mb-12 text-center">
            <div className="text-caption font-semibold uppercase tracking-[0.2em] text-teal">
              One object, many faces
            </div>
            <h2 className="mt-1 text-h1 font-bold text-gold">Built for everyone in the room.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {ROLES.map((r) => (
              <div
                key={r.title}
                className="rounded-xl2 border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-7"
              >
                <div className={cx('mb-4 inline-flex rounded-full px-3 py-1 text-caption font-bold uppercase tracking-wider', r.tone)}>
                  {r.tag}
                </div>
                <h3 className="text-h2 font-bold text-offwhite">{r.title}</h3>
                <p className="mt-2 text-[14px] text-graytext-light">{r.body}</p>
                <ul className="mt-4 space-y-2">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[13px] text-graytext-light">
                      <svg className="mt-0.5 shrink-0 text-teal" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient" />
        <div className="grain absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center lg:px-8">
          <Mandala size={56} className="mx-auto mb-6" />
          <h2 className="text-[34px] font-bold leading-tight text-offwhite sm:text-[44px]">
            Belonging is an operational problem
            <br />
            <span className="text-gold">wearing an emotional mask.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body text-graytext-light">
            Ekatva OS is the operating system for it. Step inside and see the whole
            city-meetup lifecycle — as a student, an organiser, and an admin.
          </p>
          <Link
            to="/login"
            className="mt-9 inline-block rounded-full bg-teal px-10 py-4 text-[14px] font-bold uppercase tracking-wide text-onyx shadow-glow-teal transition-all duration-300 ease-material hover:scale-[1.02] hover:bg-teal-accent"
          >
            Enter Ekatva OS →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center lg:px-8">
          <div className="flex items-center gap-2.5">
            <Mandala size={26} />
            <span className="text-[15px] font-bold tracking-wide">
              EKATVA<span className="text-teal"> OS</span>
            </span>
          </div>
          <p className="text-caption text-graytext-mid">
            CodeCrafters · Team-072 · BSCS3001 Software Engineering Project · A community
            operating system for the IIT Madras BS ecosystem.
          </p>
          <p className="text-caption font-semibold text-gold">Unite. Inspire. Celebrate.</p>
        </div>
      </footer>
    </div>
  )
}

/* ---- content ---- */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-[38px] font-bold leading-none text-teal">{value}</div>
      <div className="mt-1 text-caption uppercase tracking-wider text-graytext-light">
        {label}
      </div>
    </div>
  )
}

function RingArt() {
  return (
    <svg width="520" height="520" viewBox="0 0 520 520" fill="none">
      {[240, 190, 140, 90].map((r, i) => (
        <circle
          key={r}
          cx="260"
          cy="260"
          r={r}
          stroke={i % 2 ? '#FFCF96' : '#5CE6C9'}
          strokeWidth="1.5"
          strokeDasharray={i === 1 ? '4 8' : undefined}
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <line
            key={i}
            x1={260 + Math.cos(a) * 90}
            y1={260 + Math.sin(a) * 90}
            x2={260 + Math.cos(a) * 240}
            y2={260 + Math.sin(a) * 240}
            stroke="#3FD4B6"
            strokeWidth="0.8"
            opacity="0.5"
          />
        )
      })}
      <circle cx="260" cy="260" r="10" fill="#FFCF96" />
    </svg>
  )
}

const FEATURES = [
  {
    title: 'City discovery feed',
    body: 'A clean, Luma-style feed of what\'s happening near you — an event page you trust in five seconds.',
    icon: 'M12 2 4 7v10l8 5 8-5V7z M12 22V12M4 7l8 5 8-5',
  },
  {
    title: 'Proposal → approval',
    body: 'Organisers propose with a line-item budget; admins approve, request changes, or reject — with a live audit trail.',
    icon: 'm9 11 3 3 8-8M4 12v6a2 2 0 0 0 2 2h12',
  },
  {
    title: 'Registration & reminders',
    body: 'A real headcount record, per-user reminders, and time-critical broadcasts so no announcement gets lost.',
    icon: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9',
  },
  {
    title: 'Attendance check-in',
    body: 'Organisers mark students in as they arrive — the record that powers points and fee utilisation.',
    icon: 'm5 12 4 4L19 6',
  },
  {
    title: 'Budget & reimbursement',
    body: 'Submit bills against budget lines and watch each claim move Submitted → Verified → Approved → Paid. No more funding events out of pocket.',
    icon: 'M3 10h18M6 15h4M3 6h18v12H3z',
  },
  {
    title: 'Recognition & analytics',
    body: 'Points, a contribution ledger and a city leaderboard — plus admin analytics and the ₹200 activity-fee utilisation wedge.',
    icon: 'M6 21V10M12 21V4M18 21v-7',
  },
]

const JOURNEY = [
  { stage: 'Discover', emoji: '🧭', desc: 'What\'s in my city', v1: true },
  { stage: 'Attend', emoji: '🙌', desc: 'First meetup', v1: true },
  { stage: 'Volunteer', emoji: '🛠️', desc: 'Help run it', v1: true },
  { stage: 'Organise', emoji: '📣', desc: 'Propose & run', v1: true },
  { stage: 'Lead', emoji: '⭐', desc: 'Secretary · fest', v1: false },
  { stage: 'Give back', emoji: '🤝', desc: 'Mentor · alumni', v1: false },
]

const ROLES = [
  {
    tag: 'Student',
    tone: 'bg-teal/10 text-teal',
    title: 'Find your people',
    body: 'A warm invitation to every event in your city.',
    points: ['Discover meetups near you', 'Register in ≤3 taps', 'Earn points & climb the leaderboard'],
  },
  {
    tag: 'Organiser · RC',
    tone: 'bg-gold/10 text-gold',
    title: 'Run it without the chaos',
    body: 'The same event, as a control panel.',
    points: ['Propose with a budget', 'Track headcount live', 'Reimburse without the 30-day wait'],
  },
  {
    tag: 'Admin',
    tone: 'bg-teal/10 text-teal',
    title: 'Approve & see it all',
    body: 'A clear trail, no email bottleneck.',
    points: ['Approve with an audit trail', 'Verify reimbursements', 'Community analytics & fee utilisation'],
  },
]

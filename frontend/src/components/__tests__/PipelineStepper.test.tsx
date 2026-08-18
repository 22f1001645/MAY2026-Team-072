import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { PipelineStepper } from '../PipelineStepper'
import { ToastProvider } from '../ui'

/* PipelineStepper — CAMPAIGN-06 / UI-SPEC §2.1 (E1).
 *
 * The stepper's only job is to be honest about progress, and there are exactly
 * two ways it can lie:
 *
 *  1. It can show a step complete that sits after a step still pending. An
 *     organiser reading that has no way to tell what is actually left, because
 *     the shape they are reading — a filled prefix — no longer means anything.
 *     E1's `partial` resolution is that the rendered set is always a coherent
 *     prefix, so the sweep below drives every completeness combination the
 *     server can return, not just the tidy ones.
 *  2. It can recompute completeness itself and drift from the server the moment
 *     a rule changes. The source-level check asserts the component holds no
 *     query and no effect: everything it renders arrives as props.
 */

const LABELS = ['Schedule', 'Mail Template', 'Poster', 'Registration', 'Push Live']
const IDS = ['schedule', 'mail', 'poster', 'registration', 'push-live']

const stepsFrom = (flags: boolean[]) =>
  IDS.map((id, i) => ({ id, label: LABELS[i], complete: flags[i] }))

/** currentStep as CampaignBuilder derives it: the first incomplete step. */
const firstIncomplete = (flags: boolean[]) => IDS[flags.indexOf(false)] ?? IDS[IDS.length - 1]

/** The rendered state of each circle, in DOM order, read off its accessible name. */
const renderedStates = () =>
  screen
    .getAllByLabelText(/^Step \d: /)
    .map(el => el.getAttribute('aria-label')!.split('—')[1].trim())

describe('PipelineStepper', () => {
  it('renders all five steps, labelled and ordered, when nothing is complete', () => {
    render(<PipelineStepper steps={stepsFrom([false, false, false, false, false])} currentStep="schedule" />)

    expect(screen.getAllByLabelText(/^Step \d: /)).toHaveLength(5)
    LABELS.forEach(label => expect(screen.getByText(label)).toBeInTheDocument())
    expect(renderedStates()).toEqual(['Active', 'Pending', 'Pending', 'Pending', 'Pending'])
  })

  it('renders complete before the active step and pending after it', () => {
    render(<PipelineStepper steps={stepsFrom([true, true, false, false, false])} currentStep="poster" />)

    expect(renderedStates()).toEqual(['Complete', 'Complete', 'Active', 'Pending', 'Pending'])
  })

  it('names each circle "Step N: Label — State"', () => {
    render(<PipelineStepper steps={stepsFrom([true, false, false, false, false])} currentStep="mail" />)

    expect(screen.getByLabelText('Step 1: Schedule — Complete')).toBeInTheDocument()
    expect(screen.getByLabelText('Step 2: Mail Template — Active')).toBeInTheDocument()
    expect(screen.getByLabelText('Step 5: Push Live — Pending')).toBeInTheDocument()
  })

  /* E1 records `loading` as resolved-without-a-skeleton: the stepper reads a
   * payload the page already has, so a skeleton here would be a spinner for
   * data that never arrives late. Asserted structurally — a component with no
   * query and no effect has no async state it could show a skeleton for. */
  it('holds no query and no effect of its own', async () => {
    const sources = import.meta.glob('../PipelineStepper.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const source = Object.values(sources)[0]

    expect(source).toBeTruthy()
    expect(source).not.toContain('useQuery')
    expect(source).not.toContain('useEffect')
    expect(source).not.toContain('animate-pulse')
  })

  /* All 32 completeness combinations, including the ones an organiser really
   * produces — writing the mail before adding a single schedule item. */
  it('never renders a complete step after a pending one, for any server combination', () => {
    for (let mask = 0; mask < 32; mask++) {
      const flags = [0, 1, 2, 3, 4].map(bit => Boolean(mask & (1 << bit)))
      const { unmount } = render(
        <PipelineStepper steps={stepsFrom(flags)} currentStep={firstIncomplete(flags)} />,
      )

      const states = renderedStates()
      const firstPending = states.indexOf('Pending')
      if (firstPending !== -1) {
        expect(states.slice(firstPending)).not.toContain('Complete')
      }
      unmount()
    }
  })
})

/* The parent half of E1's error backstop. A stepper rendered from a campaign
 * payload that failed to arrive would show a stale or empty prefix as though it
 * were the truth (T-05-41), so the page surfaces the failure whole and renders
 * no stepper at all. */
vi.mock('../../lib/queries', () => {
  const query = (data: unknown, extra: Record<string, unknown> = {}) => () => ({
    data,
    isLoading: false,
    isError: false,
    error: null,
    ...extra,
  })
  const mutation = () => () => ({
    mutate: () => {},
    mutateAsync: async () => {},
    isPending: false,
    isError: false,
    error: null,
  })
  return {
    useCapabilities: query({ manageableActivityIds: ['a1'] }),
    useEvent: query({ id: 'a1', title: 'Hyderabad Meetup', scale: 'city' }),
    useScheduleItems: query([]),
    useSchedulePresets: query([]),
    useCreateScheduleItem: mutation(),
    useUpdateScheduleItem: mutation(),
    useDeleteScheduleItem: mutation(),
    useCampaign: () => ({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('campaign unavailable'),
    }),
    useFormFields: query([]),
    useCreateFormField: mutation(),
    useUpdateFormField: mutation(),
    useDeleteFormField: mutation(),
    useGenerateSlug: mutation(),
    useGenerateMail: mutation(),
    useSaveMail: mutation(),
    usePushLive: mutation(),
    useUploadPoster: mutation(),
  }
})

describe('CampaignBuilder when the campaign query fails', () => {
  it('surfaces the error for the whole page and renders no stepper', async () => {
    const { default: CampaignBuilder } = await import('../../pages/CampaignBuilder')

    render(
      <MemoryRouter initialEntries={['/events/a1/campaign']}>
        <ToastProvider>
          <CampaignBuilder />
        </ToastProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('campaign unavailable')).toBeInTheDocument()
    expect(screen.queryAllByLabelText(/^Step \d: /)).toHaveLength(0)
  })
})

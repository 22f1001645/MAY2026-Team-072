/**
 * PipelineStepper — the five-step campaign pipeline (UI-SPEC §2.1 / E1, D-06).
 *
 * Purely presentational: no query, no state, no effect. Everything it draws
 * arrives as props, because completeness has exactly one definition and it is
 * the server's `completeness` object (campaign_service.campaign_state). A
 * second, client-side rule would drift the moment the server's rule changed,
 * and the drift would be invisible — the stepper would still look right.
 *
 * The five steps are fixed, so the empty case cannot occur and is not defended
 * against (E1 `empty`). The parent always passes five.
 *
 * Coherent-prefix rule: a step renders Complete only when it and every step
 * before it is complete. That is what makes a filled prefix mean something —
 * a Complete circle sitting after a Pending one would leave an organiser with
 * no way to read what is actually left (E1 `partial`).
 */
import { Fragment } from 'react'

import { cx } from '../lib/format'

export interface PipelineStepperProps {
  steps: Array<{ id: string; label: string; complete: boolean }>
  currentStep: string
}

type StepState = 'Complete' | 'Active' | 'Pending'

export function PipelineStepper({ steps, currentStep }: PipelineStepperProps) {
  // An unknown currentStep falls back to the first step rather than to none:
  // a stepper with no active circle reads as a finished pipeline.
  const activeIndex = Math.max(0, steps.findIndex(s => s.id === currentStep))

  let prefixComplete = true
  const states: StepState[] = steps.map((step, i) => {
    prefixComplete = prefixComplete && step.complete
    if (i === activeIndex) return 'Active'
    return prefixComplete ? 'Complete' : 'Pending'
  })

  return (
    <div className="mb-8">
      {/* Below sm the row would wrap into an unreadable stack (UI-SPEC §8). */}
      <p className="text-caption text-graytext-light sm:hidden">
        Step {activeIndex + 1} of {steps.length}
      </p>

      <div className="hidden items-start sm:flex">
        {steps.map((step, i) => (
          <Fragment key={step.id}>
            {i > 0 && (
              <div
                className={cx(
                  'mt-4 h-0.5 flex-1 transition-all duration-500 ease-material',
                  i <= activeIndex ? 'bg-teal' : 'bg-divider',
                )}
              />
            )}
            <div className="flex w-20 flex-col items-center">
              <div
                aria-label={`Step ${i + 1}: ${step.label} — ${states[i]}`}
                className={cx(
                  'grid h-8 w-8 place-items-center rounded-full transition-all duration-500 ease-material',
                  states[i] === 'Complete' && 'bg-teal text-onyx',
                  states[i] === 'Active' && 'border-2 border-teal text-teal',
                  states[i] === 'Pending' && 'border border-divider text-graytext-mid',
                )}
              >
                {states[i] === 'Complete' ? (
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-[12px] font-semibold">{i + 1}</span>
                )}
              </div>
              <span
                className={cx(
                  'mt-2 text-center text-caption',
                  states[i] === 'Active' ? 'text-teal' : '',
                  states[i] === 'Pending' ? 'text-graytext-mid' : '',
                  states[i] === 'Complete' ? 'text-graytext-light' : '',
                )}
              >
                {step.label}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

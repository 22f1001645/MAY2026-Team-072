import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CollabStatus from '../CollabStatus'
import { isMegaMeetup } from '../../lib/proposalLogic'

describe('CollabStatus badge (PROPOSAL-06)', () => {
  it('renders an "Accepted" label for accepted', () => {
    render(<CollabStatus status="accepted" />)
    expect(screen.getByText('Accepted')).toBeInTheDocument()
  })

  it('renders a "Declined" label for declined', () => {
    render(<CollabStatus status="declined" />)
    expect(screen.getByText('Declined')).toBeInTheDocument()
  })

  it('renders a "Pending" label for pending', () => {
    render(<CollabStatus status="pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })
})

describe('isMegaMeetup (PROPOSAL-03)', () => {
  it('is false with 2 accepted collaborators', () => {
    const collabs = [{ status: 'accepted' }, { status: 'accepted' }, { status: 'pending' }]
    expect(isMegaMeetup(collabs)).toBe(false)
  })

  it('is true with 3 accepted collaborators', () => {
    const collabs = [{ status: 'accepted' }, { status: 'accepted' }, { status: 'accepted' }]
    expect(isMegaMeetup(collabs)).toBe(true)
  })

  it('does not count declined collaborators', () => {
    const collabs = [{ status: 'accepted' }, { status: 'accepted' }, { status: 'declined' }]
    expect(isMegaMeetup(collabs)).toBe(false)
  })
})

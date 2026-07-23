import React from 'react'
import { render, screen } from '@testing-library/react'
import OriginStorySection from '@/components/sections/OriginStorySection'

type MotionProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  initial?: unknown
  animate?: unknown
  transition?: unknown
  variants?: unknown
}

// Mock animation
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style }: MotionProps) =>
      <div className={className} style={style}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useInView: () => true,
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => 0,
}))

// Mock StatCard to simplify tree
jest.mock('@/components/ui', () => ({
  StatCard: ({ value, label }: { value: string; label: string }) =>
    <div data-testid="stat-card">{value} - {label}</div>,
}))

describe('OriginStorySection', () => {
    it('renders the section title', () => {
        render(<OriginStorySection />)
        expect(screen.getByText('The Story Behind EKATVA')).toBeInTheDocument()
    })

    it('renders the narrative text', () => {
        render(<OriginStorySection />)
        expect(screen.getByText(/Most IITM BS students have never met/i)).toBeInTheDocument()
        expect(screen.getByText('EKATVA changes that.')).toBeInTheDocument()
    })

    it('renders the stats', () => {
        render(<OriginStorySection />)
        expect(screen.getByText('34,000+ - Students Nationwide')).toBeInTheDocument()
        expect(screen.getByText('10+ - Cities Planned')).toBeInTheDocument()
    })

    it('renders memory wall captions', () => {
        render(<OriginStorySection />)
        expect(screen.getByText('The Ekatva Family: From batchmates to lifelong friends')).toBeInTheDocument()
    })
})

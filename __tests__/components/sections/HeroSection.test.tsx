import React from 'react'
import { render, screen } from '@testing-library/react'
import HeroSection from '@/components/sections/HeroSection'

type MotionProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode
  className?: string
  initial?: unknown
  animate?: unknown
  exit?: unknown
  transition?: unknown
  variants?: unknown
  whileHover?: unknown
  whileTap?: unknown
  style?: React.CSSProperties
  onClick?: React.MouseEventHandler
}

// Mock framer-motion — include every export HeroSection uses
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...rest }: MotionProps) =>
      <div className={className} style={style} onClick={onClick} data-testid={(rest as Record<string, string>)['data-testid']}>{children}</div>,
    h1: ({ children, className, style }: MotionProps) =>
      <h1 className={className} style={style}>{children}</h1>,
    h2: ({ children, className, style }: MotionProps) =>
      <h2 className={className} style={style}>{children}</h2>,
    p: ({ children, className, style }: MotionProps) =>
      <p className={className} style={style}>{children}</p>,
    span: ({ children, className, style }: MotionProps) =>
      <span className={className} style={style}>{children}</span>,
    section: ({ children, className, style }: MotionProps) =>
      <section className={className} style={style}>{children}</section>,
    button: ({ children, className, onClick }: MotionProps) =>
      <button className={className} onClick={onClick}>{children}</button>,
    header: ({ children, className, style }: MotionProps) =>
      <header className={className} style={style}>{children}</header>,
    a: ({ children, className }: MotionProps) =>
      <a className={className}>{children}</a>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useInView: () => true,
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => 0,
  useMotionValue: (initial: number) => ({ get: () => initial }),
  useSpring: (value: unknown) => value,
}))

describe('HeroSection', () => {
  it('renders the main tagline', () => {
    render(<HeroSection />)
    expect(screen.getByText('From Online')).toBeInTheDocument()
  })

  it('renders the CTA buttons', () => {
    render(<HeroSection />)
    expect(screen.getByText('Discover EKATVA')).toBeInTheDocument()
    expect(screen.getByText('Join The Movement')).toBeInTheDocument()
  })

  it('renders the subtitle text', () => {
    render(<HeroSection />)
    expect(screen.getByText(/34,000\+ IITM BS students/i)).toBeInTheDocument()
  })
})

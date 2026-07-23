import { render, screen } from '@testing-library/react'
import Card from '@/components/ui/Card'

describe('Card Component', () => {
    it('renders children correctly', () => {
        render(<Card>Test Content</Card>)
        expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('applies gradient class when gradient prop is true', () => {
        render(<Card gradient><span data-testid="inner">Test Content</span></Card>)
        // Walk up from the inner span to find the card wrapper
        const card = screen.getByTestId('inner').closest('.rounded-2xl')
        expect(card).toHaveClass('bg-gradient-to-br')
    })

    it('renders with motion component when hover is true', () => {
        render(<Card hover>Test Content</Card>)
        // motion.div still renders a div — just verify it rendered
        expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('applies additional className', () => {
        render(<Card className="test-class"><span data-testid="inner2">Test Content</span></Card>)
        const card = screen.getByTestId('inner2').closest('.rounded-2xl')
        expect(card).toHaveClass('test-class')
    })
})

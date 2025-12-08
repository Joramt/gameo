import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Loading from '../Loading'

describe('Loading', () => {
  it('renders loading spinner', () => {
    render(<Loading />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('has proper ARIA attributes', () => {
    render(<Loading />)
    const container = screen.getByRole('status')
    expect(container).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText(/loading application/i)).toBeInTheDocument()
  })
})


import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddGameCard from '../AddGameCard'

describe('AddGameCard', () => {
  it('renders plus icon', () => {
    const onClick = vi.fn()
    render(<AddGameCard onClick={onClick} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('has proper ARIA label', () => {
    const onClick = vi.fn()
    render(<AddGameCard onClick={onClick} />)
    const button = screen.getByRole('button', { name: /add a new game to your library/i })
    expect(button).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<AddGameCard onClick={onClick} />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})


import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GameCard from '../GameCard'

describe('GameCard', () => {
  const mockGame = {
    id: 1,
    name: 'Test Game',
    image: 'https://example.com/game.jpg',
    releaseDate: 'Jan 2023',
    studio: 'Test Studio'
  }

  it('renders game name', () => {
    render(<GameCard game={mockGame} />)
    expect(screen.getByText('Test Game')).toBeInTheDocument()
  })

  it('renders studio name', () => {
    render(<GameCard game={mockGame} />)
    expect(screen.getByText('Test Studio')).toBeInTheDocument()
  })

  it('renders release date', () => {
    render(<GameCard game={mockGame} />)
    expect(screen.getByText('Jan 2023')).toBeInTheDocument()
  })

  it('renders game image with correct alt text', () => {
    render(<GameCard game={mockGame} />)
    const image = screen.getByAltText('Test Game')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', mockGame.image)
  })

  it('has proper ARIA label', () => {
    render(<GameCard game={mockGame} />)
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('aria-label', 'Game: Test Game')
  })

  it('handles missing release date gracefully', () => {
    const gameWithoutDate = { ...mockGame, releaseDate: null }
    render(<GameCard game={gameWithoutDate} />)
    expect(screen.getByText('Test Game')).toBeInTheDocument()
  })
})


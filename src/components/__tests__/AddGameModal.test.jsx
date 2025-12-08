import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddGameModal from '../AddGameModal'

// Mock fetch
global.fetch = vi.fn()

describe('AddGameModal', () => {
  const mockOnClose = vi.fn()
  const mockOnAddGame = vi.fn()
  const mockLibrary = []

  beforeEach(() => {
    vi.clearAllMocks()
    fetch.mockClear()
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render when isOpen is false', () => {
    render(
      <AddGameModal 
        isOpen={false} 
        onClose={mockOnClose} 
        onAddGame={mockOnAddGame}
        library={mockLibrary}
      />
    )
    expect(screen.queryByPlaceholderText(/search for a game/i)).not.toBeInTheDocument()
  })

  it('renders when isOpen is true', () => {
    render(
      <AddGameModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onAddGame={mockOnAddGame}
        library={mockLibrary}
      />
    )
    expect(screen.getByPlaceholderText(/search for a game/i)).toBeInTheDocument()
  })

  it('has proper ARIA label for search input', () => {
    render(
      <AddGameModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onAddGame={mockOnAddGame}
        library={mockLibrary}
      />
    )
    const input = screen.getByLabelText(/search for games/i)
    expect(input).toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    render(
      <AddGameModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onAddGame={mockOnAddGame}
        library={mockLibrary}
      />
    )
    
    const input = screen.getByPlaceholderText(/search for a game/i)
    await user.type(input, '{Escape}')
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('shows clear button when input has value', async () => {
    const user = userEvent.setup()
    render(
      <AddGameModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onAddGame={mockOnAddGame}
        library={mockLibrary}
      />
    )
    
    const input = screen.getByPlaceholderText(/search for a game/i)
    await user.type(input, 'test')
    
    const clearButton = screen.getByLabelText(/clear/i)
    expect(clearButton).toBeInTheDocument()
  })

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <AddGameModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onAddGame={mockOnAddGame}
        library={mockLibrary}
      />
    )
    
    const input = screen.getByPlaceholderText(/search for a game/i)
    await user.type(input, 'test')
    await user.click(screen.getByLabelText(/clear/i))
    
    expect(input).toHaveValue('')
  })

  it('does not search with less than 3 characters', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    
    render(
      <AddGameModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onAddGame={mockOnAddGame}
        library={mockLibrary}
      />
    )
    
    const input = screen.getByPlaceholderText(/search for a game/i)
    await user.type(input, 'ab')
    
    vi.advanceTimersByTime(600)
    
    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  it('shows "no games found" message when search returns no results', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    
    // Mock backend search returning empty results
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: {} })
      })

    render(
      <AddGameModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onAddGame={mockOnAddGame}
        library={mockLibrary}
      />
    )
    
    const input = screen.getByPlaceholderText(/search for a game/i)
    await user.type(input, 'nonexistent')
    
    vi.advanceTimersByTime(600)
    
    await waitFor(() => {
      expect(screen.getByText(/no games found/i)).toBeInTheDocument()
    })
  })

  it('shows "In Library" badge for games already in library', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    
    const libraryGame = {
      id: 1,
      name: 'Baldur\'s Gate 3',
      steamAppId: '1086940'
    }

    const mockSearchResult = {
      items: [{ id: '1086940', name: 'Baldur\'s Gate 3' }]
    }

    const mockGameDetails = {
      games: {
        '1086940': {
          id: '1086940',
          name: 'Baldur\'s Gate 3',
          steamAppId: '1086940',
          releaseDate: 1691035200000,
          cover: 'https://example.com/cover.jpg',
          studio: 'Larian Studios'
        }
      }
    }

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGameDetails
      })

    render(
      <AddGameModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onAddGame={mockOnAddGame}
        library={[libraryGame]}
      />
    )
    
    const input = screen.getByPlaceholderText(/search for a game/i)
    await user.type(input, 'baldur')
    
    vi.advanceTimersByTime(600)
    
    await waitFor(() => {
      expect(screen.getByText(/in library/i)).toBeInTheDocument()
    })
  })
})


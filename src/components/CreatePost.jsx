import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function CreatePost({ isOpen, onClose, onPostCreated }) {
  const titleRef = useRef(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [gameSearch, setGameSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    if (isOpen && titleRef.current) {
      titleRef.current.focus()
      setTitle('')
      setDescription('')
      setGameSearch('')
      setSearchResults([])
      setSelectedGame(null)
      setError('')
    }
  }, [isOpen])

  // Debounced search for games
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (gameSearch.length < 1) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      setError('')
      try {
        const token = sessionStorage.getItem('auth_token')
        const response = await fetch(`${API_URL}/api/posts/games/search?q=${encodeURIComponent(gameSearch)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.games || [])
        } else {
          setSearchResults([])
        }
      } catch (error) {
        console.error('Error searching games:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [gameSearch])

  const handleGameSelect = (game) => {
    setSelectedGame(game)
    setGameSearch(game.name)
    setSearchResults([])
  }

  const handleClearGame = () => {
    setSelectedGame(null)
    setGameSearch('')
    setSearchResults([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    if (!selectedGame) {
      setError('Please select a game from your library')
      return
    }

    setIsSubmitting(true)
    try {
      const token = sessionStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          userGameId: selectedGame.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (onPostCreated) {
          onPostCreated(data.post)
        }
        onClose()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create post' }))
        setError(errorData.error || 'Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      setError('Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Post">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Title input */}
        <div>
          <label htmlFor="post-title" className="block text-sm font-medium text-gray-300 mb-2">
            Title *
          </label>
          <input
            ref={titleRef}
            id="post-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title..."
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            maxLength={500}
            required
          />
        </div>

        {/* Description textarea */}
        <div>
          <label htmlFor="post-description" className="block text-sm font-medium text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            id="post-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share your thoughts..."
            rows={6}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            required
          />
        </div>

        {/* Game selection with autocomplete */}
        <div>
          <label htmlFor="post-game" className="block text-sm font-medium text-gray-300 mb-2">
            Game * (from your library)
          </label>
          <div className="relative">
            <input
              id="post-game"
              type="text"
              value={gameSearch}
              onChange={(e) => setGameSearch(e.target.value)}
              onFocus={() => {
                // Show results if we have a selected game or search text
                if (selectedGame || gameSearch.length > 0) {
                  // Trigger search if there's text
                  if (gameSearch.length > 0 && !selectedGame) {
                    // Search will trigger via useEffect
                  }
                }
              }}
              placeholder="Search for a game in your library..."
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required={!selectedGame}
            />
            {selectedGame && (
              <button
                type="button"
                onClick={handleClearGame}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label="Clear game selection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Search results dropdown */}
            {!selectedGame && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {searchResults.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => handleGameSelect(game)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 border-b border-gray-700/50 last:border-b-0"
                  >
                    {game.image && (
                      <img
                        src={game.image}
                        alt={game.name}
                        className="w-12 h-16 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{game.name}</div>
                      {(game.steamAppId || game.psnPlatform) && (
                        <div className="text-gray-400 text-xs mt-1">
                          {game.steamAppId && <span>Steam</span>}
                          {game.steamAppId && game.psnPlatform && <span> • </span>}
                          {game.psnPlatform && <span>{game.psnPlatform}</span>}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>

          {/* Selected game display */}
          {selectedGame && (
            <div className="mt-3 p-3 bg-gray-700/30 border border-gray-600 rounded-lg flex items-center gap-3">
              {selectedGame.image && (
                <img
                  src={selectedGame.image}
                  alt={selectedGame.name}
                  className="w-12 h-16 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <div className="text-white font-medium">{selectedGame.name}</div>
                {(selectedGame.steamAppId || selectedGame.psnPlatform) && (
                  <div className="text-gray-400 text-xs mt-1">
                    {selectedGame.steamAppId && <span>Steam</span>}
                    {selectedGame.steamAppId && selectedGame.psnPlatform && <span> • </span>}
                    {selectedGame.psnPlatform && <span>{selectedGame.psnPlatform}</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit buttons */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim() || !selectedGame}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Posting...' : 'Create Post'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreatePost



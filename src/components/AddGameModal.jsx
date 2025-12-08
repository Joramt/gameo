import { useEffect, useRef, useState } from 'react'

function AddGameModal({ isOpen, onClose, onAddGame, library = [] }) {
  const inputRef = useRef(null)
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setSearchValue('')
      setSearchResults([])
    }
  }, [isOpen])

  // Debounced search after 3 characters
  useEffect(() => {
    if (searchValue.length < 3) {
      setSearchResults([])
      return
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true)
      try {
        // Use backend API endpoint (fallback to CORS proxy only if backend is completely unavailable)
        let backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
        
        // Ensure backendUrl is absolute (has protocol)
        if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
          // If it's just a domain, add https://
          backendUrl = `https://${backendUrl}`
        }
        
        // Remove trailing slash if present
        backendUrl = backendUrl.replace(/\/$/, '')
        
        const searchEndpoint = `${backendUrl}/api/steam/search?q=${encodeURIComponent(searchValue)}`
        
        let useBackend = true
        
        try {
          // Try backend search endpoint
          const searchResponse = await fetch(searchEndpoint)
          
          if (!searchResponse.ok) {
            throw new Error(`Backend search returned ${searchResponse.status}`)
          }
          
          const searchData = await searchResponse.json()
          const items = searchData.items || []
          
          if (items.length === 0) {
            setSearchResults([])
            return
          }
          
          // Get game details from backend
          const appIds = items.slice(0, 10).map(item => item.id).join(',')
          const detailsEndpoint = `${backendUrl}/api/steam/games?ids=${appIds}`
          
          const detailsResponse = await fetch(detailsEndpoint)
          
          if (!detailsResponse.ok) {
            throw new Error(`Backend details returned ${detailsResponse.status}`)
          }
          
          const detailsData = await detailsResponse.json()
          const games = detailsData.games || {}
          
          // Transform backend response to frontend format
          const gamesWithDetails = Object.values(games)
            .filter(game => game !== null)
            .map(game => ({
              id: game.id,
              name: game.name,
              releaseDate: game.releaseDate || 0,
              cover: game.cover,
              steamAppId: game.steamAppId,
              studio: game.studio
            }))
          
          // Sort by release date (newest first) and take top 10
          const sortedGames = gamesWithDetails
            .filter(game => game.releaseDate > 0)
            .sort((a, b) => b.releaseDate - a.releaseDate)
            .slice(0, 10)
          
          setSearchResults(sortedGames)
          return // Successfully used backend, don't fall through to CORS proxy
          
        } catch (backendErr) {
          // Only use CORS proxy if backend is completely unavailable (network error, not found, etc.)
          if (backendErr.name === 'TypeError' && backendErr.message.includes('fetch')) {
            // Network error - backend might be down
            console.warn('Backend unavailable, using CORS proxy fallback:', backendErr.message)
            useBackend = false
          } else {
            // Backend returned an error - don't use fallback, show empty results
            console.error('Backend error:', backendErr)
            setSearchResults([])
            return
          }
        }
        
        // Only use CORS proxy if backend is completely unavailable (network error)
        if (!useBackend) {
          const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(searchValue)}&cc=US&l=en&count=50`
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`
          
          const response = await fetch(proxyUrl)
          
          if (response.ok) {
            const data = await response.json()
            const content = JSON.parse(data.contents)
            
            if (content.items && content.items.length > 0) {
              // Batch fetch details in a single request instead of multiple requests
              const appIds = content.items.slice(0, 10).map(item => item.id).join(',')
              // Steam appdetails API includes release_date by default
              const detailUrl = `https://store.steampowered.com/api/appdetails?appids=${appIds}&cc=US&l=en`
              const detailProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(detailUrl)}`
              
              try {
                const detailResponse = await fetch(detailProxyUrl)
                
                if (detailResponse.ok) {
                  const detailData = await detailResponse.json()
                  const detailContent = JSON.parse(detailData.contents)
                  
                  // Process all games from the batch response
                  const gamesWithDetails = Object.keys(detailContent)
                    .map(appId => {
                      const appResponse = detailContent[appId]
                      if (!appResponse || !appResponse.success) {
                        return null
                      }
                      
                      const gameData = appResponse.data
                      if (!gameData) {
                        return null
                      }
                      
                      // Parse release date from Steam API
                      // Steam API release_date structure: { date: "Aug 3, 2023", coming_soon: false }
                      let releaseDate = 0
                      
                      // Check for release_date in the game data
                      // Steam appdetails API always includes release_date field
                      if (gameData.release_date && typeof gameData.release_date === 'object') {
                        const releaseDateObj = gameData.release_date
                        const dateStr = releaseDateObj.date
                        const comingSoon = releaseDateObj.coming_soon === true
                        
                        // Only parse if game is released (not coming soon) and date string exists
                        if (!comingSoon && dateStr && typeof dateStr === 'string' && dateStr.trim() !== '') {
                          // Skip placeholder strings
                          const lowerDateStr = dateStr.toLowerCase().trim()
                          if (!lowerDateStr.includes('coming soon') && 
                              !lowerDateStr.includes('tba') && 
                              !lowerDateStr.includes('to be announced') &&
                              lowerDateStr !== '') {
                            
                            // Steam date format is "Aug 3, 2023" (month day, year)
                            // JavaScript Date constructor handles this format natively
                            const parsedDate = new Date(dateStr)
                            
                            // Validate the parsed date
                            if (!isNaN(parsedDate.getTime())) {
                              // Check if date is reasonable (not epoch or far future)
                              const year = parsedDate.getFullYear()
                              if (year >= 1970 && year <= 2100) {
                                releaseDate = parsedDate.getTime()
                              }
                            }
                          }
                        }
                      }
                      
                      // Extract studio from developers array (first developer)
                      const studio = gameData.developers && gameData.developers.length > 0
                        ? gameData.developers[0]
                        : null

                      return {
                        id: appId,
                        name: gameData.name,
                        releaseDate: releaseDate,
                        cover: gameData.header_image || gameData.capsule_image || gameData.capsule_imagev5,
                        steamAppId: appId,
                        studio: studio
                      }
                    })
                    .filter(Boolean)
                  
                  // Sort by release date (newest first) and take top 10
                  const sortedGames = gamesWithDetails
                    .filter(game => game.releaseDate > 0)
                    .sort((a, b) => b.releaseDate - a.releaseDate)
                    .slice(0, 10)
                  
                  setSearchResults(sortedGames)
                } else {
                  // Fallback to basic search results if detail fetch fails
                  const basicResults = content.items.slice(0, 10).map(item => ({
                    id: item.id,
                    name: item.name,
                    releaseDate: 0,
                    cover: item.tiny_image || item.small_image,
                    steamAppId: item.id,
                    studio: null
                  }))
                  setSearchResults(basicResults)
                }
              } catch (err) {
                // Fallback to basic search results on error
                const basicResults = content.items.slice(0, 10).map(item => ({
                  id: item.id,
                  name: item.name,
                  releaseDate: 0,
                  cover: item.tiny_image || item.small_image,
                  steamAppId: item.id,
                  studio: null
                }))
                setSearchResults(basicResults)
              }
            } else {
              setSearchResults([])
            }
          } else {
            setSearchResults([])
          }
        }
      } catch (error) {
        // Silently handle errors - user will see empty results
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 500) // 500ms debounce to reduce requests

    return () => clearTimeout(searchTimeout)
  }, [searchValue])

  const handleSubmit = (e) => {
    e.preventDefault()
    // Form submission is handled by clicking on search results
  }

  // Check if a game is already in the library
  const isGameInLibrary = (game) => {
    return library.some(
      libGame => libGame.name === game.name || 
      (libGame.steamAppId && libGame.steamAppId === game.steamAppId)
    )
  }

  const handleGameClick = (game) => {
    if (!isGameInLibrary(game)) {
      onAddGame(game)
    }
  }

  const handleClear = () => {
    setSearchValue('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/40 backdrop-blur-md"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl mx-4 transform transition-all duration-200 ease-out">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search for a game..."
              className="w-full px-14 py-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-lg shadow-2xl"
              style={{ border: '1px solid #ffffff36' }}
              aria-label="Search for games"
              aria-describedby="search-description"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose()
                }
              }}
            />
            <span id="search-description" className="sr-only">
              Type at least 3 characters to search for games on Steam
            </span>
            <svg
              className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-white transition-colors"
                aria-label="Clear"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Search Results */}
        {(searchResults.length > 0 || isSearching || (searchValue.length >= 3 && !isSearching && searchResults.length === 0)) && (
          <div className="mt-2 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden" style={{ border: '1px solid #ffffff36' }}>
            {isSearching ? (
              <div className="p-4 text-center text-gray-400">
                <div className="inline-block w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <ul className="max-h-96 overflow-y-auto">
                {searchResults.map((game) => {
                  const inLibrary = isGameInLibrary(game)
                  return (
                    <li
                      key={game.id}
                      className={`px-4 py-3 transition-colors border-b border-white/10 last:border-b-0 ${
                        inLibrary 
                          ? 'bg-white/5 cursor-not-allowed opacity-60' 
                          : 'hover:bg-white/10 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!inLibrary) {
                          handleGameClick(game)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {game.cover && (
                          <img
                            src={game.cover}
                            alt={`${game.name} cover art`}
                            className="w-12 h-16 object-cover rounded"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-white font-medium truncate">{game.name}</div>
                            {inLibrary && (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                                In Library
                              </span>
                            )}
                          </div>
                          {game.releaseDate > 0 ? (
                            <div className="text-gray-400 text-sm">
                              {new Date(game.releaseDate).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg font-medium text-gray-300 mb-1">No games found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AddGameModal


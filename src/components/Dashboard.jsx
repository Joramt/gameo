import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import GameCard from './GameCard'
import AddGameCard from './AddGameCard'
import AddGameModal from './AddGameModal'
import GameInfoModal from './GameInfoModal'
import GameLibrary3D from './GameLibrary3D'
import { storageService } from '../services/storage'

function Dashboard() {
  const { isAuthenticated, user, logout, isLoading, hasBudget } = useAuth()
  const navigate = useNavigate()

  const [recentGames, setRecentGames] = useState([])
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false)
  const [isGameInfoModalOpen, setIsGameInfoModalOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [isTimeOnlyMode, setIsTimeOnlyMode] = useState(false)
  const [isLoadingGames, setIsLoadingGames] = useState(true)
  const [nextGameId, setNextGameId] = useState(1)
  const gamesScrollRef = useRef(null)
  const mobileScrollRef = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const isScrolling = useRef(false)

  // Get user ID for storage
  const userId = user?.id || user?.email || 'demo-user'

  // Load games from storage on mount
  useEffect(() => {
    const loadGames = async () => {
      try {
        setIsLoadingGames(true)
        const games = await storageService.getGames(userId)
        
        if (games.length > 0) {
          setRecentGames(games)
          // Set nextGameId to be higher than the highest existing ID
          const maxId = Math.max(...games.map(g => g.id || 0))
          setNextGameId(maxId + 1)
          // Reset mobile index when games are loaded
          setCurrentGameIndex(0)
        } else {
          // Empty library - no default games
          setRecentGames([])
          setNextGameId(1)
          setCurrentGameIndex(0)
        }
      } catch (error) {
        console.error('Error loading games:', error)
      } finally {
        setIsLoadingGames(false)
      }
    }

    if (isAuthenticated) {
      loadGames()
    }
  }, [userId, isAuthenticated])

  const handleAddGame = () => {
    setIsAddGameModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsAddGameModalOpen(false)
  }

  const handleTimerClick = (game) => {
    setSelectedGame(game)
    setIsTimeOnlyMode(true)
    setIsGameInfoModalOpen(true)
  }

  const handleSaveGameInfo = async (gameInfo) => {
    try {
      // Update game in storage
      await storageService.updateGame(userId, gameInfo.id, gameInfo)

      // Update local state
      setRecentGames(prevGames =>
        prevGames.map(game =>
          game.id === gameInfo.id ? gameInfo : game
        )
      )
    } catch (error) {
      console.error('Error saving game info:', error)
    }
  }

  const handleAddGameToLibrary = async (gameData) => {
    try {
      // Check if game is already in library using storage service
      const isAlreadyInLibrary = await storageService.hasGame(
        userId, 
        gameData.steamAppId || gameData.id, 
        gameData.steamAppId
      )

      if (isAlreadyInLibrary) {
        return // Don't add duplicate
      }

      // Format release date from timestamp to "Month Year" format
      let formattedReleaseDate = ''
      if (gameData.releaseDate > 0) {
        const date = new Date(gameData.releaseDate)
        formattedReleaseDate = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        })
      }

      // Use the same image as shown in search results (header_image, typically 380x640 or higher)
      // This ensures consistency between search and library display
      let imageUrl = gameData.cover
      
      // If we have a steamAppId but no cover, try to get a high-res library image
      // Otherwise, use the cover image from search (which is header_image)
      if (gameData.steamAppId && !imageUrl) {
        imageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${gameData.steamAppId}/library_600x900.jpg`
      }

      // Create new game object
      const newGame = {
        id: nextGameId,
        name: gameData.name,
        image: imageUrl,
        releaseDate: formattedReleaseDate,
        studio: gameData.studio || 'Unknown Studio',
        steamAppId: gameData.steamAppId || null,
      }

      // Add to storage
      await storageService.addGame(userId, newGame)

      // Update local state (prepend to show most recently added first)
      setRecentGames(prevGames => [newGame, ...prevGames])
      setNextGameId(prevId => prevId + 1)
      setIsAddGameModalOpen(false)

      // Open game info modal to collect information
      setSelectedGame(newGame)
      setIsTimeOnlyMode(false)
      setIsGameInfoModalOpen(true)

      // Reset mobile scroll index to show the new game
      setCurrentGameIndex(0)

      // Scroll to beginning to show the newly added game
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (gamesScrollRef.current) {
          gamesScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
        }
      }, 100)
    } catch (error) {
      console.error('Error adding game to library:', error)
      // Still close modal even if storage fails
      setIsAddGameModalOpen(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/')
    }
    // Don't auto-redirect to budget-setup from dashboard - let the login/signup flow handle that
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-white">G</span>
              </div>
              <span className="text-2xl font-bold text-white">Gameo</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {user?.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <span className="text-white">{user?.name || user?.email}</span>
              </div>
              <button
                onClick={() => logout()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container mx-auto px-6 py-6 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Welcome back, {user?.name?.split(' ')[0] || 'Gamer'}! 🎮
              </h1>
              <p className="text-gray-400 text-sm md:text-base" id="games-description">
                Here are your recently added games
              </p>
            </div>
            <button
              onClick={handleAddGame}
              className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              aria-label="Add a new game to your library"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Game
            </button>
          </div>

          {/* Recent Games - Horizontal Scroll with Fixed Add Game Card */}
          {isLoadingGames ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Loading your games...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: Add Game Link on Top */}
              <div className="mb-4 md:hidden">
                <button
                  onClick={handleAddGame}
                  className="w-full text-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  aria-label="Add a new game to your library"
                >
                  Click to add game in your library
                </button>
              </div>

              {/* Desktop: Add Game Card on Left */}
              <div className="hidden md:flex gap-6 items-start" role="list" aria-labelledby="games-description">
                <div className="flex-shrink-0">
                  <AddGameCard onClick={handleAddGame} />
                </div>

                {/* Game Cards - Horizontal Scroll Container */}
                {recentGames.length > 0 ? (
                  <div 
                    ref={gamesScrollRef}
                    className="flex gap-6 overflow-x-auto pb-4 flex-1 min-w-0" 
                    style={{ 
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#4b5563 #1f2937'
                    }}
                  >
                    {recentGames.map((game) => (
                      <GameCard 
                        key={game.id} 
                        game={game}
                        onTimerClick={handleTimerClick}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-gray-400 text-lg">
                        You don't have any games in your library yet
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        Click the card on the left to add your first game!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile: Full Screen Game Cards with Swipe */}
              {recentGames.length > 0 ? (
                <div 
                  ref={mobileScrollRef}
                  className="md:hidden relative overflow-hidden pb-4 hide-scrollbar"
                  style={{ 
                    height: 'calc(100vh - 240px)', // Account for nav (~64px) + h1/p (~100px) + button (~60px) + padding (~16px)
                    touchAction: 'pan-y pinch-zoom' // Disable horizontal pan, allow vertical
                  }}
                  onTouchStart={(e) => {
                    if (isScrolling.current) return
                    touchStartX.current = e.touches[0].clientX
                    touchStartY.current = e.touches[0].clientY
                  }}
                  onTouchMove={(e) => {
                    if (isScrolling.current) return
                    const touchX = e.touches[0].clientX
                    const touchY = e.touches[0].clientY
                    const deltaX = touchX - touchStartX.current
                    const deltaY = touchY - touchStartY.current
                    
                    // Only handle horizontal swipes (ignore vertical scrolling)
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                      e.preventDefault()
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (isScrolling.current) return
                    const touchEndX = e.changedTouches[0].clientX
                    const touchEndY = e.changedTouches[0].clientY
                    const deltaX = touchEndX - touchStartX.current
                    const deltaY = touchEndY - touchStartY.current
                    
                    // Only handle horizontal swipes (minimum 50px swipe distance)
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                      isScrolling.current = true
                      
                      setCurrentGameIndex((prevIndex) => {
                        let newIndex = prevIndex
                        // Swipe left (negative deltaX) = show next game (increase index)
                        // Swipe right (positive deltaX) = show previous game (decrease index)
                        if (deltaX < 0 && prevIndex < recentGames.length - 1) {
                          // Swipe left - go to next game
                          newIndex = prevIndex + 1
                        } else if (deltaX > 0 && prevIndex > 0) {
                          // Swipe right - go to previous game
                          newIndex = prevIndex - 1
                        }
                        return newIndex
                      })
                      
                      // Reset scrolling flag after animation
                      setTimeout(() => {
                        isScrolling.current = false
                      }, 300)
                    }
                  }}
                >
                  <div 
                    className="flex h-full transition-transform duration-300 ease-out"
                    style={{
                      transform: `translateX(${-currentGameIndex * 100}%)`,
                      width: `100%`
                    }}
                  >
                    {recentGames.map((game) => (
                      <div 
                        key={game.id} 
                        className="flex-shrink-0 w-full h-full flex justify-center self-center"
                      >
                        <GameCard 
                          game={game}
                          onTimerClick={handleTimerClick}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="md:hidden flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-gray-400 text-lg">
                      You don't have any games in your library yet
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      Click the button above to add your first game!
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 3D Library Room */}
          <div className="mt-8 md:mt-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Your Game Library
            </h2>
            <p className="text-gray-400 mb-6 text-sm md:text-base">
              Explore your collection in 3D • Drag to look around
            </p>
            <GameLibrary3D games={recentGames} />
          </div>
        </div>
      </div>

      {/* Add Game Modal */}
      <AddGameModal
        isOpen={isAddGameModalOpen}
        onClose={handleCloseModal}
        onAddGame={handleAddGameToLibrary}
        library={recentGames}
      />

      {/* Game Info Modal */}
      <GameInfoModal
        isOpen={isGameInfoModalOpen}
        onClose={() => {
          setIsGameInfoModalOpen(false)
          setSelectedGame(null)
        }}
        onSave={handleSaveGameInfo}
        game={selectedGame}
        isTimeOnly={isTimeOnlyMode}
      />
    </div>
  )
}

export default Dashboard


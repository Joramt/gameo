import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import GameCard from './GameCard'
import AddGameCard from './AddGameCard'
import AddGameModal from './AddGameModal'
import { storageService } from '../services/storage'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const isAuth0Configured = domain && clientId && 
  !domain.includes('example') && 
  !clientId.includes('example')

function Dashboard() {
  const { isAuthenticated: authIsAuthenticated, user: authUser, logout: authLogout, isLoading: authIsLoading } = useAuth0()
  const navigate = useNavigate()
  
  // In demo mode (Auth0 not configured), allow access
  const isAuthenticated = isAuth0Configured ? authIsAuthenticated : true
  const user = isAuth0Configured ? authUser : { name: 'Demo User', email: 'demo@gameo.com' }
  const logout = isAuth0Configured ? authLogout : null
  const isLoading = isAuth0Configured ? authIsLoading : false

  const [recentGames, setRecentGames] = useState([])
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false)
  const [isLoadingGames, setIsLoadingGames] = useState(true)
  const [nextGameId, setNextGameId] = useState(1)
  const gamesScrollRef = useRef(null)

  // Get user ID for storage
  const userId = user?.sub || user?.email || 'demo-user'

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
        } else {
          // Empty library - no default games
          setRecentGames([])
          setNextGameId(1)
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

      // Get library image URL (Steam library_600x900 format)
      // If we have a steamAppId, use the library image URL, otherwise use the cover image
      let imageUrl = gameData.cover
      if (gameData.steamAppId) {
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
    // Only redirect if Auth0 is configured and user is not authenticated
    if (isAuth0Configured && !isLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, isLoading, navigate])

  // Add timeout for loading state to prevent infinite loading
  useEffect(() => {
    if (isLoading && isAuth0Configured) {
      // Timeout handled silently - user will see loading state
      const timer = setTimeout(() => {
        // Could show user-friendly error message here in production
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  if (isLoading && isAuth0Configured) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading...</div>
          <p className="text-gray-400 text-sm mt-2">If this takes too long, check your Auth0 configuration</p>
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
              {logout && (
                <button
                  onClick={() => logout({ returnTo: window.location.origin })}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              )}
              {!isAuth0Configured && (
                <div className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm">
                  Demo Mode
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'Gamer'}! 🎮
          </h1>
          <p className="text-gray-400 mb-8" id="games-description">
            Here are your recently added games
          </p>

          {/* Recent Games - Horizontal Scroll with Fixed Add Game Card */}
          {isLoadingGames ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Loading your games...</p>
              </div>
            </div>
          ) : (
            <div className="relative flex gap-6" role="list" aria-labelledby="games-description">
              {/* Add Game Card - Fixed on Left, Outside Scroll Container */}
              <div className="flex-shrink-0">
                <AddGameCard onClick={handleAddGame} />
              </div>

              {/* Game Cards - Horizontal Scroll Container */}
              {recentGames.length > 0 ? (
                <div 
                  ref={gamesScrollRef}
                  className="flex gap-6 overflow-x-auto pb-4 flex-1" 
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#4b5563 #1f2937'
                  }}
                >
                  {recentGames.map((game) => (
                    <GameCard key={game.id} game={game} />
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
          )}
        </div>
      </div>

      {/* Add Game Modal */}
      <AddGameModal
        isOpen={isAddGameModalOpen}
        onClose={handleCloseModal}
        onAddGame={handleAddGameToLibrary}
        library={recentGames}
      />
    </div>
  )
}

export default Dashboard


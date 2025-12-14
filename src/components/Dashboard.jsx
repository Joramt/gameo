import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import GameCard from './GameCard'
import AddGameCard from './AddGameCard'
import AddGameModal from './AddGameModal'
import GameInfoModal from './GameInfoModal'
import GameLibrary3D from './GameLibrary3D'
import Modal from './Modal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function Dashboard() {
  const { isAuthenticated, user, logout, isLoading, hasBudget } = useAuth()
  const navigate = useNavigate()

  const [recentGames, setRecentGames] = useState([])
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false)
  const [isGameInfoModalOpen, setIsGameInfoModalOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [isTimeOnlyMode, setIsTimeOnlyMode] = useState(false)
  const [isLoadingGames, setIsLoadingGames] = useState(true)
  const gamesScrollRef = useRef(null)
  const mobileScrollRef = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const isScrolling = useRef(false)
  const [showSteamSyncModal, setShowSteamSyncModal] = useState(false)
  const [isCheckingSteam, setIsCheckingSteam] = useState(true)
  const [steamConnected, setSteamConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(true)

  // Get user ID
  const userId = user?.id

  // Check Steam connection status
  useEffect(() => {
    const checkSteamConnection = async () => {
      if (!isAuthenticated) return

      try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/integrations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const steamConnection = data.connections?.find(c => c.service === 'steam')
          const connected = !!steamConnection
          setSteamConnected(connected)

          // Check if user has already accepted sync (check localStorage)
          const hasAcceptedSync = localStorage.getItem(`steam_sync_accepted_${userId}`) === 'true'
          
          // Show modal if Steam is connected and user hasn't accepted sync yet
          if (connected && !hasAcceptedSync) {
            setShowSteamSyncModal(true)
          }
        }
      } catch (error) {
        console.error('Error checking Steam connection:', error)
      } finally {
        setIsCheckingSteam(false)
      }
    }

    if (isAuthenticated) {
      checkSteamConnection()
    }
  }, [isAuthenticated, userId])

  // Update fade visibility based on scroll position
  useEffect(() => {
    const updateFadeVisibility = () => {
      if (gamesScrollRef.current) {
        const scrollLeft = gamesScrollRef.current.scrollLeft
        const scrollWidth = gamesScrollRef.current.scrollWidth
        const clientWidth = gamesScrollRef.current.clientWidth
        
        setShowLeftFade(scrollLeft > 10)
        setShowRightFade(scrollLeft + clientWidth < scrollWidth - 10)
      }
    }
    
    if (gamesScrollRef.current && recentGames.length > 0) {
      // Check initial state
      updateFadeVisibility()
      
      // Listen to scroll events
      gamesScrollRef.current.addEventListener('scroll', updateFadeVisibility)
      
      // Also check on resize
      window.addEventListener('resize', updateFadeVisibility)
      
      return () => {
        if (gamesScrollRef.current) {
          gamesScrollRef.current.removeEventListener('scroll', updateFadeVisibility)
        }
        window.removeEventListener('resize', updateFadeVisibility)
      }
    }
  }, [recentGames.length])

  // Load games from database on mount
  useEffect(() => {
    const loadGames = async () => {
      if (!userId) return
      
      try {
        setIsLoadingGames(true)
        const token = localStorage.getItem('auth_token')
        const response = await fetch(`${API_URL}/api/games`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const games = data.games || []
          
          setRecentGames(games)
          setCurrentGameIndex(0)
        } else {
          console.error('Failed to load games')
          setRecentGames([])
        }
      } catch (error) {
        console.error('Error loading games:', error)
        setRecentGames([])
      } finally {
        setIsLoadingGames(false)
      }
    }

    if (isAuthenticated && userId) {
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

  const handleSteamSync = async () => {
    setIsSyncing(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/integrations/steam/library`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const steamGames = data.games || []
        
        // Get existing games to check for duplicates
        const existingGamesResponse = await fetch(`${API_URL}/api/games`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        let existingSteamIds = new Set()
        if (existingGamesResponse.ok) {
          const existingData = await existingGamesResponse.json()
          existingSteamIds = new Set(existingData.games.map(g => g.steamAppId).filter(Boolean))
        }
        
        // Transform Steam games and add to database
        const newGames = []
        let addedCount = 0
        let skippedCount = 0
        
        for (const steamGame of steamGames) {
          // Skip if already in library
          if (existingSteamIds.has(String(steamGame.appid))) {
            skippedCount++
            continue
          }
          
          // Format release date - Steam API doesn't provide release date in GetOwnedGames
          // We'll leave it empty or use last played time if available
          let formattedReleaseDate = ''
          if (steamGame.rtime_last_played && steamGame.rtime_last_played > 0) {
            const date = new Date(steamGame.rtime_last_played * 1000)
            formattedReleaseDate = date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            })
          }
          
          // Get game image - Steam GetOwnedGames returns img_icon_url and img_logo_url
          // Use library_600x900.jpg for high-quality box art (same as AddGameModal)
          let imageUrl = ''
          if (steamGame.appid) {
            imageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamGame.appid}/library_600x900.jpg`
          }
          
          // Add to database
          try {
            const addResponse = await fetch(`${API_URL}/api/games`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: steamGame.name || 'Unknown Game',
                image: imageUrl,
                releaseDate: formattedReleaseDate,
                studio: 'Unknown Studio',
                steamAppId: String(steamGame.appid),
              }),
            })

            if (addResponse.ok) {
              const gameData = await addResponse.json()
              newGames.push(gameData.game)
              addedCount++
            } else if (addResponse.status === 409) {
              skippedCount++
            }
          } catch (error) {
            console.error(`Error adding game ${steamGame.name}:`, error)
          }
        }
        
        // Update local state with new games (prepend to show most recent first)
        if (newGames.length > 0) {
          setRecentGames(prevGames => [...newGames, ...prevGames])
          
          // Reset mobile index to show new games
          setCurrentGameIndex(0)
          
          // Scroll to beginning to show the newly added games
          setTimeout(() => {
            if (gamesScrollRef.current) {
              gamesScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
            }
          }, 100)
        }
        
        // Mark as accepted
        localStorage.setItem(`steam_sync_accepted_${userId}`, 'true')
        setShowSteamSyncModal(false)
        
        if (addedCount > 0) {
          console.log(`Successfully synced ${addedCount} games from Steam${skippedCount > 0 ? ` (${skippedCount} already in library)` : ''}`)
        } else {
          console.log('All games are already in your library')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch Steam library:', errorData.error)
        alert(`Failed to sync Steam library: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error syncing Steam library:', error)
      alert('An error occurred while syncing your Steam library. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDismissSteamSync = () => {
    // Just close the modal, it will show again next time
    setShowSteamSyncModal(false)
  }

  const handleSaveGameInfo = async (gameInfo) => {
    if (!userId) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/games/${gameInfo.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: gameInfo.name,
          image: gameInfo.image,
          releaseDate: gameInfo.releaseDate,
          studio: gameInfo.studio,
          steamAppId: gameInfo.steamAppId,
          dateStarted: gameInfo.dateStarted,
          dateBought: gameInfo.dateBought,
          price: gameInfo.price,
          timePlayed: gameInfo.timePlayed,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Update local state
        setRecentGames(prevGames =>
          prevGames.map(game =>
            game.id === gameInfo.id ? data.game : game
          )
        )
      } else {
        console.error('Failed to update game')
      }
    } catch (error) {
      console.error('Error saving game info:', error)
    }
  }

  const handleRemoveGame = async (game) => {
    if (!userId) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/games/${game.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Remove from local state
        setRecentGames(prevGames => prevGames.filter(g => g.id !== game.id))
      } else {
        console.error('Failed to remove game')
        alert('Failed to remove game. Please try again.')
      }
    } catch (error) {
      console.error('Error removing game:', error)
      alert('An error occurred while removing the game. Please try again.')
    }
  }

  const handleAddGameToLibrary = async (gameData) => {
    if (!userId) return
    
    try {
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

      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: gameData.name,
          image: imageUrl,
          releaseDate: formattedReleaseDate,
          studio: gameData.studio || 'Unknown Studio',
          steamAppId: gameData.steamAppId || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newGame = data.game

        // Update local state (prepend to show most recently added first)
        setRecentGames(prevGames => [newGame, ...prevGames])
        setIsAddGameModalOpen(false)

        // Open game info modal to collect information
        setSelectedGame(newGame)
        setIsTimeOnlyMode(false)
        setIsGameInfoModalOpen(true)

        // Reset mobile scroll index to show the new game
        setCurrentGameIndex(0)

        // Scroll to beginning to show the newly added game
        setTimeout(() => {
          if (gamesScrollRef.current) {
            gamesScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
          }
        }, 100)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        if (response.status === 409) {
          alert('This game is already in your library')
        } else {
          alert(`Failed to add game: ${errorData.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error adding game to library:', error)
      alert('An error occurred while adding the game. Please try again.')
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
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
              <button
                onClick={() => navigate('/integrations')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                aria-label="Integrations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="hidden md:inline">Integrations</span>
              </button>
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 focus:outline-none"
                  aria-label="User menu"
                >
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border-2 border-gray-600 hover:border-purple-500 transition-colors"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-gray-600 hover:border-purple-500 transition-colors">
                      <span className="text-white font-semibold">
                        {(user?.name || user?.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-white hidden md:inline">{user?.name || user?.email}</span>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${showUserMenu ? 'transform rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-50">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          logout()
                        }}
                        className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>


      {/* Dashboard Content */}
      <div className="container mx-auto px-6 py-6 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Welcome back, {user?.name?.split(' ')[0] || 'Gamer'}! 🎮
            </h1>
            <p className="text-gray-400 text-sm md:text-base" id="games-description">
              Games{' '}
              <span className="text-gray-500 text-xs md:text-sm">
                ({recentGames.length})
              </span>
            </p>
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
              {/* Mobile: Add Game Button */}
              <div className="mb-4 md:hidden">
                <button
                  onClick={handleAddGame}
                  className="w-full text-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
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

              {/* Desktop: Add Game Card on Left */}
              <div className="hidden md:flex gap-6 items-stretch" role="list" aria-labelledby="games-description">
                <div className="flex-shrink-0">
                  <AddGameCard onClick={handleAddGame} />
                </div>

                {/* Game Cards - Horizontal Scroll Container */}
                {recentGames.length > 0 ? (
                  <div className="relative flex-1 min-w-0">
                    {/* Left fade shadow - only show when scrolled, hidden on mobile */}
                    <div 
                      className={`hidden md:block absolute left-0 top-0 bottom-4 w-12 pointer-events-none z-10 transition-opacity duration-300 ${showLeftFade ? 'opacity-100' : 'opacity-0'}`}
                      style={{
                        background: 'linear-gradient(to right, rgb(50, 26, 84), rgb(88 28 135 / 30%), transparent)'
                      }}
                    ></div>
                    {/* Right fade shadow - hide when at end, hidden on mobile */}
                    <div 
                      className={`hidden md:block absolute right-0 top-0 bottom-4 w-12 pointer-events-none z-10 transition-opacity duration-300 ${showRightFade ? 'opacity-100' : 'opacity-0'}`}
                      style={{
                        background: 'linear-gradient(to left, rgb(74, 27, 115), rgb(88 28 135 / 36%), transparent)'
                      }}
                    ></div>
                    <div 
                      ref={gamesScrollRef}
                      className="flex gap-6 overflow-x-auto pb-4" 
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
                        onRemove={handleRemoveGame}
                      />
                    ))}
                    </div>
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
                          onRemove={handleRemoveGame}
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
          {recentGames.length > 0 && (
            <div className="mt-8 md:mt-12">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Your Game Library
              </h2>
              <p className="text-gray-400 mb-6 text-sm md:text-base">
                Explore your collection in 3D • Drag to look around
              </p>
              <GameLibrary3D games={recentGames} />
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

      {/* Steam Sync Modal */}
      <Modal
        isOpen={showSteamSyncModal && !isCheckingSteam}
        onClose={handleDismissSteamSync}
        title="Sync Your Steam Library"
      >
        <div className="space-y-6">
          <div>
            <p className="text-gray-300 mb-4">
              We detected that your Steam account is connected. Would you like to synchronize your Steam game library?
            </p>
            <p className="text-gray-400 text-sm">
              This will add all your Steam games to your Gameo library automatically.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSteamSync}
              disabled={isSyncing}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-purple-500/25"
            >
              {isSyncing ? 'Syncing...' : 'Sync My Games'}
            </button>
            <button
              onClick={handleDismissSteamSync}
              disabled={isSyncing}
              className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Not Now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Dashboard


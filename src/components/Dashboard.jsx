import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import GameCard from './GameCard'
import AddGameCard from './AddGameCard'
import AddGameModal from './AddGameModal'
import GameInfoModal from './GameInfoModal'
import GameLibrary3D from './GameLibrary3D'
import Modal from './Modal'
import Navigation from './Navigation'
import Tabs from './Tabs'
import SocialFeed from './SocialFeed'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function Dashboard() {
  const { isAuthenticated, user, logout, isLoading, hasBudget } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isOnDashboard = location.pathname === '/dashboard'

  // State declarations - must be before functions that use them
  const [recentGames, setRecentGames] = useState([])
  const [lastWeekGames, setLastWeekGames] = useState([])
  const [lastMonthGames, setLastMonthGames] = useState([])
  const [allGames, setAllGames] = useState([])
  const [allGamesRaw, setAllGamesRaw] = useState([]) // Store unfiltered games
  const [availablePlatforms, setAvailablePlatforms] = useState([]) // Platforms user has games for
  const [sortBy, setSortBy] = useState('recent') // 'recent' or 'played'
  const [platformFilter, setPlatformFilter] = useState('all') // 'all' or platform name
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false)
  const [isGameInfoModalOpen, setIsGameInfoModalOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [isTimeOnlyMode, setIsTimeOnlyMode] = useState(false)
  const [isLoadingGames, setIsLoadingGames] = useState(true)
  const gamesScrollRef = useRef(null)
  const mobileScrollRef = useRef(null)
  const [showSteamSyncModal, setShowSteamSyncModal] = useState(false)
  const [isCheckingSteam, setIsCheckingSteam] = useState(true)
  const [steamConnected, setSteamConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentGame: '' })
  const [syncLog, setSyncLog] = useState([]) // Array of { gameName, status: 'syncing' | 'synced' | 'skipped', displayedName: string }
  const syncLogContainerRef = useRef(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(true)
  const [syncSuccessModal, setSyncSuccessModal] = useState({ show: false, addedCount: 0, skippedCount: 0 })
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [addGameErrorModal, setAddGameErrorModal] = useState({ show: false, message: '' })
  const [removeGameErrorModal, setRemoveGameErrorModal] = useState({ show: false, message: '' })
  const [gameAlreadyInLibraryModal, setGameAlreadyInLibraryModal] = useState(false)
  const [activeTab, setActiveTab] = useState('library') // 'library' or 'social'

  // Capitalize first letter of each word in a name
  const capitalizeName = (name) => {
    if (!name) return ''
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  // Helper function to extract platforms from games
  const extractPlatforms = (games) => {
    const platforms = new Set()
    games.forEach(game => {
      if (game.steamAppId) {
        platforms.add('Steam')
      }
      if (game.psnPlatform) {
        // psnPlatform can be comma-separated like "PS4, PS5" or single like "PS5"
        const psnPlatforms = game.psnPlatform.split(',').map(p => p.trim()).filter(Boolean)
        psnPlatforms.forEach(p => platforms.add(p))
      } else if (game.psnId) {
        // Fallback if psnPlatform is not set but psnId exists
        platforms.add('PSN')
      }
    })
    return Array.from(platforms).sort()
  }

  // Helper function to check if game matches platform filter
  const matchesPlatformFilter = (game, filter) => {
    if (filter === 'all') return true
    
    if (filter === 'Steam') {
      return !!game.steamAppId
    }
    
    // For PSN platforms (PS4, PS5, PS3, etc.)
    if (game.psnPlatform) {
      const platforms = game.psnPlatform.split(',').map(p => p.trim())
      return platforms.includes(filter)
    } else if (game.psnId && filter === 'PSN') {
      return true
    }
    
    return false
  }

  // Helper function to sort and filter all games
  const applySortAndFilter = (games, sortOption, filterOption) => {
    // Filter by platform
    let filtered = games.filter(game => matchesPlatformFilter(game, filterOption))
    
    // Sort games
    if (sortOption === 'played') {
      // Sort by time played (most played first)
      filtered.sort((a, b) => {
        const aTime = a.timePlayed || 0
        const bTime = b.timePlayed || 0
        return bTime - aTime
      })
    } else {
      // Sort by last played (most recent first) - default
      filtered.sort((a, b) => {
        const aHasLastPlayed = !!a.lastPlayed
        const bHasLastPlayed = !!b.lastPlayed
        
        // If one has lastPlayed and the other doesn't, prioritize the one with lastPlayed
        if (aHasLastPlayed && !bHasLastPlayed) return -1
        if (!aHasLastPlayed && bHasLastPlayed) return 1
        
        // Both have lastPlayed or both don't - sort by date
        const aDate = a.lastPlayed ? new Date(a.lastPlayed) : (a.createdAt ? new Date(a.createdAt) : new Date(0))
        const bDate = b.lastPlayed ? new Date(b.lastPlayed) : (b.createdAt ? new Date(b.createdAt) : new Date(0))
        return bDate - aDate // Most recent first
      })
    }
    
    return filtered
  }

  // Helper function to categorize games by last played date
  const categorizeGames = (games) => {
    // Extract available platforms
    const platforms = extractPlatforms(games)
    setAvailablePlatforms(platforms)
    
    // Sort games by last_played (most recent first), fallback to created_at
    // Games with lastPlayed always appear before games without lastPlayed
    const sortedGames = [...games].sort((a, b) => {
      const aHasLastPlayed = !!a.lastPlayed
      const bHasLastPlayed = !!b.lastPlayed
      
      // If one has lastPlayed and the other doesn't, prioritize the one with lastPlayed
      if (aHasLastPlayed && !bHasLastPlayed) return -1
      if (!aHasLastPlayed && bHasLastPlayed) return 1
      
      // Both have lastPlayed or both don't - sort by date
      const aDate = a.lastPlayed ? new Date(a.lastPlayed) : (a.createdAt ? new Date(a.createdAt) : new Date(0))
      const bDate = b.lastPlayed ? new Date(b.lastPlayed) : (b.createdAt ? new Date(b.createdAt) : new Date(0))
      return bDate - aDate // Most recent first
    })
    
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Only include games that have a lastPlayed date for these categories
    // Don't use createdAt as fallback - only show games that were actually played
    const lastWeek = sortedGames.filter(game => {
      if (!game.lastPlayed) return false
      const playDate = new Date(game.lastPlayed)
      if (isNaN(playDate.getTime())) return false
      return playDate >= oneWeekAgo
    })
    
    const lastMonth = sortedGames.filter(game => {
      if (!game.lastPlayed) return false
      const playDate = new Date(game.lastPlayed)
      if (isNaN(playDate.getTime())) return false
      return playDate >= oneMonthAgo
    })
    
    setLastWeekGames(lastWeek)
    setLastMonthGames(lastMonth)
    setAllGamesRaw(sortedGames) // Store unfiltered games
    setRecentGames(sortedGames) // Keep for compatibility
    
    // Apply initial sort and filter
    const filteredAndSorted = applySortAndFilter(sortedGames, sortBy, platformFilter)
    setAllGames(filteredAndSorted)
  }

  // Effect to update allGames when sort or filter changes
  useEffect(() => {
    if (allGamesRaw.length > 0) {
      const filteredAndSorted = applySortAndFilter(allGamesRaw, sortBy, platformFilter)
      setAllGames(filteredAndSorted)
    }
  }, [sortBy, platformFilter, allGamesRaw])
  
  // Auto-scroll log to bottom when new items are added
  useEffect(() => {
    if (syncLogContainerRef.current) {
      syncLogContainerRef.current.scrollTop = syncLogContainerRef.current.scrollHeight
    }
  }, [syncLog])

  // Get user ID
  const userId = user?.id

  // Check Steam connection status
  useEffect(() => {
    const checkSteamConnection = async () => {
      if (!isAuthenticated) return

      try {
        const token = sessionStorage.getItem('auth_token')
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

          // Check if Steam has been synced before (check metadata)
          if (connected && userId) {
            const hasSynced = steamConnection?.metadata?.synced === true
            
            // Show modal if Steam is connected but hasn't been synced yet
            if (!hasSynced) {
              setShowSteamSyncModal(true)
            }
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
        const token = sessionStorage.getItem('auth_token')
        const response = await fetch(`${API_URL}/api/games`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const games = data.games || []
          categorizeGames(games)
        } else {
          console.error('Failed to load games')
          categorizeGames([])
        }
      } catch (error) {
        console.error('Error loading games:', error)
        categorizeGames([])
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
      const token = sessionStorage.getItem('auth_token')
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
        
        // Filter out games that are already in library
        const gamesToAdd = steamGames.filter(game => !existingSteamIds.has(String(game.appid)))
        const totalGames = gamesToAdd.length
        
        // Set initial progress
        setIsSyncing(true)
        setSyncProgress({ current: 0, total: totalGames, currentGame: '' })
        setSyncLog([]) // Clear previous log
        
        // Transform Steam games and add to database
        const newGames = []
        let addedCount = 0
        let skippedCount = 0
        let processedCount = 0
        
        // Prepare all games for batch processing
        const gamesToProcess = []
        for (let i = 0; i < steamGames.length; i++) {
          const steamGame = steamGames[i]
          
          // Skip if already in library
          if (existingSteamIds.has(String(steamGame.appid))) {
            skippedCount++
            continue
          }
          
          gamesToProcess.push(steamGame)
        }
        
        // Update progress function - only update at milestones to reduce overhead
        const updateProgressIfNeeded = () => {
          const progressPercent = Math.floor((processedCount / totalGames) * 100)
          const shouldUpdate = processedCount === 0 || 
                              processedCount === totalGames ||
                              processedCount % 10 === 0 || // Every 10 games
                              [10, 25, 50, 75].includes(progressPercent) // At milestones
          
          if (shouldUpdate) {
            requestAnimationFrame(() => {
              setSyncProgress({ 
                current: processedCount, 
                total: totalGames, 
                currentGame: gamesToProcess[Math.min(processedCount - 1, gamesToProcess.length - 1)]?.name || 'Processing...' 
              })
            })
          }
        }
        
        // Add all games to log immediately (for fast processing)
        // Then run typewriter effect in parallel for visual effect
        const initialLogEntries = gamesToProcess.map((steamGame) => ({
          gameName: steamGame.name || 'Unknown Game',
          status: 'syncing',
          displayedName: ''
        }))
        setSyncLog(initialLogEntries)
        
        // Start typewriter effects in background (non-blocking)
        initialLogEntries.forEach((logEntry) => {
          const gameName = String(logEntry.gameName || 'Unknown Game') // Ensure it's always a string
          const fullName = gameName
          
          // Typewriter effect in background (non-blocking)
          (async () => {
            for (let j = 0; j <= fullName.length; j++) {
              await new Promise(resolve => setTimeout(resolve, 60)) // 60ms per character for slower, more visible typing
              setSyncLog(prev => prev.map((item) => {
                // Match by gameName instead of index for reliability
                if (String(item.gameName) === gameName) {
                  return { ...item, displayedName: fullName.substring(0, j) }
                }
                return item
              }))
            }
          })()
        })
        
        // Process games in parallel batches for speed
        const batchSize = 10
        for (let i = 0; i < gamesToProcess.length; i += batchSize) {
          const batch = gamesToProcess.slice(i, i + batchSize)
          
          // Process batch in parallel
          await Promise.all(batch.map(async (steamGame) => {
            const gameName = String(steamGame?.name || 'Unknown Game') // Ensure it's always a string
            
            // Fetch detailed game information
            let studioName = 'Unknown Studio'
            let formattedReleaseDate = ''
            let gamePrice = null // Will store price if available
            
            try {
              const detailsResponse = await fetch(`${API_URL}/api/integrations/steam/game-details/${steamGame.appid}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })
              
              if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json()
                
                // Get studio from game details
                if (detailsData.gameDetails?.studio) {
                  studioName = detailsData.gameDetails.studio
                }
                
                // Get and format release date from game details (timestamp in milliseconds)
                if (detailsData.gameDetails?.releaseDate) {
                  const releaseTimestamp = detailsData.gameDetails.releaseDate
                  const releaseDate = new Date(releaseTimestamp)
                  formattedReleaseDate = releaseDate.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })
                }
                
                // Get price from game details (current price)
                // Note: Steam API doesn't expose purchase history, so we use current price
                if (detailsData.gameDetails?.price?.final) {
                  // Price is in cents, convert to dollars
                  gamePrice = detailsData.gameDetails.price.final / 100
                }
                
                // Log detailed game information
                const gameInfo = {
                  name: steamGame.name,
                  appId: steamGame.appid,
                  playtimeForever: steamGame.playtime_forever ? `${Math.round(steamGame.playtime_forever / 60)} hours` : '0 hours',
                  playtimeForeverMinutes: steamGame.playtime_forever || 0,
                  lastPlayed: steamGame.rtime_last_played ? new Date(steamGame.rtime_last_played * 1000).toISOString() : 'Never',
                  currentPrice: detailsData.gameDetails?.price ? `$${(detailsData.gameDetails.price.final / 100).toFixed(2)} ${detailsData.gameDetails.price.currency || 'USD'}` : 'Not available',
                  originalPrice: detailsData.gameDetails?.price ? `$${(detailsData.gameDetails.price.initial / 100).toFixed(2)} ${detailsData.gameDetails.price.currency || 'USD'}` : 'Not available',
                  pricePaid: 'Not available via Steam API (Steam does not expose purchase history)',
                  achievements: detailsData.achievements ? {
                    total: detailsData.achievements.totalAchievements,
                    unlocked: detailsData.achievements.unlockedAchievements,
                    completionPercentage: `${Math.round(detailsData.achievements.completionPercentage)}%`,
                    isCompleted: detailsData.achievements.isCompleted ? 'Yes' : 'No'
                  } : 'Not available',
                  playerStats: detailsData.playerStats ? 'Available' : 'Not available',
                  releaseDate: detailsData.gameDetails?.releaseDate || 'Not available',
                  studio: detailsData.gameDetails?.studio || 'Not available',
                  genres: detailsData.gameDetails?.genres?.map(g => g.description).join(', ') || 'Not available'
                }
                console.log('📊 Detailed Steam Game Information:', gameInfo)
              }
            } catch (error) {
              console.error('Error fetching game details:', error)
            }
            
            // Get game image - Steam GetOwnedGames returns img_icon_url and img_logo_url
            // Use library_600x900.jpg for high-quality box art (same as AddGameModal)
            let imageUrl = ''
            if (steamGame.appid) {
              imageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamGame.appid}/library_600x900.jpg`
            }
            
            // Convert playtime from Steam API (minutes) to store in database
            // Steam API returns playtime_forever in minutes
            const timePlayedMinutes = steamGame.playtime_forever || 0
            
            // Get last played date from Steam API
            // rtime_last_played is a Unix timestamp in seconds, or 0 if never played
            let lastPlayedDate = null
            if (steamGame.rtime_last_played && steamGame.rtime_last_played > 0) {
              const lastPlayedTimestamp = steamGame.rtime_last_played * 1000 // Convert to milliseconds
              const lastPlayed = new Date(lastPlayedTimestamp)
              const now = new Date()
              
              // Validate the date is reasonable (not in the future, not too old - older than 5 years is suspicious)
              const fiveYearsAgo = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
              if (!isNaN(lastPlayed.getTime()) && lastPlayed <= now && lastPlayed >= fiveYearsAgo) {
                lastPlayedDate = lastPlayed.toISOString()
              }
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
                  studio: studioName,
                  steamAppId: String(steamGame.appid),
                  timePlayed: timePlayedMinutes,
                  lastPlayed: lastPlayedDate,
                  price: gamePrice, // Use current price from Steam (pricePaid not available via API)
                }),
              })

              if (addResponse.ok) {
                const gameData = await addResponse.json()
                newGames.push(gameData.game)
                addedCount++
                // Update log status to synced - find the first item with this gameName that's still syncing
                setSyncLog(prev => prev.map(item => 
                  String(item.gameName) === String(gameName) && item.status === 'syncing'
                    ? { ...item, status: 'synced' }
                    : item
                ))
              } else if (addResponse.status === 409) {
                skippedCount++
                // Mark as synced (already in library)
                setSyncLog(prev => prev.map(item => 
                  String(item.gameName) === String(gameName) && item.status === 'syncing'
                    ? { ...item, status: 'synced' }
                    : item
                ))
              }
            } catch (error) {
              console.error(`Error adding game ${steamGame.name}:`, error)
              // Update log status to synced on error
              setSyncLog(prev => prev.map(item => 
                String(item.gameName) === String(gameName) && item.status === 'syncing'
                  ? { ...item, status: 'synced' }
                  : item
              ))
            } finally {
              processedCount++
              updateProgressIfNeeded()
            }
          }))
        }
        
        // Final progress update
        setSyncProgress({ current: totalGames, total: totalGames, currentGame: 'Complete!' })
        
        // Ensure all remaining "syncing" games are marked as synced
        // This handles any games that might have been missed
        setSyncLog(prev => prev.map(item => {
          if (item.status === 'syncing') {
            // If still syncing at the end, mark as synced
            return { ...item, status: 'synced' }
          }
          return item
        }))
        
        // Update local state with new games (prepend to show most recent first)
        if (newGames.length > 0) {
          const updatedGames = [...newGames, ...allGames]
          categorizeGames(updatedGames)
          
      // Scroll to beginning to show the newly added games
          setTimeout(() => {
            if (gamesScrollRef.current) {
              gamesScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
            }
          }, 100)
        }
        
        // Mark sync as complete in database
        const syncCompleteResponse = await fetch(`${API_URL}/api/integrations/steam/sync-complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ addedCount, skippedCount }),
        })

        if (syncCompleteResponse.ok) {
          // Refresh Steam connection status to get updated metadata
          const connectionsResponse = await fetch(`${API_URL}/api/integrations`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (connectionsResponse.ok) {
            // This will update the state and prevent modal from showing again
            const connectionsData = await connectionsResponse.json()
            const steamConnection = connectionsData.connections?.find(c => c.service === 'steam')
            if (steamConnection?.metadata?.synced) {
              setShowSteamSyncModal(false)
            }
          }
        }
        
        // Close sync modal
        setShowSteamSyncModal(false)
        
        if (addedCount > 0) {
          setSyncSuccessModal({ show: true, addedCount, skippedCount })
        } else {
          setSyncSuccessModal({ show: true, addedCount: 0, skippedCount: 0 })
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch Steam library:', errorData.error)
        setErrorModal({ show: true, message: `Failed to sync Steam library: ${errorData.error || 'Unknown error'}` })
      }
    } catch (error) {
      console.error('Error syncing Steam library:', error)
      setErrorModal({ show: true, message: 'An error occurred while syncing your Steam library. Please try again.' })
    } finally {
      setIsSyncing(false)
      setSyncProgress({ current: 0, total: 0, currentGame: '' })
    }
  }

  const handleDismissSteamSync = () => {
    // Just close the modal, it will show again next time
    setShowSteamSyncModal(false)
  }

  const handleSaveGameInfo = async (gameInfo) => {
    if (!userId) return
    
    const timePlayedValue = parseInt(gameInfo.timePlayed, 10) || 0
    
    // Update UI immediately with optimistic update
    setAllGames(prevGames => {
      const updatedGames = prevGames.map(game => {
        if (game.id === gameInfo.id) {
          return {
            ...game,
            name: gameInfo.name || game.name,
            image: gameInfo.image || game.image,
            releaseDate: gameInfo.releaseDate || game.releaseDate,
            studio: gameInfo.studio || game.studio,
            steamAppId: gameInfo.steamAppId || game.steamAppId,
            dateStarted: gameInfo.dateStarted && gameInfo.dateStarted.trim() !== '' ? gameInfo.dateStarted : game.dateStarted,
            dateBought: gameInfo.dateBought && gameInfo.dateBought.trim() !== '' ? gameInfo.dateBought : game.dateBought,
            price: gameInfo.price && gameInfo.price !== '' ? parseFloat(gameInfo.price) : game.price,
            timePlayed: timePlayedValue,
          }
        }
        return game
      })
      categorizeGames(updatedGames)
      return updatedGames
    })
    
    // Close modal immediately
    setIsGameInfoModalOpen(false)
    setSelectedGame(null)
    setIsTimeOnlyMode(false)
    
      // Process database update in background
    ;(async () => {
      try {
        const token = sessionStorage.getItem('auth_token')
        const isTemporary = gameInfo.id && gameInfo.id.startsWith('temp-')
        
        // Ensure timePlayed is an integer and handle empty date strings
        const updatePayload = {
          name: gameInfo.name,
          image: gameInfo.image,
          releaseDate: gameInfo.releaseDate || null,
          studio: gameInfo.studio || null,
          steamAppId: gameInfo.steamAppId || null,
          dateStarted: gameInfo.dateStarted && gameInfo.dateStarted.trim() !== '' ? gameInfo.dateStarted : null,
          dateBought: gameInfo.dateBought && gameInfo.dateBought.trim() !== '' ? gameInfo.dateBought : null,
          price: gameInfo.price && gameInfo.price !== '' ? parseFloat(gameInfo.price) : null,
          timePlayed: timePlayedValue,
        }
        
        console.log('Saving game info:', updatePayload)
        
        let response
        if (isTemporary) {
          // If it's a temporary game, create it first with the form data
          const createPayload = {
            name: gameInfo.name,
            image: gameInfo.image,
            releaseDate: gameInfo.releaseDate || null,
            studio: gameInfo.studio || null,
            steamAppId: gameInfo.steamAppId || null,
            dateStarted: updatePayload.dateStarted,
            dateBought: updatePayload.dateBought,
            price: updatePayload.price,
            timePlayed: updatePayload.timePlayed,
          }
          
          response = await fetch(`${API_URL}/api/games`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(createPayload),
          })
          
          if (response.ok) {
            const createData = await response.json()
            const newGameId = createData.game.id
            
            // Replace temporary game with real game from database
            setAllGames(prevGames => {
              const updatedGames = prevGames.map(game => {
                if (game.id === gameInfo.id) {
                  return { ...createData.game, ...game }
                }
                return game
              })
              categorizeGames(updatedGames)
              return updatedGames
            })
          }
        } else {
          // Normal update for existing game
          response = await fetch(`${API_URL}/api/games/${gameInfo.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatePayload),
          })
        }

        if (response.ok) {
          const data = await response.json()
          console.log('Game updated successfully in database:', data.game)
          
          // Sync with database response (in case there were any server-side changes)
          setAllGames(prevGames => {
            const updatedGames = prevGames.map(game =>
              game.id === (isTemporary ? gameInfo.id : gameInfo.id) ? {
                ...game,
                ...data.game,
                timePlayed: data.game.timePlayed || timePlayedValue
              } : game
            )
            categorizeGames(updatedGames)
            return updatedGames
          })
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to update game' }))
          console.error('Failed to update game in database:', errorData.error || 'Unknown error')
          
          // On error, revert to previous state by reloading from database
          const gamesResponse = await fetch(`${API_URL}/api/games`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (gamesResponse.ok) {
            const gamesData = await gamesResponse.json()
            categorizeGames(gamesData.games || [])
          }
        }
      } catch (error) {
        console.error('Error saving game info to database:', error)
        
        // On error, revert by reloading from database
        try {
          const token = sessionStorage.getItem('auth_token')
          const gamesResponse = await fetch(`${API_URL}/api/games`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (gamesResponse.ok) {
            const gamesData = await gamesResponse.json()
            categorizeGames(gamesData.games || [])
          }
        } catch (reloadError) {
          console.error('Error reloading games:', reloadError)
        }
      }
    })()
  }

  const handleRemoveGame = async (game) => {
    if (!userId) return
    
    try {
      const token = sessionStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/games/${game.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Remove from local state
        const updatedGames = allGames.filter(g => g.id !== game.id)
        categorizeGames(updatedGames)
      } else {
        console.error('Failed to remove game')
        setRemoveGameErrorModal({ show: true, message: 'Failed to remove game. Please try again.' })
      }
    } catch (error) {
      console.error('Error removing game:', error)
      setRemoveGameErrorModal({ show: true, message: 'An error occurred while removing the game. Please try again.' })
    }
  }

  const handleAddGameToLibrary = async (gameData) => {
    if (!userId) return
    
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

    // Create a temporary game object immediately for optimistic UI update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempGame = {
      id: tempId,
      name: gameData.name,
      image: imageUrl,
      releaseDate: formattedReleaseDate,
      studio: gameData.studio || 'Unknown Studio',
      steamAppId: gameData.steamAppId || null,
      timePlayed: 0,
      dateStarted: null,
      dateBought: null,
      price: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemporary: true // Flag to identify temporary games
    }

    // Update UI immediately with optimistic update
    const updatedGames = [tempGame, ...allGames]
    categorizeGames(updatedGames)
    
    // Close add game modal and open info modal immediately
    setIsAddGameModalOpen(false)
    setSelectedGame(tempGame)
    setIsTimeOnlyMode(false)
    setIsGameInfoModalOpen(true)

    // Scroll to beginning to show the newly added game
    setTimeout(() => {
      if (gamesScrollRef.current) {
        gamesScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
      }
    }, 100)

    // Fetch and log detailed game information in background (non-blocking)
    if (gameData.steamAppId) {
      (async () => {
        try {
          const token = sessionStorage.getItem('auth_token')
          const detailsResponse = await fetch(`${API_URL}/api/integrations/steam/game-details/${gameData.steamAppId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json()
            const gameInfo = {
              name: gameData.name,
              appId: gameData.steamAppId,
              currentPrice: detailsData.gameDetails?.price ? `$${(detailsData.gameDetails.price.final / 100).toFixed(2)} ${detailsData.gameDetails.price.currency || 'USD'}` : 'Not available',
              originalPrice: detailsData.gameDetails?.price ? `$${(detailsData.gameDetails.price.initial / 100).toFixed(2)} ${detailsData.gameDetails.price.currency || 'USD'}` : 'Not available',
              pricePaid: 'Not available via Steam API (Steam does not expose purchase history)',
              achievements: detailsData.achievements ? {
                total: detailsData.achievements.totalAchievements,
                unlocked: detailsData.achievements.unlockedAchievements,
                completionPercentage: `${Math.round(detailsData.achievements.completionPercentage)}%`,
                isCompleted: detailsData.achievements.isCompleted ? 'Yes' : 'No'
              } : 'Not available (user may not own this game yet)',
              playerStats: detailsData.playerStats ? 'Available' : 'Not available',
              releaseDate: detailsData.gameDetails?.releaseDate ? new Date(detailsData.gameDetails.releaseDate).toLocaleDateString() : 'Not available',
              studio: detailsData.gameDetails?.studio || 'Not available',
              genres: detailsData.gameDetails?.genres?.map(g => g.description).join(', ') || 'Not available'
            }
            console.log('📊 Detailed Steam Game Information:', gameInfo)
          }
        } catch (error) {
          console.error('Error fetching game details:', error)
        }
      })()
    }

    // Create game in database in background (non-blocking)
    ;(async () => {
      try {
        const token = sessionStorage.getItem('auth_token')
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

          // Replace temporary game with real game from database
          setAllGames(prevGames => {
            const updatedGames = prevGames.map(game => 
              game.id === tempId ? { ...newGame, ...game } : game
            )
            categorizeGames(updatedGames)
            return updatedGames
          })

          // Update selectedGame if it's still the temporary one
          setSelectedGame(prevGame => {
            if (prevGame && prevGame.id === tempId) {
              return { ...newGame, ...prevGame }
            }
            return prevGame
          })
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          
          // Remove temporary game on error
          setAllGames(prevGames => prevGames.filter(game => game.id !== tempId))
          
          // Close modals and show error
          setIsGameInfoModalOpen(false)
          setSelectedGame(null)
          
          if (response.status === 409) {
            setGameAlreadyInLibraryModal(true)
          } else {
            setAddGameErrorModal({ show: true, message: `Failed to add game: ${errorData.error || 'Unknown error'}` })
          }
        }
      } catch (error) {
        console.error('Error adding game to library:', error)
        
        // Remove temporary game on error
        setAllGames(prevGames => prevGames.filter(game => game.id !== tempId))
        
        // Close modals and show error
        setIsGameInfoModalOpen(false)
        setSelectedGame(null)
        setAddGameErrorModal({ show: true, message: 'An error occurred while adding the game. Please try again.' })
      }
    })()
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
      <Navigation />

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onTabChange={(tabId) => {
          if (tabId === 'social') {
            navigate('/social')
          } else {
            setActiveTab(tabId)
          }
        }}
        tabs={[
          { id: 'library', label: 'Library' },
          { id: 'social', label: 'Social' }
        ]}
      />

      {/* Dashboard Content */}
      <div className="container mx-auto px-6 py-6 md:py-12">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'library' ? (
            <>
              <div className="mb-4 md:mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Welcome back, {user?.name ? capitalizeName(user.name.split(' ')[0]) : 'Gamer'}! 🎮
                </h1>
                <p className="text-gray-400 text-sm md:text-base" id="games-description">
                  Games{' '}
                  <span className="text-gray-500 text-xs md:text-sm">
                    ({recentGames.length})
                  </span>
                </p>
              </div>

              {/* Game Lists - Last Week, Last Month, All Games */}
          {isLoadingGames ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Loading your games...</p>
              </div>
            </div>
          ) : allGames.length === 0 ? (
            // Empty state - show big add game card
            <>
              <div className="md:hidden mb-4">
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
              <div className="w-full">
                <AddGameCard 
                  onClick={handleAddGame} 
                  isEmptyState={true}
                  steamConnected={steamConnected}
                  navigate={navigate}
                />
              </div>
            </>
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

              {/* Last Week Games */}
              <div className="mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
                  Played This Week
                </h2>
                {lastWeekGames.length > 0 ? (
                  <div className="md:flex gap-6 items-stretch">
                    <div className="relative flex-1 min-w-0">
                      <div 
                        className="flex gap-6 overflow-x-auto pb-4" 
                        style={{ 
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#4b5563 #1f2937'
                        }}
                      >
                        {lastWeekGames.map((game) => (
                          <GameCard 
                            key={game.id} 
                            game={game}
                            onTimerClick={handleTimerClick}
                            onRemove={handleRemoveGame}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 text-center">
                    <p className="text-gray-400 text-sm">✨ No new games this week - time to discover something new! ✨</p>
                  </div>
                )}
              </div>

              {/* Last Month Games (excluding last week) */}
              <div className="mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
                  Played This Month
                </h2>
                {lastMonthGames.length > 0 ? (
                  <div className="md:flex gap-6 items-stretch">
                    <div className="relative flex-1 min-w-0">
                      <div 
                        className="flex gap-6 overflow-x-auto pb-4" 
                        style={{ 
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#4b5563 #1f2937'
                        }}
                      >
                        {lastMonthGames.map((game) => (
                          <GameCard 
                            key={game.id} 
                            game={game}
                            onTimerClick={handleTimerClick}
                            onRemove={handleRemoveGame}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 text-center">
                    <p className="text-gray-400 text-sm">📅 Your collection is growing! No games added this month yet.</p>
                  </div>
                )}
              </div>

              {/* All Games */}
              <div className="mb-8 md:mb-12">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    All Games
                  </h2>
                  
                  {/* Sort and Filter Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Sort By */}
                    <div className="flex items-center gap-2">
                      <label className="text-gray-400 text-sm">Sort:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-gray-800/50 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        <option value="recent">Most Recent</option>
                        <option value="played">Most Played</option>
                      </select>
                    </div>
                    
                    {/* Platform Filter - Only show if user has multiple platforms */}
                    {availablePlatforms.length > 1 && (
                      <div className="flex items-center gap-2">
                        <label className="text-gray-400 text-sm">Platform:</label>
                        <select
                          value={platformFilter}
                          onChange={(e) => setPlatformFilter(e.target.value)}
                          className="bg-gray-800/50 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 transition-colors"
                        >
                          <option value="all">All Platforms</option>
                          {availablePlatforms.map(platform => (
                            <option key={platform} value={platform}>{platform}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                {allGames.length > 0 ? (
                  <div className="md:flex gap-6 items-stretch">
                    <div className="flex-shrink-0 hidden md:block">
                      <AddGameCard onClick={handleAddGame} />
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <div 
                        className="flex gap-6 overflow-x-auto pb-4" 
                        style={{ 
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#4b5563 #1f2937'
                        }}
                      >
                        {allGames.map((game) => (
                          <GameCard 
                            key={game.id} 
                            game={game}
                            onTimerClick={handleTimerClick}
                            onRemove={handleRemoveGame}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 text-center">
                    <p className="text-gray-400 text-sm">No games in your library yet 🎮</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 3D Library Room */}
          {allGames.length > 0 && (
            <div className="mt-8 md:mt-12">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Your Game Library
              </h2>
              <p className="text-gray-400 mb-6 text-sm md:text-base">
                Explore your collection in 3D • Drag to look around
              </p>
              <GameLibrary3D games={allGames} />
            </div>
          )}
            </>
          ) : (
            <SocialFeed />
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

      {/* Mobile oscillating indicators - only show during sync */}
      {isSyncing && (
        <>
          <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 z-[60] md:hidden">
            <div className="relative w-full h-full">
              <div className="oscillate-indicator w-32 h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
            </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 z-[60] md:hidden">
            <div className="relative w-full h-full">
              <div className="oscillate-indicator-reverse w-32 h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
            </div>
          </div>
        </>
      )}

      {/* Steam Sync Progress Modal */}
      <Modal
        isOpen={isSyncing}
        onClose={() => {}}
        title="Syncing Your Steam Library"
        preventClose={true}
      >
        <div className="flex flex-col space-y-6">
          {/* Progress Info Section */}
          <div className="flex flex-col">
            <p className="text-gray-300 mb-4">
              {syncProgress.total > 0 
                ? `Importing game ${syncProgress.current} of ${syncProgress.total}`
                : 'Preparing to sync your games...'}
            </p>
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden mb-4">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300 ease-out"
                style={{ 
                  width: syncProgress.total > 0 
                    ? `${(syncProgress.current / syncProgress.total) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
            <p className="text-gray-500 text-xs text-center mb-4">
              {syncProgress.total > 0 
                ? `${Math.round((syncProgress.current / syncProgress.total) * 100)}% complete`
                : 'Initializing...'}
            </p>
          </div>
          
          {/* Console-like log - Separate section to ensure proper stacking on mobile */}
          {syncLog.length > 0 && (
            <div className="w-full bg-gray-900/80 border border-gray-700 rounded-lg p-4 flex-shrink-0">
              <div className="text-xs text-gray-400 mb-2 font-mono">Sync Log:</div>
              <div 
                ref={syncLogContainerRef}
                className="h-48 overflow-y-auto font-mono text-xs space-y-1 hide-scrollbar"
                style={{ scrollBehavior: 'smooth' }}
              >
                {syncLog.map((logItem, index) => {
                  // Use displayedName for typewriter effect, fallback to gameName
                  const displayedGameName = logItem.displayedName !== undefined 
                    ? logItem.displayedName 
                    : logItem.gameName
                  
                  // Calculate dots to fill space - aim for ~50 chars total
                  const maxGameNameLength = 30
                  const gameNameDisplay = displayedGameName.length > maxGameNameLength 
                    ? displayedGameName.substring(0, maxGameNameLength - 3) + '...'
                    : displayedGameName
                  const availableWidth = 45
                  const dotsCount = Math.max(2, availableWidth - gameNameDisplay.length - (logItem.status === 'synced' ? 6 : 9))
                  const dots = '.'.repeat(dotsCount)
                  
                  const statusColor = logItem.status === 'synced' 
                    ? 'text-green-400' 
                    : 'text-gray-400'
                  const statusText = logItem.status === 'synced' 
                    ? 'SYNCED' 
                    : 'SYNCING...'
                  
                  return (
                    <div key={index} className="text-gray-300 whitespace-nowrap flex items-center">
                      <span className="text-purple-300">
                        {gameNameDisplay}
                        {logItem.displayedName !== undefined && logItem.displayedName.length < logItem.gameName.length && (
                          <span className="animate-pulse">|</span>
                        )}
                      </span>
                      <span className="text-gray-600 flex-1">{dots}</span>
                      <span className={statusColor}>{statusText}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Steam Sync Modal */}
      <Modal
        isOpen={showSteamSyncModal && !isCheckingSteam && !isSyncing}
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

      {/* Steam Sync Success Modal */}
      <Modal
        isOpen={syncSuccessModal.show}
        onClose={() => setSyncSuccessModal({ show: false, addedCount: 0, skippedCount: 0 })}
        title="Sync Complete"
      >
        <div className="space-y-4">
          {syncSuccessModal.addedCount > 0 ? (
            <p className="text-gray-300">
              Successfully synced {syncSuccessModal.addedCount} {syncSuccessModal.addedCount === 1 ? 'game' : 'games'} from Steam
              {syncSuccessModal.skippedCount > 0 && (
                <span className="text-gray-400"> ({syncSuccessModal.skippedCount} already in library)</span>
              )}
            </p>
          ) : (
            <p className="text-gray-300">
              All games are already in your library
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSyncSuccessModal({ show: false, addedCount: 0, skippedCount: 0 })}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all"
            >
              OK
            </button>
            {!isOnDashboard && (
              <button
                onClick={() => {
                  setSyncSuccessModal({ show: false, addedCount: 0, skippedCount: 0 })
                  navigate('/dashboard')
                }}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/25"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        isOpen={errorModal.show}
        onClose={() => setErrorModal({ show: false, message: '' })}
        title="Error"
      >
        <div className="space-y-4">
          <p className="text-gray-300">{errorModal.message}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setErrorModal({ show: false, message: '' })}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Game Error Modal */}
      <Modal
        isOpen={addGameErrorModal.show}
        onClose={() => setAddGameErrorModal({ show: false, message: '' })}
        title="Error"
      >
        <div className="space-y-4">
          <p className="text-gray-300">{addGameErrorModal.message}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setAddGameErrorModal({ show: false, message: '' })}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>

      {/* Remove Game Error Modal */}
      <Modal
        isOpen={removeGameErrorModal.show}
        onClose={() => setRemoveGameErrorModal({ show: false, message: '' })}
        title="Error"
      >
        <div className="space-y-4">
          <p className="text-gray-300">{removeGameErrorModal.message}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setRemoveGameErrorModal({ show: false, message: '' })}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>

      {/* Game Already in Library Modal */}
      <Modal
        isOpen={gameAlreadyInLibraryModal}
        onClose={() => setGameAlreadyInLibraryModal(false)}
        title="Game Already in Library"
      >
        <div className="space-y-4">
          <p className="text-gray-300">This game is already in your library</p>
          <div className="flex justify-end">
            <button
              onClick={() => setGameAlreadyInLibraryModal(false)}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Dashboard


import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import Modal from './Modal'
import Navigation from './Navigation'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function Integrations() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isOnDashboard = location.pathname === '/dashboard'
  const [steamConnected, setSteamConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentGame: '' })
  const [syncLog, setSyncLog] = useState([]) // Array of { gameName, status: 'syncing' | 'synced' | 'skipped' }
  const syncLogContainerRef = useRef(null)
  
  // Auto-scroll log to bottom when new items are added
  useEffect(() => {
    if (syncLogContainerRef.current) {
      syncLogContainerRef.current.scrollTop = syncLogContainerRef.current.scrollHeight
    }
  }, [syncLog])
  const [connections, setConnections] = useState([])
  const [message, setMessage] = useState(null)
  const [showHowItWorks, setShowHowItWorks] = useState(true)
  const [isSteamSynchronized, setIsSteamSynchronized] = useState(false)
  const [syncSuccessModal, setSyncSuccessModal] = useState({ show: false, addedCount: 0, skippedCount: 0 })
  const [syncCounts, setSyncCounts] = useState({ addedCount: 0, skippedCount: 0 })
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)
  const [steamHasSynced, setSteamHasSynced] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, authLoading, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      fetchConnections()
    }
    
    // Reset sync state when component unmounts (leaving page)
    return () => {
      setIsSteamSynchronized(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    // Check for success/error messages in URL params
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success === 'steam_connected') {
      setMessage({ type: 'success', text: 'Steam account connected successfully!' })
      setSearchParams({}) // Clear params
      fetchConnections() // Refresh connections
    } else if (error) {
      setMessage({ type: 'error', text: `Connection failed: ${error}` })
      setSearchParams({}) // Clear params
    }
  }, [searchParams, setSearchParams])

  const fetchConnections = async () => {
    try {
      setIsLoadingConnections(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/integrations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
        const steamConnection = data.connections?.find(c => c.service === 'steam')
        const connected = !!steamConnection
        setSteamConnected(connected)
        
        // Check if Steam has been synced before (from metadata)
        if (steamConnection?.metadata?.synced) {
          setSteamHasSynced(true)
          // Restore last sync counts if available
          if (steamConnection.metadata.last_sync_added !== undefined) {
            setSyncCounts({ 
              addedCount: steamConnection.metadata.last_sync_added || 0, 
              skippedCount: steamConnection.metadata.last_sync_skipped || 0 
            })
          }
        } else {
          setSteamHasSynced(false)
        }
        
        // Reset session sync state on mount
        setIsSteamSynchronized(false)
      }
    } catch (error) {
      console.error('Error fetching connections:', error)
    } finally {
      setIsLoadingConnections(false)
    }
  }

  const handleSteamConnect = async () => {
    setIsConnecting(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/integrations/steam/auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Redirect to Steam OpenID authentication
        window.location.href = data.authUrl
      } else {
        console.error('Failed to initiate Steam connection:', data.error)
        alert('Failed to connect to Steam. Please try again.')
        setIsConnecting(false)
      }
    } catch (error) {
      console.error('Error connecting to Steam:', error)
      alert('An error occurred. Please try again.')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async (service) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/integrations/${service}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        await fetchConnections()
        if (service === 'steam') {
          setSteamConnected(false)
        }
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  const handleSteamSync = async () => {
    setIsSyncing(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/integrations/steam/library`, {
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
        
        // Process games in parallel batches to speed up
        const batchSize = 10
        for (let i = 0; i < gamesToProcess.length; i += batchSize) {
          const batch = gamesToProcess.slice(i, i + batchSize)
          
          // Add games to log one by one (sequential display)
          for (const steamGame of batch) {
            const gameName = steamGame.name || 'Unknown Game'
            setSyncLog(prev => [...prev, { gameName, status: 'syncing' }])
            // Small delay to make them appear one by one
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          
          // Process batch in parallel (but logs already added sequentially)
          await Promise.all(batch.map(async (steamGame) => {
            const gameName = steamGame.name || 'Unknown Game'
            
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
            
            // Get game image
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
                addedCount++
                // Update log status to synced - find the first item with this gameName that's still syncing
                setSyncLog(prev => prev.map(item => 
                  item.gameName === gameName && item.status === 'syncing'
                    ? { ...item, status: 'synced' }
                    : item
                ))
              } else if (addResponse.status === 409) {
                skippedCount++
                // Update log status to skipped
                setSyncLog(prev => prev.map(item => 
                  item.gameName === gameName && item.status === 'syncing'
                    ? { ...item, status: 'skipped' }
                    : item
                ))
              }
            } catch (error) {
              console.error(`Error adding game ${steamGame.name}:`, error)
              // Update log status to skipped on error
              setSyncLog(prev => prev.map(item => 
                item.gameName === gameName && item.status === 'syncing'
                  ? { ...item, status: 'skipped' }
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
        setSyncLog(prev => [...prev]) // Trigger re-render to show final status
        
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
          // Refresh connections to get updated metadata
          await fetchConnections()
        }

        setIsSteamSynchronized(true)
        // Store sync counts in state for showing in modal when clicking "Synchronized" button
        setSyncCounts({ addedCount, skippedCount })
        setSyncSuccessModal({ show: true, addedCount, skippedCount })
        setSteamHasSynced(true)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setErrorModal({ show: true, message: `Failed to sync Steam library: ${errorData.error || 'Unknown error'}` })
      }
    } catch (error) {
      console.error('Error syncing Steam library:', error)
      setErrorModal({ show: true, message: 'An error occurred while syncing your Steam library. Please try again.' })
    } finally {
      setIsSyncing(false)
      setSyncProgress({ current: 0, total: 0, currentGame: '' })
      // Keep syncLog visible - don't clear it
    }
  }

  const services = [
    {
      id: 'steam',
      name: 'Steam',
      description: 'Connect your Steam account to automatically sync your game library',
      icon: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.988 1.578-1.626 2.767-1.626h.873v-.031c0-2.063 1.724-3.73 3.84-3.73 2.116 0 3.843 1.667 3.843 3.73v.031h.873c.622 0 1.206.237 1.637.626l5.834-2.412C22.483 4.851 17.303 0 11.979 0zM6.492 15.068H0v5.694c0 1.835 1.495 3.33 3.33 3.33h3.162v-5.694zm13.854 0h-6.492v5.694h3.162c1.835 0 3.33-1.495 3.33-3.33v-5.694z" fill="white"/>
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      connected: steamConnected,
    },
    // Future services can be added here
    // {
    //   id: 'epic',
    //   name: 'Epic Games',
    //   description: 'Sync your Epic Games library',
    //   icon: <EpicIcon />,
    //   color: 'from-purple-500 to-purple-600',
    //   connected: false,
    // },
  ]

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 md:mb-12">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-400 hover:text-gray-300 text-sm mb-3 transition-colors group"
            >
              <svg 
                className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Return to Dashboard</span>
            </button>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Integrations
            </h1>
            <p className="text-gray-300 text-lg mb-6">
              Connect your gaming accounts to automatically sync your game library
            </p>

            {/* How it works - Collapsible */}
            <div 
              className={`bg-blue-500/10 border border-blue-500/30 rounded-2xl mb-8 relative overflow-hidden transition-all duration-300 ease-in-out ${
                showHowItWorks 
                  ? 'opacity-100 max-h-[200px] p-4 md:p-6 pb-4 md:pb-6 mb-8' 
                  : 'opacity-0 max-h-0 p-0 mb-0 border-0'
              }`}
            >
              <button
                onClick={() => setShowHowItWorks(false)}
                className="absolute top-4 right-4 text-blue-300 hover:text-white transition-colors p-1 z-10"
                aria-label="Close how it works"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-start space-x-3 md:space-x-4 pr-8 md:pr-8">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-blue-300 font-semibold mb-2 text-sm md:text-base">How it works</h4>
                  <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                    When you connect your Steam account, we'll securely sync your game library. 
                    Your login credentials are never stored - we use Steam's official authentication 
                    system to access your public game list.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl ${
              message.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/30 text-green-300' 
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}>
              <div className="flex items-center justify-between">
                <span>{message.text}</span>
                <button
                  onClick={() => setMessage(null)}
                  className="ml-4 text-current opacity-70 hover:opacity-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className={`relative bg-gray-800/50 backdrop-blur-xl rounded-2xl border-2 transition-all md:col-span-8 ${
                  service.connected
                    ? 'border-purple-500/50 shadow-lg shadow-purple-500/20'
                    : 'border-white/10 hover:border-white/20'
                } overflow-hidden group`}
              >
                {/* Animated gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                
                <div className="relative p-6 md:p-8">
                  {/* Service Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white mb-4 shadow-lg`}>
                    {service.icon}
                  </div>

                  {/* Service Info */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-white">{service.name}</h3>
                    {/* Connection Status - Next to title */}
                    {isLoadingConnections ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        <span className="text-gray-400 text-sm font-medium">Loading...</span>
                      </div>
                    ) : service.connected ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-sm font-medium">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span className="text-gray-500 text-sm">Not connected</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 mb-6">{service.description}</p>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3 md:space-y-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-2">

                      {/* Action Buttons - Connect/Disconnect and Synchronize */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {service.connected ? (
                          <button
                            onClick={() => handleDisconnect(service.id)}
                            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={service.id === 'steam' ? handleSteamConnect : undefined}
                            disabled={isConnecting && service.id === 'steam'}
                            className={`px-6 py-2 bg-gradient-to-r ${service.color} text-white rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg text-sm font-medium`}
                          >
                            {isConnecting && service.id === 'steam' ? 'Connecting...' : 'Connect'}
                          </button>
                        )}

                        {/* Sync Button - Always visible for Steam, disabled if not connected or already synced */}
                        {service.id === 'steam' && !isSteamSynchronized && (
                          <button
                            onClick={handleSteamSync}
                            disabled={isSyncing || !service.connected || isLoadingConnections}
                            className={`px-4 py-2 text-white rounded-lg transition-all transform text-sm font-medium flex items-center justify-center space-x-2 shadow-lg ${
                              !service.connected || isSyncing || isLoadingConnections
                                ? 'bg-gray-700/80 opacity-50 cursor-not-allowed'
                                : `bg-gradient-to-r ${service.color} hover:scale-105`
                            }`}
                          >
                            {isSyncing ? (
                              <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Syncing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Synchronize</span>
                              </>
                            )}
                          </button>
                        )}
                        {/* Synchronized Button - Shows after successful sync in current session */}
                        {service.id === 'steam' && isSteamSynchronized && (
                          <button
                            onClick={() => setSyncSuccessModal({ show: true, addedCount: syncCounts.addedCount, skippedCount: syncCounts.skippedCount })}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg transition-all transform hover:scale-105 text-sm font-medium flex items-center justify-center space-x-2 shadow-lg fade-in-slide"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Synchronized</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Sync Progress Modal */}
      {isSyncing && (
        <>
          {/* Mobile oscillating indicators */}
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
      <Modal
        isOpen={isSyncing}
        onClose={() => {}} // Don't allow closing during sync
        title="Syncing Your Steam Library"
        preventClose={true}
      >
        <div className="space-y-6">
          <div>
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
            
            {/* Console-like log */}
            {syncLog.length > 0 && (
              <div className="w-full bg-gray-900/80 border border-gray-700 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-2 font-mono">Sync Log:</div>
                <div 
                  ref={syncLogContainerRef}
                  className="h-48 overflow-y-auto font-mono text-xs space-y-1 hide-scrollbar"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {syncLog.map((logItem, index) => {
                    // Calculate dots to fill space - aim for ~50 chars total
                    const maxGameNameLength = 30
                    const gameNameDisplay = logItem.gameName.length > maxGameNameLength 
                      ? logItem.gameName.substring(0, maxGameNameLength - 3) + '...'
                      : logItem.gameName
                    const availableWidth = 45
                    const dotsCount = Math.max(2, availableWidth - gameNameDisplay.length - (logItem.status === 'synced' ? 6 : logItem.status === 'skipped' ? 7 : 9))
                    const dots = '.'.repeat(dotsCount)
                    
                    const statusColor = logItem.status === 'synced' 
                      ? 'text-green-400' 
                      : logItem.status === 'skipped' 
                        ? 'text-yellow-400' 
                        : 'text-gray-400'
                    const statusText = logItem.status === 'synced' 
                      ? 'SYNCED' 
                      : logItem.status === 'skipped' 
                        ? 'SKIPPED' 
                        : 'SYNCING...'
                    
                    return (
                      <div key={index} className="text-gray-300 whitespace-nowrap flex items-center">
                        <span className="text-purple-300">{gameNameDisplay}</span>
                        <span className="text-gray-600 flex-1">{dots}</span>
                        <span className={statusColor}>{statusText}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Sync Success Modal */}
      <Modal
        isOpen={syncSuccessModal.show && !isSyncing}
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
    </div>
  )
}

export default Integrations


import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import Modal from './Modal'
import Navigation from './Navigation'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Fun gaming facts component - cube modal
const GamingFacts = ({ facts, rotationDirection }) => {
  // Use first 6 facts for the 6 faces of the cube
  const cubeFacts = facts.slice(0, 6)
  const cubeSize = 200 // Half the cube size for translateZ
  
  // Modal face component
  const ModalFace = ({ fact, transform }) => (
    <div 
      className="absolute w-full h-full overflow-hidden"
      style={{ 
        transform: transform,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        borderRadius: '1em'
      }}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/40 via-pink-500/40 to-purple-500/40 blur-xl opacity-40" style={{ borderRadius: '1em' }}></div>
      
      {/* Main modal container */}
      <div className="relative h-full shadow-2xl overflow-hidden flex flex-col" style={{ borderRadius: '1em' }}>
        {/* Animated background gradient with reduced opacity */}
        <div className="absolute inset-0 animated-gradient opacity-15" style={{ borderRadius: '1em' }}></div>
        
        {/* Content container with backdrop blur */}
        <div className="relative flex-1 flex flex-col justify-center bg-black/30 backdrop-blur-lg p-6 md:p-8" style={{ borderRadius: '1em' }}>
          {/* Subtle gradient top border */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
          
          <div className="relative z-10 text-center">
            <p className="text-purple-300 text-xs mb-4 font-semibold">💡 DID YOU KNOW?</p>
            <p className="text-gray-200 text-sm text-center px-4">{fact}</p>
          </div>
        </div>
      </div>
    </div>
  )
  
  return (
    <div className="relative w-full h-full flex items-center justify-center perspective-1000 overflow-hidden" style={{ minHeight: '400px' }}>
      <div 
        className="relative preserve-3d transition-transform duration-1000 ease-in-out"
        style={{
          width: `${cubeSize * 2}px`,
          height: `${cubeSize * 2}px`,
          transform: rotationDirection
        }}
      >
        {/* Front face */}
        <ModalFace fact={cubeFacts[0]} transform={`rotateY(0deg) translateZ(${cubeSize}px)`} />
        {/* Back face */}
        <ModalFace fact={cubeFacts[1]} transform={`rotateY(180deg) translateZ(${cubeSize}px)`} />
        {/* Right face */}
        <ModalFace fact={cubeFacts[2]} transform={`rotateY(90deg) translateZ(${cubeSize}px)`} />
        {/* Left face */}
        <ModalFace fact={cubeFacts[3]} transform={`rotateY(-90deg) translateZ(${cubeSize}px)`} />
        {/* Top face */}
        <ModalFace fact={cubeFacts[4]} transform={`rotateX(90deg) translateZ(${cubeSize}px)`} />
        {/* Bottom face */}
        <ModalFace fact={cubeFacts[5]} transform={`rotateX(-90deg) translateZ(${cubeSize}px)`} />
      </div>
      <style>{`
        .perspective-1000 {
          perspective: 1200px;
          perspective-origin: center center;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  )
}

function Integrations() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isOnDashboard = location.pathname === '/dashboard'
  const [steamConnected, setSteamConnected] = useState(false)
  const [psnConnected, setPsnConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentGame: '' })
  const [syncLog, setSyncLog] = useState([]) // Array of { gameName, status: 'syncing' | 'synced' | 'skipped', displayedName: string }
  const syncLogContainerRef = useRef(null)
  const [currentSyncService, setCurrentSyncService] = useState(null) // 'steam' or 'psn'
  
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
  const [syncSuccessModal, setSyncSuccessModal] = useState({ show: false, addedCount: 0, skippedCount: 0, message: '' })
  const [syncCounts, setSyncCounts] = useState({ addedCount: 0, skippedCount: 0 })
  const [errorModal, setErrorModal] = useState({ show: false, message: '', onConfirm: null })
  const [showPsnAuthModal, setShowPsnAuthModal] = useState(false)
  const [npssoToken, setNpssoToken] = useState('')
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
        
        const psnConnection = data.connections?.find(c => c.service === 'psn')
        setPsnConnected(!!psnConnection)
        
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
        } else if (service === 'psn') {
          setPsnConnected(false)
        }
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  const handlePsnConnect = async () => {
    if (!npssoToken.trim()) {
      setErrorModal({ show: true, message: 'Please enter your NPSSO token', onConfirm: null })
      return
    }

    setIsConnecting(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/integrations/psn/auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ npsso: npssoToken.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setShowPsnAuthModal(false)
        setNpssoToken('')
        await fetchConnections()
        setMessage({ type: 'success', text: 'PSN account connected successfully!' })
      } else {
        console.error('PSN auth error response:', data)
        setErrorModal({ show: true, message: data.error || 'Failed to connect to PSN. Please check your NPSSO token and try again.', onConfirm: null })
      }
    } catch (error) {
      console.error('Error connecting to PSN:', error)
      setErrorModal({ show: true, message: `An error occurred while connecting to PSN: ${error.message}. Please try again.`, onConfirm: null })
    } finally {
      setIsConnecting(false)
    }
  }


  const [isFetchingLibrary, setIsFetchingLibrary] = useState(false)
  // Cube rotation state - tracks current face index (0-5 for 6 faces)
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0)
  const currentFaceIndexRef = useRef(0)
  
  const gamingFacts = [
    "🎮 The first video game, 'Pong', was released in 1972 and had no sound effects!",
    "🎯 The average gamer has been playing for 13 years and owns 2.4 gaming devices.",
    "🌍 Over 3 billion people worldwide play video games - that's almost half the planet!",
    "💰 The gaming industry is worth more than the movie and music industries combined.",
    "⏱️ The longest video game marathon lasted 138 hours and 34 seconds!",
    "🎨 Minecraft has sold over 300 million copies, making it the best-selling game of all time.",
  ]
  
  // Define rotation sequence for the 6 cube faces
  // Each rotation changes only ONE axis by exactly 90 degrees
  // Sequence to show all 6 unique facts: Front -> Right -> Back -> Front -> Left -> Front -> Top -> Front -> Bottom
  // Front is used as a transition point to allow smooth single-axis rotations
  const cubeFaces = [
    { x: 0, y: 0 },       // 0: Front face - starting position (fact 0)
    { x: 0, y: 90 },      // 1: Right face - Y +90 (fact 2)
    { x: 0, y: 180 },     // 2: Back face - Y +90 from right (fact 1)
    { x: 0, y: 0 },       // 3: Front face - reset to front (fact 0)
    { x: 0, y: -90 },     // 4: Left face - Y -90 (fact 3)
    { x: 0, y: 0 },       // 5: Front face - reset to front (fact 0)
    { x: 90, y: 0 },      // 6: Top face - X +90 (fact 4)
    { x: 0, y: 0 },       // 7: Front face - reset to front (fact 0)
    { x: -90, y: 0 },     // 8: Bottom face - X -90 (fact 5)
  ]
  
  useEffect(() => {
    if (!isSyncing && !isFetchingLibrary) {
      setCurrentFaceIndex(0)
      currentFaceIndexRef.current = 0
      return
    }
    
    // Rotate to next face every 4 seconds
    const rotateToNextFace = () => {
      // Move to next face in sequence, wrapping around
      const nextIndex = (currentFaceIndexRef.current + 1) % cubeFaces.length
      setCurrentFaceIndex(nextIndex)
      currentFaceIndexRef.current = nextIndex
    }
    
    const interval = setInterval(rotateToNextFace, 4000)
    
    // Set initial face (Front)
    setCurrentFaceIndex(0)
    currentFaceIndexRef.current = 0
    
    return () => clearInterval(interval)
  }, [isSyncing, isFetchingLibrary])
  
  // Get rotation values for current face
  const currentFace = cubeFaces[currentFaceIndex]
  const rotationDirection = `rotateX(${currentFace.x}deg) rotateY(${currentFace.y}deg)`
  
  const handlePsnSync = async () => {
    setCurrentSyncService('psn')
    setIsSyncing(true)
    setIsFetchingLibrary(true)
    try {
      const token = localStorage.getItem('auth_token')
      console.log('Fetching PSN library - this may take a while for large libraries...')
      const response = await fetch(`${API_URL}/api/integrations/psn/library`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      setIsFetchingLibrary(false)

      if (response.ok) {
        const data = await response.json()
        const psnGames = data.games || []
        console.log(`[PSN SYNC] Received ${psnGames.length} games from API`)
        
        // PROCESS ALL GAMES - NO FILTERING, NO PRE-CHECKS, NO DEDUPLICATION, NO EARLY RETURNS
        // Process EVERY SINGLE GAME from the API response - backend will handle duplicates (409 errors)
        const gamesToProcess = psnGames.filter(game => game && game.name) // Only filter out null/undefined games or games without names
        const totalGames = gamesToProcess.length
        console.log(`[PSN SYNC] ===== PROCESSING ALL ${totalGames} GAMES - NO FILTERING, NO LIMITS, NO EARLY RETURNS =====`)
        console.log(`[PSN SYNC] Total games from API: ${psnGames.length}, Games to process: ${totalGames}`)
        
        // Set initial progress
        setSyncProgress({ current: 0, total: totalGames, currentGame: '' })
        const initialLogEntries = gamesToProcess.map((game) => ({
          gameName: game.name || 'Unknown Game',
          status: 'syncing',
          displayedName: ''
        }))
        setSyncLog(initialLogEntries)
        
        // Start typewriter effects - gamesToProcess is already deduplicated, so no need for additional Set
        initialLogEntries.forEach((logEntry) => {
          // Capture values immediately to avoid closure issues
          const logEntryGameName = logEntry?.gameName
          let gameNameStr = 'Unknown Game'
          if (logEntryGameName && typeof logEntryGameName !== 'function') {
            gameNameStr = `${logEntryGameName}`
          }
          
          // Typewriter effect in background (non-blocking)
          (async () => {
            // Re-capture inside async to ensure we have the right value
            const targetGameName = `${gameNameStr}`
            for (let j = 0; j <= targetGameName.length; j++) {
              await new Promise(resolve => setTimeout(resolve, 60))
              setSyncLog(prev => prev.map((item) => {
                const itemGameName = item?.gameName
                let itemGameNameStr = 'Unknown Game'
                if (itemGameName && typeof itemGameName !== 'function') {
                  itemGameNameStr = `${itemGameName}`
                }
                if (itemGameNameStr === targetGameName) {
                  return { ...item, displayedName: targetGameName.substring(0, j) }
                }
                return item
              }))
            }
          })()
        })
        
        // Process ALL games in parallel - NO BATCHING, NO LIMITS, ALL GAMES, NO PRE-FILTERING
        let addedCount = 0
        let skippedCount = 0
        
        console.log(`[PSN SYNC] ===== STARTING TO PROCESS ALL ${gamesToProcess.length} GAMES =====`)
        console.log(`[PSN SYNC] Processing ALL ${gamesToProcess.length} games in parallel - NO BATCHES, NO LIMITS`)
        
        // Process ALL games at once - EVERY SINGLE GAME WILL BE ATTEMPTED TO BE ADDED
        const processPromises = gamesToProcess.map(async (game, index) => {
          if (index % 50 === 0 || index < 5 || index >= gamesToProcess.length - 5) {
            console.log(`[PSN SYNC] Processing game ${index + 1}/${gamesToProcess.length}: ${game.name || 'Unknown'}`)
          }
            const gameName = game.name || 'Unknown Game'
            
            // Format release date if available
            let formattedReleaseDate = ''
            if (game.releaseDate) {
              try {
                const releaseDate = new Date(game.releaseDate)
                formattedReleaseDate = releaseDate.toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })
              } catch (e) {
                // Invalid date, skip
              }
            }
            
            // Get game image - PSN API provides imageUrl
            const imageUrl = game.imageUrl || ''
            
            // Get last played date
            let lastPlayedDate = null
            if (game.lastPlayedDate) {
              try {
                const lastPlayed = new Date(game.lastPlayedDate)
                const now = new Date()
                const fiveYearsAgo = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
                if (!isNaN(lastPlayed.getTime()) && lastPlayed <= now && lastPlayed >= fiveYearsAgo) {
                  lastPlayedDate = lastPlayed.toISOString()
                }
              } catch (e) {
                // Invalid date, skip
              }
            }
            
            // Convert playtime if available (PSN API provides playDuration)
            // playDuration is in seconds, convert to minutes
            const timePlayedMinutes = game.playDuration ? Math.floor(game.playDuration / 60) : 0
            
            try {
              const addResponse = await fetch(`${API_URL}/api/games`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: gameName,
                  image: imageUrl,
                  releaseDate: formattedReleaseDate,
                  studio: game.publisher || 'Unknown Studio',
                  timePlayed: timePlayedMinutes,
                  lastPlayed: lastPlayedDate,
                }),
              })

              if (addResponse.ok) {
                addedCount++
                if (index % 50 === 0 || index < 5 || index >= gamesToProcess.length - 5) {
                  console.log(`[PSN SYNC] ✓ Added game ${index + 1}/${gamesToProcess.length}: ${gameName}`)
                }
                setSyncLog(prev => prev.map(item => 
                  item.gameName === gameName && item.status === 'syncing'
                    ? { ...item, status: 'synced' }
                    : item
                ))
              } else if (addResponse.status === 409) {
                // Game already exists in library - this is expected, skip it
                skippedCount++
                if (index % 50 === 0 || index < 5 || index >= gamesToProcess.length - 5) {
                  console.log(`[PSN SYNC] ⊘ Skipped (already exists) game ${index + 1}/${gamesToProcess.length}: ${gameName}`)
                }
                setSyncLog(prev => prev.map(item => 
                  item.gameName === gameName && item.status === 'syncing'
                    ? { ...item, status: 'synced' }
                    : item
                ))
              } else {
                // Other error - still count as skipped but log it
                skippedCount++
                const errorText = await addResponse.text().catch(() => 'Unknown error')
                console.error(`[PSN SYNC] ✗ Error adding game ${index + 1}/${gamesToProcess.length}: ${gameName} - Status: ${addResponse.status}, Error: ${errorText}`)
                setSyncLog(prev => prev.map(item => 
                  item.gameName === gameName && item.status === 'syncing'
                    ? { ...item, status: 'synced' }
                    : item
                ))
              }
            } catch (error) {
              console.error(`[PSN SYNC] Error adding game ${gameName}:`, error)
              skippedCount++
              setSyncLog(prev => prev.map(item => 
                item.gameName === gameName && item.status === 'syncing'
                  ? { ...item, status: 'synced' }
                  : item
              ))
            }
          return { gameName, success: true }
        })
        
        console.log(`[PSN SYNC] ===== AWAITING ALL ${processPromises.length} PROMISES TO COMPLETE =====`)
        const results = await Promise.all(processPromises)
        console.log(`[PSN SYNC] ===== ALL ${results.length} GAMES PROCESSED =====`)
        console.log(`[PSN SYNC] FINAL COUNT - Added: ${addedCount}, Skipped: ${skippedCount}, Total processed: ${results.length}`)
        console.log(`[PSN SYNC] Expected total: ${gamesToProcess.length}, Actual processed: ${results.length}`)
        
        if (results.length !== gamesToProcess.length) {
          console.error(`[PSN SYNC] ERROR: Processed ${results.length} games but expected ${gamesToProcess.length}`)
        }
        
        // Mark all as synced
        setSyncLog(prev => prev.map(item => 
          item.status === 'syncing' ? { ...item, status: 'synced' } : item
        ))
        
        setSyncProgress({ current: totalGames, total: totalGames, currentGame: 'Complete!' })
        
        // Mark sync as complete
        await fetch(`${API_URL}/api/integrations/psn/sync-complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ addedCount, skippedCount }),
        })
        
        await fetchConnections()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setErrorModal({ show: true, message: `Failed to sync PSN library: ${errorData.error || 'Unknown error'}`, onConfirm: null })
      }
    } catch (error) {
      console.error('Error syncing PSN library:', error)
        setErrorModal({ show: true, message: 'An error occurred while syncing your PSN library. Please try again.', onConfirm: null })
    }
  }

  const handleSteamSync = async () => {
    setCurrentSyncService('steam')
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
        
        // If no games to process, show success modal
        if (totalGames === 0) {
          setIsSyncing(false)
          setTimeout(() => {
            setSyncSuccessModal({ 
              show: true, 
              addedCount: 0, 
              skippedCount: steamGames.length,
              message: 'All games from your Steam library are already in your collection!' 
            })
          }, 100)
          return
        }
        
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
        
        // Add all games to log immediately (for fast processing)
        // Then run typewriter effect in parallel for visual effect
        const initialLogEntries = gamesToProcess.map((steamGame) => {
          // Safely extract game name - handle cases where name might be a function or undefined
          const nameValue = typeof steamGame?.name === 'function' 
            ? 'Unknown Game' 
            : (steamGame?.name || 'Unknown Game')
          return {
            gameName: String(nameValue),
            status: 'syncing',
            displayedName: ''
          }
        })
        setSyncLog(initialLogEntries)
        
        // Start typewriter effects in background (non-blocking)
        initialLogEntries.forEach((logEntry) => {
          // Capture values immediately to avoid closure issues
          const logEntryGameName = logEntry?.gameName
          let gameNameStr = 'Unknown Game'
          if (logEntryGameName && typeof logEntryGameName !== 'function') {
            gameNameStr = `${logEntryGameName}`
          }
          
          // Typewriter effect in background (non-blocking)
          (async () => {
            // Re-capture inside async to ensure we have the right value
            const targetGameName = gameNameStr
            const fullName = targetGameName
            
            for (let j = 0; j <= fullName.length; j++) {
              await new Promise(resolve => setTimeout(resolve, 60)) // 60ms per character for slower, more visible typing
              setSyncLog(prev => prev.map((item) => {
                // Match by gameName instead of index for reliability
                let itemGameName = 'Unknown Game'
                if (item?.gameName && typeof item.gameName !== 'function') {
                  itemGameName = `${item.gameName}`
                }
                if (itemGameName === targetGameName) {
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
                // Update log status to synced - find items with this gameName that are still syncing
                setSyncLog(prev => prev.map(item => {
                  const itemName = (item?.gameName && typeof item.gameName !== 'function') ? `${item.gameName}` : 'Unknown Game'
                  const gameNameStr = (gameName && typeof gameName !== 'function') ? `${gameName}` : 'Unknown Game'
                  return (itemName === gameNameStr && item.status === 'syncing')
                    ? { ...item, status: 'synced' }
                    : item
                }))
              } else if (addResponse.status === 409) {
                skippedCount++
                // Mark as synced (already in library)
                setSyncLog(prev => prev.map(item => {
                  const itemName = (item?.gameName && typeof item.gameName !== 'function') ? `${item.gameName}` : 'Unknown Game'
                  const gameNameStr = (gameName && typeof gameName !== 'function') ? `${gameName}` : 'Unknown Game'
                  return (itemName === gameNameStr && item.status === 'syncing')
                    ? { ...item, status: 'synced' }
                    : item
                }))
              }
            } catch (error) {
              console.error(`Error adding game ${steamGame.name}:`, error)
              // Update log status to synced on error (treat as already in library)
              setSyncLog(prev => prev.map(item => {
                const itemName = (item?.gameName && typeof item.gameName !== 'function') ? `${item.gameName}` : 'Unknown Game'
                const gameNameStr = (gameName && typeof gameName !== 'function') ? `${gameName}` : 'Unknown Game'
                return (itemName === gameNameStr && item.status === 'syncing')
                  ? { ...item, status: 'synced' }
                  : item
              }))
            } finally {
              processedCount++
              updateProgressIfNeeded()
            }
          }))
        }
        
        // Final progress update - sync is complete
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
        // Don't show separate success modal - keep the sync modal open with console log visible
        setSteamHasSynced(true)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setErrorModal({ show: true, message: `Failed to sync Steam library: ${errorData.error || 'Unknown error'}`, onConfirm: null })
      }
    } catch (error) {
      console.error('Error syncing Steam library:', error)
        setErrorModal({ show: true, message: 'An error occurred while syncing your Steam library. Please try again.', onConfirm: null })
    } finally {
      // Don't close the modal automatically - keep it open with console log visible
      // setIsSyncing(false) - removed to keep modal open
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
    {
      id: 'psn',
      name: 'PlayStation Network',
      description: 'Connect your PlayStation account to sync your game library',
      icon: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-1.151.497 0 .801.47.801 1.151v11.337l3.873 1.268V3.813c0-.616-.285-1.008-.795-1.008-.498 0-.803.389-.803 1.008v7.891l-3.915-1.261V2.596c0-.626-.29-1.008-.794-1.008-.499 0-.801.39-.801 1.008zm-4.952 5.62c-2.322.013-4.033 1.803-4.033 4.033 0 2.305 1.794 4.033 4.033 4.033 2.305 0 4.033-1.794 4.033-4.033 0-2.305-1.828-4.033-4.033-4.033zm-.005 6.585c-1.399 0-2.427-1.068-2.427-2.427 0-1.399 1.028-2.427 2.427-2.427 1.399 0 2.427 1.028 2.427 2.427 0 1.359-1.028 2.427-2.427 2.427zm17.972-5.168v9.063c0 .652.29 1.068.795 1.068.498 0 .794-.416.794-1.068V9.033c0-2.305-1.828-4.033-4.033-4.033-2.305 0-4.033 1.794-4.033 4.033v9.063c0 .652.29 1.068.795 1.068.498 0 .794-.416.794-1.068v-4.033h2.427c1.399 0 2.427-1.028 2.427-2.427 0-1.399-1.028-2.427-2.427-2.427h-2.427V9.033c0-1.399 1.028-2.427 2.427-2.427 1.399 0 2.427 1.028 2.427 2.427z"/>
        </svg>
      ),
      color: 'from-blue-600 to-indigo-700',
      connected: psnConnected,
    },
  ]

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6 md:py-12">
        <div className="max-w-4xl">
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
              className={`bg-blue-500/10 border border-blue-500/30 rounded-2xl relative overflow-hidden transition-all duration-300 ease-in-out ${
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
                            onClick={service.id === 'steam' ? handleSteamConnect : service.id === 'psn' ? () => setShowPsnAuthModal(true) : undefined}
                            disabled={isConnecting}
                            className={`px-6 py-2 bg-gradient-to-r ${service.color} text-white rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg text-sm font-medium`}
                          >
                            {isConnecting ? 'Connecting...' : 'Connect'}
                          </button>
                        )}

                        {/* Sync Button - Always visible for Steam/PSN, disabled if not connected or already synced */}
                        {(service.id === 'steam' || service.id === 'psn') && !isSteamSynchronized && (
                          <button
                            onClick={service.id === 'steam' ? handleSteamSync : handlePsnSync}
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
        onClose={() => {
          setIsSyncing(false)
          setIsFetchingLibrary(false)
          setSyncProgress({ current: 0, total: 0, currentGame: '' })
          setCurrentSyncService(null)
        }}
        title={isFetchingLibrary 
          ? `Fetching Your ${currentSyncService === 'steam' ? 'Steam' : 'PSN'} Library` 
          : (syncProgress.current === syncProgress.total && syncProgress.total > 0 
            ? "Sync Complete" 
            : `Syncing Your ${currentSyncService === 'steam' ? 'Steam' : 'PSN'} Library`)}
        preventClose={syncProgress.current !== syncProgress.total || syncProgress.total === 0 || isFetchingLibrary}
        additionalContent={
          <div className="relative w-full md:w-full md:max-w-md md:h-auto md:mx-4 md:max-h-[90vh] md:min-h-[400px]" style={{ border: '1px solid #e5e7eb' }}>
            <GamingFacts facts={gamingFacts} rotationDirection={rotationDirection} />
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            {isFetchingLibrary ? (
                <div className="text-center">
                  <p className="text-gray-300 mb-4">
                    Fetching your game library from {currentSyncService === 'steam' ? 'Steam' : 'PlayStation Network'}...
                  </p>
                  <p className="text-gray-400 text-sm">
                    This may take a while for large libraries. Please wait...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-300 mb-4">
                    {syncProgress.total > 0 
                      ? `Importing game ${syncProgress.current} of ${syncProgress.total}`
                      : 'Preparing to sync your games...'}
                  </p>
                </>
              )}
              
              {/* Progress Bar - only show when not fetching library */}
            {!isFetchingLibrary && (
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
            )}
            <p className="text-gray-500 text-xs text-center mb-4">
              {syncProgress.current === syncProgress.total && syncProgress.total > 0
                ? 'Sync complete! You can close this window.'
                : syncProgress.total > 0 
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
                    const dotsCount = Math.max(2, availableWidth - gameNameDisplay.length - (logItem.status === 'synced' ? 6 : 9))
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

      {/* PSN NPSSO Token Modal */}
      <Modal
        isOpen={showPsnAuthModal}
        onClose={() => {
          setShowPsnAuthModal(false)
          setNpssoToken('')
        }}
        title="Connect PlayStation Network"
      >
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <h4 className="text-blue-300 font-semibold mb-2 text-sm">How to obtain an authentication token:</h4>
            <ol className="text-gray-300 text-xs space-y-1.5 list-decimal list-inside">
              <li>Go to <a href="https://www.playstation.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">playstation.com</a> and sign in to your PlayStation account</li>
              <li>While logged in, visit <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">https://ca.account.sony.com/api/v1/ssocookie</a> (opens in new tab)</li>
              <li>You should see a JSON response with an "npsso" field</li>
              <li>Copy the entire value of the "npsso" field (it should be a long string of characters)</li>
              <li>Paste it in the field below and click "Connect"</li>
            </ol>
            <p className="text-gray-400 text-xs mt-3 italic">Note: If you see an error or login page, make sure you're signed into playstation.com in the same browser.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              NPSSO Token
            </label>
            <input
              type="text"
              value={npssoToken}
              onChange={(e) => setNpssoToken(e.target.value)}
              placeholder="Paste your NPSSO token here"
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowPsnAuthModal(false)
                setNpssoToken('')
              }}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handlePsnConnect}
              disabled={isConnecting || !npssoToken.trim()}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Sync Success Modal */}
      <Modal
        isOpen={syncSuccessModal.show}
        onClose={() => setSyncSuccessModal({ show: false, addedCount: 0, skippedCount: 0, message: '' })}
        title="Sync Complete"
      >
        <div className="space-y-4">
          {syncSuccessModal.message ? (
            <p className="text-gray-300">{syncSuccessModal.message}</p>
          ) : (
            <>
              {syncSuccessModal.addedCount > 0 ? (
                <p className="text-gray-300">
                  Successfully synced {syncSuccessModal.addedCount} {syncSuccessModal.addedCount === 1 ? 'game' : 'games'} from {currentSyncService === 'steam' ? 'Steam' : 'PlayStation Network'}
                  {syncSuccessModal.skippedCount > 0 && (
                    <span className="text-gray-400"> ({syncSuccessModal.skippedCount} already in library)</span>
                  )}
                </p>
              ) : (
                <p className="text-gray-300">
                  All games are already in your library
                </p>
              )}
            </>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSyncSuccessModal({ show: false, addedCount: 0, skippedCount: 0, message: '' })}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all"
            >
              OK
            </button>
            {!isOnDashboard && (
              <button
                onClick={() => {
                  setSyncSuccessModal({ show: false, addedCount: 0, skippedCount: 0, message: '' })
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
        onClose={() => setErrorModal({ show: false, message: '', onConfirm: null })}
        title="Error"
      >
        <div className="space-y-4">
          <p className="text-gray-300">{errorModal.message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setErrorModal({ show: false, message: '', onConfirm: null })}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            {errorModal.onConfirm && (
              <button
                onClick={() => {
                  if (errorModal.onConfirm) {
                    errorModal.onConfirm()
                  }
                  setErrorModal({ show: false, message: '', onConfirm: null })
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-colors"
              >
                Sign In to PSN
              </button>
            )}
            {!errorModal.onConfirm && (
              <button
                onClick={() => setErrorModal({ show: false, message: '', onConfirm: null })}
                className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
              >
                OK
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Integrations


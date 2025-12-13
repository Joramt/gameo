import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function Integrations() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [steamConnected, setSteamConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connections, setConnections] = useState([])
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, authLoading, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      fetchConnections()
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
        setSteamConnected(!!steamConnection)
      }
    } catch (error) {
      console.error('Error fetching connections:', error)
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

  const services = [
    {
      id: 'steam',
      name: 'Steam',
      description: 'Connect your Steam account to automatically sync your game library',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.988 1.578-1.626 2.767-1.626h.873v-.031c0-2.063 1.724-3.73 3.84-3.73 2.116 0 3.843 1.667 3.843 3.73v.031h.873c.622 0 1.206.237 1.637.626l5.834-2.412C22.483 4.851 17.303 0 11.979 0zM6.492 15.068H0v5.694c0 1.835 1.495 3.33 3.33 3.33h3.162v-5.694zm13.854 0h-6.492v5.694h3.162c1.835 0 3.33-1.495 3.33-3.33v-5.694z"/>
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
      <nav className="bg-gray-800/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Back to dashboard"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold text-white">G</span>
                </div>
                <span className="text-xl font-bold text-white">Gameo</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-white text-sm hidden md:block">{user?.name || user?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Integrations
            </h1>
            <p className="text-gray-300 text-lg">
              Connect your gaming accounts to automatically sync your game library
            </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className={`relative bg-gray-800/50 backdrop-blur-xl rounded-2xl border-2 transition-all ${
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
                  <h3 className="text-2xl font-bold text-white mb-2">{service.name}</h3>
                  <p className="text-gray-400 mb-6">{service.description}</p>

                  {/* Connection Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {service.connected ? (
                        <>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-sm font-medium">Connected</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span className="text-gray-500 text-sm">Not connected</span>
                        </>
                      )}
                    </div>

                    {/* Action Button */}
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="mt-8 md:mt-12 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-blue-300 font-semibold mb-2">How it works</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  When you connect your Steam account, we'll securely sync your game library. 
                  Your login credentials are never stored - we use Steam's official authentication 
                  system to access your public game list.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Integrations


import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isDashboard = location.pathname === '/dashboard'
  const isIntegrations = location.pathname === '/integrations'

  // Capitalize first letter of each word in a name
  const capitalizeName = (name) => {
    if (!name) return ''
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  const displayName = user?.name ? capitalizeName(user.name) : (user?.email || '')

  return (
    <nav className="bg-gray-800/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Logo */}
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">G</span>
            </div>
            <span className="text-2xl font-bold text-white">Gameo</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Integrations Button - only show on Dashboard */}
            {isDashboard && (
              <button
                onClick={() => navigate('/integrations')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors"
                aria-label="Integrations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="hidden md:inline">Integrations</span>
              </button>
            )}
            
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
                    alt={displayName || 'User'}
                    className="w-10 h-10 rounded-full border-2 border-gray-600/50 hover:border-purple-500/50 transition-colors"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-gray-600/50 hover:border-purple-500/50 transition-colors">
                    <span className="text-white font-semibold">
                      {(displayName || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-white hidden md:inline">{displayName}</span>
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
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700/50 py-2 z-50">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        logout()
                      }}
                      className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
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
  )
}

export default Navigation


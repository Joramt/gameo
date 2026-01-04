import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Navigation from './Navigation'
import Tabs from './Tabs'
import SocialFeed from './SocialFeed'

function Social() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Navigation */}
      <Navigation />

      {/* Tabs */}
      <Tabs
        activeTab="social"
        onTabChange={(tabId) => {
          if (tabId === 'library') {
            navigate('/dashboard')
          }
        }}
        tabs={[
          { id: 'library', label: 'Library' },
          { id: 'social', label: 'Social' }
        ]}
      />

      {/* Social Content */}
      <div className="container mx-auto px-6 py-6 md:py-12">
        <div className="max-w-7xl mx-auto">
          <SocialFeed />
        </div>
      </div>
    </div>
  )
}

export default Social


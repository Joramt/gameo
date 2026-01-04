import { useNavigate } from 'react-router-dom'
import Navigation from './Navigation'
import Tabs from './Tabs'
import SocialFeed from './SocialFeed'

function Social() {
  const navigate = useNavigate()

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


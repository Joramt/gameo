import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import Modal from './Modal'

function LandingPage() {
  const { isAuthenticated, hasBudget, isLoading } = useAuth()
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect based on budget status (only if we've checked it)
      // Don't close modals here - let them stay open during redirect
      // The modal will naturally disappear when navigating away
      if (hasBudget === false) {
        navigate('/budget-setup', { replace: true })
      } else if (hasBudget === true) {
        navigate('/dashboard', { replace: true })
      }
      // If hasBudget is null, wait for it to be checked
    }
  }, [isAuthenticated, hasBudget, isLoading, navigate])
  
  // Debug log
  useEffect(() => {
    console.log('LandingPage state:', { isAuthenticated, hasBudget, isLoading })
  }, [isAuthenticated, hasBudget, isLoading])

  const handleSignUp = () => {
    setShowSignupModal(true)
    setShowLoginModal(false)
  }

  const handleLogin = () => {
    setShowLoginModal(true)
    setShowSignupModal(false)
  }

  const handleCloseLogin = () => {
    setShowLoginModal(false)
  }

  const handleCloseSignup = () => {
    setShowSignupModal(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">G</span>
            </div>
            <span className="text-2xl font-bold text-white">Gameo</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogin}
              className="px-4 py-2 text-white hover:text-purple-300 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleSignUp}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Connect. Play.{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Share.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed">
            The social platform built for gamers. Build your library, connect with
            friends, and discover your next adventure together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleSignUp}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50"
            >
              Start Your Journey
            </button>
            <button
              onClick={handleLogin}
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white text-lg font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/20"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Auth Modals */}
      <Modal
        isOpen={showLoginModal}
        onClose={handleCloseLogin}
        title="Sign In"
      >
        <LoginForm
          onSwitchToSignup={() => {
            setShowLoginModal(false)
            setShowSignupModal(true)
          }}
          onClose={handleCloseLogin}
        />
      </Modal>

      <Modal
        isOpen={showSignupModal}
        onClose={handleCloseSignup}
        title="Create Account"
      >
        <SignupForm
          onSwitchToLogin={() => {
            setShowSignupModal(false)
            setShowLoginModal(true)
          }}
          onClose={handleCloseSignup}
        />
      </Modal>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Game Library</h3>
            <p className="text-gray-400">
              Build and showcase your personal game collection. Track what you've
              played and discover new favorites.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Connect Friends</h3>
            <p className="text-gray-400">
              Add friends, explore their libraries, and tag them in games you've
              played together.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Wishlist</h3>
            <p className="text-gray-400">
              Keep track of upcoming games you're excited about and never miss a
              release.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-white/10">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 Gameo. Built for gamers, by gamers.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage


import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

function LoginForm({ onSwitchToSignup, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, error: authError } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setIsSubmitting(true)

    try {
      if (!email || !password) {
        setLocalError('Please fill in all fields')
        setIsSubmitting(false)
        return
      }

      const result = await login(email, password)
      console.log('Login result:', result)
      
      if (result.success) {
        // Don't close modal here - let LandingPage handle redirect naturally
        // The modal will close when the redirect happens
      } else {
        setLocalError(result.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setLocalError(error.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayError = localError || authError

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
          {displayError && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
              {displayError}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-white text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-white text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              placeholder="••••••••"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-purple-500/25"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center">
            <p className="text-gray-300 text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>
        </form>
  )
}

export default LoginForm


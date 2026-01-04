import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

function SignupForm({ onSwitchToLogin, onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState('US')
  const [language, setLanguage] = useState('en')
  const [ageGroup, setAgeGroup] = useState('')
  const [localError, setLocalError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signup, error: authError } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setIsSubmitting(true)

    try {
      if (!name || !email || !password || !country || !language || !ageGroup) {
        setLocalError('Please fill in all fields')
        setIsSubmitting(false)
        return
      }

      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters')
        setIsSubmitting(false)
        return
      }

      const result = await signup(name, email, password, country, language, ageGroup)
      console.log('Signup result:', result)
      
      if (result.success) {
        // Modal will close via onClose, redirect will happen via LandingPage useEffect
        if (onClose) onClose()
      } else {
        setLocalError(result.error || 'Signup failed')
      }
    } catch (error) {
      console.error('Signup error:', error)
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
            <label htmlFor="name" className="block text-white text-sm font-medium mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              placeholder="Your name"
              disabled={isSubmitting}
            />
          </div>

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
            <p className="text-gray-500 text-xs mt-1.5">At least 6 characters</p>
          </div>

          <div>
            <label htmlFor="country" className="block text-white text-sm font-medium mb-2">
              Country
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              disabled={isSubmitting}
              required
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="FR">France</option>
              <option value="DE">Germany</option>
              <option value="ES">Spain</option>
              <option value="IT">Italy</option>
              <option value="JP">Japan</option>
              <option value="AU">Australia</option>
              <option value="BR">Brazil</option>
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block text-white text-sm font-medium mb-2">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              disabled={isSubmitting}
              required
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="ja">日本語</option>
              <option value="pt">Português</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Age
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAgeGroup('under18')}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all ${
                  ageGroup === 'under18'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-purple-400'
                    : 'bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-purple-500/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Younger than 18 years old
              </button>
              <button
                type="button"
                onClick={() => setAgeGroup('over18')}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all ${
                  ageGroup === 'over18'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-purple-400'
                    : 'bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-purple-500/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Older than 18 years old
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-purple-500/25"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="text-center">
            <p className="text-gray-300 text-sm">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
  )
}

export default SignupForm


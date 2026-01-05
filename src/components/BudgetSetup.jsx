import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function BudgetSetup() {
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetPeriod, setBudgetPeriod] = useState('monthly')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading, refreshBudget } = useAuth()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, authLoading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      setError('Please enter a valid budget amount')
      return
    }

    setIsLoading(true)

    try {
      const token = sessionStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/budget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(budgetAmount),
          period: budgetPeriod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save budget')
      }

      // Refresh budget status in auth context
      await refreshBudget()

      // Redirect to dashboard after successful save
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'An error occurred while saving your budget')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    // Don't create a budget, just navigate to dashboard
    // On next login, user will be asked again (hasBudget will still be false)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Set Your Budget</h2>
            <p className="text-gray-300 text-sm">
              Help us personalize your experience by setting up your gaming budget
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="budgetAmount" className="block text-white text-sm font-medium mb-2">
                Budget Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  $
                </span>
                <input
                  id="budgetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-3">
                Budget Period
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setBudgetPeriod('weekly')}
                  disabled={isLoading}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    budgetPeriod === 'weekly'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetPeriod('monthly')}
                  disabled={isLoading}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    budgetPeriod === 'monthly'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetPeriod('yearly')}
                  disabled={isLoading}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    budgetPeriod === 'yearly'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? 'Saving...' : 'Save Budget'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip for Now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BudgetSetup


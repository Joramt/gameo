import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasBudget, setHasBudget] = useState(null) // null = unknown, true/false = checked

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      // Verify token is still valid by fetching user data
      fetchUserData(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const checkBudget = async (token) => {
    try {
      console.log('Checking budget...')
      const response = await fetch(`${API_URL}/api/budget`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('Budget check response status:', response.status)

      if (response.ok) {
        const budgetData = await response.json()
        console.log('Budget data:', budgetData)
        const hasBudgetValue = budgetData.budget !== null && budgetData.budget !== undefined
        setHasBudget(hasBudgetValue)
        console.log('hasBudget set to:', hasBudgetValue)
        return hasBudgetValue
      } else if (response.status === 404) {
        // No budget found
        console.log('No budget found (404)')
        setHasBudget(false)
        return false
      } else {
        // Error checking budget, assume no budget for now
        console.log('Budget check error, status:', response.status)
        setHasBudget(false)
        return false
      }
    } catch (err) {
      console.error('Error checking budget:', err)
      setHasBudget(false)
      return false
    }
  }

  const fetchUserData = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, { 
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setIsAuthenticated(true)
        // Check budget after fetching user data
        await checkBudget(token)
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token')
        setUser(null)
        setIsAuthenticated(false)
        setHasBudget(null)
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      localStorage.removeItem('auth_token')
      setUser(null)
      setIsAuthenticated(false)
      setHasBudget(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      setError(null)
      // Don't set global isLoading for login/signup - it blocks navigation
      // Use local loading state in the form component instead

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store token
      localStorage.setItem('auth_token', data.token)
      
      // Set user data
      setUser(data.user)
      setIsAuthenticated(true)
      
      // Check budget after successful login
      const budgetStatus = await checkBudget(data.token)
      console.log('Login - budget status:', budgetStatus)
      
      return { success: true, hasBudget: budgetStatus }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during login'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const signup = async (name, email, password, country, language, ageGroup) => {
    try {
      setError(null)
      // Don't set global isLoading for login/signup - it blocks navigation
      // Use local loading state in the form component instead

      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, country, language, ageGroup }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      // Store token
      localStorage.setItem('auth_token', data.token)
      
      // Set user data
      setUser(data.user)
      setIsAuthenticated(true)
      
      // Check budget after successful signup
      const budgetStatus = await checkBudget(data.token)
      console.log('Signup - budget status:', budgetStatus)
      
      return { success: true, hasBudget: budgetStatus }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during signup'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        // Optional: Call logout endpoint to invalidate token on server
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {
          // Ignore errors on logout - we'll clear local state anyway
        })
      }
    } catch (err) {
      console.error('Error during logout:', err)
    } finally {
      // Clear local state regardless of API call success
      localStorage.removeItem('auth_token')
      setUser(null)
      setIsAuthenticated(false)
      setError(null)
      setHasBudget(null)
    }
  }

  const refreshBudget = async () => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      await checkBudget(token)
    }
  }

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    hasBudget,
    login,
    signup,
    logout,
    setError,
    refreshBudget,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


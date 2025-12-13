import express from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../services/supabase.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

if (!supabase) {
  console.warn('⚠️ Supabase not configured. Auth routes will not work properly.')
}

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Use Supabase Auth regular signup (works with anon key, no service role needed)
    // This creates user in auth.users and the trigger will create user_profiles automatically
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name
        }
      }
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return res.status(400).json({ error: 'User with this email already exists' })
      }
      console.error('Auth signup error:', authError)
      return res.status(500).json({ error: 'Failed to create account' })
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'Failed to create user' })
    }

    // The trigger should create user_profiles automatically
    // Wait a bit for the trigger to execute, then fetch the profile
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, created_at')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      // If trigger didn't work, create profile manually
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: authData.user.id,
            email,
            display_name: name,
          }
        ])
        .select('id, email, display_name, created_at')
        .single()

      if (createError) {
        console.error('Manual profile creation error:', createError)
        return res.status(500).json({ error: 'Failed to create user profile' })
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: authData.user.id, email: authData.user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const userProfile = profile || newProfile

    res.status(201).json({
      token,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.display_name,
      }
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'An error occurred during signup' })
  }
})

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, created_at')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return res.status(404).json({ error: 'User profile not found' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: profile.id, email: profile.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.display_name,
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'An error occurred during login' })
  }
})

/**
 * GET /api/auth/me
 * Get current user information (requires authentication)
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Verify JWT token
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, created_at')
      .eq('id', decoded.userId)
      .single()

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.display_name,
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * POST /api/auth/logout
 * Logout user (currently just returns success, token is client-side only)
 */
router.post('/logout', async (req, res) => {
  // Since we're using JWT tokens stored client-side,
  // logout is handled by the client removing the token.
  // This endpoint exists for future server-side token invalidation.
  res.json({ message: 'Logged out successfully' })
})

export { router as authRouter }


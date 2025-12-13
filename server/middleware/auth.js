import jwt from 'jsonwebtoken'
import { supabase } from '../services/supabase.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

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

    // Verify user exists in Supabase
    if (supabase) {
      const { data: user, error } = await supabase
        .from('user_profiles')
        .select('id, email, display_name, created_at')
        .eq('id', decoded.userId)
        .single()

      if (error || !user) {
        return res.status(403).json({ error: 'User not found' })
      }

      req.user = user
      req.userId = decoded.userId
    } else {
      // Fallback if Supabase not configured
      req.userId = decoded.userId
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Authentication error' })
  }
}


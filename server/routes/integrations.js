import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'
import jwt from 'jsonwebtoken'

const router = express.Router()

// Steam OpenID configuration
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const STEAM_API_KEY = process.env.STEAM_API_KEY || ''
const STEAM_RETURN_URL = process.env.STEAM_RETURN_URL || 'http://localhost:3000/api/integrations/steam/callback'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * GET /api/integrations
 * Get all connected integrations for the current user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const { data: connections, error } = await supabase
      .from('user_integrations')
      .select('service, external_id, connected_at, metadata')
      .eq('user_id', req.userId)

    if (error) {
      console.error('Error fetching integrations:', error)
      return res.status(500).json({ error: 'Failed to fetch integrations' })
    }

    res.json({
      connections: connections || []
    })
  } catch (error) {
    console.error('Get integrations error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * POST /api/integrations/steam/auth
 * Initiate Steam OpenID authentication
 */
router.post('/steam/auth', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Create a temporary JWT token to encode the userId (expires in 10 minutes)
    const tempToken = jwt.sign(
      { userId: req.userId, purpose: 'steam_auth' },
      JWT_SECRET,
      { expiresIn: '10m' }
    )
    
    // Build Steam OpenID authentication URL
    // Realm and return_to must match - extract domain from return URL
    const returnUrl = new URL(STEAM_RETURN_URL)
    const realm = `${returnUrl.protocol}//${returnUrl.host}`
    const returnTo = `${STEAM_RETURN_URL}?token=${tempToken}`
    
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': realm,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    })

    const authUrl = `${STEAM_OPENID_URL}?${params.toString()}`

    res.json({
      authUrl
    })
  } catch (error) {
    console.error('Steam auth initiation error:', error)
    res.status(500).json({ error: 'Failed to initiate Steam authentication' })
  }
})

/**
 * GET /api/integrations/steam/callback
 * Handle Steam OpenID callback (Steam sends GET request with query params)
 */
router.get('/steam/callback', async (req, res) => {
  try {
    console.log('Steam callback received:', req.query)
    const { token } = req.query
    const openIdParams = req.query

    if (!token) {
      console.error('No token in callback')
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=invalid_response`)
    }

    // Get userId from JWT token
    let userId = null
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      if (decoded.purpose === 'steam_auth' && decoded.userId) {
        userId = decoded.userId
      } else {
        console.error('Invalid token purpose or missing userId')
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=invalid_token`)
      }
    } catch (err) {
      console.error('Token verification failed:', err.message)
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=token_expired`)
    }

    // Extract Steam ID from OpenID identity URL
    // Format: https://steamcommunity.com/openid/id/76561198012345678
    const identity = openIdParams['openid.identity'] || openIdParams.identity
    if (!identity) {
      console.error('No identity in OpenID response')
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=invalid_response`)
    }

    const steamIdMatch = identity.match(/\/id\/(\d+)$/)
    if (!steamIdMatch) {
      console.error('Invalid Steam ID format:', identity)
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=invalid_steam_id`)
    }

    const steamId = steamIdMatch[1]

    // Verify the OpenID response with Steam
    const verifyParams = new URLSearchParams({
      'openid.ns': openIdParams['openid.ns'] || 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'check_authentication',
      'openid.op_endpoint': openIdParams['openid.op_endpoint'] || 'https://steamcommunity.com/openid/login',
      'openid.claimed_id': openIdParams['openid.claimed_id'] || identity,
      'openid.identity': identity,
      'openid.return_to': openIdParams['openid.return_to'] || `${STEAM_RETURN_URL}?token=${token}`,
      'openid.response_nonce': openIdParams['openid.response_nonce'] || '',
      'openid.assoc_handle': openIdParams['openid.assoc_handle'] || '',
      'openid.signed': openIdParams['openid.signed'] || '',
      'openid.sig': openIdParams['openid.sig'] || ''
    })

    try {
      const verifyResponse = await fetch(STEAM_OPENID_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: verifyParams.toString()
      })

      const verifyText = await verifyResponse.text()
      // Steam returns "is_valid:true" if valid
      if (!verifyText.includes('is_valid:true')) {
        console.error('OpenID verification failed:', verifyText)
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=verification_failed`)
      }
    } catch (verifyError) {
      console.error('Error verifying OpenID response:', verifyError)
      // Continue anyway - in production you might want to fail here
    }

    // Store the connection in database
    if (!supabase) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=server_error`)
    }

    // Check if connection already exists
    const { data: existing, error: checkError } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('service', 'steam')
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing connection:', checkError)
    }

    if (existing) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('user_integrations')
        .update({
          external_id: steamId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Error updating Steam connection:', updateError)
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=update_failed`)
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('user_integrations')
        .insert([
          {
            user_id: userId,
            service: 'steam',
            external_id: steamId,
            connected_at: new Date().toISOString()
          }
        ])

      if (insertError) {
        console.error('Error creating Steam connection:', insertError)
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=insert_failed&details=${encodeURIComponent(insertError.message)}`)
      }
    }

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?success=steam_connected`)
  } catch (error) {
    console.error('Steam callback error:', error)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=callback_error`)
  }
})

/**
 * DELETE /api/integrations/:service
 * Disconnect a service
 */
router.delete('/:service', authenticateToken, async (req, res) => {
  try {
    const { service } = req.params

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const { error } = await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', req.userId)
      .eq('service', service)

    if (error) {
      console.error('Error disconnecting service:', error)
      return res.status(500).json({ error: 'Failed to disconnect service' })
    }

    res.json({ message: 'Service disconnected successfully' })
  } catch (error) {
    console.error('Disconnect service error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * GET /api/integrations/steam/library
 * Fetch user's Steam library
 */
router.get('/steam/library', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Get user's Steam connection
    const { data: connection, error: connectionError } = await supabase
      .from('user_integrations')
      .select('external_id')
      .eq('user_id', req.userId)
      .eq('service', 'steam')
      .single()

    if (connectionError || !connection) {
      return res.status(404).json({ error: 'Steam account not connected' })
    }

    const steamId = connection.external_id

    if (!STEAM_API_KEY) {
      return res.status(500).json({ error: 'Steam API key not configured' })
    }

    // Fetch Steam library using Steam Web API
    // Note: This requires the Steam API key to be set
    const steamApiUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=true&include_played_free_games=true`
    
    const steamResponse = await fetch(steamApiUrl)
    const steamData = await steamResponse.json()

    if (!steamResponse.ok || !steamData.response || !steamData.response.games) {
      return res.status(500).json({ error: 'Failed to fetch Steam library' })
    }

    res.json({
      games: steamData.response.games,
      game_count: steamData.response.game_count
    })
  } catch (error) {
    console.error('Get Steam library error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

export { router as integrationsRouter }


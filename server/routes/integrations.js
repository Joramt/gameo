import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'
import crypto from 'crypto'

const router = express.Router()

// Steam OpenID configuration
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const STEAM_API_KEY = process.env.STEAM_API_KEY || ''
const STEAM_RETURN_URL = process.env.STEAM_RETURN_URL || 'http://localhost:3000/api/integrations/steam/callback'

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
    // Generate a unique nonce for this authentication attempt
    const nonce = crypto.randomBytes(16).toString('hex')
    
    // Store nonce in session/database temporarily (simplified - in production use Redis or session store)
    // For now, we'll include it in the return URL
    
    // Build Steam OpenID authentication URL
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': `${STEAM_RETURN_URL}?nonce=${nonce}&userId=${req.userId}`,
      'openid.realm': process.env.FRONTEND_URL || 'http://localhost:5173',
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    })

    const authUrl = `${STEAM_OPENID_URL}?${params.toString()}`

    res.json({
      authUrl,
      nonce
    })
  } catch (error) {
    console.error('Steam auth initiation error:', error)
    res.status(500).json({ error: 'Failed to initiate Steam authentication' })
  }
})

/**
 * GET /api/integrations/steam/callback
 * Handle Steam OpenID callback
 */
router.get('/steam/callback', async (req, res) => {
  try {
    const { 'openid.identity': identity, 'openid.return_to': returnTo, nonce, userId } = req.query

    if (!identity || !returnTo) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=invalid_response`)
    }

    // Extract Steam ID from OpenID identity URL
    // Format: https://steamcommunity.com/openid/id/76561198012345678
    const steamIdMatch = identity.match(/\/id\/(\d+)$/)
    if (!steamIdMatch) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=invalid_steam_id`)
    }

    const steamId = steamIdMatch[1]

    // Verify the OpenID response (simplified - in production should verify signature)
    // For now, we'll trust Steam's response

    // Store the connection in database
    if (!supabase) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=server_error`)
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('service', 'steam')
      .single()

    if (existing) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('user_integrations')
        .update({
          external_id: steamId,
          connected_at: new Date().toISOString(),
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
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=insert_failed`)
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


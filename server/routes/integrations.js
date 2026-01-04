import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'
import jwt from 'jsonwebtoken'

const router = express.Router()

// Helper function to parse ISO 8601 duration (PT228H56M33S) to total minutes
function parseISODurationToMinutes(durationString) {
  if (!durationString || typeof durationString !== 'string') return 0
  
  // ISO 8601 duration format: PT228H56M33S (P = period, T = time, H = hours, M = minutes, S = seconds)
  const hoursMatch = durationString.match(/(\d+)H/)
  const minutesMatch = durationString.match(/(\d+)M/)
  const secondsMatch = durationString.match(/(\d+)S/)
  
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0
  const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0
  
  // Convert to total minutes (rounding seconds)
  return Math.floor(hours * 60 + minutes + seconds / 60)
}

// Helper function to map category to platform
function categoryToPlatform(category) {
  if (!category) return null
  switch (category) {
    case 'ps5_native_game':
      return 'PS5'
    case 'ps4_game':
      return 'PS4'
    case 'pspc_game':
      return 'PS3' // PSP/PS3 games
    case 'unknown':
    default:
      return null
  }
}

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
 * POST /api/integrations/steam/sync-complete
 * Mark Steam sync as complete (stores sync status in metadata)
 */
router.post('/steam/sync-complete', authenticateToken, async (req, res) => {
  try {
    const { addedCount, skippedCount } = req.body

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Update Steam integration metadata to mark as synced
    const { data: connection, error: fetchError } = await supabase
      .from('user_integrations')
      .select('id, metadata')
      .eq('user_id', req.userId)
      .eq('service', 'steam')
      .single()

    if (fetchError || !connection) {
      return res.status(404).json({ error: 'Steam account not connected' })
    }

    // Update metadata with sync information
    const metadata = connection.metadata || {}
    metadata.synced = true
    metadata.synced_at = new Date().toISOString()
    if (addedCount !== undefined) metadata.last_sync_added = addedCount
    if (skippedCount !== undefined) metadata.last_sync_skipped = skippedCount

    const { error: updateError } = await supabase
      .from('user_integrations')
      .update({
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    if (updateError) {
      console.error('Error updating sync status:', updateError)
      return res.status(500).json({ error: 'Failed to update sync status' })
    }

    res.json({ message: 'Sync status updated successfully' })
  } catch (error) {
    console.error('Sync complete error:', error)
    res.status(500).json({ error: 'An error occurred' })
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

/**
 * GET /api/integrations/steam/game-details/:appId
 * Fetch detailed information about a specific game from Steam
 */
router.get('/steam/game-details/:appId', authenticateToken, async (req, res) => {
  try {
    const { appId } = req.params

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

    // Import the Steam API functions
    const { getPlayerAchievements, getPlayerStats } = await import('../services/steamApi.js')
    const { getGameDetails } = await import('../services/steamApi.js')

    // Fetch all available data in parallel
    const [gameDetails, achievements, playerStats] = await Promise.all([
      getGameDetails([appId]).catch(() => ({ games: {} })),
      getPlayerAchievements(steamId, appId, STEAM_API_KEY).catch(() => null),
      getPlayerStats(steamId, appId, STEAM_API_KEY).catch(() => null)
    ])

    const gameData = gameDetails.games?.[appId] || null

    res.json({
      appId,
      gameDetails: gameData,
      achievements,
      playerStats
    })
  } catch (error) {
    console.error('Get Steam game details error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * POST /api/integrations/psn/auth
 * Authenticate with PSN using NPSSO token
 * User provides NPSSO token, we exchange it for access/refresh tokens
 */
router.post('/psn/auth', authenticateToken, async (req, res) => {
  try {
    const { npsso } = req.body

    if (!npsso || typeof npsso !== 'string') {
      return res.status(400).json({ error: 'NPSSO token is required' })
    }

    // Store SSO in session for future use
    if (!req.session) {
      req.session = {}
    }
    req.session.psn_npsso = npsso

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    try {
      // Import psn-api
      const psnApi = await import('psn-api')

      // Exchange NPSSO for authorization code
      const accessCode = await psnApi.exchangeNpssoForCode(npsso)
      console.log('PSN code exchange response (accessCode):', typeof accessCode, accessCode?.substring?.(0, 20) || accessCode)
      
      if (!accessCode || typeof accessCode !== 'string') {
        throw new Error('Failed to get access code from NPSSO exchange')
      }

      // Exchange authorization code for access token
      // Use exchangeAccessCodeForAuthTokens which returns the full token object
      const tokenResponse = await psnApi.exchangeAccessCodeForAuthTokens(accessCode)
      console.log('PSN token response:', tokenResponse)
      console.log('PSN token response type:', typeof tokenResponse)
      console.log('PSN token response keys:', tokenResponse ? Object.keys(tokenResponse) : 'null/undefined')
      
      if (!tokenResponse) {
        throw new Error('Token response is null or undefined')
      }
      
      // Handle different response structures - psn-api might return the tokens directly or in a nested structure
      let accessToken, refreshToken, expiresIn, tokenType, scope
      
      if (tokenResponse.accessToken) {
        // Direct structure
        ({ accessToken, refreshToken, expiresIn, tokenType, scope } = tokenResponse)
      } else if (tokenResponse.access_token) {
        // Snake_case structure
        accessToken = tokenResponse.access_token
        refreshToken = tokenResponse.refresh_token
        expiresIn = tokenResponse.expires_in
        tokenType = tokenResponse.token_type
        scope = tokenResponse.scope
      } else {
        // Try to get from nested structure or use the response directly
        accessToken = tokenResponse.accessToken || tokenResponse.access_token || tokenResponse.accessTokenValue
        refreshToken = tokenResponse.refreshToken || tokenResponse.refresh_token
        expiresIn = tokenResponse.expiresIn || tokenResponse.expires_in
        tokenType = tokenResponse.tokenType || tokenResponse.token_type || 'Bearer'
        scope = tokenResponse.scope
      }
      
      if (!accessToken) {
        console.error('Token response structure:', JSON.stringify(tokenResponse, null, 2))
        throw new Error('Failed to get access token from PSN API response. Response structure may have changed.')
      }
      
      console.log('Successfully extracted access token')
      console.log('Access token length:', accessToken.length)
      console.log('Access token preview:', accessToken.substring(0, 20) + '...')
      
      // Verify token is a string
      if (typeof accessToken !== 'string') {
        console.error('Access token is not a string:', typeof accessToken, accessToken)
        throw new Error('Access token must be a string')
      }

      // Skip trying to get account ID during auth - we'll get it during library sync
      // This avoids potential token issues during initial connection
      let accountId = 'connected' // Placeholder, will be updated during sync

      // Check if PSN connection already exists
      const { data: existing, error: checkError } = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', req.userId)
        .eq('service', 'psn')
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing connection:', checkError)
        return res.status(500).json({ error: 'Failed to check existing connection' })
      }

      // Store tokens and account ID in metadata
      const metadata = {
        accessToken,
        refreshToken,
        expiresIn,
        tokenType,
        scope,
        accountId,
        connectedAt: new Date().toISOString()
      }

      if (existing) {
        // Update existing connection
        const { error: updateError } = await supabase
          .from('user_integrations')
          .update({
            external_id: accountId,
            metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('Error updating PSN connection:', updateError)
          return res.status(500).json({ error: 'Failed to update PSN connection' })
        }
      } else {
        // Create new connection
        const { error: insertError } = await supabase
          .from('user_integrations')
          .insert([
            {
              user_id: req.userId,
              service: 'psn',
              external_id: accountId,
              connected_at: new Date().toISOString(),
              metadata
            }
          ])

        if (insertError) {
          console.error('Error creating PSN connection:', insertError)
          if (insertError.code === '42501') {
            console.error('⚠️ RLS Error: Backend is using ANON_KEY instead of SERVICE_ROLE_KEY')
            console.error('⚠️ Please add SUPABASE_SERVICE_ROLE_KEY to your .env file and restart the server')
            return res.status(500).json({ 
              error: 'Server configuration error: Please contact support',
              hint: 'RLS policy violation - service role key required'
            })
          }
          return res.status(500).json({ error: 'Failed to create PSN connection' })
        }
      }

      res.json({
        success: true,
        accountId,
        message: 'PSN account connected successfully'
      })
    } catch (authError) {
      console.error('PSN authentication error:', authError)
      return res.status(401).json({ 
        error: 'Failed to authenticate with PSN',
        message: authError.message || 'Invalid NPSSO token'
      })
    }
  } catch (error) {
    console.error('PSN auth error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * GET /api/integrations/psn/sso
 * Get SSO cookie from Sony's API (proxied through backend to avoid CORS)
 * Note: The frontend should send any Sony cookies it has in the request
 */
router.get('/psn/sso', authenticateToken, async (req, res) => {
  try {
    // Build headers for the proxy request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.playstation.com/',
      'Origin': 'https://www.playstation.com'
    }

    // If cookies were passed from the frontend (they would need to be in a custom header or body)
    // For now, we'll try without cookies since the backend can't access browser cookies
    // The user will need to be redirected to sign in if not authenticated
    
    // Proxy request to Sony's SSO cookie API
    const ssoResponse = await fetch('https://ca.account.sony.com/api/v1/ssocookie', {
      method: 'GET',
      headers: headers,
      // Don't send cookies from our server - they don't exist here
      // The user's browser cookies are needed, which requires the frontend to handle this differently
    })

    // Read response body as text first (can only read once)
    const responseText = await ssoResponse.text()
    
    let ssoData
    try {
      ssoData = JSON.parse(responseText)
    } catch (jsonError) {
      // If response is not JSON, return error
      console.error('SSO response is not JSON:', responseText)
      console.error('Response status:', ssoResponse.status)
      console.error('Response headers:', Object.fromEntries(ssoResponse.headers.entries()))
      return res.json({
        error: 'not_authenticated',
        signInUrl: 'https://my.account.sony.com/sonyacct/signin/?duid=0000000700090100f7127bb8197355c45b20fd5729dc69b4a274472e2b75a03161fb69b1e737a412&response_type=code&client_id=e4a62faf-4b87-4fea-8565-caaabb3ac918&scope=web%3Acore&access_type=offline&state=0b077add6945e8fa9d12ed97ad93b6c20e5c2f46d90c246f7685a2d6e5a05345&service_entity=urn%3Aservice-entity%3Apsn&ui=pr&smcid=web%3Apdc&redirect_uri=https%3A%2F%2Fweb.np.playstation.com%2Fapi%2Fsession%2Fv1%2Fsession%3Fredirect_uri%3Dhttps%253A%252F%252Fio.playstation.com%252Fcentral%252Fauth%252Flogin%253Flocale%253Den_CA%2526postSignInURL%253Dhttps%25253A%25252F%25252Fwww.playstation.com%25252Fen-ca%25252F%2526cancelURL%253Dhttps%25253A%25252F%25252Fwww.playstation.com%25252Fen-ca%25252F%26x-psn-app-ver%3D%2540sie-ppr-web-session%252Fsession%252Fv5.44.0&auth_ver=v3&error=login_required&error_code=4165&error_description=User+is+not+authenticated&no_captcha=true&cid=44d3bbb8-f54f-4d33-8b28-ceb4ed6e76a0#/signin/input/id'
      })
    }

    // Check if user needs to authenticate
    if (ssoData.error === 'invalid_grant' || ssoResponse.status === 401 || (!ssoData.npsso && !ssoData.cookie)) {
      // User is not authenticated, return sign-in URL
      return res.json({
        error: 'not_authenticated',
        signInUrl: 'https://my.account.sony.com/sonyacct/signin/?duid=0000000700090100f7127bb8197355c45b20fd5729dc69b4a274472e2b75a03161fb69b1e737a412&response_type=code&client_id=e4a62faf-4b87-4fea-8565-caaabb3ac918&scope=web%3Acore&access_type=offline&state=0b077add6945e8fa9d12ed97ad93b6c20e5c2f46d90c246f7685a2d6e5a05345&service_entity=urn%3Aservice-entity%3Apsn&ui=pr&smcid=web%3Apdc&redirect_uri=https%3A%2F%2Fweb.np.playstation.com%2Fapi%2Fsession%2Fv1%2Fsession%3Fredirect_uri%3Dhttps%253A%252F%252Fio.playstation.com%252Fcentral%252Fauth%252Flogin%253Flocale%253Den_CA%2526postSignInURL%253Dhttps%25253A%25252F%25252Fwww.playstation.com%25252Fen-ca%25252F%2526cancelURL%253Dhttps%25253A%25252F%25252Fwww.playstation.com%25252Fen-ca%25252F%26x-psn-app-ver%3D%2540sie-ppr-web-session%252Fsession%252Fv5.44.0&auth_ver=v3&error=login_required&error_code=4165&error_description=User+is+not+authenticated&no_captcha=true&cid=44d3bbb8-f54f-4d33-8b28-ceb4ed6e76a0#/signin/input/id'
      })
    }

    // Return the SSO cookie
    res.json({
      npsso: ssoData.npsso || ssoData.cookie
    })
  } catch (error) {
    console.error('Error fetching SSO cookie:', error)
    res.status(500).json({ 
      error: 'Failed to fetch SSO cookie',
      message: error.message,
      signInUrl: 'https://my.account.sony.com/sonyacct/signin/?duid=0000000700090100f7127bb8197355c45b20fd5729dc69b4a274472e2b75a03161fb69b1e737a412&response_type=code&client_id=e4a62faf-4b87-4fea-8565-caaabb3ac918&scope=web%3Acore&access_type=offline&state=0b077add6945e8fa9d12ed97ad93b6c20e5c2f46d90c246f7685a2d6e5a05345&service_entity=urn%3Aservice-entity%3Apsn&ui=pr&smcid=web%3Apdc&redirect_uri=https%3A%2F%2Fweb.np.playstation.com%2Fapi%2Fsession%2Fv1%2Fsession%3Fredirect_uri%3Dhttps%253A%252F%252Fio.playstation.com%252Fcentral%252Fauth%252Flogin%253Flocale%253Den_CA%2526postSignInURL%253Dhttps%25253A%25252F%25252Fwww.playstation.com%25252Fen-ca%25252F%2526cancelURL%253Dhttps%25253A%25252F%25252Fwww.playstation.com%25252Fen-ca%25252F%26x-psn-app-ver%3D%2540sie-ppr-web-session%252Fsession%252Fv5.44.0&auth_ver=v3&error=login_required&error_code=4165&error_description=User+is+not+authenticated&no_captcha=true&cid=44d3bbb8-f54f-4d33-8b28-ceb4ed6e76a0#/signin/input/id'
    })
  }
})

/**
 * GET /api/integrations/psn/library
 * Fetch user's PSN library (purchased/played games)
 */
router.get('/psn/library', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching PSN library - this may take a while for large libraries...')
    
    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Get user's PSN connection
    const { data: connection, error: connectionError } = await supabase
      .from('user_integrations')
      .select('external_id, metadata')
      .eq('user_id', req.userId)
      .eq('service', 'psn')
      .single()

    if (connectionError || !connection) {
      return res.status(404).json({ error: 'PSN account not connected' })
    }

    const metadata = connection.metadata || {}
    let accessToken = metadata.accessToken
    
    console.log('Retrieved access token from metadata:', {
      hasToken: !!accessToken,
      tokenType: typeof accessToken,
      tokenLength: accessToken ? accessToken.length : 0,
      tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : null,
      expiresAt: metadata.expiresAt,
      isExpired: metadata.expiresAt ? new Date(metadata.expiresAt) < new Date() : 'unknown'
    })

    // Check if token is expired and refresh if needed
    if (!accessToken || (metadata.expiresAt && new Date(metadata.expiresAt) < new Date())) {
      // Token expired, need to refresh
      if (!metadata.refreshToken) {
        return res.status(401).json({ error: 'PSN token expired and refresh token unavailable' })
      }

      try {
        const psnApi = await import('psn-api')
        const tokenResponse = await psnApi.exchangeRefreshTokenForAuthTokens(metadata.refreshToken)
        
        console.log('Refresh token response:', {
          hasAccessToken: !!tokenResponse.accessToken,
          hasAccess_token: !!tokenResponse.access_token,
          responseKeys: Object.keys(tokenResponse || {})
        })
        
        // Handle different response structures
        const newAccessToken = tokenResponse.accessToken || tokenResponse.access_token
        const newRefreshToken = tokenResponse.refreshToken || tokenResponse.refresh_token || metadata.refreshToken
        const expiresIn = tokenResponse.expiresIn || tokenResponse.expires_in
        
        if (!newAccessToken) {
          console.error('Failed to get access token from refresh response:', tokenResponse)
          throw new Error('Failed to refresh access token')
        }

        // Update stored tokens
        const newMetadata = {
          ...metadata,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || metadata.refreshToken,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        }

        const { error: updateError } = await supabase
          .from('user_integrations')
          .update({ metadata: newMetadata })
          .eq('id', connection.id)

        if (updateError) {
          console.error('Error updating PSN tokens:', updateError)
        }

        accessToken = newAccessToken
      } catch (refreshError) {
        console.error('Error refreshing PSN token:', refreshError)
        return res.status(401).json({ error: 'Failed to refresh PSN token. Please reconnect your account.' })
      }
    }

    try {
      // Get user's played games using getUserPlayedGames
      const psnApi = await import('psn-api')
      
      let playedGames = []
      let accountId = connection.external_id
      
      // If we don't have a real accountId, try to get it from the profile
      if (!accountId || accountId === 'connected' || accountId === 'pending') {
        try {
          console.log('Getting account ID from profile...')
          // Try to get profile using 'me' or try to get it from getUserTrophyProfileSummary
          const profileSummary = await psnApi.getUserTrophyProfileSummary({ accessToken }, 'me')
          if (profileSummary?.accountId) {
            accountId = profileSummary.accountId
            console.log('Found account ID:', accountId)
          }
        } catch (profileError) {
          console.error('Error getting account ID, trying with "me":', profileError.message)
          // Fall back to using 'me' as accountId
          accountId = 'me'
        }
      }
      
      try {
        console.log('Fetching user played games with getUserPlayedGames, access token and accountId:', accountId)
        
        // Fetch all games with pagination using getUserPlayedGames (provides playtime, dates, platform)
        const allFetchedGames = [] // Aggregate ALL games from ALL API calls
        const gamesByName = new Map() // Map to merge games with same name but different platforms
        let offset = 0
        const limit = 200 // getUserPlayedGames typically uses smaller limit
        let hasMore = true
        let totalItemCount = 0
        
        // Debug limit: if DEBUG_PSN_SYNC_LIMIT is set, only fetch that many games
        const DEBUG_PSN_SYNC_LIMIT = process.env.DEBUG_PSN_SYNC_LIMIT ? parseInt(process.env.DEBUG_PSN_SYNC_LIMIT, 10) : null
        if (DEBUG_PSN_SYNC_LIMIT && DEBUG_PSN_SYNC_LIMIT > 0) {
          console.log(`⚠️ DEBUG MODE: PSN sync limited to first ${DEBUG_PSN_SYNC_LIMIT} games`)
        }
        
        // Rate limiting: 500 requests/min (120ms between) OR 2000 requests/10min (300ms between)
        // Use the more restrictive: 300ms delay to stay under 2000/10min limit
        const MIN_DELAY_MS = 300
        let requestCount = 0
        
        while (hasMore) {
          // Add delay between requests to avoid 429 errors
          if (requestCount > 0) {
            await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS))
          }
          
          let gamesResponse
          try {
            requestCount++
            console.log(`Attempting getUserPlayedGames API call #${requestCount} with offset=${offset}, limit=${limit}`)
            gamesResponse = await psnApi.getUserPlayedGames({ accessToken }, accountId, { limit, offset })
          } catch (err) {
            // Check if it's a rate limit error
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('rate limit')) {
              console.log(`Rate limit hit (429), waiting 5 seconds before retry...`)
              await new Promise(resolve => setTimeout(resolve, 5000))
              // Retry the request
              try {
                gamesResponse = await psnApi.getUserPlayedGames({ accessToken }, accountId, { limit, offset })
              } catch (retryErr) {
                console.log(`getUserPlayedGames retry failed:`, retryErr.message)
                throw retryErr
              }
            } else {
              console.log(`getUserPlayedGames failed:`, err.message)
              throw err
            }
          }
          
          console.log(`Fetched page at offset ${offset}, response keys:`, gamesResponse ? Object.keys(gamesResponse) : 'null/undefined')
          
          // Extract titles array from the response object
          if (gamesResponse?.titles && Array.isArray(gamesResponse.titles)) {
            const titlesInThisPage = gamesResponse.titles.length
            
            // Log first title structure to see available fields
            if (titlesInThisPage > 0 && requestCount === 1) {
              console.log('Sample title object keys:', Object.keys(gamesResponse.titles[0]))
              console.log('Sample title object:', JSON.stringify(gamesResponse.titles[0], null, 2).substring(0, 1500))
            }
            
            // Check for Path of Exile in this page
            const pathOfExileTitle = gamesResponse.titles.find(title => 
              title.name && title.name.toLowerCase().includes('path of exile')
            )
            if (pathOfExileTitle) {
              console.log(`🎮 FOUND Path of Exile in page at offset ${offset}:`, JSON.stringify(pathOfExileTitle, null, 2))
            }
            
            // Map titles to expected format
            gamesResponse.titles.forEach(title => {
              const gameName = title.name || 'Unknown Game'
              const gameNameLower = gameName.toLowerCase()
              
              // Filter out streaming services and apps
              const streamingServices = [
                'netflix', 'youtube', 'crunchyroll', 'ign', 'prime', 'disney', 'twitch', 
                'lecteur multimedia', 'live events viewer', 'hulu', 'amazon prime', 
                'hbo', 'max', 'paramount', 'peacock', 'apple tv', 'spotify', 
                'playstation store', 'playstation video', 'playstation music'
              ]
              
              // Skip if it's a streaming service
              if (streamingServices.some(service => gameNameLower.includes(service))) {
                return // Skip this game
              }
              
              const platform = categoryToPlatform(title.category)
              
              // Parse playDuration from ISO 8601 format (PT228H56M33S)
              const playDurationMinutes = parseISODurationToMinutes(title.playDuration)
              
              // Parse dates
              let firstPlayedDate = null
              if (title.firstPlayedDateTime) {
                try {
                  const date = new Date(title.firstPlayedDateTime)
                  if (!isNaN(date.getTime())) {
                    firstPlayedDate = date.toISOString().split('T')[0] // YYYY-MM-DD format for date_started
                  }
                } catch (e) {
                  // Invalid date, skip
                }
              }
              
              let lastPlayedDate = null
              if (title.lastPlayedDateTime) {
                try {
                  const date = new Date(title.lastPlayedDateTime)
                  const now = new Date()
                  const fiveYearsAgo = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
                  if (!isNaN(date.getTime()) && date <= now && date >= fiveYearsAgo) {
                    lastPlayedDate = date.toISOString()
                  }
                } catch (e) {
                  // Invalid date, skip
                }
              }
              
              const gameData = {
                name: gameName,
                id: title.titleId || title.concept?.id?.toString() || null, // Use titleId or concept.id
                imageUrl: title.imageUrl || title.localizedImageUrl || '',
                publisher: 'Unknown Publisher', // getUserPlayedGames doesn't provide publisher
                releaseDate: '', // getUserPlayedGames doesn't provide release date
                lastPlayedDate: lastPlayedDate,
                firstPlayedDate: firstPlayedDate,
                playDuration: playDurationMinutes,
                platform: platform,
                category: title.category,
                titleId: title.titleId
              }
              
              allFetchedGames.push(gameData)
              
              // Merge games with same name but different platforms
              if (gamesByName.has(gameNameLower)) {
                const existing = gamesByName.get(gameNameLower)
                // Merge platforms - if different platforms, combine them
                if (platform && existing.platforms && !existing.platforms.includes(platform)) {
                  existing.platforms.push(platform)
                } else if (platform && !existing.platforms) {
                  existing.platforms = [existing.platform, platform].filter(Boolean)
                }
                // Use the most recent last played date
                if (lastPlayedDate && (!existing.lastPlayedDate || lastPlayedDate > existing.lastPlayedDate)) {
                  existing.lastPlayedDate = lastPlayedDate
                }
                // Use the earliest first played date
                if (firstPlayedDate && (!existing.firstPlayedDate || firstPlayedDate < existing.firstPlayedDate)) {
                  existing.firstPlayedDate = firstPlayedDate
                }
                // Sum play durations
                existing.playDuration = (existing.playDuration || 0) + playDurationMinutes
                // Use best image (prefer non-localized)
                if (title.imageUrl && !existing.imageUrl) {
                  existing.imageUrl = title.imageUrl
                }
              } else {
                gamesByName.set(gameNameLower, {
                  ...gameData,
                  platforms: platform ? [platform] : [],
                  platform: platform // Keep for backward compatibility
                })
              }
            })
            
            // Update totalItemCount from response if available
            if (gamesResponse.totalItemCount !== undefined && gamesResponse.totalItemCount !== null) {
              totalItemCount = gamesResponse.totalItemCount
            } else {
              totalItemCount = Math.max(totalItemCount, gamesByName.size)
            }
            
            const uniqueGamesSoFar = gamesByName.size
            console.log(`Fetched page at offset ${offset}: ${titlesInThisPage} titles, ${uniqueGamesSoFar} unique games so far${totalItemCount > 0 ? `/${totalItemCount}` : ''}`)
            
            // Early exit if debug limit is reached
            if (DEBUG_PSN_SYNC_LIMIT && DEBUG_PSN_SYNC_LIMIT > 0 && uniqueGamesSoFar >= DEBUG_PSN_SYNC_LIMIT) {
              hasMore = false
              console.log(`⚠️ DEBUG MODE: Reached debug limit of ${DEBUG_PSN_SYNC_LIMIT} games. Stopping pagination.`)
            }
            
            // Check if there are more pages
            if (titlesInThisPage > 0) {
              if (totalItemCount > 0 && uniqueGamesSoFar < totalItemCount) {
                const nextOffsetFromAPI = gamesResponse.nextOffset
                const currentOffset = offset
                
                if (nextOffsetFromAPI !== undefined && nextOffsetFromAPI !== null && nextOffsetFromAPI !== currentOffset && nextOffsetFromAPI > currentOffset) {
                  offset = nextOffsetFromAPI
                  hasMore = true
                  console.log(`Has more pages. Using API nextOffset: ${offset} (was ${currentOffset}, unique games: ${uniqueGamesSoFar}/${totalItemCount})`)
                } else {
                  const newOffset = currentOffset + titlesInThisPage
                  if (newOffset < totalItemCount && newOffset > currentOffset) {
                    offset = newOffset
                    hasMore = true
                    console.log(`nextOffset invalid/same (${nextOffsetFromAPI}), incrementing manually. New offset: ${offset} (was ${currentOffset}, unique games: ${uniqueGamesSoFar}/${totalItemCount})`)
                  } else {
                    hasMore = false
                    console.log(`No more pages (offset: ${offset}, total: ${totalItemCount}, unique: ${uniqueGamesSoFar})`)
                  }
                }
              } else if (titlesInThisPage < limit) {
                // If we got fewer titles than the limit, we're done
                hasMore = false
                console.log(`Got fewer titles (${titlesInThisPage}) than limit (${limit}), stopping pagination`)
              } else {
                // Continue pagination
                const newOffset = offset + titlesInThisPage
                offset = newOffset
                hasMore = true
              }
            } else {
              hasMore = false
              console.log(`No titles in page, stopping pagination`)
            }
            
            // Safety check: stop when we have all unique games or made too many requests
            if (totalItemCount > 0 && uniqueGamesSoFar >= totalItemCount) {
              hasMore = false
              console.log(`Reached total item count (${totalItemCount}). Stopping pagination.`)
            }
            
            // Additional safety check: if we've made many requests, stop
            const MAX_REQUESTS = 1800 // Stay under 2000/10min limit
            if (requestCount >= MAX_REQUESTS) {
              hasMore = false
              console.log(`Reached safety limit of ${MAX_REQUESTS} requests (under 2000/10min limit). Stopping pagination.`)
            }
          } else {
            console.log('Unexpected response structure:', JSON.stringify(gamesResponse, null, 2).substring(0, 500))
            hasMore = false
          }
        }
        
        // Convert Map to array, merging platforms into a single platform string
        playedGames = Array.from(gamesByName.values()).map(game => ({
          ...game,
          platform: game.platforms && game.platforms.length > 0 ? game.platforms.join(', ') : game.platform || null,
          platforms: game.platforms // Keep platforms array for reference
        }))
        
        console.log(`Successfully fetched ${playedGames.length} played games (totalItemCount: ${totalItemCount})`)
        
        // Apply debug limit if DEBUG_PSN_SYNC_LIMIT is set (final safety check in case early exit didn't trigger)
        if (DEBUG_PSN_SYNC_LIMIT && DEBUG_PSN_SYNC_LIMIT > 0 && playedGames.length > DEBUG_PSN_SYNC_LIMIT) {
          const originalCount = playedGames.length
          playedGames = playedGames.slice(0, DEBUG_PSN_SYNC_LIMIT)
          console.log(`⚠️ DEBUG MODE: Limited PSN sync to first ${DEBUG_PSN_SYNC_LIMIT} games (out of ${originalCount} total games)`)
        }
        
        // Games will be enriched one by one in the frontend before being added to the library
      } catch (gamesError) {
        console.error('Error fetching user played games:', gamesError)
        throw gamesError
      }

      res.json({
        games: playedGames || [],
        purchasedGames: [], // Removed purchased games fetch - only using getUserPlayedGames
        game_count: playedGames?.length || 0
      })
    } catch (libraryError) {
      console.error('Error fetching PSN library:', libraryError)
      return res.status(500).json({ 
        error: 'Failed to fetch PSN library',
        message: libraryError.message 
      })
    }
  } catch (error) {
    console.error('Get PSN library error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * POST /api/integrations/psn/sync-complete
 * Mark PSN sync as complete (stores sync status in metadata)
 */
router.post('/psn/sync-complete', authenticateToken, async (req, res) => {
  try {
    const { addedCount, skippedCount } = req.body

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Update PSN integration metadata to mark as synced
    const { data: connection, error: fetchError } = await supabase
      .from('user_integrations')
      .select('id, metadata')
      .eq('user_id', req.userId)
      .eq('service', 'psn')
      .single()

    if (fetchError || !connection) {
      return res.status(404).json({ error: 'PSN account not connected' })
    }

    // Update metadata with sync information
    const metadata = connection.metadata || {}
    metadata.synced = true
    metadata.synced_at = new Date().toISOString()
    metadata.last_sync_added = addedCount || 0
    metadata.last_sync_skipped = skippedCount || 0

    const { error: updateError } = await supabase
      .from('user_integrations')
      .update({ metadata })
      .eq('id', connection.id)

    if (updateError) {
      console.error('Error updating PSN sync status:', updateError)
      return res.status(500).json({ error: 'Failed to update sync status' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('PSN sync-complete error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

export { router as integrationsRouter }


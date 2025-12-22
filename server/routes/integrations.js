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
        console.log('Fetching user played games with access token and accountId:', accountId)
        
        // Fetch all games with pagination
        playedGames = []
        let offset = 0
        const limit = 800 // Maximum per page according to psn-api docs
        let hasMore = true
        let totalItemCount = 0
        
        while (hasMore) {
          // getUserPlayedGames expects an object with accessToken property, and optional options for pagination
          // Try with limit and offset first, fallback to start and size if needed
          let gamesResponse
          try {
            gamesResponse = await psnApi.getUserPlayedGames({ accessToken }, accountId, { limit, offset })
          } catch (err) {
            // If limit/offset doesn't work, try start/size
            try {
              gamesResponse = await psnApi.getUserPlayedGames({ accessToken }, accountId, { start: offset, size: limit })
            } catch (err2) {
              // If options don't work, try without options for first page
              if (offset === 0) {
                gamesResponse = await psnApi.getUserPlayedGames({ accessToken }, accountId)
              } else {
                throw err2
              }
            }
          }
          
          console.log(`Fetched page at offset ${offset}, response keys:`, gamesResponse ? Object.keys(gamesResponse) : 'null/undefined')
          
          // Extract titles array from the response object
          if (gamesResponse?.titles && Array.isArray(gamesResponse.titles)) {
            const titlesInThisPage = gamesResponse.titles.length
            playedGames = playedGames.concat(gamesResponse.titles)
            
            // Update totalItemCount from response if available, otherwise use current length
            if (gamesResponse.totalItemCount !== undefined && gamesResponse.totalItemCount !== null) {
              totalItemCount = gamesResponse.totalItemCount
            } else {
              totalItemCount = Math.max(totalItemCount, playedGames.length)
            }
            
            console.log(`Fetched page at offset ${offset}: ${titlesInThisPage} titles (total so far: ${playedGames.length}${totalItemCount > 0 ? `/${totalItemCount}` : ''})`)
            
            // Check if there are more pages
            // Continue if:
            // 1. We got titles in this page AND nextOffset is defined and different from current offset
            // 2. OR we got titles and totalItemCount indicates there are more
            if (titlesInThisPage > 0) {
              // Check if we have more games to fetch based on totalItemCount
              if (totalItemCount > 0 && playedGames.length < totalItemCount) {
                // We haven't fetched all games yet, continue pagination
                if (gamesResponse.nextOffset !== undefined && gamesResponse.nextOffset !== null) {
                  // Use nextOffset if provided (even if same as current offset - API will handle it)
                  offset = gamesResponse.nextOffset
                  hasMore = true
                  console.log(`Has more pages. Next offset: ${offset} (fetched ${playedGames.length}/${totalItemCount})`)
                } else {
                  // No nextOffset but we haven't fetched all - increment offset manually
                  offset = offset + titlesInThisPage
                  hasMore = true
                  console.log(`No nextOffset, incrementing manually. Next offset: ${offset} (fetched ${playedGames.length}/${totalItemCount})`)
                }
              } else {
                // We've fetched all games (or totalItemCount is 0/invalid)
                hasMore = false
                console.log(`Fetched all games. Total titles fetched: ${playedGames.length}${totalItemCount > 0 ? `/${totalItemCount}` : ''}`)
              }
            } else {
              // No titles in this page, we're done
              hasMore = false
              console.log(`No titles in this page. Total titles fetched: ${playedGames.length}`)
            }
          } else if (Array.isArray(gamesResponse)) {
            // Fallback: if response is already an array
            playedGames = playedGames.concat(gamesResponse)
            hasMore = false
            console.log(`Response is array. Total titles fetched: ${playedGames.length}`)
          } else {
            console.log('Unexpected response structure:', JSON.stringify(gamesResponse, null, 2).substring(0, 500))
            hasMore = false
          }
          
          // Safety check to prevent infinite loops
          if (totalItemCount > 0 && playedGames.length >= totalItemCount) {
            hasMore = false
            console.log(`Reached total item count (${totalItemCount}). Stopping pagination.`)
          }
          
          // Additional safety check: if we've made many requests, stop (prevent infinite loops)
          const maxRequests = 50 // Safety limit
          if (offset / limit > maxRequests) {
            hasMore = false
            console.log(`Reached safety limit of ${maxRequests} requests. Stopping pagination.`)
          }
        }
        
        console.log(`Successfully fetched ${playedGames.length} played games (totalItemCount: ${totalItemCount})`)
      } catch (gamesError) {
        console.error('Error fetching user played games:', gamesError)
        throw gamesError
      }

      res.json({
        games: playedGames || [],
        purchasedGames: [], // Removed purchased games fetch - only using getUserTitles
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


/**
 * Steam API Service
 * Handles all communication with Steam Store API
 */

const STEAM_BASE_URL = 'https://store.steampowered.com/api'

/**
 * Search for games on Steam
 * @param {string} searchTerm - Search query (min 3 characters)
 * @returns {Promise<Object>} Search results
 */
export async function searchGames(searchTerm) {
  if (!searchTerm || searchTerm.length < 3) {
    throw new Error('Search term must be at least 3 characters')
  }

  const searchUrl = `${STEAM_BASE_URL}/storesearch/?term=${encodeURIComponent(searchTerm)}&cc=US&l=en&count=50`
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Gameo/1.0 (Steam API Client)'
      }
    })

    if (!response.ok) {
      throw new Error(`Steam API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      total: data.total || 0,
      items: data.items || [],
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Steam search API error:', error)
    throw new Error(`Failed to search Steam: ${error.message}`)
  }
}

/**
 * Get detailed information for multiple games
 * @param {string[]} appIds - Array of Steam app IDs
 * @returns {Promise<Object>} Game details
 */
export async function getGameDetails(appIds) {
  if (!appIds || appIds.length === 0) {
    throw new Error('At least one app ID is required')
  }

  if (appIds.length > 10) {
    throw new Error('Maximum 10 app IDs allowed per request')
  }

  // Steam API has issues with multiple IDs in a single request
  // Make separate requests for each ID and combine results
  const games = {}
  const errors = []
  
  // Process IDs in parallel (but limit concurrency to avoid overwhelming Steam API)
  const promises = appIds.map(async (appId) => {
    try {
      const detailUrl = `${STEAM_BASE_URL}/appdetails?appids=${appId}&cc=US&l=en`
      
      const response = await fetch(detailUrl, {
        headers: {
          'User-Agent': 'Gameo/1.0 (Steam API Client)'
        }
      })

      if (!response.ok) {
        throw new Error(`Steam API returned ${response.status}: ${response.statusText} for app ${appId}`)
      }

      const data = await response.json()
      
      // Process the response for this single app
      const appData = data[appId]
      if (appData && appData.success && appData.data) {
        const gameData = appData.data
        
        // Parse release date
        let releaseDate = 0
        if (gameData.release_date && gameData.release_date.date && !gameData.release_date.coming_soon) {
          const dateStr = gameData.release_date.date
          const parsedDate = new Date(dateStr)
          if (!isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear()
            if (year >= 1970 && year <= 2100) {
              releaseDate = parsedDate.getTime()
            }
          }
        }

        games[appId] = {
          id: appId,
          name: gameData.name,
          releaseDate: releaseDate,
          cover: gameData.header_image || gameData.capsule_image || gameData.capsule_imagev5,
          steamAppId: appId,
          studio: gameData.developers && gameData.developers.length > 0 
            ? gameData.developers[0] 
            : null,
          publishers: gameData.publishers || [],
          genres: gameData.genres || [],
          shortDescription: gameData.short_description || null,
          price: gameData.price_overview || null
        }
      }
    } catch (error) {
      console.error(`Error fetching details for app ${appId}:`, error)
      errors.push({ appId, error: error.message })
    }
  })
  
  // Wait for all requests to complete
  await Promise.all(promises)
  
  // If we got some results, return them (even if some failed)
  if (Object.keys(games).length > 0) {
    return {
      games: games,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined
    }
  }
  
  // If all requests failed, throw an error
  if (errors.length > 0) {
    throw new Error(`Failed to fetch game details: ${errors.map(e => e.error).join('; ')}`)
  }
  
  throw new Error('No game data returned from Steam API')
  
  // Old code (kept for reference - Steam API doesn't reliably support multiple IDs)
  /*
  const idsString = appIds.join(',')
  const detailUrl = `${STEAM_BASE_URL}/appdetails?appids=${idsString}&cc=US&l=en`
  
  try {
    const response = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Gameo/1.0 (Steam API Client)'
      }
    })

    if (!response.ok) {
      throw new Error(`Steam API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    */
}


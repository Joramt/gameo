/**
 * PSN SearchGame API Service
 * Handles communication with PSN SearchGame API
 * Used to fetch publisher and release date information for games
 * API Documentation: https://olegshulyakov.github.io/psn-swagger/#/Search/SearchGame
 */

const PSN_SEARCH_BASE_URL = 'https://store.playstation.com/store/api/chihiro/00_09_000/tumbler'

/**
 * Sanitize game name for PSN SearchGame API
 * Strips non-alphanumerical characters and spaces (no trademark symbols, accents, underscores, apostrophes, or dashes)
 * @param {string} gameName - Name of the game to sanitize
 * @returns {string} Sanitized game name
 */
function sanitizeGameName(gameName) {
  if (!gameName) return ''
  
  // Remove all non-alphanumeric characters except spaces
  // This removes: trademark symbols, accents, underscores, apostrophes, dashes, etc.
  return gameName
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove all non-alphanumeric except spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
}

/**
 * Search for a game using PSN SearchGame API
 * @param {string} gameName - Name of the game to search for
 * @param {string} country - ISO country code (e.g., 'US', 'GB', 'FR')
 * @param {string} language - ISO language code (e.g., 'en', 'fr', 'es')
 * @param {number} age - User age (5 for <18, 19 for 18+)
 * @returns {Promise<Object>} Game metadata with publisher (studio) and releaseDate
 */
export async function searchPSNGame(gameName, country, language, age) {
  if (!gameName || !country || !language || !age) {
    return { publisher: null, releaseDate: null }
  }

  try {
    // Sanitize game name
    const searchString = sanitizeGameName(gameName)
    
    if (!searchString) {
      return { publisher: null, releaseDate: null }
    }

    // Check cache first (using psnSearchCache from cache.js)
    const { psnSearchCache } = await import('../services/cache.js')
    const cacheKey = `psnsearch:${searchString.toLowerCase().trim()}:${country}:${language}:${age}`
    const cached = psnSearchCache.get(cacheKey)
    if (cached) {
      return cached
    }

    // PSN SearchGame REST API endpoint
    // Based on: https://olegshulyakov.github.io/psn-swagger/#/Search/SearchGame
    // Endpoint: /store/api/chihiro/00_09_000/tumbler/{country}/{language}/{age}/{searchString}
    const encodedSearchString = encodeURIComponent(searchString)
    const searchUrl = `${PSN_SEARCH_BASE_URL}/${country}/${language}/${age}/${encodedSearchString}`

    // Create AbortController for timeout (reduced to 5 seconds for faster failures)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Gameo/1.0 (PSN API Client)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`PSN SearchGame API rate limited for game: ${gameName}`)
      }
      return { publisher: null, releaseDate: null }
    }

    const data = await response.json()
    
    // PSN API response structure
    // The response contains a "links" array with game data
    if (!data || !data.links || !Array.isArray(data.links) || data.links.length === 0) {
      console.warn(`PSN SearchGame API: No links found for game: ${gameName}`)
      return { publisher: null, releaseDate: null }
    }

    // Get the first (best match) result
    const game = data.links[0]
    
    // Debug: Log the game object structure to understand the API response
    if (process.env.NODE_ENV === 'development') {
      console.log(`PSN SearchGame API response for "${gameName}":`, {
        hasProviderName: !!game.provider_name,
        providerName: game.provider_name,
        hasDefaultSku: !!game.default_sku,
        hasNameDefaultSku: !!game.name_default_sku,
        gameKeys: Object.keys(game).slice(0, 20) // First 20 keys
      })
    }
    
    // Extract publisher name from provider_name field (same pattern as release_date extraction)
    // Reference: https://olegshulyakov.github.io/psn-swagger/#/Search/SearchGame
    const publisher = game.provider_name || (game.default_sku && game.default_sku.provider_name) || null

    // Extract release date
    let releaseDate = null
    const releaseDateValue = game.release_date || game.releaseDate || (game.default_sku && game.default_sku.release_date)
    if (releaseDateValue) {
      try {
        const date = new Date(releaseDateValue)
        if (!isNaN(date.getTime())) {
          // Format as "MMM YYYY" (e.g., "Jan 2023")
          releaseDate = date.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          })
        }
      } catch (e) {
        // Invalid date, skip
      }
    }

    const result = {
      publisher: publisher || null,
      releaseDate: releaseDate || null
    }

    // Cache the result for 7 days (even if null, to avoid repeated failed lookups)
    // cacheKey was already declared above, so reuse it
    if (result.publisher || result.releaseDate) {
      psnSearchCache.set(cacheKey, result, 7 * 24 * 60 * 60)
    } else {
      // Cache null results for shorter time (1 hour) to allow retries
      psnSearchCache.set(cacheKey, result, 60 * 60)
    }

    return result
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`PSN SearchGame API timeout for game: ${gameName}`)
    } else {
      console.warn(`PSN SearchGame API error for game ${gameName}:`, error.message)
    }
    return { publisher: null, releaseDate: null }
  }
}


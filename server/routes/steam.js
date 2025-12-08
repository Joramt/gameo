import express from 'express'
import rateLimit from 'express-rate-limit'
import { steamCache } from '../services/cache.js'
import { searchGames, getGameDetails } from '../services/steamApi.js'

const router = express.Router()

// Rate limiting for Steam API endpoints - more restrictive
const steamRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many Steam API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(steamRateLimiter)

/**
 * GET /api/steam/search?q=searchTerm
 * Search for games on Steam
 * Cached for 7 days
 */
router.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.q
    
    if (!searchTerm || searchTerm.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Search term must be at least 3 characters' 
      })
    }

    const trimmedTerm = searchTerm.trim().toLowerCase()
    const cacheKey = `search:${trimmedTerm}`

    // Check cache first
    const cachedResult = steamCache.get(cacheKey)
    if (cachedResult) {
      return res.json({
        ...cachedResult,
        cached: true
      })
    }

    // Fetch from Steam API
    const results = await searchGames(trimmedTerm)
    
    // Cache the results for 7 days
    steamCache.set(cacheKey, results, 7 * 24 * 60 * 60) // 7 days in seconds

    res.json({
      ...results,
      cached: false
    })
  } catch (error) {
    console.error('Steam search error:', error)
    console.error('Error stack:', error.stack)
    console.error('Request query:', req.query)
    
    // Return more detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Failed to search Steam games. Please try again later.'
    
    res.status(500).json({ 
      error: 'Failed to search Steam games',
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    })
  }
})

/**
 * GET /api/steam/games?ids=appId1,appId2,appId3
 * Get detailed information for multiple games
 * Cached for 7 days
 */
router.get('/games', async (req, res) => {
  try {
    const idsParam = req.query.ids
    
    if (!idsParam) {
      return res.status(400).json({ 
        error: 'Game IDs are required (comma-separated)' 
      })
    }

    const appIds = idsParam.split(',').map(id => id.trim()).filter(Boolean)
    
    if (appIds.length === 0 || appIds.length > 10) {
      return res.status(400).json({ 
        error: 'Must provide 1-10 game IDs' 
      })
    }

    const cacheKey = `games:${appIds.sort().join(',')}`

    // Check cache first
    const cachedResult = steamCache.get(cacheKey)
    if (cachedResult) {
      return res.json({
        ...cachedResult,
        cached: true
      })
    }

    // Fetch from Steam API
    const results = await getGameDetails(appIds)
    
    // Cache the results for 7 days
    steamCache.set(cacheKey, results, 7 * 24 * 60 * 60) // 7 days in seconds

    res.json({
      ...results,
      cached: false
    })
  } catch (error) {
    console.error('Steam games error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch game details',
      message: error.message 
    })
  }
})

/**
 * DELETE /api/steam/cache?key=cacheKey
 * Bust cache for a specific key or all cache
 * 
 * Query params:
 * - key: specific cache key to bust (optional)
 * - all: set to 'true' to bust all cache (optional)
 */
router.delete('/cache', (req, res) => {
  try {
    const { key, all } = req.query

    if (all === 'true') {
      // Clear all cache
      steamCache.flushAll()
      return res.json({ 
        message: 'All cache cleared successfully',
        cleared: steamCache.keys().length
      })
    }

    if (key) {
      // Clear specific cache key
      const deleted = steamCache.del(key)
      if (deleted) {
        return res.json({ 
          message: `Cache key "${key}" cleared successfully`,
          key: key
        })
      } else {
        return res.status(404).json({ 
          error: `Cache key "${key}" not found` 
        })
      }
    }

    res.status(400).json({ 
      error: 'Must provide either "key" or "all=true" parameter' 
    })
  } catch (error) {
    console.error('Cache bust error:', error)
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error.message 
    })
  }
})

/**
 * GET /api/steam/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', (req, res) => {
  try {
    const stats = steamCache.getStats()
    const keys = steamCache.keys()
    
    res.json({
      keys: keys.length,
      stats: stats,
      sampleKeys: keys.slice(0, 10) // Show first 10 keys as sample
    })
  } catch (error) {
    console.error('Cache stats error:', error)
    res.status(500).json({ 
      error: 'Failed to get cache stats',
      message: error.message 
    })
  }
})

export { router as steamRouter }


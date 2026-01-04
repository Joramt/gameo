import NodeCache from 'node-cache'

/**
 * Cache configuration:
 * - stdTTL: Default TTL for cached items (7 days in seconds)
 * - checkperiod: How often to check for expired keys (1 hour)
 * - useClones: Clone objects before storing (prevents reference issues)
 */
const cacheConfig = {
  stdTTL: 7 * 24 * 60 * 60, // 7 days in seconds
  checkperiod: 60 * 60, // Check for expired keys every hour
  useClones: true,
  deleteOnExpire: true
}

// Create cache instance
export const steamCache = new NodeCache(cacheConfig)

// Create separate cache for PSN SearchGame API (same config)
export const psnSearchCache = new NodeCache(cacheConfig)

// Log cache events (optional, for debugging)
if (process.env.NODE_ENV === 'development') {
  steamCache.on('set', (key, value) => {
    console.log(`Cache SET: ${key}`)
  })

  steamCache.on('del', (key, value) => {
    console.log(`Cache DEL: ${key}`)
  })

  steamCache.on('expired', (key, value) => {
    console.log(`Cache EXPIRED: ${key}`)
  })
}

/**
 * Get cache statistics
 */
steamCache.getStats = function() {
  return {
    keys: this.keys().length,
    hits: this.getStats().hits || 0,
    misses: this.getStats().misses || 0,
    ksize: this.getStats().ksize || 0,
    vsize: this.getStats().vsize || 0
  }
}


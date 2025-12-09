/**
 * Storage Interface
 * 
 * Abstract storage layer that can be easily swapped between:
 * - SessionStorage (current implementation)
 * - LocalStorage
 * - Database/API (future implementation)
 */

/**
 * Storage Interface - defines the contract for all storage implementations
 */
class StorageInterface {
  /**
   * Get all games for a user
   * @param {string} userId - User identifier
   * @returns {Promise<Array>} Array of game objects
   */
  async getGames(userId) {
    throw new Error('getGames must be implemented')
  }

  /**
   * Add a game to user's library
   * @param {string} userId - User identifier
   * @param {Object} game - Game object to add
   * @returns {Promise<Object>} Added game object
   */
  async addGame(userId, game) {
    throw new Error('addGame must be implemented')
  }

  /**
   * Remove a game from user's library
   * @param {string} userId - User identifier
   * @param {string|number} gameId - Game ID to remove
   * @returns {Promise<boolean>} True if game was removed, false if not found
   */
  async removeGame(userId, gameId) {
    throw new Error('removeGame must be implemented')
  }

  /**
   * Check if a game exists in user's library
   * @param {string} userId - User identifier
   * @param {string|number} gameId - Game ID to check
   * @param {string} steamAppId - Optional Steam App ID to check
   * @returns {Promise<boolean>} True if game exists
   */
  async hasGame(userId, gameId, steamAppId = null) {
    throw new Error('hasGame must be implemented')
  }

  /**
   * Update game information
   * @param {string} userId - User identifier
   * @param {string|number} gameId - Game ID to update
   * @param {Object} updates - Game properties to update
   * @returns {Promise<Object>} Updated game object
   */
  async updateGame(userId, gameId, updates) {
    throw new Error('updateGame must be implemented')
  }
}

/**
 * SessionStorage Implementation
 * Stores data in browser sessionStorage (cleared when tab closes)
 */
class SessionStorageService extends StorageInterface {
  constructor() {
    super()
    this.storageKey = 'gameo_user_games'
  }

  /**
   * Get storage key for a specific user
   */
  getUserKey(userId) {
    return `${this.storageKey}_${userId}`
  }

  /**
   * Get all games for a user
   */
  async getGames(userId) {
    try {
      const key = this.getUserKey(userId)
      const data = sessionStorage.getItem(key)
      
      if (!data) {
        return []
      }

      const games = JSON.parse(data)
      return Array.isArray(games) ? games : []
    } catch (error) {
      console.error('Error reading games from sessionStorage:', error)
      return []
    }
  }

  /**
   * Add a game to user's library
   */
  async addGame(userId, game) {
    try {
      const games = await this.getGames(userId)
      
      // Check if game already exists (by ID or steamAppId)
      const exists = games.some(
        g => g.id === game.id || 
        (g.steamAppId && game.steamAppId && g.steamAppId === game.steamAppId) ||
        (g.name === game.name)
      )

      if (exists) {
        return game // Return existing game if already in library
      }

      // Add game to the beginning of the array (most recent first)
      const updatedGames = [game, ...games]
      const key = this.getUserKey(userId)
      sessionStorage.setItem(key, JSON.stringify(updatedGames))

      return game
    } catch (error) {
      console.error('Error adding game to sessionStorage:', error)
      throw error
    }
  }

  /**
   * Remove a game from user's library
   */
  async removeGame(userId, gameId) {
    try {
      const games = await this.getGames(userId)
      const initialLength = games.length
      
      const updatedGames = games.filter(
        g => g.id !== gameId && 
        g.steamAppId !== gameId &&
        String(g.id) !== String(gameId)
      )

      if (updatedGames.length === initialLength) {
        return false // Game not found
      }

      const key = this.getUserKey(userId)
      sessionStorage.setItem(key, JSON.stringify(updatedGames))

      return true
    } catch (error) {
      console.error('Error removing game from sessionStorage:', error)
      throw error
    }
  }

  /**
   * Check if a game exists in user's library
   */
  async hasGame(userId, gameId, steamAppId = null) {
    try {
      const games = await this.getGames(userId)
      
      return games.some(
        g => g.id === gameId ||
        String(g.id) === String(gameId) ||
        (steamAppId && g.steamAppId && g.steamAppId === steamAppId) ||
        (steamAppId && String(g.steamAppId) === String(steamAppId))
      )
    } catch (error) {
      console.error('Error checking game in sessionStorage:', error)
      return false
    }
  }

  /**
   * Update game information
   */
  async updateGame(userId, gameId, updates) {
    try {
      const games = await this.getGames(userId)
      const gameIndex = games.findIndex(
        g => g.id === gameId || String(g.id) === String(gameId)
      )

      if (gameIndex === -1) {
        throw new Error('Game not found')
      }

      const updatedGame = { ...games[gameIndex], ...updates }
      games[gameIndex] = updatedGame

      const key = this.getUserKey(userId)
      sessionStorage.setItem(key, JSON.stringify(games))

      return updatedGame
    } catch (error) {
      console.error('Error updating game in sessionStorage:', error)
      throw error
    }
  }
}

/**
 * Database Storage Implementation (for future use)
 * This would make API calls to your backend
 */
class DatabaseStorageService extends StorageInterface {
  constructor(apiUrl) {
    super()
    this.apiUrl = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000'
  }

  async getGames(userId) {
    // TODO: Implement API call to fetch games
    // const response = await fetch(`${this.apiUrl}/api/users/${userId}/games`)
    // return response.json()
    throw new Error('DatabaseStorageService not yet implemented')
  }

  async addGame(userId, game) {
    // TODO: Implement API call to add game
    // const response = await fetch(`${this.apiUrl}/api/users/${userId}/games`, {
    //   method: 'POST',
    //   body: JSON.stringify(game),
    //   headers: { 'Content-Type': 'application/json' }
    // })
    // return response.json()
    throw new Error('DatabaseStorageService not yet implemented')
  }

  async removeGame(userId, gameId) {
    // TODO: Implement API call to remove game
    // const response = await fetch(`${this.apiUrl}/api/users/${userId}/games/${gameId}`, {
    //   method: 'DELETE'
    // })
    // return response.ok
    throw new Error('DatabaseStorageService not yet implemented')
  }

  async hasGame(userId, gameId, steamAppId = null) {
    // TODO: Implement API call to check if game exists
    // const games = await this.getGames(userId)
    // return games.some(g => g.id === gameId || (steamAppId && g.steamAppId === steamAppId))
    throw new Error('DatabaseStorageService not yet implemented')
  }
}

/**
 * Storage Factory
 * Creates the appropriate storage service based on configuration
 */
export function createStorageService(type = 'session', options = {}) {
  switch (type) {
    case 'session':
      return new SessionStorageService()
    case 'database':
      return new DatabaseStorageService(options.apiUrl)
    default:
      throw new Error(`Unknown storage type: ${type}`)
  }
}

// Export default storage service (currently sessionStorage)
// To switch to database, change this to: createStorageService('database', { apiUrl: '...' })
export const storageService = createStorageService('session')

// Export classes for testing
export { StorageInterface, SessionStorageService, DatabaseStorageService }


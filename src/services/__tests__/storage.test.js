import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SessionStorageService, DatabaseStorageService, createStorageService } from '../storage'

describe('SessionStorageService', () => {
  let storage
  const userId = 'test-user-123'
  const mockGame = {
    id: 1,
    name: 'Test Game',
    image: 'https://example.com/game.jpg',
    releaseDate: 'Jan 2023',
    studio: 'Test Studio',
    steamAppId: '123456'
  }

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
    storage = new SessionStorageService()
  })

  describe('getGames', () => {
    it('returns empty array when no games exist', async () => {
      const games = await storage.getGames(userId)
      expect(games).toEqual([])
    })

    it('returns games from sessionStorage', async () => {
      const games = [mockGame]
      sessionStorage.setItem(`gameo_user_games_${userId}`, JSON.stringify(games))
      
      const result = await storage.getGames(userId)
      expect(result).toEqual(games)
    })

    it('handles invalid JSON gracefully', async () => {
      sessionStorage.setItem(`gameo_user_games_${userId}`, 'invalid json')
      
      const result = await storage.getGames(userId)
      expect(result).toEqual([])
    })
  })

  describe('addGame', () => {
    it('adds a game to empty library', async () => {
      const result = await storage.addGame(userId, mockGame)
      
      expect(result).toEqual(mockGame)
      const games = await storage.getGames(userId)
      expect(games).toHaveLength(1)
      expect(games[0]).toEqual(mockGame)
    })

    it('adds game to beginning of array (most recent first)', async () => {
      const game1 = { ...mockGame, id: 1, name: 'Game 1' }
      const game2 = { ...mockGame, id: 2, name: 'Game 2' }
      
      await storage.addGame(userId, game1)
      await storage.addGame(userId, game2)
      
      const games = await storage.getGames(userId)
      expect(games).toHaveLength(2)
      expect(games[0]).toEqual(game2) // Most recent first
      expect(games[1]).toEqual(game1)
    })

    it('does not add duplicate game (by name)', async () => {
      await storage.addGame(userId, mockGame)
      const result = await storage.addGame(userId, mockGame)
      
      expect(result).toEqual(mockGame)
      const games = await storage.getGames(userId)
      expect(games).toHaveLength(1)
    })

    it('does not add duplicate game (by steamAppId)', async () => {
      const game1 = { ...mockGame, id: 1, name: 'Game 1', steamAppId: '123' }
      const game2 = { ...mockGame, id: 2, name: 'Game 2', steamAppId: '123' }
      
      await storage.addGame(userId, game1)
      const result = await storage.addGame(userId, game2)
      
      expect(result).toEqual(game1) // Returns existing game
      const games = await storage.getGames(userId)
      expect(games).toHaveLength(1)
    })
  })

  describe('removeGame', () => {
    it('removes game by id', async () => {
      await storage.addGame(userId, mockGame)
      
      const removed = await storage.removeGame(userId, mockGame.id)
      
      expect(removed).toBe(true)
      const games = await storage.getGames(userId)
      expect(games).toHaveLength(0)
    })

    it('removes game by steamAppId', async () => {
      await storage.addGame(userId, mockGame)
      
      const removed = await storage.removeGame(userId, mockGame.steamAppId)
      
      expect(removed).toBe(true)
      const games = await storage.getGames(userId)
      expect(games).toHaveLength(0)
    })

    it('returns false when game not found', async () => {
      const removed = await storage.removeGame(userId, 999)
      
      expect(removed).toBe(false)
    })
  })

  describe('hasGame', () => {
    it('returns true when game exists by id', async () => {
      await storage.addGame(userId, mockGame)
      
      const exists = await storage.hasGame(userId, mockGame.id)
      
      expect(exists).toBe(true)
    })

    it('returns true when game exists by steamAppId', async () => {
      await storage.addGame(userId, mockGame)
      
      const exists = await storage.hasGame(userId, mockGame.id, mockGame.steamAppId)
      
      expect(exists).toBe(true)
    })

    it('returns false when game does not exist', async () => {
      const exists = await storage.hasGame(userId, 999)
      
      expect(exists).toBe(false)
    })
  })
})

describe('createStorageService', () => {
  it('creates SessionStorageService for session type', () => {
    const service = createStorageService('session')
    expect(service).toBeInstanceOf(SessionStorageService)
  })

  it('creates DatabaseStorageService for database type', () => {
    const service = createStorageService('database', { apiUrl: 'http://localhost:3000' })
    expect(service).toBeInstanceOf(DatabaseStorageService)
  })

  it('throws error for unknown storage type', () => {
    expect(() => {
      createStorageService('unknown')
    }).toThrow('Unknown storage type: unknown')
  })
})

describe('DatabaseStorageService', () => {
  it('throws error for unimplemented methods', async () => {
    const storage = new DatabaseStorageService()
    
    await expect(storage.getGames('user1')).rejects.toThrow('not yet implemented')
    await expect(storage.addGame('user1', {})).rejects.toThrow('not yet implemented')
    await expect(storage.removeGame('user1', 1)).rejects.toThrow('not yet implemented')
    await expect(storage.hasGame('user1', 1)).rejects.toThrow('not yet implemented')
  })
})


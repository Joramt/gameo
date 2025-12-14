import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'

const router = express.Router()

/**
 * GET /api/games
 * Get all games for the current user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const { data: games, error } = await supabase
      .from('user_games')
      .select('id, name, image, release_date, studio, steam_app_id, date_started, date_bought, price, time_played, created_at, updated_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false }) // Most recent first

    if (error) {
      console.error('Error fetching games:', error)
      return res.status(500).json({ error: 'Failed to fetch games' })
    }

    // Transform database format to frontend format
    const formattedGames = (games || []).map(game => ({
      id: game.id,
      name: game.name,
      image: game.image || '',
      releaseDate: game.release_date || '',
      studio: game.studio || 'Unknown Studio',
      steamAppId: game.steam_app_id || null,
      dateStarted: game.date_started || '',
      dateBought: game.date_bought || '',
      price: game.price ? parseFloat(game.price) : '',
      timePlayed: game.time_played || 0,
    }))

    res.json({ games: formattedGames })
  } catch (error) {
    console.error('Get games error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * POST /api/games
 * Add a game to user's library
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, image, releaseDate, studio, steamAppId, dateStarted, dateBought, price, timePlayed } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Game name is required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Check if game already exists (by steamAppId if provided, or by name)
    if (steamAppId) {
      const { data: existing } = await supabase
        .from('user_games')
        .select('id')
        .eq('user_id', req.userId)
        .eq('steam_app_id', steamAppId)
        .maybeSingle()

      if (existing) {
        return res.status(409).json({ error: 'Game already exists in library', game: existing })
      }
    }

    // Insert new game
    const { data: newGame, error: insertError } = await supabase
      .from('user_games')
      .insert([
        {
          user_id: req.userId,
          name,
          image: image || null,
          release_date: releaseDate || null,
          studio: studio || null,
          steam_app_id: steamAppId || null,
          date_started: dateStarted || null,
          date_bought: dateBought || null,
          price: price ? parseFloat(price) : null,
          time_played: timePlayed || 0,
        }
      ])
      .select('id, name, image, release_date, studio, steam_app_id, date_started, date_bought, price, time_played, created_at, updated_at')
      .single()

    if (insertError) {
      console.error('Error creating game:', insertError)
      return res.status(500).json({ error: 'Failed to create game' })
    }

    // Transform to frontend format
    const formattedGame = {
      id: newGame.id,
      name: newGame.name,
      image: newGame.image || '',
      releaseDate: newGame.release_date || '',
      studio: newGame.studio || 'Unknown Studio',
      steamAppId: newGame.steam_app_id || null,
      dateStarted: newGame.date_started || '',
      dateBought: newGame.date_bought || '',
      price: newGame.price ? parseFloat(newGame.price) : '',
      timePlayed: newGame.time_played || 0,
    }

    res.status(201).json({ game: formattedGame })
  } catch (error) {
    console.error('Create game error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * PUT /api/games/:gameId
 * Update a game in user's library
 */
router.put('/:gameId', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params
    const { name, image, releaseDate, studio, steamAppId, dateStarted, dateBought, price, timePlayed } = req.body

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (image !== undefined) updateData.image = image || null
    if (releaseDate !== undefined) updateData.release_date = releaseDate && releaseDate.trim() !== '' ? releaseDate : null
    if (studio !== undefined) updateData.studio = studio && studio.trim() !== '' ? studio : null
    if (steamAppId !== undefined) updateData.steam_app_id = steamAppId && steamAppId.toString().trim() !== '' ? steamAppId : null
    if (dateStarted !== undefined) updateData.date_started = dateStarted && dateStarted.trim() !== '' ? dateStarted : null
    if (dateBought !== undefined) updateData.date_bought = dateBought && dateBought.trim() !== '' ? dateBought : null
    if (price !== undefined) updateData.price = price !== null && price !== '' && !isNaN(parseFloat(price)) ? parseFloat(price) : null
    if (timePlayed !== undefined) updateData.time_played = parseInt(timePlayed, 10) || 0
    updateData.updated_at = new Date().toISOString()

    const { data: updatedGame, error: updateError } = await supabase
      .from('user_games')
      .update(updateData)
      .eq('id', gameId)
      .eq('user_id', req.userId) // Ensure user owns the game
      .select('id, name, image, release_date, studio, steam_app_id, date_started, date_bought, price, time_played, created_at, updated_at')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Game not found' })
      }
      console.error('Error updating game:', updateError)
      return res.status(500).json({ error: 'Failed to update game' })
    }

    // Transform to frontend format
    const formattedGame = {
      id: updatedGame.id,
      name: updatedGame.name,
      image: updatedGame.image || '',
      releaseDate: updatedGame.release_date || '',
      studio: updatedGame.studio || 'Unknown Studio',
      steamAppId: updatedGame.steam_app_id || null,
      dateStarted: updatedGame.date_started || '',
      dateBought: updatedGame.date_bought || '',
      price: updatedGame.price ? parseFloat(updatedGame.price) : '',
      timePlayed: updatedGame.time_played || 0,
    }

    res.json({ game: formattedGame })
  } catch (error) {
    console.error('Update game error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * DELETE /api/games/:gameId
 * Remove a game from user's library
 */
router.delete('/:gameId', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const { error } = await supabase
      .from('user_games')
      .delete()
      .eq('id', gameId)
      .eq('user_id', req.userId) // Ensure user owns the game

    if (error) {
      console.error('Error deleting game:', error)
      return res.status(500).json({ error: 'Failed to delete game' })
    }

    res.json({ message: 'Game removed successfully' })
  } catch (error) {
    console.error('Delete game error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

export { router as gamesRouter }


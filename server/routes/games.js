import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'
import { searchPSNGame } from '../services/psnSearchApi.js'

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
      .select('id, name, image, release_date, studio, steam_app_id, psn_id, psn_platform, date_started, date_bought, price, time_played, last_played, created_at, updated_at')
      .eq('user_id', req.userId)
      .order('last_played', { ascending: false, nullsLast: true }) // Most recent first, nulls last

    if (error) {
      console.error('Error fetching games:', error)
      return res.status(500).json({ error: 'Failed to fetch games' })
    }

    // Sort games: by last_played (descending), then by created_at (descending) for games without last_played
    const sortedGames = (games || []).sort((a, b) => {
      const aDate = a.last_played ? new Date(a.last_played) : (a.created_at ? new Date(a.created_at) : new Date(0))
      const bDate = b.last_played ? new Date(b.last_played) : (b.created_at ? new Date(b.created_at) : new Date(0))
      return bDate - aDate // Most recent first
    })

    // Transform database format to frontend format
    const formattedGames = sortedGames.map(game => ({
      id: game.id,
      name: game.name,
      image: game.image || '',
      releaseDate: game.release_date || '',
      studio: game.studio || 'Unknown Studio',
      steamAppId: game.steam_app_id || null,
      psnId: game.psn_id || null,
      psnPlatform: game.psn_platform || null,
      dateStarted: game.date_started || '',
      dateBought: game.date_bought || '',
      price: game.price ? parseFloat(game.price) : null,
      timePlayed: game.time_played || 0,
      lastPlayed: game.last_played || null,
      createdAt: game.created_at || null,
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
    const { name, image, releaseDate, studio, steamAppId, psnId, psnPlatform, dateStarted, dateBought, price, timePlayed, lastPlayed, enrich = false } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Game name is required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Enrich game if requested and missing studio or releaseDate
    let finalStudio = studio || 'Unknown Studio'
    let finalReleaseDate = releaseDate || ''
    
    // Check if we need enrichment (missing studio or releaseDate, OR if studio is 'Unknown Publisher')
    const needsEnrichment = enrich && (
      !studio || 
      studio === 'Unknown Studio' || 
      studio === 'Unknown Publisher' || 
      !releaseDate
    )
    
    if (needsEnrichment) {
      try {
        // Fetch user profile to get country, language, and age
        let userCountry = 'US'
        let userLanguage = 'en'
        let userAge = 19

        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('country, language, age')
          .eq('id', req.userId)
          .single()

        if (userProfile) {
          userCountry = userProfile.country || 'US'
          userLanguage = userProfile.language || 'en'
          userAge = userProfile.age || 19
        }

        // Search for the game (with caching handled in the service)
        const metadata = await searchPSNGame(name, userCountry, userLanguage, userAge)
        
        // Always use publisher from API if available, even if we had a studio
        if (metadata.publisher && (
          !studio || 
          studio === 'Unknown Studio' || 
          studio === 'Unknown Publisher'
        )) {
          finalStudio = metadata.publisher
          console.log(`[GAME ENRICH] Set publisher for "${name}": ${metadata.publisher}`)
        }
        if (metadata.releaseDate && !releaseDate) {
          finalReleaseDate = metadata.releaseDate
        }
      } catch (enrichError) {
        console.warn(`Could not enrich game ${name}:`, enrichError.message)
        // Continue with original data if enrichment fails
      }
    }

    // Check if game already exists (by steamAppId, psnId, or by name for PSN games)
    let existing = null
    if (steamAppId) {
      const { data } = await supabase
        .from('user_games')
        .select('id, steam_app_id, psn_id, psn_platform, name')
        .eq('user_id', req.userId)
        .eq('steam_app_id', steamAppId)
        .maybeSingle()
      existing = data
    } else if (psnId) {
      const { data } = await supabase
        .from('user_games')
        .select('id, steam_app_id, psn_id, psn_platform, name')
        .eq('user_id', req.userId)
        .eq('psn_id', psnId)
        .maybeSingle()
      existing = data
      
      // If not found by psnId and we have a name, also check by name (for merging PS4/PS5 versions)
      if (!existing && name) {
        const { data: nameMatch } = await supabase
          .from('user_games')
          .select('id, steam_app_id, psn_id, psn_platform, name')
          .eq('user_id', req.userId)
          .eq('name', name)
          .not('psn_id', 'is', null) // Only match games that already have a psn_id
          .maybeSingle()
        existing = nameMatch
      }
    }
    
    if (existing) {
      // Game exists - update it to add the other source ID and merge platforms if needed
      const updateData = {}
      if (steamAppId && !existing.steam_app_id) {
        updateData.steam_app_id = steamAppId
      }
      if (psnId && !existing.psn_id) {
        updateData.psn_id = psnId
      }
      
      // Merge platforms if we have a new platform
      if (psnPlatform && existing.psn_platform) {
        const existingPlatforms = existing.psn_platform.split(',').map(p => p.trim()).filter(Boolean)
        const newPlatforms = psnPlatform.split(',').map(p => p.trim()).filter(Boolean)
        const mergedPlatforms = [...new Set([...existingPlatforms, ...newPlatforms])].sort().join(', ')
        if (mergedPlatforms !== existing.psn_platform) {
          updateData.psn_platform = mergedPlatforms
        }
      } else if (psnPlatform && !existing.psn_platform) {
        updateData.psn_platform = psnPlatform
      }
      
      // Only update if we're adding a new source or merging platforms
      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString()
        const { data: updatedGame, error: updateError } = await supabase
          .from('user_games')
          .update(updateData)
          .eq('id', existing.id)
          .select('id, name, image, release_date, studio, steam_app_id, psn_id, psn_platform, date_started, date_bought, price, time_played, last_played, created_at, updated_at')
          .single()
        
        if (updateError) {
          console.error('Error updating game with new source:', updateError)
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
          psnId: updatedGame.psn_id || null,
          psnPlatform: updatedGame.psn_platform || null,
          dateStarted: updatedGame.date_started || '',
          dateBought: updatedGame.date_bought || '',
          price: updatedGame.price ? parseFloat(updatedGame.price) : '',
          timePlayed: updatedGame.time_played || 0,
          lastPlayed: updatedGame.last_played || null,
          createdAt: updatedGame.created_at || null,
        }
        
        return res.status(200).json({ game: formattedGame })
      } else {
        // Game already exists with this source
        return res.status(409).json({ error: 'Game already exists in library', game: existing })
      }
    }

    // Insert new game
    const { data: newGame, error: insertError } = await supabase
      .from('user_games')
      .insert([
        {
          user_id: req.userId,
          name: name.trim(),
          image: image || null,
          release_date: finalReleaseDate || null,
          studio: finalStudio || null,
          steam_app_id: steamAppId || null,
          psn_id: psnId || null,
          psn_platform: psnPlatform || null,
          date_started: dateStarted || null,
          date_bought: dateBought || null,
          price: price ? parseFloat(price) : null,
          time_played: timePlayed || 0,
          last_played: lastPlayed || null,
        }
      ])
      .select('id, name, image, release_date, studio, steam_app_id, psn_id, date_started, date_bought, price, time_played, last_played, created_at, updated_at')
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
      lastPlayed: newGame.last_played || null,
      createdAt: newGame.created_at || null,
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
    const { name, image, releaseDate, studio, steamAppId, psnId, psnPlatform, dateStarted, dateBought, price, timePlayed, lastPlayed } = req.body

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (image !== undefined) updateData.image = image || null
    if (releaseDate !== undefined) updateData.release_date = releaseDate && releaseDate.trim() !== '' ? releaseDate : null
    if (studio !== undefined) updateData.studio = studio && studio.trim() !== '' ? studio : null
      if (steamAppId !== undefined) updateData.steam_app_id = steamAppId && steamAppId.toString().trim() !== '' ? steamAppId : null
      if (psnId !== undefined) updateData.psn_id = psnId && psnId.toString().trim() !== '' ? psnId : null
      if (psnPlatform !== undefined) updateData.psn_platform = psnPlatform && psnPlatform.toString().trim() !== '' ? psnPlatform : null
    if (dateStarted !== undefined) updateData.date_started = dateStarted && dateStarted.trim() !== '' ? dateStarted : null
    if (dateBought !== undefined) updateData.date_bought = dateBought && dateBought.trim() !== '' ? dateBought : null
    if (price !== undefined) updateData.price = price !== null && price !== '' && !isNaN(parseFloat(price)) ? parseFloat(price) : null
    if (timePlayed !== undefined) updateData.time_played = parseInt(timePlayed, 10) || 0
    if (lastPlayed !== undefined) updateData.last_played = lastPlayed && lastPlayed.trim() !== '' ? lastPlayed : null
    updateData.updated_at = new Date().toISOString()

    const { data: updatedGame, error: updateError } = await supabase
      .from('user_games')
      .update(updateData)
      .eq('id', gameId)
      .eq('user_id', req.userId) // Ensure user owns the game
      .select('id, name, image, release_date, studio, steam_app_id, psn_id, date_started, date_bought, price, time_played, last_played, created_at, updated_at')
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
      psnId: updatedGame.psn_id || null,
      dateStarted: updatedGame.date_started || '',
      dateBought: updatedGame.date_bought || '',
      price: updatedGame.price ? parseFloat(updatedGame.price) : '',
      timePlayed: updatedGame.time_played || 0,
      lastPlayed: updatedGame.last_played || null,
      createdAt: updatedGame.created_at || null,
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


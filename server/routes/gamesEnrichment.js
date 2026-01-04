import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'
import { searchPSNGame } from '../services/psnSearchApi.js'

const router = express.Router()

/**
 * POST /api/games/enrich
 * Enrich a single game with publisher and release date from PSN SearchGame API
 */
router.post('/enrich', authenticateToken, async (req, res) => {
  try {
    const { gameName } = req.body

    if (!gameName) {
      return res.status(400).json({ error: 'Game name is required' })
    }

    // Fetch user profile to get country, language, and age
    let userCountry = 'US'
    let userLanguage = 'en'
    let userAge = 19

    try {
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
    } catch (profileError) {
      console.warn('Could not fetch user profile for PSN SearchGame, using defaults:', profileError.message)
    }

    // Search for the game
    const metadata = await searchPSNGame(gameName, userCountry, userLanguage, userAge)

    res.json({
      publisher: metadata.publisher || null,
      releaseDate: metadata.releaseDate || null
    })
  } catch (error) {
    console.error('Error enriching game:', error)
    res.status(500).json({ error: 'Failed to enrich game' })
  }
})

export { router as gamesEnrichmentRouter }


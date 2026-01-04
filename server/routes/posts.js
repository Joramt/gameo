import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'

const router = express.Router()

/**
 * GET /api/posts
 * Get all posts with pagination (for infinite scroll)
 * Query params: limit, offset
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const offset = parseInt(req.query.offset) || 0

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Fetch posts with user info and game info
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        created_at,
        updated_at,
        user_id,
        user_game_id,
        user_profiles:user_id (
          id,
          display_name,
          email
        ),
        user_games:user_game_id (
          id,
          name,
          image,
          steam_app_id,
          psn_id,
          psn_platform
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching posts:', error)
      return res.status(500).json({ error: 'Failed to fetch posts' })
    }

    // Format the response
    const formattedPosts = (posts || []).map(post => {
      // Handle both possible response structures from Supabase
      const authorData = post.user_profiles || (Array.isArray(post.user_profiles) && post.user_profiles[0]) || null
      return {
        id: post.id,
        title: post.title,
        description: post.description,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        author: {
          id: authorData?.id,
          name: authorData?.display_name || authorData?.name || 'Unknown',
          email: authorData?.email
        },
        game: post.user_games ? {
          id: post.user_games.id,
          name: post.user_games.name,
          image: post.user_games.image,
          steamAppId: post.user_games.steam_app_id,
          psnId: post.user_games.psn_id,
          psnPlatform: post.user_games.psn_platform
        } : null
      }
    })

    res.json({ 
      posts: formattedPosts,
      hasMore: posts.length === limit // If we got the full limit, there might be more
    })
  } catch (error) {
    console.error('Get posts error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * POST /api/posts
 * Create a new post
 * Body: { title, description, userGameId }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, userGameId } = req.body

    if (!title || !description || !userGameId) {
      return res.status(400).json({ error: 'Title, description, and game are required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Verify the user owns the game
    const { data: userGame, error: gameError } = await supabase
      .from('user_games')
      .select('id, user_id')
      .eq('id', userGameId)
      .eq('user_id', req.userId)
      .single()

    if (gameError || !userGame) {
      return res.status(403).json({ error: 'You do not own this game' })
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: req.userId,
        user_game_id: userGameId,
        title: title.trim(),
        description: description.trim()
      })
      .select(`
        id,
        title,
        description,
        created_at,
        updated_at,
        user_id,
        user_game_id,
        user_profiles:user_id (
          id,
          display_name,
          email
        ),
        user_games:user_game_id (
          id,
          name,
          image,
          steam_app_id,
          psn_id,
          psn_platform
        )
      `)
      .single()

    if (postError) {
      console.error('Error creating post:', postError)
      return res.status(500).json({ error: 'Failed to create post' })
    }

    // Format the response
    const authorData = post.user_profiles || (Array.isArray(post.user_profiles) && post.user_profiles[0]) || null
    const formattedPost = {
      id: post.id,
      title: post.title,
      description: post.description,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: {
        id: authorData?.id,
        name: authorData?.display_name || authorData?.name || 'Unknown',
        email: authorData?.email
      },
      game: post.user_games ? {
        id: post.user_games.id,
        name: post.user_games.name,
        image: post.user_games.image,
        steamAppId: post.user_games.steam_app_id,
        psnId: post.user_games.psn_id,
        psnPlatform: post.user_games.psn_platform
      } : null
    }

    res.status(201).json({ post: formattedPost })
  } catch (error) {
    console.error('Create post error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * PUT /api/posts/:id
 * Update a post (only by the author)
 * Body: { title, description }
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id
    const { title, description } = req.body

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Verify the user owns the post
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single()

    if (fetchError || !existingPost) {
      return res.status(404).json({ error: 'Post not found' })
    }

    if (existingPost.user_id !== req.userId) {
      return res.status(403).json({ error: 'You can only edit your own posts' })
    }

    // Update the post
    const { data: post, error: updateError } = await supabase
      .from('posts')
      .update({
        title: title.trim(),
        description: description.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select(`
        id,
        title,
        description,
        created_at,
        updated_at,
        user_id,
        user_game_id,
        user_profiles:user_id (
          id,
          display_name,
          email
        ),
        user_games:user_game_id (
          id,
          name,
          image,
          steam_app_id,
          psn_id,
          psn_platform
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating post:', updateError)
      return res.status(500).json({ error: 'Failed to update post' })
    }

    // Format the response
    const authorData = post.user_profiles || (Array.isArray(post.user_profiles) && post.user_profiles[0]) || null
    const formattedPost = {
      id: post.id,
      title: post.title,
      description: post.description,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: {
        id: authorData?.id,
        name: authorData?.display_name || authorData?.name || 'Unknown',
        email: authorData?.email
      },
      game: post.user_games ? {
        id: post.user_games.id,
        name: post.user_games.name,
        image: post.user_games.image,
        steamAppId: post.user_games.steam_app_id,
        psnId: post.user_games.psn_id,
        psnPlatform: post.user_games.psn_platform
      } : null
    }

    res.json({ post: formattedPost })
  } catch (error) {
    console.error('Update post error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * GET /api/posts/games/search
 * Search user's games for autocomplete (fuzzy match)
 * Query params: q (search query)
 */
router.get('/games/search', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q || ''
    
    if (query.length < 1) {
      return res.json({ games: [] })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Fetch user's games and filter by name (case-insensitive, fuzzy match)
    const { data: games, error } = await supabase
      .from('user_games')
      .select('id, name, image, steam_app_id, psn_id, psn_platform')
      .eq('user_id', req.userId)
      .ilike('name', `%${query}%`)
      .limit(10)
      .order('name')

    if (error) {
      console.error('Error searching games:', error)
      return res.status(500).json({ error: 'Failed to search games' })
    }

    // Format the response
    const formattedGames = (games || []).map(game => ({
      id: game.id,
      name: game.name,
      image: game.image,
      steamAppId: game.steam_app_id,
      psnId: game.psn_id,
      psnPlatform: game.psn_platform
    }))

    res.json({ games: formattedGames })
  } catch (error) {
    console.error('Search games error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

export { router as postsRouter }


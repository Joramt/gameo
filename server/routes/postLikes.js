import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'

const router = express.Router()

/**
 * POST /api/posts/:postId/like
 * Like/unlike a post (toggles like)
 */
router.post('/:postId/like', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Check if user already liked this post
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', req.userId)
      .single()

    if (existingLike) {
      // Unlike - delete the like
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', req.userId)

      if (deleteError) {
        console.error('Error unliking post:', deleteError)
        return res.status(500).json({ error: 'Failed to unlike post' })
      }

      // Get updated like count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      return res.json({ liked: false, likeCount: count || 0 })
    } else {
      // Like - create the like
      const { error: insertError } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: req.userId
        })

      if (insertError) {
        console.error('Error liking post:', insertError)
        return res.status(500).json({ error: 'Failed to like post' })
      }

      // Get updated like count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      return res.json({ liked: true, likeCount: count || 0 })
    }
  } catch (error) {
    console.error('Like post error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * GET /api/posts/:postId/likes
 * Get like count and whether current user liked the post
 */
router.get('/:postId/likes', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Get like count
    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    // Check if current user liked it
    const { data: userLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', req.userId)
      .single()

    res.json({
      likeCount: count || 0,
      liked: !!userLike
    })
  } catch (error) {
    console.error('Get post likes error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

export { router as postLikesRouter }



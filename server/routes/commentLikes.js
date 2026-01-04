import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'

const router = express.Router()

/**
 * POST /api/comments/:commentId/like
 * Like/unlike a comment (toggles like)
 */
router.post('/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.commentId

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Check if user already liked this comment
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', req.userId)
      .single()

    if (existingLike) {
      // Unlike - delete the like
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', req.userId)

      if (deleteError) {
        console.error('Error unliking comment:', deleteError)
        return res.status(500).json({ error: 'Failed to unlike comment' })
      }

      // Get updated like count
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId)

      return res.json({ liked: false, likeCount: count || 0 })
    } else {
      // Like - create the like
      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: req.userId
        })

      if (insertError) {
        console.error('Error liking comment:', insertError)
        return res.status(500).json({ error: 'Failed to like comment' })
      }

      // Get updated like count
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId)

      return res.json({ liked: true, likeCount: count || 0 })
    }
  } catch (error) {
    console.error('Like comment error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * GET /api/comments/:commentId/likes
 * Get like count and whether current user liked the comment
 */
router.get('/:commentId/likes', authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.commentId

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Get like count
    const { count } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    // Check if current user liked it
    const { data: userLike } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', req.userId)
      .single()

    res.json({
      likeCount: count || 0,
      liked: !!userLike
    })
  } catch (error) {
    console.error('Get comment likes error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

export { router as commentLikesRouter }


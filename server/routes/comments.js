import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'

const router = express.Router()

/**
 * GET /api/posts/:postId/comments
 * Get all comments for a post
 */
router.get('/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Fetch comments with user info
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        user_profiles:user_id (
          id,
          display_name,
          email
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return res.status(500).json({ error: 'Failed to fetch comments' })
    }

    // Format the response
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author: {
        id: comment.user_profiles?.id,
        name: comment.user_profiles?.display_name,
        email: comment.user_profiles?.email
      }
    }))

    res.json({ comments: formattedComments })
  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * POST /api/posts/:postId/comments
 * Create a comment on a post (only if user owns the game)
 * Body: { content }
 */
router.post('/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Get the post and its linked game
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        user_game_id,
        user_games:user_game_id (
          id,
          name
        )
      `)
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const gameName = post.user_games?.name

    if (!gameName) {
      return res.status(404).json({ error: 'Game not found' })
    }

    // Check if the user owns the game (fuzzy match by name)
    const { data: userGame, error: gameError } = await supabase
      .from('user_games')
      .select('id')
      .eq('user_id', req.userId)
      .ilike('name', gameName)
      .limit(1)
      .single()

    if (gameError || !userGame) {
      return res.status(403).json({ 
        error: 'You must own this game to comment',
        gameName: gameName
      })
    }

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: req.userId,
        content: content.trim()
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        user_profiles:user_id (
          id,
          display_name,
          email
        )
      `)
      .single()

    if (commentError) {
      console.error('Error creating comment:', commentError)
      return res.status(500).json({ error: 'Failed to create comment' })
    }

    // Create notification for post author (if not the commenter)
    const { data: postAuthor } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single()

    if (postAuthor && postAuthor.user_id !== req.userId) {
      const { data: commentAuthor } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', req.userId)
        .single()

      await supabase
        .from('notifications')
        .insert({
          user_id: postAuthor.user_id,
          type: 'comment',
          post_id: postId,
          comment_id: comment.id,
          from_user_id: req.userId,
          message: `${commentAuthor?.display_name || 'Someone'} commented on your post about ${gameName}`
        })
    }

    // Format the response
    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author: {
        id: comment.user_profiles?.id,
        name: comment.user_profiles?.display_name,
        email: comment.user_profiles?.email
      }
    }

    res.status(201).json({ comment: formattedComment })
  } catch (error) {
    console.error('Create comment error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

/**
 * PUT /api/posts/:postId/comments/:commentId
 * Update a comment (only by the author)
 * Body: { content }
 */
router.put('/:postId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.commentId
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Verify the user owns the comment
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (fetchError || !existingComment) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    if (existingComment.user_id !== req.userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' })
    }

    // Update the comment
    const { data: comment, error: updateError } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        user_profiles:user_id (
          id,
          display_name,
          email
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return res.status(500).json({ error: 'Failed to update comment' })
    }

    // Format the response
    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author: {
        id: comment.user_profiles?.id,
        name: comment.user_profiles?.display_name,
        email: comment.user_profiles?.email
      }
    }

    res.json({ comment: formattedComment })
  } catch (error) {
    console.error('Update comment error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

export { router as commentsRouter }


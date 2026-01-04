import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function Comments({ postId, gameName }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false) // Collapsed by default
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [userOwnsGame, setUserOwnsGame] = useState(null) // null = checking, true/false = result
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [commentLikes, setCommentLikes] = useState({}) // { commentId: { likeCount: number, liked: boolean } }

  // Check if user owns the game
  useEffect(() => {
    const checkGameOwnership = async () => {
      if (!user?.id || !gameName) {
        setUserOwnsGame(false)
        return
      }

      try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch(`${API_URL}/api/games`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const userGames = data.games || []
          const ownsGame = userGames.some(game => 
            game.name.toLowerCase() === gameName.toLowerCase()
          )
          setUserOwnsGame(ownsGame)
        } else {
          setUserOwnsGame(false)
        }
      } catch (error) {
        console.error('Error checking game ownership:', error)
        setUserOwnsGame(false)
      }
    }

    checkGameOwnership()
  }, [user?.id, gameName])

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem('auth_token')
        const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setComments(data.comments || [])
          
          // Load likes for each comment
          const likesPromises = (data.comments || []).map(async (comment) => {
            try {
              const likesResponse = await fetch(`${API_URL}/api/comments/${comment.id}/likes`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })
              if (likesResponse.ok) {
                const likesData = await likesResponse.json()
                return { commentId: comment.id, ...likesData }
              }
            } catch (error) {
              console.error('Error loading comment likes:', error)
            }
            return { commentId: comment.id, likeCount: 0, liked: false }
          })
          
          const likesData = await Promise.all(likesPromises)
          const likesMap = {}
          likesData.forEach(item => {
            likesMap[item.commentId] = { likeCount: item.likeCount, liked: item.liked }
          })
          setCommentLikes(likesMap)
        }
      } catch (error) {
        console.error('Error loading comments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (postId) {
      loadComments()
    }
  }, [postId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setComments(prev => [...prev, data.comment])
        setNewComment('')
        setCommentLikes(prev => ({ ...prev, [data.comment.id]: { likeCount: 0, liked: false } }))
        setIsExpanded(true) // Expand when a new comment is added
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create comment' }))
        setError(errorData.error || 'Failed to create comment')
        if (errorData.gameName) {
          setUserOwnsGame(false) // Update ownership status if we got an error
        }
      }
    } catch (error) {
      console.error('Error creating comment:', error)
      setError('Failed to create comment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleSaveEdit = async (commentId) => {
    if (!editContent.trim()) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/posts/${postId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setComments(prev => prev.map(c => c.id === commentId ? data.comment : c))
        setEditingId(null)
        setEditContent('')
      }
    } catch (error) {
      console.error('Error updating comment:', error)
    }
  }

  const handleCommentLike = async (commentId) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCommentLikes(prev => ({
          ...prev,
          [commentId]: { likeCount: data.likeCount, liked: data.liked }
        }))
      }
    } catch (error) {
      console.error('Error toggling comment like:', error)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  return (
    <div className="border-t border-gray-700/50">
      {/* Comments Header - Always visible, clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <h4 className="text-base font-semibold text-white">
          Comments {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
        </h4>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Comments Content - Collapsible */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Comments List */}
          {isLoading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => {
                const likes = commentLikes[comment.id] || { likeCount: 0, liked: false }
                return (
                  <div key={comment.id} className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-white font-medium text-sm">{comment.author?.name || 'Unknown'}</span>
                        <span className="text-gray-500 text-xs">•</span>
                        <span className="text-gray-400 text-xs">{formatDate(comment.createdAt)}</span>
                        {comment.updatedAt !== comment.createdAt && (
                          <span className="text-gray-500 text-xs">(edited)</span>
                        )}
                      </div>
                      {user?.id === comment.author?.id && editingId !== comment.id && (
                        <button
                          onClick={() => handleEdit(comment)}
                          className="text-gray-400 hover:text-white transition-colors p-1 ml-2"
                          aria-label="Edit comment"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {editingId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-600/50 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-600/50 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(comment.id)}
                            disabled={!editContent.trim()}
                            className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{comment.content}</p>
                        <button
                          onClick={() => handleCommentLike(comment.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs ${
                            likes.liked
                              ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30'
                              : 'bg-gray-600/30 text-gray-400 hover:bg-gray-600/50 hover:text-white'
                          }`}
                        >
                          <svg className="w-4 h-4" fill={likes.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span className="font-medium">{likes.likeCount}</span>
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
          )}

          {/* Comment Form */}
          {userOwnsGame === false ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-lg text-sm">
              Only people owning {gameName} can participate in the discussion
            </div>
          ) : userOwnsGame === true ? (
            <form onSubmit={handleSubmit} className="space-y-2">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-gray-500 text-sm">Checking...</div>
          )}
        </div>
      )}
    </div>
  )
}

export default Comments

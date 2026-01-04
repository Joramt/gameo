import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Comments from './Comments'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function PostCard({ post, onPostUpdated }) {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(post.title)
  const [description, setDescription] = useState(post.description)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [isLoadingLikes, setIsLoadingLikes] = useState(true)

  const isAuthor = user?.id === post.author?.id

  // Load likes on mount
  useEffect(() => {
    const loadLikes = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch(`${API_URL}/api/posts/${post.id}/likes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setLikeCount(data.likeCount || 0)
          setLiked(data.liked || false)
        }
      } catch (error) {
        console.error('Error loading likes:', error)
      } finally {
        setIsLoadingLikes(false)
      }
    }

    loadLikes()
  }, [post.id])

  const handleEdit = () => {
    setIsEditing(true)
    setTitle(post.title)
    setDescription(post.description)
    setError('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTitle(post.title)
    setDescription(post.description)
    setError('')
  }

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (onPostUpdated) {
          onPostUpdated(data.post)
        }
        setIsEditing(false)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update post' }))
        setError(errorData.error || 'Failed to update post')
      }
    } catch (error) {
      console.error('Error updating post:', error)
      setError('Failed to update post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLike = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLiked(data.liked)
        setLikeCount(data.likeCount || 0)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
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
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header with Author */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-700/50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {(post.author?.name || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-base">
                  {post.author?.name || 'Unknown'}
                  {post.game?.name && (
                    <>
                      {' '}
                      <span className="text-gray-400 font-normal">posting about</span>{' '}
                      <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">
                        {post.game.name}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">{formatDate(post.createdAt)}</div>
              </div>
            </div>
          </div>
          {isAuthor && !isEditing && (
            <button
              onClick={handleEdit}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
              aria-label="Edit post"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 py-5">
        {isEditing ? (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title..."
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                maxLength={500}
              />
            </div>
            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description..."
                rows={6}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting || !title.trim() || !description.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Title */}
            <h3 className="text-2xl font-bold text-white mb-4">{post.title}</h3>
            
            {/* Description */}
            <p className="text-gray-300 text-base leading-relaxed whitespace-pre-wrap">{post.description}</p>
          </>
        )}

        {/* Like Button and Comments Toggle */}
        <div className="mt-6 pt-4 border-t border-gray-700/50 flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={isLoadingLikes}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              liked
                ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30'
                : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="font-medium">{likeCount}</span>
          </button>
        </div>
      </div>

      {/* Comments Section - Collapsible */}
      <Comments postId={post.id} gameName={post.game?.name} />
    </div>
  )
}

export default PostCard

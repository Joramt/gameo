import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import PostCard from './PostCard'
import CreatePost from './CreatePost'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function SocialFeed() {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [offset, setOffset] = useState(0)
  const observerTarget = useRef(null)
  const location = useLocation()
  const LIMIT = 20

  // Listen for custom event to open create post modal
  useEffect(() => {
    const handleCreatePost = () => {
      setIsCreatingPost(true)
    }

    window.addEventListener('openCreatePost', handleCreatePost)
    return () => {
      window.removeEventListener('openCreatePost', handleCreatePost)
    }
  }, [])

  const loadPosts = useCallback(async (currentOffset = 0, append = false) => {
    try {
      setIsLoading(true)
      const token = sessionStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/api/posts?limit=${LIMIT}&offset=${currentOffset}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (append) {
          setPosts(prev => [...prev, ...data.posts])
        } else {
          setPosts(data.posts)
        }
        setHasMore(data.hasMore || false)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosts(0, false)
  }, [loadPosts])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const newOffset = offset + LIMIT
          setOffset(newOffset)
          loadPosts(newOffset, true)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoading, offset, loadPosts])

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev])
    setIsCreatingPost(false)
  }

  const handlePostUpdated = (updatedPost) => {
    setPosts(prev => prev.map(post => post.id === updatedPost.id ? updatedPost : post))
  }

  return (
    <div className="space-y-6">
      {/* Create Post Button - Only visible on mobile */}
      <div className="flex justify-end md:hidden">
        <button
          data-create-post-btn
          onClick={() => setIsCreatingPost(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/25 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Post
        </button>
      </div>

      {/* Posts List */}
      {isLoading && posts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Loading posts...</p>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-12 text-center">
          <p className="text-gray-400 text-lg mb-4">No posts yet</p>
          <p className="text-gray-500 text-sm">Be the first to share about your games!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onPostUpdated={handlePostUpdated} />
          ))}
          
          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={observerTarget} className="flex items-center justify-center py-8">
              {isLoading ? (
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="text-gray-500 text-sm">Loading more posts...</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePost
        isOpen={isCreatingPost}
        onClose={() => setIsCreatingPost(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}

export default SocialFeed

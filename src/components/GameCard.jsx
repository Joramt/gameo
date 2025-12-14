import { useState } from 'react'
import { createPortal } from 'react-dom'
import Modal from './Modal'

function GameCard({ game, onTimerClick, onCardClick, onRemove }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)

  const handleCardClick = (e) => {
    // Don't flip if clicking the timer icon or remove icon
    if (e.target.closest('.timer-icon') || e.target.closest('.remove-icon')) {
      return
    }
    setIsFlipped(!isFlipped)
    if (onCardClick) {
      onCardClick()
    }
  }

  const handleTimerClick = (e) => {
    e.stopPropagation()
    if (onTimerClick) {
      onTimerClick(game)
    }
  }

  const handleRemoveClick = (e) => {
    e.stopPropagation()
    setShowRemoveModal(true)
  }

  const handleConfirmRemove = async () => {
    if (onRemove) {
      await onRemove(game)
      setShowRemoveModal(false)
    }
  }

  const handleCancelRemove = () => {
    setShowRemoveModal(false)
  }

  // Format time played as hours and minutes (for back of card)
  const formatTimePlayed = (timePlayedMinutes) => {
    if (!timePlayedMinutes || timePlayedMinutes === 0) {
      return '0h'
    }
    const hours = Math.floor(timePlayedMinutes / 60)
    const minutes = timePlayedMinutes % 60
    return `${hours}h ${ minutes != 0 ? minutes +'m' : ""}`
  }

  // Format time played as years, months, and days (for front of card)
  // Assumes months alternate between 30 and 31 days
  const formatTimePlayedSmart = (timePlayedMinutes) => {
    if (!timePlayedMinutes || timePlayedMinutes === 0) {
      return ''
    }
    
    // Convert minutes to days
    const totalMinutes = timePlayedMinutes
    const hours = Math.floor(totalMinutes / 60)
    const totalHours = hours
    const daysFromHours = Math.floor(totalHours / 24)
    
    // Calculate years, months, and days
    // Average month: 30.5 days (alternating 30/31)
    let remainingDays = daysFromHours
    const years = Math.floor(remainingDays / 365)
    remainingDays = remainingDays % 365
    
    // Calculate months (using average of 30.5 days per month)
    // To alternate 30/31, we'll use a simple approach: every other month is 31 days
    let months = 0
    let days = remainingDays
    
    // Simple approximation: use 30.5 as average
    months = Math.floor(remainingDays / 30.5)
    days = Math.round(remainingDays % 30.5)
    
    // If we have close to a month worth of days, round up
    if (days >= 28 && months > 0) {
      months++
      days = 0
    }
    
    // Build the string, only showing non-zero values
    const parts = []
    if (years > 0) {
      parts.push(`${years} ${years === 1 ? 'year' : 'years'}`)
    }
    if (months > 0) {
      parts.push(`${months} ${months === 1 ? 'month' : 'months'}`)
    }
    if (days > 0 || parts.length === 0) {
      parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
    }
    
    return parts.join(' ')
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Format last played date (short format)
  const formatLastPlayed = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  // Check if last played is within the last month
  const isLastPlayedRecent = (dateString) => {
    if (!dateString) return false
    
    const lastPlayedDate = new Date(dateString)
    const now = new Date()
    
    // Validate the date is reasonable (not invalid, not in the future, not too old)
    if (isNaN(lastPlayedDate.getTime())) return false
    if (lastPlayedDate > now) return false // Can't be in the future
    if (lastPlayedDate < new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)) return false // Older than 1 year is suspicious
    
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return lastPlayedDate >= oneMonthAgo
  }

  // Calculate days since last played (only if within last month)
  const getDaysSinceLastPlayed = (dateString) => {
    if (!dateString) return null
    
    const lastPlayedDate = new Date(dateString)
    const now = new Date()
    
    // Validate the date is reasonable
    if (isNaN(lastPlayedDate.getTime())) return null
    if (lastPlayedDate > now) return null // Can't be in the future
    
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Only return if within last month (don't show if older than a month)
    if (lastPlayedDate < oneMonthAgo) return null
    
    // Calculate days difference
    const diffTime = now - lastPlayedDate
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return '1 day ago'
    } else {
      return `${diffDays} days ago`
    }
  }

  // Format price
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Not set'
    return `$${parseFloat(price).toFixed(2)}`
  }

  return (
    <div 
      className="group relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 flex-shrink-0 w-full h-full md:w-[180px] md:h-[270px] lg:w-[222px] lg:h-[334px] cursor-pointer"
      role="article"
      aria-label={`Game: ${game.name}`}
      style={{
        aspectRatio: '2/3',
        maxWidth: '100%',
        maxHeight: '80%',
        perspective: '1000px'
      }}
      onClick={handleCardClick}
    >
      {/* Card Container with Flip Animation */}
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front Side */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={game.image}
              alt={game.name}
              className="w-full h-full object-fill transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
              style={{
                // Ensure high-quality image rendering on mobile
                imageRendering: '-webkit-optimize-contrast',
                WebkitImageRendering: 'high-quality'
              }}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="222" height="334"%3E%3Crect fill="%231f2937" width="222" height="334"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="sans-serif" font-size="14"%3EImage not available%3C/text%3E%3C/svg%3E'
              }}
            />
            
            {/* Top Info Overlay - Left Side */}
            <div className="absolute top-0 left-0 pt-6 md:pt-4 pl-3 md:pl-3 flex flex-col gap-1 md:gap-1">
              {/* Studio Name - Top Left with Icon and Frosty Effect */}
              {game.studio && (
                <div className="flex items-center gap-1.5 md:gap-1.5 backdrop-blur-sm rounded-md text-white text-sm md:text-xs font-medium" style={{
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
                }}>
                  <svg className="w-4 h-4 md:w-3.5 md:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="line-clamp-2">{game.studio}</span>
                </div>
              )}
              
              {/* Release Date - Below Studio Name */}
              {game.releaseDate && (
                <div className="inline-flex items-center pr-2 md:pr-1.5 py-1 md:py-1 backdrop-blur-sm rounded-md text-white text-xs md:text-[10px] font-medium whitespace-nowrap w-fit" style={{
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
                }}>
                  <span>Released {game.releaseDate}</span>
                </div>
              )}
            </div>
            
            {/* Game Name Overlay - Bottom with Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-6 md:px-3 md:py-6" style={{
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 40%, rgba(0, 0, 0, 0.2) 70%, transparent 100%)',
              backdropFilter: 'blur(4px)'
            }}>
              <h3 className="text-white text-xl md:text-base font-medium leading-tight mb-1" style={{
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
              }}>
                {game.name}
              </h3>
              {/* Days Since Last Played - Only show if within last month */}
              {(() => {
                const daysSince = getDaysSinceLastPlayed(game.lastPlayed)
                return daysSince ? (
                  <p className="text-white/90 text-sm md:text-xs font-medium mb-1" style={{
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
                  }}>
                    {daysSince}
                  </p>
                ) : null
              })()}
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div
          className="absolute inset-0 w-full h-full bg-gray-800 p-4 md:p-3"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="flex flex-col h-full text-white relative">
            {/* Remove Button - Top Right */}
            {onRemove && (
              <button
                onClick={handleRemoveClick}
                className="remove-icon absolute rounded-md bg-white hover:bg-gray-100 transition-colors w-6 h-6 flex items-center justify-center"
                style={{ top: '3px', right: 0 }}
                aria-label="Remove game"
              >
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            {/* Time Played - Large at Top */}
            <div className="mb-4 md:mb-3">
              <div className="text-xs text-gray-400 mb-1">Time Played</div>
              <div className="flex items-start gap-2">
                <div className="text-3xl md:text-2xl font-bold text-purple-400">
                  {formatTimePlayed(game.timePlayed)}
                </div>
                <button
                  onClick={handleTimerClick}
                  className="w-[12px] h-[12px] min-w-[12px] max-w-[12px] min-h-[12px] max-h-[12px] rounded-[2px] bg-white border border-dashed border-white/30 hover:bg-white/90 transition-colors flex items-center justify-center p-0 mt-1"
                  aria-label="Add time played"
                >
                  <svg className="w-[12px] h-[12px] min-w-[12px] max-w-[12px] min-h-[12px] max-h-[12px]" style={{ width: '12px', height: '12px' }} viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="6" x2="12" y2="18"></line>
                    <line x1="6" y1="12" x2="18" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* Other Information */}
            <div className="flex-1 space-y-3 md:space-y-2">
              <div>
                <div className="text-xs text-gray-400 mb-1">Date Started</div>
                <div className="text-[15px] text-white">{formatDate(game.dateStarted)}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">Date Bought</div>
                <div className="text-[15px] text-white">{formatDate(game.dateBought)}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">Price</div>
                <div className="text-[15px] text-white">{formatPrice(game.price)}</div>
              </div>
            </div>

            {/* Flip Hint */}
            <div className="mt-auto text-center text-xs text-gray-500 pt-2">
              Click to flip back
            </div>
          </div>
        </div>
      </div>

      {/* Remove Confirmation Modal - Rendered via Portal */}
      {showRemoveModal && createPortal(
        <Modal isOpen={showRemoveModal} onClose={handleCancelRemove} title="Remove Game">
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to remove <span className="font-semibold text-white">"{game.name}"</span> from your library?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelRemove}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </Modal>,
        document.body
      )}
    </div>
  )
}

export default GameCard

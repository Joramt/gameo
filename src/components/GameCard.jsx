import { useState } from 'react'

function GameCard({ game, onTimerClick, onCardClick }) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleCardClick = (e) => {
    // Don't flip if clicking the timer icon
    if (e.target.closest('.timer-icon')) {
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

  // Format time played
  const formatTimePlayed = (timePlayedMinutes) => {
    if (!timePlayedMinutes || timePlayedMinutes === 0) {
      return '0h 0m'
    }
    const hours = Math.floor(timePlayedMinutes / 60)
    const minutes = timePlayedMinutes % 60
    return `${hours}h ${minutes}m`
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
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="222" height="334"%3E%3Crect fill="%231f2937" width="222" height="334"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="sans-serif" font-size="14"%3EImage not available%3C/text%3E%3C/svg%3E'
              }}
            />
            
            {/* Top Info Overlay - Left Side */}
            <div className="absolute top-0 left-0 pt-2 md:pt-2 pl-3 md:pl-3 flex flex-col gap-1 md:gap-1">
              {/* Timer Icon - Top Left */}
              <button
                onClick={handleTimerClick}
                className="timer-icon px-2 py-1.5 md:px-1.5 md:py-1 backdrop-blur-sm rounded-md text-white hover:bg-white/20 transition-colors z-10 w-fit"
                style={{
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
                }}
                aria-label="Update time played"
              >
                <svg className="w-4 h-4 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {/* Studio Name - Top Left with Icon and Frosty Effect */}
              {game.studio && (
                <div className="flex items-center gap-1.5 md:gap-1.5 px-2 md:px-1.5 py-1 md:py-1 backdrop-blur-sm rounded-md text-white text-sm md:text-xs font-medium" style={{
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
                <div className="inline-flex items-center px-2 md:px-1.5 py-1 md:py-1 backdrop-blur-sm rounded-md text-white text-xs md:text-[10px] font-medium whitespace-nowrap w-fit" style={{
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
                }}>
                  <span>{game.releaseDate}</span>
                </div>
              )}
            </div>
            
            {/* Game Name Overlay - Bottom with Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-6 md:px-3 md:py-4" style={{
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 40%, rgba(0, 0, 0, 0.2) 70%, transparent 100%)',
              backdropFilter: 'blur(4px)'
            }}>
              <h3 className="text-white text-xl md:text-base font-medium leading-tight" style={{
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
              }}>
                {game.name}
              </h3>
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
          <div className="flex flex-col h-full text-white">
            {/* Time Played - Large at Top */}
            <div className="mb-4 md:mb-3">
              <div className="text-xs md:text-[10px] text-gray-400 mb-1">Time Played</div>
              <div className="text-3xl md:text-2xl font-bold text-purple-400">
                {formatTimePlayed(game.timePlayed)}
              </div>
            </div>

            {/* Other Information */}
            <div className="flex-1 space-y-3 md:space-y-2 text-sm md:text-xs">
              <div>
                <div className="text-gray-400 mb-1">Date Started</div>
                <div className="text-white">{formatDate(game.dateStarted)}</div>
              </div>
              
              <div>
                <div className="text-gray-400 mb-1">Date Bought</div>
                <div className="text-white">{formatDate(game.dateBought)}</div>
              </div>
              
              <div>
                <div className="text-gray-400 mb-1">Price</div>
                <div className="text-white">{formatPrice(game.price)}</div>
              </div>
            </div>

            {/* Flip Hint */}
            <div className="mt-auto text-center text-xs text-gray-500 pt-2">
              Click to flip back
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameCard

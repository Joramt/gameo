function GameCard({ game }) {
  return (
    <div 
      className="group relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 flex-shrink-0 w-[222px] h-[334px]"
      role="article"
      aria-label={`Game: ${game.name}`}
    >
      {/* Image Container */}
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
        <div className="absolute top-0 left-0 pt-2 pl-3 flex flex-col gap-1">
          {/* Studio Name - Top Left with Icon and Frosty Effect */}
          {game.studio && (
            <div className="flex items-center gap-1.5 px-1.5 py-1 backdrop-blur-sm rounded-md text-white text-xs font-medium" style={{
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
            }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="line-clamp-2">{game.studio}</span>
            </div>
          )}
          
          {/* Release Date - Below Studio Name */}
          {game.releaseDate && (
            <div className="inline-flex items-center px-1.5 py-1 backdrop-blur-sm rounded-md text-white text-[10px] font-medium whitespace-nowrap w-fit" style={{
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
            }}>
              <span>{game.releaseDate}</span>
            </div>
          )}
        </div>
        
        {/* Game Name Overlay - Bottom with Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-4" style={{
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 40%, rgba(0, 0, 0, 0.2) 70%, transparent 100%)',
          backdropFilter: 'blur(4px)'
        }}>
          <h3 className="text-white text-base font-medium leading-tight" style={{
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)'
          }}>
            {game.name}
          </h3>
        </div>
      </div>
    </div>
  )
}

export default GameCard


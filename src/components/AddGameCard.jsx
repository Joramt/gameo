function AddGameCard({ onClick, isEmptyState = false, steamConnected = false, navigate = null }) {
  if (isEmptyState) {
    const handleSteamLinkClick = (e) => {
      e.stopPropagation()
      if (navigate) {
        navigate('/integrations')
      }
    }

    return (
      <button
        onClick={onClick}
        className="group relative bg-transparent backdrop-blur-sm rounded-xl border-2 border-dashed border-gray-600/50 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 w-full h-[334px] flex flex-col items-center justify-center cursor-pointer p-6"
        aria-label="Add a new game to your library"
      >
        {/* Plus Icon */}
        <svg
          className="w-24 h-24 text-gray-400 group-hover:text-purple-400 transition-colors mb-4 group-hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        
        {/* Empty State Message */}
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-2">
            You don't have any games in your library yet
          </p>
          <p className="text-gray-500 text-sm mb-3">
            Click here to add your first game!
          </p>
          <p className="text-gray-500 text-xs mt-3">
            Or{' '}
            {steamConnected ? (
              <span
                onClick={handleSteamLinkClick}
                className="text-purple-400 hover:text-purple-300 underline transition-colors cursor-pointer"
              >
                synchronize your Steam library
              </span>
            ) : (
              <span
                onClick={handleSteamLinkClick}
                className="text-purple-400 hover:text-purple-300 underline transition-colors cursor-pointer"
              >
                connect and synchronize your Steam library
              </span>
            )}
          </p>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="group relative bg-transparent backdrop-blur-sm rounded-xl border-2 border-dashed border-gray-600/50 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 flex-shrink-0 w-[140px] h-[210px] sm:w-[160px] sm:h-[240px] md:w-[80px] md:h-[270px] lg:h-[334px] flex items-center justify-center cursor-pointer"
      aria-label="Add a new game to your library"
    >
      {/* Plus Icon - No Background */}
      <svg
        className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400 group-hover:text-purple-400 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4v16m8-8H4"
        />
      </svg>
    </button>
  )
}

export default AddGameCard


function AddGameCard({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 flex-shrink-0 w-[140px] h-[210px] sm:w-[160px] sm:h-[240px] md:w-[180px] md:h-[270px] lg:w-[222px] lg:h-[334px] flex items-center justify-center cursor-pointer"
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


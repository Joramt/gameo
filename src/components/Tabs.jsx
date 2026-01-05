function Tabs({ activeTab, onTabChange, tabs }) {
  return (
    <div className="w-full border-b border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 px-6 py-4 text-center font-semibold text-sm md:text-base transition-all duration-200
                relative
                ${activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-300'
                }
              `}
            >
              {tab.label}
              {/* Active indicator - underline */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Tabs



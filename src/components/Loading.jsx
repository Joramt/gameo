function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
        <p className="text-white text-xl">Loading...</p>
        <span className="sr-only">Loading application</span>
      </div>
    </div>
  )
}

export default Loading


import { useEffect } from 'react'

function Modal({ isOpen, onClose, children, title, preventClose = false }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (preventClose) return // Don't add escape handler if modal can't be closed
    
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, preventClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center md:items-start md:pt-20 md:pt-32 bg-black/60 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget && !preventClose) {
          onClose()
        }
      }}
    >
      {/* Close button for mobile - positioned at top left of screen */}
      {!preventClose && (
        <button
          onClick={onClose}
          className="md:hidden fixed top-4 left-4 text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg z-[60] bg-black/20 backdrop-blur-sm"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
      <div className="relative w-full h-full md:w-full md:max-w-md md:h-auto md:mx-4 md:max-h-[90vh] md:rounded-2xl overflow-y-auto">
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/40 via-pink-500/40 to-purple-500/40 md:rounded-2xl blur-xl opacity-40"></div>
        
        {/* Main modal container */}
        <div className="relative h-full md:h-auto md:rounded-2xl border-0 md:border border-white/20 shadow-2xl overflow-hidden flex flex-col">
          {/* Animated background gradient with reduced opacity */}
          <div className="absolute inset-0 animated-gradient opacity-15"></div>
          
          {/* Content container with backdrop blur */}
          <div className="relative flex-1 flex flex-col justify-center bg-black/30 backdrop-blur-lg md:rounded-2xl p-6 md:p-8">
            {/* Subtle gradient top border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
          
            {title && (
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-3xl font-bold text-white modal-title-shadow md:block text-center md:text-left">
                  {title}
                </h2>
                {!preventClose && (
                  <button
                    onClick={onClose}
                    className="hidden md:block text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    aria-label="Close modal"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal


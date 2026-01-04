import { useEffect } from 'react'

function Modal({ isOpen, onClose, children, title, preventClose = false, additionalContent, opaqueHeader = false, footer = null }) {
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
      className={`fixed inset-0 z-50 flex items-start justify-center pt-4 pb-4 md:pt-16 bg-black/60 backdrop-blur-md ${additionalContent ? 'md:flex-row md:justify-around md:gap-6' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !preventClose) {
          onClose()
        }
      }}
    >
      {/* Close button for mobile - positioned at top right, aligned with title */}
      {!preventClose && (
        <button
          onClick={onClose}
          className="md:hidden fixed top-6 right-6 text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg z-[60] bg-black/20 backdrop-blur-sm"
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
      <div className="relative w-full h-full md:w-full md:max-w-md md:h-auto md:mx-4 md:max-h-[90vh] md:rounded-2xl overflow-hidden flex flex-col">
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/40 via-pink-500/40 to-purple-500/40 md:rounded-2xl blur-xl opacity-40"></div>
        
        {/* Main modal container */}
        <div className="relative h-full md:h-auto md:rounded-2xl border-0 md:border border-white/20 shadow-2xl overflow-hidden flex flex-col">
          {/* Animated background gradient with reduced opacity */}
          <div className="absolute inset-0 animated-gradient opacity-15"></div>
          
          {/* Scrollable container with backdrop blur */}
          <div className="relative flex-1 flex flex-col bg-black/30 backdrop-blur-lg md:rounded-2xl overflow-y-auto min-h-0">
            {/* Fixed header with title and close button */}
            {title && (
              <div className={`sticky top-0 flex items-center justify-between p-6 md:p-8 z-20 ${opaqueHeader ? '' : ''}`} style={opaqueHeader ? { backgroundColor: '#170211', border: 'none' } : {}}>
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
            
            {/* Scrollable content area */}
            <div className="relative z-10 px-6 md:px-8 py-6 md:py-8">
              {children}
            </div>
            
            {/* Footer area */}
            {footer && (
              <div className="sticky bottom-0 px-6 md:px-8 pb-6 md:pb-8 pt-4">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
      {additionalContent && additionalContent}
    </div>
  )
}

export default Modal


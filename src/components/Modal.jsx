import { useEffect } from 'react'

function Modal({ isOpen, onClose, children, title }) {
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
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 md:pt-32 bg-black/60 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/40 via-pink-500/40 to-purple-500/40 rounded-2xl blur-xl opacity-40"></div>
        
        {/* Main modal container */}
        <div className="relative rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Animated background gradient with reduced opacity */}
          <div className="absolute inset-0 animated-gradient opacity-15"></div>
          
          {/* Content container with backdrop blur */}
          <div className="relative bg-black/30 backdrop-blur-lg rounded-2xl p-6 md:p-8">
            {/* Subtle gradient top border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
          
            {title && (
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-3xl font-bold text-white modal-title-shadow">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
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


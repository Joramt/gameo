import { useState } from 'react'

function TimeInput({ hours: initialHours = 0, minutes: initialMinutes = 0, onChange }) {
  const [hours, setHours] = useState(initialHours || 0)
  const [minutes, setMinutes] = useState(initialMinutes || 0)

  const minuteOptions = [0, 15, 30, 45]

  const handleHoursChange = (delta) => {
    const newHours = Math.max(0, hours + delta)
    setHours(newHours)
    if (onChange) {
      onChange(newHours, minutes)
    }
  }

  const handleMinutesChange = (delta) => {
    // Find current index, or closest match
    let currentIndex = minuteOptions.indexOf(minutes)
    if (currentIndex === -1) {
      // If current minutes don't match exactly, find closest
      currentIndex = minuteOptions.findIndex(m => m >= minutes) || 0
    }
    
    let newIndex = currentIndex + delta
    
    // Loop through options
    if (newIndex < 0) {
      newIndex = minuteOptions.length - 1
    } else if (newIndex >= minuteOptions.length) {
      newIndex = 0
    }
    
    const newMinutes = minuteOptions[newIndex]
    setMinutes(newMinutes)
    if (onChange) {
      onChange(hours, newMinutes)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Hours Input */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => handleHoursChange(1)}
          className="w-12 h-8 flex items-center justify-center rounded-t-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Increase hours"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <div className="w-12 h-16 flex items-center justify-center bg-gray-800 border border-gray-700 text-white text-2xl font-bold">
          {String(hours).padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={() => handleHoursChange(-1)}
          disabled={hours === 0}
          className="w-12 h-8 flex items-center justify-center rounded-b-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Decrease hours"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <label className="mt-2 text-xs text-gray-400">Hours</label>
      </div>

      <div className="text-2xl text-gray-500 font-bold">:</div>

      {/* Minutes Input */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => handleMinutesChange(1)}
          className="w-12 h-8 flex items-center justify-center rounded-t-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Increase minutes"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <div className="w-12 h-16 flex items-center justify-center bg-gray-800 border border-gray-700 text-white text-2xl font-bold">
          {String(minutes).padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={() => handleMinutesChange(-1)}
          className="w-12 h-8 flex items-center justify-center rounded-b-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Decrease minutes"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <label className="mt-2 text-xs text-gray-400">Minutes</label>
      </div>
    </div>
  )
}

export default TimeInput


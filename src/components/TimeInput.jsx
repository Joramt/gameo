import { useState, useEffect } from 'react'

function TimeInput({ hours: initialHours = 0, minutes: initialMinutes = 0, onChange }) {
  const [hours, setHours] = useState(initialHours || 0)
  const [minutes, setMinutes] = useState(initialMinutes || 0)
  const [hoursInput, setHoursInput] = useState(String(initialHours || 0).padStart(2, '0'))
  const [minutesInput, setMinutesInput] = useState(String(initialMinutes || 0).padStart(2, '0'))
  const [isHoursFocused, setIsHoursFocused] = useState(false)
  const [isMinutesFocused, setIsMinutesFocused] = useState(false)

  // Update local state when props change
  useEffect(() => {
    if (!isHoursFocused) {
      setHours(initialHours || 0)
      setHoursInput(String(initialHours || 0).padStart(2, '0'))
    }
  }, [initialHours, isHoursFocused])

  useEffect(() => {
    if (!isMinutesFocused) {
      setMinutes(initialMinutes || 0)
      setMinutesInput(String(initialMinutes || 0).padStart(2, '0'))
    }
  }, [initialMinutes, isMinutesFocused])

  const minuteOptions = [0, 15, 30, 45]

  const handleHoursChange = (delta) => {
    const newHours = Math.max(0, hours + delta)
    setHours(newHours)
    setHoursInput(String(newHours).padStart(2, '0'))
    if (onChange) {
      onChange(newHours, minutes)
    }
  }

  const handleHoursInputChange = (e) => {
    const value = e.target.value
    // Allow empty string for editing, or valid numbers
    if (value === '' || /^\d+$/.test(value)) {
      setHoursInput(value)
    }
  }

  const handleHoursBlur = () => {
    setIsHoursFocused(false)
    let parsedHours = parseInt(hoursInput, 10)
    if (isNaN(parsedHours) || parsedHours < 0) {
      parsedHours = 0
    }
    // Cap at reasonable maximum (e.g., 9999 hours)
    parsedHours = Math.min(parsedHours, 9999)
    setHours(parsedHours)
    setHoursInput(String(parsedHours).padStart(2, '0'))
    if (onChange) {
      onChange(parsedHours, minutes)
    }
  }

  const handleHoursFocus = (e) => {
    setIsHoursFocused(true)
    // Remove leading zeros when focusing for easier editing
    setHoursInput(String(parseInt(hoursInput, 10) || 0))
    // Select all text so typing replaces the value
    setTimeout(() => {
      e.target.select()
    }, 0)
  }

  const handleMinutesChange = (delta) => {
    let newMinutes
    // If current minutes is in the preset options, cycle through them
    if (minuteOptions.includes(minutes)) {
      let currentIndex = minuteOptions.indexOf(minutes)
      let newIndex = currentIndex + delta
      
      // Loop through options
      if (newIndex < 0) {
        newIndex = minuteOptions.length - 1
      } else if (newIndex >= minuteOptions.length) {
        newIndex = 0
      }
      
      newMinutes = minuteOptions[newIndex]
    } else {
      // If manually entered value, find closest preset and move from there
      const closestIndex = minuteOptions.reduce((prev, curr, idx) => 
        Math.abs(curr - minutes) < Math.abs(minuteOptions[prev] - minutes) ? idx : prev, 0
      )
      let newIndex = closestIndex + delta
      
      // Loop through options
      if (newIndex < 0) {
        newIndex = minuteOptions.length - 1
      } else if (newIndex >= minuteOptions.length) {
        newIndex = 0
      }
      
      newMinutes = minuteOptions[newIndex]
    }
    
    setMinutes(newMinutes)
    setMinutesInput(String(newMinutes).padStart(2, '0'))
    if (onChange) {
      onChange(hours, newMinutes)
    }
  }

  const handleMinutesInputChange = (e) => {
    const value = e.target.value
    // Allow empty string for editing, or valid numbers
    if (value === '' || /^\d+$/.test(value)) {
      setMinutesInput(value)
    }
  }

  const handleMinutesBlur = () => {
    setIsMinutesFocused(false)
    let parsedMinutes = parseInt(minutesInput, 10)
    if (isNaN(parsedMinutes) || parsedMinutes < 0) {
      parsedMinutes = 0
    }
    // Cap at 59 minutes
    parsedMinutes = Math.min(parsedMinutes, 59)
    // Allow any minute value when manually entered (0-59)
    setMinutes(parsedMinutes)
    setMinutesInput(String(parsedMinutes).padStart(2, '0'))
    if (onChange) {
      onChange(hours, parsedMinutes)
    }
  }

  const handleMinutesFocus = (e) => {
    setIsMinutesFocused(true)
    // Remove leading zeros when focusing for easier editing
    setMinutesInput(String(parseInt(minutesInput, 10) || 0))
    // Select all text so typing replaces the value
    setTimeout(() => {
      e.target.select()
    }, 0)
  }

  const handleMinutesKeyDown = (e) => {
    // Allow arrow keys for increment/decrement
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      handleMinutesChange(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleMinutesChange(-1)
    }
  }

  const handleHoursKeyDown = (e) => {
    // Allow arrow keys for increment/decrement
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      handleHoursChange(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleHoursChange(-1)
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
        <input
          type="text"
          value={hoursInput}
          onChange={handleHoursInputChange}
          onBlur={handleHoursBlur}
          onFocus={handleHoursFocus}
          onKeyDown={handleHoursKeyDown}
          className="w-12 h-16 text-center bg-gray-800 border border-gray-700 text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Hours"
        />
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
        <input
          type="text"
          value={minutesInput}
          onChange={handleMinutesInputChange}
          onBlur={handleMinutesBlur}
          onFocus={handleMinutesFocus}
          onKeyDown={handleMinutesKeyDown}
          className="w-12 h-16 text-center bg-gray-800 border border-gray-700 text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Minutes"
        />
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


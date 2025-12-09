import { useState, useEffect } from 'react'
import TimeInput from './TimeInput'

function GameInfoModal({ isOpen, onClose, onSave, game, isTimeOnly = false }) {
  const [dateStarted, setDateStarted] = useState('')
  const [dateBought, setDateBought] = useState('')
  const [price, setPrice] = useState('')
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)

  useEffect(() => {
    if (isOpen && game) {
      // Load existing game info if available
      setDateStarted(game.dateStarted || '')
      setDateBought(game.dateBought || '')
      setPrice(game.price || '')
      
      // For time input: if time-only mode, start at 0 (to add time)
      // Otherwise, show existing time or 0
      if (isTimeOnly) {
        // In time-only mode, always start at 0 to add time
        setHours(0)
        setMinutes(0)
      } else {
        // When adding new game or editing all info, show existing time or 0
        if (game.timePlayed) {
          const totalMinutes = game.timePlayed
          const hoursValue = Math.floor(totalMinutes / 60)
          const minutesValue = totalMinutes % 60
          setHours(hoursValue)
          // Round minutes to nearest 15-minute increment
          const minuteOptions = [0, 15, 30, 45]
          const closestMinute = minuteOptions.reduce((prev, curr) => 
            Math.abs(curr - minutesValue) < Math.abs(prev - minutesValue) ? curr : prev
          )
          setMinutes(closestMinute)
        } else {
          setHours(0)
          setMinutes(0)
        }
      }
    }
  }, [isOpen, game, isTimeOnly])

  const handleTimeChange = (newHours, newMinutes) => {
    setHours(newHours)
    setMinutes(newMinutes)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const newTimeEntered = (hours * 60) + minutes
    
    // If in time-only mode, add to existing time. Otherwise, use the entered time as base
    const existingTimePlayed = game.timePlayed || 0
    const timePlayed = isTimeOnly 
      ? existingTimePlayed + newTimeEntered 
      : newTimeEntered
    
    const gameInfo = {
      ...game,
      dateStarted: isTimeOnly ? game.dateStarted : dateStarted,
      dateBought: isTimeOnly ? game.dateBought : dateBought,
      price: isTimeOnly ? game.price : price,
      timePlayed: timePlayed
    }

    onSave(gameInfo)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isTimeOnly ? "Update time played" : "Enter game information"}
    >
      <div
        className="bg-gray-800 rounded-2xl p-6 md:p-8 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {isTimeOnly ? 'Update Time Played' : 'Tell us about this game'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isTimeOnly && (
            <>
              {/* Date Started */}
              <div>
                <label htmlFor="dateStarted" className="block text-sm font-medium text-gray-300 mb-2">
                  When did you start playing?
                </label>
                <input
                  type="date"
                  id="dateStarted"
                  value={dateStarted}
                  onChange={(e) => setDateStarted(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  aria-required="false"
                />
              </div>

              {/* Date Bought */}
              <div>
                <label htmlFor="dateBought" className="block text-sm font-medium text-gray-300 mb-2">
                  When did you buy it?
                </label>
                <input
                  type="date"
                  id="dateBought"
                  value={dateBought}
                  onChange={(e) => setDateBought(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  aria-required="false"
                />
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
                  How much did it cost?
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    aria-required="false"
                  />
                </div>
              </div>
            </>
          )}

          {/* Time Played */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4">
              {isTimeOnly ? 'Add Time Played' : 'Time Played'}
            </label>
            {isTimeOnly && game.timePlayed > 0 && (
              <div className="mb-3 text-center text-sm text-gray-400">
                Current: {Math.floor(game.timePlayed / 60)}h {game.timePlayed % 60}m
              </div>
            )}
            <div className="flex justify-center">
              <TimeInput
                hours={hours}
                minutes={minutes}
                onChange={handleTimeChange}
              />
            </div>
            {isTimeOnly && (
              <div className="mt-3 text-center text-xs text-gray-500">
                This will be added to your existing time
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GameInfoModal


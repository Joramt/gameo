# Storage Service

Abstract storage layer for persisting game library data. Currently uses `sessionStorage`, but can be easily swapped to use a database/API.

## Usage

```javascript
import { storageService } from './services/storage'

// Get all games for a user
const games = await storageService.getGames(userId)

// Add a game to library
await storageService.addGame(userId, game)

// Remove a game from library
await storageService.removeGame(userId, gameId)

// Check if game exists
const exists = await storageService.hasGame(userId, gameId, steamAppId)
```

## Switching to Database Storage

To switch from `sessionStorage` to database storage, simply change the import in `storage.js`:

```javascript
// In src/services/storage.js, change:
export const storageService = createStorageService('session')

// To:
export const storageService = createStorageService('database', { 
  apiUrl: 'https://api.gameo.com' 
})
```

Then implement the methods in `DatabaseStorageService` class to make API calls to your backend.

## Storage Types

- **session**: Uses browser `sessionStorage` (cleared when tab closes)
- **database**: Uses API calls to backend (requires implementation)


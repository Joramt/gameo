# Gameo Backend Server

Node.js backend server for Gameo that handles authentication, budget management, and proxies Steam API requests with caching.

## Features

- ✅ User authentication (signup, login, logout)
- ✅ Budget management (create/update user budgets)
- ✅ Steam API proxy with CORS whitelist
- ✅ 7-day cache expiration for Steam API responses
- ✅ Cache busting endpoint
- ✅ Rate limiting (100 requests/15min global, 50 requests/15min for Steam endpoints)
- ✅ Request logging
- ✅ Health check endpoint
- ✅ JWT-based authentication
- ✅ Supabase database integration

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# JWT Secret (generate a secure random string for production)
JWT_SECRET=your-secret-key-change-in-production

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Steam Integration (see ENV_SETUP.md for details)
STEAM_API_KEY=your-steam-api-key-from-steam-community-dev
STEAM_RETURN_URL=http://localhost:3000/api/integrations/steam/callback
FRONTEND_URL=http://localhost:5173
```

**📖 For detailed instructions on where to find these values, see [ENV_SETUP.md](./ENV_SETUP.md)**

4. Set up the database schema in Supabase:
   - Run the SQL in `database/schema.sql` in your Supabase SQL editor
   - This creates the `users` and `budgets` tables

4. Start the server:
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

#### Sign Up
```
POST /api/auth/signup
Body: { name, email, password }
Returns: { token, user: { id, email, name } }
```

#### Login
```
POST /api/auth/login
Body: { email, password }
Returns: { token, user: { id, email, name } }
```

#### Get Current User
```
GET /api/auth/me
Headers: Authorization: Bearer <token>
Returns: { id, email, name }
```

#### Logout
```
POST /api/auth/logout
Headers: Authorization: Bearer <token>
Returns: { message: "Logged out successfully" }
```

### Budget Management

#### Get Budget
```
GET /api/budget
Headers: Authorization: Bearer <token>
Returns: { budget: { id, amount, period, created_at, updated_at } }
Status: 404 if no budget found
```

#### Create/Update Budget
```
POST /api/budget
Headers: Authorization: Bearer <token>
Body: { amount: number, period: "weekly" | "monthly" | "yearly" }
Returns: { budget: { id, amount, period, created_at, updated_at } }
```

### Steam API

### Health Check
```
GET /health
```

### Search Games
```
GET /api/steam/search?q=searchTerm
```
- Searches Steam for games
- Cached for 7 days
- Returns: `{ total, items, timestamp, cached }`

### Get Game Details
```
GET /api/steam/games?ids=appId1,appId2,appId3
```
- Gets detailed information for multiple games (max 10)
- Cached for 7 days
- Returns: `{ games, timestamp, cached }`

### Cache Management

#### Get Cache Stats
```
GET /api/steam/cache/stats
```
- Returns cache statistics and sample keys

#### Bust Cache
```
DELETE /api/steam/cache?key=cacheKey
DELETE /api/steam/cache?all=true
```
- Clear specific cache key or all cache

## CORS Configuration

The server only accepts requests from whitelisted origins. Configure allowed origins in `.env`:

```env
ALLOWED_ORIGINS=http://localhost:5173,https://gameo.com,https://www.gameo.com
```

## Rate Limiting

- **Global**: 100 requests per 15 minutes per IP
- **Steam endpoints**: 50 requests per 15 minutes per IP

## Caching

- Cache TTL: 7 days (604,800 seconds)
- Cache check period: 1 hour
- Uses `node-cache` for in-memory caching

**For production**, consider using Redis instead of `node-cache` for:
- Distributed caching across multiple server instances
- Better memory management
- Persistence across server restarts

## Production Considerations

1. **Use Redis for caching** instead of `node-cache` for multi-instance deployments
2. **Add authentication** to cache busting endpoint
3. **Set up monitoring** (e.g., Prometheus, DataDog)
4. **Add request ID tracking** for debugging
5. **Implement retry logic** for Steam API failures
6. **Add request/response logging** to external service
7. **Set up health checks** for load balancer

## Database Recommendations

See `../DATABASE_RECOMMENDATIONS.md` for detailed database recommendations for supporting 100,000 concurrent users.


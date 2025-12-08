# Backend Setup Guide

## Quick Start

1. **Install backend dependencies:**
```bash
cd server
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the server:**
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

4. **Configure frontend:**
Add to your frontend `.env` file:
```env
VITE_API_URL=http://localhost:3000
```

## API Endpoints

### Search Games
```
GET /api/steam/search?q=searchTerm
```
Returns cached Steam search results (7-day cache).

### Get Game Details
```
GET /api/steam/games?ids=appId1,appId2,appId3
```
Returns detailed game information (max 10 games, 7-day cache).

### Cache Management
```
GET /api/steam/cache/stats
DELETE /api/steam/cache?key=cacheKey
DELETE /api/steam/cache?all=true
```

## Features

✅ **CORS Whitelist** - Only allows requests from configured origins
✅ **7-Day Caching** - Reduces Steam API calls significantly
✅ **Cache Busting** - Clear cache when needed
✅ **Rate Limiting** - Prevents abuse (100 req/15min global, 50 req/15min Steam)
✅ **Error Handling** - Graceful fallbacks
✅ **Request Logging** - Track all API calls

## Production Considerations

1. **Use Redis instead of node-cache** for distributed caching
2. **Add authentication** to cache busting endpoint
3. **Set up monitoring** (Prometheus, DataDog, etc.)
4. **Configure proper CORS** for production domain
5. **Use environment variables** for all configuration
6. **Set up load balancing** for high availability

## Database Recommendations

See `DATABASE_RECOMMENDATIONS.md` for detailed recommendations for supporting 100,000 concurrent users.

**Quick recommendation:** PostgreSQL + Redis


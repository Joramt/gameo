// CRITICAL: Import config.js FIRST to load environment variables
// This must be the very first import
import './config.js'

// Now import everything else AFTER env vars are loaded
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { steamRouter } from './routes/steam.js'
import { authRouter } from './routes/auth.js'
import { budgetRouter } from './routes/budget.js'
import { integrationsRouter } from './routes/integrations.js'
import { gamesRouter } from './routes/games.js'
import { gamesEnrichmentRouter } from './routes/gamesEnrichment.js'
import { imagesRouter } from './routes/images.js'

// Verify routes are loaded
console.log('✅ Routes loaded:', {
  steam: !!steamRouter,
  auth: !!authRouter,
  budget: !!budgetRouter,
  integrations: !!integrationsRouter,
  games: !!gamesRouter
})

const app = express()
const PORT = process.env.PORT || 3000

// CORS Configuration - Whitelist only your app
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000']

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) {
      return callback(null, true)
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // Log the blocked origin for debugging
      console.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`)
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  // Also log the full URL for debugging
  if (req.path.includes('/api/auth')) {
    console.log(`  Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`)
  }
  next()
})

// Global rate limiting - Very lenient to handle large syncs (200+ games) plus normal operations
// Users sync games one-by-one for console feedback, so we need high limits
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2500, // Limit each IP to 2500 requests per windowMs (allows 200+ games sync + normal operations)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health'
  }
})

// More lenient rate limiting for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Allow 100 login/signup attempts per IP per 15 minutes
  message: 'Too many authentication requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests (only failed attempts count)
})

// Apply global rate limiter to all routes except auth (auth has its own)
app.use((req, res, next) => {
  // Skip global limiter for auth routes (they have their own)
  if (req.path.startsWith('/api/auth')) {
    return next()
  }
  globalRateLimiter(req, res, next)
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API Routes
try {
  app.use('/api/steam', steamRouter)
  console.log('✅ Registered /api/steam routes')
  
  app.use('/api/auth', authRateLimiter, authRouter)
  console.log('✅ Registered /api/auth routes (with rate limiting)')
  
  app.use('/api/budget', budgetRouter)
  console.log('✅ Registered /api/budget routes')
  
  app.use('/api/integrations', integrationsRouter)
  console.log('✅ Registered /api/integrations routes')
  
  app.use('/api/games', gamesRouter)
  app.use('/api/games', gamesEnrichmentRouter)
  console.log('✅ Registered /api/games routes')
  
  app.use('/api/images', imagesRouter)
  console.log('✅ Registered /api/images routes')
  
  // Test route registration
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API routes are working', timestamp: new Date().toISOString() })
  })
  console.log('✅ Registered /api/test route')
} catch (error) {
  console.error('❌ Error registering routes:', error)
}

// Debug middleware - log all unmatched routes
app.use((req, res, next) => {
  console.log(`⚠️ Unmatched route: ${req.method} ${req.path}`)
  console.log(`   Original URL: ${req.originalUrl}`)
  console.log(`   Base URL: ${req.baseUrl}`)
  next()
})

// 404 handler
app.use((req, res) => {
  console.error(`❌ 404 - Endpoint not found: ${req.method} ${req.path}`)
  res.status(404).json({ error: 'Endpoint not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gameo Backend Server running on port ${PORT}`)
  console.log(`📡 Allowed origins: ${allowedOrigins.join(', ')}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app


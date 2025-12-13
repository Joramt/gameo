import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { steamRouter } from './routes/steam.js'
import { authRouter } from './routes/auth.js'
import { budgetRouter } from './routes/budget.js'

// Verify routes are loaded
console.log('✅ Routes loaded:', {
  steam: !!steamRouter,
  auth: !!authRouter,
  budget: !!budgetRouter
})

dotenv.config()

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
  next()
})

// Global rate limiting - 100 requests per 15 minutes per IP
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(globalRateLimiter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API Routes
app.use('/api/steam', steamRouter)
app.use('/api/auth', authRouter)
app.use('/api/budget', budgetRouter)

// 404 handler
app.use((req, res) => {
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


// Load environment variables FIRST - this must run before any other module
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// Get server directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env files - try server/.env first, then root .env, then default location
const serverEnvPath = join(__dirname, '.env')
const rootEnvPath = join(__dirname, '..', '.env')

console.log('🔍 Loading environment variables...')
console.log(`   server/.env exists: ${existsSync(serverEnvPath)}`)
console.log(`   root .env exists: ${existsSync(rootEnvPath)}`)
console.log(`   Current working directory: ${process.cwd()}`)

let envLoaded = false
if (existsSync(serverEnvPath)) {
  console.log(`   Loading: ${serverEnvPath}`)
  const result = dotenv.config({ path: serverEnvPath })
  if (result.error) {
    console.error('   ❌ Error loading server/.env:', result.error)
  } else {
    const varCount = Object.keys(result.parsed || {}).length
    console.log(`   ✅ Loaded server/.env: ${varCount} variables`)
    if (result.parsed) {
      console.log(`   Variables: ${Object.keys(result.parsed).join(', ')}`)
    }
    envLoaded = true
  }
}
if (existsSync(rootEnvPath)) {
  console.log(`   Loading: ${rootEnvPath}`)
  const result = dotenv.config({ path: rootEnvPath, override: false })
  if (result.error) {
    console.error('   ❌ Error loading root .env:', result.error)
  } else {
    const varCount = Object.keys(result.parsed || {}).length
    console.log(`   ✅ Loaded root .env: ${varCount} variables`)
    envLoaded = true
  }
}
// Also try default location (current working directory) - don't override if already loaded
if (!envLoaded) {
  console.log(`   Trying default location: ${process.cwd()}/.env`)
  const result = dotenv.config({ override: false })
  if (result.error) {
    console.error('   ❌ Error loading default .env:', result.error)
  } else if (result.parsed) {
    console.log(`   ✅ Loaded default .env: ${Object.keys(result.parsed).length} variables`)
  }
}

// Verify env vars are loaded
console.log('🔍 Environment check after loading:', {
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
  hasUrl: !!process.env.SUPABASE_URL,
  serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
  allSupabaseVars: Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ')
})

// Export nothing - this file just loads env vars
export {}

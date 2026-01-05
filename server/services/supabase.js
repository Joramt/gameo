import { createClient } from '@supabase/supabase-js'
// Note: dotenv.config() should be called in server.js BEFORE this module is imported
// This ensures environment variables are loaded before we try to use them

// DEBUG: Log what we see in process.env at module load time
const allEnvKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE'))
console.log(`[supabase.js] Module loaded. SUPABASE env vars available: ${allEnvKeys.join(', ') || 'NONE'}`)

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

// DEBUG: Log what we found
console.log(`[supabase.js] Environment check:`, {
  hasUrl: !!supabaseUrl,
  hasServiceKey: !!serviceKey,
  hasAnonKey: !!anonKey,
  urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : null,
  serviceKeyValue: serviceKey ? `${serviceKey.substring(0, 30)}...` : null
})

// Prefer service role key for backend operations (bypasses RLS)
// Fall back to anon key only if service role key is not available
const supabaseKey = serviceKey || anonKey

// Log what we found
if (serviceKey) {
  console.log('✅ Using SERVICE_ROLE_KEY (RLS bypassed - appropriate for backend)')
  console.log(`   Key length: ${serviceKey.length} characters`)
  console.log(`   Key preview: ${serviceKey.substring(0, 30)}...`)
} else if (anonKey) {
  console.warn('⚠️ Using ANON_KEY (RLS will apply - ensure proper policies are set)')
  console.warn('   SUPABASE_SERVICE_ROLE_KEY is not set!')
  console.warn(`   Available env vars starting with SUPABASE_:`, Object.keys(process.env).filter(k => k.startsWith('SUPABASE_')).join(', '))
} else {
  console.error('❌ Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_ANON_KEY is set!')
  console.error(`   All env vars containing SUPABASE:`, Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ') || 'NONE')
}

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set!')
}

// Create Supabase client
let supabase = null
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('✅ Supabase client initialized successfully')
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error.message)
  }
} else {
  console.error('❌ Supabase client not initialized - missing SUPABASE_URL or keys')
  console.error(`   SUPABASE_URL: ${supabaseUrl ? 'set' : 'NOT SET'}`)
  console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceKey ? 'set' : 'NOT SET'}`)
  console.error(`   SUPABASE_ANON_KEY: ${anonKey ? 'set' : 'NOT SET'}`)
}

// Function to create a fresh Supabase client for auth operations
// This prevents session conflicts when multiple users authenticate simultaneously
export const createAuthClient = () => {
  const authSupabaseUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  
  if (!authSupabaseUrl || !anonKey) {
    console.error('❌ Cannot create auth client - missing SUPABASE_URL or SUPABASE_ANON_KEY')
    return null
  }
  
  // Use anon key for auth operations (needed for Supabase Auth)
  return createClient(authSupabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export { supabase as default }
export { supabase }


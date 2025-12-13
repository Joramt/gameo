import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
// Use anon key for regular auth operations
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file')
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Log configuration status
if (supabase) {
  console.log('✅ Supabase client initialized')
} else {
  console.error('❌ Supabase client not initialized - check your .env file')
}


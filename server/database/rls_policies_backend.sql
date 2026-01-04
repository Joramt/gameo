-- RLS Policies for Backend Server
-- 
-- IMPORTANT: Your backend server should use SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_ANON_KEY)
-- The service role key automatically bypasses RLS, which is the correct behavior for backend servers.
--
-- If you want to keep RLS enabled for client-side access (frontend using Supabase client directly),
-- you can use these policies. However, note that:
-- - The backend should still use SERVICE_ROLE_KEY (bypasses RLS)
-- - These policies only apply to requests using ANON_KEY (e.g., from the frontend if using Supabase client directly)
--
-- These policies assume you're using Supabase Auth (auth.uid()).
-- Since your backend uses custom JWT, the backend MUST use SERVICE_ROLE_KEY to work with RLS enabled.

-- Enable RLS on tables (if not already enabled)
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow recreation)
DROP POLICY IF EXISTS "Users can read own integrations" ON user_integrations;
DROP POLICY IF EXISTS "Users can insert own integrations" ON user_integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON user_integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON user_integrations;

DROP POLICY IF EXISTS "Users can read own games" ON user_games;
DROP POLICY IF EXISTS "Users can insert own games" ON user_games;
DROP POLICY IF EXISTS "Users can update own games" ON user_games;
DROP POLICY IF EXISTS "Users can delete own games" ON user_games;

-- User Integrations Policies (for client-side access only)
CREATE POLICY "Users can read own integrations" ON user_integrations 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations" ON user_integrations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON user_integrations 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON user_integrations 
  FOR DELETE USING (auth.uid() = user_id);

-- User Games Policies (for client-side access only)
CREATE POLICY "Users can read own games" ON user_games 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games" ON user_games 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games" ON user_games 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own games" ON user_games 
  FOR DELETE USING (auth.uid() = user_id);


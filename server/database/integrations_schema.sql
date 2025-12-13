-- User Integrations Table
-- Stores connected third-party services (Steam, Epic Games, etc.)

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL, -- 'steam', 'epic', etc.
  external_id VARCHAR(255) NOT NULL, -- Service-specific user ID (e.g., Steam ID)
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB, -- Additional service-specific data
  UNIQUE(user_id, service) -- One connection per service per user
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_service ON user_integrations(service);
CREATE INDEX IF NOT EXISTS idx_user_integrations_external_id ON user_integrations(external_id);

-- Enable Row Level Security (if using Supabase)
-- ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on your security needs):
-- CREATE POLICY "Users can read own integrations" ON user_integrations 
--   FOR SELECT USING (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can insert own integrations" ON user_integrations 
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can update own integrations" ON user_integrations 
--   FOR UPDATE USING (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can delete own integrations" ON user_integrations 
--   FOR DELETE USING (auth.uid() = user_id);


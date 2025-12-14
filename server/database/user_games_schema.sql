-- User Games Table
-- Stores games in user's library

CREATE TABLE IF NOT EXISTS user_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  image TEXT,
  release_date VARCHAR(50), -- Stored as formatted string like "Jan 2024"
  studio VARCHAR(255),
  steam_app_id VARCHAR(50), -- Steam App ID if synced from Steam
  date_started DATE,
  date_bought DATE,
  price DECIMAL(10, 2),
  time_played INTEGER, -- Total minutes played
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, steam_app_id) -- One game per steam_app_id per user (if steam_app_id exists)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_games_user_id ON user_games(user_id);
CREATE INDEX IF NOT EXISTS idx_user_games_steam_app_id ON user_games(steam_app_id);
CREATE INDEX IF NOT EXISTS idx_user_games_name ON user_games(name);

-- Enable Row Level Security (if using Supabase)
-- ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on your security needs):
-- CREATE POLICY "Users can read own games" ON user_games 
--   FOR SELECT USING (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can insert own games" ON user_games 
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can update own games" ON user_games 
--   FOR UPDATE USING (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can delete own games" ON user_games 
--   FOR DELETE USING (auth.uid() = user_id);


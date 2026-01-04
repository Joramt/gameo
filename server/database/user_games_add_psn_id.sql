-- Add psn_id column to user_games table to track PSN games
ALTER TABLE user_games 
ADD COLUMN IF NOT EXISTS psn_id VARCHAR(100);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_games_psn_id ON user_games(psn_id);


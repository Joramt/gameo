-- Add last_played column to user_games table
-- This tracks when the game was last played (useful for sorting and filtering)

ALTER TABLE user_games 
ADD COLUMN IF NOT EXISTS last_played TIMESTAMP WITH TIME ZONE;

-- Create index for faster sorting by last_played
CREATE INDEX IF NOT EXISTS idx_user_games_last_played ON user_games(last_played DESC NULLS LAST);


-- Add psn_platform column to user_games table to store PS4/PS5 platform info
ALTER TABLE user_games 
ADD COLUMN IF NOT EXISTS psn_platform VARCHAR(10); -- 'PS4' or 'PS5'


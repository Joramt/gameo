-- Add country, language, and age columns to user_profiles table
-- These are required for PSN SearchGame API integration

-- Add columns with defaults for existing users
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS country VARCHAR(10) DEFAULT 'US',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 19;

-- Update existing rows to have default values
UPDATE user_profiles
SET 
  country = COALESCE(country, 'US'),
  language = COALESCE(language, 'en'),
  age = COALESCE(age, 19)
WHERE country IS NULL OR language IS NULL OR age IS NULL;

-- Now make them NOT NULL (after setting defaults)
ALTER TABLE user_profiles
ALTER COLUMN country SET NOT NULL,
ALTER COLUMN language SET NOT NULL,
ALTER COLUMN age SET NOT NULL;

-- Add comments
COMMENT ON COLUMN user_profiles.country IS 'ISO country code (e.g., US, GB, FR) for PSN API';
COMMENT ON COLUMN user_profiles.language IS 'ISO language code (e.g., en, fr, es) for PSN API';
COMMENT ON COLUMN user_profiles.age IS 'User age (5 for <18, 19 for 18+) for PSN API';


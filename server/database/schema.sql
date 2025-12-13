-- Gameo Database Schema for Supabase/PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL, -- bcrypt hashed password
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- One budget per user
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);

-- Enable Row Level Security (RLS) if using Supabase
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on your security needs):
-- Policy for users to read their own data
-- CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can read own budget" ON budgets FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can update own budget" ON budgets FOR ALL USING (auth.uid() = user_id);


# Environment Variables Setup Guide

This guide explains where to find each environment variable needed for Steam integration.

## Required Environment Variables

### 1. STEAM_API_KEY

**What it is:** Your Steam Web API key used to access Steam's API services.

**Where to get it:**
1. Go to [Steam Web API Key Registration](https://steamcommunity.com/dev/apikey)
2. Sign in with your Steam account
3. You'll see a form asking for:
   - **Domain Name**: Enter your website domain (e.g., `gameo.com`) or `localhost` for development
   - **Agree to Terms**: Check the agreement checkbox
4. Click "Register" 
5. Your API key will be displayed on the page (it looks like: `1234567890ABCDEF1234567890ABCDEF`)

**Note:** 
- You can use `localhost` as the domain for development
- The key is free and there are rate limits (100,000 calls/day by default)
- Keep this key secret - don't commit it to version control

---

### 2. STEAM_RETURN_URL

**What it is:** The URL where Steam redirects users after they authenticate with their Steam account.

**Where to set it:**
- **For local development:** `http://localhost:3000/api/integrations/steam/callback`
- **For production:** `https://your-backend-domain.com/api/integrations/steam/callback`

**How it works:**
- This is the callback endpoint that handles the Steam authentication response
- It's already implemented in `server/routes/integrations.js`
- Make sure this URL matches your backend server URL

**Example values:**
```env
# Local development
STEAM_RETURN_URL=http://localhost:3000/api/integrations/steam/callback

# Production (replace with your actual backend URL)
STEAM_RETURN_URL=https://api.gameo.com/api/integrations/steam/callback
```

---

### 3. FRONTEND_URL

**What it is:** The URL of your frontend React application where users will be redirected after Steam authentication.

**Where to set it:**
- **For local development:** `http://localhost:5173` (default Vite dev server port)
- **For production:** `https://your-frontend-domain.com` or `https://gameo.com`

**How it works:**
- After Steam authentication completes, users are redirected back to your frontend
- The frontend URL is used to build the redirect URL after successful authentication

**Example values:**
```env
# Local development
FRONTEND_URL=http://localhost:5173

# Production
FRONTEND_URL=https://gameo.com
```

---

## Setting Up Your `.env` File

1. Create a `.env` file in the `server/` directory (if it doesn't exist)

2. Add all required variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# JWT Secret (generate a secure random string)
JWT_SECRET=your-secret-key-change-in-production-use-random-string

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Steam Integration
STEAM_API_KEY=your-steam-api-key-from-steam-community-dev
STEAM_RETURN_URL=http://localhost:3000/api/integrations/steam/callback
FRONTEND_URL=http://localhost:5173
```

3. **Never commit `.env` to version control** - it's already in `.gitignore`

---

## Quick Setup Steps

### Step 1: Get Steam API Key
1. Visit: https://steamcommunity.com/dev/apikey
2. Enter domain (use `localhost` for dev)
3. Copy the API key

### Step 2: Set Local Development URLs
For local development, use:
```env
STEAM_RETURN_URL=http://localhost:3000/api/integrations/steam/callback
FRONTEND_URL=http://localhost:5173
```

### Step 3: Production URLs
When deploying, update to your production domains:
```env
STEAM_RETURN_URL=https://api.yourdomain.com/api/integrations/steam/callback
FRONTEND_URL=https://yourdomain.com
```

---

## Testing the Setup

After setting up your environment variables:

1. Restart your backend server to load the new environment variables
2. Try connecting your Steam account from the Integrations page
3. Check the server logs for any errors related to missing environment variables

---

## Troubleshooting

**"Steam API key not configured" error:**
- Make sure `STEAM_API_KEY` is set in your `.env` file
- Restart your server after adding it

**Redirect URL mismatch:**
- Ensure `STEAM_RETURN_URL` matches exactly what you registered with Steam
- Check that the backend server is accessible at that URL

**Frontend redirect not working:**
- Verify `FRONTEND_URL` is correct
- Make sure CORS is configured to allow requests from your frontend URL


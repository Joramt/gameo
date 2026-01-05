# Railway Quick Start - 10 Minutes

Fastest way to deploy Gameo to Railway.

## Prerequisites

- ✅ Code pushed to GitHub
- ✅ Railway account (free at [railway.app](https://railway.app))
- ✅ Auth0 account

## Step-by-Step

### 1. Create Railway Project (2 min)

1. Go to [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → Select `gameo` repo
3. Project created! ✅

### 2. Deploy Backend (3 min)

1. In project, click **"+ New"** → **GitHub Repo** → Select `gameo`
2. Click the new service → **Settings**
3. Set **Root Directory:** `server`
4. Go to **Variables** → Add:
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://placeholder.railway.app
   ```
5. Go to **Settings** → **Networking** → **Generate Domain**
6. **Copy the URL** (e.g., `backend-xxxx.up.railway.app`) 📋

### 3. Deploy Frontend (3 min)

1. In project, click **"+ New"** → **GitHub Repo** → Select `gameo`
2. Click the new service → **Settings**
3. Set **Root Directory:** `/` (or leave empty)
4. Go to **Variables** → Add:
   ```
   VITE_AUTH0_DOMAIN=your-domain.us.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   VITE_API_URL=https://backend-xxxx.up.railway.app
   ```
   (Replace with your backend URL from step 2)
5. Go to **Settings** → **Networking** → **Generate Domain**
6. **Copy the URL** (e.g., `frontend-xxxx.up.railway.app`) 📋

### 4. Update Backend CORS (1 min)

1. Go to **Backend Service** → **Variables**
2. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://frontend-xxxx.up.railway.app
   ```
   (Use your frontend URL from step 3)

### 5. Configure Auth0 (1 min)

1. [Auth0 Dashboard](https://manage.auth0.com) → Your App → **Settings**
2. Update:
   - **Callback URLs:** `https://frontend-xxxx.up.railway.app,https://frontend-xxxx.up.railway.app/*`
   - **Logout URLs:** `https://frontend-xxxx.up.railway.app`
   - **Web Origins:** `https://frontend-xxxx.up.railway.app`
3. **Save**

### 6. Test! 🎉

Visit your frontend URL and test:
- ✅ Login/Sign up
- ✅ Search games
- ✅ Add games

## That's It! 🚀

Your app is live on Railway!

## Troubleshooting

**Not working?**
- Check Railway logs (click service → **Deployments** → **View Logs**)
- Verify environment variables are set
- Check Auth0 URLs match exactly

**Need help?** See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed guide.







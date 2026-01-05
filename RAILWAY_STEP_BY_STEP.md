# Railway Deployment - Step by Step Guide

Follow these steps exactly to deploy Gameo to Railway.

## Prerequisites Checklist

Before starting, make sure you have:
- [ ] Code pushed to GitHub (or GitLab/Bitbucket)
- [ ] Railway account (free at [railway.app](https://railway.app))
- [ ] Auth0 account and application created
- [ ] Auth0 Domain and Client ID ready

---

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign in (or create account - it's free)
3. Click **"New Project"** button (top right)
4. Select **"Deploy from GitHub repo"**
5. Authorize Railway to access your GitHub (if first time)
6. Find and select your `gameo` repository
7. Click **"Deploy Now"**

✅ **Result:** Railway creates a project and starts deploying (this will be your backend)

---

## Step 2: Configure Backend Service

### 2.1 Set Root Directory

1. In your Railway project, you'll see a service (it might be called "gameo" or similar)
2. Click on the service
3. Go to **Settings** tab
4. Scroll to **"Root Directory"**
5. Enter: `server`
6. Click **"Save"**

### 2.2 Set Environment Variables

1. Still in the backend service, go to **Variables** tab
2. Click **"+ New Variable"**
3. Add these variables one by one:

**Variable 1:**
- **Name:** `NODE_ENV`
- **Value:** `production`
- Click **"Add"**

**Variable 2:**
- **Name:** `ALLOWED_ORIGINS`
- **Value:** `https://placeholder.railway.app` (we'll update this later)
- Click **"Add"**

### 2.3 Get Backend URL

1. Go to **Settings** tab → **Networking** section
2. Click **"Generate Domain"** button
3. Railway will create a domain like: `gameo-production-xxxx.up.railway.app`
4. **Copy this URL** - you'll need it for the frontend! 📋

✅ **Result:** Backend is configured and has a URL

---

## Step 3: Create Frontend Service

### 3.1 Add New Service

1. In your Railway project dashboard, click **"+ New"** button (top right)
2. Select **"GitHub Repo"**
3. Select the same `gameo` repository
4. Railway will create a new service

### 3.2 Configure Frontend Service

1. Click on the new frontend service
2. Go to **Settings** tab
3. **Root Directory:** Leave empty (or set to `/`)
4. **Build Command:** Leave empty (Railway will auto-detect `npm run build`)
5. **Start Command:** Leave empty (Railway will use `npm start`)

### 3.3 Set Frontend Environment Variables

1. Go to **Variables** tab in frontend service
2. Click **"+ New Variable"** and add:

**Variable 1:**
- **Name:** `VITE_AUTH0_DOMAIN`
- **Value:** `your-domain.us.auth0.com` (replace with your Auth0 domain)
- Click **"Add"**

**Variable 2:**
- **Name:** `VITE_AUTH0_CLIENT_ID`
- **Value:** `your-client-id-here` (replace with your Auth0 client ID)
- Click **"Add"**

**Variable 3:**
- **Name:** `VITE_API_URL`
- **Value:** `https://your-backend-url.up.railway.app` (use the backend URL from Step 2.3)
- Click **"Add"**

**Variable 4:**
- **Name:** `PORT`
- **Value:** `5173`
- Click **"Add"**

### 3.4 Get Frontend URL

1. Go to **Settings** tab → **Networking** section
2. Click **"Generate Domain"** button
3. Railway will create a domain like: `gameo-production-yyyy.up.railway.app`
4. **Copy this URL** - you'll need it for Auth0 and backend CORS! 📋

✅ **Result:** Frontend is configured and has a URL

---

## Step 4: Update Backend CORS

1. Go back to your **Backend Service**
2. Go to **Variables** tab
3. Find the `ALLOWED_ORIGINS` variable
4. Click the **pencil icon** (edit)
5. Update the value to your frontend URL from Step 3.4:
   ```
   https://gameo-production-yyyy.up.railway.app
   ```
6. Click **"Update"**

✅ **Result:** Backend will automatically redeploy with new CORS settings

---

## Step 5: Configure Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Sign in to your account
3. Go to **Applications** → Click on your application
4. Go to **Settings** tab
5. Scroll to **"Application URIs"** section

### Update Callback URLs:
1. Find **"Allowed Callback URLs"**
2. Add your frontend URL:
   ```
   https://gameo-production-yyyy.up.railway.app,https://gameo-production-yyyy.up.railway.app/*
   ```
   (Replace with your actual frontend URL from Step 3.4)

### Update Logout URLs:
1. Find **"Allowed Logout URLs"**
2. Add your frontend URL:
   ```
   https://gameo-production-yyyy.up.railway.app
   ```

### Update Web Origins:
1. Find **"Allowed Web Origins"**
2. Add your frontend URL:
   ```
   https://gameo-production-yyyy.up.railway.app
   ```

4. Scroll down and click **"Save Changes"**

✅ **Result:** Auth0 is configured for your Railway deployment

---

## Step 6: Wait for Deployments

1. Go back to Railway dashboard
2. You should see both services deploying
3. Wait for both to show **"Active"** status (green checkmark)
4. This usually takes 2-5 minutes

✅ **Result:** Both services are live!

---

## Step 7: Test Your Deployment

1. Open your frontend URL in a browser (from Step 3.4)
2. Test the following:

### Test Authentication:
- [ ] Click "Get Started" or "Sign In"
- [ ] Auth0 login page appears
- [ ] Can sign up or log in
- [ ] Redirects back to dashboard after login

### Test Game Search:
- [ ] Click the "+" card to add a game
- [ ] Search modal opens
- [ ] Type at least 3 characters (e.g., "baldur")
- [ ] Search results appear
- [ ] Can see game names and release dates

### Test Adding Games:
- [ ] Click on a game in search results
- [ ] Game is added to library
- [ ] Game appears in dashboard
- [ ] Refresh page - game still there (sessionStorage)

✅ **Result:** Everything works!

---

## Troubleshooting

### Service Won't Deploy

**Check:**
- Railway logs (click service → **Deployments** → **View Logs**)
- Verify root directory is correct
- Check environment variables are set

### Frontend Shows Blank Page

**Check:**
- Railway logs for build errors
- Verify `VITE_API_URL` is correct
- Check browser console for errors

### Authentication Not Working

**Check:**
- Auth0 URLs match exactly (including `https://`)
- `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` are correct
- Clear browser cache

### API Calls Failing

**Check:**
- Backend is running (check Railway logs)
- `VITE_API_URL` matches backend URL exactly
- `ALLOWED_ORIGINS` includes frontend URL
- Check browser Network tab for CORS errors

---

## Your Railway Setup

After deployment, you'll have:

```
Railway Project: gameo
│
├── Backend Service
│   ├── URL: https://backend-xxxx.up.railway.app
│   ├── Root: /server
│   └── Variables: NODE_ENV, ALLOWED_ORIGINS
│
└── Frontend Service
    ├── URL: https://frontend-yyyy.up.railway.app
    ├── Root: /
    └── Variables: VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_API_URL
```

---

## Next Steps

- [ ] Set up custom domains (optional)
- [ ] Enable Railway monitoring
- [ ] Set up error tracking
- [ ] Review production checklist

---

## Quick Reference

**Backend Variables:**
```
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.railway.app
```

**Frontend Variables:**
```
VITE_AUTH0_DOMAIN=your-domain.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_API_URL=https://your-backend.railway.app
PORT=5173
```

**Auth0 URLs:**
- Callback: `https://your-frontend.railway.app,https://your-frontend.railway.app/*`
- Logout: `https://your-frontend.railway.app`
- Web Origins: `https://your-frontend.railway.app`

---

That's it! Your app is now live on Railway! 🚀







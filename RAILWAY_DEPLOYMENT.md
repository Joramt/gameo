# Railway Deployment Guide

Complete guide to deploy both frontend and backend to Railway.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app) - free tier available)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Auth0 account and application configured

## Step 1: Prepare Your Repository

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push
   ```

2. **Verify these files exist:**
   - ✅ `railway.json` (frontend config)
   - ✅ `server/package.json` (backend config)
   - ✅ `.env` is in `.gitignore` (already done)

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"** (or GitLab/Bitbucket)
4. Choose your `gameo` repository
5. Railway will create a new project

## Step 3: Deploy Backend Service

### 3.1 Create Backend Service

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select the same repository (`gameo`)
3. Railway will detect it as a new service

### 3.2 Configure Backend Service

1. Click on the backend service
2. Go to **Settings** tab
3. Configure:
   - **Root Directory:** `/server`
   - **Build Command:** `npm install` (or leave empty, Railway auto-detects)
   - **Start Command:** `npm start` (or leave empty)

### 3.3 Set Backend Environment Variables

1. Go to **Variables** tab in backend service
2. Add these variables:

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-frontend.railway.app
```

**Note:** You'll update `ALLOWED_ORIGINS` after deploying the frontend.

### 3.4 Get Backend URL

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"** (or use custom domain)
3. Copy the URL (e.g., `backend-production.up.railway.app`)
4. **Save this URL** - you'll need it for frontend configuration

## Step 4: Deploy Frontend Service

### 4.1 Create Frontend Service

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select the same repository (`gameo`)
3. This will be your frontend service

### 4.2 Configure Frontend Service

1. Click on the frontend service
2. Go to **Settings** tab
3. Configure:
   - **Root Directory:** `/` (or leave empty)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run serve` (or `npm start`)

### 4.3 Set Frontend Environment Variables

1. Go to **Variables** tab in frontend service
2. Add these variables:

```env
VITE_AUTH0_DOMAIN=your-domain.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id-here
VITE_API_URL=https://your-backend.railway.app
PORT=5173
```

**Important:**
- Replace `your-backend.railway.app` with your actual backend URL from Step 3.4
- Get Auth0 values from [Auth0 Dashboard](https://manage.auth0.com)

### 4.4 Get Frontend URL

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"** (or use custom domain)
3. Copy the URL (e.g., `frontend-production.up.railway.app`)
4. **Save this URL** - you'll need it for Auth0 and backend CORS

## Step 5: Update Backend CORS

1. Go back to your **Backend Service** → **Variables**
2. Update `ALLOWED_ORIGINS`:
   ```env
   ALLOWED_ORIGINS=https://your-frontend.railway.app
   ```
3. Replace with your actual frontend URL from Step 4.4
4. Railway will automatically redeploy

## Step 6: Configure Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Applications** → Your App → **Settings**
3. Update these fields with your Railway frontend URL:

**Allowed Callback URLs:**
```
https://your-frontend.railway.app,https://your-frontend.railway.app/*
```

**Allowed Logout URLs:**
```
https://your-frontend.railway.app
```

**Allowed Web Origins:**
```
https://your-frontend.railway.app
```

4. Click **Save Changes**

## Step 7: Test Your Deployment

1. Visit your frontend URL (from Step 4.4)
2. Test the following:
   - ✅ Site loads correctly
   - ✅ Authentication (sign up/login)
   - ✅ Game search functionality
   - ✅ Adding games to library
   - ✅ Games persist (sessionStorage)

## Step 8: Custom Domains (Optional)

### For Frontend:

1. In Railway, go to Frontend Service → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Add your domain (e.g., `gameo.com`)
4. Follow Railway's DNS instructions
5. Update Auth0 URLs with your custom domain

### For Backend:

1. In Railway, go to Backend Service → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Add your domain (e.g., `api.gameo.com`)
4. Update `VITE_API_URL` in frontend with new backend domain
5. Update `ALLOWED_ORIGINS` in backend with new frontend domain

## Railway Service Structure

Your Railway project will have:

```
Railway Project: gameo
├── Frontend Service
│   ├── Root: /
│   ├── Build: npm install && npm run build
│   ├── Start: npm run serve
│   └── URL: https://frontend-production.up.railway.app
│
└── Backend Service
    ├── Root: /server
    ├── Build: npm install
    ├── Start: npm start
    └── URL: https://backend-production.up.railway.app
```

## Environment Variables Summary

### Frontend Service Variables:
```env
VITE_AUTH0_DOMAIN=your-domain.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_API_URL=https://backend-production.up.railway.app
PORT=5173
```

### Backend Service Variables:
```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://frontend-production.up.railway.app
```

## Troubleshooting

### Build Fails

**Frontend:**
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Railway uses Node 18 by default)

**Backend:**
- Check that `/server` directory is correct
- Verify `server/package.json` exists
- Check build logs for specific errors

### Frontend Not Serving

- Verify `npm run serve` command works locally
- Check that `dist` folder is created after build
- Ensure `PORT` environment variable is set
- Check Railway logs for errors

### API Calls Failing

- Verify `VITE_API_URL` matches backend URL exactly
- Check backend CORS configuration
- Ensure backend is running (check Railway logs)
- Verify `ALLOWED_ORIGINS` includes frontend URL

### Auth0 Redirect Issues

- Double-check callback URLs in Auth0 dashboard
- Ensure URLs match exactly (including `https://`)
- Clear browser cache and cookies
- Check browser console for errors

### Port Issues

- Railway auto-assigns `PORT` environment variable
- Frontend uses `$PORT` in serve command
- Backend uses `process.env.PORT || 3000`
- Both should work automatically

## Continuous Deployment

Railway automatically:
- ✅ Deploys on every git push to main branch
- ✅ Runs builds automatically
- ✅ Restarts services on code changes
- ✅ Provides deployment logs

## Monitoring

- **Logs:** View real-time logs in Railway dashboard
- **Metrics:** Check service health and resource usage
- **Deployments:** See deployment history and status

## Cost Considerations

**Railway Free Tier:**
- $5 credit per month
- Good for development and testing
- Usage-based pricing after free tier

**Estimated Costs (Production):**
- Frontend: ~$5-10/month (static site)
- Backend: ~$10-20/month (API server)
- Total: ~$15-30/month for moderate traffic

## Next Steps

After successful deployment:
1. Set up custom domains
2. Enable monitoring and alerts
3. Set up error tracking (Sentry, etc.)
4. Configure backups (if using database)
5. Review `PRODUCTION_TODO.md` for remaining tasks

## Quick Reference

**Deploy Backend:**
1. New Service → GitHub Repo
2. Root: `/server`
3. Variables: `NODE_ENV`, `PORT`, `ALLOWED_ORIGINS`
4. Get URL

**Deploy Frontend:**
1. New Service → GitHub Repo
2. Root: `/`
3. Variables: `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_API_URL`
4. Get URL

**Update CORS:**
- Backend `ALLOWED_ORIGINS` = Frontend URL

**Update Auth0:**
- Callback/Logout/Web Origins = Frontend URL






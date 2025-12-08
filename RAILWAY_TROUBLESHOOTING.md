# Railway Troubleshooting Guide

Common issues and solutions when deploying to Railway.

## Docker Build Timeout Error

**Error:**
```
ERROR: failed to build: failed to solve: failed to load cache key: 
failed to do request: Head "https://registry-1.docker.io/v2/...": 
net/http: TLS handshake timeout
```

**Solution:**

Railway is trying to use Docker instead of Railpack. Fix this by:

1. **In Railway Dashboard:**
   - Go to your backend service
   - Click **Settings** tab
   - Scroll to **"Build Settings"**
   - Change **"Builder"** from `DOCKERFILE` to `RAILPACK`
   - Click **Save**

2. **Or add `railpack.toml` to `/server` directory:**
   - Already created! ✅
   - This tells Railway to use Railpack

3. **Or add `railway.json` to `/server` directory:**
   - Already created! ✅
   - This explicitly sets the builder to RAILPACK

4. **Redeploy:**
   - Railway should now use Railpack instead of Docker
   - Railpack is Railway's modern Node.js builder (replaces Nixpacks)

## Frontend Host Blocked Error

**Error:**
```
Blocked request. This host ("gameo-app-production.up.railway.app") is not allowed.
```

**Solution:**
- ✅ Already fixed in `vite.config.js`
- Added `allowedHosts: ['.railway.app']` to preview config
- Commit and push to trigger redeploy

## Service Won't Start

**Check:**
1. Railway logs (click service → **Deployments** → **View Logs**)
2. Verify `package.json` has `start` script
3. Check environment variables are set
4. Verify root directory is correct (`/server` for backend)

## Build Fails

**Common causes:**
- Missing dependencies in `package.json`
- Wrong Node.js version
- Build command incorrect

**Fix:**
1. Check Railway logs for specific error
2. Test build locally: `cd server && npm install && npm start`
3. Verify `server/package.json` exists and is valid

## Port Issues

**Backend:**
- ✅ Already uses `process.env.PORT || 3000`
- Railway automatically sets `PORT` environment variable
- No changes needed

**Frontend:**
- Uses `PORT` environment variable in `vite.config.js`
- Set `PORT=5173` in Railway environment variables

## CORS Errors

**Error:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solution:**
1. Check `ALLOWED_ORIGINS` in backend environment variables
2. Ensure it includes your frontend Railway URL exactly
3. Format: `https://your-frontend.railway.app` (no trailing slash)
4. Redeploy backend after updating

## Environment Variables Not Working

**Frontend:**
- Must start with `VITE_` prefix
- Redeploy after adding/updating
- Check variable names match exactly (case-sensitive)

**Backend:**
- No prefix needed
- Redeploy after adding/updating

## Service Keeps Restarting

**Check:**
1. Railway logs for crash errors
2. Verify start command is correct
3. Check if port is already in use
4. Verify all required environment variables are set

## Build Takes Too Long

**Solutions:**
1. Add `.railwayignore` to exclude unnecessary files
2. Use `.npmrc` to cache dependencies
3. Check for large files in repository

## Can't Connect Services

**Check:**
1. Both services are deployed and active
2. URLs are correct in environment variables
3. Backend CORS allows frontend URL
4. No typos in URLs (check `https://` prefix)

## Quick Fixes

**Force Redeploy:**
1. Go to service → **Settings** → **Deployments**
2. Click **"Redeploy"** button

**Clear Build Cache:**
1. Go to service → **Settings**
2. Scroll to **"Build Cache"**
3. Click **"Clear Cache"**

**Check Service Health:**
1. Go to service dashboard
2. Check **"Metrics"** tab
3. Look for CPU/Memory usage
4. Check **"Logs"** for errors

## Still Having Issues?

1. Check Railway status: [status.railway.app](https://status.railway.app)
2. Review Railway logs carefully
3. Test locally first: `npm install && npm start`
4. Verify all configuration files are committed to Git


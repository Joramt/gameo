# Quick Deploy to Netlify

## 5-Minute Setup

### 1. Push to Git
```bash
git add .
git commit -m "Ready for deployment"
git push
```

### 2. Deploy Backend (Choose one)

**Option A: Railway (Easiest)**
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo → `/server` directory
4. Add environment variables:
   - `ALLOWED_ORIGINS=https://your-site.netlify.app`
   - `NODE_ENV=production`
5. Copy the deployment URL

**Option B: Render**
1. Go to [render.com](https://render.com)
2. New Web Service → Connect GitHub
3. Select repo → `/server` directory
4. Build: `npm install`
5. Start: `npm start`
6. Add environment variables (same as Railway)

### 3. Deploy Frontend to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. **Add new site** → **Import an existing project**
3. Connect your GitHub repository
4. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. **Add environment variables:**
   ```
   VITE_AUTH0_DOMAIN=your-domain.us.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   VITE_API_URL=https://your-backend-url.railway.app
   ```
6. Click **Deploy site**

### 4. Configure Auth0

1. Auth0 Dashboard → Applications → Your App
2. **Allowed Callback URLs:**
   ```
   https://your-site.netlify.app,https://your-site.netlify.app/*
   ```
3. **Allowed Logout URLs:**
   ```
   https://your-site.netlify.app
   ```
4. **Allowed Web Origins:**
   ```
   https://your-site.netlify.app
   ```

### 5. Update Backend CORS

In your backend environment variables, update:
```
ALLOWED_ORIGINS=https://your-site.netlify.app
```

### 6. Test

Visit `https://your-site.netlify.app` and test:
- ✅ Authentication
- ✅ Game search
- ✅ Adding games

## Troubleshooting

**Build fails?**
- Check Netlify build logs
- Ensure `netlify.toml` is committed

**Auth0 not working?**
- Verify callback URLs match exactly
- Check environment variables are set

**API calls failing?**
- Verify `VITE_API_URL` is correct
- Check backend CORS configuration
- Ensure backend is deployed and running

## Next Steps

- Set up custom domain
- Enable Netlify Analytics
- Review `DEPLOYMENT_CHECKLIST.md` for full checklist




# Netlify Deployment Guide

This guide will help you deploy Gameo to Netlify.

## Prerequisites

1. A Netlify account (sign up at [netlify.com](https://netlify.com))
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Backend server deployed separately (see Backend Deployment section)

## Step 1: Prepare Your Repository

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push
   ```

2. **Ensure `.env` is in `.gitignore`** (already done)

## Step 2: Deploy Backend Server

Your backend server (`/server`) needs to be deployed separately. Options:

### Option A: Deploy Backend to Netlify Functions (Recommended for small scale)
- Convert your Express server to Netlify Functions
- See `server/NETLIFY_FUNCTIONS.md` for conversion guide

### Option B: Deploy Backend to a Separate Service
- **Railway**: Easy Node.js deployment
- **Render**: Free tier available
- **Heroku**: Paid option
- **AWS/Google Cloud/Azure**: For production scale

**Important:** Update your frontend `VITE_API_URL` environment variable to point to your deployed backend URL.

## Step 3: Configure Environment Variables in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:

### Required Variables:
```
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_API_URL=https://your-backend-url.com
```

### Optional Variables:
```
VITE_APP_NAME=Gameo
VITE_APP_VERSION=1.0.0
```

## Step 4: Configure Auth0 for Production

1. Go to your Auth0 Dashboard
2. Navigate to **Applications** → Your App → **Settings**
3. Add to **Allowed Callback URLs**:
   ```
   https://your-site.netlify.app,https://your-site.netlify.app/*
   ```
4. Add to **Allowed Logout URLs**:
   ```
   https://your-site.netlify.app
   ```
5. Add to **Allowed Web Origins**:
   ```
   https://your-site.netlify.app
   ```

## Step 5: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended for first deployment)

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Connect your Git repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Add environment variables (see Step 3)
6. Click **Deploy site**

### Option B: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize and deploy:
   ```bash
   netlify init
   netlify deploy --prod
   ```

## Step 6: Update Backend CORS Configuration

Update your backend server's `ALLOWED_ORIGINS` to include your Netlify URL:

```env
ALLOWED_ORIGINS=https://your-site.netlify.app,https://www.your-site.netlify.app
```

## Step 7: Test Your Deployment

1. Visit your Netlify site URL
2. Test authentication flow
3. Test game search functionality
4. Verify API calls are working

## Custom Domain (Optional)

1. In Netlify dashboard, go to **Domain settings**
2. Click **Add custom domain**
3. Follow Netlify's DNS configuration instructions
4. Update Auth0 callback URLs with your custom domain

## Continuous Deployment

Netlify automatically deploys when you push to your main branch. To configure:

1. Go to **Site settings** → **Build & deploy**
2. Configure branch deployments:
   - **Production branch:** `main` or `master`
   - **Branch deploys:** Enable for pull requests (optional)

## Troubleshooting

### Build Fails

- Check build logs in Netlify dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Netlify uses Node 18 by default)

### Environment Variables Not Working

- Ensure variables start with `VITE_` prefix
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

### API Calls Failing

- Verify `VITE_API_URL` is set correctly
- Check backend CORS configuration
- Verify backend is deployed and accessible

### Auth0 Redirect Issues

- Double-check callback URLs in Auth0 dashboard
- Ensure URLs match exactly (including https://)
- Clear browser cache and cookies

## Performance Optimization

Netlify automatically:
- Serves static assets from CDN
- Enables HTTP/2
- Compresses assets
- Caches static files

The `netlify.toml` file includes:
- SPA redirects for client-side routing
- Security headers
- Cache headers for optimal performance

## Monitoring

- **Netlify Analytics**: Enable in site settings
- **Error Tracking**: Consider adding Sentry or similar
- **Performance**: Use Netlify's built-in analytics

## Next Steps

After successful deployment:
1. Set up custom domain
2. Enable Netlify Analytics
3. Configure error tracking
4. Set up monitoring and alerts
5. Review `PRODUCTION_TODO.md` for remaining tasks



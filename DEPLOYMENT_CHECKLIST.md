# Deployment Checklist

Use this checklist before deploying to Netlify.

## Pre-Deployment

- [ ] All code is committed and pushed to Git
- [ ] Tests pass (`npm test`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No console errors or warnings
- [ ] `.env` file is in `.gitignore`

## Environment Variables

- [ ] `VITE_AUTH0_DOMAIN` - Auth0 domain configured
- [ ] `VITE_AUTH0_CLIENT_ID` - Auth0 client ID configured
- [ ] `VITE_API_URL` - Backend API URL configured

## Auth0 Configuration

- [ ] Production Auth0 tenant created (or using existing)
- [ ] Callback URLs configured:
  - [ ] `https://your-site.netlify.app`
  - [ ] `https://your-site.netlify.app/*`
- [ ] Logout URLs configured:
  - [ ] `https://your-site.netlify.app`
- [ ] Web Origins configured:
  - [ ] `https://your-site.netlify.app`

## Backend Deployment

- [ ] Backend server deployed and accessible
- [ ] Backend CORS configured with Netlify URL
- [ ] Backend environment variables set:
  - [ ] `ALLOWED_ORIGINS` includes Netlify URL
  - [ ] `NODE_ENV=production`
  - [ ] `PORT` configured

## Netlify Configuration

- [ ] Site created on Netlify
- [ ] Git repository connected
- [ ] Build settings configured:
  - [ ] Build command: `npm run build`
  - [ ] Publish directory: `dist`
- [ ] Environment variables added in Netlify dashboard
- [ ] `netlify.toml` file committed

## Testing

- [ ] Site loads correctly
- [ ] Authentication works (sign up/login)
- [ ] Game search works
- [ ] Adding games to library works
- [ ] Games persist (sessionStorage)
- [ ] No console errors
- [ ] API calls succeed

## Post-Deployment

- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled (optional)
- [ ] Error tracking set up (optional)
- [ ] Performance monitoring configured
- [ ] Documentation updated with production URLs

## Security

- [ ] HTTPS enabled (automatic on Netlify)
- [ ] Security headers configured (in `netlify.toml`)
- [ ] No sensitive data in client-side code
- [ ] API keys not exposed in frontend

## Performance

- [ ] Build size is reasonable (< 1MB for initial load)
- [ ] Images optimized
- [ ] Lazy loading enabled
- [ ] Code splitting working

## Monitoring

- [ ] Error tracking configured
- [ ] Analytics set up
- [ ] Uptime monitoring (optional)
- [ ] Performance monitoring (optional)



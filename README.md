# Gameo - Social Gaming Platform

A modern social media platform built for gamers to connect, share their game libraries, and discover new adventures together.

## Features

- 🎮 **Game Library** - Build and showcase your personal game collection
- 👥 **Social Connections** - Add friends and explore their libraries
- 🏷️ **Game Tagging** - Tag friends in games you've played together
- 📝 **Wishlist** - Keep track of upcoming games you're excited about
- 🔐 **OAuth Authentication** - Secure sign up and login with Auth0

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Auth0:
   - Create an account at [Auth0](https://auth0.com)
   - Create a new application (Single Page Application)
   - Add `http://localhost:5173` to your Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins
   - Copy your Domain and Client ID

3. Create a `.env` file in the root directory:
```env
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
gameo/
├── src/
│   ├── components/
│   │   ├── LandingPage.jsx    # Landing page with OAuth
│   │   ├── Dashboard.jsx      # User dashboard (after login)
│   │   └── Loading.jsx        # Loading component
│   ├── App.jsx                # Main app component with routing
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Tech Stack

- **React** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Auth0** - Authentication
- **Tailwind CSS** - Styling

## Next Steps

- [ ] Game catalog integration
- [ ] User library management
- [ ] Friend system
- [ ] Game tagging functionality
- [ ] Wishlist feature
- [ ] Social feed for posts

## Production Deployment

### Quick Deploy to Railway (Recommended)

For the fastest deployment with both frontend and backend, see [RAILWAY_QUICK_START.md](./RAILWAY_QUICK_START.md) for a 10-minute setup guide.

### Railway Deployment Guide

For detailed Railway deployment instructions, see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md).

### Alternative: Netlify Deployment

For Netlify deployment (frontend only, backend separate), see:
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Quick 5-minute guide
- [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) - Full deployment guide

### Deployment Checklist

Before deploying, review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) to ensure everything is configured correctly.

### Production Requirements

For a complete list of requirements to move from development to production, see [PRODUCTION_TODO.md](./PRODUCTION_TODO.md).

Key production requirements include:
- Backend API setup with Steam API proxy
- Database setup for user data and game libraries
- Auth0 production configuration
- Remove demo mode and mock data
- Error handling and monitoring

## License

MIT


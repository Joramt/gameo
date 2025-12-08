# Production TODO - Live Version Requirements

This document tracks all changes required to move from development to production.

## 🔐 Authentication & Security

- [ ] **Auth0 Production Configuration**
  - [ ] Set up production Auth0 tenant (separate from dev)
  - [ ] Configure production callback URLs in Auth0 dashboard
  - [ ] Add production domain to Allowed Callback URLs, Logout URLs, and Web Origins
  - [ ] Remove demo mode fallback logic from `src/main.jsx` and `src/components/Dashboard.jsx`
  - [ ] Remove "Demo Mode" badge from dashboard
  - [ ] Ensure Auth0 redirect_uri uses production domain dynamically

## 🌐 Backend API & Infrastructure

- [ ] **Backend Server Setup**
  - [ ] Set up backend server (Node.js/Express, Python/Flask, or similar)
  - [ ] Configure CORS properly for production domain
  - [ ] Set up environment variables management on server
  - [ ] Implement rate limiting for API endpoints
  - [ ] Set up request logging and monitoring

- [ ] **Steam API Integration** ⚠️ **HIGH PRIORITY**
  - [ ] Create backend endpoint to proxy Steam Store API requests
  - [ ] Replace CORS proxy (`api.allorigins.win`) with backend endpoint in `src/components/AddGameModal.jsx`
  - [ ] Implement caching for Steam API responses to reduce requests
  - [ ] Add error handling and retry logic for Steam API failures
  - [ ] Consider using Steam Web API if API keys are available
  - [ ] Update search endpoint: Replace `https://api.allorigins.win/get?url=...` with `/api/steam/search?q=...`
  - [ ] Update game details endpoint: Replace proxy with `/api/steam/games?ids=...`

## 💾 Database & Data Management

- [ ] **Database Setup**
  - [ ] Choose and set up database (PostgreSQL, MongoDB, etc.)
  - [ ] Design database schema for:
    - [ ] User accounts and profiles
    - [ ] Game library (user's games)
    - [ ] Friends/connections
    - [ ] Game tags (friends tagged in games)
    - [ ] Wishlists
    - [ ] Posts/feed content
  - [ ] Set up database migrations
  - [ ] Configure database connection pooling

- [ ] **Game Data Management**
  - [ ] Replace mock game data in `src/components/Dashboard.jsx` (line 24-69)
  - [ ] Create API endpoint to fetch user's game library: `GET /api/users/:userId/games`
  - [ ] Create API endpoint to add game to library: `POST /api/users/:userId/games`
  - [ ] Create API endpoint to remove game from library: `DELETE /api/users/:userId/games/:gameId`
  - [ ] Implement game search functionality (currently TODO in `src/components/Dashboard.jsx` line 82)
  - [ ] Store game metadata (name, image, release date, studio) in database
  - [ ] Set up background job to sync/update game data from Steam API periodically

## 🔍 Search Functionality

- [ ] **Game Search Implementation**
  - [ ] Complete `handleSearch` function in `src/components/Dashboard.jsx`
  - [ ] Connect search results to add game to library functionality
  - [ ] Implement search result caching
  - [ ] Add search history for users
  - [ ] Optimize search performance (debouncing already implemented)

## 🎮 Game Library Features

- [ ] **Library Management**
  - [ ] Implement "Add Game" functionality (currently just logs to console)
  - [ ] Add ability to remove games from library
  - [ ] Add game details view/modal
  - [ ] Implement game sorting/filtering options
  - [ ] Add pagination for large game libraries

## 👥 Social Features

- [ ] **Friends System**
  - [ ] Create friends/connections database table
  - [ ] Implement friend request system
  - [ ] Create API endpoints: `GET /api/users/:userId/friends`, `POST /api/users/:userId/friends`, etc.
  - [ ] Build UI for friend management
  - [ ] Add ability to view friends' game libraries

- [ ] **Game Tagging**
  - [ ] Design database schema for game tags (many-to-many relationship)
  - [ ] Create API endpoints for tagging friends in games
  - [ ] Build UI for tagging functionality
  - [ ] Display tags on game cards

- [ ] **Wishlist**
  - [ ] Create wishlist database table
  - [ ] Implement wishlist API endpoints
  - [ ] Build wishlist UI component
  - [ ] Add wishlist to dashboard

- [ ] **Social Feed**
  - [ ] Design posts/feed database schema
  - [ ] Create API endpoints for posts
  - [ ] Build feed UI component
  - [ ] Implement post creation, editing, deletion

## 🎨 UI/UX Improvements

- [x] **Error Handling** ✅ **COMPLETED**
  - [x] Add error boundaries for React components
  - [x] Implement user-friendly error messages
  - [x] Add loading states for all async operations
  - [ ] Handle network failures gracefully (partially done - needs user feedback)

- [x] **Performance Optimization** ✅ **PARTIALLY COMPLETED**
  - [x] Implement code splitting and lazy loading
  - [x] Optimize image loading (lazy load implemented)
  - [ ] Add service worker for offline support
  - [ ] Implement virtual scrolling for long lists
  - [x] Optimize bundle size (manual chunks configured)

- [x] **Accessibility** ✅ **PARTIALLY COMPLETED**
  - [x] Add ARIA labels where missing
  - [x] Ensure keyboard navigation works everywhere
  - [ ] Test with screen readers (manual testing needed)
  - [ ] Ensure color contrast meets WCAG standards (needs verification)

## 🚀 Deployment & DevOps

- [ ] **Environment Configuration**
  - [ ] Set up production environment variables
  - [ ] Configure Vite for production build
  - [ ] Set up CI/CD pipeline
  - [ ] Configure build optimization (minification, tree-shaking)

- [ ] **Hosting & Infrastructure**
  - [ ] Choose hosting platform (Vercel, Netlify, AWS, etc.)
  - [ ] Set up production domain and SSL
  - [ ] Configure CDN for static assets
  - [ ] Set up monitoring and error tracking (Sentry, etc.)
  - [ ] Configure analytics (Google Analytics, etc.)

- [ ] **Security**
  - [ ] Implement HTTPS everywhere
  - [ ] Set up Content Security Policy (CSP)
  - [ ] Configure CORS properly on backend
  - [ ] Implement rate limiting
  - [ ] Add input validation and sanitization
  - [ ] Set up security headers
  - [ ] Regular security audits

## 📝 Code Quality

- [x] **Cleanup** ✅ **COMPLETED**
  - [x] Remove all console.log statements (replaced with proper error handling)
  - [ ] Remove demo mode code paths (kept for development, needs production flag)
  - [ ] Remove unused dependencies
  - [x] Clean up commented code
  - [ ] Update README with production setup instructions

- [x] **Testing** ✅ **PARTIALLY COMPLETED**
  - [x] Write unit tests for components (GameCard, AddGameCard, AddGameModal, Loading, ErrorBoundary)
  - [ ] Write integration tests for API endpoints (requires backend)
  - [ ] Set up E2E testing (Playwright, Cypress)
  - [x] Add test coverage reporting (vitest coverage configured)

- [ ] **Documentation**
  - [ ] Document API endpoints
  - [ ] Document environment variables
  - [ ] Create deployment guide
  - [ ] Document database schema

## 🔄 Migration & Data

- [ ] **Data Migration**
  - [ ] Plan migration strategy for existing data (if any)
  - [ ] Create backup procedures
  - [ ] Test data migration scripts

## 📊 Monitoring & Analytics

- [ ] **Monitoring**
  - [ ] Set up application performance monitoring (APM)
  - [ ] Set up uptime monitoring
  - [ ] Configure alerting for errors and downtime
  - [ ] Set up log aggregation

- [ ] **Analytics**
  - [ ] Implement user analytics
  - [ ] Track key user actions
  - [ ] Set up conversion tracking

---

## Priority Order

1. **Critical (Must have for launch)**
   - Backend API setup with Steam API proxy
   - Database setup and game library persistence
   - Remove demo mode and configure Auth0 properly
   - Basic game add/remove functionality

2. **High Priority (Should have)**
   - Friends system
   - Game tagging
   - Error handling and loading states
   - Production deployment setup

3. **Medium Priority (Nice to have)**
   - Wishlist feature
   - Social feed
   - Performance optimizations
   - Advanced search features

4. **Low Priority (Future enhancements)**
   - Analytics and monitoring
   - Advanced UI features
   - Mobile app
   - Additional integrations

---

## Notes

- Steam Store API doesn't require API keys but has CORS restrictions - must use backend proxy
- Auth0 demo mode should be completely removed in production
- All mock data must be replaced with real API calls
- Consider implementing caching strategies to reduce API calls
- Rate limiting is crucial to prevent abuse


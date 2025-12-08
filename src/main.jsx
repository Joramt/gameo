import React from 'react'
import ReactDOM from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.jsx'
import './index.css'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID

// Check if Auth0 is properly configured
const isAuth0Configured = domain && clientId && 
  !domain.includes('example') && 
  !clientId.includes('example')

// If Auth0 is not configured, show a helpful message (only in development)
if (!isAuth0Configured && import.meta.env.DEV) {
  // Only log in development to avoid console noise in production
  console.warn('⚠️ Auth0 is not configured. Running in demo mode. Please set up your .env file:')
  console.warn('   VITE_AUTH0_DOMAIN=your-domain.us.auth0.com')
  console.warn('   VITE_AUTH0_CLIENT_ID=your-client-id')
}

// Always wrap in Auth0Provider, but skip initialization if not configured
// This allows the hook to work without errors
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAuth0Configured ? (
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
        }}
        onRedirectCallback={(appState) => {
          // Handle redirect after login
          if (appState?.returnTo) {
            window.location.href = appState.returnTo
          }
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
        skipRedirectCallback={false}
      >
        <App />
      </Auth0Provider>
    ) : (
      // Create a minimal provider that won't make API calls
      <Auth0Provider
        domain="demo.auth0.com"
        clientId="demo-client-id"
        skipRedirectCallback={true}
        skipSilentAuth={true}
      >
        <App />
      </Auth0Provider>
    )}
  </React.StrictMode>,
)


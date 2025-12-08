import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { lazy, Suspense } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Loading from './components/Loading'

// Lazy load components for code splitting
const LandingPage = lazy(() => import('./components/LandingPage'))
const Dashboard = lazy(() => import('./components/Dashboard'))

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const isAuth0Configured = domain && clientId && 
  !domain.includes('example') && 
  !clientId.includes('example')

function App() {
  const { isLoading } = useAuth0()

  // Only show loading if Auth0 is actually configured
  if (isLoading && isAuth0Configured) {
    return <Loading />
  }

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  )
}

export default App

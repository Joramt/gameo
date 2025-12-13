import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Loading from './components/Loading'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Lazy load components for code splitting
const LandingPage = lazy(() => import('./components/LandingPage'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const BudgetSetup = lazy(() => import('./components/BudgetSetup'))
const Integrations = lazy(() => import('./components/Integrations'))

function AppContent() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <Loading />
  }

  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/budget-setup" element={<BudgetSetup />} />
          <Route path="/integrations" element={<Integrations />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

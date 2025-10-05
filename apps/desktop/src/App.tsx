import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './pages/Dashboard';
import { GraphPage } from './pages/GraphPage';
import { NotesPage } from './pages/NotesPage';
import { RulesPage } from './pages/RulesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharePage } from './pages/SharePage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading screen component
function LoadingScreen() {
  return (
    <div className="h-screen w-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-lg text-muted-foreground">Loading PolyNote...</p>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app startup
    const checkAuth = async () => {
      try {
        const authenticated = await window.electronAPI.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Failed to check authentication status:', error);
        // Default to unauthenticated if check fails
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleContinueAsGuest = () => {
    setIsAuthenticated(true); // Allow guest access
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onContinueAsGuest={handleContinueAsGuest}
        />
      </ErrorBoundary>
    );
  }

  // Show main app if authenticated
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/notes/:noteId" element={<NotesPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

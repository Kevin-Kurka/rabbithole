import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Home } from './pages/home';
import { ArticlePage } from './pages/article';
import { WritePage } from './pages/write';
import { ChallengePage } from './pages/challenge';
import { TheoryPage } from './pages/theory';
import { ExplorePage } from './pages/explore';
import { ProfilePage } from './pages/profile';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { NotificationsPage } from './pages/notifications';
import { SearchPage } from './pages/search';
import { TimelinePage } from './pages/timeline';
import { SourcesPage } from './pages/sources';
import { ClaimsPage } from './pages/claims';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ErrorBoundary } from './components/error-boundary';

function NavBar() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return null;
  }

  return (
    <>
      {/* Navigation */}
      <nav className="bg-black border-b border-crt-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center text-2xl font-bold text-crt-fg flex-shrink-0 font-mono">
              &gt; rabbithole
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/write" className="text-crt-muted hover:text-crt-fg transition font-mono text-sm">Write</Link>
              <Link to="/explore" className="text-crt-muted hover:text-crt-fg transition font-mono text-sm">Explore</Link>
              <Link to="/timeline" className="text-crt-muted hover:text-crt-fg transition font-mono text-sm">Timeline</Link>
              <Link to="/claims" className="text-crt-muted hover:text-crt-fg transition font-mono text-sm">Claims</Link>
              <Link to="/sources" className="text-crt-muted hover:text-crt-fg transition font-mono text-sm">Sources</Link>

              {isAuthenticated ? (
                <>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-crt-muted hover:text-crt-fg border border-crt-muted hover:border-crt-fg transition font-mono text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-crt-muted hover:text-crt-fg transition font-mono text-sm">Login</Link>
                  <Link to="/register" className="px-4 py-2 bg-crt-selection text-crt-fg border border-crt-muted hover:border-crt-fg transition font-mono text-sm">
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 text-crt-muted hover:text-crt-fg border border-crt-muted"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2 bg-black border-t border-crt-border">
              <Link to="/write" className="block px-3 py-2 text-crt-muted hover:text-crt-fg font-mono text-sm">
                Write
              </Link>
              <Link to="/explore" className="block px-3 py-2 text-crt-muted hover:text-crt-fg font-mono text-sm">
                Explore
              </Link>
              <Link to="/timeline" className="block px-3 py-2 text-crt-muted hover:text-crt-fg font-mono text-sm">
                Timeline
              </Link>
              <Link to="/claims" className="block px-3 py-2 text-crt-muted hover:text-crt-fg font-mono text-sm">
                Claims
              </Link>
              <Link to="/sources" className="block px-3 py-2 text-crt-muted hover:text-crt-fg font-mono text-sm">
                Sources
              </Link>
              {isAuthenticated ? (
                <>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-crt-muted hover:text-crt-fg border border-crt-muted font-mono text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-3 py-2 text-crt-muted hover:text-crt-fg font-mono text-sm">
                    Login
                  </Link>
                  <Link to="/register" className="block px-3 py-2 bg-crt-selection text-crt-fg border border-crt-muted hover:border-crt-fg font-mono text-sm">
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

function ProtectedRoute({ element }: { element: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen font-mono text-crt-fg"><p>[ Loading... ]</p></div>;
  }

  return isAuthenticated ? element : <Navigate to="/login" />;
}

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen font-mono text-crt-fg"><p>[ Loading... ]</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <NavBar />

      {/* Main Content */}
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/write" element={<ProtectedRoute element={<WritePage />} />} />
          <Route path="/challenge/:id" element={<ChallengePage />} />
          <Route path="/theory/new" element={<ProtectedRoute element={<TheoryPage />} />} />
          <Route path="/theory/:id" element={<TheoryPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />
          <Route path="/notifications" element={<ProtectedRoute element={<NotificationsPage />} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/claims" element={<ClaimsPage />} />
          <Route path="/sources" element={<SourcesPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-crt-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <p className="text-crt-muted text-sm font-mono">
              Built on{' '}
              <a href="https://sentient.sh" target="_blank" rel="noopener noreferrer" className="text-crt-fg hover:text-crt-accent font-medium">
                Sentient BaaS
              </a>
            </p>
            <p className="text-crt-dim text-xs mt-4 sm:mt-0 font-mono">
              Rabbithole MVP 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
